import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'

import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom'

import type {
  ArchiveItem,
} from '../data/archive'

import type {
  Playlist,
  PlaylistItem,
} from '../data/playlists'

import {
  canonicalArchiveCategory,
  fallbackArchiveTitle,
  getPersonalArchiveSource,
  personalArchiveKey,
  personalArchiveSources,
} from '../data/personalArchive'


type PlaylistResponse = {
  items: Playlist[]
}


type PlaylistItemsResponse = {
  items: PlaylistItem[]
}


type ArchiveResponse = {
  count: number
  items: ArchiveItem[]
}


type PlaylistItemAvailability =
  | 'available'
  | 'missing'
  | 'source-error'
  | 'unsupported'


type ResolvedPlaylistItem = {
  playlistItem: PlaylistItem
  archiveItem: ArchiveItem | null
  availability: PlaylistItemAvailability
}


type SourceLibrary = {
  category: string
  items: ArchiveItem[]
}


function buildPlaylistPlayerUrl(
  entry:
    ResolvedPlaylistItem,
  playlistId:
    number
) {

  if (
    !entry.archiveItem
  ) {

    return null

  }


  const category =
    canonicalArchiveCategory(
      entry.playlistItem.category
    )


  const source =
    getPersonalArchiveSource(
      category
    )


  if (
    !source
  ) {

    return null

  }


  const query =
    new URLSearchParams({
      file:
        entry.archiveItem.relativePath,

      playlist:
        playlistId.toString(),

      playlistItem:
        entry.playlistItem.id.toString(),
    })


  /*
   * Phone Call and Phone Video share one player route,
   * so keep the category explicit when entering it.
   */
  if (
    category ===
      'Phone Call' ||
    category ===
      'Phone Video'
  ) {

    query.set(
      'category',
      category
    )

  }


  return (
    `${source.playerPath}?${query}`
  )

}


async function fetchArchiveSource(
  category:
    string
): Promise<SourceLibrary> {

  const source =
    getPersonalArchiveSource(
      category
    )


  if (
    !source
  ) {

    throw new Error(
      `Unsupported playlist category: ${category}`
    )

  }


  const response =
    await fetch(
      source.endpoint
    )


  if (
    !response.ok
  ) {

    throw new Error(
      `Unable to load ${source.category}.`
    )

  }


  const data =
    await response.json() as
      ArchiveResponse


  return {
    category:
      source.category,

    items:
      data.items.map(
        (item) => ({
          ...item,

          category:
            source.category,
        })
      ),
  }

}


function normalizeResolvedPositions(
  entries:
    ResolvedPlaylistItem[]
) {

  return entries.map(
    (
      entry,
      index
    ) => ({
      ...entry,

      playlistItem: {
        ...entry.playlistItem,

        position:
          index,
      },
    })
  )

}


function samePlaylistOrder(
  left:
    ResolvedPlaylistItem[],
  right:
    ResolvedPlaylistItem[]
) {

  if (
    left.length !==
    right.length
  ) {

    return false

  }


  return left.every(
    (
      entry,
      index
    ) =>
      entry.playlistItem.id ===
      right[index]
        ?.playlistItem.id
  )

}


function moveResolvedItem(
  entries:
    ResolvedPlaylistItem[],
  movingItemId:
    number,
  targetItemId:
    number
) {

  const fromIndex =
    entries.findIndex(
      (entry) =>
        entry.playlistItem.id ===
        movingItemId
    )


  const targetIndex =
    entries.findIndex(
      (entry) =>
        entry.playlistItem.id ===
        targetItemId
    )


  if (
    fromIndex < 0 ||
    targetIndex < 0 ||
    fromIndex ===
      targetIndex
  ) {

    return entries

  }


  const next =
    [
      ...entries,
    ]


  const [
    movingEntry,
  ] =
    next.splice(
      fromIndex,
      1
    )


  next.splice(
    targetIndex,
    0,
    movingEntry
  )


  return normalizeResolvedPositions(
    next
  )

}


