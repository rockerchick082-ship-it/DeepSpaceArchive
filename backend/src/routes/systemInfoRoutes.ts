import {
  Router,
} from 'express'

import fs from 'node:fs/promises'
import path from 'node:path'

import {
  dataDirectory,
  applicationDatabasePath,
  catalogDatabasePath,
  thumbnailCacheDirectory,
} from '../config/appPaths'
import os from 'node:os'

import {
  execFile,
} from 'node:child_process'

import {
  promisify,
} from 'node:util'


const router =
  Router()


const execFileAsync =
  promisify(
    execFile
  )


const defaultRepositoryUrl =
  'https://github.com/rockerchick082-ship-it/DeepSpaceArchive'


type PackageInfo = {
  name: string
  version: string
  license: string | null
  repositoryUrl: string | null
}


async function pathExists(
  filePath:
    string
) {

  try {

    await fs.access(
      filePath
    )


    return true

  } catch {

    return false

  }

}


async function fileSize(
  filePath:
    string
) {

  try {

    const stats =
      await fs.stat(
        filePath
      )


    return stats.size

  } catch {

    return 0

  }

}


async function directoryFileCount(
  directoryPath:
    string
) {

  try {

    const entries =
      await fs.readdir(
        directoryPath,
        {
          withFileTypes:
            true,
        }
      )


    return entries.filter(
      (entry) =>
        entry.isFile()
    ).length

  } catch {

    return 0

  }

}


async function getFfmpegInfo() {

  try {

    const {
      stdout,
      stderr,
    } =
      await execFileAsync(
        'ffmpeg',
        [
          '-version',
        ],
        {
          windowsHide:
            true,
        }
      )


    const output =
      (
        stdout ||
        stderr
      )
        .trim()


    const firstLine =
      output
        .split(
          /\r?\n/
        )[0] ??
      'FFmpeg detected'


    return {
      available:
        true,

      version:
        firstLine,
    }

  } catch {

    return {
      available:
        false,

      version:
        null,
    }

  }

}


function normalizeRepositoryUrl(
  value:
    unknown
) {

  if (
    typeof value ===
      'string'
  ) {

    return value
      .replace(
        /^git\+/,
        ''
      )
      .replace(
        /\.git$/,
        ''
      )

  }


  if (
    value &&
    typeof value ===
      'object'
  ) {

    const url =
      (
        value as {
          url?: unknown
        }
      ).url


    if (
      typeof url ===
        'string'
    ) {

      return url
        .replace(
          /^git\+/,
          ''
        )
        .replace(
          /\.git$/,
          ''
        )

    }

  }


  return null

}


async function readPackageInfo():
  Promise<PackageInfo> {

  const candidates = [
    path.resolve(
      process.cwd(),
      'package.json'
    ),
    path.resolve(
      process.cwd(),
      '..',
      'package.json'
    ),
  ]


  for (
    const packagePath
    of candidates
  ) {

    try {

      const contents =
        await fs.readFile(
          packagePath,
          'utf8'
        )


      const packageData =
        JSON.parse(
          contents
        ) as {
          name?: unknown
          version?: unknown
          license?: unknown
          repository?: unknown
        }


      return {
        name:
          typeof packageData.name ===
            'string'
            ? packageData.name
            : 'DeepSpace Archive Backend',

        version:
          typeof packageData.version ===
            'string'
            ? packageData.version
            : 'Unknown',

        license:
          typeof packageData.license ===
            'string'
            ? packageData.license
            : null,

        repositoryUrl:
          normalizeRepositoryUrl(
            packageData.repository
          ),
      }

    } catch {
      // Try the next candidate.
    }

  }


  return {
    name:
      'DeepSpace Archive Backend',

    version:
      'Unknown',

    license:
      null,

    repositoryUrl:
      null,
  }

}


async function getGitCommit() {

  const environmentCommit =
    process.env
      .DEEPSPACE_ARCHIVE_COMMIT
      ?.trim() ||
    process.env
      .GITHUB_SHA
      ?.trim()


  if (
    environmentCommit
  ) {

    return environmentCommit
      .slice(
        0,
        12
      )

  }


  try {

    const {
      stdout,
    } =
      await execFileAsync(
        'git',
        [
          'rev-parse',
          '--short=12',
          'HEAD',
        ],
        {
          cwd:
            process.cwd(),

          windowsHide:
            true,
        }
      )


    const commit =
      stdout.trim()


    return commit ||
      null

  } catch {

    return null

  }

}


function buildChannel() {

  const configured =
    process.env
      .DEEPSPACE_ARCHIVE_CHANNEL
      ?.trim()


  if (
    configured
  ) {

    return configured

  }


  return process.env.NODE_ENV ===
    'production'
    ? 'release'
    : 'development'

}


