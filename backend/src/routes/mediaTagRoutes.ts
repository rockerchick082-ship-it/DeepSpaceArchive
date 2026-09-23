import {
  Router,
} from 'express'

import {
  getMediaTags,
  listMediaTagAssignments,
  listMediaTagSummaries,
  setMediaTags,
} from '../state/mediaTags'


export const mediaTagRoutes =
  Router()


mediaTagRoutes.get(
  '/',
  (
    request,
    response
  ) => {

    try {

      const category =
        typeof request.query.category ===
          'string'
          ? request.query.category
          : null

      const relativePath =
        typeof request.query.relativePath ===
          'string'
          ? request.query.relativePath
          : null


      if (
        category &&
        relativePath
      ) {

        response.json({
          category,
          relativePath,
          tags:
            getMediaTags(
              category,
              relativePath
            ),
        })

        return

      }


      response.json({
        tags:
          listMediaTagSummaries(),

        assignments:
          listMediaTagAssignments(),
      })

    } catch (error) {

      console.error(
        'Unable to load media tags:',
        error
      )


      response
        .status(500)
        .json({
          error:
            'Unable to load media tags.',
        })

    }

  }
)


mediaTagRoutes.put(
  '/item',
  (
    request,
    response
  ) => {

    try {

      const category =
        typeof request.body?.category ===
          'string'
          ? request.body.category
          : ''

      const relativePath =
        typeof request.body?.relativePath ===
          'string'
          ? request.body.relativePath
          : ''

      const tags =
        Array.isArray(
          request.body?.tags
        )
          ? request.body.tags.filter(
              (
                value: unknown
              ): value is string =>
                typeof value ===
                  'string'
            )
          : null


      if (
        !category.trim() ||
        !relativePath.trim() ||
        tags === null
      ) {

        response
          .status(400)
          .json({
            error:
              'category, relativePath, and tags are required.',
          })

        return

      }


      const assignment =
        setMediaTags(
          category,
          relativePath,
          tags
        )


      response.json({
        ...assignment,
        tagSummaries:
          listMediaTagSummaries(),
      })

    } catch (error) {

      console.error(
        'Unable to save media tags:',
        error
      )


      response
        .status(500)
        .json({
          error:
            'Unable to save media tags.',
        })

    }

  }
)


export default mediaTagRoutes