function PlaylistDetailPage() {

  const navigate =
    useNavigate()


  const {
    playlistId,
  } =
    useParams()


  const numericPlaylistId =
    Number(
      playlistId
    )


  const [
    playlist,
    setPlaylist,
  ] =
    useState<Playlist | null>(
      null
    )


  const [
    items,
    setItems,
  ] =
    useState<
      ResolvedPlaylistItem[]
    >([])


  const [
    sourceErrors,
    setSourceErrors,
  ] =
    useState<
      string[]
    >([])


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
    removingId,
    setRemovingId,
  ] =
    useState<
      number | null
    >(
      null
    )


  const [
    reordering,
    setReordering,
  ] =
    useState(
      false
    )


  const [
    draggingId,
    setDraggingId,
  ] =
    useState<
      number | null
    >(
      null
    )


  const draggingIdRef =
    useRef<
      number | null
    >(
      null
    )


  const dragOriginalItemsRef =
    useRef<
      ResolvedPlaylistItem[] |
      null
    >(
      null
    )


  const dragWorkingItemsRef =
    useRef<
      ResolvedPlaylistItem[] |
      null
    >(
      null
    )


  const fetchPlaylistData =
    useCallback(
      async () => {

        if (
          !Number.isInteger(
            numericPlaylistId
          )
        ) {

          throw new Error(
            'Invalid playlist ID.'
          )

        }


        const [
          playlistsResponse,
          playlistItemsResponse,
        ] =
          await Promise.all([
            fetch(
              '/api/playlists'
            ),

            fetch(
              `/api/playlists/${numericPlaylistId}/items`
            ),
          ])


        if (
          !playlistsResponse.ok ||
          !playlistItemsResponse.ok
        ) {

          throw new Error(
            'Unable to load playlist.'
          )

        }


        const playlistsData =
          await playlistsResponse.json() as
            PlaylistResponse


        const playlistItemsData =
          await playlistItemsResponse.json() as
            PlaylistItemsResponse


        const selectedPlaylist =
          playlistsData.items.find(
            (entry) =>
              entry.id ===
              numericPlaylistId
          )


        if (
          !selectedPlaylist
        ) {

          throw new Error(
            'Playlist not found.'
          )

        }


        const orderedPlaylistItems =
          [
            ...playlistItemsData.items,
          ].sort(
            (
              left,
              right
            ) =>
              left.position -
              right.position
          )


        const requiredCategories =
          Array.from(
            new Set(
              orderedPlaylistItems.map(
                (entry) =>
                  canonicalArchiveCategory(
                    entry.category
                  )
              )
            )
          )


        const supportedCategories =
          new Set(
            personalArchiveSources.map(
              (source) =>
                source.category
            )
          )


        const fetchCategories =
          requiredCategories.filter(
            (category) =>
              supportedCategories.has(
                category
              )
          )


        const results =
          await Promise.allSettled(
            fetchCategories.map(
              (category) =>
                fetchArchiveSource(
                  category
                )
            )
          )


        const itemMap =
          new Map<
            string,
            ArchiveItem
          >()


        const failedCategories =
          new Set<string>()


        results.forEach(
          (
            result,
            index
          ) => {

            const category =
              fetchCategories[
                index
              ]


            if (
              result.status ===
              'rejected'
            ) {

              failedCategories.add(
                category
              )


              return

            }


            for (
              const archiveItem
              of result.value.items
            ) {

              itemMap.set(
                personalArchiveKey(
                  category,
                  archiveItem.relativePath
                ),
                archiveItem
              )

            }

          }
        )


        const resolved =
          orderedPlaylistItems.map(
            (
              playlistItem
            ): ResolvedPlaylistItem => {

              const category =
                canonicalArchiveCategory(
                  playlistItem.category
                )


              if (
                !supportedCategories.has(
                  category
                )
              ) {

                return {
                  playlistItem,

                  archiveItem:
                    null,

                  availability:
                    'unsupported',
                }

              }


              const archiveItem =
                itemMap.get(
                  personalArchiveKey(
                    category,
                    playlistItem.relativePath
                  )
                ) ??
                null


              return {
                playlistItem: {
                  ...playlistItem,

                  category,
                },

                archiveItem,

                availability:
                  archiveItem
                    ? 'available'
                    : failedCategories.has(
                        category
                      )
                      ? 'source-error'
                      : 'missing',
              }

            }
          )


        return {
          playlist:
            selectedPlaylist,

          items:
            resolved,

          sourceErrors:
            Array.from(
              failedCategories
            ),
        }

      },
      [
        numericPlaylistId,
      ]
    )


  const loadPlaylist =
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
            await fetchPlaylistData()


          setPlaylist(
            data.playlist
          )


          setItems(
            data.items
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
            loadError
          )


          setError(
            loadError instanceof
              Error
              ? loadError.message
              : 'Could not load this playlist.'
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
        fetchPlaylistData,
      ]
    )


  useEffect(
    () => {

      const timeoutId =
        window.setTimeout(
          () => {

            void loadPlaylist()

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
      loadPlaylist,
    ]
  )


  const availableItems =
    useMemo(
      () =>
        items.filter(
          (
            entry
          ): entry is
            ResolvedPlaylistItem & {
              archiveItem:
                ArchiveItem
            } =>
              entry.archiveItem !==
              null
        ),
      [
        items,
      ]
    )


  const missingItems =
    items.length -
    availableItems.length


  async function persistPlaylistOrder(
    nextItems:
      ResolvedPlaylistItem[],
    fallbackItems:
      ResolvedPlaylistItem[]
  ) {

    if (
      samePlaylistOrder(
        nextItems,
        fallbackItems
      )
    ) {

      return

    }


    try {

      setReordering(
        true
      )


      setActionError(
        ''
      )


      const response =
        await fetch(
          `/api/playlists/${numericPlaylistId}/items/reorder`,
          {
            method:
              'PUT',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                itemIds:
                  nextItems.map(
                    (entry) =>
                      entry.playlistItem.id
                  ),
              }),
          }
        )


      if (
        !response.ok
      ) {

        const data =
          await response.json()
            .catch(
              () =>
                null
            ) as
              {
                error?: string
              } |
              null


        throw new Error(
          data?.error ??
          'Unable to save playlist order.'
        )

      }


      const data =
        await response.json() as
          PlaylistItemsResponse


      const positionById =
        new Map(
          data.items.map(
            (entry) => [
              entry.id,
              entry.position,
            ]
          )
        )


      setItems(
        (current) =>
          [
            ...current.map(
              (entry) => ({
                ...entry,

                playlistItem: {
                  ...entry.playlistItem,

                  position:
                    positionById.get(
                      entry.playlistItem.id
                    ) ??
                    entry.playlistItem.position,
                },
              })
            ),
          ].sort(
            (
              left,
              right
            ) =>
              left.playlistItem.position -
              right.playlistItem.position
          )
      )

    } catch (
      reorderError
    ) {

      console.error(
        reorderError
      )


      setItems(
        fallbackItems
      )


      setActionError(
        reorderError instanceof
          Error
          ? reorderError.message
          : 'Unable to save playlist order.'
      )

    } finally {

      setReordering(
        false
      )

    }

  }


  function beginPointerReorder(
    event:
      ReactPointerEvent<
        HTMLButtonElement
      >,
    itemId:
      number
  ) {

    if (
      reordering ||
      items.length <=
        1
    ) {

      return

    }


    event.preventDefault()


    draggingIdRef.current =
      itemId


    dragOriginalItemsRef.current =
      items


    dragWorkingItemsRef.current =
      items


    setDraggingId(
      itemId
    )


    event.currentTarget
      .setPointerCapture(
        event.pointerId
      )

  }


  function continuePointerReorder(
    event:
      ReactPointerEvent<
        HTMLButtonElement
      >
  ) {

    const currentDraggingId =
      draggingIdRef.current


    if (
      currentDraggingId ===
      null
    ) {

      return

    }


    event.preventDefault()


    const target =
      document.elementFromPoint(
        event.clientX,
        event.clientY
      )
        ?.closest<
          HTMLElement
        >(
          '[data-playlist-item-id]'
        )


    const targetId =
      Number(
        target?.dataset
          .playlistItemId
      )


    if (
      !Number.isInteger(
        targetId
      ) ||
      targetId ===
        currentDraggingId
    ) {

      return

    }


    const currentItems =
      dragWorkingItemsRef.current ??
      items


    const nextItems =
      moveResolvedItem(
        currentItems,
        currentDraggingId,
        targetId
      )


    if (
      samePlaylistOrder(
        currentItems,
        nextItems
      )
    ) {

      return

    }


    dragWorkingItemsRef.current =
      nextItems


    setItems(
      nextItems
    )

  }


  async function finishPointerReorder(
    event:
      ReactPointerEvent<
        HTMLButtonElement
      >
  ) {

    const currentTarget =
      event.currentTarget


    if (
      currentTarget.hasPointerCapture(
        event.pointerId
      )
    ) {

      currentTarget.releasePointerCapture(
        event.pointerId
      )

    }


    const originalItems =
      dragOriginalItemsRef.current


    const nextItems =
      dragWorkingItemsRef.current


    draggingIdRef.current =
      null


    dragOriginalItemsRef.current =
      null


    dragWorkingItemsRef.current =
      null


    setDraggingId(
      null
    )


    if (
      !originalItems ||
      !nextItems ||
      samePlaylistOrder(
        originalItems,
        nextItems
      )
    ) {

      return

    }


    await persistPlaylistOrder(
      nextItems,
      originalItems
    )

  }


  function cancelPointerReorder(
    event:
      ReactPointerEvent<
        HTMLButtonElement
      >
  ) {

    const originalItems =
      dragOriginalItemsRef.current


    if (
      event.currentTarget
        .hasPointerCapture(
          event.pointerId
        )
    ) {

      event.currentTarget
        .releasePointerCapture(
          event.pointerId
        )

    }


    draggingIdRef.current =
      null


    dragOriginalItemsRef.current =
      null


    dragWorkingItemsRef.current =
      null


    setDraggingId(
      null
    )


    if (
      originalItems
    ) {

      setItems(
        originalItems
      )

    }

  }


  async function moveItemWithKeyboard(
    itemId:
      number,
    direction:
      -1 | 1
  ) {

    if (
      reordering
    ) {

      return

    }


    const fromIndex =
      items.findIndex(
        (entry) =>
          entry.playlistItem.id ===
          itemId
      )


    if (
      fromIndex < 0
    ) {

      return

    }


    const targetIndex =
      fromIndex +
      direction


    if (
      targetIndex < 0 ||
      targetIndex >=
        items.length
    ) {

      return

    }


    const nextItems =
      moveResolvedItem(
        items,
        itemId,
        items[
          targetIndex
        ].playlistItem.id
      )


    setItems(
      nextItems
    )


    await persistPlaylistOrder(
      nextItems,
      items
    )

  }


  function openPlaylistItem(
    entry:
      ResolvedPlaylistItem
  ) {

    const url =
      buildPlaylistPlayerUrl(
        entry,
        numericPlaylistId
      )


    if (
      !url
    ) {

      return

    }


    navigate(
      url
    )

  }


  function playAll() {

    if (
      availableItems.length ===
      0
    ) {

      return

    }


    openPlaylistItem(
      availableItems[0]
    )

  }


  function shufflePlay() {

    if (
      availableItems.length ===
      0
    ) {

      return

    }


    const randomIndex =
      Math.floor(
        Math.random() *
        availableItems.length
      )


    openPlaylistItem(
      availableItems[
        randomIndex
      ]
    )

  }


  async function removeItem(
    entry:
      ResolvedPlaylistItem
  ) {

    const title =
      entry.archiveItem?.title ??
      fallbackArchiveTitle(
        entry.playlistItem.relativePath
      )


    const confirmed =
      window.confirm(
        `Remove "${title}" from this playlist?\n\nThe media file itself will not be deleted.`
      )


    if (
      !confirmed
    ) {

      return

    }


    try {

      setRemovingId(
        entry.playlistItem.id
      )


      setActionError(
        ''
      )


      const response =
        await fetch(
          `/api/playlists/${numericPlaylistId}/items/${entry.playlistItem.id}`,
          {
            method:
              'DELETE',
          }
        )


      if (
        !response.ok
      ) {

        throw new Error(
          'Unable to remove playlist item.'
        )

      }


      setItems(
        (current) =>
          normalizeResolvedPositions(
            current.filter(
              (candidate) =>
                candidate.playlistItem.id !==
                entry.playlistItem.id
            )
          )
      )


      setPlaylist(
        (current) =>
          current
            ? {
                ...current,

                itemCount:
                  Math.max(
                    0,
                    current.itemCount -
                    1
                  ),
              }
            : current
      )

    } catch (
      removeError
    ) {

      console.error(
        removeError
      )


      setActionError(
        removeError instanceof
          Error
          ? removeError.message
          : 'Unable to remove playlist item.'
      )

    } finally {

      setRemovingId(
        null
      )

    }

  }


  if (
    loading
  ) {

    return (

      <main className="archive-page">
        <section className="archive-feedback-panel">
          Loading playlist...
        </section>
      </main>

    )

  }


  if (
    error ||
    !playlist
  ) {

    return (

      <main className="archive-page">

        <header className="archive-page-header">

          <Link
            to="/playlists"
            className="back-button"
          >
            ‹
          </Link>


          <div>

            <span className="archive-eyebrow">
              PLAYLIST
            </span>


            <h1>
              Playlist
            </h1>

          </div>

        </header>


        <section className="archive-feedback-panel">

          <span className="archive-feedback-kicker">
            UNAVAILABLE
          </span>


          <h2>
            Playlist could not be loaded.
          </h2>


          <p>
            {error ||
              'Playlist not found.'}
          </p>


          <button
            type="button"
            className="archive-feedback-button"
            onClick={() =>
              void loadPlaylist()
            }
          >
            Retry
          </button>

        </section>

      </main>

    )

  }


  return (

    <main className="archive-page">

      <header className="archive-page-header">

        <Link
          to="/playlists"
          className="back-button"
        >
          ‹
        </Link>


        <div>

          <span className="archive-eyebrow">
            PLAYLIST
          </span>


          <h1>
            {playlist.name}
          </h1>

        </div>

      </header>


      <section className="playlist-detail-content">

        <section className="playlist-detail-summary playlist-detail-summary-consistency">

          <div>

            <strong>
              {items.length}
            </strong>


            <span>
              {items.length ===
              1
                ? 'Item'
                : 'Items'}
            </span>

          </div>


          <div>

            <strong>
              {availableItems.length}
            </strong>


            <span>
              Available
            </span>

          </div>


          <div>

            <strong>
              {missingItems}
            </strong>


            <span>
              Unavailable
            </span>

          </div>


          <div className="playlist-detail-actions">

            <button
              type="button"
              onClick={
                playAll
              }
              disabled={
                availableItems.length ===
                0
              }
            >
              ▶ Play All
            </button>


            <button
              type="button"
              onClick={
                shufflePlay
              }
              disabled={
                availableItems.length ===
                0
              }
            >
              ⇄ Shuffle
            </button>


            <button
              type="button"
              disabled={
                refreshing
              }
              onClick={() =>
                void loadPlaylist(
                  true
                )
              }
            >
              {refreshing
                ? 'Refreshing...'
                : 'Refresh'}
            </button>

          </div>

        </section>


        {sourceErrors.length >
          0 && (

          <div className="archive-state-warning">

            <span>

              Could not verify:{' '}

              {sourceErrors.join(
                ', '
              )}

              . Playlist entries are preserved.

            </span>


            <button
              type="button"
              onClick={() =>
                void loadPlaylist(
                  true
                )
              }
            >
              Retry
            </button>

          </div>

        )}


        {items.length >
          1 && (

          <div className="playlist-reorder-help">

            <span className="playlist-reorder-grip" aria-hidden="true">
              ⋮⋮
            </span>


            <span>
              Drag the handle to reorder. On a keyboard, focus the handle and use ↑ or ↓.
            </span>


            {reordering && (
              <strong>
                Saving order...
              </strong>
            )}

          </div>

        )}


        {actionError && (

          <div className="settings-status-message settings-status-error playlist-detail-error">
            {actionError}
          </div>

        )}


        {items.length ===
          0 ? (

          <section className="archive-feedback-panel">

            <span className="archive-feedback-kicker">
              EMPTY PLAYLIST
            </span>


            <h2>
              This playlist is empty.
            </h2>


            <p>
              Open any playable archive item and
              add it to this playlist.
            </p>

          </section>

        ) : (

          <section className="playlist-item-list playlist-item-list-consistency">

            {items.map(
              (
                entry,
                index
              ) => (

                <PlaylistResolvedCard
                  key={
                    entry.playlistItem.id
                  }
                  entry={
                    entry
                  }
                  index={
                    index
                  }
                  removing={
                    removingId ===
                    entry.playlistItem.id
                  }
                  reordering={
                    reordering
                  }
                  dragging={
                    draggingId ===
                    entry.playlistItem.id
                  }
                  onDragPointerDown={(event) =>
                    beginPointerReorder(
                      event,
                      entry.playlistItem.id
                    )
                  }
                  onDragPointerMove={
                    continuePointerReorder
                  }
                  onDragPointerUp={(event) =>
                    void finishPointerReorder(
                      event
                    )
                  }
                  onDragPointerCancel={
                    cancelPointerReorder
                  }
                  onReorderKeyDown={(event) => {

                    if (
                      event.key ===
                      'ArrowUp'
                    ) {

                      event.preventDefault()


                      void moveItemWithKeyboard(
                        entry.playlistItem.id,
                        -1
                      )

                    }


                    if (
                      event.key ===
                      'ArrowDown'
                    ) {

                      event.preventDefault()


                      void moveItemWithKeyboard(
                        entry.playlistItem.id,
                        1
                      )

                    }

                  }}
                  onOpen={() =>
                    openPlaylistItem(
                      entry
                    )
                  }
                  onRemove={() =>
                    void removeItem(
                      entry
                    )
                  }
                />

              )
            )}

          </section>

        )}

      </section>

    </main>

  )

}


