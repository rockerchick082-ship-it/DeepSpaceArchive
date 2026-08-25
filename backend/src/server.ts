import express from 'express'
import type {
  Router as ExpressRouter,
} from 'express'

import cors from 'cors'
import dotenv from 'dotenv'

import {
  scanCategory,
} from './scanner/libraryScanner'

import path from 'node:path'

import {
  thumbnailCacheDirectory,
} from './config/appPaths'

import {
  ensureThumbnail,
  getThumbnailFileName,
} from './media/thumbnailGenerator'

import fs from 'node:fs/promises'
import type {
  Dirent,
} from 'node:fs'

import multer from 'multer'

import {
  readArchiveMetadata,
  writeArchiveMetadata,
} from './metadata/memoryMetadata'

import {
  getVideoInfo,
} from './media/mediaInfo'

import {
  scanMainStory,
} from './scanner/mainStoryScanner'

import * as archiveStateRouteModule from './routes/archiveStateRoutes'
import * as playlistRouteModule from './routes/playlistRoutes'
import * as backupRouteModule from './routes/backupRoutes'
import * as libraryHealthRouteModule from './routes/libraryHealthRoutes'
import * as thumbnailMaintenanceRouteModule from './routes/thumbnailMaintenanceRoutes'
import * as databaseMaintenanceRouteModule from './routes/databaseMaintenanceRoutes'
import * as systemInfoRouteModule from './routes/systemInfoRoutes'
import * as catalogRouteModule from './routes/catalogRoutes'
import * as galleryRouteModule from './routes/GalleryRoutes'
import * as galleryWikiRouteModule from './routes/galleryWikiRoutes'

import * as pathSettingsRouteModule from './routes/pathSettingsRoutes'
import * as setupRouteModule from './routes/setupRoutes'

import {
  initializePathSettings,
} from './services/pathSettings'


dotenv.config()


const app =
  express()


const upload =
  multer({

    storage:
      multer.memoryStorage(),

    limits: {

      fileSize:
        15 * 1024 * 1024,

    },

  })


const PORT =
  3001


const homeCharacters =
  new Set([
    'Xavier',
    'Zayne',
    'Rafayel',
    'Sylus',
    'Caleb',
  ])


const homeVideoExtensions =
  new Set([
    '.mp4',
    '.webm',
    '.mov',
    '.m4v',
  ])


const homeImageExtensions =
  new Set([
    '.jpg',
    '.jpeg',
    '.png',
    '.webp',
    '.gif',
    '.avif',
  ])


function getHomeMediaType(
  fileName: string
):
  | 'video'
  | 'image'
  | null {

  const extension =
    path
      .extname(
        fileName
      )
      .toLowerCase()


  if (
    homeVideoExtensions.has(
      extension
    )
  ) {

    return 'video'

  }


  if (
    homeImageExtensions.has(
      extension
    )
  ) {

    return 'image'

  }


  return null

}


function isMissingPathError(
  error: unknown
) {

  return (
    typeof error ===
      'object' &&
    error !==
      null &&
    'code' in error &&
    (
      error as
        {
          code?: unknown
        }
    ).code ===
      'ENOENT'
  )

}



function resolveRouter(
  moduleValue: Record<string, unknown>,
  preferredExportName: string
): ExpressRouter {

  const candidates = [
    moduleValue[
      preferredExportName
    ],
    moduleValue.default,
    moduleValue.router,
  ]


  for (
    const candidate
    of candidates
  ) {

    if (
      typeof candidate ===
      'function'
    ) {

      return candidate as
        ExpressRouter

    }

  }


  throw new TypeError(
    `Unable to load Express router "${preferredExportName}". ` +
    `Available exports: ${Object.keys(moduleValue).join(', ') || '(none)'}`
  )

}


const archiveStateRoutes =
  resolveRouter(
    archiveStateRouteModule,
    'archiveStateRoutes'
  )


