import fs from 'node:fs/promises'
import path from 'node:path'


const imageExtensions =
  new Set([
    '.jpg',
    '.jpeg',
    '.png',
    '.webp',
    '.gif',
    '.avif',
  ])


const characters = [
  'Xavier',
  'Zayne',
  'Rafayel',
  'Sylus',
  'Caleb',
]


export type GalleryItem = {
  id: string
  title: string
  character: string | null
  folder: string
  fileName: string
  filePath: string
  relativePath: string
  extension: string
}


function normalizeRelativePath(
  value: string
) {

  return value
    .split(
      path.sep
    )
    .join(
      '/'
    )

}


function createId(
  relativePath: string
) {

  return normalizeRelativePath(
    relativePath
  )
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      '-'
    )
    .replace(
      /^-+|-+$/g,
      ''
    )

}


function cleanTitle(
  fileName: string
) {

  return path
    .parse(
      fileName
    )
    .name
    .replace(
      /[_-]+/g,
      ' '
    )
    .replace(
      /\s+/g,
      ' '
    )
    .trim()

}


function detectCharacter(
  relativePath: string
) {

  const normalizedSegments =
    normalizeRelativePath(
      relativePath
    )
      .split(
        '/'
      )
      .map(
        (segment) =>
          segment.toLowerCase()
      )


  for (
    const character
    of characters
  ) {

    if (
      normalizedSegments.includes(
        character.toLowerCase()
      )
    ) {

      return character

    }

  }


  return null

}


async function pathExists(
  filePath: string
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


async function walkGallery(
  directory: string,
  galleryRoot: string,
  items:
    GalleryItem[]
) {

  const entries =
    await fs.readdir(
      directory,
      {
        withFileTypes:
          true,
      }
    )


  for (
    const entry
    of entries
  ) {

    const fullPath =
      path.join(
        directory,
        entry.name
      )


    if (
      entry.isDirectory()
    ) {

      await walkGallery(
        fullPath,
        galleryRoot,
        items
      )


      continue

    }


    if (
      !entry.isFile()
    ) {

      continue

    }


    const extension =
      path
        .extname(
          entry.name
        )
        .toLowerCase()


    if (
      !imageExtensions.has(
        extension
      )
    ) {

      continue

    }


    const relativePath =
      normalizeRelativePath(
        path.relative(
          galleryRoot,
          fullPath
        )
      )


    const folderRelative =
      normalizeRelativePath(
        path.dirname(
          relativePath
        )
      )


    items.push({

      id:
        createId(
          relativePath
        ),

      title:
        cleanTitle(
          entry.name
        ),

      character:
        detectCharacter(
          relativePath
        ),

      folder:
        folderRelative ===
          '.'
          ? ''
          : folderRelative,

      fileName:
        entry.name,

      filePath:
        fullPath,

      relativePath,

      extension,

    })

  }

}


export async function scanGallery(
  libraryRoot: string
) {

  const galleryRoot =
    path.join(
      libraryRoot,
      'Gallery'
    )


  if (
    !await pathExists(
      galleryRoot
    )
  ) {

    return {
      galleryRoot,

      connected:
        false,

      items:
        [] as
          GalleryItem[],
    }

  }


  const items:
    GalleryItem[] =
    []


  await walkGallery(
    galleryRoot,
    galleryRoot,
    items
  )


  items.sort(
    (
      left,
      right
    ) => {

      const characterCompare =
        (
          left.character ??
          ''
        )
          .localeCompare(
            right.character ??
            ''
          )


      if (
        characterCompare !==
        0
      ) {

        return characterCompare

      }


      const folderCompare =
        left.folder
          .localeCompare(
            right.folder
          )


      if (
        folderCompare !==
        0
      ) {

        return folderCompare

      }


      return left.title
        .localeCompare(
          right.title
        )

    }
  )


  return {
    galleryRoot,

    connected:
      true,

    items,
  }

}