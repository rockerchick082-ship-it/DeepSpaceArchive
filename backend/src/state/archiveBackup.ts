import fs from 'node:fs'
import path from 'node:path'

import {
  dataDirectory,
  applicationDatabasePath,
} from '../config/appPaths'

import {
  DatabaseSync,
} from 'node:sqlite'


const databasePath =
  applicationDatabasePath


type ArchiveStateBackupRow = {
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


type PlaylistBackup = {
  id: number
  name: string
  createdAt: string
  updatedAt: string

  items: {
    category: string
    relativePath: string
    position: number
    addedAt: string
  }[]
}


type RankingVoteBackup = {
  category: string
  character: string
  itemA: string
  itemB: string
  winner: string
  createdAt: string
  updatedAt: string
}


export type DeepSpaceArchiveBackup = {

  backupFormat:
    'deepspace-archive-backup'

  backupVersion:
    1

  createdAt:
    string

  application: {
    name:
      'DeepSpace Archive'

    schemaVersion:
      1
  }

  archiveState:
    ArchiveStateBackupRow[]

  playlists:
    PlaylistBackup[]

  rankingVotes:
    RankingVoteBackup[]
}


type StateDatabaseRow = {
  category: string
  relative_path: string
  favorite: number
  rating: number | null
  play_count: number
  last_watched: string | null
  progress_seconds: number
  duration_seconds: number | null
  completed: number
  total_watch_seconds: number
}


type PlaylistDatabaseRow = {
  id: number
  name: string
  created_at: string
  updated_at: string
}


type PlaylistItemDatabaseRow = {
  category: string
  relative_path: string
  position: number
  added_at: string
}


type RankingVoteDatabaseRow = {
  category: string
  character: string
  item_a: string
  item_b: string
  winner: string
  created_at: string
  updated_at: string
}


export function createArchiveBackup():
  DeepSpaceArchiveBackup {

  if (
    !fs.existsSync(
      databasePath
    )
  ) {

    throw new Error(
      'DeepSpace Archive database does not exist'
    )

  }


  const database =
    new DatabaseSync(
      databasePath,
      {
        readOnly:
          true,
      }
    )


  try {

    /* =====================================
       ARCHIVE STATE
    ====================================== */

    const stateRows =
      database
        .prepare(`
          SELECT
            category,
            relative_path,
            favorite,
            rating,
            play_count,
            last_watched,
            progress_seconds,
            duration_seconds,
            completed,
            total_watch_seconds

          FROM archive_state

          ORDER BY
            category,
            relative_path
        `)
        .all() as
          unknown as
          StateDatabaseRow[]


    const archiveState =
      stateRows.map(
        (row) => ({

          category:
            row.category,

          relativePath:
            row.relative_path,

          favorite:
            Boolean(
              row.favorite
            ),

          rating:
            row.rating,

          playCount:
            row.play_count,

          lastWatched:
            row.last_watched,

          progressSeconds:
            row.progress_seconds,

          durationSeconds:
            row.duration_seconds,

          completed:
            Boolean(
              row.completed
            ),

          totalWatchSeconds:
            row.total_watch_seconds,

        })
      )


    /* =====================================
       PLAYLISTS
    ====================================== */

    const playlistRows =
      database
        .prepare(`
          SELECT
            id,
            name,
            created_at,
            updated_at

          FROM playlists

          ORDER BY id
        `)
        .all() as
          unknown as
          PlaylistDatabaseRow[]


    const playlistItemStatement =
      database.prepare(`
        SELECT
          category,
          relative_path,
          position,
          added_at

        FROM playlist_items

        WHERE
          playlist_id = ?

        ORDER BY
          position ASC
      `)


    const playlists =
      playlistRows.map(
        (playlist) => {

          const itemRows =
            playlistItemStatement
              .all(
                playlist.id
              ) as
              unknown as
              PlaylistItemDatabaseRow[]


          return {

            id:
              playlist.id,

            name:
              playlist.name,

            createdAt:
              playlist.created_at,

            updatedAt:
              playlist.updated_at,

            items:
              itemRows.map(
                (item) => ({

                  category:
                    item.category,

                  relativePath:
                    item.relative_path,

                  position:
                    item.position,

                  addedAt:
                    item.added_at,

                })
              ),

          }

        }
      )


    /* =====================================
       RANKING VOTES
    ====================================== */

    const rankingVoteRows =
      database
        .prepare(`
          SELECT
            category,
            character,
            item_a,
            item_b,
            winner,
            created_at,
            updated_at
          FROM ranking_vote
          ORDER BY
            category,
            character,
            item_a,
            item_b
        `)
        .all() as
          unknown as
          RankingVoteDatabaseRow[]


    const rankingVotes =
      rankingVoteRows.map(
        (row) => ({
          category:
            row.category,

          character:
            row.character,

          itemA:
            row.item_a,

          itemB:
            row.item_b,

          winner:
            row.winner,

          createdAt:
            row.created_at,

          updatedAt:
            row.updated_at,
        })
      )


    return {

      backupFormat:
        'deepspace-archive-backup',

      backupVersion:
        1,

      createdAt:
        new Date()
          .toISOString(),

      application: {

        name:
          'DeepSpace Archive',

        schemaVersion:
          1,

      },

      archiveState,

      playlists,

      rankingVotes,

    }

  } finally {

    database.close()

  }

}