async function collectSystemInfo() {

  const packageInfo =
    await readPackageInfo()


  const ffmpeg =
    await getFfmpegInfo()


  const libraryPath =
    process.env.MEDIA_LIBRARY_PATH


  const resolvedLibraryPath =
    libraryPath
      ? path.resolve(
          libraryPath
        )
      : null


  const libraryConnected =
    resolvedLibraryPath
      ? await pathExists(
          resolvedLibraryPath
        )
      : false



  const databasePath =
    applicationDatabasePath


  const catalogDatabasePathValue =
    catalogDatabasePath


  const thumbnailCachePath =
    thumbnailCacheDirectory


  const safetyBackupPath =
    path.join(
      dataDirectory,
      'safety-backups'
    )


  const restoreUploadPath =
    path.join(
      dataDirectory,
      'restore-uploads'
    )


  const repositoryUrl =
    process.env
      .DEEPSPACE_ARCHIVE_REPOSITORY_URL
      ?.trim() ||
    packageInfo.repositoryUrl ||
    defaultRepositoryUrl


  const version =
    process.env
      .DEEPSPACE_ARCHIVE_VERSION
      ?.trim() ||
    packageInfo.version


  const buildDate =
    process.env
      .DEEPSPACE_ARCHIVE_BUILD_DATE
      ?.trim() ||
    null


  const commit =
    await getGitCommit()


  const licenseFileCandidates = [
    path.resolve(
      process.cwd(),
      'LICENSE'
    ),
    path.resolve(
      process.cwd(),
      '..',
      'LICENSE'
    ),
  ]


  let licenseFileExists =
    false


  for (
    const candidate
    of licenseFileCandidates
  ) {

    if (
      await pathExists(
        candidate
      )
    ) {

      licenseFileExists =
        true


      break

    }

  }


  return {

    application: {

      name:
        'DeepSpace Archive',

      backendPackage:
        packageInfo.name,

      version,

      license:
        packageInfo.license,

      licenseFileExists,

      unofficialFanProject:
        true,

    },

    build: {

      channel:
        buildChannel(),

      commit,

      buildDate,

    },

    project: {

      repositoryUrl,

      issuesUrl:
        `${repositoryUrl}/issues`,

    },

    runtime: {

      nodeVersion:
        process.version,

      platform:
        process.platform,

      architecture:
        process.arch,

      operatingSystem:
        `${os.type()} ${os.release()}`,

      hostname:
        os.hostname(),

      uptimeSeconds:
        Math.floor(
          process.uptime()
        ),

      workingDirectory:
        process.cwd(),

    },

    mediaLibrary: {

      configured:
        Boolean(
          libraryPath
        ),

      connected:
        libraryConnected,

      path:
        resolvedLibraryPath,

    },

    ffmpeg,

    storage: {

      dataDirectory,

      databasePath,

      databaseExists:
        await pathExists(
          databasePath
        ),

      databaseSize:
        await fileSize(
          databasePath
        ),

      catalogDatabasePath,

      catalogDatabaseExists:
        await pathExists(
          catalogDatabasePath
        ),

      catalogDatabaseSize:
        await fileSize(
          catalogDatabasePath
        ),

      thumbnailCachePath,

      safetyBackupPath,

      safetyBackupCount:
        await directoryFileCount(
          safetyBackupPath
        ),

      restoreUploadPath,

    },

    checkedAt:
      new Date()
        .toISOString(),

  }

}


/*
 * ========================================
 * FULL LOCAL SYSTEM INFORMATION
 * ========================================
 */

router.get(
  '/',
  async (
    _request,
    response
  ) => {

    try {

      response.json(
        await collectSystemInfo()
      )

    } catch (
      error
    ) {

      console.error(
        'Unable to load system information:',
        error
      )


      response
        .status(500)
        .json({
          error:
            'Unable to load system information.',
        })

    }

  }
)


/*
 * ========================================
 * PRIVACY-SAFE SUPPORT DIAGNOSTICS
 * ========================================
 *
 * This intentionally omits:
 * - media-library path
 * - hostname
 * - working directory
 * - application storage paths
 * - filenames / media titles
 * ========================================
 */

router.get(
  '/diagnostics',
  async (
    _request,
    response
  ) => {

    try {

      const info =
        await collectSystemInfo()


      const diagnostics = {

        diagnosticFormat:
          'deepspace-archive-support-diagnostics',

        formatVersion:
          1,

        createdAt:
          new Date()
            .toISOString(),

        application: {

          name:
            info.application.name,

          version:
            info.application.version,

          backendPackage:
            info.application.backendPackage,

          license:
            info.application.license,

        },

        build:
          info.build,

        runtime: {

          nodeVersion:
            info.runtime.nodeVersion,

          platform:
            info.runtime.platform,

          architecture:
            info.runtime.architecture,

          operatingSystem:
            info.runtime.operatingSystem,

          uptimeSeconds:
            info.runtime.uptimeSeconds,

        },

        mediaLibrary: {

          configured:
            info.mediaLibrary.configured,

          connected:
            info.mediaLibrary.connected,

        },

        ffmpeg:
          info.ffmpeg,

        storage: {

          databaseExists:
            info.storage.databaseExists,

          databaseSize:
            info.storage.databaseSize,

          catalogDatabaseExists:
            info.storage.catalogDatabaseExists,

          catalogDatabaseSize:
            info.storage.catalogDatabaseSize,

          safetyBackupCount:
            info.storage.safetyBackupCount,

        },

        privacy: {

          mediaPathsIncluded:
            false,

          hostNameIncluded:
            false,

          fileNamesIncluded:
            false,

        },

      }


      const date =
        new Date()
          .toISOString()
          .slice(
            0,
            10
          )


      response.setHeader(
        'Content-Type',
        'application/json; charset=utf-8'
      )


      response.setHeader(
        'Content-Disposition',
        `attachment; filename="deepspace-archive-diagnostics-${date}.json"`
      )


      response.send(
        JSON.stringify(
          diagnostics,
          null,
          2
        )
      )

    } catch (
      error
    ) {

      console.error(
        'Unable to create support diagnostics:',
        error
      )


      response
        .status(500)
        .json({
          error:
            'Unable to create support diagnostics.',
        })

    }

  }
)


export {
  router as systemInfoRoutes,
}


export default router