const playlistRoutes =
  resolveRouter(
    playlistRouteModule,
    'playlistRoutes'
  )


const backupRoutes =
  resolveRouter(
    backupRouteModule,
    'backupRoutes'
  )


const libraryHealthRoutes =
  resolveRouter(
    libraryHealthRouteModule,
    'libraryHealthRoutes'
  )


const thumbnailMaintenanceRoutes =
  resolveRouter(
    thumbnailMaintenanceRouteModule,
    'thumbnailMaintenanceRoutes'
  )


const databaseMaintenanceRoutes =
  resolveRouter(
    databaseMaintenanceRouteModule,
    'databaseMaintenanceRoutes'
  )


const systemInfoRoutes =
  resolveRouter(
    systemInfoRouteModule,
    'systemInfoRoutes'
  )



const catalogRoutes =
  resolveRouter(
    catalogRouteModule,
    'catalogRoutes'
  )


const galleryRoutes =
  resolveRouter(
    galleryRouteModule,
    'galleryRoutes'
  )


const galleryWikiRoutes =
  resolveRouter(
    galleryWikiRouteModule,
    'galleryWikiRoutes'
  )


const pathSettingsRoutes =
  resolveRouter(
    pathSettingsRouteModule,
    'pathSettingsRoutes'
  )


const setupRoutes =
  resolveRouter(
    setupRouteModule,
    'setupRoutes'
  )


/*
 * ========================================
 * GLOBAL MIDDLEWARE
 * ========================================
 */
app.use(
  cors()
)

app.use(
  express.json()
)


/*
 * ========================================
 * ROUTERS
 * ========================================
 */
app.use(
  '/api/archive',
  archiveStateRoutes
)


app.use(
  '/api/playlists',
  playlistRoutes
)


app.use(
  '/api/backup',
  backupRoutes
)


app.use(
  '/api/library-health',
  libraryHealthRoutes
)


app.use(
  '/api/system-info',
  systemInfoRoutes
)


app.use(
  '/api/database-maintenance',
  databaseMaintenanceRoutes
)


app.use(
  '/api/thumbnail-maintenance',
  thumbnailMaintenanceRoutes
)



app.use(
  '/api/catalog',
  catalogRoutes
)


app.use(
  '/api/gallery',
  galleryRoutes
)


app.use(
  '/api/gallery-wiki',
  galleryWikiRoutes
)


app.use(
  '/api/path-settings',
  pathSettingsRoutes
)


app.use(
  '/api/setup',
  setupRoutes
)


/*
 * Generated thumbnail files are served
 * separately from the thumbnail API.
 */
app.use(
  '/api/thumbnails',
  express.static(
    thumbnailCacheDirectory
  )
)


app.get(
  '/api/health',
  (_request, response) => {

    response.json({
      status: 'ok',
      message:
        'DeepSpace Archive backend is running',
    })

  }
)


/*
 * ========================================
 * HOME MEDIA
 * ========================================
 *
 * Home media lives inside the configured
 * archive rather than frontend/public:
 *
 *   <library>/home/Xavier/
 *   <library>/home/Zayne/
 *   <library>/home/Rafayel/
 *   <library>/home/Sylus/
 *   <library>/home/Caleb/
 *
 * The list is read on demand, so adding or
 * removing supported files does not require
 * a frontend rebuild.
 */
