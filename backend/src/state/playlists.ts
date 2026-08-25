import {
  DatabaseSync,
} from 'node:sqlite'

import {
  applicationDatabasePath,
  ensureApplicationDatabaseMigrations,
} from '../services/databaseMigrations'


ensureApplicationDatabaseMigrations()


const database =
  new DatabaseSync(
    applicationDatabasePath
  )


database.exec(`
  PRAGMA foreign_keys = ON
`)


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


type PlaylistRow = {
  id: number
  name: string
  created_at: string
  updated_at: string
  item_count: number
}


type PlaylistItemRow = {
  id: number
  playlist_id: number
  category: string
  relative_path: string
  position: number
  added_at: string
}


function playlistFromRow(
  row: PlaylistRow
): Playlist {

  return {
    id:
      row.id,

    name:
      row.name,

    createdAt:
      row.created_at,

    updatedAt:
      row.updated_at,

    itemCount:
      row.item_count,
  }

}


function playlistItemFromRow(
  row: PlaylistItemRow
): PlaylistItem {

  return {
    id:
      row.id,

    playlistId:
      row.playlist_id,

    category:
      row.category,

    relativePath:
      row.relative_path,

    position:
      row.position,

    addedAt:
      row.added_at,
  }

}


export function listPlaylists():
  Playlist[] {

  const rows =
    database
      .prepare(`
        SELECT
          playlists.id,
          playlists.name,
          playlists.created_at,
          playlists.updated_at,
          COUNT(
            playlist_items.id
          ) AS item_count

        FROM playlists

        LEFT JOIN playlist_items
          ON playlist_items.playlist_id =
             playlists.id

        GROUP BY
          playlists.id

        ORDER BY
          playlists.updated_at DESC
      `)
      .all() as PlaylistRow[]


  return rows.map(
    playlistFromRow
  )

}


export function createPlaylist(
  name: string
) {

  const now =
    new Date().toISOString()


  const result =
    database
      .prepare(`
        INSERT INTO playlists (
          name,
          created_at,
          updated_at
        )

        VALUES (?, ?, ?)
      `)
      .run(
        name,
        now,
        now
      )


  return Number(
    result.lastInsertRowid
  )

}


export function deletePlaylist(
  playlistId: number
) {

  database
    .prepare(`
      DELETE FROM playlists
      WHERE id = ?
    `)
    .run(
      playlistId
    )

}


export function getPlaylistItems(
  playlistId: number
): PlaylistItem[] {

  const rows =
    database
      .prepare(`
        SELECT *
        FROM playlist_items

        WHERE
          playlist_id = ?

        ORDER BY
          position ASC
      `)
      .all(
        playlistId
      ) as PlaylistItemRow[]


  return rows.map(
    playlistItemFromRow
  )

}



export function renamePlaylistItemPath(
  category: string,
  oldRelativePath: string,
  newRelativePath: string
) {

  if (
    oldRelativePath ===
    newRelativePath
  ) {

    return 0

  }


  const rows =
    database
      .prepare(`
        SELECT
          id,
          playlist_id,
          category,
          relative_path,
          position,
          added_at
        FROM playlist_items
        WHERE
          category = ?
          AND relative_path = ?
      `)
      .all(
        category,
        oldRelativePath
      ) as Array<{
        id: number
        playlist_id: number
        category: string
        relative_path: string
        position: number
        added_at: string
      }>


  if (
    rows.length ===
    0
  ) {

    return 0

  }


  const now =
    new Date()
      .toISOString()


  database.exec(
    'BEGIN IMMEDIATE'
  )


  try {

    const affectedPlaylists =
      new Set<number>()


    for (
      const row
      of rows
    ) {

      affectedPlaylists.add(
        row.playlist_id
      )


      database
        .prepare(`
          INSERT OR IGNORE INTO playlist_items (
            playlist_id,
            category,
            relative_path,
            position,
            added_at
          )
          VALUES (?, ?, ?, ?, ?)
        `)
        .run(
          row.playlist_id,
          row.category,
          newRelativePath,
          row.position,
          row.added_at
        )

    }


    database
      .prepare(`
        DELETE FROM playlist_items
        WHERE
          category = ?
          AND relative_path = ?
      `)
      .run(
        category,
        oldRelativePath
      )


    for (
      const playlistId
      of affectedPlaylists
    ) {

      database
        .prepare(`
          UPDATE playlists
          SET updated_at = ?
          WHERE id = ?
        `)
        .run(
          now,
          playlistId
        )

    }


    database.exec(
      'COMMIT'
    )


    return rows.length

  } catch (error) {

    database.exec(
      'ROLLBACK'
    )


    throw error

  }

}


