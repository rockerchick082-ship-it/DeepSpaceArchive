import fs from 'node:fs/promises'
import path from 'node:path'

import {
  dataDirectory,
} from '../config/appPaths'

import {
  execFile,
} from 'node:child_process'

import {
  promisify,
} from 'node:util'

import {
  randomUUID,
} from 'node:crypto'

import {
  getPathSettingsStatus,
} from './pathSettings'


const execFileAsync =
  promisify(
    execFile
  )


const setupSchemaVersion =
  1



const setupStatePath =
  path.join(
    dataDirectory,
    'setup-state.json'
  )


const applicationDatabasePath =
  path.join(
    dataDirectory,
    'deepspace-archive.db'
  )


const catalogDatabasePath =
  path.join(
    dataDirectory,
    'metadata-catalog.db'
  )


type SetupStateFile = {
  schemaVersion: number
  completedAt: string
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


async function readSetupState():
  Promise<SetupStateFile | null> {

  try {

    const contents =
      await fs.readFile(
        setupStatePath,
        'utf8'
      )


    const parsed =
      JSON.parse(
        contents
      ) as
        Partial<SetupStateFile>


    if (
      parsed.schemaVersion !==
        setupSchemaVersion ||
      typeof parsed.completedAt !==
        'string' ||
      !parsed.completedAt.trim()
    ) {

      return null

    }


    return {
      schemaVersion:
        setupSchemaVersion,

      completedAt:
        parsed.completedAt,
    }

  } catch (
    error
  ) {

    const code =
      (
        error as
          NodeJS.ErrnoException
      ).code


    if (
      code !==
      'ENOENT'
    ) {

      console.warn(
        'Unable to read first-run setup state:',
        error
      )

    }


    return null

  }

}


async function writeSetupState(
  completedAt:
    string
) {

  await fs.mkdir(
    dataDirectory,
    {
      recursive:
        true,
    }
  )


  const temporaryPath =
    `${setupStatePath}.tmp`


  await fs.writeFile(
    temporaryPath,
    JSON.stringify(
      {
        schemaVersion:
          setupSchemaVersion,

        completedAt,
      },
      null,
      2
    ),
    'utf8'
  )


  await fs.rename(
    temporaryPath,
    setupStatePath
  )

}


async function testDataDirectoryWritable() {

  const testFile =
    path.join(
      dataDirectory,
      `.setup-write-test-${randomUUID()}`
    )


  try {

    await fs.mkdir(
      dataDirectory,
      {
        recursive:
          true,
      }
    )


    await fs.writeFile(
      testFile,
      'DeepSpace Archive setup write test',
      'utf8'
    )


    await fs.unlink(
      testFile
    )


    return true

  } catch (
    error
  ) {

    try {

      await fs.unlink(
        testFile
      )

    } catch {
      // Best-effort cleanup only.
    }


    console.warn(
      'DeepSpace Archive data directory is not writable:',
      error
    )


    return false

  }

}


async function getFfmpegStatus() {

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


    const version =
      output
        .split(
          /\r?\n/
        )[0] ??
      'FFmpeg detected'


    return {
      available:
        true,

      version,
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


export async function getSetupStatus() {

  const [
    setupState,
    pathStatus,
    dataWritable,
    ffmpeg,
    applicationDatabaseExists,
    catalogDatabaseExists,
  ] =
    await Promise.all([
      readSetupState(),
      getPathSettingsStatus(),
      testDataDirectoryWritable(),
      getFfmpegStatus(),
      pathExists(
        applicationDatabasePath
      ),
      pathExists(
        catalogDatabasePath
      ),
    ])


  const libraryAccessible =
    Boolean(
      pathStatus.mediaLibraryPath &&
      pathStatus.exists &&
      pathStatus.isDirectory
    )


  const detectedFolderCount =
    pathStatus.folders.filter(
      (folder) =>
        folder.found
    ).length


  /*
   * Existing installations with a working library should
   * never be forced into first-run setup merely because
   * setup-state.json did not exist in older releases.
   */
  const existingInstallation =
    !setupState &&
    libraryAccessible


  const setupRequired =
    !setupState &&
    !existingInstallation


  const canComplete =
    libraryAccessible &&
    dataWritable &&
    applicationDatabaseExists &&
    catalogDatabaseExists


  let mode:
    | 'first-run'
    | 'existing'
    | 'completed'
    | 'locked-invalid'


  if (
    setupState
  ) {

    mode =
      'completed'

  } else if (
    pathStatus.locked &&
    !libraryAccessible
  ) {

    mode =
      'locked-invalid'

  } else if (
    existingInstallation
  ) {

    mode =
      'existing'

  } else {

    mode =
      'first-run'

  }


  return {
    schemaVersion:
      setupSchemaVersion,

    mode,

    setupRequired,

    explicitCompleted:
      Boolean(
        setupState
      ),

    existingInstallation,

    completedAt:
      setupState?.completedAt ??
      null,

    canComplete,

    library: {
      path:
        pathStatus.mediaLibraryPath,

      source:
        pathStatus.source,

      locked:
        pathStatus.locked,

      exists:
        pathStatus.exists,

      isDirectory:
        pathStatus.isDirectory,

      accessible:
        libraryAccessible,

      detectedFolderCount,

      folders:
        pathStatus.folders,

      browseRoots:
        pathStatus.browseRoots,
    },

    requirements: {
      ffmpeg,

      dataWritable,

      applicationDatabaseExists,

      catalogDatabaseExists,
    },

    checkedAt:
      new Date()
        .toISOString(),
  }

}


export async function completeFirstRunSetup() {

  const status =
    await getSetupStatus()


  if (
    !status.canComplete
  ) {

    throw new Error(
      'Setup cannot be completed until the media library is accessible and application storage is ready.'
    )

  }


  const completedAt =
    new Date()
      .toISOString()


  await writeSetupState(
    completedAt
  )


  return getSetupStatus()

}
