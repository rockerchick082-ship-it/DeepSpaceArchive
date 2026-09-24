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



type MediaTagBackup = {
  name: string
  createdAt: string
}

type MediaTagAssignmentBackup = {
  tagName: string
  category: string
  relativePath: string
  createdAt: string
}

type SmartPlaylistBackup = {
  name: string
  rules: unknown
  createdAt: string
  updatedAt: string
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
    2

  createdAt:
    string

  application: {
    name:
      'DeepSpace Archive'

    schemaVersion:
      6
  }

  archiveState:
    ArchiveStateBackupRow[]

  playlists:
    PlaylistBackup[]

  rankingVotes:
    RankingVoteBackup[]

  mediaTags:
    MediaTagBackup[]

  mediaTagAssignments:
    MediaTagAssignmentBackup[]

  smartPlaylists:
    SmartPlaylistBackup[]
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



type MediaTagDatabaseRow = {
  name: string
  created_at: string
}

type MediaTagAssignmentDatabaseRow = {
  tag_name: string
  category: string
  relative_path: string
  created_at: string
}

type SmartPlaylistDatabaseRow = {
  name: string
  rules_json: string
  created_at: string
  updated_at: string
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
       TAGS
    ====================================== */

    const mediaTagRows =
      database.prepare(`
        SELECT name, created_at
        FROM media_tag
        ORDER BY name COLLATE NOCASE ASC
      `).all() as unknown as MediaTagDatabaseRow[]

    const mediaTags = mediaTagRows.map((row) => ({
      name: row.name,
      createdAt: row.created_at,
    }))

    const mediaTagAssignmentRows =
      database.prepare(`
        SELECT
          media_tag.name AS tag_name,
          media_tag_assignment.category AS category,
          media_tag_assignment.relative_path AS relative_path,
          media_tag_assignment.created_at AS created_at
        FROM media_tag_assignment
        JOIN media_tag
          ON media_tag.id = media_tag_assignment.tag_id
        ORDER BY
          media_tag.name COLLATE NOCASE ASC,
          media_tag_assignment.category COLLATE NOCASE ASC,
          media_tag_assignment.relative_path COLLATE NOCASE ASC
      `).all() as unknown as MediaTagAssignmentDatabaseRow[]

    const mediaTagAssignments =
      mediaTagAssignmentRows.map((row) => ({
        tagName: row.tag_name,
        category: row.category,
        relativePath: row.relative_path,
        createdAt: row.created_at,
      }))

    /* =====================================
       SMART PLAYLISTS
    ====================================== */

    const smartPlaylistRows =
      database.prepare(`
        SELECT name, rules_json, created_at, updated_at
        FROM smart_playlist
        ORDER BY name COLLATE NOCASE ASC
      `).all() as unknown as SmartPlaylistDatabaseRow[]

    const smartPlaylists =
      smartPlaylistRows.map((row) => {
        let rules: unknown = {}

        try {
          rules = JSON.parse(row.rules_json)
        } catch {
          rules = {}
        }

        return {
          name: row.name,
          rules,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }
      })


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
        2,

      createdAt:
        new Date()
          .toISOString(),

      application: {

        name:
          'DeepSpace Archive',

        schemaVersion:
          6,

      },

      archiveState,

      playlists,

      rankingVotes,

      mediaTags,

      mediaTagAssignments,

      smartPlaylists,

    }

  } finally {

    database.close()

  }

}