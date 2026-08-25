import {
  Router,
} from 'express'

import {
  getArchiveState,
  getArchiveStats,
  listArchiveStates,
  resetCompletion,
  saveProgress,
  setFavorite,
  setRating,
} from '../state/archiveState'


const router =
  Router()


function readIdentity(
  body: {
    category?: unknown
    relativePath?: unknown
  }
) {

  if (
    typeof body.category !==
      'string' ||
    typeof body.relativePath !==
      'string'
  ) {

    return null

  }


  return {
    category:
      body.category,

    relativePath:
      body.relativePath,
  }

}


router.get(
  '/stats',
  (_request, response) => {

    const stats =
      getArchiveStats()


    response.json(
      stats
    )

  }
)

router.get(
  '/states',
  (_request, response) => {

    const states =
      listArchiveStates()


    response.json({
      count:
        states.length,

      items:
        states,
    })

  }
)


router.get(
  '/state',
  (request, response) => {

    const category =
      request.query.category

    const relativePath =
      request.query.relativePath


    if (
      typeof category !==
        'string' ||
      typeof relativePath !==
        'string'
    ) {

      response.status(400).json({
        error:
          'category and relativePath are required',
      })

      return

    }


    const state =
      getArchiveState(
        category,
        relativePath
      )


    response.json(
      state
    )

  }
)


router.post(
  '/favorite',
  (request, response) => {

    const identity =
      readIdentity(
        request.body
      )


    if (!identity) {

      response.status(400).json({
        error:
          'category and relativePath are required',
      })

      return

    }


    if (
      typeof request.body.favorite !==
      'boolean'
    ) {

      response.status(400).json({
        error:
          'favorite must be true or false',
      })

      return

    }


    const state =
      setFavorite(
        identity.category,
        identity.relativePath,
        request.body.favorite
      )


    response.json(
      state
    )

  }
)


router.post(
  '/rating',
  (request, response) => {

    const identity =
      readIdentity(
        request.body
      )


    if (!identity) {

      response.status(400).json({
        error:
          'category and relativePath are required',
      })

      return

    }


    const rawRating =
      request.body.rating


    let rating:
      number | null


    if (
      rawRating === null
    ) {

      rating = null

    } else {

      rating =
        Number(
          rawRating
        )


      const isHalfStar =
        Number.isInteger(
          rating * 2
        )


      if (
        !Number.isFinite(
          rating
        ) ||
        rating < 0.5 ||
        rating > 5 ||
        !isHalfStar
      ) {

        response.status(400).json({
          error:
            'rating must be null or a half-star value from 0.5 to 5',
        })

        return

      }

    }


    const state =
      setRating(
        identity.category,
        identity.relativePath,
        rating
      )


    response.json(
      state
    )

  }
)


router.post(
  '/restart',
  (request, response) => {

    const identity =
      readIdentity(
        request.body
      )


    if (!identity) {

      response.status(400).json({
        error:
          'category and relativePath are required',
      })

      return

    }


    const state =
      resetCompletion(
        identity.category,
        identity.relativePath
      )


    response.json(
      state
    )

  }
)


router.post(
  '/progress',
  (request, response) => {

    const identity =
      readIdentity(
        request.body
      )


    if (!identity) {

      response.status(400).json({
        error:
          'category and relativePath are required',
      })

      return

    }


    const progressSeconds =
      Number(
        request.body.progressSeconds
      )


    const durationValue =
      request.body.durationSeconds


    const durationSeconds =
      durationValue === null
        ? null
        : Number(
            durationValue
          )


    const watchedSeconds =
      Number(
        request.body.watchedSeconds ??
        0
      )


    if (
      !Number.isFinite(
        progressSeconds
      ) ||
      progressSeconds < 0
    ) {

      response.status(400).json({
        error:
          'progressSeconds is invalid',
      })

      return

    }


    const state =
      saveProgress(
        identity.category,
        identity.relativePath,
        progressSeconds,
        durationSeconds,
        watchedSeconds
      )


    response.json(
      state
    )

  }
)


export default router