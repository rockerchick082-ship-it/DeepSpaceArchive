import fs from 'node:fs/promises'
import path from 'node:path'

import {
  dataDirectory,
  cacheDirectory,
  applicationDatabasePath,
} from '../config/appPaths'


type PathSettingsFile = {
  mediaLibraryPath:
    string | null

  updatedAt:
    string | null
}


export type FolderDetection = {
  id: string
  label: string
  found: boolean
  matchedFolder: string | null
}


export type PathSettingsStatus = {
  mediaLibraryPath: string | null

  source:
    | 'saved'
    | 'environment'
    | 'unconfigured'

  locked: boolean

  exists: boolean
  isDirectory: boolean

  folders:
    FolderDetection[]

  browseRoots:
    string[]

  applicationPaths: {
    data: string
    cache: string
    database: string
  }
}


export type MediaDirectoryBrowseResult = {
  currentPath: string
  rootPath: string
  parentPath: string | null
  roots: string[]

  directories:
    Array<{
      name: string
      path: string
    }>
}


const settingsPath =
  path.join(
    dataDirectory,
    'path-settings.json'
  )


const dataPath =
  dataDirectory


const cachePath =
  cacheDirectory


const databasePath =
  applicationDatabasePath


/*
 * Keep the environment-provided value separate
 * from the mutable runtime value. Saving a library
 * changes process.env.MEDIA_LIBRARY_PATH immediately,
 * but this original value remains a reliable fallback
 * when moving the same app data between Windows,
 * Docker, and a NAS.
 */
const environmentMediaLibraryPath =
  process.env.MEDIA_LIBRARY_PATH
    ?.trim() ||
  null


function mediaLibraryPathLocked() {

  return (
    process.env.MEDIA_LIBRARY_PATH_LOCKED ===
      'true'
  )

}


const folderDefinitions = [

  {
    id:
      'home',

    label:
      'Home Media',

    names: [
      'home',
      'Home',
    ],
  },

  {
    id:
      'main-story',

    label:
      'Main Story',

    names: [
      'Main Story',
    ],
  },

  {
    id:
      'memoria',

    label:
      'Memoria',

    names: [
      'Memoria',
    ],
  },

  {
    id:
      'secret-times',

    label:
      'Secret Times',

    names: [
      'Secret Times',
    ],
  },

  {
    id:
      'tender-moments',

    label:
      'Tender Moments',

    names: [
      'Tender Moments',
    ],
  },

  {
    id:
      'myths',

    label:
      'Myths',

    names: [
      'Myths',
    ],
  },

  {
    id:
      'bond',

    label:
      'Bond',

    names: [
      'Bond',
    ],
  },

  {
    id:
      'phone-call',

    label:
      'Phone Call',

    names: [
      'Phone Call',
      'Phone Calls',
    ],
  },

  {
    id:
      'phone-video',

    label:
      'Phone Video',

    names: [
      'Phone Video',
      'Phone Videos',
    ],
  },

  {
    id:
      'illusio',

    label:
      'Illusio Kindle',

    names: [
      'Illusio Kindle',
      'Illusio',
    ],
  },

  {
    id:
      'gallery',

    label:
      'Gallery',

    names: [
      'Gallery',
    ],
  },

]


async function pathStatus(
  value:
    string | null
) {

  if (
    !value
  ) {

    return {
      exists:
        false,

      isDirectory:
        false,
    }

  }


  try {

    const stat =
      await fs.stat(
        value
      )


    return {
      exists:
        true,

      isDirectory:
        stat.isDirectory(),
    }

  } catch {

    return {
      exists:
        false,

      isDirectory:
        false,
    }

  }

}


async function validDirectory(
  value:
    string | null
) {

  if (
    !value
  ) {

    return false

  }


  const status =
    await pathStatus(
      value
    )


  return (
    status.exists &&
    status.isDirectory
  )

}


function normalizeAbsolutePath(
  value:
    string
) {

  return path.resolve(
    value.trim()
  )

}


function pathIsInsideOrEqual(
  root:
    string,
  candidate:
    string
) {

  const relative =
    path.relative(
      root,
      candidate
    )


  return (
    relative ===
      '' ||
    (
      !relative.startsWith(
        '..'
      ) &&
      !path.isAbsolute(
        relative
      )
    )
  )

}


