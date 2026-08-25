import fsSync from 'node:fs'
import fs from 'node:fs/promises'

import {
  Router,
} from 'express'

import multer from 'multer'

import {
  restoreUploadDirectory,
} from '../config/appPaths'

import {
  createArchiveBackup,
} from '../state/archiveBackup'

import {
  sendFullArchiveBackup,
} from '../state/archiveBackupZip'

import {
  analyzeArchiveBackup,
  restoreArchiveBackupMerge,
} from '../state/archiveRestore'


const router =
  Router()



/*
 * Make sure this exists automatically.
 */
fsSync.mkdirSync(
  restoreUploadDirectory,
  {
    recursive: true,
  }
)


const upload =
  multer({

    dest:
      restoreUploadDirectory,

    limits: {

      fileSize:
        500 * 1024 * 1024,

    },

  })


router.get(
  '/export',
  (
    _request,
    response
  ) => {

    try {

      const backup =
        createArchiveBackup()


      const date =
        new Date()
          .toISOString()
          .slice(
            0,
            10
          )


      response.setHeader(
        'Content-Type',
        'application/json'
      )


      response.setHeader(
        'Content-Disposition',
        `attachment; filename="DeepSpaceArchive-Backup-${date}.json"`
      )


      response.json(
        backup
      )

    } catch (error) {

      console.error(
        'Unable to export archive backup:',
        error
      )


      response
        .status(500)
        .json({
          error:
            'Unable to create archive backup',
        })

    }

  }
)


router.get(
  '/export-full',
  async (
    _request,
    response
  ) => {

    try {

      await sendFullArchiveBackup(
        response
      )

    } catch (error) {

      console.error(
        'Unable to create full archive backup:',
        error
      )


      if (
        !response.headersSent
      ) {

        response
          .status(500)
          .json({
            error:
              'Unable to create full archive backup',
          })

      }

    }

  }
)


/*
 * ========================================
 * RESTORE PREVIEW — READ ONLY
 * ========================================
 */

router.post(
  '/restore-preview',

  upload.single(
    'backup'
  ),

  async (
    request,
    response
  ) => {

    const uploadedFile =
      request.file


    if (
      !uploadedFile
    ) {

      response
        .status(400)
        .json({
          error:
            'No backup file was uploaded.',
        })

      return

    }


    try {

      const preview =
        await analyzeArchiveBackup(
          uploadedFile.path
        )


      response.json(
        preview
      )

    } catch (error) {

      console.error(
        'Unable to analyze backup:',
        error
      )


      response
        .status(400)
        .json({
          error:
            error instanceof Error
              ? error.message
              : 'Unable to analyze backup.',
        })

    } finally {

      try {

        await fs.unlink(
          uploadedFile.path
        )

      } catch {
        // Already gone.
      }

    }

  }
)


/*
 * ========================================
 * RESTORE — MERGE MODE
 * ========================================
 */

router.post(
  '/restore',

  upload.single(
    'backup'
  ),

  async (
    request,
    response
  ) => {

    const uploadedFile =
      request.file


    if (
      !uploadedFile
    ) {

      response
        .status(400)
        .json({
          error:
            'No backup file was uploaded.',
        })

      return

    }


    try {

      const requestedMode =
        request.body.mode


      if (
        requestedMode !==
        'merge'
      ) {

        response
          .status(400)
          .json({
            error:
              'Only merge restore is currently supported.',
          })

        return

      }


      /*
       * Validate it one more time
       * immediately before writing.
       */

      await analyzeArchiveBackup(
        uploadedFile.path
      )


      const result =
        await restoreArchiveBackupMerge(
          uploadedFile.path
        )


      response.json(
        result
      )

    } catch (error) {

      console.error(
        'Unable to restore backup:',
        error
      )


      response
        .status(500)
        .json({
          error:
            error instanceof Error
              ? error.message
              : 'Unable to restore backup.',
        })

    } finally {

      try {

        await fs.unlink(
          uploadedFile.path
        )

      } catch {
        // Already gone.
      }

    }

  }
)


export {
  router as backupRoutes,
}


export default router