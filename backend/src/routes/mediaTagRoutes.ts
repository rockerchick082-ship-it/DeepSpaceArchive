import {
  Router,
} from 'express'

import {
  bulkUpdateMediaTags,
  deleteMediaTag,
  getMediaTags,
  listMediaTagAssignments,
  listMediaTagSummaries,
  renameMediaTag,
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


mediaTagRoutes.post(
  '/bulk',
  (
    request,
    response
  ) => {

    try {

      const items =
        Array.isArray(
          request.body?.items
        )
          ? request.body.items.filter(
              (
                item: unknown
              ): item is {
                category: string
                relativePath: string
              } =>
                Boolean(
                  item &&
                  typeof item === 'object' &&
                  typeof (
                    item as {
                      category?: unknown
                    }
                  ).category === 'string' &&
                  typeof (
                    item as {
                      relativePath?: unknown
                    }
                  ).relativePath === 'string'
                )
            )
          : []

      const addTags =
        Array.isArray(
          request.body?.addTags
        )
          ? request.body.addTags.filter(
              (
                tag: unknown
              ): tag is string =>
                typeof tag === 'string'
            )
          : []

      const removeTags =
        Array.isArray(
          request.body?.removeTags
        )
          ? request.body.removeTags.filter(
              (
                tag: unknown
              ): tag is string =>
                typeof tag === 'string'
            )
          : []


      if (
        items.length === 0 ||
        (
          addTags.length === 0 &&
          removeTags.length === 0
        )
      ) {

        response
          .status(400)
          .json({
            error:
              'At least one media item and one tag change are required.',
          })

        return

      }


      const updated =
        bulkUpdateMediaTags(
          items,
          addTags,
          removeTags
        )


      response.json({
        updated,
        tags:
          listMediaTagSummaries(),
        assignments:
          listMediaTagAssignments(),
      })

    } catch (error) {

      console.error(
        'Unable to bulk update media tags:',
        error
      )

      response
        .status(500)
        .json({
          error:
            error instanceof Error
              ? error.message
              : 'Unable to bulk update media tags.',
        })

    }

  }
)


mediaTagRoutes.put(
  '/tag',
  (
    request,
    response
  ) => {

    try {

      const currentName =
        typeof request.body?.currentName === 'string'
          ? request.body.currentName
          : ''

      const newName =
        typeof request.body?.newName === 'string'
          ? request.body.newName
          : ''


      const result =
        renameMediaTag(
          currentName,
          newName
        )


      response.json({
        ...result,
        tags:
          listMediaTagSummaries(),
        assignments:
          listMediaTagAssignments(),
      })

    } catch (error) {

      response
        .status(400)
        .json({
          error:
            error instanceof Error
              ? error.message
              : 'Unable to rename tag.',
        })

    }

  }
)


mediaTagRoutes.delete(
  '/tag',
  (
    request,
    response
  ) => {

    try {

      const name =
        typeof request.query.name === 'string'
          ? request.query.name
          : ''


      if (!name.trim()) {

        response
          .status(400)
          .json({
            error:
              'Tag name is required.',
          })

        return

      }


      const deleted =
        deleteMediaTag(
          name
        )


      response.json({
        deleted,
        tags:
          listMediaTagSummaries(),
        assignments:
          listMediaTagAssignments(),
      })

    } catch (error) {

      response
        .status(500)
        .json({
          error:
            error instanceof Error
              ? error.message
              : 'Unable to delete tag.',
        })

    }

  }
)


export default mediaTagRoutes
