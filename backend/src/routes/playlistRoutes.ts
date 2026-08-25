import {
  Router,
} from 'express'

import {
  addPlaylistItem,
  createPlaylist,
  deletePlaylist,
  getPlaylistItems,
  listPlaylists,
  removePlaylistItem,
  reorderPlaylistItems,
} from '../state/playlists'


const router =
  Router()


router.get(
  '/',
  (_request, response) => {

    response.json({
      items:
        listPlaylists(),
    })

  }
)


router.post(
  '/',
  (request, response) => {

    const name =
      request.body.name


    if (
      typeof name !==
        'string' ||
      !name.trim()
    ) {

      response.status(400).json({
        error:
          'Playlist name is required',
      })

      return

    }


    const id =
      createPlaylist(
        name.trim()
      )


    response.json({
      success:
        true,

      id,
    })

  }
)


router.delete(
  '/:playlistId',
  (request, response) => {

    const playlistId =
      Number(
        request.params.playlistId
      )


    if (
      !Number.isInteger(
        playlistId
      )
    ) {

      response.status(400).json({
        error:
          'Invalid playlist ID',
      })

      return

    }


    deletePlaylist(
      playlistId
    )


    response.json({
      success:
        true,
    })

  }
)


router.get(
  '/:playlistId/items',
  (request, response) => {

    const playlistId =
      Number(
        request.params.playlistId
      )


    if (
      !Number.isInteger(
        playlistId
      )
    ) {

      response.status(400).json({
        error:
          'Invalid playlist ID',
      })

      return

    }


    response.json({
      items:
        getPlaylistItems(
          playlistId
        ),
    })

  }
)


router.post(
  '/:playlistId/items',
  (request, response) => {

    const playlistId =
      Number(
        request.params.playlistId
      )


    const category =
      request.body.category


    const relativePath =
      request.body.relativePath


    if (
      !Number.isInteger(
        playlistId
      ) ||
      typeof category !==
        'string' ||
      typeof relativePath !==
        'string'
    ) {

      response.status(400).json({
        error:
          'Invalid playlist item',
      })

      return

    }


    const items =
      addPlaylistItem(
        playlistId,
        category,
        relativePath
      )


    response.json({
      items,
    })

  }
)


router.put(
  '/:playlistId/items/reorder',
  (request, response) => {

    const playlistId =
      Number(
        request.params.playlistId
      )


    const itemIds =
      request.body.itemIds


    if (
      !Number.isInteger(
        playlistId
      ) ||
      !Array.isArray(
        itemIds
      ) ||
      itemIds.some(
        (itemId) =>
          !Number.isInteger(
            itemId
          )
      )
    ) {

      response.status(400).json({
        error:
          'Invalid playlist order',
      })


      return

    }


    try {

      response.json({
        items:
          reorderPlaylistItems(
            playlistId,
            itemIds
          ),
      })

    } catch (error) {

      response.status(400).json({
        error:
          error instanceof
            Error
            ? error.message
            : 'Unable to reorder playlist items.',
      })

    }

  }
)


router.delete(
  '/:playlistId/items/:itemId',
  (request, response) => {

    const playlistId =
      Number(
        request.params.playlistId
      )


    const itemId =
      Number(
        request.params.itemId
      )


    if (
      !Number.isInteger(
        playlistId
      ) ||
      !Number.isInteger(
        itemId
      )
    ) {

      response.status(400).json({
        error:
          'Invalid playlist item',
      })

      return

    }


    response.json({
      items:
        removePlaylistItem(
          playlistId,
          itemId
        ),
    })

  }
)


export default router