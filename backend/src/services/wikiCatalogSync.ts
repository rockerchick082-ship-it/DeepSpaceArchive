import {
  load,
} from 'cheerio'

import fs from 'node:fs/promises'
import path from 'node:path'

import {
  dataDirectory,
} from '../config/appPaths'

import {
  upsertCatalogItemFromSource,
} from '../state/metadataCatalog'

import type {
  CatalogItemInput,
} from '../state/metadataCatalog'


const wikiBaseUrl =
  'https://loveanddeepspace.wiki.gg'


const allMemoriesUrl =
  `${wikiBaseUrl}/wiki/All_Memories`


const wikiRequestMinimumDelayMs =
  1800


const wikiFallbackCooldownMs =
  60 * 1000


const artworkCachePath =
  path.join(
    dataDirectory,
    'wiki-artwork-cache.json'
  )


let lastWikiRequestAt =
  0


let wikiCooldownUntil =
  0


type ArtworkCacheEntry = {
  imageUrl: string
  sourceUrl: string
  releaseDate?: string | null
  resolvedAt: string
}


type ArtworkCacheFile = {
  version: 1
  updatedAt: string
  artwork:
    Record<
      string,
      ArtworkCacheEntry
    >
}


type FetchWikiMemoriesOptions = {
  resolveArtwork?:
    boolean

  onProgress?:
    WikiSyncProgressCallback
}


type WikiRetryCallback =
  (
    retry: {
      url: string
      attempt: number
      waitMs: number
      retryAt: number
    }
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


  const retryDate =
    Date.parse(
      value
    )


  return Number.isFinite(
    retryDate
  )
    ? retryDate
    : null

}


async function fetchWikiPage(
  url: string,
  onRetry?:
    WikiRetryCallback
) {

  let attempt =
    0


  /*
   * A 429 no longer ends the Memory sync.
   *
   * Stay on this exact URL, wait until wiki.gg says it
   * is safe to retry (or 60 seconds when Retry-After is
   * absent), then try again. There is intentionally no
   * retry-count limit: the user can start one sync and
   * leave it running through several cooldown windows.
   */
  while (
    true
  ) {

    const now =
      Date.now()


    if (
      now <
      wikiCooldownUntil
    ) {

      const waitMs =
        Math.max(
          0,
          wikiCooldownUntil -
          now
        )


      onRetry?.({
        url,

        attempt:
          attempt +
          1,

        waitMs,

        retryAt:
          wikiCooldownUntil,
      })


      /*
       * Small buffer avoids retrying a few milliseconds
       * before the server's Retry-After boundary.
       */
      await sleep(
        waitMs +
        250
      )

    }


    const requestStartedAt =
      Date.now()


    const elapsed =
      requestStartedAt -
      lastWikiRequestAt


    const waitFor =
      wikiRequestMinimumDelayMs -
      elapsed


    if (
      waitFor >
      0
    ) {

      await sleep(
        waitFor
      )

    }


    lastWikiRequestAt =
      Date.now()


    const response =
      await fetch(
        url,
        {
          headers: {
            'User-Agent':
              'DeepSpaceArchive/1.0 metadata catalog sync',
          },
        }
      )


    if (
      response.status ===
      429
    ) {

      attempt +=
        1


      const retryAt =
        parseRetryAfter(
          response.headers.get(
            'retry-after'
          )
        ) ??
        (
          Date.now() +
          wikiFallbackCooldownMs
        )


      wikiCooldownUntil =
        Math.max(
          wikiCooldownUntil,
          retryAt
        )


      const waitMs =
        Math.max(
          0,
          wikiCooldownUntil -
          Date.now()
        )


      onRetry?.({
        url,

        attempt,

        waitMs,

        retryAt:
          wikiCooldownUntil,
      })


      console.warn(
        `wiki.gg rate limit reached for ${url}. Waiting ${Math.ceil(
          waitMs /
          1000
        )} seconds, then retrying automatically (attempt ${attempt}).`
      )


      await sleep(
        waitMs +
        250
      )


      /*
       * Retry the SAME request. When it succeeds the
       * caller continues at the same Memory record.
       */
      continue

    }


    if (
      !response.ok
    ) {

      throw new Error(
        `Wiki request failed with status ${response.status}.`
      )

    }


    /*
     * A successful request clears an expired cooldown.
     */
    if (
      Date.now() >=
      wikiCooldownUntil
    ) {

      wikiCooldownUntil =
        0

    }


    return response

  }

}


