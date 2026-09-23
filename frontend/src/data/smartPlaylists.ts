export type SmartPlaylistStatus =
  | 'any'
  | 'unwatched'
  | 'in-progress'
  | 'completed'

export type SmartPlaylistTagMode =
  | 'any'
  | 'all'

export type SmartPlaylistRules = {
  characters: string[]
  categories: string[]
  tags: string[]
  tagMode: SmartPlaylistTagMode
  favoriteOnly: boolean
  status: SmartPlaylistStatus
  minRating: number | null
}

export type SmartPlaylist = {
  id: number
  name: string
  rules: SmartPlaylistRules
  createdAt: string
  updatedAt: string
}


export const emptySmartPlaylistRules:
  SmartPlaylistRules = {
    characters: [],
    categories: [],
    tags: [],
    tagMode: 'any',
    favoriteOnly: false,
    status: 'any',
    minRating: null,
  }


async function readError(
  response: Response,
  fallback: string
) {
  const body =
    await response.json()
      .catch(
        () => null
      ) as {
        error?: string
      } | null

  return body?.error ??
    fallback
}


export async function fetchSmartPlaylists() {
  const response =
    await fetch(
      '/api/smart-playlists'
    )

  if (!response.ok) {
    throw new Error(
      await readError(
        response,
        'Unable to load smart playlists.'
      )
    )
  }

  const data =
    await response.json() as {
      items?: SmartPlaylist[]
    }

  return Array.isArray(data.items)
    ? data.items
    : []
}


export async function fetchSmartPlaylist(
  id: number
) {
  const response =
    await fetch(
      `/api/smart-playlists/${id}`
    )

  if (!response.ok) {
    throw new Error(
      await readError(
        response,
        'Unable to load smart playlist.'
      )
    )
  }

  return await response.json() as
    SmartPlaylist
}


export async function createSmartPlaylist(
  name: string,
  rules: SmartPlaylistRules
) {
  const response =
    await fetch(
      '/api/smart-playlists',
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/json',
        },
        body:
          JSON.stringify({
            name,
            rules,
          }),
      }
    )

  if (!response.ok) {
    throw new Error(
      await readError(
        response,
        'Unable to create smart playlist.'
      )
    )
  }

  return await response.json() as
    SmartPlaylist
}


export async function updateSmartPlaylist(
  id: number,
  name: string,
  rules: SmartPlaylistRules
) {
  const response =
    await fetch(
      `/api/smart-playlists/${id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type':
            'application/json',
        },
        body:
          JSON.stringify({
            name,
            rules,
          }),
      }
    )

  if (!response.ok) {
    throw new Error(
      await readError(
        response,
        'Unable to update smart playlist.'
      )
    )
  }

  return await response.json() as
    SmartPlaylist
}


export async function deleteSmartPlaylist(
  id: number
) {
  const response =
    await fetch(
      `/api/smart-playlists/${id}`,
      {
        method: 'DELETE',
      }
    )

  if (!response.ok) {
    throw new Error(
      await readError(
        response,
        'Unable to delete smart playlist.'
      )
    )
  }
}
