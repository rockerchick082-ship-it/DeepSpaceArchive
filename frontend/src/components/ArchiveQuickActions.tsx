import {
  useRef,
  useState,
} from 'react'

import type {
  ArchiveState,
} from '../data/archiveState'

import {
  addPlaybackLast,
  addPlaybackNext,
} from '../data/playbackQueue'


type ArchiveQuickActionsProps = {
  category: string
  relativePath: string
  title: string
  character: string
  playerPath: string
  state?: ArchiveState
  onStateChange?: (
    state:
      ArchiveState
  ) => void
}


function itemPlayerUrl(
  playerPath:
    string,
  category:
    string,
  relativePath:
    string
) {

  const query =
    new URLSearchParams({
      file:
        relativePath,
    })


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
    `${playerPath}?${query}`
  )

}


function absoluteShareUrl(
  relativeUrl:
    string
) {

  if (
    window.location.hash
      .startsWith(
        '#/'
      )
  ) {

    return (
      `${window.location.origin}${window.location.pathname}#${relativeUrl}`
    )

  }


  return new URL(
    relativeUrl,
    window.location.origin
  ).toString()

}


export default function ArchiveQuickActions({
  category,
  relativePath,
  title,
  character,
  playerPath,
  state,
  onStateChange,
}: ArchiveQuickActionsProps) {

  const detailsRef =
    useRef<HTMLDetailsElement | null>(
      null
    )


  const [
    busy,
    setBusy,
  ] =
    useState(
      false
    )


  const [
    message,
    setMessage,
  ] =
    useState(
      ''
    )


  const [
    localState,
    setLocalState,
  ] =
    useState<ArchiveState | null>(
      null
    )


  const [
    playlistOpen,
    setPlaylistOpen,
  ] =
    useState(
      false
    )


  const [
    playlistLoading,
    setPlaylistLoading,
  ] =
    useState(
      false
    )


  const [
    playlists,
    setPlaylists,
  ] =
    useState<
      {
        id: number
        name: string
        itemCount: number
      }[]
    >([])


  const [
    selectedPlaylist,
    setSelectedPlaylist,
  ] =
    useState(
      ''
    )


  const effectiveState =
    localState ??
    state


  const mobileBridge =
    (
      window as typeof window & {
        DeepSpaceArchiveMobile?: {
          download?: (
            payloadJson:
              string
          ) => void
        }
      }
    ).DeepSpaceArchiveMobile


  const canDownloadOffline =
    Boolean(
      mobileBridge?.download
    )


  function close() {

    detailsRef.current
      ?.removeAttribute(
        'open'
      )

  }


  async function updateState(
    endpoint:
      string,
    extra:
      Record<
        string,
        unknown
      > = {}
  ) {

    try {

      setBusy(
        true
      )

      setMessage(
        ''
      )


      const response =
        await fetch(
          endpoint,
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                category,
                relativePath,
                ...extra,
              }),
          }
        )


      if (
        !response.ok
      ) {

        throw new Error(
          'Unable to update watch state.'
        )

      }


      const next =
        await response.json() as
          ArchiveState


      setLocalState(
        next
      )


      onStateChange?.(
        next
      )


      return next

    } catch (
      error
    ) {

      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to update this item.'
      )


      return null

    } finally {

      setBusy(
        false
      )

    }

  }


  async function copyText(
    value:
      string
  ) {

    if (
      navigator.clipboard
        ?.writeText
    ) {

      await navigator.clipboard
        .writeText(
          value
        )


      return true

    }


    const input =
      document.createElement(
        'textarea'
      )


    input.value =
      value

    input.setAttribute(
      'readonly',
      ''
    )

    input.style.position =
      'fixed'

    input.style.opacity =
      '0'


    document.body.appendChild(
      input
    )


    input.select()


    const copied =
      document.execCommand(
        'copy'
      )


    input.remove()


    return copied

  }


  async function copyOrShare() {

    const relativeUrl =
      itemPlayerUrl(
        playerPath,
        category,
        relativePath
      )


    const url =
      absoluteShareUrl(
        relativeUrl
      )


    try {

      if (
        navigator.share
      ) {

        await navigator.share({
          title,
          url,
        })


        setMessage(
          'Shared.'
        )

      } else {

        const copied =
          await copyText(
            url
          )


        setMessage(
          copied
            ? 'Link copied.'
            : 'Could not copy the link.'
        )

      }

    } catch (
      error
    ) {

      if (
        error instanceof DOMException &&
        error.name ===
          'AbortError'
      ) {

        return

      }


      try {

        const copied =
          await copyText(
            url
          )


        setMessage(
          copied
            ? 'Link copied.'
            : 'Could not copy the link.'
        )

      } catch {

        setMessage(
          'Could not copy the link.'
        )

      }

    }

  }


  async function togglePlaylistPicker() {

    const nextOpen =
      !playlistOpen


    setPlaylistOpen(
      nextOpen
    )


    if (
      !nextOpen ||
      playlists.length >
        0
    ) {

      return

    }


    try {

      setPlaylistLoading(
        true
      )


      const response =
        await fetch(
          '/api/playlists'
        )


      if (
        !response.ok
      ) {

        throw new Error(
          'Unable to load playlists.'
        )

      }


      const data =
        await response.json() as {
          items?: {
            id: number
            name: string
            itemCount: number
          }[]
        }


      setPlaylists(
        Array.isArray(
          data.items
        )
          ? data.items
          : []
      )

    } catch (
      error
    ) {

      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load playlists.'
      )

    } finally {

      setPlaylistLoading(
        false
      )

    }

  }


  async function addToSelectedPlaylist() {

    const playlistId =
      Number(
        selectedPlaylist
      )


    if (
      !Number.isInteger(
        playlistId
      )
    ) {

      return

    }


    try {

      setBusy(
        true
      )


      const response =
        await fetch(
          `/api/playlists/${playlistId}/items`,
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                category,
                relativePath,
              }),
          }
        )


      if (
        !response.ok
      ) {

        const body =
          await response.json()
            .catch(
              () => null
            ) as {
              error?: string
            } | null


        throw new Error(
          body?.error ??
          'Unable to add to playlist.'
        )

      }


      const selectedName =
        playlists.find(
          (playlist) =>
            playlist.id ===
              playlistId
        )?.name


      setMessage(
        selectedName
          ? `Added to ${selectedName}.`
          : 'Added to playlist.'
      )


      setPlaylistOpen(
        false
      )

      setSelectedPlaylist(
        ''
      )

    } catch (
      error
    ) {

      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to add to playlist.'
      )

    } finally {

      setBusy(
        false
      )

    }

  }


  function downloadOffline() {

    if (
      !mobileBridge?.download
    ) {

      setMessage(
        'Offline download is only available in the Android app.'
      )

      return

    }


    const query =
      new URLSearchParams({
        relativePath,
      })


    const downloadUrl =
      `${window.location.origin}/api/mobile/media/download?${query}`


    const fileName =
      relativePath
        .split(
          /[\\/]/
        )
        .pop() ??
      title


    try {

      mobileBridge.download(
        JSON.stringify({
          title,
          character,
          category,
          relativePath,
          downloadUrl,
          fileName,
        })
      )


      setMessage(
        'Download queued.'
      )

    } catch {

      setMessage(
        'Unable to queue the offline download.'
      )

    }

  }

  const queueItem = {
    category,
    relativePath,
    title,
    character,
    playerPath,
  }


  return (

    <details
      ref={
        detailsRef
      }
      className="archive-quick-actions"
    >

      <summary
        aria-label={`More actions for ${title}`}
        title="More actions"
      >
        â€¢â€¢â€¢
      </summary>


      <div className="archive-quick-actions-menu">

        <button
          type="button"
          onClick={() => {

            addPlaybackNext(
              queueItem
            )

            setMessage(
              'Added to Play Next.'
            )

          }}
        >
          Play Next
        </button>


        <button
          type="button"
          onClick={() => {

            addPlaybackLast(
              queueItem
            )

            setMessage(
              'Added to Up Next.'
            )

          }}
        >
          Add to Queue
        </button>


        <button
          type="button"
          onClick={() =>
            void togglePlaylistPicker()
          }
        >
          Add to Playlist
        </button>


        {playlistOpen && (

          <div className="quick-action-playlist-picker">

            {playlistLoading ? (

              <small>
                Loading playlistsâ€¦
              </small>

            ) : playlists.length ===
                0 ? (

              <small>
                No playlists yet. Create one from the Playlists page.
              </small>

            ) : (

              <>

                <select
                  value={
                    selectedPlaylist
                  }
                  onChange={(event) =>
                    setSelectedPlaylist(
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    Choose playlistâ€¦
                  </option>

                  {playlists.map(
                    (playlist) => (

                      <option
                        key={
                          playlist.id
                        }
                        value={
                          playlist.id
                        }
                      >
                        {playlist.name}
                      </option>

                    )
                  )}
                </select>


                <button
                  type="button"
                  disabled={
                    busy ||
                    !selectedPlaylist
                  }
                  onClick={() =>
                    void addToSelectedPlaylist()
                  }
                >
                  + Add
                </button>

              </>

            )}

          </div>

        )}


        {canDownloadOffline && (

          <button
            type="button"
            onClick={
              downloadOffline
            }
          >
            Download Offline
          </button>

        )}

        <span className="archive-quick-actions-divider" />


        <button
          type="button"
          disabled={
            busy
          }
          onClick={async () => {

            const next =
              await updateState(
                '/api/archive/completion',
                {
                  completed:
                    !effectiveState?.completed,
                }
              )


            if (next) {

              setMessage(
                next.completed
                  ? 'Marked watched.'
                  : 'Marked unwatched.'
              )

            }

          }}
        >
          {effectiveState?.completed
            ? 'Mark Unwatched'
            : 'Mark Watched'}
        </button>


        <button
          type="button"
          disabled={
            busy
          }
          onClick={async () => {

            const next =
              await updateState(
                '/api/archive/restart'
              )


            if (next) {

              setMessage(
                'Progress reset.'
              )

            }

          }}
        >
          Reset Progress
        </button>


        <span className="archive-quick-actions-divider" />


        <button
          type="button"
          onClick={() =>
            void copyOrShare()
          }
        >
          Share / Copy Link
        </button>


        {message && (

          <small
            role="status"
            className="archive-quick-actions-message"
          >
            {message}
          </small>

        )}


        <button
          type="button"
          className="archive-quick-actions-close"
          onClick={
            close
          }
        >
          Close
        </button>

      </div>

    </details>

  )

}