app.get(
  '/api/library/home',
  async (
    request,
    response
  ) => {

    try {

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


      const character =
        request.query.character


      if (
        typeof character !==
          'string' ||
        !homeCharacters.has(
          character
        )
      ) {

        response
          .status(400)
          .json({
            error:
              'A valid Home character is required',
          })

        return

      }


      const characterDirectory =
        path.resolve(
          libraryPath,
          'home',
          character
        )


      if (
        !isInsideLibrary(
          characterDirectory,
          libraryPath
        )
      ) {

        response
          .status(403)
          .json({
            error:
              'Home media folder is outside the library',
          })

        return

      }


      let entries:
        Dirent[]


      try {

        entries =
          await fs.readdir(
            characterDirectory,
            {
              withFileTypes:
                true,
            }
          )

      } catch (error) {

        if (
          isMissingPathError(
            error
          )
        ) {

          response.json({
            character,
            count:
              0,
            items:
              [],
          })

          return

        }


        throw error

      }


      const items =
        entries
          .filter(
            (entry) =>
              entry.isFile()
          )
          .flatMap(
            (entry) => {

              const mediaType =
                getHomeMediaType(
                  entry.name
                )


              if (
                !mediaType
              ) {

                return []

              }


              const absolutePath =
                path.join(
                  characterDirectory,
                  entry.name
                )


              const relativePath =
                path
                  .relative(
                    libraryPath,
                    absolutePath
                  )
                  .split(
                    path.sep
                  )
                  .join('/')


              return [
                {
                  fileName:
                    entry.name,

                  relativePath,

                  mediaType,
                },
              ]

            }
          )
          .sort(
            (
              left,
              right
            ) =>
              left.fileName
                .localeCompare(
                  right.fileName,
                  undefined,
                  {
                    numeric:
                      true,

                    sensitivity:
                      'base',
                  }
                )
          )


      response.json({
        character,

        count:
          items.length,

        items,
      })

    } catch (error) {

      console.error(
        'Unable to scan Home media:',
        error
      )


      response
        .status(500)
        .json({
          error:
            'Unable to scan Home media',
        })

    }

  }
)


app.get(
  '/api/library/main-story',
  async (
    _request,
    response
  ) => {

    try {

      const libraryPath =
        process.env.MEDIA_LIBRARY_PATH


      if (!libraryPath) {

        response
          .status(500)
          .json({
            error:
              'MEDIA_LIBRARY_PATH is not configured',
          })

        return

      }


      const branches =
        await scanMainStory(
          libraryPath
        )


      response.json({

        branchCount:
          branches.length,

        chapterCount:
          branches.reduce(
            (
              total,
              branch
            ) =>
              total +
              branch.chapterCount,
            0
          ),

        partCount:
          branches.reduce(
            (
              total,
              branch
            ) =>
              total +
              branch.partCount,
            0
          ),

        branches,

      })

    } catch (error) {

      console.error(
        'Unable to scan Main Story:',
        error
      )


      response
        .status(500)
        .json({
          error:
            'Unable to scan Main Story library',
        })

    }

  }
) 
app.get(
  '/api/library/main-story/chapter',
  async (
    request,
    response
  ) => {

    try {

      const libraryPath =
        process.env.MEDIA_LIBRARY_PATH


      if (!libraryPath) {

        response
          .status(500)
          .json({
            error:
              'MEDIA_LIBRARY_PATH is not configured',
          })

        return

      }


      const branchId =
        request.query.branch


      const chapterId =
        request.query.chapter


      if (
        typeof branchId !==
          'string' ||
        typeof chapterId !==
          'string'
      ) {

        response
          .status(400)
          .json({
            error:
              'branch and chapter are required',
          })

        return

      }


      const branches =
        await scanMainStory(
          libraryPath
        )


      const branch =
        branches.find(
          (candidate) =>
            candidate.id ===
            branchId
        )


      if (!branch) {

        response
          .status(404)
          .json({
            error:
              'Main Story branch was not found',
          })

        return

      }


      const chapter =
        branch.chapters.find(
          (candidate) =>
            candidate.id ===
            chapterId
        )


      if (!chapter) {

        response
          .status(404)
          .json({
            error:
              'Main Story chapter was not found',
          })

        return

      }


      /*
       * =====================================
       * ADAPT STORY PARTS TO ARCHIVE ITEMS
       * =====================================
       *
       * Main Story scanner paths are
       * relative to:
       *
       *   Main Story/
       *
       * The normal media/player API expects
       * paths relative to MEDIA_LIBRARY_PATH.
       *
       * Therefore:
       *
       * Under Deepspace/01. To Begin/video.mp4
       *
       * becomes:
       *
       * Main Story/Under Deepspace/
       * 01. To Begin/video.mp4
       */

      const items =
        chapter.parts.map(
          (part) => {

            const relativePath =
              path
                .join(
                  'Main Story',
                  part.relativePath
                )
                .split(
                  path.sep
                )
                .join('/')


            return {

              title:
                part.title,

              /*
               * VideoArchivePlayer currently
               * groups Previous/Next by
               * "character".
               *
               * For Main Story the chapter is
               * the sequence group instead.
               */

              character:
                chapter.title,

              category:
                'Main Story',

              fileName:
                part.fileName,

              filePath:
                part.filePath,

              relativePath,

              mediaType:
                'video',

              sortOrder:
                part.order,

              releaseDate:
                part.releaseDate,

              thumbnailPath:
                part.thumbnailPath,

            }

          }
        )


      response.json({

        count:
          items.length,

        items,

        storyContext: {

          branchId:
            branch.id,

          branchTitle:
            branch.title,

          branchOrder:
            branch.order,

          chapterId:
            chapter.id,

          chapterTitle:
            chapter.title,

          chapterOrder:
            chapter.order,

          partCount:
            chapter.partCount,

        },

      })

    } catch (error) {

      console.error(
        'Unable to load Main Story chapter adapter:',
        error
      )


      response
        .status(500)
        .json({
          error:
            'Unable to load Main Story chapter',
        })

    }

  }
)

