import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  Link,
  useNavigate,
} from 'react-router-dom'

import {
  createSmartPlaylist,
  deleteSmartPlaylist,
  emptySmartPlaylistRules,
  fetchSmartPlaylists,
} from '../data/smartPlaylists'

import type {
  SmartPlaylist,
  SmartPlaylistRules,
} from '../data/smartPlaylists'

import {
  personalArchiveSources,
} from '../data/personalArchive'

import {
  useArchiveCharacters,
} from '../hooks/useArchiveCharacters'

import {
  useMediaTags,
} from '../data/mediaTags'


function parseTags(
  value: string
) {
  return value
    .split(',')
    .map(
      (tag) =>
        tag.trim()
    )
    .filter(Boolean)
}


function describeRules(
  rules: SmartPlaylistRules
) {
  const parts:
    string[] = []

  if (
    rules.characters.length > 0
  ) {
    parts.push(
      rules.characters.join(', ')
    )
  }

  if (
    rules.categories.length > 0
  ) {
    parts.push(
      rules.categories.join(', ')
    )
  }

  if (
    rules.tags.length > 0
  ) {
    parts.push(
      `${rules.tagMode === 'all' ? 'all' : 'any'} tags: ${rules.tags.join(', ')}`
    )
  }

  if (rules.favoriteOnly) {
    parts.push('favorites')
  }

  if (rules.status !== 'any') {
    parts.push(rules.status)
  }

  if (rules.minRating) {
    parts.push(
      `${rules.minRating}★+`
    )
  }

  return parts.length > 0
    ? parts.join(' · ')
    : 'All playable media'
}


