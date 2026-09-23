import {
  Router,
} from 'express'

import {
  createSmartPlaylist,
  deleteSmartPlaylist,
  getSmartPlaylist,
  listSmartPlaylists,
  updateSmartPlaylist,
} from '../state/smartPlaylists'


export const smartPlaylistRoutes =
  Router()


smartPlaylistRoutes.get(
  '/',
  (
    _request,
    response
  ) => {
    response.json({
      items:
        listSmartPlaylists(),
    })
  }
)


smartPlaylistRoutes.get(
  '/:id',
  (
    request,
    response
  ) => {
    const id =
      Number(
        request.params.id
      )

    if (!Number.isInteger(id)) {
      response
        .status(400)
        .json({
          error:
            'Invalid smart playlist ID.',
        })
      return
    }

    const item =
      getSmartPlaylist(id)

    if (!item) {
      response
        .status(404)
        .json({
          error:
            'Smart playlist was not found.',
        })
      return
    }

    response.json(item)
  }
)


smartPlaylistRoutes.post(
  '/',
  (
    request,
    response
  ) => {
    try {
      const name =
        typeof request.body?.name ===
          'string'
          ? request.body.name
          : ''

      const item =
        createSmartPlaylist(
          name,
          request.body?.rules
        )

      response
        .status(201)
        .json(item)
    } catch (error) {
      response
        .status(400)
        .json({
          error:
            error instanceof Error
              ? error.message
              : 'Unable to create smart playlist.',
        })
    }
  }
)


smartPlaylistRoutes.put(
  '/:id',
  (
    request,
    response
  ) => {
    try {
      const id =
        Number(
          request.params.id
        )

      if (!Number.isInteger(id)) {
        throw new Error(
          'Invalid smart playlist ID.'
        )
      }

      const name =
        typeof request.body?.name ===
          'string'
          ? request.body.name
          : ''

      const item =
        updateSmartPlaylist(
          id,
          name,
          request.body?.rules
        )

      if (!item) {
        response
          .status(404)
          .json({
            error:
              'Smart playlist was not found.',
          })
        return
      }

      response.json(item)
    } catch (error) {
      response
        .status(400)
        .json({
          error:
            error instanceof Error
              ? error.message
              : 'Unable to update smart playlist.',
        })
    }
  }
)


smartPlaylistRoutes.delete(
  '/:id',
  (
    request,
    response
  ) => {
    const id =
      Number(
        request.params.id
      )

    if (!Number.isInteger(id)) {
      response
        .status(400)
        .json({
          error:
            'Invalid smart playlist ID.',
        })
      return
    }

    response.json({
      deleted:
        deleteSmartPlaylist(id),
    })
  }
)


export default smartPlaylistRoutes