app.get(
  '/api/library/main-story/sequence',
  async (
    _request,
    response
  ) => {

    try {

      const libraryPath =
        process.env.MEDIA_LIBRARY_PATH


      if (!libraryPath) {

        response
          .status(500)
          .json({
            error:
              'MEDIA_LIBRARY_PATH is not configured',
          })

        return

      }


      const branches =
        await scanMainStory(
          libraryPath
        )


      const items =
        branches.flatMap(
          (branch) =>
            branch.chapters.flatMap(
              (chapter) =>
                chapter.parts.map(
                  (part) => {

                    const relativePath =
                      path
                        .join(
                          'Main Story',
                          part.relativePath
                        )
                        .split(
                          path.sep
                        )
                        .join('/')


                    return {

                      title:
                        part.title,

                      /*
                       * For Main Story this
                       * field becomes display
                       * context rather than a
                       * love interest.
                       */

                      character:
                        `${branch.title} · ${chapter.title}`,

                      category:
                        'Main Story',

                      fileName:
                        part.fileName,

                      filePath:
                        part.filePath,

                      relativePath,

                      mediaType:
                        'video',

                      sortOrder:
                        part.order,

                      releaseDate:
                        part.releaseDate,

                      thumbnailPath:
                        part.thumbnailPath,

                    }

                  }
                )
            )
        )


      response.json({

        count:
          items.length,

        items,

      })

    } catch (error) {

      console.error(
        'Unable to create Main Story sequence:',
        error
      )


      response
        .status(500)
        .json({
          error:
            'Unable to load Main Story sequence',
        })

    }

  }
)

app.get(
  '/api/library/memoria',
  async (_request, response) => {

    try {

      const libraryPath =
        process.env.MEDIA_LIBRARY_PATH

      if (!libraryPath) {

        response.status(500).json({
          error:
            'MEDIA_LIBRARY_PATH is not configured',
        })

        return
      }

      const memories =
        await scanCategory(
          libraryPath,
          'Memoria'
        )

      response.json({
        count: memories.length,
        items: memories,
      })

    } catch (error) {

      console.error(error)

      response.status(500).json({
        error:
          'Unable to scan Memoria library',
      })

    }

  }
)
app.get(
  '/api/library/phone-calls',
  async (
    _request,
    response
  ) => {

    try {

      const libraryPath =
        process.env.MEDIA_LIBRARY_PATH


      if (!libraryPath) {

        response
          .status(500)
          .json({
            error:
              'MEDIA_LIBRARY_PATH is not configured',
          })

        return

      }


      const items =
        await scanCategory(
          libraryPath,
          'Phone Call'
        )


      response.json({

        count:
          items.length,

        items,

      })

    } catch (error) {

      console.error(
        'Unable to scan Phone Calls:',
        error
      )


      response
        .status(500)
        .json({
          error:
            'Unable to scan Phone Calls library',
        })

    }

  }
)