async function loadArtworkCache() {

  try {

    const contents =
      await fs.readFile(
        artworkCachePath,
        'utf8'
      )


    const parsed =
      JSON.parse(
        contents
      ) as ArtworkCacheFile


    if (
      parsed.version !==
        1 ||
      !parsed.artwork
    ) {

      throw new Error(
        'Unsupported artwork cache format.'
      )

    }


    return parsed

  } catch (error) {

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
        'Unable to read wiki artwork cache; starting a new cache:',
        error
      )

    }


    return {
      version:
        1 as const,

      updatedAt:
        new Date()
          .toISOString(),

      artwork: {},
    }

  }

}


async function saveArtworkCache(
  cache:
    ArtworkCacheFile
) {

  await fs.mkdir(
    path.dirname(
      artworkCachePath
    ),
    {
      recursive:
        true,
    }
  )


  cache.updatedAt =
    new Date()
      .toISOString()


  const temporaryPath =
    `${artworkCachePath}.tmp`


  await fs.writeFile(
    temporaryPath,
    JSON.stringify(
      cache,
      null,
      2
    ),
    'utf8'
  )


  await fs.rename(
    temporaryPath,
    artworkCachePath
  )

}


export type WikiMemoryRecord = {
  canonicalName: string
  character: string
  category: 'Memory'
  rarity: number | null
  attribute: string | null
  position: string | null
  subcategory: string | null
  source: string | null
  imageUrl: string | null
  sourceName: 'wiki.gg'
  sourceUrl: string
  sourceKey: string
  sourceUpdatedAt: string
  releaseDate?: string | null
}


export type WikiSyncResult = {
  character: string
  sourceUrl: string
  fetchedAt: string
  discovered: number
  created: number
  updated: number
  skipped: number
}


export type WikiSyncProgress = {
  phase:
    | 'fetching-list'
    | 'resolving-artwork'
    | 'importing'
    | 'complete'

  current: number
  total: number
  percent: number
  message: string
}


type WikiSyncProgressCallback =
  (
    progress:
      WikiSyncProgress
  ) => void


function cleanText(
  value: string
) {

  return value
    .replace(
      /\s+/g,
      ' '
    )
    .trim()

}


function extractReleasedDate(
  value: string
) {

  const match =
    value.match(
      /\bReleased\s+on\s+(20\d{2}-\d{2}-\d{2})\b/i
    )


  return (
    match?.[1] ??
    null
  )

}


function parseRarity(
  value: string
) {

  const match =
    value.match(
      /([345])\s*[- ]?\s*Star/i
    )


  return match
    ? Number(
        match[1]
      )
    : null

}


function absoluteWikiUrl(
  value:
    string | undefined
) {

  if (
    !value
  ) {

    return null

  }


  if (
    value.startsWith(
      'http://'
    ) ||
    value.startsWith(
      'https://'
    )
  ) {

    return value

  }


  if (
    value.startsWith(
      '//'
    )
  ) {

    return `https:${value}`

  }


  if (
    value.startsWith(
      '/'
    )
  ) {

    return `${wikiBaseUrl}${value}`

  }


  return `${wikiBaseUrl}/${value}`

}


function parseCharacter(
  canonicalName: string
) {

  const colonIndex =
    canonicalName.indexOf(
      ':'
    )


  if (
    colonIndex <=
    0
  ) {

    return null

  }


  return canonicalName
    .slice(
      0,
      colonIndex
    )
    .trim()

}


