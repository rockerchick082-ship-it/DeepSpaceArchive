import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import path from 'node:path'

import {
  applicationDatabasePath,
} from '../config/appPaths'

import {
  ZipArchive,
} from 'archiver'

import type {
  Response,
} from 'express'

import {
  createArchiveBackup,
} from './archiveBackup'

import {
  createCatalogBackup,
  getCatalogDatabasePath,
} from './catalogBackup'


const mediaExtensions =
  new Set([
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
  ])


const thumbnailExtensions =
  new Set([
    '.jpg',
    '.jpeg',
    '.png',
    '.webp',
  ])


type BackupFile = {
  absolutePath: string
  relativePath: string
}


function normalizeBackupPath(
  value: string
) {

  return value
    .split(path.sep)
    .join('/')

}


async function fileExists(
  filePath: string
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


async function collectBackupFiles(
  directory: string,
  libraryRoot: string
): Promise<BackupFile[]> {

  const results:
    BackupFile[] =
    []


  const entries =
    await fsPromises.readdir(
      directory,
      {
        withFileTypes: true,
      }
    )


  for (
    const entry
    of entries
  ) {

    const fullPath =
      path.join(
        directory,
        entry.name
      )


    if (
      entry.isDirectory()
    ) {

      const nested =
        await collectBackupFiles(
          fullPath,
          libraryRoot
        )


      results.push(
        ...nested
      )

      continue

    }


    if (
      !entry.isFile()
    ) {
      continue
    }


    /*
     * -------------------------------------
     * SIDECAR JSON
     * -------------------------------------
     *
     * A sidecar looks like:
     *
     * Before Sunrise.mp4
     * Before Sunrise.json
     *
     * We only include JSON files that
     * appear to belong to actual media.
     */

    if (
      path.extname(
        entry.name
      ).toLowerCase() ===
      '.json'
    ) {

      const parsed =
        path.parse(
          fullPath
        )


      let belongsToMedia =
        false


      for (
        const extension
        of mediaExtensions
      ) {

        const mediaPath =
          path.join(
            parsed.dir,
            `${parsed.name}${extension}`
          )


        if (
          await fileExists(
            mediaPath
          )
        ) {

          belongsToMedia =
            true

          break

        }

      }


      if (
        belongsToMedia
      ) {

        results.push({

          absolutePath:
            fullPath,

          relativePath:
            normalizeBackupPath(
              path.relative(
                libraryRoot,
                fullPath
              )
            ),

        })

      }


      continue

    }


    /*
     * -------------------------------------
     * CUSTOM THUMBNAILS
     * -------------------------------------
     *
     * Example:
     *
     * Before Sunrise.thumbnail.jpg
     */

    const parsed =
      path.parse(
        fullPath
      )


    if (
      parsed.name.endsWith(
        '.thumbnail'
      ) &&
      thumbnailExtensions.has(
        parsed.ext.toLowerCase()
      )
    ) {

      results.push({

        absolutePath:
          fullPath,

        relativePath:
          normalizeBackupPath(
            path.relative(
              libraryRoot,
              fullPath
            )
          ),

      })

    }

  }


  return results

}


export async function sendFullArchiveBackup(
  response: Response
) {

  const libraryPath =
    process.env.MEDIA_LIBRARY_PATH


  if (!libraryPath) {

    throw new Error(
      'MEDIA_LIBRARY_PATH is not configured'
    )

  }


  const resolvedLibraryPath =
    path.resolve(
      libraryPath
    )


  const archiveData =
    createArchiveBackup()


  const catalogData =
    createCatalogBackup()


  const files =
    await collectBackupFiles(
      resolvedLibraryPath,
      resolvedLibraryPath
    )


  const metadataFiles =
    files.filter(
      (file) =>
        file.relativePath
          .toLowerCase()
          .endsWith(
            '.json'
          )
    )


  const thumbnailFiles =
    files.filter(
      (file) =>
        !file.relativePath
          .toLowerCase()
          .endsWith(
            '.json'
          )
    )


  const date =
    new Date()
      .toISOString()
      .slice(
        0,
        10
      )


  const outputName =
    `DeepSpaceArchive-Backup-${date}.zip`


  response.setHeader(
  'Content-Type',
  'application/zip'
)

response.setHeader(
  'Content-Disposition',
  `attachment; filename="${outputName}"`
)

const archive =
  new ZipArchive({
    zlib: {
      level: 9,
    },
  })

archive.on(
  'warning',
  (error) => {

    console.warn(
      'Backup ZIP warning:',
      error
    )

  }
)

archive.on(
  'error',
  (error) => {

    console.error(
      'Backup ZIP error:',
      error
    )

    if (
      !response.headersSent
    ) {

      response
        .status(500)
        .end()

    } else {

      response.end()

    }

  }
)

archive.pipe(
  response
)


  /*
   * =====================================
   * README
   * =====================================
   */

  const readme =
`DeepSpace Archive Backup

Created:
${archiveData.createdAt}

Full backup format version:
2

Application-state format version:
${archiveData.backupVersion}

Metadata Catalog schema version:
${catalogData.schemaVersion}

This backup DOES NOT contain your media files.

It contains:
- application state
- favorites
- ratings
- completed play counts
- watch progress
- watch history
- playlists
- Metadata Catalog records
- Catalog file matches
- Archive-to-Memory relationships
- archive sidecar metadata
- custom thumbnails
- emergency SQLite copies

All media-library file locations are stored
relative to the media library root so this
backup can later be restored even if the NAS
mount location changes.
`


  archive.append(
    readme,
    {
      name:
        'README.txt',
    }
  )


  /*
   * =====================================
   * PORTABLE APPLICATION STATE
   * =====================================
   */

  archive.append(
    JSON.stringify(
      archiveData,
      null,
      2
    ),
    {
      name:
        'application-state.json',
    }
  )


  /*
   * =====================================
   * PORTABLE METADATA CATALOG
   * =====================================
   */

  archive.append(
    JSON.stringify(
      catalogData,
      null,
      2
    ),
    {
      name:
        'catalog-state.json',
    }
  )


  /*
   * =====================================
   * BACKUP MANIFEST
   * =====================================
   */

  const manifest = {

    backupFormat:
      'deepspace-archive-full-backup',

    backupVersion:
      2,

    createdAt:
      archiveData.createdAt,

    libraryRootNotStored:
      true,

    metadataFileCount:
      metadataFiles.length,

    customThumbnailCount:
      thumbnailFiles.length,

    archiveStateCount:
      archiveData.archiveState.length,

    playlistCount:
      archiveData.playlists.length,

    catalogItemCount:
      catalogData.items.length,

    catalogFileMatchCount:
      catalogData.fileMatches.length,

    catalogMemoryLinkCount:
      catalogData.memoryLinks.length,

    catalogSchemaVersion:
      catalogData.schemaVersion,

  }


  archive.append(
    JSON.stringify(
      manifest,
      null,
      2
    ),
    {
      name:
        'manifest.json',
    }
  )


  /*
   * =====================================
   * SIDECAR METADATA
   * =====================================
   */

  for (
    const file
    of metadataFiles
  ) {

    archive.file(
      file.absolutePath,
      {
        name:
          `library/metadata/${file.relativePath}`,
      }
    )

  }


  /*
   * =====================================
   * CUSTOM THUMBNAILS
   * =====================================
   */

  for (
    const file
    of thumbnailFiles
  ) {

    archive.file(
      file.absolutePath,
      {
        name:
          `library/thumbnails/${file.relativePath}`,
      }
    )

  }


  /*
   * =====================================
   * RAW SQLITE SAFETY COPY
   * =====================================
   *
   * This is not what future restoration
   * will depend on, but it gives you an
   * emergency exact copy too.
   */

  const databasePath =
    applicationDatabasePath


  if (
    fs.existsSync(
      databasePath
    )
  ) {

    archive.file(
      databasePath,
      {
        name:
          'emergency/deepspace-archive.db',
      }
    )

  }


  const catalogDatabasePath =
    getCatalogDatabasePath()


  if (
    fs.existsSync(
      catalogDatabasePath
    )
  ) {

    archive.file(
      catalogDatabasePath,
      {
        name:
          'emergency/metadata-catalog.db',
      }
    )

  }


  await archive.finalize()

}