app.get(
  '/api/library/phone-videos',
  async (
    _request,
    response
  ) => {

    try {

      const libraryPath =
        process.env.MEDIA_LIBRARY_PATH


      if (!libraryPath) {

        response
          .status(500)
          .json({
            error:
              'MEDIA_LIBRARY_PATH is not configured',
          })

        return

      }


      const items =
        await scanCategory(
          libraryPath,
          'Phone Video'
        )


      response.json({

        count:
          items.length,

        items,

      })

    } catch (error) {

      console.error(
        'Unable to scan Phone Videos:',
        error
      )


      response
        .status(500)
        .json({
          error:
            'Unable to scan Phone Videos library',
        })

    }

  }
)

app.get(
  '/api/library/illusio',
  async (
    _request,
    response
  ) => {

    try {

      const libraryPath =
        process.env.MEDIA_LIBRARY_PATH


      if (!libraryPath) {

        response
          .status(500)
          .json({
            error:
              'MEDIA_LIBRARY_PATH is not configured',
          })

        return

      }


      const items =
        await scanCategory(
          libraryPath,
          'Illusio Kindle'
        )


      response.json({

        count:
          items.length,

        items,

      })

    } catch (error) {

      console.error(
        'Unable to scan Illusio:',
        error
      )


      response
        .status(500)
        .json({
          error:
            'Unable to scan Illusio library',
        })

    }

  }
)

app.get(
  '/api/thumbnail',
  async (request, response) => {

    try {

      const filePath =
        request.query.filePath

      if (
        typeof filePath !== 'string'
      ) {

        response.status(400).json({
          error:
            'filePath is required',
        })

        return

      }


      const libraryPath =
        process.env.MEDIA_LIBRARY_PATH

      if (!libraryPath) {

        response.status(500).json({
          error:
            'MEDIA_LIBRARY_PATH is not configured',
        })

        return

      }


      const resolvedLibrary =
        path.resolve(libraryPath)

      const resolvedFile =
        path.resolve(filePath)


      const relativePath =
        path.relative(
          resolvedLibrary,
          resolvedFile
        )


      if (
        relativePath.startsWith('..') ||
        path.isAbsolute(relativePath)
      ) {

        response.status(403).json({
          error:
            'File is outside the media library',
        })

        return

      }


      await ensureThumbnail(
        resolvedFile
      )


      const fileName =
        getThumbnailFileName(
          resolvedFile
        )


      response.json({
        thumbnailUrl:
          `/api/thumbnails/${fileName}`,
      })

    } catch (error) {

      console.error(
        'Thumbnail generation failed:',
        error
      )

      response.status(500).json({
        error:
          'Unable to generate thumbnail',
      })

    }

  }
)