function normalizeSourceKey(
  canonicalName: string
) {

  return canonicalName
    .normalize(
      'NFKD'
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


function normalizeImageSearchText(
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

}


function getMemoryNameOnly(
  canonicalName: string
) {

  const colonIndex =
    canonicalName.indexOf(
      ':'
    )


  if (
    colonIndex <
    0
  ) {

    return canonicalName

  }


  return canonicalName
    .slice(
      colonIndex +
      1
    )
    .trim()

}


function parseSrcSet(
  value:
    string | undefined
) {

  if (
    !value
  ) {

    return []

  }


  return value
    .split(
      ','
    )
    .map(
      (entry) =>
        entry
          .trim()
          .split(
            /\s+/
          )[0]
    )
    .filter(
      Boolean
    )

}


function originalMediaWikiImageUrl(
  value: string
) {

  try {

    const url =
      new URL(
        value
      )


    const thumbMarker =
      '/thumb/'


    const markerIndex =
      url.pathname.indexOf(
        thumbMarker
      )


    if (
      markerIndex <
      0
    ) {

      return value

    }


    const beforeThumb =
      url.pathname.slice(
        0,
        markerIndex
      )


    const afterThumb =
      url.pathname.slice(
        markerIndex +
        thumbMarker.length
      )


    const pieces =
      afterThumb.split(
        '/'
      )


    /*
     * MediaWiki thumbnail paths end with
     * a generated size filename such as:
     *
     * /thumb/.../Memory.png/600px-Memory.png
     *
     * Removing the final component and
     * "/thumb/" points at the original file.
     */

    if (
      pieces.length <
      2
    ) {

      return value

    }


    pieces.pop()


    url.pathname =
      `${beforeThumb}/${pieces.join(
        '/'
      )}`


    return url.toString()

  } catch {

    return value

  }

}


function scoreArtworkCandidate(
  canonicalName: string,
  source:
    string,
  altText:
    string,
  width:
    number | null
) {

  const memoryName =
    normalizeImageSearchText(
      getMemoryNameOnly(
        canonicalName
      )
    )


  const searchable =
    normalizeImageSearchText(
      `${source} ${altText}`
    )


  let score =
    0


  if (
    memoryName
  ) {

    const memoryTokens =
      memoryName
        .split(
          ' '
        )
        .filter(
          (token) =>
            token.length >
            1
        )


    const matchedTokens =
      memoryTokens.filter(
        (token) =>
          searchable.includes(
            token
          )
      ).length


    if (
      memoryTokens.length >
      0
    ) {

      const tokenRatio =
        matchedTokens /
        memoryTokens.length


      score +=
        Math.round(
          tokenRatio *
          180
        )

    }


    if (
      searchable.includes(
        memoryName
      )
    ) {

      score +=
        160

    }

  }


  if (
    searchable.includes(
      'large'
    )
  ) {

    score +=
      100

  }


  if (
    searchable.includes(
      'adjusted'
    )
  ) {

    score +=
      70

  }


  if (
    searchable.includes(
      'memory'
    ) ||
    searchable.includes(
      'memoria'
    )
  ) {

    score +=
      35

  }


  if (
    width !==
      null
  ) {

    if (
      width >=
      800
    ) {

      score +=
        80

    } else if (
      width >=
      500
    ) {

      score +=
        50

    } else if (
      width >=
      300
    ) {

      score +=
        20

    } else if (
      width <
      150
    ) {

      score -=
        80

    }

  }


  const blockedTerms = [
    'icon',
    'logo',
    'stellactrum',
    'rarity',
    'avatar',
    'discord',
    'twitter',
    'youtube',
    'wiki gg',
    'site notice',
    'loading',
  ]


  for (
    const blockedTerm
    of blockedTerms
  ) {

    if (
      searchable.includes(
        blockedTerm
      )
    ) {

      score -=
        120

    }

  }


  return score

}


async function fetchLargeMemoryArtwork(
  record:
    WikiMemoryRecord,
  cache:
    ArtworkCacheFile,
  onRetry?:
    WikiRetryCallback
) {

  if (
    !record.sourceUrl ||
    record.sourceUrl ===
      allMemoriesUrl
  ) {

    return record.imageUrl

  }


  const cached =
    cache.artwork[
      record.sourceKey
    ]


  if (
    cached &&
    cached.sourceUrl ===
      record.sourceUrl &&
    cached.imageUrl
  ) {

    if (
      !record.releaseDate &&
      cached.releaseDate
    ) {

      record.releaseDate =
        cached.releaseDate

    }


    /*
     * If the older cache entry predates release-date
     * caching, revisit the page once so we can fill
     * the missing date. Otherwise the cached artwork
     * is enough and we can avoid a wiki request.
     */
    if (
      record.releaseDate
    ) {

      return cached.imageUrl

    }

  }


  try {

    const response =
      await fetchWikiPage(
        record.sourceUrl,
        onRetry
      )


    const html =
      await response.text()


    const $ =
      load(
        html
      )


    const pageText =
      cleanText(
        $('#mw-content-text')
          .text()
      )


    const detailReleaseDate =
      extractReleasedDate(
        pageText
      )


    if (
      !record.releaseDate &&
      detailReleaseDate
    ) {

      record.releaseDate =
        detailReleaseDate

    }


    const candidates:
      Array<{
        url: string
        score: number
      }> =
      []


    $(
      '#mw-content-text img, .mw-parser-output img, main img'
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


          const altText =
            cleanText(
              [
                image.attr(
                  'alt'
                ) ??
                  '',
                image.attr(
                  'title'
                ) ??
                  '',
              ].join(
                ' '
              )
            )


          const widthValue =
            Number(
              image.attr(
                'width'
              )
            )


          const width =
            Number.isFinite(
              widthValue
            )
              ? widthValue
              : null


          const rawSources = [
            image.attr(
              'src'
            ),
            image.attr(
              'data-src'
            ),
            ...parseSrcSet(
              image.attr(
                'srcset'
              )
            ),
          ]


          for (
            const rawSource
            of rawSources
          ) {

            const absoluteSource =
              absoluteWikiUrl(
                rawSource
              )


            if (
              !absoluteSource
            ) {

              continue

            }


            const originalSource =
              originalMediaWikiImageUrl(
                absoluteSource
              )


            const score =
              scoreArtworkCandidate(
                record.canonicalName,
                originalSource,
                altText,
                width
              )


            candidates.push({
              url:
                originalSource,

              score,
            })

          }

        }
      )


    candidates.sort(
      (
        left,
        right
      ) =>
        right.score -
        left.score
    )


    const best =
      candidates[0]


    /*
     * A modest threshold prevents unrelated
     * page graphics from replacing the known
     * list thumbnail if no likely card image
     * can be identified.
     */

    if (
      !best ||
      best.score <
      120
    ) {

      return record.imageUrl

    }


    cache.artwork[
      record.sourceKey
    ] = {
      imageUrl:
        best.url,

      sourceUrl:
        record.sourceUrl,

      releaseDate:
        record.releaseDate ??
        null,

      resolvedAt:
        new Date()
          .toISOString(),
    }


    return best.url

  } catch (error) {

    console.warn(
      `Unable to resolve large artwork for ${record.canonicalName}:`,
      error
    )


    return record.imageUrl

  }

}


async function enrichArtworkWithCache(
  records:
    WikiMemoryRecord[],
  onProgress?:
    WikiSyncProgressCallback
) {

  const cache =
    await loadArtworkCache()


  const enriched:
    WikiMemoryRecord[] =
    []


  let cacheChanged =
    false


  for (
    const [
      recordIndex,
      record,
    ]
    of records.entries()
  ) {

    onProgress?.({
      phase:
        'resolving-artwork',

      current:
        recordIndex,

      total:
        records.length,

      percent:
        5 +
        Math.round(
          (
            recordIndex /
            Math.max(
              1,
              records.length
            )
          ) *
          75
        ),

      message:
        `Resolving artwork ${recordIndex + 1} of ${records.length}: ${record.canonicalName}`,
    })


    const before =
      cache.artwork[
        record.sourceKey
      ]?.imageUrl ??
      null


    const imageUrl =
      await fetchLargeMemoryArtwork(
        record,
        cache,
        (
          retry
        ) => {

          const waitSeconds =
            Math.max(
              1,
              Math.ceil(
                retry.waitMs /
                1000
              )
            )


          onProgress?.({
            phase:
              'resolving-artwork',

            current:
              recordIndex,

            total:
              records.length,

            percent:
              5 +
              Math.round(
                (
                  recordIndex /
                  Math.max(
                    1,
                    records.length
                  )
                ) *
                75
              ),

            message:
              `wiki.gg rate limit reached while reading ${record.canonicalName}. Waiting ${waitSeconds}s, then retrying automatically. The sync will resume here.`,
          })

        }
      )


    const after =
      cache.artwork[
        record.sourceKey
      ]?.imageUrl ??
      null


    if (
      before !==
      after
    ) {

      cacheChanged =
        true

    }


    enriched.push({
      ...record,
      imageUrl,
    })


    /*
     * 429 handling now occurs inside fetchWikiPage().
     * The loop reaches this point only after the same
     * Memory request has eventually succeeded (or a
     * non-rate-limit error was handled normally).
     */

  }


  if (
    cacheChanged
  ) {

    try {

      await saveArtworkCache(
        cache
      )

    } catch (error) {

      console.warn(
        'Unable to save wiki artwork cache:',
        error
      )

    }

  }


  onProgress?.({
    phase:
      'resolving-artwork',

    current:
      records.length,

    total:
      records.length,

    percent:
      80,

    message:
      `Artwork resolution complete for ${records.length} memories.`,
  })


  return enriched

}



export async function fetchWikiMemories(
  character:
    string,
  options:
    FetchWikiMemoriesOptions = {}
): Promise<WikiMemoryRecord[]> {

  options.onProgress?.({
    phase:
      'fetching-list',

    current:
      0,

    total:
      1,

    percent:
      1,

    message:
      `Loading ${character} memories from wiki.gg...`,
  })


  const response =
    await fetchWikiPage(
      allMemoriesUrl,
      (
        retry
      ) => {

        const waitSeconds =
          Math.max(
            1,
            Math.ceil(
              retry.waitMs /
              1000
            )
          )


        options.onProgress?.({
          phase:
            'fetching-list',

          current:
            0,

          total:
            1,

          percent:
            1,

          message:
            `wiki.gg rate limit reached while loading All Memories. Waiting ${waitSeconds}s, then retrying automatically.`,
        })

      }
    )


  const html =
    await response.text()


  const $ =
    load(
      html
    )


  const records:
    WikiMemoryRecord[] =
    []


  const fetchedAt =
    new Date()
      .toISOString()


  /*
   * The All Memories page exposes one
   * sortable table whose visible columns
   * include Icon, Name, Rarity,
   * Stellactrum, Position, Talent, Pair,
   * Date, and Source Type.
   *
   * We identify the correct table from
   * those headers instead of depending on
   * a generated CSS class name.
   */

  $('table').each(
    (
      _tableIndex,
      tableElement
    ) => {

      const headers =
        $(tableElement)
          .find(
            'thead th'
          )
          .map(
            (
              _headerIndex,
              headerElement
            ) =>
              cleanText(
                $(headerElement)
                  .text()
              )
          )
          .get()


      const normalizedHeaders =
        headers.map(
          (header) =>
            header.toLowerCase()
        )


      const nameIndex =
        normalizedHeaders.indexOf(
          'name'
        )


      const rarityIndex =
        normalizedHeaders.indexOf(
          'rarity'
        )


      const stellactrumIndex =
        normalizedHeaders.indexOf(
          'stellactrum'
        )


      const positionIndex =
        normalizedHeaders.indexOf(
          'position'
        )


      const talentIndex =
        normalizedHeaders.indexOf(
          'talent'
        )


      const dateIndex =
        normalizedHeaders.indexOf(
          'date'
        )


      const sourceIndex =
        normalizedHeaders.indexOf(
          'source type'
        )


      const iconIndex =
        normalizedHeaders.indexOf(
          'icon'
        )


      if (
        nameIndex <
          0 ||
        rarityIndex <
          0
      ) {

        return

      }


      $(tableElement)
        .find(
          'tbody tr'
        )
        .each(
          (
            _rowIndex,
            rowElement
          ) => {

            const cells =
              $(rowElement)
                .find(
                  ':scope > td'
                )


            if (
              cells.length ===
              0
            ) {

              return

            }


            const cellText =
              (
                index:
                  number
              ) => {

                if (
                  index <
                  0
                ) {

                  return ''

                }


                return cleanText(
                  cells
                    .eq(
                      index
                    )
                    .text()
                )

              }


            const canonicalName =
              cellText(
                nameIndex
              )


            if (
              !canonicalName
            ) {

              return

            }


            const recordCharacter =
              parseCharacter(
                canonicalName
              )


            if (
              !recordCharacter ||
              recordCharacter.toLowerCase() !==
                character.toLowerCase()
            ) {

              return

            }


            const nameCell =
              cells.eq(
                nameIndex
              )


            const sourceUrl =
              absoluteWikiUrl(
                nameCell
                  .find(
                    'a'
                  )
                  .first()
                  .attr(
                    'href'
                  )
              ) ??
              allMemoriesUrl


            const iconCell =
              iconIndex >=
                0
                ? cells.eq(
                    iconIndex
                  )
                : null


            const imageUrl =
              iconCell
                ? absoluteWikiUrl(
                    iconCell
                      .find(
                        'img'
                      )
                      .first()
                      .attr(
                        'src'
                      )
                  )
                : null


            const source =
              cellText(
                sourceIndex
              ) ||
              null


            const rawDate =
              cellText(
                dateIndex
              )


            const releaseDateMatch =
              rawDate.match(
                /\d{4}-\d{2}-\d{2}/
              )


            const rarity =
              parseRarity(
                cellText(
                  rarityIndex
                )
              )


            if (
              rarity !==
                4 &&
              rarity !==
                5
            ) {

              return

            }


            records.push({
              canonicalName,

              character:
                recordCharacter,

              category:
                'Memory',

              rarity,

              attribute:
                cellText(
                  stellactrumIndex
                ) ||
                null,

              position:
                cellText(
                  positionIndex
                ) ||
                null,

              subcategory:
                cellText(
                  talentIndex
                ) ||
                null,

              source,

              imageUrl,

              sourceName:
                'wiki.gg',

              sourceUrl,

              sourceKey:
                `memory:${normalizeSourceKey(
                  canonicalName
                )}`,

              sourceUpdatedAt:
                fetchedAt,

              ...(releaseDateMatch
                ? {
                    releaseDate:
                      releaseDateMatch[0],
                  }
                : {}),
            } as WikiMemoryRecord

            )

          }
        )

    }
  )


  const unique =
    new Map<
      string,
      WikiMemoryRecord
    >()


  for (
    const record
    of records
  ) {

    unique.set(
      record.sourceKey,
      record
    )

  }


  const uniqueRecords = [
    ...unique.values(),
  ]


  if (
    !options.resolveArtwork
  ) {

    options.onProgress?.({
      phase:
        'fetching-list',

      current:
        1,

      total:
        1,

      percent:
        100,

      message:
        `Found ${uniqueRecords.length} eligible ${character} memories.`,
    })


    /*
     * Preview stays lightweight: one request
     * to All Memories and no individual card
     * page requests.
     */

    return uniqueRecords

  }


  options.onProgress?.({
    phase:
      'fetching-list',

    current:
      1,

    total:
      1,

    percent:
      5,

    message:
      `Found ${uniqueRecords.length} eligible ${character} memories.`,
  })


  return enrichArtworkWithCache(
    uniqueRecords,
    options.onProgress
  )

}


export async function syncWikiMemories(
  character:
    string,
  onProgress?:
    WikiSyncProgressCallback
): Promise<WikiSyncResult> {

  const records =
    await fetchWikiMemories(
      character,
      {
        resolveArtwork:
          true,

        onProgress,
      }
    )


  let created =
    0


  let updated =
    0


  let skipped =
    0


  for (
    const [
      recordIndex,
      record,
    ]
    of records.entries()
  ) {

    onProgress?.({
      phase:
        'importing',

      current:
        recordIndex,

      total:
        records.length,

      percent:
        80 +
        Math.round(
          (
            recordIndex /
            Math.max(
              1,
              records.length
            )
          ) *
          19
        ),

      message:
        `Updating catalog ${recordIndex + 1} of ${records.length}: ${record.canonicalName}`,
    })


    const input:
      CatalogItemInput = {

      canonicalName:
        record.canonicalName,

      character:
        record.character,

      category:
        record.category,

      releaseDate:
        record.releaseDate ??
        null,

      rarity:
        record.rarity,

      position:
        record.position,

      attribute:
        record.attribute,

      subcategory:
        record.subcategory,

      source:
        record.source,

      imageUrl:
        record.imageUrl,

      sourceName:
        record.sourceName,

      sourceUrl:
        record.sourceUrl,

      sourceKey:
        record.sourceKey,

      sourceUpdatedAt:
        record.sourceUpdatedAt,
    }


    try {

      const result =
        upsertCatalogItemFromSource(
          input
        )


      if (
        result.created
      ) {

        created +=
          1

      } else if (
        result.updated
      ) {

        updated +=
          1

      } else {

        skipped +=
          1

      }

    } catch (error) {

      console.error(
        `Unable to import ${record.canonicalName}:`,
        error
      )


      skipped +=
        1

    }

  }


  const result = {
    character,

    sourceUrl:
      allMemoriesUrl,

    fetchedAt:
      new Date()
        .toISOString(),

    discovered:
      records.length,

    created,

    updated,

    skipped,
  }


  onProgress?.({
    phase:
      'complete',

    current:
      records.length,

    total:
      records.length,

    percent:
      100,

    message:
      `Sync complete: ${created} created, ${updated} updated, ${skipped} skipped.`,
  })


  return result

}