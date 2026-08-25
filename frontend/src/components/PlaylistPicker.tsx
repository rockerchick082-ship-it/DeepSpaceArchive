import {
  useEffect,
  useState,
} from 'react'

import type {
  Playlist,
} from '../data/playlists'


type PlaylistResponse = {
  items: Playlist[]
}


type PlaylistPickerProps = {
  category: string
  relativePath: string
}


async function fetchPlaylists() {

  const response =
    await fetch(
      '/api/playlists'
    )


  if (!response.ok) {

    return []

  }


  const data:
    PlaylistResponse =
    await response.json()


  return data.items

}


function PlaylistPicker({
  category,
  relativePath,
}: PlaylistPickerProps) {

  const [playlists, setPlaylists] =
    useState<Playlist[]>([])


  const [selectedPlaylist, setSelectedPlaylist] =
    useState('')


  const [newPlaylistName, setNewPlaylistName] =
    useState('')


  const [message, setMessage] =
    useState('')


  async function loadPlaylists() {

    try {

      const loadedPlaylists =
        await fetchPlaylists()


      setPlaylists(
        loadedPlaylists
      )

    } catch (error) {

      console.error(
        'Unable to load playlists:',
        error
      )

    }

  }


  useEffect(() => {

    let cancelled =
      false


    async function loadInitialPlaylists() {

      try {

        const loadedPlaylists =
          await fetchPlaylists()


        if (!cancelled) {

          setPlaylists(
            loadedPlaylists
          )

        }

      } catch (error) {

        console.error(
          'Unable to load playlists:',
          error
        )

      }

    }


    void loadInitialPlaylists()


    return () => {

      cancelled =
        true

    }

  }, [])


  async function createNewPlaylist() {

    const name =
      newPlaylistName.trim()


    if (!name) {
      return
    }


    try {

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


      if (!response.ok) {
        return
      }


      const data:
        {
          id: number
        } =
        await response.json()


      setNewPlaylistName(
        ''
      )


      await loadPlaylists()


      setSelectedPlaylist(
        data.id.toString()
      )


      setMessage(
        `Created "${name}"`
      )

    } catch (error) {

      console.error(
        'Unable to create playlist:',
        error
      )

    }

  }


  async function addToPlaylist() {

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


      if (!response.ok) {
        return
      }


      setMessage(
        'Added to playlist'
      )


      await loadPlaylists()

    } catch (error) {

      console.error(
        'Unable to add playlist item:',
        error
      )

    }

  }


  return (

    <div className="playlist-picker">

      <span className="playlist-picker-label">
        PLAYLIST
      </span>


      <div className="playlist-picker-row">

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
            Choose playlist...
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
                {' '}
                ({playlist.itemCount})
              </option>

            )
          )}

        </select>


        <button
          onClick={
            addToPlaylist
          }
          disabled={
            !selectedPlaylist
          }
        >
          + Add
        </button>

      </div>


      <div className="playlist-create-row">

        <input
          value={
            newPlaylistName
          }
          placeholder="New playlist..."
          onChange={(event) =>
            setNewPlaylistName(
              event.target.value
            )
          }
        />


        <button
          onClick={
            createNewPlaylist
          }
        >
          Create
        </button>

      </div>


      {message && (

        <span className="playlist-message">
          {message}
        </span>

      )}

    </div>

  )

}


export default PlaylistPicker