app.post(
  '/api/library/metadata',

  upload.single(
    'thumbnail'
  ),

  async (
    request,
    response
  ) => {

    try {

      const libraryPath =
        process.env.MEDIA_LIBRARY_PATH

      if (!libraryPath) {

        response
          .status(500)
          .json({
            error:
              'MEDIA_LIBRARY_PATH is not configured',
          })

        return

      }


      const mediaFilePath =
        request.body.mediaFilePath


      if (
        typeof mediaFilePath !== 'string'
      ) {

        response
          .status(400)
          .json({
            error:
              'mediaFilePath is required',
          })

        return

      }


      if (
        !isInsideLibrary(
          mediaFilePath,
          libraryPath
        )
      ) {

        response
          .status(403)
          .json({
            error:
              'Media file is outside the library',
          })

        return

      }


      const existingMetadata =
        await readArchiveMetadata(
          mediaFilePath
        )


      const displayTitle =
        request.body.displayTitle
          ?.trim()


      const releaseDate =
        request.body.releaseDate
          ?.trim()


      const sortOrderText =
        request.body.sortOrder
          ?.trim()


      const metadata = {
        ...existingMetadata,

        displayTitle:
          displayTitle ||
          undefined,

        releaseDate:
          releaseDate ||
          undefined,

        sortOrder:
          sortOrderText
            ? Number(
                sortOrderText
              )
            : undefined,
      }


      if (request.file) {

        const allowedTypes =
          [
            'image/jpeg',
            'image/png',
            'image/webp',
          ]


        if (
          !allowedTypes.includes(
            request.file.mimetype
          )
        ) {

          response
            .status(400)
            .json({
              error:
                'Thumbnail must be JPG, PNG, or WebP',
            })

          return

        }


        const parsed =
          path.parse(
            mediaFilePath
          )


        let extension =
          '.jpg'


        if (
          request.file.mimetype ===
          'image/png'
        ) {
          extension = '.png'
        }


        if (
          request.file.mimetype ===
          'image/webp'
        ) {
          extension = '.webp'
        }


        const thumbnailName =
          `${parsed.name}.thumbnail${extension}`


        const thumbnailPath =
          path.join(
            parsed.dir,
            thumbnailName
          )


        await fs.writeFile(
          thumbnailPath,
          request.file.buffer
        )


        metadata.thumbnail =
          thumbnailName

      }


      await writeArchiveMetadata(
        mediaFilePath,
        metadata
      )


      response.json({
        success: true,
        metadata,
      })

    } catch (error) {

      console.error(
        'Unable to save memory metadata:',
        error
      )


      response
        .status(500)
        .json({
          error:
            'Unable to save memory metadata',
        })

    }

  }
)

app.get(
  '/api/custom-thumbnail',

  async (
    request,
    response
  ) => {

    try {

      const filePath =
        request.query.filePath


      if (
        typeof filePath !== 'string'
      ) {

        response
          .status(400)
          .send(
            'filePath is required'
          )

        return

      }


      const libraryPath =
        process.env.MEDIA_LIBRARY_PATH


      if (!libraryPath) {

        response
          .status(500)
          .send(
            'Library path is not configured'
          )

        return

      }


      if (
        !isInsideLibrary(
          filePath,
          libraryPath
        )
      ) {

        response
          .status(403)
          .send(
            'File is outside the library'
          )

        return

      }


      response.sendFile(
        path.resolve(
          filePath
        )
      )

    } catch (error) {

      console.error(
        'Unable to serve thumbnail:',
        error
      )


      response
        .status(500)
        .send(
          'Unable to serve thumbnail'
        )

    }

  }
)

app.post(
   '/api/library/remove-thumbnail',
  express.json(),
  async (request, response) => {

    try {

      const libraryPath =
        process.env.MEDIA_LIBRARY_PATH

      if (!libraryPath) {

        response.status(500).json({
          error:
            'MEDIA_LIBRARY_PATH is not configured',
        })

        return

      }


      const mediaFilePath =
        request.body.mediaFilePath


      if (
        typeof mediaFilePath !== 'string'
      ) {

        response.status(400).json({
          error:
            'mediaFilePath is required',
        })

        return

      }


      if (
        !isInsideLibrary(
          mediaFilePath,
          libraryPath
        )
      ) {

        response.status(403).json({
          error:
            'Media file is outside the library',
        })

        return

      }


      const metadata =
        await readArchiveMetadata(
          mediaFilePath
        )


      if (metadata.thumbnail) {

        const parsed =
          path.parse(
            mediaFilePath
          )


        const thumbnailPath =
          path.join(
            parsed.dir,
            metadata.thumbnail
          )


        try {

          await fs.unlink(
            thumbnailPath
          )

        } catch {

          // If the file is already gone,
          // we can still clean the metadata.

        }

      }


      delete metadata.thumbnail


      await writeArchiveMetadata(
        mediaFilePath,
        metadata
      )


      response.json({
        success: true,
        metadata,
      })

    } catch (error) {

      console.error(
        'Unable to remove thumbnail:',
        error
      )


      response.status(500).json({
        error:
          'Unable to remove custom thumbnail',
      })

    }

  }
)

