import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Link,
  useNavigate,
} from 'react-router-dom'

import ArchiveStateCard
  from './ArchiveStateCard'

import type {
  ArchiveState,
} from '../data/archiveState'

import {
  canonicalArchiveCategory,
  fallbackArchiveTitle,
  fetchPersonalArchiveData,
  getPersonalArchivePlayerUrl,
  personalArchiveKey,
  personalArchiveSources,
} from '../data/personalArchive'

import type {
  PersonalArchiveEntry,
} from '../data/personalArchive'


type PersonalArchiveMode =
  | 'favorites'
  | 'continue'
  | 'history'


type PersonalSortMode =
  | 'recent'
  | 'title'
  | 'rating'
  | 'category'
  | 'progress-high'
  | 'progress-low'
  | 'most-played'


type PersonalArchivePageProps = {
  mode: PersonalArchiveMode
  title: string
  eyebrow: string
}


const knownCharacters = [
  'Xavier',
  'Zayne',
  'Rafayel',
  'Sylus',
  'Caleb',
]


function getEntryTitle(
  entry:
    PersonalArchiveEntry
) {

  return (
    entry.item?.title ??
    fallbackArchiveTitle(
      entry.state.relativePath
    )
  )

}


function getEntryCharacter(
  entry:
    PersonalArchiveEntry
) {

  return (
    entry.item?.character ??
    ''
  )

}


function characterBucket(
  entry:
    PersonalArchiveEntry
) {

  const character =
    getEntryCharacter(
      entry
    )


  return knownCharacters.includes(
    character
  )
    ? character
    : 'Other'

}


function progressPercent(
  state:
    ArchiveState
) {

  if (
    !state.durationSeconds ||
    state.durationSeconds <=
      0
  ) {

    return state.completed
      ? 100
      : 0

  }


  return Math.min(
    100,
    Math.max(
      0,
      Math.round(
        (
          state.progressSeconds /
          state.durationSeconds
        ) *
        100
      )
    )
  )

}


function dateValue(
  value:
    string | null
) {

  if (
    !value
  ) {

    return 0

  }


  const result =
    new Date(
      value
    ).getTime()


  return Number.isFinite(
    result
  )
    ? result
    : 0

}


function historyGroup(
  value:
    string | null
) {

  if (
    !value
  ) {

    return 'Earlier'

  }


  const watched =
    new Date(
      value
    )


  const now =
    new Date()


  const watchedDay =
    new Date(
      watched.getFullYear(),
      watched.getMonth(),
      watched.getDate()
    ).getTime()


  const today =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).getTime()


  const oneDay =
    24 *
    60 *
    60 *
    1000


  if (
    watchedDay ===
    today
  ) {

    return 'Today'

  }


  if (
    watchedDay ===
    today -
      oneDay
  ) {

    return 'Yesterday'

  }


  return 'Earlier'

}


