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

import type {
  ArchiveItem,
} from '../data/archive'


type PhoneArchivePageProps = {
  title: string
  eyebrow: string
  endpoint: string
  category: string
}


type LibraryResponse = {
  count: number
  items: ArchiveItem[]
}


type ArchiveStateSummary = {
  category: string
  relativePath: string
  favorite: boolean
  rating: number | null
  playCount: number
  lastWatched: string | null
  progressSeconds: number
  durationSeconds: number | null
  completed: boolean
  totalWatchSeconds: number
}


type ArchiveStatesResponse = {
  count: number
  items: ArchiveStateSummary[]
}


type PhoneStatusFilter =
  | 'all'
  | 'favorites'
  | 'watched'
  | 'in-progress'
  | 'not-started'


type PhoneSort =
  | 'archive-order'
  | 'release-newest'
  | 'release-oldest'
  | 'title-asc'
  | 'title-desc'


const characters = [
  'All',
  'Xavier',
  'Zayne',
  'Rafayel',
  'Sylus',
  'Caleb',
]


function archiveStateKey(
  category: string,
  relativePath: string
) {

  return `${category}\u0000${relativePath}`

}


function buildArchiveStateMap(
  states: ArchiveStateSummary[]
) {

  const map:
    Record<string, ArchiveStateSummary> = {}


  for (
    const state
    of states
  ) {

    map[
      archiveStateKey(
        state.category,
        state.relativePath
      )
    ] =
      state

  }


  return map

}


function isInProgress(
  state:
    ArchiveStateSummary |
    undefined
) {

  return Boolean(
    state &&
    !state.completed &&
    state.progressSeconds > 5
  )

}


function compareReleaseDates(
  left: ArchiveItem,
  right: ArchiveItem,
  newestFirst: boolean
) {

  if (
    !left.releaseDate &&
    !right.releaseDate
  ) {

    return left.title.localeCompare(
      right.title
    )

  }


  if (!left.releaseDate) {

    return 1

  }


  if (!right.releaseDate) {

    return -1

  }


  const comparison =
    left.releaseDate.localeCompare(
      right.releaseDate
    )


  if (
    comparison !== 0
  ) {

    return newestFirst
      ? -comparison
      : comparison

  }


  return left.title.localeCompare(
    right.title
  )

}


function formatReleaseDate(
  value: string
) {

  const match =
    /^(\d{4})-(\d{2})-(\d{2})/.exec(
      value
    )


  if (!match) {

    return value

  }


  const year =
    Number(
      match[1]
    )

  const month =
    Number(
      match[2]
    )

  const day =
    Number(
      match[3]
    )


  if (
    !Number.isInteger(
      year
    ) ||
    !Number.isInteger(
      month
    ) ||
    !Number.isInteger(
      day
    )
  ) {

    return value

  }


  return new Intl.DateTimeFormat(
    undefined,
    {
      year:
        'numeric',

      month:
        'short',

      day:
        'numeric',
    }
  )
    .format(
      new Date(
        year,
        month - 1,
        day
      )
    )

}


async function fetchArchiveStates() {

  const response =
    await fetch(
      '/api/archive/states'
    )


  if (!response.ok) {

    throw new Error(
      'Unable to load favorite and watch status.'
    )

  }


  return (
    await response.json()
  ) as ArchiveStatesResponse

}


