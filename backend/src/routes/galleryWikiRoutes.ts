import {
  randomUUID,
} from 'node:crypto'

import {
  Router,
} from 'express'

import {
  getGalleryWikiSettingsStatus,
  isGalleryWikiCharacter,
  recordGalleryWikiSyncAttempt,
  recordGalleryWikiSyncFailure,
  recordGalleryWikiSyncSuccess,
  restoreDefaultGalleryWikiSources,
  updateGalleryWikiSource,
} from '../services/galleryWikiSettings'

import {
  syncGalleryWikiImages,
} from '../services/galleryWikiSync'

import type {
  GalleryWikiSyncProgress,
  GalleryWikiSyncResult,
} from '../services/galleryWikiSync'


const router =
  Router()


type SyncJob = {
  id: string
  character: string

  status:
    | 'running'
    | 'complete'
    | 'error'

  progress:
    GalleryWikiSyncProgress

  result:
    GalleryWikiSyncResult | null

  error:
    string | null
}


const jobs =
  new Map<
    string,
    SyncJob
  >()


function validHttpUrl(
  value:
    string
) {

  try {

    const parsed =
      new URL(
        value
      )


    return (
      parsed.protocol ===
        'https:' ||
      parsed.protocol ===
        'http:'
    )

  } catch {

    return false

  }

}


router.get(
  '/sources',
  async (
    _request,
    response
  ) => {

    try {

      response.json(
        await getGalleryWikiSettingsStatus()
      )

    } catch (
      error
    ) {

      console.error(
        'Unable to read Gallery wiki sources:',
        error
      )


      response
        .status(500)
        .json({
          error:
            'Unable to read Gallery wiki sources',
        })

    }

  }
)


router.put(
  '/sources/:character',
  async (
    request,
    response
  ) => {

    const character =
      request.params.character


    if (
      !isGalleryWikiCharacter(
        character
      )
    ) {

      response
        .status(400)
        .json({
          error:
            'Unsupported Gallery character',
        })


      return

    }


    const url =
      typeof request.body.url ===
        'string'
        ? request.body.url.trim()
        : ''


    if (
      !url
    ) {

      response
        .status(400)
        .json({
          error:
            'url is required',
        })


      return

    }


    if (
      !validHttpUrl(
        url
      )
    ) {

      response
        .status(400)
        .json({
          error:
            'A valid http or https URL is required',
        })


      return

    }


    try {

      const sources =
        await updateGalleryWikiSource(
          character,
          url
        )


      response.json({
        sources,
      })

    } catch (
      error
    ) {

      console.error(
        `Unable to save Gallery wiki source for ${character}:`,
        error
      )


      response
        .status(500)
        .json({
          error:
            'Unable to save Gallery wiki source',
        })

    }

  }
)


router.post(
  '/sources/restore-defaults',
  async (
    _request,
    response
  ) => {

    try {

      response.json({
        sources:
          await restoreDefaultGalleryWikiSources(),
      })

    } catch (
      error
    ) {

      console.error(
        'Unable to restore Gallery wiki defaults:',
        error
      )


      response
        .status(500)
        .json({
          error:
            'Unable to restore Gallery wiki defaults',
        })

    }

  }
)


router.post(
  '/sources/:character/test',
  async (
    request,
    response
  ) => {

    const character =
      request.params.character


    if (
      !isGalleryWikiCharacter(
        character
      )
    ) {

      response
        .status(400)
        .json({
          error:
            'Unsupported Gallery character',
        })


      return

    }


    const url =
      typeof request.body.url ===
        'string'
        ? request.body.url.trim()
        : ''


    if (
      !validHttpUrl(
        url
      )
    ) {

      response
        .status(400)
        .json({
          error:
            'A valid http or https URL is required',
        })


      return

    }


    const controller =
      new AbortController()


    const timeout =
      setTimeout(
        () => {

          controller.abort()

        },
        15_000
      )


    try {

      const result =
        await fetch(
          url,
          {
            signal:
              controller.signal,

            redirect:
              'follow',

            headers: {
              'User-Agent':
                'DeepSpaceArchive/1.0 gallery source test',
            },
          }
        )


      response.json({
        ok:
          result.ok,

        status:
          result.status,

        statusText:
          result.statusText,

        finalUrl:
          result.url,

        contentType:
          result.headers.get(
            'content-type'
          ),
      })

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
              : 'Unable to reach Gallery wiki source',
        })

    } finally {

      clearTimeout(
        timeout
      )

    }

  }
)


router.post(
  '/sync/:character/start',
  async (
    request,
    response
  ) => {

    const libraryRoot =
      process.env.MEDIA_LIBRARY_PATH


    if (
      !libraryRoot
    ) {

      response
        .status(500)
        .json({
          error:
            'MEDIA_LIBRARY_PATH is not configured',
        })


      return

    }


    const character =
      request.params.character


    if (
      !isGalleryWikiCharacter(
        character
      )
    ) {

      response
        .status(400)
        .json({
          error:
            'Unsupported Gallery character',
        })


      return

    }


    const jobId =
      randomUUID()


    const job:
      SyncJob = {

      id:
        jobId,

      character,

      status:
        'running',

      progress: {
        phase:
          'loading-category',

        current:
          0,

        total:
          1,

        percent:
          0,

        message:
          `Starting ${character} image sync...`,
      },

      result:
        null,

      error:
        null,

    }


    jobs.set(
      jobId,
      job
    )


    try {

      await recordGalleryWikiSyncAttempt(
        character
      )

    } catch (
      error
    ) {

      console.warn(
        'Unable to record Gallery sync attempt:',
        error
      )

    }


    void syncGalleryWikiImages(
      libraryRoot,
      character,
      (progress) => {

        const current =
          jobs.get(
            jobId
          )


        if (
          current
        ) {

          current.progress =
            progress

        }

      }
    )
      .then(
        async (
          result
        ) => {

          const current =
            jobs.get(
              jobId
            )


          if (
            !current
          ) {

            return

          }


          try {

            await recordGalleryWikiSyncSuccess(
              character,
              result
            )

          } catch (
            error
          ) {

            console.warn(
              'Unable to persist Gallery sync success:',
              error
            )

          }


          current.status =
            'complete'


          current.result =
            result

        }
      )
      .catch(
        async (
          error
        ) => {

          const current =
            jobs.get(
              jobId
            )


          if (
            !current
          ) {

            return

          }


          const message =
            error instanceof
              Error
              ? error.message
              : 'Gallery wiki sync failed'


          try {

            await recordGalleryWikiSyncFailure(
              character,
              message
            )

          } catch (
            historyError
          ) {

            console.warn(
              'Unable to persist Gallery sync failure:',
              historyError
            )

          }


          current.status =
            'error'


          current.error =
            message

        }
      )


    response
      .status(202)
      .json({
        jobId,
      })

  }
)


router.get(
  '/sync/:jobId',
  (
    request,
    response
  ) => {

    const job =
      jobs.get(
        request.params.jobId
      )


    if (
      !job
    ) {

      response
        .status(404)
        .json({
          error:
            'Sync job not found',
        })


      return

    }


    response.json(
      job
    )

  }
)


export {
  router as galleryWikiRoutes,
}


export default router