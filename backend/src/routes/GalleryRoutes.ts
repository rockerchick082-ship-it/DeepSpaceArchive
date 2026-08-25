import {
  Router,
} from 'express'

import path from 'node:path'
import fs from 'node:fs/promises'

import {
  scanGallery,
} from '../scanner/galleryScanner'


const router =
  Router()


const imageContentTypes:
  Record<
    string,
    string
  > = {

  '.jpg':
    'image/jpeg',

  '.jpeg':
    'image/jpeg',

  '.png':
    'image/png',

  '.webp':
    'image/webp',

  '.gif':
    'image/gif',

  '.avif':
    'image/avif',

}


function getGalleryRoot() {

  const libraryPath =
    process.env.MEDIA_LIBRARY_PATH


  if (
    !libraryPath
  ) {

    return null

  }


  return path.resolve(
    libraryPath,
    'Gallery'
  )

}


function resolveGalleryFile(
  relativePath:
    string
) {

  const galleryRoot =
    getGalleryRoot()


  if (
    !galleryRoot
  ) {

    return null

  }


  const resolvedFile =
    path.resolve(
      galleryRoot,
      relativePath
    )


  const relative =
    path.relative(
      galleryRoot,
      resolvedFile
    )


  if (
    relative.startsWith(
      '..'
    ) ||
    path.isAbsolute(
      relative
    )
  ) {

    return null

  }


  return resolvedFile

}


router.get(
  '/',
  async (
    _request,
    response
  ) => {

    const libraryPath =
      process.env.MEDIA_LIBRARY_PATH


    if (
      !libraryPath
    ) {

      response
        .status(500)
        .json({
          error:
            'MEDIA_LIBRARY_PATH is not configured',
        })


      return

    }


    try {

      const result =
        await scanGallery(
          libraryPath
        )


      response.json({

        connected:
          result.connected,

        count:
          result.items.length,

        items:
          result.items,

      })

    } catch (error) {

      console.error(
        'Unable to scan Gallery:',
        error
      )


      response
        .status(500)
        .json({
          error:
            'Unable to scan Gallery',
        })

    }

  }
)


router.get(
  '/file',
  (
    request,
    response
  ) => {

    const relativePath =
      request.query.path


    if (
      typeof relativePath !==
        'string' ||
      !relativePath.trim()
    ) {

      response
        .status(400)
        .json({
          error:
            'path is required',
        })


      return

    }


    const filePath =
      resolveGalleryFile(
        relativePath
      )


    if (
      !filePath
    ) {

      response
        .status(403)
        .json({
          error:
            'Invalid gallery path',
        })


      return

    }


    const extension =
      path
        .extname(
          filePath
        )
        .toLowerCase()


    const contentType =
      imageContentTypes[
        extension
      ]


    if (
      !contentType
    ) {

      response
        .status(415)
        .json({
          error:
            'Unsupported gallery file type',
        })


      return

    }


    response.type(
      contentType
    )


    response.sendFile(
      filePath,
      (error) => {

        if (
          !error
        ) {

          return

        }


        if (
          !response.headersSent
        ) {

          response
            .status(404)
            .json({
              error:
                'Gallery image not found',
            })

        }

      }
    )

  }
)


router.delete(
  '/file',
  async (
    request,
    response
  ) => {

    const relativePath =
      request.query.path


    if (
      typeof relativePath !==
        'string' ||
      !relativePath.trim()
    ) {

      response
        .status(400)
        .json({
          error:
            'path is required',
        })


      return

    }


    const filePath =
      resolveGalleryFile(
        relativePath
      )


    if (
      !filePath
    ) {

      response
        .status(403)
        .json({
          error:
            'Invalid gallery path',
        })


      return

    }


    const extension =
      path
        .extname(
          filePath
        )
        .toLowerCase()


    if (
      !imageContentTypes[
        extension
      ]
    ) {

      response
        .status(415)
        .json({
          error:
            'Unsupported gallery file type',
        })


      return

    }


    try {

      await fs.unlink(
        filePath
      )


      response.json({
        success:
          true,

        relativePath,
      })

    } catch (
      error
    ) {

      const code =
        (
          error as
            NodeJS.ErrnoException
        ).code


      if (
        code ===
        'ENOENT'
      ) {

        response
          .status(404)
          .json({
            error:
              'Gallery image not found',
          })


        return

      }


      console.error(
        'Unable to delete Gallery image:',
        error
      )


      response
        .status(500)
        .json({
          error:
            'Unable to delete Gallery image',
        })

    }

  }
)


export {
  router as galleryRoutes,
}


export default router