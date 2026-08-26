import fs from 'node:fs/promises'
import path from 'node:path'

import {
  Router,
} from 'express'


const router =
  Router()


const downloadableExtensions =
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


function resolveInsideLibrary(
  libraryRoot: string,
  relativePath: string
) {

  if (
    relativePath.includes(
      '\0'
    )
  ) {
    throw new Error(
      'Invalid media path'
    )
  }


  const resolvedRoot =
    path.resolve(
      libraryRoot
    )

  const resolvedTarget =
    path.resolve(
      resolvedRoot,
      relativePath
    )

  const relative =
    path.relative(
      resolvedRoot,
      resolvedTarget
    )


  if (
    relative === '' ||
    relative.startsWith(
      '..'
    ) ||
    path.isAbsolute(
      relative
    )
  ) {
    throw new Error(
      'Requested file is outside the media library'
    )
  }


  return resolvedTarget
}


router.get(
  '/download',
  async (
    request,
    response
  ) => {

    try {

      const relativePath =
        request.query.relativePath


      if (
        typeof relativePath !==
          'string' ||
        relativePath.trim() ===
          ''
      ) {
        return response
          .status(400)
          .json({
            error:
              'relativePath is required',
          })
      }


      const libraryRoot =
        process.env
          .MEDIA_LIBRARY_PATH


      if (
        !libraryRoot
      ) {
        return response
          .status(500)
          .json({
            error:
              'MEDIA_LIBRARY_PATH is not configured',
          })
      }


      let fullPath:
        string


      try {
        fullPath =
          resolveInsideLibrary(
            libraryRoot,
            relativePath
          )
      } catch {
        return response
          .status(403)
          .json({
            error:
              'Requested file is outside the media library',
          })
      }


      const extension =
        path
          .extname(
            fullPath
          )
          .toLowerCase()


      if (
        !downloadableExtensions
          .has(
            extension
          )
      ) {
        return response
          .status(415)
          .json({
            error:
              'Unsupported media type',
          })
      }


      let stats

      try {
        stats =
          await fs.stat(
            fullPath
          )
      } catch {
        return response
          .status(404)
          .json({
            error:
              'Media file not found',
          })
      }


      if (
        !stats.isFile()
      ) {
        return response
          .status(404)
          .json({
            error:
              'Media file not found',
          })
      }


      const fileName =
        path.basename(
          fullPath
        )


      response.attachment(
        fileName
      )

      response.setHeader(
        'Accept-Ranges',
        'bytes'
      )


      return response.sendFile(
        fullPath,
        {
          acceptRanges:
            true,
          cacheControl:
            false,
        },
        (error) => {

          if (
            error &&
            !response.headersSent
          ) {
            console.error(
              'Unable to download media:',
              error
            )

            response
              .status(500)
              .json({
                error:
                  'Unable to download media',
              })
          }

        }
      )

    } catch (
      error
    ) {

      console.error(
        'Media download failed:',
        error
      )

      if (
        !response.headersSent
      ) {
        return response
          .status(500)
          .json({
            error:
              'Unable to download media',
          })
      }

    }

  }
)


export default router
