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

import MemoryEditor from './MemoryEditor'
import ArchiveSequenceNav from './ArchiveSequenceNav'


const characters = [
  'All',
  'Xavier',
  'Zayne',
  'Rafayel',
  'Sylus',
  'Caleb',
]


const characterStorageKey =
  'deepspace-archive-selected-character'


function getInitialArchiveCharacter() {

  try {

    const savedCharacter =
      localStorage.getItem(
        characterStorageKey
      )


    if (
      savedCharacter &&
      characters.includes(
        savedCharacter
      )
    ) {

      return savedCharacter

    }

  } catch (error) {

    console.error(
      'Unable to read selected character:',
      error
    )

  }


  return 'All'

}


function rememberArchiveCharacter(
  character: string
) {

  try {

    localStorage.setItem(
      characterStorageKey,
      character
    )

  } catch (error) {

    console.error(
      'Unable to remember selected character:',
      error
    )

  }

}


type ArchiveResponse = {
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


type ArchiveStatusFilter =
  | 'all'
  | 'favorites'
  | 'watched'
  | 'in-progress'
  | 'not-started'


type ArchiveSort =
  | 'archive-order'
  | 'release-newest'
  | 'release-oldest'
  | 'title-asc'
  | 'title-desc'


type VideoArchivePageProps = {
  title: string
  apiEndpoint: string
  playerPath: string
  returnPath: string
  allowEditing?: boolean
}


type MobileDownloadRecord = {
  relativePath?: string
  status?: string
}


type MobileDownloadBridge = {
  getDownloads?: () => string
}


function getMobileDownloadBridge() {

  if (
    typeof window ===
      'undefined'
  ) {

    return undefined

  }


  return (
    window as typeof window & {
      DeepSpaceArchiveMobile?:
        MobileDownloadBridge
    }
  ).DeepSpaceArchiveMobile

}


function archiveStateKey(
  category: string,
  relativePath: string
) {

  return `${category}\u0000${relativePath}`

}


function buildArchiveStateMap(
  states: ArchiveStateSummary[]
) {

  const nextMap:
    Record<string, ArchiveStateSummary> = {}


  for (
    const state
    of states
  ) {

    nextMap[
      archiveStateKey(
        state.category,
        state.relativePath
      )
    ] =
      state

  }


  return nextMap

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


  if (
    !left.releaseDate
  ) {

    return 1

  }


  if (
    !right.releaseDate
  ) {

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


async function fetchArchiveStates() {

  const response =
    await fetch(
      '/api/archive/states'
    )


  if (
    !response.ok
  ) {

    throw new Error(
      'Unable to load favorite and watch status.'
    )

  }


  return (
    await response.json()
  ) as ArchiveStatesResponse

}


function VideoArchivePage({
  title,
  apiEndpoint,
  playerPath,
  returnPath,
  allowEditing = false,
}: VideoArchivePageProps) {

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
      getInitialArchiveCharacter
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
    useState<ArchiveStatusFilter>(
      'all'
    )

  const [
    sortMode,
    setSortMode,
  ] =
    useState<ArchiveSort>(
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
    nasConnected,
    setNasConnected,
  ] =
    useState(
      true
    )

  const [
    editingItem,
    setEditingItem,
  ] =
    useState<ArchiveItem | null>(
      null
    )

  const [
    savingFavoriteKey,
    setSavingFavoriteKey,
  ] =
    useState<string | null>(
      null
    )


  const isMobileApp =
    typeof window !==
      'undefined' &&
    window.localStorage.getItem(
      'deepspaceArchiveMobile'
    ) ===
      'true'


  const [
    downloadedPaths,
    setDownloadedPaths,
  ] =
    useState<Set<string>>(
      new Set()
    )


  useEffect(
    () => {

      if (
        !isMobileApp
      ) {

        return

      }


      let cancelled =
        false


      function refreshDownloads() {

        if (
          cancelled
        ) {

          return

        }


        const bridge =
          getMobileDownloadBridge()


        if (
          !bridge?.getDownloads
        ) {

          return

        }


        try {

          const rawDownloads =
            bridge.getDownloads()


          const downloads =
            JSON.parse(
              rawDownloads
            ) as MobileDownloadRecord[]


          const nextPaths =
            new Set<string>(
              downloads
                .filter(
                  (download) =>
                    download.status ===
                      'downloaded' &&
                    Boolean(
                      download.relativePath
                    )
                )
                .map(
                  (download) =>
                    download.relativePath as string
                )
            )


          setDownloadedPaths(
            nextPaths
          )

        } catch (downloadError) {

          console.error(
            'Unable to read Android downloads:',
            downloadError
          )

        }

      }


      const initialTimer =
        window.setTimeout(
          refreshDownloads,
          0
        )


      const interval =
        window.setInterval(
          refreshDownloads,
          1000
        )


      return () => {

        cancelled =
          true


        window.clearTimeout(
          initialTimer
        )


        window.clearInterval(
          interval
        )

      }

    },
    [
      isMobileApp,
    ]
  )


  const fetchItems =
    useCallback(
      async () => {

        const response =
          await fetch(
            `${apiEndpoint}`
          )


        if (
          !response.ok
        ) {

          throw new Error(
            `Unable to load ${title}`
          )

        }


        const fromOfflineCache =
          response.headers.get(
            'X-DeepSpace-Archive-Offline-Cache'
          ) ===
            '1'


        const data:
          ArchiveResponse =
          await response.json()


        return {
          items:
            data.items,

          fromOfflineCache,
        }

      },
      [
        apiEndpoint,
        title,
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
            loadedItems.items
          )

          setNasConnected(
            !loadedItems.fromOfflineCache
          )

          setError(
            ''
          )

        } catch (err) {

          console.error(
            err
          )


          setNasConnected(
            false
          )


          setError(
            `Could not load ${title}.`
          )

        } finally {

          setLoading(
            false
          )

        }

      },
      [
        fetchItems,
        title,
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


        if (
          cancelled
        ) {

          return

        }


        if (
          itemResult.status ===
            'fulfilled'
        ) {

          setItems(
            itemResult.value.items
          )

          setNasConnected(
            !itemResult.value
              .fromOfflineCache
          )

          setError(
            ''
          )

        } else {

          console.error(
            itemResult.reason
          )

          setNasConnected(
            false
          )

          setError(
            `Could not load ${title}.`
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
      title,
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


              const matchesSearch =
                !normalizedSearch ||
                item.title
                  .toLowerCase()
                  .includes(
                    normalizedSearch
                  )


              const state =
                archiveStates[
                  archiveStateKey(
                    item.category,
                    item.relativePath
                  )
                ]


              let matchesStatus:
                boolean


              switch (
                statusFilter
              ) {

                case 'favorites':

                  matchesStatus =
                    Boolean(
                      state?.favorite
                    )

                  break

                case 'watched':

                  matchesStatus =
                    Boolean(
                      state?.completed
                    )

                  break

                case 'in-progress':

                  matchesStatus =
                    isInProgress(
                      state
                    )

                  break

                case 'not-started':

                  matchesStatus =
                    !state?.completed &&
                    !isInProgress(
                      state
                    )

                  break

                default:

                  matchesStatus =
                    true

              }


              return (
                matchesCharacter &&
                matchesSearch &&
                matchesStatus
              )

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


  function selectCharacter(
    character: string
  ) {

    rememberArchiveCharacter(
      character
    )


    setSelectedCharacter(
      character
    )

  }


  function clearFilters() {

    selectCharacter(
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
      })


    navigate(
      `${playerPath}?${query}`
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


      if (
        !response.ok
      ) {

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


  return (

    <main className="archive-page">

      <header className="archive-page-header">

        <Link
          to={returnPath}
          className="back-button"
        >
          ‹
        </Link>


        <div>

          <span className="archive-eyebrow">
            DEEPSPACE ARCHIVE
          </span>

          <h1>
            {title}
          </h1>


          <ArchiveSequenceNav />

        </div>

      </header>


      <section className="library-controls archive-library-controls">

        <div className="character-filters">

          {characters.map(
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
                  selectCharacter(
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
            placeholder={
              `Search ${title}...`
            }
            aria-label={
              `Search ${title}`
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
            className="archive-toolbar-select"
            aria-label="Filter by watch status"
            value={
              statusFilter
            }
            onChange={(event) =>
              setStatusFilter(
                event.target.value as
                  ArchiveStatusFilter
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
            aria-label="Sort archive"
            value={
              sortMode
            }
            onChange={(event) =>
              setSortMode(
                event.target.value as
                  ArchiveSort
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
            LOADING LIBRARY
          </span>

          <h2>
            Loading {title}…
          </h2>

          <p>
            Reading your archive and catalog metadata.
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
            LIBRARY UNAVAILABLE
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

          <div className="library-count archive-result-count">

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

            <section className="memory-grid">

              {filteredItems.map(
                (item) => {

                  const key =
                    archiveStateKey(
                      item.category,
                      item.relativePath
                    )

                  const archiveState =
                    archiveStates[
                      key
                    ]


                  return (

                    <VideoArchiveCard
                      key={
                        item.relativePath
                      }
                      item={
                        item
                      }
                      archiveState={
                        archiveState
                      }
                      allowEditing={
                        allowEditing
                      }
                      favoriteSaving={
                        savingFavoriteKey ===
                        key
                      }
                      isMobileApp={
                        isMobileApp
                      }
                      nasConnected={
                        nasConnected
                      }
                      downloaded={
                        downloadedPaths.has(
                          item.relativePath
                        )
                      }
                      onOpen={() =>
                        openItem(
                          item
                        )
                      }
                      onEdit={() =>
                        setEditingItem(
                          item
                        )
                      }
                      onToggleFavorite={() =>
                        void toggleFavorite(
                          item
                        )
                      }
                    />

                  )

                }
              )}

            </section>

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


      {allowEditing &&
        editingItem && (

        <MemoryEditor
          item={
            editingItem
          }
          onClose={() =>
            setEditingItem(
              null
            )
          }
          onSaved={async () => {

            setEditingItem(
              null
            )


            await loadItems()

          }}
        />

      )}

    </main>

  )

}


type VideoArchiveCardProps = {
  item: ArchiveItem
  archiveState?: ArchiveStateSummary
  allowEditing: boolean
  favoriteSaving: boolean
  isMobileApp: boolean
  nasConnected: boolean
  downloaded: boolean
  onOpen: () => void
  onEdit: () => void
  onToggleFavorite: () => void
}


function VideoArchiveCard({
  item,
  archiveState,
  allowEditing,
  favoriteSaving,
  isMobileApp,
  nasConnected,
  downloaded,
  onOpen,
  onEdit,
  onToggleFavorite,
}: VideoArchiveCardProps) {

  const customThumbnailUrl =
    item.thumbnailPath
      ? `/api/custom-thumbnail?${new URLSearchParams({
          filePath:
            item.thumbnailPath,
        })}`
      : null


  const linkedMemories =
    item.linkedMemories ??
    []


  const linkedMemoryArtworkUrls =
    linkedMemories
      .map(
        (memory) =>
          memory.imageUrl
      )
      .filter(
        (
          imageUrl
        ): imageUrl is string =>
          Boolean(
            imageUrl
          )
      )


  const catalogArtworkUrls =
    (
      item.catalogItems ??
      []
    )
      .map(
        (catalogItem) =>
          catalogItem.imageUrl
      )
      .filter(
        (
          imageUrl
        ): imageUrl is string =>
          Boolean(
            imageUrl
          )
      )


  const isMythArtworkSwitcher =
    !customThumbnailUrl &&
    item.category ===
      'Myths' &&
    Boolean(
      item.imageUrl
    ) &&
    linkedMemoryArtworkUrls.length >=
      2


  const [
    showLinkedMythArtwork,
    setShowLinkedMythArtwork,
  ] =
    useState(
      false
    )


  useEffect(
    () => {

      /*
       * The interval owns the Myth / linked-Memory artwork
       * rotation. Avoid a synchronous state reset here so
       * React's set-state-in-effect lint rule remains happy.
       */
      if (
        !isMythArtworkSwitcher
      ) {

        return

      }


      const interval =
        window.setInterval(
          () => {

            setShowLinkedMythArtwork(
              (current) =>
                !current
            )

          },
          4000
        )


      return () => {

        window.clearInterval(
          interval
        )

      }

    },
    [
      isMythArtworkSwitcher,
      item.relativePath,
    ]
  )


  const multipleCatalogArtwork =
    !customThumbnailUrl &&
    !isMythArtworkSwitcher &&
    catalogArtworkUrls.length >
      1


  const catalogImageUrl =
    item.imageUrl ??
    (
      catalogArtworkUrls.length ===
        1
        ? catalogArtworkUrls[0]
        : null
    )


  const [
    generatedThumbnailUrl,
    setGeneratedThumbnailUrl,
  ] =
    useState<string | null>(
      null
    )


  useEffect(
    () => {

      if (
        customThumbnailUrl ||
        catalogImageUrl ||
        multipleCatalogArtwork ||
        isMythArtworkSwitcher ||
        item.mediaType !==
          'video'
      ) {

        return

      }


      let cancelled =
        false


      async function loadThumbnail() {

        try {

          const query =
            new URLSearchParams({
              filePath:
                item.filePath,
            })


          const response =
            await fetch(
              `/api/thumbnail?${query}`
            )


          if (
            !response.ok
          ) {

            return

          }


          const data:
            {
              thumbnailUrl: string
            } =
            await response.json()


          if (
            !cancelled
          ) {

            setGeneratedThumbnailUrl(
              `${data.thumbnailUrl}`
            )

          }

        } catch (error) {

          console.error(
            'Unable to load archive thumbnail:',
            error
          )

        }

      }


      void loadThumbnail()


      return () => {

        cancelled =
          true

      }

    },
    [
      catalogImageUrl,
      customThumbnailUrl,
      isMythArtworkSwitcher,
      item.filePath,
      multipleCatalogArtwork,
      item.mediaType,
    ]
  )


  const thumbnailUrl =
    customThumbnailUrl ??
    catalogImageUrl ??
    generatedThumbnailUrl


  const memoryText =
    item.memoryText ??
    (
      item.catalogItems ??
      []
    )
      .map(
        (catalogItem) =>
          catalogItem.memoryText
      )
      .find(
        (
          value
        ): value is string =>
          Boolean(
            value?.trim()
          )
      ) ??
    null


  const legacyLinkedMemories =
    linkedMemories.length >
      0
      ? []
      : (
          item.catalogItems ??
          []
        )
          .filter(
            (catalogItem) =>
              catalogItem.category ===
              'Memory'
          )


  const displayedLinkedMemories =
    linkedMemories.length >
      0
      ? linkedMemories
      : legacyLinkedMemories


  const inProgress =
    isInProgress(
      archiveState
    )


  const progressPercent =
    archiveState?.durationSeconds &&
    archiveState.durationSeconds > 0
      ? Math.min(
          100,
          Math.max(
            0,
            Math.round(
              (
                archiveState.progressSeconds /
                archiveState.durationSeconds
              ) * 100
            )
          )
        )
      : null


  return (

    <div
      className={
        isMobileApp &&
        !nasConnected &&
        !downloaded
          ? 'memory-card-wrapper mobile-media-not-downloaded'
          : 'memory-card-wrapper'
      }
    >

      <button
        type="button"
        className="memory-card"
        disabled={
          isMobileApp &&
          !nasConnected &&
          !downloaded
        }
        aria-disabled={
          isMobileApp &&
          !nasConnected &&
          !downloaded
        }
        onClick={
          onOpen
        }
      >

        <div className="memory-thumbnail">

          {isMythArtworkSwitcher ? (

            showLinkedMythArtwork ? (

              <div className="memory-thumbnail-pair">

                {linkedMemoryArtworkUrls
                  .slice(
                    0,
                    2
                  )
                  .map(
                    (
                      imageUrl,
                      index
                    ) => (

                      <img
                        key={
                          imageUrl
                        }
                        src={
                          imageUrl
                        }
                        alt={
                          linkedMemories[
                            index
                          ]?.canonicalName ??
                          item.title
                        }
                      />

                    )
                  )}

              </div>

            ) : (

              <img
                src={
                  item.imageUrl ??
                  ''
                }
                alt={
                  `${item.title} Myth artwork`
                }
              />

            )

          ) : multipleCatalogArtwork ? (

            <div className="memory-thumbnail-pair">

              {catalogArtworkUrls
                .slice(
                  0,
                  2
                )
                .map(
                  (
                    imageUrl,
                    index
                  ) => (

                    <img
                      key={
                        imageUrl
                      }
                      src={
                        imageUrl
                      }
                      alt={
                        item.catalogItems?.[
                          index
                        ]?.canonicalName ??
                        item.title
                      }
                    />

                  )
                )}

            </div>

          ) : thumbnailUrl ? (

            <img
              src={
                thumbnailUrl
              }
              alt={
                item.title
              }
            />

          ) : (

            <div className="memory-placeholder">
              ▶
            </div>

          )}


          {isMobileApp && downloaded && (

            <span className="mobile-download-status downloaded">
              ✓ Offline
            </span>

          )}


          {isMobileApp &&
            !nasConnected &&
            !downloaded && (

            <span className="mobile-download-status unavailable">
              Not Offline
            </span>

          )}


          {archiveState?.completed && (

            <span className="memory-watch-status memory-watch-status-complete">
              ✓ Watched
            </span>

          )}


          {!archiveState?.completed &&
            inProgress && (

            <span className="memory-watch-status memory-watch-status-progress">
              {progressPercent !==
              null
                ? `${progressPercent}%`
                : 'In Progress'}
            </span>

          )}


          {memoryText && (

            <div className="memory-text-hover">
              <p>
                {memoryText}
              </p>
            </div>

          )}

        </div>


        <div className="memory-info">

          <div className="memory-title-row">

            <h2>
              {item.title}
            </h2>

            {item.releaseDate && (

              <span className="memory-release-date">
                {formatReleaseDate(
                  item.releaseDate
                )}
              </span>

            )}

          </div>


          <span>
            {item.character}
          </span>


          {displayedLinkedMemories.length >
            0 ? (

            <div className="memory-linked-catalog">

              <span className="memory-catalog-meta">
                {displayedLinkedMemories.length}
                {' linked '}
                {displayedLinkedMemories.length ===
                  1
                  ? 'Memory'
                  : 'Memories'}
              </span>


              <div className="memory-linked-titles">

                {displayedLinkedMemories.map(
                  (catalogItem) => (

                    <span
                      key={
                        catalogItem.id
                      }
                    >
                      {catalogItem.canonicalName}
                    </span>

                  )
                )}

              </div>

            </div>

          ) : item.catalogMatched ? (

            <span className="memory-catalog-meta">

              {[
                item.rarity
                  ? `${item.rarity}★`
                  : null,
                item.position,
                item.attribute,
              ]
                .filter(
                  Boolean
                )
                .join(
                  ' · '
                )}

            </span>

          ) : null}

        </div>

      </button>


      <div className="memory-card-actions">

        <button
          type="button"
          className={
            archiveState?.favorite
              ? 'memory-favorite-button active'
              : 'memory-favorite-button'
          }
          aria-label={
            archiveState?.favorite
              ? `Remove ${item.title} from favorites`
              : `Add ${item.title} to favorites`
          }
          title={
            archiveState?.favorite
              ? 'Remove from Favorites'
              : 'Add to Favorites'
          }
          disabled={
            favoriteSaving
          }
          onClick={(event) => {

            event.stopPropagation()

            onToggleFavorite()

          }}
        >
          {archiveState?.favorite
            ? '★'
            : '☆'}
        </button>


        {allowEditing && (

          <button
            type="button"
            className="memory-edit-button"
            onClick={(event) => {

              event.stopPropagation()

              onEdit()

            }}
          >
            Edit
          </button>

        )}

      </div>

    </div>

  )

}


export default VideoArchivePage