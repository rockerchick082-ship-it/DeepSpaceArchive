export type Playlist = {
  id: number
  name: string
  createdAt: string
  updatedAt: string
  itemCount: number
}


export type PlaylistItem = {
  id: number
  playlistId: number
  category: string
  relativePath: string
  position: number
  addedAt: string
}