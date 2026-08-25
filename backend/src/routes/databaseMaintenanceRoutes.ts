import {
  Router,
} from 'express'

import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import path from 'node:path'

import {
  dataDirectory,
  applicationDatabasePath,
} from '../config/appPaths'

import {
  DatabaseSync,
} from 'node:sqlite'

import {
  scanCategory,
} from '../scanner/libraryScanner'

import {
  scanMainStory,
} from '../scanner/mainStoryScanner'


const router =
  Router()


const databasePath =
  applicationDatabasePath


const safetyBackupDirectory =
  path.join(
    dataDirectory,
    'safety-backups'
  )


type ArchiveStateRow = {
  category: string
  relative_path: string
}


type CountRow = {
  count: number
}


type ValueRow = {
  value: number | string
}


type VersionRow = {
  version: string
}


type LibraryScanResult = {
  connected: boolean
  keys: Set<string>
  scannedCategories: Set<string>
  warnings: string[]
}


const archiveScanSources = [

  {
    stateCategory:
      'Memoria',

    scannerCategory:
      'Memoria',
  },

  {
    stateCategory:
      'Secret Times',

    scannerCategory:
      'Secret Times',
  },

  {
    stateCategory:
      'Myths',

    scannerCategory:
      'Myths',
  },

  {
    stateCategory:
      'Bond',

    scannerCategory:
      'Bond',
  },

  {
    stateCategory:
      'Tender Moments',

    scannerCategory:
      'Tender Moments',
  },

  {
    stateCategory:
      'Phone Call',

    scannerCategory:
      'Phone Call',
  },

  {
    stateCategory:
      'Phone Video',

    scannerCategory:
      'Phone Video',
  },

  {
    stateCategory:
      'Illusio',

    scannerCategory:
      'Illusio Kindle',
  },

] as const


function canonicalStateCategory(
  value:
    string
) {

  if (
    value ===
    'Illusio Kindle'
  ) {

    return 'Illusio'

  }


  return value

}


function normalizeRelativePath(
  value:
    string
) {

  return value
    .replace(
      /\\/g,
      '/'
    )
    .replace(
      /^\/+/,
      ''
    )
    .toLowerCase()

}


function libraryKey(
  category:
    string,
  relativePath:
    string
) {

  return (
    `${canonicalStateCategory(
      category
    ).toLowerCase()}::${normalizeRelativePath(
      relativePath
    )}`
  )

}


async function pathExists(
  filePath:
    string
) {

  try {

    await fsPromises.access(
      filePath
    )


    return true

  } catch {

    return false

  }

}


async function getSafetyBackups() {

  await fsPromises.mkdir(
    safetyBackupDirectory,
    {
      recursive:
        true,
    }
  )


  const entries =
    await fsPromises.readdir(
      safetyBackupDirectory,
      {
        withFileTypes:
          true,
      }
    )


  const backups:
    {
      fileName: string
      size: number
      createdAt: string
    }[] = []


  for (
    const entry
    of entries
  ) {

    if (
      !entry.isFile() ||
      !entry.name
        .toLowerCase()
        .endsWith(
          '.db'
        )
    ) {

      continue

    }


    const fullPath =
      path.join(
        safetyBackupDirectory,
        entry.name
      )


    const stats =
      await fsPromises.stat(
        fullPath
      )


    backups.push({

      fileName:
        entry.name,

      size:
        stats.size,

      createdAt:
        stats.mtime
          .toISOString(),

    })

  }


  backups.sort(
    (
      left,
      right
    ) =>
      new Date(
        right.createdAt
      ).getTime() -
      new Date(
        left.createdAt
      ).getTime()
  )


  return backups

}


