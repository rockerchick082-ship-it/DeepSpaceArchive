import {
  Router,
} from 'express'

import {
  completeFirstRunSetup,
  getSetupStatus,
} from '../services/setupState'


const router =
  Router()


router.get(
  '/status',
  async (
    _request,
    response
  ) => {

    try {

      response.json(
        await getSetupStatus()
      )

    } catch (
      error
    ) {

      console.error(
        'Unable to read first-run setup status:',
        error
      )


      response
        .status(500)
        .json({
          error:
            'Unable to read first-run setup status.',
        })

    }

  }
)


router.post(
  '/complete',
  async (
    _request,
    response
  ) => {

    try {

      response.json(
        await completeFirstRunSetup()
      )

    } catch (
      error
    ) {

      console.error(
        'Unable to complete first-run setup:',
        error
      )


      response
        .status(400)
        .json({
          error:
            error instanceof
              Error
              ? error.message
              : 'Unable to complete first-run setup.',
        })

    }

  }
)


export {
  router as setupRoutes,
}


export default router
