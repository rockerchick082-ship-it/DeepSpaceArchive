import fs from 'node:fs/promises'
import path from 'node:path'

import {
  applicationDatabasePath,
  safetyBackupDirectory,
} from '../config/appPaths'

import AdmZip from 'adm-zip'

import {
  DatabaseSync,
} from 'node:sqlite'

import {
  restoreCatalogBackupMerge,
  validateCatalogBackup,
} from './catalogBackup'

import type {
  CatalogBackupState,
  CatalogRestoreResult,
} from './catalogBackup'


type BackupManifest = {
  backupFormat: string
  backupVersion: number
  createdAt: string
  libraryRootNotStored: boolean
  metadataFileCount: number
  customThumbnailCount: number
  archiveStateCount: number
  playlistCount: number

  catalogItemCount?: number
  catalogFileMatchCount?: number
  catalogMemoryLinkCount?: number
  catalogSchemaVersion?: number
}


type BackupArchiveState = {
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


type BackupPlaylistItem = {
  category: string
  relativePath: string
  position: number
  addedAt: string
}


type BackupPlaylist = {
  id: number
  name: string
  createdAt: string
  updatedAt: string
  items: BackupPlaylistItem[]
}


type ApplicationState = {
  backupFormat: string
  backupVersion: number
  createdAt: string

  application?: {
    name?: string
    schemaVersion?: number
  }

  archiveState:
    BackupArchiveState[]

  playlists:
    BackupPlaylist[]
}


export type RestorePreview = {
  valid: boolean

  backupVersion:
    number | null

  applicationSchemaVersion:
    number | null

  catalogSchemaVersion:
    number | null

  catalogPresent:
    boolean

  createdAt:
    string | null

  counts: {
    archiveState: number
    playlists: number
    metadata: number
    thumbnails: number
    catalogItems: number
    catalogFileMatches: number
    catalogMemoryLinks: number
  }

  media: {
    matched: number
    missing: number
    conflicts: number
  }

  missingFiles:
    string[]

  conflicts:
    string[]

  warnings:
    string[]
}


export type RestoreResult = {
  success: true

  mode:
    'merge'

  safetyBackup:
    string

  archiveState: {
    created: number
    merged: number
  }

  playlists: {
    created: number
    merged: number
    itemsAdded: number
  }

  metadata: {
    restored: number
    alreadyCurrent: number
    conflictsSkipped: number
    missingMediaSkipped: number
  }

  thumbnails: {
    restored: number
    existingSkipped: number
    missingMediaSkipped: number
  }

  catalog:
    CatalogRestoreResult |
    null
}


type CurrentStateRow = {
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


type CurrentPlaylistRow = {
  id: number
  name: string
  created_at: string
  updated_at: string
}


const mediaExtensions = [
  '.mp4',
  '.mkv',
  '.webm',
  '.mov',
  '.avi',
  '.mp3',
  '.m4a',
  '.aac',
  '.wav',
  '.flac',
  '.ogg',
]


function normalizeZipPath(
  value: string
) {

  return value.replace(
    /\\/g,
    '/'
  )

}


function getEntryText(
  zip: AdmZip,
  entryName: string
) {

  const entry =
    zip.getEntry(
      entryName
    )


  if (!entry) {

    throw new Error(
      `Backup is missing ${entryName}`
    )

  }


  return entry
    .getData()
    .toString(
      'utf8'
    )

}


async function pathExists(
  filePath: string
) {

  try {

    await fs.access(
      filePath
    )

    return true

  } catch {

    return false

  }

}


function resolveInsideLibrary(
  libraryRoot: string,
  relativePath: string
) {

  const normalized =
    normalizeZipPath(
      relativePath
    )


  const pieces =
    normalized.split(
      '/'
    )


  if (
    pieces.some(
      (piece) =>
        piece === '..'
    )
  ) {

    throw new Error(
      'Backup contains an unsafe path'
    )

  }


  const target =
    path.resolve(
      libraryRoot,
      ...pieces
    )


  const root =
    path.resolve(
      libraryRoot
    )


  const relative =
    path.relative(
      root,
      target
    )


  if (
    relative.startsWith('..') ||
    path.isAbsolute(
      relative
    )
  ) {

    throw new Error(
      'Backup contains a path outside the media library'
    )

  }


  return target

}


async function findMatchingMedia(
  sidecarRelativePath: string,
  libraryRoot: string
) {

  const withoutPrefix =
    normalizeZipPath(
      sidecarRelativePath
    ).replace(
      /^library\/metadata\//,
      ''
    )


  const parsed =
    path.posix.parse(
      withoutPrefix
    )


  for (
    const extension
    of mediaExtensions
  ) {

    const mediaRelative =
      path.posix.join(
        parsed.dir,
        `${parsed.name}${extension}`
      )


    const candidate =
      resolveInsideLibrary(
        libraryRoot,
        mediaRelative
      )


    if (
      await pathExists(
        candidate
      )
    ) {

      return candidate

    }

  }


  return null

}


async function findMediaForThumbnail(
  thumbnailEntryName: string,
  libraryRoot: string
) {

  const withoutPrefix =
    normalizeZipPath(
      thumbnailEntryName
    ).replace(
      /^library\/thumbnails\//,
      ''
    )


  const parsed =
    path.posix.parse(
      withoutPrefix
    )


  const mediaBaseName =
    parsed.name.replace(
      /\.thumbnail$/,
      ''
    )


  for (
    const extension
    of mediaExtensions
  ) {

    const mediaRelative =
      path.posix.join(
        parsed.dir,
        `${mediaBaseName}${extension}`
      )


    const candidate =
      resolveInsideLibrary(
        libraryRoot,
        mediaRelative
      )


    if (
      await pathExists(
        candidate
      )
    ) {

      return candidate

    }

  }


  return null

}


function parseBackup(
  backupPath: string
) {

  const zip =
    new AdmZip(
      backupPath
    )


  const manifest =
    JSON.parse(
      getEntryText(
        zip,
        'manifest.json'
      )
    ) as BackupManifest


  if (
    manifest.backupFormat !==
    'deepspace-archive-full-backup'
  ) {

    throw new Error(
      'This is not a DeepSpace Archive full backup'
    )

  }


  const applicationState =
    JSON.parse(
      getEntryText(
        zip,
        'application-state.json'
      )
    ) as ApplicationState


  if (
    applicationState.backupFormat !==
    'deepspace-archive-backup'
  ) {

    throw new Error(
      'Backup application-state format is invalid.'
    )

  }


  const catalogEntry =
    zip.getEntry(
      'catalog-state.json'
    )


  let catalogState:
    CatalogBackupState |
    null =
      null


  if (
    catalogEntry
  ) {

    catalogState =
      validateCatalogBackup(
        JSON.parse(
          catalogEntry
            .getData()
            .toString(
              'utf8'
            )
        )
      )

  } else if (
    manifest.backupVersion >=
    2
  ) {

    throw new Error(
      'Backup v2 is missing catalog-state.json.'
    )

  }


  return {
    zip,
    manifest,
    applicationState,
    catalogState,
  }

}


function jsonEquivalent(
  first: string,
  second: string
) {

  try {

    return (
      JSON.stringify(
        JSON.parse(
          first
        )
      ) ===
      JSON.stringify(
        JSON.parse(
          second
        )
      )
    )

  } catch {

    return (
      first.trim() ===
      second.trim()
    )

  }

}


function timestampValue(
  value: string | null
) {

  if (!value) {
    return 0
  }


  const result =
    new Date(
      value
    ).getTime()


  return Number.isFinite(
    result
  )
    ? result
    : 0

}


function laterTimestamp(
  first: string | null,
  second: string | null
) {

  return (
    timestampValue(
      second
    ) >
    timestampValue(
      first
    )
  )
    ? second
    : first

}


function escapeSqlString(
  value: string
) {

  return value.replace(
    /'/g,
    "''"
  )

}


export async function analyzeArchiveBackup(
  backupPath: string
): Promise<RestorePreview> {

  const libraryPath =
    process.env.MEDIA_LIBRARY_PATH


  if (!libraryPath) {

    throw new Error(
      'MEDIA_LIBRARY_PATH is not configured'
    )

  }


  const libraryRoot =
    path.resolve(
      libraryPath
    )


  const {
    zip,
    manifest,
    applicationState,
    catalogState,
  } =
    parseBackup(
      backupPath
    )


  const warnings:
    string[] =
    []


  const missingFiles:
    string[] =
    []


  const conflicts:
    string[] =
    []


  if (
    manifest.backupVersion !==
      1 &&
    manifest.backupVersion !==
      2
  ) {

    warnings.push(
      `Backup version ${manifest.backupVersion} may not be fully supported.`
    )

  }


  if (
    manifest.backupVersion ===
      1 &&
    !catalogState
  ) {

    warnings.push(
      'This legacy v1 backup does not contain Metadata Catalog records or file matches.'
    )

  }


  const entries =
    zip.getEntries()


  const metadataEntries =
    entries.filter(
      (entry) =>
        !entry.isDirectory &&
        normalizeZipPath(
          entry.entryName
        ).startsWith(
          'library/metadata/'
        ) &&
        entry.entryName
          .toLowerCase()
          .endsWith(
            '.json'
          )
    )


  const thumbnailEntries =
    entries.filter(
      (entry) =>
        !entry.isDirectory &&
        normalizeZipPath(
          entry.entryName
        ).startsWith(
          'library/thumbnails/'
        )
    )


  let matched =
    0


  let missing =
    0


  for (
    const entry
    of metadataEntries
  ) {

    const matchingMedia =
      await findMatchingMedia(
        entry.entryName,
        libraryRoot
      )


    if (
      matchingMedia
    ) {

      matched +=
        1

    } else {

      missing +=
        1


      missingFiles.push(
        normalizeZipPath(
          entry.entryName
        ).replace(
          /^library\/metadata\//,
          ''
        )
      )

    }

  }


  for (
    const entry
    of metadataEntries
  ) {

    const relativeSidecar =
      normalizeZipPath(
        entry.entryName
      ).replace(
        /^library\/metadata\//,
        ''
      )


    const currentSidecarPath =
      resolveInsideLibrary(
        libraryRoot,
        relativeSidecar
      )


    if (
      !await pathExists(
        currentSidecarPath
      )
    ) {

      continue

    }


    try {

      const currentContents =
        await fs.readFile(
          currentSidecarPath,
          'utf8'
        )


      const backupContents =
        entry
          .getData()
          .toString(
            'utf8'
          )


      if (
        !jsonEquivalent(
          currentContents,
          backupContents
        )
      ) {

        conflicts.push(
          relativeSidecar
        )

      }

    } catch {

      warnings.push(
        `Could not compare ${relativeSidecar}.`
      )

    }

  }


  if (
    manifest.metadataFileCount !==
    metadataEntries.length
  ) {

    warnings.push(
      'Metadata count does not match the backup manifest.'
    )

  }


  if (
    manifest.customThumbnailCount !==
    thumbnailEntries.length
  ) {

    warnings.push(
      'Thumbnail count does not match the backup manifest.'
    )

  }


  if (
    manifest.archiveStateCount !==
    applicationState.archiveState.length
  ) {

    warnings.push(
      'Archive-state count does not match the backup manifest.'
    )

  }


  if (
    manifest.playlistCount !==
    applicationState.playlists.length
  ) {

    warnings.push(
      'Playlist count does not match the backup manifest.'
    )

  }


  if (
    catalogState &&
    manifest.catalogItemCount !==
      undefined &&
    manifest.catalogItemCount !==
      catalogState.items.length
  ) {

    warnings.push(
      'Metadata Catalog item count does not match the backup manifest.'
    )

  }


  if (
    catalogState &&
    manifest.catalogFileMatchCount !==
      undefined &&
    manifest.catalogFileMatchCount !==
      catalogState.fileMatches.length
  ) {

    warnings.push(
      'Metadata Catalog file-match count does not match the backup manifest.'
    )

  }


  if (
    catalogState &&
    manifest.catalogMemoryLinkCount !==
      undefined &&
    manifest.catalogMemoryLinkCount !==
      catalogState.memoryLinks.length
  ) {

    warnings.push(
      'Metadata Catalog Memory-link count does not match the backup manifest.'
    )

  }


  return {

    valid:
      true,

    backupVersion:
      manifest.backupVersion,

    applicationSchemaVersion:
      applicationState
        .application
        ?.schemaVersion ??
      null,

    catalogSchemaVersion:
      catalogState
        ?.schemaVersion ??
      null,

    catalogPresent:
      Boolean(
        catalogState
      ),

    createdAt:
      manifest.createdAt,

    counts: {

      archiveState:
        applicationState
          .archiveState
          .length,

      playlists:
        applicationState
          .playlists
          .length,

      metadata:
        metadataEntries
          .length,

      thumbnails:
        thumbnailEntries
          .length,

      catalogItems:
        catalogState
          ?.items
          .length ??
        0,

      catalogFileMatches:
        catalogState
          ?.fileMatches
          .length ??
        0,

      catalogMemoryLinks:
        catalogState
          ?.memoryLinks
          .length ??
        0,

    },

    media: {

      matched,

      missing,

      conflicts:
        conflicts.length,

    },

    missingFiles,

    conflicts,

    warnings,

  }

}


export async function restoreArchiveBackupMerge(
  backupPath: string
): Promise<RestoreResult> {

  const libraryPath =
    process.env.MEDIA_LIBRARY_PATH


  if (!libraryPath) {

    throw new Error(
      'MEDIA_LIBRARY_PATH is not configured'
    )

  }


  const libraryRoot =
    path.resolve(
      libraryPath
    )


  const {
    zip,
    applicationState,
    catalogState,
  } =
    parseBackup(
      backupPath
    )


  const entries =
    zip.getEntries()


  const metadataEntries =
    entries.filter(
      (entry) =>
        !entry.isDirectory &&
        normalizeZipPath(
          entry.entryName
        ).startsWith(
          'library/metadata/'
        ) &&
        entry.entryName
          .toLowerCase()
          .endsWith(
            '.json'
          )
    )


  const thumbnailEntries =
    entries.filter(
      (entry) =>
        !entry.isDirectory &&
        normalizeZipPath(
          entry.entryName
        ).startsWith(
          'library/thumbnails/'
        )
    )


  let metadataRestored =
    0

  let metadataAlreadyCurrent =
    0

  let metadataConflictsSkipped =
    0

  let metadataMissingMediaSkipped =
    0


  let thumbnailsRestored =
    0

  let thumbnailsExistingSkipped =
    0

  let thumbnailsMissingMediaSkipped =
    0


  /*
   * =====================================
   * RESTORE SIDECAR METADATA
   * =====================================
   *
   * MERGE MODE:
   *
   * Missing current sidecar:
   *   restore it.
   *
   * Same current sidecar:
   *   leave it alone.
   *
   * Different current sidecar:
   *   current version wins.
   * =====================================
   */

  for (
    const entry
    of metadataEntries
  ) {

    const relativeSidecar =
      normalizeZipPath(
        entry.entryName
      ).replace(
        /^library\/metadata\//,
        ''
      )


    const matchingMedia =
      await findMatchingMedia(
        entry.entryName,
        libraryRoot
      )


    if (
      !matchingMedia
    ) {

      metadataMissingMediaSkipped +=
        1

      continue

    }


    const target =
      resolveInsideLibrary(
        libraryRoot,
        relativeSidecar
      )


    const backupContents =
      entry
        .getData()
        .toString(
          'utf8'
        )


    if (
      await pathExists(
        target
      )
    ) {

      const currentContents =
        await fs.readFile(
          target,
          'utf8'
        )


      if (
        jsonEquivalent(
          currentContents,
          backupContents
        )
      ) {

        metadataAlreadyCurrent +=
          1

      } else {

        metadataConflictsSkipped +=
          1

      }


      continue

    }


    await fs.mkdir(
      path.dirname(
        target
      ),
      {
        recursive: true,
      }
    )


    await fs.writeFile(
      target,
      entry.getData()
    )


    metadataRestored +=
      1

  }


  /*
   * =====================================
   * RESTORE CUSTOM THUMBNAILS
   * =====================================
   */

  for (
    const entry
    of thumbnailEntries
  ) {

    const relativeThumbnail =
      normalizeZipPath(
        entry.entryName
      ).replace(
        /^library\/thumbnails\//,
        ''
      )


    const matchingMedia =
      await findMediaForThumbnail(
        entry.entryName,
        libraryRoot
      )


    if (
      !matchingMedia
    ) {

      thumbnailsMissingMediaSkipped +=
        1

      continue

    }


    const target =
      resolveInsideLibrary(
        libraryRoot,
        relativeThumbnail
      )


    if (
      await pathExists(
        target
      )
    ) {

      thumbnailsExistingSkipped +=
        1

      continue

    }


    await fs.mkdir(
      path.dirname(
        target
      ),
      {
        recursive: true,
      }
    )


    await fs.writeFile(
      target,
      entry.getData()
    )


    thumbnailsRestored +=
      1

  }


  /*
   * =====================================
   * OPEN SQLITE DATABASE
   * =====================================
   */

  const databasePath =
    applicationDatabasePath


  const database =
    new DatabaseSync(
      databasePath
    )


  /*
   * =====================================
   * PRE-RESTORE DATABASE SAFETY SNAPSHOT
   * =====================================
   */

  const safetyDirectory =
    safetyBackupDirectory


  await fs.mkdir(
    safetyDirectory,
    {
      recursive: true,
    }
  )


  const safetyTimestamp =
    new Date()
      .toISOString()
      .replace(
        /[:.]/g,
        '-'
      )


  const safetyBackupPath =
    path.join(
      safetyDirectory,
      `pre-restore-${safetyTimestamp}.db`
    )


  database.exec(
    `VACUUM INTO '${escapeSqlString(
      safetyBackupPath
    )}'`
  )


  let statesCreated =
    0

  let statesMerged =
    0

  let playlistsCreated =
    0

  let playlistsMerged =
    0

  let playlistItemsAdded =
    0


  try {

    database.exec(
      'BEGIN IMMEDIATE'
    )


    /*
     * ===================================
     * ARCHIVE STATE
     * ===================================
     */

    const findState =
      database.prepare(`
        SELECT *
        FROM archive_state

        WHERE
          category = ?
          AND relative_path = ?
      `)


    const insertState =
      database.prepare(`
        INSERT INTO archive_state (
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
        )

        VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `)


    const updateState =
      database.prepare(`
        UPDATE archive_state

        SET
          favorite = ?,
          rating = ?,
          play_count = ?,
          last_watched = ?,
          progress_seconds = ?,
          duration_seconds = ?,
          completed = ?,
          total_watch_seconds = ?

        WHERE
          category = ?
          AND relative_path = ?
      `)


    for (
      const backupState
      of applicationState.archiveState
    ) {

      const current =
        findState.get(
          backupState.category,
          backupState.relativePath
        ) as
          CurrentStateRow |
          undefined


      if (!current) {

        insertState.run(
          backupState.category,
          backupState.relativePath,
          backupState.favorite
            ? 1
            : 0,
          backupState.rating,
          backupState.playCount,
          backupState.lastWatched,
          backupState.progressSeconds,
          backupState.durationSeconds,
          backupState.completed
            ? 1
            : 0,
          backupState.totalWatchSeconds
        )


        statesCreated +=
          1

        continue

      }


      const backupIsNewer =
        timestampValue(
          backupState.lastWatched
        ) >
        timestampValue(
          current.last_watched
        )


      const favorite =
        Boolean(
          current.favorite
        ) ||
        backupState.favorite


      /*
       * MERGE keeps the current rating
       * whenever one already exists.
       */

      const rating =
        current.rating ??
        backupState.rating


      const playCount =
        Math.max(
          current.play_count,
          backupState.playCount
        )


      const totalWatchSeconds =
        Math.max(
          current.total_watch_seconds,
          backupState.totalWatchSeconds
        )


      const lastWatched =
        laterTimestamp(
          current.last_watched,
          backupState.lastWatched
        )


      const progressSeconds =
        backupIsNewer
          ? backupState.progressSeconds
          : current.progress_seconds


      const durationSeconds =
        backupIsNewer
          ? backupState.durationSeconds
          : current.duration_seconds


      const completed =
        backupIsNewer
          ? backupState.completed
          : Boolean(
              current.completed
            )


      updateState.run(
        favorite
          ? 1
          : 0,
        rating,
        playCount,
        lastWatched,
        progressSeconds,
        durationSeconds,
        completed
          ? 1
          : 0,
        totalWatchSeconds,
        backupState.category,
        backupState.relativePath
      )


      statesMerged +=
        1

    }


    /*
     * ===================================
     * PLAYLISTS
     * ===================================
     *
     * Match existing playlists by name.
     *
     * Existing playlist:
     *   preserve its current order and
     *   append missing backup items.
     *
     * Missing playlist:
     *   recreate it from the backup.
     * ===================================
     */

    const findPlaylist =
      database.prepare(`
        SELECT *
        FROM playlists

        WHERE name = ?

        ORDER BY id

        LIMIT 1
      `)


    const insertPlaylist =
      database.prepare(`
        INSERT INTO playlists (
          name,
          created_at,
          updated_at
        )

        VALUES (?, ?, ?)
      `)


    const findPlaylistItem =
      database.prepare(`
        SELECT id
        FROM playlist_items

        WHERE
          playlist_id = ?
          AND category = ?
          AND relative_path = ?
      `)


    const getMaxPosition =
      database.prepare(`
        SELECT
          COALESCE(
            MAX(position),
            -1
          ) AS max_position

        FROM playlist_items

        WHERE playlist_id = ?
      `)


    const insertPlaylistItem =
      database.prepare(`
        INSERT INTO playlist_items (
          playlist_id,
          category,
          relative_path,
          position,
          added_at
        )

        VALUES (?, ?, ?, ?, ?)
      `)


    const updatePlaylistTimestamp =
      database.prepare(`
        UPDATE playlists

        SET updated_at = ?

        WHERE id = ?
      `)


    for (
      const backupPlaylist
      of applicationState.playlists
    ) {

      let currentPlaylist =
        findPlaylist.get(
          backupPlaylist.name
        ) as
          CurrentPlaylistRow |
          undefined


      let playlistId:
        number


      let playlistWasCreated =
        false


      if (
        !currentPlaylist
      ) {

        const result =
          insertPlaylist.run(
            backupPlaylist.name,
            backupPlaylist.createdAt,
            backupPlaylist.updatedAt
          )


        playlistId =
          Number(
            result.lastInsertRowid
          )


        playlistWasCreated =
          true


        playlistsCreated +=
          1

      } else {

        playlistId =
          currentPlaylist.id


        playlistsMerged +=
          1

      }


      const orderedBackupItems =
        [...backupPlaylist.items]
          .sort(
            (a, b) =>
              a.position -
              b.position
          )


      for (
        const backupItem
        of orderedBackupItems
      ) {

        const existing =
          findPlaylistItem.get(
            playlistId,
            backupItem.category,
            backupItem.relativePath
          )


        if (
          existing
        ) {

          continue

        }


        let position:
          number


        if (
          playlistWasCreated
        ) {

          position =
            backupItem.position

        } else {

          const maxRow =
            getMaxPosition.get(
              playlistId
            ) as {
              max_position: number
            }


          position =
            maxRow.max_position +
            1

        }


        insertPlaylistItem.run(
          playlistId,
          backupItem.category,
          backupItem.relativePath,
          position,
          backupItem.addedAt
        )


        playlistItemsAdded +=
          1

      }


      if (
        currentPlaylist
      ) {

        const updatedAt =
          laterTimestamp(
            currentPlaylist.updated_at,
            backupPlaylist.updatedAt
          ) ??
          currentPlaylist.updated_at


        updatePlaylistTimestamp.run(
          updatedAt,
          playlistId
        )

      }

    }


    database.exec(
      'COMMIT'
    )

  } catch (error) {

    try {

      database.exec(
        'ROLLBACK'
      )

    } catch {
      // Ignore rollback errors.
    }


    throw error

  } finally {

    database.close()

  }


  const catalogRestore =
    catalogState
      ? await restoreCatalogBackupMerge(
          catalogState
        )
      : null


  return {

    success:
      true,

    mode:
      'merge',

    safetyBackup:
      safetyBackupPath,

    archiveState: {

      created:
        statesCreated,

      merged:
        statesMerged,

    },

    playlists: {

      created:
        playlistsCreated,

      merged:
        playlistsMerged,

      itemsAdded:
        playlistItemsAdded,

    },

    metadata: {

      restored:
        metadataRestored,

      alreadyCurrent:
        metadataAlreadyCurrent,

      conflictsSkipped:
        metadataConflictsSkipped,

      missingMediaSkipped:
        metadataMissingMediaSkipped,

    },

    thumbnails: {

      restored:
        thumbnailsRestored,

      existingSkipped:
        thumbnailsExistingSkipped,

      missingMediaSkipped:
        thumbnailsMissingMediaSkipped,

    },

    catalog:
      catalogRestore,

  }

}