async function getCurrentLibraryKeys():
  Promise<LibraryScanResult> {

  const libraryPath =
    process.env.MEDIA_LIBRARY_PATH


  if (
    !libraryPath
  ) {

    return {
      connected:
        false,

      keys:
        new Set<string>(),

      scannedCategories:
        new Set<string>(),

      warnings:
        [],
    }

  }


  const libraryRoot =
    path.resolve(
      libraryPath
    )


  if (
    !await pathExists(
      libraryRoot
    )
  ) {

    return {
      connected:
        false,

      keys:
        new Set<string>(),

      scannedCategories:
        new Set<string>(),

      warnings:
        [],
    }

  }


  const keys =
    new Set<string>()


  const scannedCategories =
    new Set<string>()


  const warnings:
    string[] = []


  for (
    const source
    of archiveScanSources
  ) {

    try {

      const items =
        await scanCategory(
          libraryRoot,
          source.scannerCategory
        )


      for (
        const item
        of items
      ) {

        keys.add(
          libraryKey(
            source.stateCategory,
            item.relativePath
          )
        )

      }


      scannedCategories.add(
        source.stateCategory
      )

    } catch (
      error
    ) {

      console.warn(
        `Unable to scan ${source.stateCategory} during database maintenance:`,
        error
      )


      warnings.push(
        source.stateCategory
      )

    }

  }


  try {

    const branches =
      await scanMainStory(
        libraryRoot
      )


    for (
      const branch
      of branches
    ) {

      for (
        const chapter
        of branch.chapters
      ) {

        for (
          const part
          of chapter.parts
        ) {

          const relativePath =
            path
              .join(
                'Main Story',
                part.relativePath
              )
              .split(
                path.sep
              )
              .join(
                '/'
              )


          keys.add(
            libraryKey(
              'Main Story',
              relativePath
            )
          )

        }

      }

    }


    scannedCategories.add(
      'Main Story'
    )

  } catch (
    error
  ) {

    console.warn(
      'Unable to scan Main Story during database maintenance:',
      error
    )


    warnings.push(
      'Main Story'
    )

  }


  return {
    connected:
      true,

    keys,

    scannedCategories,

    warnings,
  }

}


function readPragmaNumber(
  database:
    DatabaseSync,
  pragma:
    string
) {

  const row =
    database
      .prepare(
        `PRAGMA ${pragma}`
      )
      .get() as
        Record<
          string,
          number | string
        > |
        undefined


  const firstValue =
    row
      ? Object.values(
          row
        )[0]
      : 0


  const numeric =
    Number(
      firstValue
    )


  return Number.isFinite(
    numeric
  )
    ? numeric
    : 0

}


function readPragmaString(
  database:
    DatabaseSync,
  pragma:
    string
) {

  const row =
    database
      .prepare(
        `PRAGMA ${pragma}`
      )
      .get() as
        Record<
          string,
          number | string
        > |
        undefined


  const firstValue =
    row
      ? Object.values(
          row
        )[0]
      : ''


  return String(
    firstValue ??
    ''
  )

}


/*
 * ========================================
 * DATABASE STATUS
 * ========================================
 */