type PlaylistResolvedCardProps = {
  entry: ResolvedPlaylistItem
  index: number
  removing: boolean
  reordering: boolean
  dragging: boolean
  onDragPointerDown: (
    event:
      ReactPointerEvent<
        HTMLButtonElement
      >
  ) => void
  onDragPointerMove: (
    event:
      ReactPointerEvent<
        HTMLButtonElement
      >
  ) => void
  onDragPointerUp: (
    event:
      ReactPointerEvent<
        HTMLButtonElement
      >
  ) => void
  onDragPointerCancel: (
    event:
      ReactPointerEvent<
        HTMLButtonElement
      >
  ) => void
  onReorderKeyDown: (
    event:
      ReactKeyboardEvent<
        HTMLButtonElement
      >
  ) => void
  onOpen: () => void
  onRemove: () => void
}


function PlaylistResolvedCard({
  entry,
  index,
  removing,
  reordering,
  dragging,
  onDragPointerDown,
  onDragPointerMove,
  onDragPointerUp,
  onDragPointerCancel,
  onReorderKeyDown,
  onOpen,
  onRemove,
}: PlaylistResolvedCardProps) {

  const item =
    entry.archiveItem


  const phoneLogStyle =
    entry.playlistItem.category ===
      'Phone Call' ||
    entry.playlistItem.category ===
      'Phone Video'


  const customThumbnailUrl =
    item &&
    !phoneLogStyle &&
    item.thumbnailPath
      ? `/api/custom-thumbnail?${
          new URLSearchParams({
            filePath:
              item.thumbnailPath,
          })
        }`
      : null


  const catalogImageUrl =
    item &&
    !phoneLogStyle
      ? (
          item.imageUrl ??
          item.catalogItems
            ?.map(
              (catalogItem) =>
                catalogItem.imageUrl
            )
            .find(
              (
                imageUrl
              ): imageUrl is string =>
                Boolean(
                  imageUrl?.trim()
                )
            ) ??
          null
        )
      : null


  const [
    generatedThumbnail,
    setGeneratedThumbnail,
  ] =
    useState<{
      filePath: string
      url: string
    } | null>(
      null
    )


  useEffect(
    () => {

      if (
        !item ||
        phoneLogStyle ||
        customThumbnailUrl ||
        catalogImageUrl ||
        item.mediaType !==
          'video'
      ) {

        return

      }


      const itemFilePath =
        item.filePath


      let cancelled =
        false


      async function loadThumbnail() {

        try {

          const query =
            new URLSearchParams({
              filePath:
                itemFilePath,
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


          const data =
            await response.json() as {
              thumbnailUrl:
                string
            }


          if (
            !cancelled
          ) {

            setGeneratedThumbnail({
              filePath:
                itemFilePath,

              url:
                data.thumbnailUrl,
            })

          }

        } catch (
          thumbnailError
        ) {

          console.error(
            'Unable to load playlist thumbnail:',
            thumbnailError
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
      item,
      phoneLogStyle,
    ]
  )


  const thumbnailUrl =
    customThumbnailUrl ??
    catalogImageUrl ??
    (
      item &&
      generatedThumbnail
        ?.filePath ===
        item.filePath
        ? generatedThumbnail.url
        : null
    )


  if (
    !item
  ) {

    const unavailableMessage =
      entry.availability ===
      'source-error'
        ? `${entry.playlistItem.category} could not be checked right now.`
        : entry.availability ===
            'unsupported'
          ? 'This saved playlist category is not currently supported.'
          : 'The media file is no longer present in the library.'


    return (

      <article
        className={
          dragging
            ? 'playlist-item-row playlist-item-row-unavailable playlist-item-row-dragging'
            : 'playlist-item-row playlist-item-row-unavailable'
        }
        data-playlist-item-id={
          entry.playlistItem.id
        }
      >

        <button
          type="button"
          className="playlist-item-drag-handle"
          aria-label={`Reorder ${fallbackArchiveTitle(
            entry.playlistItem.relativePath
          )}`}
          title="Drag to reorder · Arrow keys also work"
          disabled={
            reordering
          }
          onPointerDown={
            onDragPointerDown
          }
          onPointerMove={
            onDragPointerMove
          }
          onPointerUp={
            onDragPointerUp
          }
          onPointerCancel={
            onDragPointerCancel
          }
          onKeyDown={
            onReorderKeyDown
          }
        >
          ⋮⋮
        </button>


        <span className="playlist-item-position">
          {index + 1}
        </span>


        <div className="playlist-item-unavailable-icon">
          !
        </div>


        <div className="playlist-item-info">

          <span className="playlist-item-category-badge">
            {entry.playlistItem.category}
          </span>


          <h2>
            {fallbackArchiveTitle(
              entry.playlistItem.relativePath
            )}
          </h2>


          <span>
            {unavailableMessage}
          </span>

        </div>


        <button
          type="button"
          className="playlist-item-remove"
          disabled={
            removing ||
            reordering
          }
          onClick={
            onRemove
          }
        >
          {removing
            ? 'Removing...'
            : 'Remove'}
        </button>

      </article>

    )

  }


  return (

    <article
      className={
        dragging
          ? 'playlist-item-row playlist-item-row-available playlist-item-row-dragging'
          : 'playlist-item-row playlist-item-row-available'
      }
      data-playlist-item-id={
        entry.playlistItem.id
      }
    >

      <button
        type="button"
        className="playlist-item-drag-handle"
        aria-label={`Reorder ${item.title}`}
        title="Drag to reorder · Arrow keys also work"
        disabled={
          reordering
        }
        onPointerDown={
          onDragPointerDown
        }
        onPointerMove={
          onDragPointerMove
        }
        onPointerUp={
          onDragPointerUp
        }
        onPointerCancel={
          onDragPointerCancel
        }
        onKeyDown={
          onReorderKeyDown
        }
      >
        ⋮⋮
      </button>


      <span className="playlist-item-position">
        {index + 1}
      </span>


      <button
        type="button"
        className="playlist-item-main"
        onClick={
          onOpen
        }
      >

        <div
          className={
            phoneLogStyle
              ? 'playlist-item-thumbnail playlist-item-phone-placeholder'
              : 'playlist-item-thumbnail'
          }
        >

          {phoneLogStyle ? (

            <span className="playlist-item-phone-icon">

              {entry.playlistItem.category ===
                'Phone Call'
                ? '☎'
                : '▶'}

            </span>

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

        </div>


        <div className="playlist-item-info">

          <span className="playlist-item-category-badge">
            {entry.playlistItem.category}
          </span>


          <h2>
            {item.title}
          </h2>


          <span>

            {item.character ||
              'Archive Item'}

            {item.releaseDate
              ? ` · ${item.releaseDate}`
              : ''}

          </span>

        </div>

      </button>


      <button
        type="button"
        className="playlist-item-remove"
        disabled={
          removing ||
          reordering
        }
        onClick={
          onRemove
        }
      >
        {removing
          ? 'Removing...'
          : 'Remove'}
      </button>

    </article>

  )

}


export default PlaylistDetailPage