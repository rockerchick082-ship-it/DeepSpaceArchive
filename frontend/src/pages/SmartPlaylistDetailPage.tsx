import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom'

import type {
  ArchiveState,
} from '../data/archiveState'

import {
  archiveIndexKey,
  archiveIndexPlayerUrl,
  fetchArchiveIndex,
} from '../data/archiveIndex'

import type {
  ArchiveIndexItem,
} from '../data/archiveIndex'

import {
  fetchSmartPlaylist,
  updateSmartPlaylist,
} from '../data/smartPlaylists'

import type {
  SmartPlaylist,
  SmartPlaylistRules,
} from '../data/smartPlaylists'

import {
  MediaTagChips,
} from '../components/MediaTagControls'

import {
  useMediaTags,
} from '../data/mediaTags'


import {
  archiveIndexToQueueItem,
  replacePlaybackQueue,
} from '../data/playbackQueue'

function stateKey(
  category: string,
  relativePath: string
) {
  return `${category}\u0000${relativePath}`
}


function matchesRules(
  item: ArchiveIndexItem,
  state: ArchiveState | undefined,
  tags: string[],
  rules: SmartPlaylistRules
) {
  if (
    rules.characters.length > 0 &&
    !rules.characters.includes(
      item.character
    )
  ) {
    return false
  }

  if (
    rules.categories.length > 0 &&
    !rules.categories.includes(
      item.archiveCategory
    )
  ) {
    return false
  }

  if (
    rules.tags.length > 0
  ) {
    const normalizedTags =
      new Set(
        tags.map(
          (tag) =>
            tag.toLocaleLowerCase()
        )
      )

    const tagMatches =
      rules.tags.map(
        (tag) =>
          normalizedTags.has(
            tag.toLocaleLowerCase()
          )
      )

    if (
      rules.tagMode === 'all'
        ? tagMatches.some(
            (match) =>
              !match
          )
        : !tagMatches.some(Boolean)
    ) {
      return false
    }
  }

  if (
    rules.favoriteOnly &&
    !state?.favorite
  ) {
    return false
  }

  if (
    rules.minRating !== null &&
    (
      state?.rating === null ||
      state?.rating === undefined ||
      state.rating <
        rules.minRating
    )
  ) {
    return false
  }

  if (
    rules.status === 'completed' &&
    !state?.completed
  ) {
    return false
  }

  if (
    rules.status === 'in-progress' &&
    !(
      state &&
      !state.completed &&
      state.progressSeconds > 0
    )
  ) {
    return false
  }

  if (
    rules.status === 'unwatched' &&
    state &&
    (
      state.completed ||
      state.progressSeconds > 0 ||
      state.playCount > 0
    )
  ) {
    return false
  }

  return true
}