router.get(
  '/status',
  async (
    _request,
    response
  ) => {

    if (
      !fs.existsSync(
        databasePath
      )
    ) {

      return response
        .status(500)
        .json({
          error:
            'DeepSpace Archive database does not exist.',
        })

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

      const databaseStats =
        await fsPromises.stat(
          databasePath
        )


      const archiveStateCount =
        (
          database
            .prepare(`
              SELECT
                COUNT(*) AS count
              FROM archive_state
            `)
            .get() as CountRow
        ).count


      const favoriteCount =
        (
          database
            .prepare(`
              SELECT
                COUNT(*) AS count
              FROM archive_state
              WHERE favorite = 1
            `)
            .get() as CountRow
        ).count


      const ratedCount =
        (
          database
            .prepare(`
              SELECT
                COUNT(*) AS count
              FROM archive_state
              WHERE rating IS NOT NULL
            `)
            .get() as CountRow
        ).count


      const completedRecords =
        (
          database
            .prepare(`
              SELECT
                COUNT(*) AS count
              FROM archive_state
              WHERE completed = 1
            `)
            .get() as CountRow
        ).count


      const playlistCount =
        (
          database
            .prepare(`
              SELECT
                COUNT(*) AS count
              FROM playlists
            `)
            .get() as CountRow
        ).count


      const playlistItemCount =
        (
          database
            .prepare(`
              SELECT
                COUNT(*) AS count
              FROM playlist_items
            `)
            .get() as CountRow
        ).count


      const sqliteVersion =
        (
          database
            .prepare(`
              SELECT
                sqlite_version() AS version
            `)
            .get() as VersionRow
        ).version


      const pageSize =
        readPragmaNumber(
          database,
          'page_size'
        )


      const pageCount =
        readPragmaNumber(
          database,
          'page_count'
        )


      const freePages =
        readPragmaNumber(
          database,
          'freelist_count'
        )


      const userVersion =
        readPragmaNumber(
          database,
          'user_version'
        )


      const journalMode =
        readPragmaString(
          database,
          'journal_mode'
        )


      const stateRows =
        database
          .prepare(`
            SELECT
              category,
              relative_path
            FROM archive_state
          `)
          .all() as ArchiveStateRow[]


      const library =
        await getCurrentLibraryKeys()


      const orphanedStateRecords:
        {
          category: string
          relativePath: string
        }[] = []


      if (
        library.connected
      ) {

        for (
          const state
          of stateRows
        ) {

          const canonicalCategory =
            canonicalStateCategory(
              state.category
            )


          /*
           * If one category scan failed, do not
           * incorrectly label that category's state
           * as orphaned.
           */
          if (
            !library.scannedCategories.has(
              canonicalCategory
            )
          ) {

            continue

          }


          if (
            !library.keys.has(
              libraryKey(
                canonicalCategory,
                state.relative_path
              )
            )
          ) {

            orphanedStateRecords.push({

              category:
                canonicalCategory,

              relativePath:
                state.relative_path,

            })

          }

        }

      }


      const safetyBackups =
        await getSafetyBackups()


      return response.json({

        database: {

          path:
            databasePath,

          size:
            databaseStats.size,

          modifiedAt:
            databaseStats.mtime
              .toISOString(),

        },

        sqlite: {

          version:
            sqliteVersion,

          journalMode,

          pageSize,

          pageCount,

          freePages,

          estimatedFreeBytes:
            freePages *
            pageSize,

          userVersion,

        },

        records: {

          archiveState:
            archiveStateCount,

          favorites:
            favoriteCount,

          rated:
            ratedCount,

          completed:
            completedRecords,

          playlists:
            playlistCount,

          playlistItems:
            playlistItemCount,

        },

        libraryConnected:
          library.connected,

        libraryScanWarnings:
          library.warnings,

        orphanedStateRecords,

        orphanedStateCount:
          orphanedStateRecords.length,

        safetyBackups,

        safetyBackupCount:
          safetyBackups.length,

        scannedAt:
          new Date()
            .toISOString(),

      })

    } catch (
      error
    ) {

      console.error(
        'Unable to inspect database:',
        error
      )


      return response
        .status(500)
        .json({
          error:
            'Unable to inspect database.',
        })

    } finally {

      database.close()

    }

  }
)


/*
 * ========================================
 * SQLITE INTEGRITY CHECK
 * ========================================
 */

router.get(
  '/integrity',
  (
    _request,
    response
  ) => {

    if (
      !fs.existsSync(
        databasePath
      )
    ) {

      return response
        .status(500)
        .json({
          error:
            'Database does not exist.',
        })

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

      const rows =
        database
          .prepare(`
            PRAGMA integrity_check
          `)
          .all() as
          Record<
            string,
            string
          >[]


      const messages =
        rows.flatMap(
          (row) =>
            Object.values(
              row
            )
        )


      const healthy =
        messages.length ===
          1 &&
        messages[0]
          .toLowerCase() ===
          'ok'


      return response.json({

        healthy,

        messages,

        checkedAt:
          new Date()
            .toISOString(),

      })

    } catch (
      error
    ) {

      console.error(
        'Unable to run SQLite integrity check:',
        error
      )


      return response
        .status(500)
        .json({
          error:
            'Unable to run database integrity check.',
        })

    } finally {

      database.close()

    }

  }
)


