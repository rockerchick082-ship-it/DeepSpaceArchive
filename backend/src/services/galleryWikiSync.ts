import fs from 'node:fs/promises'
import path from 'node:path'

import {
  load,
} from 'cheerio'

import {
  getGalleryWikiSources,
} from './galleryWikiSettings'

import type {
  GalleryWikiSource,
} from './galleryWikiSettings'


const requestDelayMs =
  1800


let lastRequestAt =
  0


let cooldownUntil =
  0


const fallbackCooldownMs =
  60 * 1000


export type GalleryWikiSyncProgress = {
  phase:
    | 'loading-category'
    | 'resolving-images'
    | 'downloading'
    | 'complete'

  current: number
  total: number
  percent: number
  message: string
}


export type GalleryWikiSyncResult = {
  character: string
  sourceUrl: string

  discovered: number
  downloaded: number
  skippedExisting: number
  failed: number

  localCount: number
}


type ProgressCallback =
  (
    progress:
      GalleryWikiSyncProgress
  ) => void


function sleep(
  milliseconds:
    number
) {

  return new Promise<void>(
    (resolve) => {

      setTimeout(
        resolve,
        milliseconds
      )

    }
  )

}


function parseRetryAfter(
  value:
    string | null
) {

  if (
    !value
  ) {

    return null

  }


  const seconds =
    Number(
      value
    )


  if (
    Number.isFinite(
      seconds
    ) &&
    seconds >=
      0
  ) {

    return Date.now() +
      (
        seconds *
        1000
      )

  }


  const date =
    Date.parse(
      value
    )


  return Number.isFinite(
    date
  )
    ? date
    : null

}


async function wikiFetch(
  url:
    string
) {

  const now =
    Date.now()


  if (
    now <
    cooldownUntil
  ) {

    throw new Error(
      'wiki.gg is temporarily rate-limited. Try again after the cooldown.'
    )

  }


  const elapsed =
    now -
    lastRequestAt


  const delay =
    requestDelayMs -
    elapsed


  if (
    delay >
    0
  ) {

    await sleep(
      delay
    )

  }


  lastRequestAt =
    Date.now()


  const response =
    await fetch(
      url,
      {
        headers: {
          'User-Agent':
            'DeepSpaceArchive/1.0 gallery image sync',
        },
      }
    )


  if (
    response.status ===
    429
  ) {

    cooldownUntil =
      parseRetryAfter(
        response.headers.get(
          'retry-after'
        )
      ) ??
      (
        Date.now() +
        fallbackCooldownMs
      )


    throw new Error(
      'wiki.gg rate limit reached. Sync stopped and cooldown started.'
    )

  }


  if (
    !response.ok
  ) {

    throw new Error(
      `Wiki request failed with status ${response.status}.`
    )

  }


  return response

}


function absoluteUrl(
  baseUrl:
    string,
  value:
    string | undefined
) {

  if (
    !value
  ) {

    return null

  }


  try {

    return new URL(
      value,
      baseUrl
    )
      .toString()

  } catch {

    return null

  }

}


function originalMediaWikiImageUrl(
  value:
    string
) {

  try {

    const url =
      new URL(
        value
      )


    const marker =
      '/thumb/'


    const index =
      url.pathname.indexOf(
        marker
      )


    if (
      index <
      0
    ) {

      return value

    }


    const before =
      url.pathname.slice(
        0,
        index
      )


    const after =
      url.pathname.slice(
        index +
        marker.length
      )


    const pieces =
      after.split(
        '/'
      )


    if (
      pieces.length <
      2
    ) {

      return value

    }


    pieces.pop()


    url.pathname =
      `${before}/${pieces.join(
        '/'
      )}`


    return url.toString()

  } catch {

    return value

  }

}