function defaultBrowseRoot(
  value:
    string
) {

  const resolved =
    normalizeAbsolutePath(
      value
    )


  const parsedRoot =
    path.parse(
      resolved
    ).root


  const parent =
    path.dirname(
      resolved
    )


  if (
    parent ===
    parsedRoot
  ) {

    return resolved

  }


  return parent

}


function parseExplicitBrowseRoots() {

  const value =
    process.env
      .MEDIA_LIBRARY_BROWSE_ROOTS
      ?.trim()


  if (
    !value
  ) {

    return []

  }


  return value
    .split(
      path.delimiter
    )
    .map(
      (entry) =>
        entry.trim()
    )
    .filter(
      Boolean
    )
    .map(
      normalizeAbsolutePath
    )

}


/*
 * Audiobookshelf-style zero-configuration browsing.
 *
 * Windows:
 *   Detect available drive letters so a fresh install
 *   can browse directly to C:\, D:\, Z:\, etc.
 *
 * Linux / Docker:
 *   Prefer conventional media mount roots. A public
 *   Docker deployment should mount the parent media
 *   directory to /media.
 *
 * MEDIA_LIBRARY_BROWSE_ROOTS remains available for
 * administrators who want to explicitly restrict or
 * provide additional browse roots.
 */
async function discoverAutomaticBrowseRoots() {

  const roots:
    string[] = []


  if (
    process.platform ===
    'win32'
  ) {

    const letters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
        .split(
          ''
        )


    for (
      const letter
      of letters
    ) {

      const candidate =
        `${letter}:\\`


      if (
        await validDirectory(
          candidate
        )
      ) {

        roots.push(
          candidate
        )

      }

    }


    return roots

  }


  const commonLinuxRoots = [
    '/media',
    '/mnt',
  ]


  for (
    const candidate
    of commonLinuxRoots
  ) {

    if (
      await validDirectory(
        candidate
      )
    ) {

      roots.push(
        candidate
      )

    }

  }


  return roots

}


async function readSavedSettings():
  Promise<PathSettingsFile> {

  try {

    const contents =
      await fs.readFile(
        settingsPath,
        'utf8'
      )


    const parsed =
      JSON.parse(
        contents
      ) as
        Partial<PathSettingsFile>


    return {
      mediaLibraryPath:
        typeof parsed.mediaLibraryPath ===
          'string' &&
        parsed.mediaLibraryPath.trim()
          ? parsed.mediaLibraryPath.trim()
          : null,

      updatedAt:
        typeof parsed.updatedAt ===
          'string'
          ? parsed.updatedAt
          : null,
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
        'Unable to read path settings:',
        error
      )

    }


    return {
      mediaLibraryPath:
        null,

      updatedAt:
        null,
    }

  }

}


async function writeSavedSettings(
  settings:
    PathSettingsFile
) {

  await fs.mkdir(
    path.dirname(
      settingsPath
    ),
    {
      recursive:
        true,
    }
  )


  const temporaryPath =
    `${settingsPath}.tmp`


  await fs.writeFile(
    temporaryPath,
    JSON.stringify(
      settings,
      null,
      2
    ),
    'utf8'
  )


  await fs.rename(
    temporaryPath,
    settingsPath
  )

}


export async function initializePathSettings() {

  if (
    mediaLibraryPathLocked()
  ) {

    if (
      environmentMediaLibraryPath
    ) {

      process.env.MEDIA_LIBRARY_PATH =
        environmentMediaLibraryPath

    }


    return

  }


  const saved =
    await readSavedSettings()


  if (
    saved.mediaLibraryPath &&
    await validDirectory(
      saved.mediaLibraryPath
    )
  ) {

    process.env.MEDIA_LIBRARY_PATH =
      saved.mediaLibraryPath


    return

  }


  if (
    environmentMediaLibraryPath &&
    await validDirectory(
      environmentMediaLibraryPath
    )
  ) {

    process.env.MEDIA_LIBRARY_PATH =
      environmentMediaLibraryPath

  }

}


