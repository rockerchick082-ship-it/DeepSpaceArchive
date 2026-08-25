import {
  Router,
} from 'express'

import {
  browseMediaDirectories,
  clearSavedMediaLibraryPath,
  getPathSettingsStatus,
  saveMediaLibraryPath,
  testMediaLibraryPath,
} from '../services/pathSettings'


const router =
  Router()


router.get(
  '/',
  async (
    _request,
    response
  ) => {

    try {

      response.json(
        await getPathSettingsStatus()
      )

    } catch (
      error
    ) {

      console.error(
        'Unable to read path settings:',
        error
      )


      response
        .status(500)
        .json({
          error:
            'Unable to read path settings',
        })

    }

  }
)


router.get(
  '/browse',
  async (
    request,
    response
  ) => {

    const requestedPath =
      typeof request.query.path ===
        'string'
        ? request.query.path
        : undefined


    try {

      response.json(
        await browseMediaDirectories(
          requestedPath
        )
      )

    } catch (
      error
    ) {

      response
        .status(400)
        .json({
          error:
            error instanceof
              Error
              ? error.message
              : 'Unable to browse media folders',
        })

    }

  }
)


router.post(
  '/test',
  async (
    request,
    response
  ) => {

    const mediaLibraryPath =
      typeof request.body
        .mediaLibraryPath ===
        'string'
        ? request.body
            .mediaLibraryPath
        : ''


    if (
      !mediaLibraryPath.trim()
    ) {

      response
        .status(400)
        .json({
          error:
            'mediaLibraryPath is required',
        })


      return

    }


    try {

      response.json(
        await testMediaLibraryPath(
          mediaLibraryPath
        )
      )

    } catch (
      error
    ) {

      console.error(
        'Unable to test media library path:',
        error
      )


      response
        .status(500)
        .json({
          error:
            'Unable to test media library path',
        })

    }

  }
)


router.put(
  '/media-library',
  async (
    request,
    response
  ) => {

    const mediaLibraryPath =
      typeof request.body
        .mediaLibraryPath ===
        'string'
        ? request.body
            .mediaLibraryPath
        : ''


    if (
      !mediaLibraryPath.trim()
    ) {

      response
        .status(400)
        .json({
          error:
            'mediaLibraryPath is required',
        })


      return

    }


    try {

      response.json(
        await saveMediaLibraryPath(
          mediaLibraryPath
        )
      )

    } catch (
      error
    ) {

      response
        .status(400)
        .json({
          error:
            error instanceof
              Error
              ? error.message
              : 'Unable to save media library path',
        })

    }

  }
)


router.delete(
  '/media-library',
  async (
    _request,
    response
  ) => {

    try {

      response.json(
        await clearSavedMediaLibraryPath()
      )

    } catch (
      error
    ) {

      console.error(
        'Unable to clear saved media library path:',
        error
      )


      response
        .status(400)
        .json({
          error:
            error instanceof
              Error
              ? error.message
              : 'Unable to clear saved media library path',
        })

    }

  }
)


export {
  router as pathSettingsRoutes,
}


export default router