export function addPlaylistItem(
  playlistId: number,
  category: string,
  relativePath: string
) {

  const row =
    database
      .prepare(`
        SELECT
          COALESCE(
            MAX(position),
            -1
          ) AS max_position

        FROM playlist_items

        WHERE
          playlist_id = ?
      `)
      .get(
        playlistId
      ) as {
        max_position: number
      }


  const position =
    row.max_position + 1


  database
    .prepare(`
      INSERT OR IGNORE INTO playlist_items (
        playlist_id,
        category,
        relative_path,
        position,
        added_at
      )

      VALUES (?, ?, ?, ?, ?)
    `)
    .run(
      playlistId,
      category,
      relativePath,
      position,
      new Date().toISOString()
    )


  database
    .prepare(`
      UPDATE playlists

      SET updated_at = ?

      WHERE id = ?
    `)
    .run(
      new Date().toISOString(),
      playlistId
    )


  return getPlaylistItems(
    playlistId
  )

}


export function reorderPlaylistItems(
  playlistId: number,
  itemIds: number[]
) {

  const playlist =
    database
      .prepare(`
        SELECT id
        FROM playlists
        WHERE id = ?
      `)
      .get(
        playlistId
      ) as
        {
          id: number
        } |
        undefined


  if (
    !playlist
  ) {

    throw new Error(
      'Playlist not found.'
    )

  }


  const existingItems =
    getPlaylistItems(
      playlistId
    )


  const existingIds =
    new Set(
      existingItems.map(
        (item) =>
          item.id
      )
    )


  const requestedIds =
    new Set(
      itemIds
    )


  if (
    itemIds.length !==
      existingItems.length ||
    requestedIds.size !==
      itemIds.length ||
    itemIds.some(
      (itemId) =>
        !existingIds.has(
          itemId
        )
    )
  ) {

    throw new Error(
      'Playlist order must include every playlist item exactly once.'
    )

  }


  const updatePosition =
    database.prepare(`
      UPDATE playlist_items

      SET position = ?

      WHERE
        playlist_id = ?
        AND id = ?
    `)


  const now =
    new Date()
      .toISOString()


  database.exec(
    'BEGIN IMMEDIATE'
  )


  try {

    itemIds.forEach(
      (
        itemId,
        index
      ) => {

        updatePosition.run(
          index,
          playlistId,
          itemId
        )

      }
    )


    database
      .prepare(`
        UPDATE playlists

        SET updated_at = ?

        WHERE id = ?
      `)
      .run(
        now,
        playlistId
      )


    database.exec(
      'COMMIT'
    )

  } catch (error) {

    database.exec(
      'ROLLBACK'
    )


    throw error

  }


  return getPlaylistItems(
    playlistId
  )

}


export function removePlaylistItem(
  playlistId: number,
  itemId: number
) {

  database
    .prepare(`
      DELETE FROM playlist_items

      WHERE
        playlist_id = ?
        AND id = ?
    `)
    .run(
      playlistId,
      itemId
    )


  const remaining =
    getPlaylistItems(
      playlistId
    )


  const updatePosition =
    database.prepare(`
      UPDATE playlist_items

      SET position = ?

      WHERE id = ?
    `)


  remaining.forEach(
    (
      item,
      index
    ) => {

      updatePosition.run(
        index,
        item.id
      )

    }
  )


  database
    .prepare(`
      UPDATE playlists

      SET updated_at = ?

      WHERE id = ?
    `)
    .run(
      new Date().toISOString(),
      playlistId
    )


  return getPlaylistItems(
    playlistId
  )

}