function SmartPlaylistsPage() {
  const navigate =
    useNavigate()

  const {
    characters,
  } = useArchiveCharacters()

  const {
    tags,
  } = useMediaTags()

  const [
    playlists,
    setPlaylists,
  ] = useState<SmartPlaylist[]>([])

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    error,
    setError,
  ] = useState('')

  const [
    creating,
    setCreating,
  ] = useState(false)

  const [
    name,
    setName,
  ] = useState('')

  const [
    character,
    setCharacter,
  ] = useState('Any')

  const [
    category,
    setCategory,
  ] = useState('Any')

  const [
    tagText,
    setTagText,
  ] = useState('')

  const [
    tagMode,
    setTagMode,
  ] = useState<'any' | 'all'>('any')

  const [
    status,
    setStatus,
  ] = useState<SmartPlaylistRules['status']>('any')

  const [
    minRating,
    setMinRating,
  ] = useState('')

  const [
    favoriteOnly,
    setFavoriteOnly,
  ] = useState(false)


  const load =
    useCallback(
      async () => {
        try {
          setLoading(true)
          setPlaylists(
            await fetchSmartPlaylists()
          )
          setError('')
        } catch (
          loadError
        ) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Unable to load smart playlists.'
          )
        } finally {
          setLoading(false)
        }
      },
      []
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


  async function create() {
    const cleanedName =
      name.trim()

    if (!cleanedName) {
      return
    }

    const rating =
      minRating
        ? Number(minRating)
        : null

    const rules:
      SmartPlaylistRules = {
        ...emptySmartPlaylistRules,
        characters:
          character === 'Any'
            ? []
            : [character],
        categories:
          category === 'Any'
            ? []
            : [category],
        tags:
          parseTags(tagText),
        tagMode,
        favoriteOnly,
        status,
        minRating:
          rating &&
          Number.isFinite(rating)
            ? rating
            : null,
      }

    try {
      setCreating(true)
      setError('')

      const created =
        await createSmartPlaylist(
          cleanedName,
          rules
        )

      navigate(
        `/smart-playlists/${created.id}`
      )
    } catch (
      createError
    ) {
      setError(
        createError instanceof Error
          ? createError.message
          : 'Unable to create smart playlist.'
      )
    } finally {
      setCreating(false)
    }
  }


  async function remove(
    playlist: SmartPlaylist
  ) {
    if (
      !window.confirm(
        `Delete smart playlist “${playlist.name}”? Your media and tags are not changed.`
      )
    ) {
      return
    }

    try {
      await deleteSmartPlaylist(
        playlist.id
      )
      setPlaylists(
        (current) =>
          current.filter(
            (candidate) =>
              candidate.id !==
              playlist.id
          )
      )
    } catch (
      deleteError
    ) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Unable to delete smart playlist.'
      )
    }
  }


  const categories =
    personalArchiveSources.map(
      (source) =>
        source.category
    )


  return (
    <main className="archive-page smart-playlists-page">
      <header className="archive-page-header">
        <Link
          to="/"
          className="back-button"
        >
          ‹
        </Link>
        <div>
          <span className="archive-eyebrow">
            PERSONAL LIBRARY
          </span>
          <h1>
            Smart Playlists
          </h1>
        </div>
      </header>

      <section className="smart-playlist-builder">
        <div className="smart-playlist-builder-heading">
          <div>
            <span className="archive-eyebrow">
              AUTOMATIC COLLECTION
            </span>
            <h2>
              Create from rules
            </h2>
            <p>
              Smart playlists update automatically as your media, tags, favorites, ratings, and watch state change.
            </p>
          </div>
        </div>

        <div className="smart-playlist-form-grid">
          <label>
            <span>Name</span>
            <input
              value={name}
              placeholder="Caleb Comfort"
              onChange={(event) =>
                setName(event.target.value)
              }
            />
          </label>

          <label>
            <span>Character</span>
            <select
              value={character}
              onChange={(event) =>
                setCharacter(event.target.value)
              }
            >
              <option value="Any">
                Any character
              </option>
              {characters.map(
                (value) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {value}
                  </option>
                )
              )}
            </select>
          </label>

          <label>
            <span>Category</span>
            <select
              value={category}
              onChange={(event) =>
                setCategory(event.target.value)
              }
            >
              <option value="Any">
                Any category
              </option>
              {categories.map(
                (value) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {value}
                  </option>
                )
              )}
            </select>
          </label>

          <label className="smart-playlist-tags-field">
            <span>Tags</span>
            <input
              list="smart-playlist-tags"
              value={tagText}
              placeholder="Comfort, Funny"
              onChange={(event) =>
                setTagText(event.target.value)
              }
            />
            <datalist id="smart-playlist-tags">
              {tags.map(
                (tag) => (
                  <option
                    key={tag.name}
                    value={tag.name}
                  />
                )
              )}
            </datalist>
          </label>

          <label>
            <span>Tag matching</span>
            <select
              value={tagMode}
              onChange={(event) =>
                setTagMode(
                  event.target.value === 'all'
                    ? 'all'
                    : 'any'
                )
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
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target.value as
                    SmartPlaylistRules['status']
                )
              }
            >
              <option value="any">
                Any status
              </option>
              <option value="unwatched">
                Unwatched
              </option>
              <option value="in-progress">
                In progress
              </option>
              <option value="completed">
                Completed
              </option>
            </select>
          </label>

          <label>
            <span>Minimum rating</span>
            <select
              value={minRating}
              onChange={(event) =>
                setMinRating(event.target.value)
              }
            >
              <option value="">
                Any rating
              </option>
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
              checked={favoriteOnly}
              onChange={(event) =>
                setFavoriteOnly(
                  event.target.checked
                )
              }
            />
            <span>
              Favorites only
            </span>
          </label>
        </div>

        <button
          type="button"
          className="smart-playlist-create-button"
          disabled={
            creating ||
            !name.trim()
          }
          onClick={() =>
            void create()
          }
        >
          {creating
            ? 'Creating…'
            : '+ Create Smart Playlist'}
        </button>
      </section>

      {error && (
        <section className="settings-status-error">
          {error}
        </section>
      )}

      <section className="smart-playlist-library">
        <header>
          <div>
            <span className="archive-eyebrow">
              SAVED RULES
            </span>
            <h2>
              Your smart playlists
            </h2>
          </div>
        </header>

        {loading ? (
          <p>
            Loading smart playlists…
          </p>
        ) : playlists.length === 0 ? (
          <p className="smart-playlist-empty">
            No smart playlists yet.
          </p>
        ) : (
          <div className="smart-playlist-grid">
            {playlists.map(
              (playlist) => (
                <article
                  key={playlist.id}
                  className="smart-playlist-card"
                >
                  <Link
                    to={`/smart-playlists/${playlist.id}`}
                  >
                    <span className="archive-eyebrow">
                      SMART PLAYLIST
                    </span>
                    <h3>
                      {playlist.name}
                    </h3>
                    <p>
                      {describeRules(
                        playlist.rules
                      )}
                    </p>
                  </Link>
                  <button
                    type="button"
                    onClick={() =>
                      void remove(playlist)
                    }
                  >
                    Delete
                  </button>
                </article>
              )
            )}
          </div>
        )}
      </section>
    </main>
  )
}


export default SmartPlaylistsPage
