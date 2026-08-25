import {
  Router,
} from 'express'

import fs from 'node:fs/promises'
import path from 'node:path'

import {
  scanCategory,
} from '../scanner/libraryScanner'


const router =
  Router()


const archiveCategories = [
  'Memoria',
  'Secret Times',
  'Myths',
  'Bond',
  'Tender Moments',
]


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

    '.jpg',
    '.jpeg',
    '.png',
    '.webp',
    '.gif',
  ])


const thumbnailExtensions =
  new Set([
    '.jpg',
    '.jpeg',
    '.png',
    '.webp',
  ])


type RawLibraryFile = {
  absolutePath: string
  relativePath: string
  fileName: string
}


type MetadataIssue = {

  type:
    | 'missing-sidecar'
    | 'missing-thumbnail'
    | 'invalid-sidecar'
    | 'orphaned-sidecar'
    | 'orphaned-thumbnail'
    | 'broken-thumbnail-reference'

  severity:
    'info' |
    'warning' |
    'error'

  relativePath:
    string

  message:
    string

}


function normalizePath(
  value: string
) {

  return value
    .split(path.sep)
    .join('/')

}


function normalizeCategoryKey(
  category: string
) {

  return category
    .toLowerCase()
    .replace(
      /\s+/g,
      '-'
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


async function collectRawFiles(
  directory: string,
  libraryRoot: string
): Promise<RawLibraryFile[]> {

  const results:
    RawLibraryFile[] =
    []


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

    const absolutePath =
      path.join(
        directory,
        entry.name
      )


    if (
      entry.isDirectory()
    ) {

      const nested =
        await collectRawFiles(
          absolutePath,
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


    results.push({

      absolutePath,

      relativePath:
        normalizePath(
          path.relative(
            libraryRoot,
            absolutePath
          )
        ),

      fileName:
        entry.name,

    })

  }


  return results

}


function mediaBaseKey(
  relativePath: string
) {

  const parsed =
    path.posix.parse(
      normalizePath(
        relativePath
      )
    )


  return path.posix
    .join(
      parsed.dir,
      parsed.name
    )
    .toLowerCase()

}


function sidecarBaseKey(
  relativePath: string
) {

  const parsed =
    path.posix.parse(
      normalizePath(
        relativePath
      )
    )


  return path.posix
    .join(
      parsed.dir,
      parsed.name
    )
    .toLowerCase()

}


function thumbnailBaseKey(
  relativePath: string
) {

  const parsed =
    path.posix.parse(
      normalizePath(
        relativePath
      )
    )


  const mediaName =
    parsed.name.replace(
      /\.thumbnail$/i,
      ''
    )


  return path.posix
    .join(
      parsed.dir,
      mediaName
    )
    .toLowerCase()

}


/*
 * ========================================
 * LIBRARY STATUS
 * ========================================
 */

router.get(
  '/status',
  async (
    _request,
    response
  ) => {

    try {

      const libraryPath =
        process.env.MEDIA_LIBRARY_PATH


      if (!libraryPath) {

        return response
          .status(500)
          .json({
            error:
              'MEDIA_LIBRARY_PATH is not configured.',
          })

      }


      const resolvedLibraryPath =
        path.resolve(
          libraryPath
        )


      const categoryCounts:
        Record<string, number> =
        {}


      const characterCounts:
        Record<string, number> =
        {}


      const mediaTypeCounts = {
        video: 0,
        audio: 0,
        image: 0,
      }


      let totalMedia =
        0


      for (
        const category
        of archiveCategories
      ) {

        try {

          const items =
            await scanCategory(
              resolvedLibraryPath,
              category
            )


          const categoryKey =
            normalizeCategoryKey(
              category
            )


          categoryCounts[
            categoryKey
          ] =
            items.length


          totalMedia +=
            items.length


          for (
            const item
            of items
          ) {

            characterCounts[
              item.character
            ] =
              (
                characterCounts[
                  item.character
                ] ??
                0
              ) +
              1


            if (
              item.mediaType ===
              'video'
            ) {

              mediaTypeCounts.video +=
                1

            }


            if (
              item.mediaType ===
              'audio'
            ) {

              mediaTypeCounts.audio +=
                1

            }


            if (
              item.mediaType ===
              'image'
            ) {

              mediaTypeCounts.image +=
                1

            }

          }

        } catch (error) {

          console.warn(
            `Unable to scan category "${category}":`,
            error
          )


          categoryCounts[
            normalizeCategoryKey(
              category
            )
          ] =
            0

        }

      }


      return response.json({

        connected:
          true,

        libraryRoot:
          resolvedLibraryPath,

        totalMedia,

        categories: {

          memoria:
            categoryCounts[
              'memoria'
            ] ?? 0,

          secretTimes:
            categoryCounts[
              'secret-times'
            ] ?? 0,

          myths:
            categoryCounts[
              'myths'
            ] ?? 0,

          bond:
            categoryCounts[
              'bond'
            ] ?? 0,

          tenderMoments:
            categoryCounts[
              'tender-moments'
            ] ?? 0,

        },

        characters:
          characterCounts,

        mediaTypes:
          mediaTypeCounts,

        scannedAt:
          new Date()
            .toISOString(),

      })

    } catch (error) {

      console.error(
        'Unable to load library status:',
        error
      )


      return response
        .status(500)
        .json({
          error:
            'Unable to load library status.',
        })

    }

  }
)


/*
 * ========================================
 * METADATA HEALTH
 * ========================================
 */

router.get(
  '/metadata',
  async (
    _request,
    response
  ) => {

    try {

      const libraryPath =
        process.env.MEDIA_LIBRARY_PATH


      if (!libraryPath) {

        return response
          .status(500)
          .json({
            error:
              'MEDIA_LIBRARY_PATH is not configured.',
          })

      }


      const libraryRoot =
        path.resolve(
          libraryPath
        )


      /*
       * ===================================
       * GET REAL MEDIA FROM NORMAL SCANNER
       * ===================================
       */

      const mediaItems =
        [] as Awaited<
          ReturnType<
            typeof scanCategory
          >
        >


      for (
        const category
        of archiveCategories
      ) {

        try {

          const items =
            await scanCategory(
              libraryRoot,
              category
            )


          mediaItems.push(
            ...items
          )

        } catch (error) {

          console.warn(
            `Unable to scan ${category}:`,
            error
          )

        }

      }


      /*
       * ===================================
       * RAW FILE SYSTEM SCAN
       * ===================================
       */

      const rawFiles:
        RawLibraryFile[] =
        []


      for (
        const category
        of archiveCategories
      ) {

        const categoryPath =
          path.join(
            libraryRoot,
            category
          )


        if (
          !await pathExists(
            categoryPath
          )
        ) {

          continue

        }


        const files =
          await collectRawFiles(
            categoryPath,
            libraryRoot
          )


        rawFiles.push(
          ...files
        )

      }


      /*
       * ===================================
       * CLASSIFY FILES
       * ===================================
       */

      const sidecars =
        rawFiles.filter(
          (file) =>
            path.extname(
              file.fileName
            ).toLowerCase() ===
            '.json'
        )


      const customThumbnails =
        rawFiles.filter(
          (file) => {

            const parsed =
              path.parse(
                file.fileName
              )


            return (
              parsed.name
                .toLowerCase()
                .endsWith(
                  '.thumbnail'
                ) &&
              thumbnailExtensions.has(
                parsed.ext
                  .toLowerCase()
              )
            )

          }
        )


      /*
       * Build fast lookup sets.
       */

      const mediaKeys =
        new Set(
          mediaItems.map(
            (item) =>
              mediaBaseKey(
                item.relativePath
              )
          )
        )


      const sidecarKeys =
        new Set(
          sidecars.map(
            (file) =>
              sidecarBaseKey(
                file.relativePath
              )
          )
        )


      const thumbnailKeys =
        new Set(
          customThumbnails.map(
            (file) =>
              thumbnailBaseKey(
                file.relativePath
              )
          )
        )


      const issues:
        MetadataIssue[] =
        []


      let mediaWithoutSidecar =
        0


      let mediaWithoutCustomThumbnail =
        0


      let invalidSidecars =
        0


      let orphanedSidecars =
        0


      let orphanedThumbnails =
        0


      let brokenThumbnailReferences =
        0


      /*
       * ===================================
       * CHECK EACH MEDIA ITEM
       * ===================================
       */

      for (
        const item
        of mediaItems
      ) {

        const key =
          mediaBaseKey(
            item.relativePath
          )


        if (
          !sidecarKeys.has(
            key
          )
        ) {

          mediaWithoutSidecar +=
            1


          issues.push({

            type:
              'missing-sidecar',

            severity:
              'info',

            relativePath:
              normalizePath(
                item.relativePath
              ),

            message:
              'No custom metadata sidecar exists for this media item.',

          })

        }


        if (
          !thumbnailKeys.has(
            key
          )
        ) {

          mediaWithoutCustomThumbnail +=
            1


          issues.push({

            type:
              'missing-thumbnail',

            severity:
              'info',

            relativePath:
              normalizePath(
                item.relativePath
              ),

            message:
              'No custom thumbnail has been assigned.',

          })

        }

      }


      /*
       * ===================================
       * CHECK SIDECARS
       * ===================================
       */

      for (
        const sidecar
        of sidecars
      ) {

        const key =
          sidecarBaseKey(
            sidecar.relativePath
          )


        /*
         * Orphaned sidecar.
         */

        if (
          !mediaKeys.has(
            key
          )
        ) {

          orphanedSidecars +=
            1


          issues.push({

            type:
              'orphaned-sidecar',

            severity:
              'warning',

            relativePath:
              sidecar.relativePath,

            message:
              'Metadata sidecar does not match a current media file.',

          })

        }


        /*
         * JSON validity.
         */

        try {

          const contents =
            await fs.readFile(
              sidecar.absolutePath,
              'utf8'
            )


          const metadata =
            JSON.parse(
              contents
            ) as {
              thumbnail?: unknown
            }


          /*
           * Thumbnail reference exists
           * inside metadata but target
           * artwork file is missing.
           */

          if (
            typeof metadata.thumbnail ===
              'string' &&
            metadata.thumbnail.trim()
          ) {

            const referencedThumbnail =
              path.join(
                path.dirname(
                  sidecar.absolutePath
                ),
                metadata.thumbnail
              )


            if (
              !await pathExists(
                referencedThumbnail
              )
            ) {

              brokenThumbnailReferences +=
                1


              issues.push({

                type:
                  'broken-thumbnail-reference',

                severity:
                  'error',

                relativePath:
                  sidecar.relativePath,

                message:
                  `Metadata references missing thumbnail "${metadata.thumbnail}".`,

              })

            }

          }

        } catch {

          invalidSidecars +=
            1


          issues.push({

            type:
              'invalid-sidecar',

            severity:
              'error',

            relativePath:
              sidecar.relativePath,

            message:
              'Metadata sidecar contains invalid JSON.',

          })

        }

      }


      /*
       * ===================================
       * CHECK CUSTOM THUMBNAILS
       * ===================================
       */

      for (
        const thumbnail
        of customThumbnails
      ) {

        const key =
          thumbnailBaseKey(
            thumbnail.relativePath
          )


        if (
          !mediaKeys.has(
            key
          )
        ) {

          orphanedThumbnails +=
            1


          issues.push({

            type:
              'orphaned-thumbnail',

            severity:
              'warning',

            relativePath:
              thumbnail.relativePath,

            message:
              'Custom thumbnail does not match a current media file.',

          })

        }

      }


      /*
       * Put actual problems first.
       */

      const severityOrder = {
        error: 0,
        warning: 1,
        info: 2,
      }


      issues.sort(
        (a, b) => {

          const severityDifference =
            severityOrder[
              a.severity
            ] -
            severityOrder[
              b.severity
            ]


          if (
            severityDifference !==
            0
          ) {

            return severityDifference

          }


          return a.relativePath
            .localeCompare(
              b.relativePath,
              undefined,
              {
                numeric: true,
                sensitivity: 'base',
              }
            )

        }
      )


      return response.json({

        totalMedia:
          mediaItems.length,

        sidecarMetadata:
          sidecars.length,

        customThumbnails:
          customThumbnails.length,

        mediaWithoutSidecar,

        mediaWithoutCustomThumbnail,

        invalidSidecars,

        orphanedSidecars,

        orphanedThumbnails,

        brokenThumbnailReferences,

        actualProblems:
          invalidSidecars +
          orphanedSidecars +
          orphanedThumbnails +
          brokenThumbnailReferences,

        issues,

        scannedAt:
          new Date()
            .toISOString(),

      })

    } catch (error) {

      console.error(
        'Unable to check metadata health:',
        error
      )


      return response
        .status(500)
        .json({
          error:
            'Unable to check metadata health.',
        })

    }

  }
)


export default router