app.get(
  '/api/media',
  async (request, response) => {

    try {

      const relativePath =
        request.query.relativePath


      if (
        typeof relativePath !== 'string'
      ) {

        response.status(400).json({
          error:
            'relativePath is required',
        })

        return
      }


      const libraryPath =
        process.env.MEDIA_LIBRARY_PATH


      if (!libraryPath) {

        response.status(500).json({
          error:
            'MEDIA_LIBRARY_PATH is not configured',
        })

        return
      }


      const fullPath =
        path.resolve(
          libraryPath,
          relativePath
        )


      if (
        !isInsideLibrary(
          fullPath,
          libraryPath
        )
      ) {

        response.status(403).json({
          error:
            'Requested file is outside the library',
        })

        return
      }


      response.sendFile(
        fullPath,
        {
          acceptRanges: true,
        },
        (error) => {

          if (error) {

            console.error(
              'Unable to stream media:',
              error
            )

          }

        }
      )

    } catch (error) {

      console.error(
        'Media streaming failed:',
        error
      )


      response.status(500).json({
        error:
          'Unable to stream media',
      })

    }

  }
)

app.get(
  '/api/media-info',
  async (request, response) => {

    try {

      const relativePath =
        request.query.relativePath


      if (
        typeof relativePath !== 'string'
      ) {

        response.status(400).json({
          error:
            'relativePath is required',
        })

        return

      }


      const libraryPath =
        process.env.MEDIA_LIBRARY_PATH


      if (!libraryPath) {

        response.status(500).json({
          error:
            'MEDIA_LIBRARY_PATH is not configured',
        })

        return

      }


      const fullPath =
        path.resolve(
          libraryPath,
          relativePath
        )


      if (
        !isInsideLibrary(
          fullPath,
          libraryPath
        )
      ) {

        response.status(403).json({
          error:
            'Requested file is outside the library',
        })

        return

      }


      const info =
        await getVideoInfo(
          fullPath
        )


      response.json(
        info
      )

    } catch (error) {

      console.error(
        'Unable to read media info:',
        error
      )


      response.status(500).json({
        error:
          'Unable to read media information',
      })

    }

  }
)
app.get(
  '/api/library/secret-times',
  async (_request, response) => {

    try {

      const libraryPath =
        process.env.MEDIA_LIBRARY_PATH


      if (!libraryPath) {

        response.status(500).json({
          error:
            'MEDIA_LIBRARY_PATH is not configured',
        })

        return

      }


      const items =
        await scanCategory(
          libraryPath,
          'Secret Times'
        )


      response.json({
        count:
          items.length,

        items,
      })

    } catch (error) {

      console.error(
        'Unable to scan Secret Times:',
        error
      )


      response.status(500).json({
        error:
          'Unable to scan Secret Times library',
      })

    }

  }
)

app.get(
  '/api/library/myths',
  async (_request, response) => {

    try {

      const libraryPath =
        process.env.MEDIA_LIBRARY_PATH


      if (!libraryPath) {

        response.status(500).json({
          error:
            'MEDIA_LIBRARY_PATH is not configured',
        })

        return

      }


      const items =
        await scanCategory(
          libraryPath,
          'Myths'
        )


      response.json({
        count:
          items.length,

        items,
      })

    } catch (error) {

      console.error(
        'Unable to scan Myths:',
        error
      )


      response.status(500).json({
        error:
          'Unable to scan Myths library',
      })

    }

  }
)