function PersonalArchivePage({
  mode,
  title,
  eyebrow,
}: PersonalArchivePageProps) {

  const navigate =
    useNavigate()


  const [
    entries,
    setEntries,
  ] =
    useState<
      PersonalArchiveEntry[]
    >([])


  const [
    sourceErrors,
    setSourceErrors,
  ] =
    useState<
      Record<
        string,
        string
      >
    >({})


  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    )


  const [
    refreshing,
    setRefreshing,
  ] =
    useState(
      false
    )


  const [
    error,
    setError,
  ] =
    useState(
      ''
    )


  const [
    actionError,
    setActionError,
  ] =
    useState(
      ''
    )


  const [
    savingKey,
    setSavingKey,
  ] =
    useState<
      string | null
    >(
      null
    )


  const [
    selectedCharacter,
    setSelectedCharacter,
  ] =
    useState(
      'All'
    )


  const [
    selectedCategory,
    setSelectedCategory,
  ] =
    useState(
      'All'
    )


  const [
    searchText,
    setSearchText,
  ] =
    useState(
      ''
    )


  const [
    sortMode,
    setSortMode,
  ] =
    useState<
      PersonalSortMode
    >(
      'recent'
    )


  const loadData =
    useCallback(
      async (
        refresh =
          false
      ) => {

        try {

          if (
            refresh
          ) {

            setRefreshing(
              true
            )

          } else {

            setLoading(
              true
            )

          }


          const data =
            await fetchPersonalArchiveData()


          setEntries(
            data.entries
          )


          setSourceErrors(
            data.sourceErrors
          )


          setError(
            ''
          )

        } catch (
          loadError
        ) {

          console.error(
            `Unable to load ${title}:`,
            loadError
          )


          setError(
            loadError instanceof
              Error
              ? loadError.message
              : `Unable to load ${title}.`
          )

        } finally {

          setLoading(
            false
          )


          setRefreshing(
            false
          )

        }

      },
      [
        title,
      ]
    )


  useEffect(
    () => {

      /*
       * Defer the initial stateful loader out of
       * the effect body itself. This keeps the
       * React 19 set-state-in-effect rule happy.
       */
      const timeoutId =
        window.setTimeout(
          () => {

            void loadData()

          },
          0
        )


      return () => {

        window.clearTimeout(
          timeoutId
        )

      }

    },
    [
      loadData,
    ]
  )


  const modeEntries =
    useMemo(
      () => {

        if (
          mode ===
          'favorites'
        ) {

          return entries.filter(
            (entry) =>
              entry.state.favorite
          )

        }


        if (
          mode ===
          'continue'
        ) {

          return entries.filter(
            (entry) =>
              !entry.state.completed &&
              entry.state.progressSeconds >
                0
          )

        }


        return entries.filter(
          (entry) =>
            Boolean(
              entry.state.lastWatched
            )
        )

      },
      [
        entries,
        mode,
      ]
    )


  const categories =
    useMemo(
      () => {

        const present =
          new Set(
            modeEntries.map(
              (entry) =>
                canonicalArchiveCategory(
                  entry.state.category
                )
            )
          )


        return personalArchiveSources
          .map(
            (source) =>
              source.category
          )
          .filter(
            (category) =>
              present.has(
                category
              )
          )

      },
      [
        modeEntries,
      ]
    )


  const filteredEntries =
    useMemo(
      () => {

        const normalizedSearch =
          searchText
            .trim()
            .toLowerCase()


        const filtered =
          modeEntries.filter(
            (entry) => {

              const matchesCharacter =
                selectedCharacter ===
                  'All' ||
                characterBucket(
                  entry
                ) ===
                  selectedCharacter


              if (
                !matchesCharacter
              ) {

                return false

              }


              const category =
                canonicalArchiveCategory(
                  entry.state.category
                )


              const matchesCategory =
                selectedCategory ===
                  'All' ||
                category ===
                  selectedCategory


              if (
                !matchesCategory
              ) {

                return false

              }


              if (
                !normalizedSearch
              ) {

                return true

              }


              return (
                getEntryTitle(
                  entry
                )
                  .toLowerCase()
                  .includes(
                    normalizedSearch
                  ) ||
                getEntryCharacter(
                  entry
                )
                  .toLowerCase()
                  .includes(
                    normalizedSearch
                  ) ||
                category
                  .toLowerCase()
                  .includes(
                    normalizedSearch
                  ) ||
                entry.state.relativePath
                  .toLowerCase()
                  .includes(
                    normalizedSearch
                  )
              )

            }
          )


        return [
          ...filtered,
        ].sort(
          (
            left,
            right
          ) => {

            if (
              sortMode ===
              'title'
            ) {

              return getEntryTitle(
                left
              ).localeCompare(
                getEntryTitle(
                  right
                ),
                undefined,
                {
                  numeric:
                    true,

                  sensitivity:
                    'base',
                }
              )

            }


            if (
              sortMode ===
              'rating'
            ) {

              const ratingDifference =
                (
                  right.state.rating ??
                  -1
                ) -
                (
                  left.state.rating ??
                  -1
                )


              if (
                ratingDifference !==
                0
              ) {

                return ratingDifference

              }

            }


            if (
              sortMode ===
              'category'
            ) {

              const categoryDifference =
                canonicalArchiveCategory(
                  left.state.category
                ).localeCompare(
                  canonicalArchiveCategory(
                    right.state.category
                  )
                )


              if (
                categoryDifference !==
                0
              ) {

                return categoryDifference

              }

            }


            if (
              sortMode ===
              'progress-high'
            ) {

              const difference =
                progressPercent(
                  right.state
                ) -
                progressPercent(
                  left.state
                )


              if (
                difference !==
                0
              ) {

                return difference

              }

            }


            if (
              sortMode ===
              'progress-low'
            ) {

              const difference =
                progressPercent(
                  left.state
                ) -
                progressPercent(
                  right.state
                )


              if (
                difference !==
                0
              ) {

                return difference

              }

            }


            if (
              sortMode ===
              'most-played'
            ) {

              const difference =
                right.state.playCount -
                left.state.playCount


              if (
                difference !==
                0
              ) {

                return difference

              }

            }


            return (
              dateValue(
                right.state.lastWatched
              ) -
              dateValue(
                left.state.lastWatched
              )
            )

          }
        )

      },
      [
        modeEntries,
        searchText,
        selectedCategory,
        selectedCharacter,
        sortMode,
      ]
    )


  const historyGroups =
    useMemo(
      () => {

        if (
          mode !==
          'history'
        ) {

          return []

        }


        const groups =
          new Map<
            string,
            PersonalArchiveEntry[]
          >([
            [
              'Today',
              [],
            ],

            [
              'Yesterday',
              [],
            ],

            [
              'Earlier',
              [],
            ],
          ])


        for (
          const entry
          of filteredEntries
        ) {

          const group =
            historyGroup(
              entry.state.lastWatched
            )


          groups.get(
            group
          )?.push(
            entry
          )

        }


        return Array.from(
          groups.entries()
        )
          .filter(
            (
              [
                ,
                groupEntries,
              ]
            ) =>
              groupEntries.length >
              0
          )

      },
      [
        filteredEntries,
        mode,
      ]
    )


  const hasActiveFilters =
    selectedCharacter !==
      'All' ||
    selectedCategory !==
      'All' ||
    searchText.trim() !==
      '' ||
    sortMode !==
      'recent'


  const missingCount =
    modeEntries.filter(
      (entry) =>
        entry.availability ===
        'missing'
    ).length


  const unavailableSources =
    Object.keys(
      sourceErrors
    )


  function clearFilters() {

    setSelectedCharacter(
      'All'
    )


    setSelectedCategory(
      'All'
    )


    setSearchText(
      ''
    )


    setSortMode(
      'recent'
    )

  }


  function replaceState(
    updatedState:
      ArchiveState
  ) {

    setEntries(
      (current) =>
        current.map(
          (entry) =>
            personalArchiveKey(
              entry.state.category,
              entry.state.relativePath
            ) ===
            personalArchiveKey(
              updatedState.category,
              updatedState.relativePath
            )
              ? {
                  ...entry,

                  state:
                    updatedState,
                }
              : entry
        )
    )

  }


  async function updateFavorite(
    entry:
      PersonalArchiveEntry,
    favorite:
      boolean
  ) {

    const key =
      personalArchiveKey(
        entry.state.category,
        entry.state.relativePath
      )


    try {

      setSavingKey(
        key
      )


      setActionError(
        ''
      )


      const response =
        await fetch(
          '/api/archive/favorite',
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                category:
                  entry.state.category,

                relativePath:
                  entry.state.relativePath,

                favorite,
              }),
          }
        )


      if (
        !response.ok
      ) {

        throw new Error(
          favorite
            ? 'Unable to add favorite.'
            : 'Unable to remove favorite.'
        )

      }


      replaceState(
        await response.json() as
          ArchiveState
      )

    } catch (
      favoriteError
    ) {

      console.error(
        favoriteError
      )


      setActionError(
        favoriteError instanceof
          Error
          ? favoriteError.message
          : 'Unable to update favorite.'
      )

    } finally {

      setSavingKey(
        null
      )

    }

  }


  async function resetProgress(
    entry:
      PersonalArchiveEntry,
    openAfter:
      boolean
  ) {

    if (
      !entry.item
    ) {

      return

    }


    if (
      !openAfter
    ) {

      const confirmed =
        window.confirm(
          `Remove "${getEntryTitle(entry)}" from Continue Watching?\n\nIts saved resume position will be reset to the beginning. Watch history, favorites, ratings, and completion count are preserved.`
        )


      if (
        !confirmed
      ) {

        return

      }

    }


    const key =
      personalArchiveKey(
        entry.state.category,
        entry.state.relativePath
      )


    try {

      setSavingKey(
        key
      )


      setActionError(
        ''
      )


      const response =
        await fetch(
          '/api/archive/restart',
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                category:
                  entry.state.category,

                relativePath:
                  entry.state.relativePath,
              }),
          }
        )


      if (
        !response.ok
      ) {

        throw new Error(
          'Unable to reset playback progress.'
        )

      }


      const updatedState =
        await response.json() as
          ArchiveState


      replaceState(
        updatedState
      )


      if (
        openAfter
      ) {

        const url =
          getPersonalArchivePlayerUrl(
            entry.state.category,
            entry.item.relativePath
          )


        if (
          url
        ) {

          navigate(
            url
          )

        }

      }

    } catch (
      resetError
    ) {

      console.error(
        resetError
      )


      setActionError(
        resetError instanceof
          Error
          ? resetError.message
          : 'Unable to reset playback progress.'
      )

    } finally {

      setSavingKey(
        null
      )

    }

  }


  function renderEntry(
    entry:
      PersonalArchiveEntry
  ) {

    const key =
      personalArchiveKey(
        entry.state.category,
        entry.state.relativePath
      )


    const saving =
      savingKey ===
      key


    if (
      !entry.item
    ) {

      return (

        <article
          key={
            key
          }
          className="personal-unavailable-card"
        >

          <div className="personal-unavailable-symbol">
            !
          </div>


          <span className="state-card-category">
            {entry.state.category}
          </span>


          <div className="personal-unavailable-copy">

            <h3>
              {getEntryTitle(
                entry
              )}
            </h3>


            <p>

              {entry.availability ===
              'source-error'
                ? `${entry.state.category} could not be checked right now.`
                : 'The saved activity exists, but the media file is not currently in the library.'}

            </p>


            {entry.state.lastWatched && (

              <span>
                Saved activity is still preserved.
              </span>

            )}

          </div>


          {mode ===
            'favorites' && (

            <button
              type="button"
              className="personal-entry-action danger"
              disabled={
                saving
              }
              onClick={() =>
                void updateFavorite(
                  entry,
                  false
                )
              }
            >
              Remove Favorite
            </button>

          )}

        </article>

      )

    }


    return (

      <div
        key={
          key
        }
        className="personal-entry-card-wrap"
      >

        <ArchiveStateCard
          item={
            entry.item
          }
          state={
            entry.state
          }
          showProgress={
            mode ===
            'continue'
          }
          showResumeAt={
            mode ===
            'continue'
          }
          showLastWatched={
            mode ===
              'history' ||
            mode ===
              'favorites'
          }
        />


        <div className="personal-entry-actions">

          {mode ===
            'favorites' ? (

            <button
              type="button"
              className="personal-entry-action"
              disabled={
                saving
              }
              onClick={() =>
                void updateFavorite(
                  entry,
                  false
                )
              }
            >
              {saving
                ? 'Saving...'
                : 'Remove Favorite'}
            </button>

          ) : (

            <button
              type="button"
              className={
                entry.state.favorite
                  ? 'personal-entry-action active'
                  : 'personal-entry-action'
              }
              disabled={
                saving
              }
              onClick={() =>
                void updateFavorite(
                  entry,
                  !entry.state.favorite
                )
              }
            >

              {entry.state.favorite
                ? '★ Favorite'
                : '☆ Favorite'}

            </button>

          )}


          {mode ===
            'continue' && (

            <>

              <button
                type="button"
                className="personal-entry-action"
                disabled={
                  saving
                }
                onClick={() =>
                  void resetProgress(
                    entry,
                    true
                  )
                }
              >
                Restart
              </button>


              <button
                type="button"
                className="personal-entry-action subtle-danger"
                disabled={
                  saving
                }
                onClick={() =>
                  void resetProgress(
                    entry,
                    false
                  )
                }
              >
                Remove
              </button>

            </>

          )}

        </div>

      </div>

    )

  }


  function renderGrid(
    gridEntries:
      PersonalArchiveEntry[]
  ) {

    return (

      <section className="state-archive-grid personal-archive-grid">

        {gridEntries.map(
          renderEntry
        )}

      </section>

    )

  }


  return (

    <main className="archive-page">

      <header className="archive-page-header">

        <Link
          to="/"
          className="back-button"
        >
          ‹
        </Link>


        <div>

          <span className="archive-eyebrow">
            {eyebrow}
          </span>


          <h1>
            {title}
          </h1>

        </div>

      </header>


      <section className="personal-library-content">

        <nav
          className="personal-library-tabs"
          aria-label="Personal library sections"
        >

          <Link
            to="/favorites"
            className={
              mode ===
              'favorites'
                ? 'personal-library-tab active'
                : 'personal-library-tab'
            }
          >
            Favorites
          </Link>


          <Link
            to="/continue-watching"
            className={
              mode ===
              'continue'
                ? 'personal-library-tab active'
                : 'personal-library-tab'
            }
          >
            Continue Watching
          </Link>


          <Link
            to="/history"
            className={
              mode ===
              'history'
                ? 'personal-library-tab active'
                : 'personal-library-tab'
            }
          >
            History
          </Link>

        </nav>


        <div className="personal-library-toolbar">

          <div className="character-filters personal-character-filters">

            {[
              'All',
              ...knownCharacters,
              'Other',
            ].map(
              (character) => (

                <button
                  key={
                    character
                  }
                  type="button"
                  className={
                    selectedCharacter ===
                    character
                      ? 'filter-button active'
                      : 'filter-button'
                  }
                  onClick={() =>
                    setSelectedCharacter(
                      character
                    )
                  }
                >
                  {character}
                </button>

              )
            )}

          </div>


          <div className="personal-library-controls">

            <input
              type="search"
              className="personal-library-search"
              placeholder={
                `Search ${title}...`
              }
              value={
                searchText
              }
              onChange={(event) =>
                setSearchText(
                  event.target.value
                )
              }
            />


            <select
              value={
                selectedCategory
              }
              onChange={(event) =>
                setSelectedCategory(
                  event.target.value
                )
              }
              aria-label="Archive category"
            >

              <option value="All">
                All Categories
              </option>


              {categories.map(
                (category) => (

                  <option
                    key={
                      category
                    }
                    value={
                      category
                    }
                  >
                    {category}
                  </option>

                )
              )}

            </select>


            <select
              value={
                sortMode
              }
              onChange={(event) =>
                setSortMode(
                  event.target
                    .value as
                    PersonalSortMode
                )
              }
              aria-label="Sort items"
            >

              <option value="recent">
                Recently Watched
              </option>


              <option value="title">
                Title — A to Z
              </option>


              {mode ===
              'favorites' && (

                <option value="rating">
                  Rating — High to Low
                </option>

              )}


              {mode ===
              'favorites' && (

                <option value="category">
                  Category — A to Z
                </option>

              )}


              {mode ===
              'continue' && (

                <option value="progress-high">
                  Progress — Most Watched
                </option>

              )}


              {mode ===
              'continue' && (

                <option value="progress-low">
                  Progress — Least Watched
                </option>

              )}


              {mode ===
              'history' && (

                <option value="most-played">
                  Most Completed
                </option>

              )}

            </select>


            <button
              type="button"
              className="personal-library-button"
              disabled={
                !hasActiveFilters
              }
              onClick={
                clearFilters
              }
            >
              Clear Filters
            </button>


            <button
              type="button"
              className="personal-library-button"
              disabled={
                refreshing
              }
              onClick={() =>
                void loadData(
                  true
                )
              }
            >
              {refreshing
                ? 'Refreshing...'
                : 'Refresh'}
            </button>

          </div>

        </div>


        {unavailableSources.length >
          0 && (

          <div className="archive-state-warning">

            <span>

              Some collections could not be checked:{' '}

              {unavailableSources.join(
                ', '
              )}

              . Saved activity is still preserved.

            </span>


            <button
              type="button"
              onClick={() =>
                void loadData(
                  true
                )
              }
            >
              Retry
            </button>

          </div>

        )}


        {actionError && (

          <div className="settings-status-message settings-status-error personal-library-error">
            {actionError}
          </div>

        )}


        {loading ? (

          <section className="archive-feedback-panel">
            Loading {title}...
          </section>

        ) : error ? (

          <section className="archive-feedback-panel">

            <span className="archive-feedback-kicker">
              UNAVAILABLE
            </span>


            <h2>
              {title} could not be loaded.
            </h2>


            <p>
              {error}
            </p>


            <button
              type="button"
              className="archive-feedback-button"
              onClick={() =>
                void loadData()
              }
            >
              Retry
            </button>

          </section>

        ) : (

          <>

            <div className="personal-library-summary">

              <span>

                Showing{' '}

                <strong>
                  {filteredEntries.length}
                </strong>

                {' of '}

                <strong>
                  {modeEntries.length}
                </strong>

                {' '}

                {mode ===
                  'favorites'
                  ? 'favorites'
                  : mode ===
                      'continue'
                    ? 'items in progress'
                    : 'history items'}

              </span>


              {mode ===
                'continue' &&
              filteredEntries.length >
                0 && (

                <span>

                  Resume positions are saved
                  automatically.

                </span>

              )}


              {missingCount >
                0 && (

                <span className="personal-library-missing-summary">

                  {missingCount}

                  {' '}

                  {missingCount ===
                  1
                    ? 'saved item has'
                    : 'saved items have'}

                  {' missing media'}

                </span>

              )}

            </div>


            {filteredEntries.length ===
              0 ? (

              <section className="archive-feedback-panel archive-empty-filter-state">

                <span className="archive-feedback-kicker">

                  {hasActiveFilters
                    ? 'NO MATCHES'
                    : mode ===
                        'favorites'
                      ? 'NO FAVORITES'
                      : mode ===
                          'continue'
                        ? 'ALL CAUGHT UP'
                        : 'NO HISTORY'}

                </span>


                <h2>

                  {hasActiveFilters
                    ? 'Nothing matches these filters.'
                    : mode ===
                        'favorites'
                      ? 'No favorites yet.'
                      : mode ===
                          'continue'
                        ? 'Nothing is waiting to be continued.'
                        : 'No watch history yet.'}

                </h2>


                <p>

                  {hasActiveFilters
                    ? 'Try another character, category, or search term.'
                    : mode ===
                        'favorites'
                      ? 'Use the star on archive and phone items to save them here.'
                      : mode ===
                          'continue'
                        ? 'Partially watched media will appear here automatically.'
                        : 'Media appears here after you start watching or listening.'}

                </p>


                {hasActiveFilters && (

                  <button
                    type="button"
                    className="archive-feedback-button"
                    onClick={
                      clearFilters
                    }
                  >
                    Clear Filters
                  </button>

                )}

              </section>

            ) : mode ===
              'history' ? (

              <div className="personal-history-groups">

                {historyGroups.map(
                  (
                    [
                      groupName,
                      groupEntries,
                    ]
                  ) => (

                    <section
                      className="personal-history-group"
                      key={
                        groupName
                      }
                    >

                      <div className="personal-history-heading">

                        <h2>
                          {groupName}
                        </h2>


                        <span>
                          {groupEntries.length}
                        </span>

                      </div>


                      {renderGrid(
                        groupEntries
                      )}

                    </section>

                  )
                )}

              </div>

            ) : (

              renderGrid(
                filteredEntries
              )

            )}

          </>

        )}

      </section>

    </main>

  )

}


export default PersonalArchivePage