import path from 'node:path'
import {
  Router,
} from 'express'

import fs from 'node:fs/promises'


import {
  thumbnailCacheDirectory,
} from '../config/appPaths'

const router =
  Router()


const cacheDirectory =
  thumbnailCacheDirectory


const archiveCategories = [
  'Memoria',
  'Secret Times',
  'Myths',
  'Bond',
  'Tender Moments',
]


const customThumbnailExtensions =
  new Set([
    '.jpg',
    '.jpeg',
    '.png',
    '.webp',
  ])


type FileStats = {
  count: number
  bytes: number
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


async function collectDirectoryStats(
  directory: string
): Promise<FileStats> {

  if (
    !await pathExists(
      directory
    )
  ) {

    return {
      count: 0,
      bytes: 0,
    }

  }


  let count =
    0


  let bytes =
    0


  const entries =
    await fs.readdir(
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
        await collectDirectoryStats(
          fullPath
        )


      count +=
        nested.count


      bytes +=
        nested.bytes


      continue

    }


    if (
      !entry.isFile()
    ) {

      continue

    }


    const stats =
      await fs.stat(
        fullPath
      )


    count +=
      1


    bytes +=
      stats.size

  }


  return {
    count,
    bytes,
  }

}


async function countCustomThumbnails(
  directory: string
): Promise<FileStats> {

  if (
    !await pathExists(
      directory
    )
  ) {

    return {
      count: 0,
      bytes: 0,
    }

  }


  let count =
    0


  let bytes =
    0


  const entries =
    await fs.readdir(
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
        await countCustomThumbnails(
          fullPath
        )


      count +=
        nested.count


      bytes +=
        nested.bytes


      continue

    }


    if (
      !entry.isFile()
    ) {

      continue

    }


    const parsed =
      path.parse(
        entry.name
      )


    const isCustomThumbnail =
      parsed.name
        .toLowerCase()
        .endsWith(
          '.thumbnail'
        ) &&
      customThumbnailExtensions.has(
        parsed.ext
          .toLowerCase()
      )


    if (
      !isCustomThumbnail
    ) {

      continue

    }


    const stats =
      await fs.stat(
        fullPath
      )


    count +=
      1


    bytes +=
      stats.size

  }


  return {
    count,
    bytes,
  }

}


async function clearDirectoryContents(
  directory: string
) {

  if (
    !await pathExists(
      directory
    )
  ) {

    await fs.mkdir(
      directory,
      {
        recursive: true,
      }
    )


    return {
      removedFiles: 0,
      removedBytes: 0,
    }

  }


  const before =
    await collectDirectoryStats(
      directory
    )


  const entries =
    await fs.readdir(
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


    await fs.rm(
      fullPath,
      {
        recursive: true,
        force: true,
      }
    )

  }


  return {
    removedFiles:
      before.count,

    removedBytes:
      before.bytes,
  }

}


/*
 * ========================================
 * THUMBNAIL STATUS
 * ========================================
 */

router.get(
  '/status',
  async (
    _request,
    response
  ) => {

    try {

      const generated =
        await collectDirectoryStats(
          cacheDirectory
        )


      const libraryPath =
        process.env.MEDIA_LIBRARY_PATH


      let custom: FileStats = {
        count: 0,
        bytes: 0,
      }


      let libraryConnected =
        false


      if (
        libraryPath
      ) {

        const libraryRoot =
          path.resolve(
            libraryPath
          )


        libraryConnected =
          await pathExists(
            libraryRoot
          )


        if (
          libraryConnected
        ) {

          for (
            const category
            of archiveCategories
          ) {

            const categoryPath =
              path.join(
                libraryRoot,
                category
              )


            const result =
              await countCustomThumbnails(
                categoryPath
              )


            custom.count +=
              result.count


            custom.bytes +=
              result.bytes

          }

        }

      }


      response.json({

        generatedCache: {

          path:
            cacheDirectory,

          count:
            generated.count,

          bytes:
            generated.bytes,

        },

        customArtwork: {

          count:
            custom.count,

          bytes:
            custom.bytes,

        },

        libraryConnected,

        scannedAt:
          new Date()
            .toISOString(),

      })

    } catch (error) {

      console.error(
        'Unable to inspect thumbnail cache:',
        error
      )


      response
        .status(500)
        .json({
          error:
            'Unable to inspect thumbnail cache.',
        })

    }

  }
)


/*
 * ========================================
 * CLEAR GENERATED CACHE
 * ========================================
 *
 * IMPORTANT:
 *
 * This ONLY clears:
 *
 * backend/cache/thumbnails
 *
 * It never touches MEDIA_LIBRARY_PATH.
 * ========================================
 */

router.post(
  '/clear-generated',
  async (
    _request,
    response
  ) => {

    try {

      const result =
        await clearDirectoryContents(
          cacheDirectory
        )


      response.json({

        success:
          true,

        removedFiles:
          result.removedFiles,

        removedBytes:
          result.removedBytes,

      })

    } catch (error) {

      console.error(
        'Unable to clear generated thumbnails:',
        error
      )


      response
        .status(500)
        .json({
          error:
            'Unable to clear generated thumbnail cache.',
        })

    }

  }
)


export default router