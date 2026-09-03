import {
  Router,
} from 'express'

import {
  getArchiveState,
  getArchiveStats,
  listArchiveStates,
  mergeOfflinePlaybackEvents,
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


router.post(
  '/offline-sync',
  (
    request,
    response
  ) => {

    const rawEvents =
      Array.isArray(
        request.body?.events
      )
        ? request.body.events
        : null


    if (
      !rawEvents
    ) {

      response.status(400).json({
        error:
          'events must be an array',
      })


      return
    }


    if (
      rawEvents.length >
      500
    ) {

      response.status(400).json({
        error:
          'A maximum of 500 offline playback events can be synced at once.',
      })


      return
    }


    const events =
      []


    for (
      const raw
      of rawEvents
    ) {

      const identity =
        readIdentity(
          raw
        )


      if (
        !identity ||
        typeof raw.eventId !==
          'string' ||
        !raw.eventId.trim() ||
        typeof raw.occurredAt !==
          'string' ||
        !Number.isFinite(
          Date.parse(
            raw.occurredAt
          )
        )
      ) {

        response.status(400).json({
          error:
            'Every offline event requires eventId, category, relativePath, and occurredAt.',
        })


        return
      }


      const progressSeconds =
        Number(
          raw.progressSeconds
        )


      const durationSeconds =
        raw.durationSeconds ===
          null
          ? null
          : Number(
              raw.durationSeconds
            )


      const watchedSecondsDelta =
        Number(
          raw.watchedSecondsDelta ??
          0
        )


      const playCountDelta =
        Number(
          raw.playCountDelta ??
          0
        )


      if (
        !Number.isFinite(
          progressSeconds
        ) ||
        progressSeconds <
          0 ||
        (
          durationSeconds !==
            null &&
          (
            !Number.isFinite(
              durationSeconds
            ) ||
            durationSeconds <
              0
          )
        ) ||
        !Number.isFinite(
          watchedSecondsDelta
        ) ||
        watchedSecondsDelta <
          0 ||
        !Number.isFinite(
          playCountDelta
        ) ||
        playCountDelta <
          0 ||
        !Number.isInteger(
          playCountDelta
        ) ||
        typeof raw.completed !==
          'boolean'
      ) {

        response.status(400).json({
          error:
            'Offline playback event values are invalid.',
        })


        return
      }


      events.push({
        eventId:
          raw.eventId.trim(),

        category:
          identity.category,

        relativePath:
          identity.relativePath,

        occurredAt:
          raw.occurredAt,

        progressSeconds,

        durationSeconds,

        watchedSecondsDelta,

        playCountDelta,

        completed:
          raw.completed,
      })

    }


    const result =
      mergeOfflinePlaybackEvents(
        events
      )


    response.json(
      result
    )

  }
)


export default router