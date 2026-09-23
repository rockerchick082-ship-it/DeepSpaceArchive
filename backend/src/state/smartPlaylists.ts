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


type SmartPlaylistRow = {
  id: number
  name: string
  rules_json: string
  created_at: string
  updated_at: string
}


export const defaultSmartPlaylistRules:
  SmartPlaylistRules = {
    characters: [],
    categories: [],
    tags: [],
    tagMode: 'any',
    favoriteOnly: false,
    status: 'any',
    minRating: null,
  }


function cleanList(
  value: unknown
) {
  if (!Array.isArray(value)) {
    return []
  }

  const unique =
    new Map<string, string>()

  for (
    const candidate
    of value
  ) {
    if (
      typeof candidate !==
      'string'
    ) {
      continue
    }

    const cleaned =
      candidate
        .trim()
        .replace(
          /\s+/g,
          ' '
        )

    if (!cleaned) {
      continue
    }

    const key =
      cleaned.toLocaleLowerCase()

    if (!unique.has(key)) {
      unique.set(
        key,
        cleaned
      )
    }
  }

  return [...unique.values()]
    .slice(0, 30)
}


export function normalizeSmartPlaylistRules(
  value: unknown
): SmartPlaylistRules {
  const source =
    value &&
    typeof value === 'object'
      ? value as Record<string, unknown>
      : {}

  const tagMode:
    SmartPlaylistTagMode =
      source.tagMode === 'all'
        ? 'all'
        : 'any'

  const status:
    SmartPlaylistStatus =
      source.status === 'unwatched' ||
      source.status === 'in-progress' ||
      source.status === 'completed'
        ? source.status
        : 'any'

  const rawRating =
    source.minRating

  const minRating =
    typeof rawRating === 'number' &&
    Number.isFinite(rawRating) &&
    rawRating >= 0.5 &&
    rawRating <= 5
      ? Math.round(
          rawRating * 2
        ) / 2
      : null

  return {
    characters:
      cleanList(
        source.characters
      ),
    categories:
      cleanList(
        source.categories
      ),
    tags:
      cleanList(
        source.tags
      ),
    tagMode,
    favoriteOnly:
      source.favoriteOnly === true,
    status,
    minRating,
  }
}


function fromRow(
  row: SmartPlaylistRow
): SmartPlaylist {
  let rules:
    SmartPlaylistRules =
    defaultSmartPlaylistRules

  try {
    rules =
      normalizeSmartPlaylistRules(
        JSON.parse(
          row.rules_json
        )
      )
  } catch {
    rules = {
      ...defaultSmartPlaylistRules,
    }
  }

  return {
    id:
      row.id,
    name:
      row.name,
    rules,
    createdAt:
      row.created_at,
    updatedAt:
      row.updated_at,
  }
}


export function listSmartPlaylists() {
  const rows =
    database
      .prepare(`
        SELECT *
        FROM smart_playlist
        ORDER BY
          updated_at DESC,
          name COLLATE NOCASE ASC
      `)
      .all() as SmartPlaylistRow[]

  return rows.map(
    fromRow
  )
}


export function getSmartPlaylist(
  id: number
) {
  const row =
    database
      .prepare(`
        SELECT *
        FROM smart_playlist
        WHERE id = ?
      `)
      .get(
        id
      ) as SmartPlaylistRow | undefined

  return row
    ? fromRow(row)
    : null
}


export function createSmartPlaylist(
  name: string,
  rules: unknown
) {
  const cleanedName =
    name
      .trim()
      .slice(0, 120)

  if (!cleanedName) {
    throw new Error(
      'Smart playlist name is required.'
    )
  }

  const normalizedRules =
    normalizeSmartPlaylistRules(
      rules
    )

  const now =
    new Date().toISOString()

  const result =
    database
      .prepare(`
        INSERT INTO smart_playlist (
          name,
          rules_json,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?)
      `)
      .run(
        cleanedName,
        JSON.stringify(
          normalizedRules
        ),
        now,
        now
      )

  return getSmartPlaylist(
    Number(
      result.lastInsertRowid
    )
  )
}


export function updateSmartPlaylist(
  id: number,
  name: string,
  rules: unknown
) {
  const cleanedName =
    name
      .trim()
      .slice(0, 120)

  if (!cleanedName) {
    throw new Error(
      'Smart playlist name is required.'
    )
  }

  const result =
    database
      .prepare(`
        UPDATE smart_playlist
        SET
          name = ?,
          rules_json = ?,
          updated_at = ?
        WHERE id = ?
      `)
      .run(
        cleanedName,
        JSON.stringify(
          normalizeSmartPlaylistRules(
            rules
          )
        ),
        new Date().toISOString(),
        id
      )

  if (
    Number(result.changes) ===
    0
  ) {
    return null
  }

  return getSmartPlaylist(id)
}


export function deleteSmartPlaylist(
  id: number
) {
  const result =
    database
      .prepare(`
        DELETE FROM smart_playlist
        WHERE id = ?
      `)
      .run(id)

  return Number(
    result.changes
  )
}