export async function getConfiguredMediaLibraryPath() {

  if (
    mediaLibraryPathLocked() &&
    environmentMediaLibraryPath
  ) {

    return {
      value:
        environmentMediaLibraryPath,

      source:
        'environment' as const,
    }

  }


  const saved =
    await readSavedSettings()


  if (
    saved.mediaLibraryPath &&
    await validDirectory(
      saved.mediaLibraryPath
    )
  ) {

    return {
      value:
        saved.mediaLibraryPath,

      source:
        'saved' as const,
    }

  }


  if (
    environmentMediaLibraryPath &&
    await validDirectory(
      environmentMediaLibraryPath
    )
  ) {

    return {
      value:
        environmentMediaLibraryPath,

      source:
        'environment' as const,
    }

  }


  if (
    saved.mediaLibraryPath
  ) {

    return {
      value:
        saved.mediaLibraryPath,

      source:
        'saved' as const,
    }

  }


  if (
    environmentMediaLibraryPath
  ) {

    return {
      value:
        environmentMediaLibraryPath,

      source:
        'environment' as const,
    }

  }


  return {
    value:
      null,

    source:
      'unconfigured' as const,
  }

}


async function detectFolders(
  libraryPath:
    string | null
): Promise<FolderDetection[]> {

  if (
    !libraryPath
  ) {

    return folderDefinitions.map(
      (definition) => ({

        id:
          definition.id,

        label:
          definition.label,

        found:
          false,

        matchedFolder:
          null,

      })
    )

  }


  return Promise.all(
    folderDefinitions.map(
      async (
        definition
      ) => {

        for (
          const folderName
          of definition.names
        ) {

          const candidate =
            path.join(
              libraryPath,
              folderName
            )


          const status =
            await pathStatus(
              candidate
            )


          if (
            status.exists &&
            status.isDirectory
          ) {

            return {
              id:
                definition.id,

              label:
                definition.label,

              found:
                true,

              matchedFolder:
                folderName,
            }

          }

        }


        return {
          id:
            definition.id,

          label:
            definition.label,

          found:
            false,

          matchedFolder:
            null,
        }

      }
    )
  )

}


export async function getMediaLibraryBrowseRoots() {

  const explicitRoots =
    parseExplicitBrowseRoots()


  const candidates:
    string[] = [
      ...explicitRoots,
    ]


  const configured =
    await getConfiguredMediaLibraryPath()


  if (
    environmentMediaLibraryPath
  ) {

    candidates.push(
      defaultBrowseRoot(
        environmentMediaLibraryPath
      )
    )

  }


  if (
    configured.value
  ) {

    candidates.push(
      defaultBrowseRoot(
        configured.value
      )
    )

  }


  /*
   * A fresh install may have neither a saved nor an
   * environment path. Automatically discover safe,
   * useful starting roots so Browse Folders works
   * immediately.
   */
  if (
    candidates.length ===
    0
  ) {

    candidates.push(
      ...await discoverAutomaticBrowseRoots()
    )

  }


  const uniqueRoots =
    Array.from(
      new Set(
        candidates.map(
          normalizeAbsolutePath
        )
      )
    )


  const validRoots:
    string[] = []


  for (
    const root
    of uniqueRoots
  ) {

    if (
      await validDirectory(
        root
      )
    ) {

      validRoots.push(
        root
      )

    }

  }


  return validRoots

}


