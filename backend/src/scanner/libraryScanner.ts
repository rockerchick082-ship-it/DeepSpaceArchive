import fs from 'node:fs/promises'
import path from 'node:path'

import {
  readArchiveMetadata,
} from '../metadata/memoryMetadata'

import {
  getCatalogItemsForFile,
  listCatalogMemoryLinks,
} from '../state/metadataCatalog'


export type LibraryCatalogItem = {
  id: number
  canonicalName: string
  character: string | null
  category: string
  subcategory: string | null
  releaseDate: string | null
  rarity: number | null
  position: string | null
  attribute: string | null
  source: string | null
  imageUrl: string | null
  sourceName: string | null
  sourceUrl: string | null
  memoryText: string | null
  memoryTextSourceUrl: string | null
}


export type LibraryItem = {
  title: string
  character: string
  category: string
  fileName: string
  filePath: string
  relativePath: string
  mediaType:
    | 'video'
    | 'audio'
    | 'image'
    | 'other'

  sortOrder: number | null
  releaseDate: string | null
  thumbnailPath: string | null

  catalogMatched: boolean
  catalogItems: LibraryCatalogItem[]

  linkedMemories:
    LibraryCatalogItem[]

  rarity: number | null
  position: string | null
  attribute: string | null
  source: string | null
  imageUrl: string | null
  memoryText: string | null
  memoryTextSourceUrl: string | null
}


const videoExtensions = [
  '.mp4',
  '.mkv',
  '.webm',
  '.mov',
  '.avi',
]


const audioExtensions = [
  '.mp3',
  '.m4a',
  '.aac',
  '.wav',
  '.flac',
  '.ogg',
]


const imageExtensions = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
]


function shouldIgnoreFile(
  fileName: string
) {

  const lowerName =
    fileName.toLowerCase()


  return (
    lowerName.endsWith(
      '.thumbnail.jpg'
    ) ||
    lowerName.endsWith(
      '.thumbnail.jpeg'
    ) ||
    lowerName.endsWith(
      '.thumbnail.png'
    ) ||
    lowerName.endsWith(
      '.thumbnail.webp'
    )
  )

}


function getMediaType(
  fileName: string
): LibraryItem['mediaType'] {

  const extension =
    path
      .extname(
        fileName
      )
      .toLowerCase()


  if (
    videoExtensions.includes(
      extension
    )
  ) {

    return 'video'

  }


  if (
    audioExtensions.includes(
      extension
    )
  ) {

    return 'audio'

  }


  if (
    imageExtensions.includes(
      extension
    )
  ) {

    return 'image'

  }


  return 'other'

}


function cleanCharacterName(
  folderName: string
) {

  return folderName.replace(
    /^\d+\.\s*/,
    ''
  )

}


function cleanTitle(
  fileName: string
) {

  const baseName =
    path.basename(
      fileName,
      path.extname(
        fileName
      )
    )


  return baseName.replace(
    /^\s*\d+\s*[-._)]\s*/,
    ''
  )

}


function catalogDisplayTitle(
  canonicalName: string,
  character: string
) {

  const prefix =
    `${character}:`


  if (
    canonicalName
      .toLowerCase()
      .startsWith(
        prefix.toLowerCase()
      )
  ) {

    return canonicalName
      .slice(
        prefix.length
      )
      .trim()

  }


  return canonicalName

}


function getSortOrder(
  fileName: string
): number | null {

  const baseName =
    path.basename(
      fileName,
      path.extname(
        fileName
      )
    )


  const match =
    baseName.match(
      /^\s*(\d+)\s*[-._)]/
    )


  if (!match) {

    return null

  }


  return Number(
    match[1]
  )

}


function portableRelativePath(
  libraryPath: string,
  fullPath: string
) {

  return path
    .relative(
      libraryPath,
      fullPath
    )
    .split(
      path.sep
    )
    .join('/')

}



function normalizeCatalogCategory(
  value: string
) {

  return value
    .normalize(
      'NFKD'
    )
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      ' '
    )
    .trim()
    .replace(
      /\s+/g,
      ' '
    )

}


function selectPrimaryCatalogItem(
  libraryCategory:
    string,
  catalogItems:
    ReturnType<
      typeof getCatalogItemsForFile
    >
) {

  const wanted =
    normalizeCatalogCategory(
      libraryCategory
    )


  const exact =
    catalogItems.find(
      (item) =>
        normalizeCatalogCategory(
          item.category
        ) ===
        wanted
    )


  if (
    exact
  ) {

    return exact

  }


  if (
    catalogItems.length ===
    1
  ) {

    return catalogItems[0]

  }


  return (
    catalogItems.find(
      (item) =>
        normalizeCatalogCategory(
          item.category
        ) !==
        'memory'
    ) ??
    null
  )

}


function toLibraryCatalogItem(
  catalogItem:
    ReturnType<
      typeof getCatalogItemsForFile
    >[number]
): LibraryCatalogItem {

  return {
    id:
      catalogItem.id,

    canonicalName:
      catalogItem.canonicalName,

    character:
      catalogItem.character,

    category:
      catalogItem.category,

    subcategory:
      catalogItem.subcategory,

    releaseDate:
      catalogItem.releaseDate,

    rarity:
      catalogItem.rarity,

    position:
      catalogItem.position,

    attribute:
      catalogItem.attribute,

    source:
      catalogItem.source,

    imageUrl:
      catalogItem.imageUrl,

    sourceName:
      catalogItem.sourceName,

    sourceUrl:
      catalogItem.sourceUrl,

    memoryText:
      catalogItem.memoryText,

    memoryTextSourceUrl:
      catalogItem.memoryTextSourceUrl,
  }

}