/*
 * ========================================
 * CREATE SAFETY SNAPSHOT
 * ========================================
 */

router.post(
  '/snapshot',
  async (
    _request,
    response
  ) => {

    try {

      await fsPromises.mkdir(
        safetyBackupDirectory,
        {
          recursive:
            true,
        }
      )


      const timestamp =
        new Date()
          .toISOString()
          .replace(
            /[:.]/g,
            '-'
          )


      const outputPath =
        path.join(
          safetyBackupDirectory,
          `manual-${timestamp}.db`
        )


      const database =
        new DatabaseSync(
          databasePath
        )


      try {

        const escaped =
          outputPath.replace(
            /'/g,
            "''"
          )


        database.exec(
          `VACUUM INTO '${escaped}'`
        )

      } finally {

        database.close()

      }


      const stats =
        await fsPromises.stat(
          outputPath
        )


      return response.json({

        success:
          true,

        fileName:
          path.basename(
            outputPath
          ),

        size:
          stats.size,

        createdAt:
          new Date()
            .toISOString(),

      })

    } catch (
      error
    ) {

      console.error(
        'Unable to create database snapshot:',
        error
      )


      return response
        .status(500)
        .json({
          error:
            'Unable to create database safety snapshot.',
        })

    }

  }
)


/*
 * ========================================
 * DOWNLOAD SAFETY SNAPSHOT
 * ========================================
 */

router.get(
  '/snapshots/:fileName/download',
  async (
    request,
    response
  ) => {

    const requested =
      request.params.fileName


    const safeName =
      path.basename(
        requested
      )


    if (
      safeName !==
        requested ||
      !safeName
        .toLowerCase()
        .endsWith(
          '.db'
        )
    ) {

      return response
        .status(400)
        .json({
          error:
            'Invalid snapshot filename.',
        })

    }


    const snapshotPath =
      path.join(
        safetyBackupDirectory,
        safeName
      )


    if (
      !await pathExists(
        snapshotPath
      )
    ) {

      return response
        .status(404)
        .json({
          error:
            'Snapshot not found.',
        })

    }


    return response.download(
      snapshotPath,
      safeName
    )

  }
)


/*
 * ========================================
 * OPTIMIZE DATABASE
 * ========================================
 *
 * Creates a safety snapshot first,
 * then runs:
 *
 * PRAGMA optimize
 * VACUUM
 *
 * This does not delete archive records.
 * ========================================
 */

router.post(
  '/optimize',
  async (
    _request,
    response
  ) => {

    try {

      await fsPromises.mkdir(
        safetyBackupDirectory,
        {
          recursive:
            true,
        }
      )


      const timestamp =
        new Date()
          .toISOString()
          .replace(
            /[:.]/g,
            '-'
          )


      const snapshotPath =
        path.join(
          safetyBackupDirectory,
          `pre-optimize-${timestamp}.db`
        )


      const beforeStats =
        await fsPromises.stat(
          databasePath
        )


      const database =
        new DatabaseSync(
          databasePath
        )


      try {

        const escapedSnapshot =
          snapshotPath.replace(
            /'/g,
            "''"
          )


        database.exec(
          `VACUUM INTO '${escapedSnapshot}'`
        )


        database.exec(
          'PRAGMA optimize'
        )


        database.exec(
          'VACUUM'
        )

      } finally {

        database.close()

      }


      const afterStats =
        await fsPromises.stat(
          databasePath
        )


      return response.json({

        success:
          true,

        beforeSize:
          beforeStats.size,

        afterSize:
          afterStats.size,

        bytesSaved:
          Math.max(
            0,
            beforeStats.size -
            afterStats.size
          ),

        safetyBackup:
          path.basename(
            snapshotPath
          ),

        completedAt:
          new Date()
            .toISOString(),

      })

    } catch (
      error
    ) {

      console.error(
        'Unable to optimize database:',
        error
      )


      return response
        .status(500)
        .json({
          error:
            'Unable to optimize database.',
        })

    }

  }
)


export {
  router as databaseMaintenanceRoutes,
}


export default router