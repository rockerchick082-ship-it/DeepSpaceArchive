import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  Link,
} from 'react-router-dom'

import type {
  Playlist,
} from '../data/playlists'


type PlaylistResponse = {
  items: Playlist[]
}


async function fetchPlaylists() {

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


  return (
    await response.json()
  ) as PlaylistResponse

}


function PlaylistsPage() {

  const [
    playlists,
    setPlaylists,
  ] =
    useState<Playlist[]>(
      []
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
    actionError,
    setActionError,
  ] =
    useState(
      ''
    )


  const [
    newPlaylistName,
    setNewPlaylistName,
  ] =
    useState(
      ''
    )


  const [
    creating,
    setCreating,
  ] =
    useState(
      false
    )


  const [
    deletingId,
    setDeletingId,
  ] =
    useState<
      number | null
    >(
      null
    )


  const loadPlaylists =
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
            await fetchPlaylists()


          setPlaylists(
            data.items
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
              : 'Unable to load playlists.'
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

            void loadPlaylists()

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
      loadPlaylists,
    ]
  )


  async function createPlaylist() {

    const name =
      newPlaylistName
        .trim()


    if (
      !name
    ) {

      return

    }


    try {

      setCreating(
        true
      )


      setActionError(
        ''
      )


      const response =
        await fetch(
          '/api/playlists',
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                name,
              }),
          }
        )


      if (
        !response.ok
      ) {

        throw new Error(
          'Unable to create playlist.'
        )

      }


      setNewPlaylistName(
        ''
      )


      await loadPlaylists(
        true
      )

    } catch (
      createError
    ) {

      console.error(
        createError
      )


      setActionError(
        createError instanceof
          Error
          ? createError.message
          : 'Unable to create playlist.'
      )

    } finally {

      setCreating(
        false
      )

    }

  }


  async function deletePlaylist(
    playlist:
      Playlist
  ) {

    const confirmed =
      window.confirm(
        `Delete playlist "${playlist.name}"?\n\nThis removes the playlist and its saved playlist entries only. Your media files are not deleted.`
      )


    if (
      !confirmed
    ) {

      return

    }


    try {

      setDeletingId(
        playlist.id
      )


      setActionError(
        ''
      )


      const response =
        await fetch(
          `/api/playlists/${playlist.id}`,
          {
            method:
              'DELETE',
          }
        )


      if (
        !response.ok
      ) {

        throw new Error(
          'Unable to delete playlist.'
        )

      }


      setPlaylists(
        (current) =>
          current.filter(
            (entry) =>
              entry.id !==
              playlist.id
          )
      )

    } catch (
      deleteError
    ) {

      console.error(
        deleteError
      )


      setActionError(
        deleteError instanceof
          Error
          ? deleteError.message
          : 'Unable to delete playlist.'
      )

    } finally {

      setDeletingId(
        null
      )

    }

  }


  const totalItems =
    playlists.reduce(
      (
        total,
        playlist
      ) =>
        total +
        playlist.itemCount,
      0
    )


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
            PERSONAL LIBRARY
          </span>


          <h1>
            Playlists
          </h1>

        </div>

      </header>


      <section className="playlist-manager-content">

        <div className="playlist-manager-summary">

          <div>

            <strong>
              {playlists.length}
            </strong>


            <span>
              {playlists.length ===
              1
                ? 'Playlist'
                : 'Playlists'}
            </span>

          </div>


          <div>

            <strong>
              {totalItems}
            </strong>


            <span>
              Saved Items
            </span>

          </div>

        </div>


        <div className="playlist-manager-create">

          <input
            value={
              newPlaylistName
            }
            placeholder="New playlist name..."
            onChange={(event) =>
              setNewPlaylistName(
                event.target.value
              )
            }
            onKeyDown={(event) => {

              if (
                event.key ===
                  'Enter' &&
                !creating
              ) {

                void createPlaylist()

              }

            }}
          />


          <button
            type="button"
            disabled={
              creating ||
              !newPlaylistName.trim()
            }
            onClick={() =>
              void createPlaylist()
            }
          >
            {creating
              ? 'Creating...'
              : '+ Create Playlist'}
          </button>


          <button
            type="button"
            className="playlist-manager-refresh"
            disabled={
              refreshing
            }
            onClick={() =>
              void loadPlaylists(
                true
              )
            }
          >
            {refreshing
              ? 'Refreshing...'
              : 'Refresh'}
          </button>

        </div>


        {actionError && (

          <div className="settings-status-message settings-status-error playlist-manager-error">
            {actionError}
          </div>

        )}


        {loading ? (

          <section className="archive-feedback-panel">
            Loading playlists...
          </section>

        ) : error ? (

          <section className="archive-feedback-panel">

            <span className="archive-feedback-kicker">
              UNAVAILABLE
            </span>


            <h2>
              Playlists could not be loaded.
            </h2>


            <p>
              {error}
            </p>


            <button
              type="button"
              className="archive-feedback-button"
              onClick={() =>
                void loadPlaylists()
              }
            >
              Retry
            </button>

          </section>

        ) : playlists.length ===
          0 ? (

          <section className="archive-feedback-panel">

            <span className="archive-feedback-kicker">
              NO PLAYLISTS
            </span>


            <h2>
              Create your first playlist.
            </h2>


            <p>
              Then add playable archive items from
              their player pages.
            </p>

          </section>

        ) : (

          <section className="playlist-manager-grid">

            {playlists.map(
              (playlist) => (

                <article
                  key={
                    playlist.id
                  }
                  className="playlist-manager-card playlist-manager-card-clickable"
                >

                  <Link
                    to={
                      `/playlists/${playlist.id}`
                    }
                    className="playlist-manager-card-open-overlay"
                    aria-label={
                      `Open playlist ${playlist.name}`
                    }
                  />


                  <div className="playlist-manager-card-copy">

                    <span className="archive-eyebrow">
                      PLAYLIST
                    </span>


                    <h2>
                      {playlist.name}
                    </h2>


                    <p>

                      {playlist.itemCount}

                      {' '}

                      {playlist.itemCount ===
                      1
                        ? 'item'
                        : 'items'}

                    </p>

                  </div>


                  <span
                    className="playlist-manager-card-arrow"
                    aria-hidden="true"
                  >
                    ›
                  </span>


                  <button
                    type="button"
                    className="playlist-manager-delete-safe"
                    disabled={
                      deletingId ===
                      playlist.id
                    }
                    onClick={() =>
                      void deletePlaylist(
                        playlist
                      )
                    }
                  >
                    {deletingId ===
                      playlist.id
                      ? 'Deleting...'
                      : 'Delete Playlist'}
                  </button>

                </article>

              )
            )}

          </section>

        )}

      </section>

    </main>

  )

}


export default PlaylistsPage