function safeFileName(
  value:
    string
) {

  return value
    .replace(
      /[<>:"/\\|?*\x00-\x1F]/g,
      '_'
    )
    .replace(
      /\s+/g,
      ' '
    )
    .trim()

}


async function pathExists(
  value:
    string
) {

  try {

    await fs.access(
      value
    )


    return true

  } catch {

    return false

  }

}


function extensionFromUrl(
  url:
    string
) {

  try {

    const parsed =
      new URL(
        url
      )


    const extension =
      path
        .extname(
          decodeURIComponent(
            parsed.pathname
          )
        )
        .toLowerCase()


    if (
      [
        '.jpg',
        '.jpeg',
        '.png',
        '.webp',
        '.gif',
        '.avif',
      ].includes(
        extension
      )
    ) {

      return extension

    }

  } catch {

    // Fall through.
  }


  return '.jpg'

}


function imageNameFromUrl(
  url:
    string
) {

  try {

    const parsed =
      new URL(
        url
      )


    const base =
      path.basename(
        decodeURIComponent(
          parsed.pathname
        )
      )


    return safeFileName(
      base
    )

  } catch {

    return (
      `memory-image${extensionFromUrl(
        url
      )}`
    )

  }

}


async function discoverCategoryImages(
  source:
    GalleryWikiSource
) {

  const response =
    await wikiFetch(
      source.url
    )


  const html =
    await response.text()


  const $ =
    load(
      html
    )


  const images =
    new Map<
      string,
      string
    >()


  $(
    '#mw-content-text img, .mw-category-generated img, .gallery img, .mw-parser-output img'
  )
    .each(
      (
        _index,
        element
      ) => {

        const image =
          $(
            element
          )


        const sources = [
          image.attr(
            'src'
          ),
          image.attr(
            'data-src'
          ),
        ]


        for (
          const rawSource
          of sources
        ) {

          const absolute =
            absoluteUrl(
              source.url,
              rawSource
            )


          if (
            !absolute
          ) {

            continue

          }


          const original =
            originalMediaWikiImageUrl(
              absolute
            )


          const lower =
            original
              .toLowerCase()


          if (
            lower.includes(
              'logo'
            ) ||
            lower.includes(
              'avatar'
            ) ||
            lower.includes(
              'icon'
            )
          ) {

            continue

          }


          images.set(
            original,
            original
          )

        }

      }
    )


  return [
    ...images.values(),
  ]

}


async function countLocalFiles(
  directory:
    string
) {

  if (
    !await pathExists(
      directory
    )
  ) {

    return 0

  }


  const entries =
    await fs.readdir(
      directory,
      {
        withFileTypes:
          true,
      }
    )


  return entries
    .filter(
      (entry) =>
        entry.isFile()
    )
    .length

}


export async function syncGalleryWikiImages(
  libraryRoot:
    string,
  character:
    GalleryWikiSource['character'],
  onProgress?:
    ProgressCallback
): Promise<GalleryWikiSyncResult> {

  const sources =
    await getGalleryWikiSources()


  const source =
    sources.find(
      (entry) =>
        entry.character ===
        character
    )


  if (
    !source ||
    !source.url.trim()
  ) {

    throw new Error(
      `No wiki image source is configured for ${character}.`
    )

  }


  onProgress?.({
    phase:
      'loading-category',

    current:
      0,

    total:
      1,

    percent:
      2,

    message:
      `Loading ${character} Memory image category...`,
  })


  const images =
    await discoverCategoryImages(
      source
    )


  onProgress?.({
    phase:
      'resolving-images',

    current:
      images.length,

    total:
      images.length,

    percent:
      10,

    message:
      `Found ${images.length} full-size image URLs.`,
  })


  const destination =
    path.join(
      libraryRoot,
      'Gallery',
      character,
      'Memory Images'
    )


  await fs.mkdir(
    destination,
    {
      recursive:
        true,
    }
  )


  let downloaded =
    0


  let skippedExisting =
    0


  let failed =
    0


  for (
    const [
      index,
      imageUrl,
    ]
    of images.entries()
  ) {

    onProgress?.({
      phase:
        'downloading',

      current:
        index,

      total:
        images.length,

      percent:
        10 +
        Math.round(
          (
            index /
            Math.max(
              1,
              images.length
            )
          ) *
          89
        ),

      message:
        `Syncing image ${index + 1} of ${images.length}`,
    })


    const fileName =
      imageNameFromUrl(
        imageUrl
      )


    const filePath =
      path.join(
        destination,
        fileName
      )


    if (
      await pathExists(
        filePath
      )
    ) {

      skippedExisting +=
        1


      continue

    }


    try {

      const response =
        await wikiFetch(
          imageUrl
        )


      const bytes =
        Buffer.from(
          await response.arrayBuffer()
        )


      await fs.writeFile(
        filePath,
        bytes
      )


      downloaded +=
        1

    } catch (error) {

      console.error(
        `Unable to download ${imageUrl}:`,
        error
      )


      failed +=
        1


      if (
        Date.now() <
        cooldownUntil
      ) {

        break

      }

    }

  }


  const localCount =
    await countLocalFiles(
      destination
    )


  const result = {

    character,

    sourceUrl:
      source.url,

    discovered:
      images.length,

    downloaded,

    skippedExisting,

    failed,

    localCount,

  }


  onProgress?.({
    phase:
      'complete',

    current:
      images.length,

    total:
      images.length,

    percent:
      100,

    message:
      `${character} sync complete. ${localCount} local images.`,
  })


  return result

}