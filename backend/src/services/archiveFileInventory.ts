import fs from 'node:fs/promises'
import path from 'node:path'

import {
  isIgnoredArchiveDirectory,
} from './archiveDirectoryRules'


const videoExtensions =
  new Set([
    '.mp4',
    '.mkv',
    '.webm',
    '.mov',
    '.avi',
  ])

const audioExtensions =
  new Set([
    '.mp3',
    '.m4a',
    '.aac',
    '.wav',
    '.flac',
    '.ogg',
  ])

const imageExtensions =
  new Set([
    '.jpg',
    '.jpeg',
    '.png',
    '.webp',
    '.gif',
    '.avif',
  ])


export type ArchiveInventoryFile = {
  filePath: string
  relativePath: string
  fileName: string
  sizeBytes: number
  mtimeMs: number
  mediaType:
    | 'video'
    | 'audio'
    | 'image'
}


function normalizeRelativePath(
  value: string
) {
  return value
    .split(path.sep)
    .join('/')
}


function mediaTypeFor(
  fileName: string
): ArchiveInventoryFile['mediaType'] | null {
  const extension =
    path.extname(
      fileName
    ).toLocaleLowerCase()

  if (
    videoExtensions.has(
      extension
    )
  ) {
    return 'video'
  }

  if (
    audioExtensions.has(
      extension
    )
  ) {
    return 'audio'
  }

  if (
    imageExtensions.has(
      extension
    )
  ) {
    return 'image'
  }

  return null
}


function ignoredMediaFile(
  fileName: string
) {
  const lower =
    fileName.toLocaleLowerCase()

  return (
    lower.endsWith(
      '.thumbnail.jpg'
    ) ||
    lower.endsWith(
      '.thumbnail.jpeg'
    ) ||
    lower.endsWith(
      '.thumbnail.png'
    ) ||
    lower.endsWith(
      '.thumbnail.webp'
    )
  )
}


async function walk(
  directory: string,
  libraryRoot: string,
  results: ArchiveInventoryFile[]
) {
  const entries =
    await fs.readdir(
      directory,
      {
        withFileTypes: true,
      }
    )

  for (
    const entry
    of entries
  ) {
    const filePath =
      path.join(
        directory,
        entry.name
      )

    if (
      entry.isDirectory()
    ) {
      if (
        isIgnoredArchiveDirectory(
          entry.name
        )
      ) {
        continue
      }

      await walk(
        filePath,
        libraryRoot,
        results
      )
      continue
    }

    if (
      !entry.isFile() ||
      ignoredMediaFile(
        entry.name
      )
    ) {
      continue
    }

    const mediaType =
      mediaTypeFor(
        entry.name
      )

    if (!mediaType) {
      continue
    }

    const stat =
      await fs.stat(
        filePath
      )

    results.push({
      filePath,
      relativePath:
        normalizeRelativePath(
          path.relative(
            libraryRoot,
            filePath
          )
        ),
      fileName:
        entry.name,
      sizeBytes:
        stat.size,
      mtimeMs:
        stat.mtimeMs,
      mediaType,
    })
  }
}


export async function collectArchiveMediaFiles(
  libraryRoot: string
) {
  const results:
    ArchiveInventoryFile[] = []

  await walk(
    path.resolve(
      libraryRoot
    ),
    path.resolve(
      libraryRoot
    ),
    results
  )

  results.sort(
    (
      left,
      right
    ) =>
      left.relativePath.localeCompare(
        right.relativePath,
        undefined,
        {
          numeric: true,
          sensitivity: 'base',
        }
      )
  )

  return results
}
