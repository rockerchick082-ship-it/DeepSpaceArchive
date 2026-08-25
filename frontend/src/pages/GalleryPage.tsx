import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Link,
  useLocation,
} from 'react-router-dom'


type GalleryItem = {
  id: string
  title: string
  character: string | null
  folder: string
  fileName: string
  filePath: string
  relativePath: string
  extension: string
}


type GalleryResponse = {
  connected: boolean
  count: number
  items: GalleryItem[]
}


type GallerySortMode =
  | 'gallery-order'
  | 'title-asc'
  | 'title-desc'
  | 'character-asc'
  | 'folder-asc'


type GallerySyncResult = {
  character: string
  sourceUrl: string
  discovered: number
  downloaded: number
  skippedExisting: number
  failed: number
  localCount: number
}


const characters = [
  'All',
  'Xavier',
  'Zayne',
  'Rafayel',
  'Sylus',
  'Caleb',
  'Other',
]


const syncCharacters = [
  'Xavier',
  'Zayne',
  'Rafayel',
  'Sylus',
  'Caleb',
]


function imageUrl(
  item:
    GalleryItem
) {

  const query =
    new URLSearchParams({
      path:
        item.relativePath,
    })


  return (
    `/api/gallery/file?${query}`
  )

}


async function fetchGallery() {

  const response =
    await fetch(
      '/api/gallery'
    )


  if (
    !response.ok
  ) {

    throw new Error(
      'Unable to load Gallery.'
    )

  }


  return (
    await response.json()
  ) as GalleryResponse

}


function readSavedSyncResults() {

  const results:
    GallerySyncResult[] =
      []


  for (
    const character
    of syncCharacters
  ) {

    const stored =
      localStorage.getItem(
        `deepspace-gallery-memory-sync-${character}`
      )


    if (
      !stored
    ) {

      continue

    }


    try {

      const parsed =
        JSON.parse(
          stored
        ) as GallerySyncResult


      if (
        parsed &&
        typeof parsed.character ===
          'string'
      ) {

        results.push(
          parsed
        )

      }

    } catch {

      // Ignore stale or malformed
      // browser-only sync summaries.

    }

  }


  return results

}