async function scanFolderRecursive(
  folderPath: string,
  category: string,
  character: string,
  libraryPath: string
): Promise<LibraryItem[]> {

  const items:
    LibraryItem[] =
    []


  const entries =
    await fs.readdir(
      folderPath,
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
        folderPath,
        entry.name
      )


    if (
      entry.isDirectory()
    ) {

      const nestedItems =
        await scanFolderRecursive(
          fullPath,
          category,
          character,
          libraryPath
        )


      items.push(
        ...nestedItems
      )


      continue

    }


    if (
      !entry.isFile()
    ) {

      continue

    }


    if (
      shouldIgnoreFile(
        entry.name
      )
    ) {

      continue

    }


    const mediaType =
      getMediaType(
        entry.name
      )


    if (
      mediaType ===
        'other'
    ) {

      continue

    }


    const metadata =
      await readArchiveMetadata(
        fullPath
      )


    const parsedPath =
      path.parse(
        fullPath
      )


    const thumbnailPath =
      metadata?.thumbnail
        ? path.join(
            parsedPath.dir,
            metadata.thumbnail
          )
        : null


    /*
     * Always expose a platform-neutral relative
     * path. This keeps catalog matches portable
     * between Windows development and Linux/Docker.
     */
    const relativePath =
      portableRelativePath(
        libraryPath,
        fullPath
      )


    const matchedCatalogItems =
      getCatalogItemsForFile(
        category,
        relativePath
      )


    const primaryCatalogItem =
      selectPrimaryCatalogItem(
        category,
        matchedCatalogItems
      )


    const catalogItems =
      matchedCatalogItems.map(
        toLibraryCatalogItem
      )


    const linkedMemories =
      primaryCatalogItem
        ? listCatalogMemoryLinks(
            primaryCatalogItem.id
          )
            .map(
              (relationship) =>
                toLibraryCatalogItem(
                  relationship.memory
                )
            )
        : []


    const singleLinkedMemory =
      linkedMemories.length ===
        1
        ? linkedMemories[0]
        : null


    items.push({

      title:
        metadata?.displayTitle ??
        (
          primaryCatalogItem
            ? catalogDisplayTitle(
                primaryCatalogItem.canonicalName,
                character
              )
            : cleanTitle(
                entry.name
              )
        ),

      character,

      category,

      fileName:
        entry.name,

      filePath:
        fullPath,

      relativePath,

      mediaType,

      sortOrder:
        metadata?.sortOrder ??
        getSortOrder(
          entry.name
        ),

      releaseDate:
        metadata?.releaseDate ??
        primaryCatalogItem?.releaseDate ??
        null,

      thumbnailPath,

      catalogMatched:
        catalogItems.length >
        0,

      catalogItems,

      linkedMemories,

      rarity:
        primaryCatalogItem?.rarity ??
        singleLinkedMemory?.rarity ??
        null,

      position:
        primaryCatalogItem?.position ??
        singleLinkedMemory?.position ??
        null,

      attribute:
        primaryCatalogItem?.attribute ??
        singleLinkedMemory?.attribute ??
        null,

      source:
        primaryCatalogItem?.source ??
        singleLinkedMemory?.source ??
        null,

      imageUrl:
        primaryCatalogItem?.imageUrl ??
        singleLinkedMemory?.imageUrl ??
        null,

      memoryText:
        primaryCatalogItem?.memoryText ??
        null,

      memoryTextSourceUrl:
        primaryCatalogItem?.memoryTextSourceUrl ??
        null,

    })

  }


  return items

}


export async function scanCategory(
  libraryPath: string,
  category: string
): Promise<LibraryItem[]> {

  const categoryPath =
    path.join(
      libraryPath,
      category
    )


  const characterFolders =
    await fs.readdir(
      categoryPath,
      {
        withFileTypes:
          true,
      }
    )


  const results:
    LibraryItem[] =
    []


  for (
    const folder
    of characterFolders
  ) {

    if (
      !folder.isDirectory()
    ) {

      continue

    }


    const character =
      cleanCharacterName(
        folder.name
      )


    const characterPath =
      path.join(
        categoryPath,
        folder.name
      )


    const items =
      await scanFolderRecursive(
        characterPath,
        category,
        character,
        libraryPath
      )


    results.push(
      ...items
    )

  }


  results.sort(
    (
      a,
      b
    ) => {

      if (
        a.sortOrder !==
          null &&
        b.sortOrder !==
          null
      ) {

        return (
          a.sortOrder -
          b.sortOrder
        )

      }


      if (
        a.sortOrder !==
          null &&
        b.sortOrder ===
          null
      ) {

        return -1

      }


      if (
        a.sortOrder ===
          null &&
        b.sortOrder !==
          null
      ) {

        return 1

      }


      if (
        a.releaseDate &&
        b.releaseDate
      ) {

        return (
          new Date(
            a.releaseDate
          ).getTime() -
          new Date(
            b.releaseDate
          ).getTime()
        )

      }


      return a.title
        .localeCompare(
          b.title,
          undefined,
          {
            numeric:
              true,

            sensitivity:
              'base',
          }
        )

    }
  )


  return results

}