function PhoneArchivePage({
  title,
  eyebrow,
  endpoint,
  category,
}: PhoneArchivePageProps) {

  const navigate =
    useNavigate()

  const [
    items,
    setItems,
  ] =
    useState<ArchiveItem[]>(
      []
    )

  const [
    archiveStates,
    setArchiveStates,
  ] =
    useState<
      Record<
        string,
        ArchiveStateSummary
      >
    >({})

  const [
    selectedCharacter,
    setSelectedCharacter,
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
    statusFilter,
    setStatusFilter,
  ] =
    useState<PhoneStatusFilter>(
      'all'
    )

  const [
    sortMode,
    setSortMode,
  ] =
    useState<PhoneSort>(
      'archive-order'
    )

  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    )

  const [
    error,
    setError,
  ] =
    useState(
      ''
    )

  const [
    stateWarning,
    setStateWarning,
  ] =
    useState(
      ''
    )

  const [
    savingFavoriteKey,
    setSavingFavoriteKey,
  ] =
    useState<string | null>(
      null
    )


  const fetchItems =
    useCallback(
      async () => {

        const response =
          await fetch(
            endpoint
          )


        if (!response.ok) {

          throw new Error(
            'Unable to load phone archive.'
          )

        }


        const data:
          LibraryResponse =
          await response.json()


        return data.items

      },
      [
        endpoint,
      ]
    )


  const loadItems =
    useCallback(
      async () => {

        try {

          setLoading(
            true
          )


          const loadedItems =
            await fetchItems()


          setItems(
            loadedItems
          )

          setError(
            ''
          )

        } catch (loadError) {

          console.error(
            loadError
          )


          setError(
            'This phone collection could not be loaded.'
          )

        } finally {

          setLoading(
            false
          )

        }

      },
      [
        fetchItems,
      ]
    )


  const loadStates =
    useCallback(
      async () => {

        try {

          const data =
            await fetchArchiveStates()


          setArchiveStates(
            buildArchiveStateMap(
              data.items
            )
          )

          setStateWarning(
            ''
          )

        } catch (stateError) {

          console.error(
            stateError
          )


          setStateWarning(
            'Favorite and watch-status information is temporarily unavailable.'
          )

        }

      },
      []
    )


  useEffect(
    () => {

      let cancelled =
        false


      async function loadInitialData() {

        const [
          itemResult,
          stateResult,
        ] =
          await Promise.allSettled([
            fetchItems(),
            fetchArchiveStates(),
          ])


        if (cancelled) {

          return

        }


        if (
          itemResult.status ===
            'fulfilled'
        ) {

          setItems(
            itemResult.value
          )

          setError(
            ''
          )

        } else {

          console.error(
            itemResult.reason
          )


          setError(
            'This phone collection could not be loaded.'
          )

        }


        if (
          stateResult.status ===
            'fulfilled'
        ) {

          setArchiveStates(
            buildArchiveStateMap(
              stateResult.value.items
            )
          )

          setStateWarning(
            ''
          )

        } else {

          console.error(
            stateResult.reason
          )


          setStateWarning(
            'Favorite and watch-status information is temporarily unavailable.'
          )

        }


        setLoading(
          false
        )

      }


      void loadInitialData()


      return () => {

        cancelled =
          true

      }

    },
    [
      fetchItems,
    ]
  )


  const filteredItems =
    useMemo(
      () => {

        const normalizedSearch =
          searchText
            .trim()
            .toLowerCase()


        const nextItems =
          items.filter(
            (item) => {

              const matchesCharacter =
                selectedCharacter ===
                  'All' ||
                item.character ===
                  selectedCharacter


              if (!matchesCharacter) {

                return false

              }


              const matchesSearch =
                !normalizedSearch ||
                item.title
                  .toLowerCase()
                  .includes(
                    normalizedSearch
                  ) ||
                item.character
                  .toLowerCase()
                  .includes(
                    normalizedSearch
                  )


              if (!matchesSearch) {

                return false

              }


              const state =
                archiveStates[
                  archiveStateKey(
                    item.category,
                    item.relativePath
                  )
                ]


              switch (
                statusFilter
              ) {

                case 'favorites':

                  return Boolean(
                    state?.favorite
                  )

                case 'watched':

                  return Boolean(
                    state?.completed
                  )

                case 'in-progress':

                  return isInProgress(
                    state
                  )

                case 'not-started':

                  return (
                    !state?.completed &&
                    !isInProgress(
                      state
                    )
                  )

                default:

                  return true

              }

            }
          )


        switch (
          sortMode
        ) {

          case 'release-newest':

            return [
              ...nextItems,
            ].sort(
              (left, right) =>
                compareReleaseDates(
                  left,
                  right,
                  true
                )
            )

          case 'release-oldest':

            return [
              ...nextItems,
            ].sort(
              (left, right) =>
                compareReleaseDates(
                  left,
                  right,
                  false
                )
            )

          case 'title-asc':

            return [
              ...nextItems,
            ].sort(
              (left, right) =>
                left.title.localeCompare(
                  right.title
                )
            )

          case 'title-desc':

            return [
              ...nextItems,
            ].sort(
              (left, right) =>
                right.title.localeCompare(
                  left.title
                )
            )

          default:

            return nextItems

        }

      },
      [
        archiveStates,
        items,
        searchText,
        selectedCharacter,
        sortMode,
        statusFilter,
      ]
    )


  const hasActiveFilters =
    selectedCharacter !==
      'All' ||
    Boolean(
      searchText.trim()
    ) ||
    statusFilter !==
      'all'


  function clearFilters() {

    setSelectedCharacter(
      'All'
    )

    setSearchText(
      ''
    )

    setStatusFilter(
      'all'
    )

  }


  function openItem(
    item: ArchiveItem
  ) {

    const query =
      new URLSearchParams({
        file:
          item.relativePath,

        category,
      })


    navigate(
      `/phone/watch?${query}`
    )

  }


  async function toggleFavorite(
    item: ArchiveItem
  ) {

    const key =
      archiveStateKey(
        item.category,
        item.relativePath
      )

    const currentState =
      archiveStates[
        key
      ]


    try {

      setSavingFavoriteKey(
        key
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
                  item.category,

                relativePath:
                  item.relativePath,

                favorite:
                  !currentState?.favorite,
              }),
          }
        )


      if (!response.ok) {

        throw new Error(
          'Unable to update favorite.'
        )

      }


      const nextState:
        ArchiveStateSummary =
        await response.json()


      setArchiveStates(
        (current) => ({
          ...current,

          [key]:
            nextState,
        })
      )

      setStateWarning(
        ''
      )

    } catch (favoriteError) {

      console.error(
        favoriteError
      )


      setStateWarning(
        'Could not update favorite. Try again.'
      )

    } finally {

      setSavingFavoriteKey(
        null
      )

    }

  }


  const typeLabel =
    category ===
      'Phone Video'
      ? 'VIDEO CALL'
      : 'VOICE CALL'


  return (

    <main className="archive-page">

      <header className="archive-page-header">

        <Link
          to="/phone"
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


          <nav
            className="archive-sequence-nav"
            aria-label="Phone call collection navigation"
          >

            {category ===
              'Phone Video' ? (

              <Link
                to="/phone/calls"
                className="archive-sequence-link"
                rel="prev"
              >
                <span aria-hidden="true">
                  ‹
                </span>

                <span>
                  Phone Calls
                </span>
              </Link>

            ) : (

              <Link
                to="/phone/videos"
                className="archive-sequence-link"
                rel="next"
              >
                <span>
                  Video Calls
                </span>

                <span aria-hidden="true">
                  ›
                </span>
              </Link>

            )}

          </nav>

        </div>

      </header>


      <section className="phone-archive-content phone-consistency-content">

        <section className="library-controls archive-library-controls">

          <div className="character-filters">

            {characters.map(
              (character) => (

                <button
                  type="button"
                  key={
                    character
                  }
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


          <div className="archive-toolbar-row">

            <input
              className="memory-search archive-toolbar-search"
              type="search"
              value={
                searchText
              }
              placeholder={
                `Search ${title}...`
              }
              aria-label={
                `Search ${title}`
              }
              onChange={(event) =>
                setSearchText(
                  event.target.value
                )
              }
            />


            <select
              className="archive-toolbar-select"
              aria-label="Filter by watch status"
              value={
                statusFilter
              }
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as
                    PhoneStatusFilter
                )
              }
            >

              <option value="all">
                All Statuses
              </option>

              <option value="favorites">
                Favorites
              </option>

              <option value="watched">
                Watched
              </option>

              <option value="in-progress">
                In Progress
              </option>

              <option value="not-started">
                Not Started
              </option>

            </select>


            <select
              className="archive-toolbar-select"
              aria-label="Sort phone archive"
              value={
                sortMode
              }
              onChange={(event) =>
                setSortMode(
                  event.target.value as
                    PhoneSort
                )
              }
            >

              <option value="archive-order">
                Archive Order
              </option>

              <option value="release-newest">
                Release Date — Newest
              </option>

              <option value="release-oldest">
                Release Date — Oldest
              </option>

              <option value="title-asc">
                Title — A to Z
              </option>

              <option value="title-desc">
                Title — Z to A
              </option>

            </select>


            {hasActiveFilters && (

              <button
                type="button"
                className="archive-clear-filters"
                onClick={
                  clearFilters
                }
              >
                Clear Filters
              </button>

            )}

          </div>

        </section>


        {stateWarning && (

          <div
            className="archive-state-warning"
            role="status"
          >
            {stateWarning}

            <button
              type="button"
              onClick={() =>
                void loadStates()
              }
            >
              Retry Status
            </button>
          </div>

        )}


        {loading && (

          <section
            className="archive-feedback-panel"
            aria-live="polite"
          >

            <span className="archive-feedback-kicker">
              LOADING PHONE ARCHIVE
            </span>

            <h2>
              Loading {title}…
            </h2>

            <p>
              Reading your phone media and watch status.
            </p>

          </section>

        )}


        {!loading &&
          error && (

          <section
            className="archive-feedback-panel archive-feedback-error"
            role="alert"
          >

            <span className="archive-feedback-kicker">
              PHONE ARCHIVE UNAVAILABLE
            </span>

            <h2>
              {error}
            </h2>

            <p>
              Check that the media library is reachable, then try again.
            </p>

            <button
              type="button"
              className="archive-feedback-button"
              onClick={() =>
                void loadItems()
              }
            >
              Retry
            </button>

          </section>

        )}


        {!loading &&
          !error && (

          <>

            <div className="library-count archive-result-count phone-archive-count">

              Showing{' '}
              <strong>
                {filteredItems.length}
              </strong>
              {' of '}
              <strong>
                {items.length}
              </strong>
              {' '}
              {selectedCharacter ===
              'All'
                ? title
                : `${selectedCharacter} ${title}`}

            </div>


            {filteredItems.length >
              0 ? (

              <div
                className={
                  category === 'Phone Video'
                    ? 'phone-media-grid phone-consistency-grid phone-log-grid phone-log-video-grid'
                    : 'phone-media-grid phone-consistency-grid phone-log-grid phone-log-voice-list'
                }
              >

                {filteredItems.map(
                  (item) => {

                    const key =
                      archiveStateKey(
                        item.category,
                        item.relativePath
                      )

                    const state =
                      archiveStates[
                        key
                      ]

                    const inProgress =
                      isInProgress(
                        state
                      )

                    const progressPercent =
                      state?.durationSeconds &&
                      state.durationSeconds > 0
                        ? Math.min(
                            100,
                            Math.max(
                              0,
                              Math.round(
                                (
                                  state.progressSeconds /
                                  state.durationSeconds
                                ) * 100
                              )
                            )
                          )
                        : null

                    return (

                      <div
                        className="phone-media-card-wrapper"
                        key={
                          item.relativePath
                        }
                      >

                        <button
                          type="button"
                          className="phone-media-card phone-consistency-card"
                          onClick={() =>
                            openItem(
                              item
                            )
                          }
                        >

                          <div className="phone-log-icon" aria-hidden="true">
                            {category ===
                              'Phone Video'
                              ? '▶'
                              : '☎'}
                          </div>


                          <div className="phone-log-copy">

                            <div className="phone-log-heading">

                              <span className="phone-log-character">
                                {item.character}
                              </span>

                              <span className="phone-log-type">
                                {typeLabel}
                              </span>

                            </div>


                            <strong className="phone-log-title">
                              {item.title}
                            </strong>


                            <div className="phone-media-meta phone-log-meta">

                              {item.releaseDate && (

                                <span>
                                  {formatReleaseDate(
                                    item.releaseDate
                                  )}
                                </span>

                              )}

                              {state?.completed && (

                                <span className="phone-log-watch phone-watch-complete">
                                  ✓ Watched
                                </span>

                              )}

                              {!state?.completed &&
                              inProgress &&
                              progressPercent !==
                                null && (

                                <span className="phone-log-watch phone-watch-progress">
                                  {progressPercent}% watched
                                </span>

                              )}

                            </div>

                          </div>


                          <span className="phone-log-play" aria-hidden="true">
                            ▶
                          </span>

                        </button>


                        <button
                          type="button"
                          className={
                            state?.favorite
                              ? 'phone-media-favorite active'
                              : 'phone-media-favorite'
                          }
                          title={
                            state?.favorite
                              ? 'Remove from Favorites'
                              : 'Add to Favorites'
                          }
                          aria-label={
                            state?.favorite
                              ? `Remove ${item.title} from Favorites`
                              : `Add ${item.title} to Favorites`
                          }
                          disabled={
                            savingFavoriteKey ===
                            key
                          }
                          onClick={() =>
                            void toggleFavorite(
                              item
                            )
                          }
                        >
                          {state?.favorite
                            ? '★'
                            : '☆'}
                        </button>

                      </div>

                    )

                  }
                )}

              </div>

            ) : (

              <section className="archive-feedback-panel archive-empty-filter-state">

                <span className="archive-feedback-kicker">
                  NO MATCHES
                </span>

                <h2>
                  Nothing matches these filters.
                </h2>

                <p>
                  Try another character, status, or search term.
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

            )}

          </>

        )}

      </section>

    </main>

  )

}


export default PhoneArchivePage