export async function browseMediaDirectories(
  requestedPath?:
    string
): Promise<MediaDirectoryBrowseResult> {

  const roots =
    await getMediaLibraryBrowseRoots()


  if (
    roots.length ===
    0
  ) {

    throw new Error(
      'No browsable media root is available. Enter a library path manually or configure MEDIA_LIBRARY_BROWSE_ROOTS.'
    )

  }


  const configured =
    await getConfiguredMediaLibraryPath()


  let initialPath:
    string


  if (
    requestedPath?.trim()
  ) {

    initialPath =
      normalizeAbsolutePath(
        requestedPath
      )

  } else if (
    configured.value
  ) {

    const normalizedConfigured =
      normalizeAbsolutePath(
        configured.value
      )


    const isInsideRoot =
      roots.some(
        (root) =>
          pathIsInsideOrEqual(
            root,
            normalizedConfigured
          )
      )


    initialPath =
      isInsideRoot
        ? normalizedConfigured
        : roots[0]

  } else {

    initialPath =
      roots[0]

  }


  const containingRoots =
    roots
      .filter(
        (root) =>
          pathIsInsideOrEqual(
            root,
            initialPath
          )
      )
      .sort(
        (
          left,
          right
        ) =>
          right.length -
          left.length
      )


  const rootPath =
    containingRoots[0]


  if (
    !rootPath
  ) {

    throw new Error(
      'The requested folder is outside the configured media browse roots.'
    )

  }


  if (
    !await validDirectory(
      initialPath
    )
  ) {

    throw new Error(
      'The requested browse folder does not exist or is not a directory.'
    )

  }


  const entries =
    await fs.readdir(
      initialPath,
      {
        withFileTypes:
          true,
      }
    )


  const directories =
    entries
      .filter(
        (entry) =>
          entry.isDirectory()
      )
      .map(
        (entry) => ({
          name:
            entry.name,

          path:
            path.join(
              initialPath,
              entry.name
            ),
        })
      )
      .sort(
        (
          left,
          right
        ) =>
          left.name.localeCompare(
            right.name,
            undefined,
            {
              numeric:
                true,

              sensitivity:
                'base',
            }
          )
      )


  const parentCandidate =
    path.dirname(
      initialPath
    )


  const parentPath =
    initialPath ===
      rootPath
      ? null
      : pathIsInsideOrEqual(
          rootPath,
          parentCandidate
        )
        ? parentCandidate
        : null


  return {
    currentPath:
      initialPath,

    rootPath,

    parentPath,

    roots,

    directories,
  }

}


export async function getPathSettingsStatus():
  Promise<PathSettingsStatus> {

  const configured =
    await getConfiguredMediaLibraryPath()


  const status =
    await pathStatus(
      configured.value
    )


  const folders =
    status.exists &&
    status.isDirectory
      ? await detectFolders(
          configured.value
        )
      : await detectFolders(
          null
        )


  return {
    mediaLibraryPath:
      configured.value,

    source:
      configured.source,

    locked:
      mediaLibraryPathLocked(),

    exists:
      status.exists,

    isDirectory:
      status.isDirectory,

    folders,

    browseRoots:
      await getMediaLibraryBrowseRoots(),

    applicationPaths: {
      data:
        dataPath,

      cache:
        cachePath,

      database:
        databasePath,
    },
  }

}


export async function testMediaLibraryPath(
  value:
    string
) {

  const trimmed =
    value.trim()


  const status =
    await pathStatus(
      trimmed
    )


  const folders =
    status.exists &&
    status.isDirectory
      ? await detectFolders(
          trimmed
        )
      : await detectFolders(
          null
        )


  return {
    path:
      trimmed,

    exists:
      status.exists,

    isDirectory:
      status.isDirectory,

    folders,
  }

}


export async function saveMediaLibraryPath(
  value:
    string
) {

  if (
    mediaLibraryPathLocked()
  ) {

    throw new Error(
      'The media library path is locked by this deployment.'
    )

  }


  const trimmed =
    value.trim()


  const test =
    await testMediaLibraryPath(
      trimmed
    )


  if (
    !test.exists ||
    !test.isDirectory
  ) {

    throw new Error(
      'The selected media library path does not exist or is not a directory.'
    )

  }


  await writeSavedSettings({

    mediaLibraryPath:
      trimmed,

    updatedAt:
      new Date()
        .toISOString(),

  })


  process.env.MEDIA_LIBRARY_PATH =
    trimmed


  return getPathSettingsStatus()

}


export async function clearSavedMediaLibraryPath() {

  if (
    mediaLibraryPathLocked()
  ) {

    throw new Error(
      'The media library path is locked by this deployment.'
    )

  }


  await writeSavedSettings({

    mediaLibraryPath:
      null,

    updatedAt:
      new Date()
        .toISOString(),

  })


  if (
    environmentMediaLibraryPath
  ) {

    process.env.MEDIA_LIBRARY_PATH =
      environmentMediaLibraryPath

  } else {

    delete process.env
      .MEDIA_LIBRARY_PATH

  }


  return {
    success:
      true,

    restartRecommended:
      false,

    mediaLibraryPath:
      environmentMediaLibraryPath,
  }

}