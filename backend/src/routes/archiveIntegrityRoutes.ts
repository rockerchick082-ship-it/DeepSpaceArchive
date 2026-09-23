import {
  createHash,
  randomUUID,
} from 'node:crypto'

import {
  createReadStream,
} from 'node:fs'

import {
  Router,
} from 'express'

import {
  collectArchiveMediaFiles,
} from '../services/archiveFileInventory'

import {
  acceptVerifiedIntegrityChanges,
  beginIntegrityRun,
  failIntegrityRun,
  finishIntegrityRun,
  getArchiveIntegrityReport,
  observeIntegrityFile,
  verifyIntegrityFile,
} from '../state/archiveIntegrity'

import type {
  IntegrityMode,
} from '../state/archiveIntegrity'


export const archiveIntegrityRoutes =
  Router()


type IntegrityJob = {
  id: string
  mode: IntegrityMode
  status:
    | 'running'
    | 'completed'
    | 'failed'
  startedAt: string
  completedAt: string | null
  total: number
  processed: number
  currentPath: string | null
  error: string | null
  warnings: string[]
}


let currentJob:
  IntegrityJob | null =
  null


async function sha256File(
  filePath: string
) {
  const hash =
    createHash(
      'sha256'
    )

  const stream =
    createReadStream(
      filePath
    )

  for await (
    const chunk
    of stream
  ) {
    hash.update(
      chunk as Buffer
    )
  }

  return hash.digest(
    'hex'
  )
}


async function runScan(
  job: IntegrityJob,
  libraryPath: string
) {
  const run =
    beginIntegrityRun(
      job.mode
    )

  try {
    const files =
      await collectArchiveMediaFiles(
        libraryPath
      )

    job.total =
      files.length

    for (
      const file
      of files
    ) {
      job.currentPath =
        file.relativePath

      try {
        if (
          job.mode ===
          'verify'
        ) {
          const sha256 =
            await sha256File(
              file.filePath
            )

          verifyIntegrityFile(
            file,
            sha256,
            run.scanToken
          )
        } else {
          observeIntegrityFile(
            file,
            run.scanToken
          )
        }
      } catch (
        fileError
      ) {
        observeIntegrityFile(
          file,
          run.scanToken
        )

        if (
          job.warnings.length <
          30
        ) {
          job.warnings.push(
            `${file.relativePath}: ${
              fileError instanceof Error
                ? fileError.message
                : String(fileError)
            }`
          )
        }
      }

      job.processed +=
        1
    }

    finishIntegrityRun(
      run.id,
      run.scanToken,
      files.length
    )

    job.status =
      'completed'
    job.completedAt =
      new Date().toISOString()
    job.currentPath =
      null
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error)

    failIntegrityRun(
      run.id,
      run.scanToken,
      message
    )

    job.status =
      'failed'
    job.error =
      message
    job.completedAt =
      new Date().toISOString()
    job.currentPath =
      null
  }
}


archiveIntegrityRoutes.get(
  '/',
  (
    _request,
    response
  ) => {
    response.json({
      ...getArchiveIntegrityReport(),
      job:
        currentJob,
    })
  }
)


archiveIntegrityRoutes.get(
  '/job',
  (
    _request,
    response
  ) => {
    response.json({
      job:
        currentJob,
    })
  }
)


archiveIntegrityRoutes.post(
  '/scan',
  (
    request,
    response
  ) => {
    const libraryPath =
      process.env.MEDIA_LIBRARY_PATH

    if (!libraryPath) {
      response
        .status(500)
        .json({
          error:
            'MEDIA_LIBRARY_PATH is not configured.',
        })
      return
    }

    if (
      currentJob?.status ===
      'running'
    ) {
      response
        .status(409)
        .json({
          error:
            'An archive integrity scan is already running.',
          job:
            currentJob,
        })
      return
    }

    const mode:
      IntegrityMode =
        request.body?.mode ===
          'verify'
          ? 'verify'
          : 'quick'

    const job:
      IntegrityJob = {
        id:
          randomUUID(),
        mode,
        status:
          'running',
        startedAt:
          new Date().toISOString(),
        completedAt:
          null,
        total:
          0,
        processed:
          0,
        currentPath:
          null,
        error:
          null,
        warnings:
          [],
      }

    currentJob =
      job

    void runScan(
      job,
      libraryPath
    )

    response
      .status(202)
      .json({
        job,
      })
  }
)


archiveIntegrityRoutes.post(
  '/accept',
  (
    request,
    response
  ) => {
    try {
      const relativePaths =
        Array.isArray(
          request.body?.relativePaths
        )
          ? request.body.relativePaths.filter(
              (
                value: unknown
              ): value is string =>
                typeof value ===
                  'string'
            )
          : undefined

      const updated =
        acceptVerifiedIntegrityChanges(
          relativePaths
        )

      response.json({
        updated,
        report:
          getArchiveIntegrityReport(),
      })
    } catch (error) {
      response
        .status(500)
        .json({
          error:
            error instanceof Error
              ? error.message
              : 'Unable to accept archive integrity changes.',
        })
    }
  }
)


export default archiveIntegrityRoutes