app.get(
  '/api/library/bond',
  async (_request, response) => {

    try {

      const libraryPath =
        process.env.MEDIA_LIBRARY_PATH


      if (!libraryPath) {

        response.status(500).json({
          error:
            'MEDIA_LIBRARY_PATH is not configured',
        })

        return

      }


      const items =
        await scanCategory(
          libraryPath,
          'Bond'
        )


      response.json({
        count:
          items.length,

        items,
      })

    } catch (error) {

      console.error(
        'Unable to scan Bond:',
        error
      )


      response.status(500).json({
        error:
          'Unable to scan Bond library',
      })

    }

  }
)

app.get(
  '/api/library/tender-moments',
  async (_request, response) => {

    try {

      const libraryPath =
        process.env.MEDIA_LIBRARY_PATH


      if (!libraryPath) {

        response.status(500).json({
          error:
            'MEDIA_LIBRARY_PATH is not configured',
        })

        return

      }


      const items =
        await scanCategory(
          libraryPath,
          'Tender Moments'
        )


      response.json({
        count:
          items.length,

        items,
      })

    } catch (error) {

      console.error(
        'Unable to scan Tender Moments:',
        error
      )


      response.status(500).json({
        error:
          'Unable to scan Tender Moments library',
      })

    }

  }
)


function configuredFrontendDistPath() {

  const configured =
    process.env
      .DEEPSPACE_ARCHIVE_FRONTEND_DIR
      ?.trim()


  if (configured) {

    return path.resolve(
      configured
    )

  }


  return path.resolve(
    process.cwd(),
    '..',
    'frontend',
    'dist'
  )

}


async function configureProductionFrontend() {

  if (
    process.env
      .DEEPSPACE_ARCHIVE_SERVE_FRONTEND !==
        'true'
  ) {

    return

  }


  const frontendDistPath =
    configuredFrontendDistPath()


  const indexPath =
    path.join(
      frontendDistPath,
      'index.html'
    )


  try {

    const indexStat =
      await fs.stat(
        indexPath
      )


    if (
      !indexStat.isFile()
    ) {

      throw new Error(
        'index.html is not a file'
      )

    }

  } catch (error) {

    throw new Error(
      `Unable to serve the production frontend. ` +
      `Expected frontend build at ${frontendDistPath}.`,
      {
        cause:
          error,
      }
    )

  }


  /*
   * Serve the already-built React application from the
   * same Express process as the API.
   *
   * This is used by the packaged Windows application.
   * Development continues to use Vite on localhost:5173.
   * Docker can continue using the separate nginx frontend.
   */
  app.use(
    express.static(
      frontendDistPath,
      {
        index:
          false,

        maxAge:
          '1h',
      }
    )
  )


  /*
   * React Router SPA fallback.
   *
   * API routes are deliberately excluded so a missing API
   * endpoint still returns an API 404 rather than index.html.
   */
  app.get(
    /^(?!\/api(?:\/|$)).*/,
    (_request, response) => {

      response.sendFile(
        indexPath
      )

    }
  )


  console.log(
    `DeepSpace Archive frontend served from ${frontendDistPath}`
  )

}


async function startServer() {

  await initializePathSettings()

  await configureProductionFrontend()


  app.listen(
    PORT,
    () => {

      console.log(
        `DeepSpace Archive backend running on http://localhost:${PORT}`
      )

    }
  )

}


void startServer()
  .catch(
    (error) => {

      console.error(
        'Unable to start DeepSpace Archive backend:',
        error
      )


      process.exitCode =
        1

    }
  )

function isInsideLibrary(
  filePath: string,
  libraryPath: string
) {

  const resolvedLibrary =
    path.resolve(
      libraryPath
    )

  const resolvedFile =
    path.resolve(
      filePath
    )

  const relative =
    path.relative(
      resolvedLibrary,
      resolvedFile
    )

  return !(
    relative.startsWith('..') ||
    path.isAbsolute(relative)
  )

}