function GalleryPage() {

  const location =
    useLocation()


  const galleryReturnLocation =
    `${location.pathname}${location.search}${location.hash}`


  const [
    items,
    setItems,
  ] =
    useState<GalleryItem[]>(
      []
    )


  const [
    connected,
    setConnected,
  ] =
    useState(
      true
    )


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
    selectedCharacter,
    setSelectedCharacter,
  ] =
    useState(
      'All'
    )


  const [
    selectedFolder,
    setSelectedFolder,
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
    useState<GallerySortMode>(
      'gallery-order'
    )


  const [
    selectedItem,
    setSelectedItem,
  ] =
    useState<GalleryItem | null>(
      null
    )


  const [
    deletingPath,
    setDeletingPath,
  ] =
    useState<string | null>(
      null
    )


  const [
    deleteError,
    setDeleteError,
  ] =
    useState(
      ''
    )


  const [
    savedSyncResults,
    setSavedSyncResults,
  ] =
    useState<GallerySyncResult[]>(
      () =>
        readSavedSyncResults()
    )


  const loadGallery =
    useCallback(
      async (
        mode:
          'initial' |
          'refresh' =
            'initial'
      ) => {

        try {

          if (
            mode ===
            'initial'
          ) {

            setLoading(
              true
            )

          } else {

            setRefreshing(
              true
            )

          }


          const data =
            await fetchGallery()


          setItems(
            data.items
          )


          setConnected(
            data.connected
          )


          setSavedSyncResults(
            readSavedSyncResults()
          )


          setError(
            ''
          )

        } catch (loadError) {

          console.error(
            loadError
          )


          setError(
            loadError instanceof
              Error
              ? loadError.message
              : 'Gallery could not be loaded.'
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
      []
    )


  useEffect(
    () => {

      const timeoutId =
        window.setTimeout(
          () => {

            void loadGallery()

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
      loadGallery,
    ]
  )


  const folders =
    useMemo(
      () => {

        return [
          'All',
          ...Array.from(
            new Set(
              items
                .map(
                  (item) =>
                    item.folder
                )
                .filter(
                  Boolean
                )
            )
          )
            .sort(
              (
                left,
                right
              ) =>
                left.localeCompare(
                  right,
                  undefined,
                  {
                    numeric:
                      true,

                    sensitivity:
                      'base',
                  }
                )
            ),
        ]

      },
      [
        items,
      ]
    )


  const filteredItems =
    useMemo(
      () => {

        const query =
          searchText
            .trim()
            .toLowerCase()


        const filtered =
          items.filter(
            (item) => {

              const matchesCharacter =
                selectedCharacter ===
                  'All' ||
                (
                  selectedCharacter ===
                    'Other'
                    ? !item.character
                    : item.character ===
                      selectedCharacter
                )


              const matchesFolder =
                selectedFolder ===
                  'All' ||
                item.folder ===
                  selectedFolder


              const matchesSearch =
                !query ||
                item.title
                  .toLowerCase()
                  .includes(
                    query
                  ) ||
                item.fileName
                  .toLowerCase()
                  .includes(
                    query
                  ) ||
                item.folder
                  .toLowerCase()
                  .includes(
                    query
                  ) ||
                (
                  item.character
                    ?.toLowerCase()
                    .includes(
                      query
                    ) ??
                  false
                )


              return (
                matchesCharacter &&
                matchesFolder &&
                matchesSearch
              )

            }
          )


        if (
          sortMode ===
          'gallery-order'
        ) {

          return filtered

        }


        return [
          ...filtered,
        ].sort(
          (
            left,
            right
          ) => {

            if (
              sortMode ===
              'title-desc'
            ) {

              return right.title
                .localeCompare(
                  left.title,
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
              'character-asc'
            ) {

              const characterCompare =
                (
                  left.character ??
                  'Other'
                ).localeCompare(
                  right.character ??
                  'Other',
                  undefined,
                  {
                    sensitivity:
                      'base',
                  }
                )


              if (
                characterCompare !==
                0
              ) {

                return characterCompare

              }

            }


            if (
              sortMode ===
              'folder-asc'
            ) {

              const folderCompare =
                left.folder
                  .localeCompare(
                    right.folder,
                    undefined,
                    {
                      numeric:
                        true,

                      sensitivity:
                        'base',
                    }
                  )


              if (
                folderCompare !==
                0
              ) {

                return folderCompare

              }

            }


            return left.title
              .localeCompare(
                right.title,
                undefined,
                {
                  numeric:
                    true,

                  sensitivity:
                    'base',
                }
              )

          }
        )

      },
      [
        items,
        searchText,
        selectedCharacter,
        selectedFolder,
        sortMode,
      ]
    )


  const selectedIndex =
    selectedItem
      ? filteredItems.findIndex(
          (item) =>
            item.relativePath ===
            selectedItem.relativePath
        )
      : -1


  const hasActiveFilters =
    selectedCharacter !==
      'All' ||
    selectedFolder !==
      'All' ||
    searchText.trim() !==
      '' ||
    sortMode !==
      'gallery-order'


  const successfulSyncCount =
    savedSyncResults.filter(
      (result) =>
        result.failed ===
          0 &&
        result.localCount ===
          result.discovered
    ).length


  function clearFilters() {

    setSelectedCharacter(
      'All'
    )


    setSelectedFolder(
      'All'
    )


    setSearchText(
      ''
    )


    setSortMode(
      'gallery-order'
    )

  }


  async function deleteImage(
    item:
      GalleryItem
  ) {

    const confirmed =
      window.confirm(
        `Delete "${item.title}" from the Gallery?\n\nThis permanently deletes the local image file.`
      )


    if (
      !confirmed
    ) {

      return

    }


    try {

      setDeletingPath(
        item.relativePath
      )


      setDeleteError(
        ''
      )


      const query =
        new URLSearchParams({
          path:
            item.relativePath,
        })


      const response =
        await fetch(
          `/api/gallery/file?${query}`,
          {
            method:
              'DELETE',
          }
        )


      const data =
        await response.json()
          .catch(
            () => null
          ) as
            {
              error?: string
            } |
            null


      if (
        !response.ok
      ) {

        throw new Error(
          data?.error ??
          'Unable to delete image.'
        )

      }


      setItems(
        (current) =>
          current.filter(
            (candidate) =>
              candidate.relativePath !==
              item.relativePath
          )
      )


      if (
        selectedItem?.relativePath ===
        item.relativePath
      ) {

        setSelectedItem(
          null
        )

      }

    } catch (
      deleteFailure
    ) {

      console.error(
        deleteFailure
      )


      setDeleteError(
        deleteFailure instanceof
          Error
          ? deleteFailure.message
          : 'Unable to delete image.'
      )

    } finally {

      setDeletingPath(
        null
      )

    }

  }


  function previousImage() {

    if (
      filteredItems.length ===
      0
    ) {

      return

    }


    const targetIndex =
      selectedIndex <=
        0
        ? filteredItems.length -
          1
        : selectedIndex -
          1


    setSelectedItem(
      filteredItems[
        targetIndex
      ]
    )

  }


  function nextImage() {

    if (
      filteredItems.length ===
      0
    ) {

      return

    }


    const targetIndex =
      selectedIndex < 0 ||
      selectedIndex >=
        filteredItems.length -
        1
        ? 0
        : selectedIndex +
          1


    setSelectedItem(
      filteredItems[
        targetIndex
      ]
    )

  }


  useEffect(
    () => {

      if (
        !selectedItem
      ) {

        return

      }


      function handleKeyDown(
        event:
          KeyboardEvent
      ) {

        if (
          event.key ===
          'Escape'
        ) {

          setSelectedItem(
            null
          )

        }


        if (
          event.key ===
          'ArrowLeft'
        ) {

          previousImage()

        }


        if (
          event.key ===
          'ArrowRight'
        ) {

          nextImage()

        }

      }


      window.addEventListener(
        'keydown',
        handleKeyDown
      )


      return () => {

        window.removeEventListener(
          'keydown',
          handleKeyDown
        )

      }

    }
  )


  return (

    <main className="archive-page">

      <header className="archive-page-header gallery-page-header">

        <Link
          to="/"
          className="back-button"
        >
          ‹
        </Link>


        <div>

          <span className="archive-eyebrow">
            DEEPSPACE ARCHIVE
          </span>

          <h1>
            Gallery
          </h1>

        </div>


        <Link
          to="/settings/gallery-wiki"
          state={{
            returnTo:
              galleryReturnLocation,
          }}
          className="gallery-header-settings"
          aria-label="Gallery wiki source settings"
          title="Gallery wiki source settings"
        >
          ⚙
        </Link>

      </header>


      <section className="gallery-page-content">

        <div className="gallery-toolbar gallery-toolbar-consistency">

          <div className="gallery-character-filters">

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


          <div className="gallery-secondary-controls gallery-secondary-controls-consistency">

            <input
              type="search"
              className="gallery-search-input"
              placeholder="Search Gallery..."
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
                selectedFolder
              }
              onChange={(event) =>
                setSelectedFolder(
                  event.target.value
                )
              }
              aria-label="Gallery folder"
            >

              {folders.map(
                (folder) => (

                  <option
                    key={
                      folder
                    }
                    value={
                      folder
                    }
                  >
                    {folder ===
                      'All'
                      ? 'All Folders'
                      : folder}
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
                    GallerySortMode
                )
              }
              aria-label="Gallery sort order"
            >

              <option value="gallery-order">
                Gallery Order
              </option>

              <option value="title-asc">
                Title — A to Z
              </option>

              <option value="title-desc">
                Title — Z to A
              </option>

              <option value="character-asc">
                Character — A to Z
              </option>

              <option value="folder-asc">
                Folder — A to Z
              </option>

            </select>


            <button
              type="button"
              className="gallery-toolbar-button"
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
              className="gallery-toolbar-button"
              disabled={
                refreshing
              }
              onClick={() =>
                void loadGallery(
                  'refresh'
                )
              }
            >
              {refreshing
                ? 'Refreshing...'
                : 'Refresh'}
            </button>

          </div>

        </div>


        {loading ? (

          <div className="gallery-message">
            Loading Gallery...
          </div>

        ) : error ? (

          <div className="gallery-message gallery-message-error">

            <strong>
              Gallery could not be loaded.
            </strong>


            <span>
              {error}
            </span>


            <button
              type="button"
              className="archive-retry-button"
              onClick={() =>
                void loadGallery()
              }
            >
              Retry
            </button>

          </div>

        ) : !connected ? (

          <div className="gallery-message">

            <strong>
              Gallery folder not found.
            </strong>


            <span>
              Create a Gallery folder inside
              your configured media library.
            </span>


            <Link
              to="/settings/file-locations"
              className="gallery-message-link"
            >
              Check File Locations
            </Link>

          </div>

        ) : (

          <>

            <div className="gallery-status-row">

              <div className="gallery-count">

                Showing{' '}

                <strong>
                  {filteredItems.length}
                </strong>

                {' of '}

                <strong>
                  {items.length}
                </strong>

                {' images'}

              </div>


              <div className="gallery-source-status">

                <span className="gallery-source-dot" />

                <span>
                  Local Gallery connected
                </span>


                <span className="gallery-source-separator">
                  ·
                </span>


                <span>

                  {savedSyncResults.length ===
                  0
                    ? 'No saved wiki sync results'
                    : `${successfulSyncCount} of ${syncCharacters.length} character syncs current at last check`}

                </span>


                <Link
                  to="/settings/gallery-wiki"
                  state={{
                    returnTo:
                      galleryReturnLocation,
                  }}
                >
                  Manage Sources
                </Link>

              </div>

            </div>


            {deleteError && (

              <div className="settings-status-message settings-status-error gallery-delete-error">
                {deleteError}
              </div>

            )}


            {filteredItems.length ===
              0 ? (

              <div className="gallery-message gallery-empty-state">

                <strong>
                  No Gallery Images Match
                </strong>


                <span>
                  Try a different character,
                  folder, or search term.
                </span>


                <button
                  type="button"
                  className="archive-retry-button"
                  onClick={
                    clearFilters
                  }
                >
                  Clear Filters
                </button>

              </div>

            ) : (

              <section className="gallery-grid">

                {filteredItems.map(
                  (item) => (

                    <div
                      key={
                        item.relativePath
                      }
                      className="gallery-card-wrapper"
                    >

                      <button
                        type="button"
                        className="gallery-card"
                        onClick={() =>
                          setSelectedItem(
                            item
                          )
                        }
                      >

                        <img
                          src={
                            imageUrl(
                              item
                            )
                          }
                          alt={
                            item.title
                          }
                          loading="lazy"
                        />


                        <div className="gallery-card-overlay">

                          <strong>
                            {item.title}
                          </strong>


                          <span>
                            {[
                              item.character,
                              item.folder,
                            ]
                              .filter(
                                Boolean
                              )
                              .join(
                                ' · '
                              ) ||
                              'Gallery'}
                          </span>

                        </div>

                      </button>


                      <button
                        type="button"
                        className="gallery-card-delete"
                        disabled={
                          deletingPath ===
                          item.relativePath
                        }
                        onClick={() =>
                          void deleteImage(
                            item
                          )
                        }
                        aria-label={
                          `Delete ${item.title}`
                        }
                        title="Delete image"
                      >
                        {deletingPath ===
                          item.relativePath
                          ? '…'
                          : '🗑'}
                      </button>

                    </div>

                  )
                )}

              </section>

            )}

          </>

        )}

      </section>


      {selectedItem && (

        <div
          className="gallery-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={
            selectedItem.title
          }
          onMouseDown={(event) => {

            if (
              event.target ===
              event.currentTarget
            ) {

              setSelectedItem(
                null
              )

            }

          }}
        >

          <button
            type="button"
            className="gallery-lightbox-close"
            onClick={() =>
              setSelectedItem(
                null
              )
            }
            aria-label="Close image"
          >
            ×
          </button>


          {filteredItems.length >
            1 && (

            <button
              type="button"
              className="gallery-lightbox-arrow gallery-lightbox-arrow-left"
              onClick={
                previousImage
              }
              aria-label="Previous image"
            >
              ‹
            </button>

          )}


          <figure className="gallery-lightbox-figure">

            <img
              src={
                imageUrl(
                  selectedItem
                )
              }
              alt={
                selectedItem.title
              }
            />


            <figcaption>

              <strong>
                {selectedItem.title}
              </strong>


              <span>
                {[
                  selectedItem.character,
                  selectedItem.folder,
                ]
                  .filter(
                    Boolean
                  )
                  .join(
                    ' · '
                  ) ||
                  selectedItem.fileName}
              </span>


              {selectedIndex >=
                0 && (

                <span>
                  {selectedIndex +
                    1}
                  {' / '}
                  {filteredItems.length}
                </span>

              )}


              <span className="gallery-lightbox-hint">
                ← → navigate · Esc closes
              </span>


              <button
                type="button"
                className="gallery-lightbox-delete"
                disabled={
                  deletingPath ===
                  selectedItem.relativePath
                }
                onClick={() =>
                  void deleteImage(
                    selectedItem
                  )
                }
              >
                {deletingPath ===
                  selectedItem.relativePath
                  ? 'Deleting...'
                  : 'Delete Photo'}
              </button>

            </figcaption>

          </figure>


          {filteredItems.length >
            1 && (

            <button
              type="button"
              className="gallery-lightbox-arrow gallery-lightbox-arrow-right"
              onClick={
                nextImage
              }
              aria-label="Next image"
            >
              ›
            </button>

          )}

        </div>

      )}

    </main>

  )

}


export default GalleryPage