function SmartPlaylistDetailPage() {

  const navigate =
    useNavigate()


  const {
    id,
  } = useParams()

  const numericId =
    Number(id)

  const {
    tagsFor,
  } = useMediaTags()

  const [
    playlist,
    setPlaylist,
  ] = useState<SmartPlaylist | null>(
    null
  )

  const [
    media,
    setMedia,
  ] = useState<ArchiveIndexItem[]>([])

  const [
    states,
    setStates,
  ] = useState<
    Record<string, ArchiveState>
  >({})

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    error,
    setError,
  ] = useState('')

  const [
    editing,
    setEditing,
  ] = useState(false)

  const [
    draftName,
    setDraftName,
  ] = useState('')

  const [
    draftRules,
    setDraftRules,
  ] = useState<SmartPlaylistRules | null>(
    null
  )


  const load =
    useCallback(
      async () => {
        if (!Number.isInteger(numericId)) {
          setError(
            'Invalid smart playlist ID.'
          )
          setLoading(false)
          return
        }

        try {
          setLoading(true)

          const [
            loadedPlaylist,
            archiveResult,
            stateResponse,
          ] = await Promise.all([
            fetchSmartPlaylist(
              numericId
            ),
            fetchArchiveIndex(),
            fetch(
              '/api/archive/states'
            ),
          ])

          if (!stateResponse.ok) {
            throw new Error(
              'Unable to load watch state.'
            )
          }

          const stateData =
            await stateResponse.json() as {
              items?: ArchiveState[]
            }

          const stateMap:
            Record<string, ArchiveState> = {}

          for (
            const state
            of stateData.items ?? []
          ) {
            stateMap[
              stateKey(
                state.category,
                state.relativePath
              )
            ] = state
          }

          setPlaylist(
            loadedPlaylist
          )
          setDraftName(
            loadedPlaylist.name
          )
          setDraftRules({
            ...loadedPlaylist.rules,
            characters: [
              ...loadedPlaylist.rules.characters,
            ],
            categories: [
              ...loadedPlaylist.rules.categories,
            ],
            tags: [
              ...loadedPlaylist.rules.tags,
            ],
          })
          setMedia(
            archiveResult.items
          )
          setStates(stateMap)
          setError('')
        } catch (
          loadError
        ) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Unable to load smart playlist.'
          )
        } finally {
          setLoading(false)
        }
      },
      [numericId]
    )


  useEffect(
    () => {
      const timer =
        window.setTimeout(
          () => {
            void load()
          },
          0
        )

      return () =>
        window.clearTimeout(timer)
    },
    [load]
  )


  const matched =
    useMemo(
      () => {
        if (!playlist) {
          return []
        }

        return media.filter(
          (item) =>
            matchesRules(
              item,
              states[
                stateKey(
                  item.archiveCategory,
                  item.relativePath
                )
              ],
              tagsFor(
                item.archiveCategory,
                item.relativePath
              ),
              playlist.rules
            )
        )
      },
      [
        media,
        playlist,
        states,
        tagsFor,
      ]
    )


  function playMatched(
    shuffle:
      boolean
  ) {

    if (
      matched.length ===
        0
    ) {

      return

    }


    const ordered =
      [
        ...matched,
      ]


    if (shuffle) {

      for (
        let index =
          ordered.length - 1;
        index >
          0;
        index -=
          1
      ) {

        const swapIndex =
          Math.floor(
            Math.random() *
            (
              index +
              1
            )
          )


        const current =
          ordered[
            index
          ]


        ordered[
          index
        ] =
          ordered[
            swapIndex
          ]


        ordered[
          swapIndex
        ] =
          current

      }

    }


    const [
      first,
      ...rest
    ] =
      ordered


    replacePlaybackQueue(
      rest.map(
        archiveIndexToQueueItem
      )
    )


    navigate(
      archiveIndexPlayerUrl(
        first
      )
    )

  }

  async function saveRules() {
    if (
      !playlist ||
      !draftRules ||
      !draftName.trim()
    ) {
      return
    }

    try {
      const saved =
        await updateSmartPlaylist(
          playlist.id,
          draftName,
          draftRules
        )

      setPlaylist(saved)
      setDraftName(saved.name)
      setDraftRules({
        ...saved.rules,
        characters: [...saved.rules.characters],
        categories: [...saved.rules.categories],
        tags: [...saved.rules.tags],
      })
      setEditing(false)
      setError('')
    } catch (
      saveError
    ) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to save smart playlist.'
      )
    }
  }


  if (loading) {
    return (
      <main className="archive-page">
        Loading smart playlist…
      </main>
    )
  }

  if (
    error &&
    !playlist
  ) {
    return (
      <main className="archive-page">
        <Link
          to="/smart-playlists"
          className="back-button"
        >
          ‹
        </Link>
        <section className="settings-status-error">
          {error}
        </section>
      </main>
    )
  }

  if (!playlist) {
    return null
  }


  return (
    <main className="archive-page smart-playlist-detail-page">
      <header className="archive-page-header">
        <Link
          to="/smart-playlists"
          className="back-button"
        >
          ‹
        </Link>
        <div>
          <span className="archive-eyebrow">
            SMART PLAYLIST
          </span>
          <h1>
            {playlist.name}
          </h1>
        </div>
        <button
          type="button"
          className="library-rescan-button"
          onClick={() =>
            setEditing(
              (current) =>
                !current
            )
          }
        >
          {editing
            ? 'Close Rules'
            : 'Edit Rules'}
        </button>
      </header>

      {error && (
        <section className="settings-status-error">
          {error}
        </section>
      )}

      {editing && draftRules && (
        <section className="smart-playlist-edit-panel">
          <label>
            <span>Name</span>
            <input
              value={draftName}
              onChange={(event) =>
                setDraftName(event.target.value)
              }
            />
          </label>

          <label>
            <span>Characters (comma separated)</span>
            <input
              value={draftRules.characters.join(', ')}
              onChange={(event) =>
                setDraftRules({
                  ...draftRules,
                  characters:
                    event.target.value
                      .split(',')
                      .map((value) => value.trim())
                      .filter(Boolean),
                })
              }
            />
          </label>

          <label>
            <span>Categories (comma separated)</span>
            <input
              value={draftRules.categories.join(', ')}
              onChange={(event) =>
                setDraftRules({
                  ...draftRules,
                  categories:
                    event.target.value
                      .split(',')
                      .map((value) => value.trim())
                      .filter(Boolean),
                })
              }
            />
          </label>

          <label>
            <span>Tags (comma separated)</span>
            <input
              value={draftRules.tags.join(', ')}
              onChange={(event) =>
                setDraftRules({
                  ...draftRules,
                  tags:
                    event.target.value
                      .split(',')
                      .map((value) => value.trim())
                      .filter(Boolean),
                })
              }
            />
          </label>

          <label>
            <span>Tag matching</span>
            <select
              value={draftRules.tagMode}
              onChange={(event) =>
                setDraftRules({
                  ...draftRules,
                  tagMode:
                    event.target.value === 'all'
                      ? 'all'
                      : 'any',
                })
              }
            >
              <option value="any">
                Any selected tag
              </option>
              <option value="all">
                All selected tags
              </option>
            </select>
          </label>

          <label>
            <span>Watch status</span>
            <select
              value={draftRules.status}
              onChange={(event) =>
                setDraftRules({
                  ...draftRules,
                  status:
                    event.target.value as
                      SmartPlaylistRules['status'],
                })
              }
            >
              <option value="any">Any</option>
              <option value="unwatched">Unwatched</option>
              <option value="in-progress">In progress</option>
              <option value="completed">Completed</option>
            </select>
          </label>

          <label>
            <span>Minimum rating</span>
            <select
              value={draftRules.minRating ?? ''}
              onChange={(event) =>
                setDraftRules({
                  ...draftRules,
                  minRating:
                    event.target.value
                      ? Number(event.target.value)
                      : null,
                })
              }
            >
              <option value="">Any</option>
              {[5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5].map(
                (value) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {value}★+
                  </option>
                )
              )}
            </select>
          </label>

          <label className="smart-playlist-checkbox">
            <input
              type="checkbox"
              checked={draftRules.favoriteOnly}
              onChange={(event) =>
                setDraftRules({
                  ...draftRules,
                  favoriteOnly:
                    event.target.checked,
                })
              }
            />
            <span>Favorites only</span>
          </label>

          <button
            type="button"
            className="smart-playlist-create-button"
            onClick={() =>
              void saveRules()
            }
          >
            Save Rules
          </button>
        </section>
      )}

      <section className="smart-playlist-results-heading">
        <div>
          <strong>
            {matched.length}
          </strong>
          <span>
            matching media item{matched.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="smart-playlist-play-actions">
          <button
            type="button"
            disabled={
              matched.length ===
                0
            }
            onClick={() =>
              playMatched(
                false
              )
            }
          >
            ▶ Play All
          </button>

          <button
            type="button"
            disabled={
              matched.length ===
                0
            }
            onClick={() =>
              playMatched(
                true
              )
            }
          >
            ⇄ Shuffle
          </button>
        </div>

        <p>
          This list is generated live. Nothing is copied into the playlist.
        </p>
      </section>

      {matched.length === 0 ? (
        <section className="archive-feedback-panel">
          <h2>
            Nothing matches these rules yet.
          </h2>
          <p>
            Change the rules, add tags, rate items, or add new archive media and this collection will update automatically.
          </p>
        </section>
      ) : (
        <section className="smart-playlist-result-list">
          {matched.map(
            (item) => {
              const itemTags =
                tagsFor(
                  item.archiveCategory,
                  item.relativePath
                )

              const state =
                states[
                  stateKey(
                    item.archiveCategory,
                    item.relativePath
                  )
                ]

              return (
                <Link
                  key={
                    archiveIndexKey(
                      item.archiveCategory,
                      item.relativePath
                    )
                  }
                  to={
                    archiveIndexPlayerUrl(
                      item
                    )
                  }
                  className="smart-playlist-result-row"
                >
                  <div>
                    <strong>
                      {item.title}
                    </strong>
                    <span>
                      {[item.character, item.archiveCategory]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                    <MediaTagChips
                      tags={itemTags}
                    />
                  </div>
                  <div className="smart-playlist-result-state">
                    {state?.favorite && (
                      <span>♡ Favorite</span>
                    )}
                    {state?.rating && (
                      <span>{state.rating}★</span>
                    )}
                    {state?.completed && (
                      <span>Completed</span>
                    )}
                  </div>
                </Link>
              )
            }
          )}
        </section>
      )}
    </main>
  )
}


export default SmartPlaylistDetailPage
