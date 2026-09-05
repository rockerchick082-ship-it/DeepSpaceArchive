import {
  load,
} from 'cheerio'

import {
  findCatalogItemByCharacterAndName,
  updateCatalogItem,
  upsertCatalogItemFromSource,
} from '../state/metadataCatalog'

import type {
  CatalogItem,
  CatalogItemInput,
} from '../state/metadataCatalog'


/*
 * ========================================
 * PHONE METADATA SOURCE
 * ========================================
 *
 * wiki.gg Phone / All is the ONLY source used by
 * the phone metadata sync.
 *
 * Source columns map to the archive as follows:
 *
 *   Characters       -> character
 *   Item             -> canonicalName
 *   Interaction Type -> category
 *
 * Interaction Type mapping:
 *
 *   Voice Call -> Phone Call
 *   Video Call -> Phone Video
 *
 * No secondary or fallback wiki is used.
 */

const wikiBaseUrl =
  'https://loveanddeepspace.wiki.gg'


const wikiPhoneAllUrl =
  `${wikiBaseUrl}/wiki/Phone/All`


const requestMinimumDelayMs =
  1800


const requestTimeoutMs =
  15000


let lastRequestAt =
  0


type PhoneCallKind =
  | 'voice'
  | 'video'


type PhoneSourceName =
  'wiki.gg'


const companionNames = [
  'Xavier',
  'Zayne',
  'Rafayel',
  'Sylus',
  'Caleb',
] as const


export type WikiPhoneRecord = {
  canonicalName: string
  character: string

  category:
    | 'Phone Call'
    | 'Phone Video'

  releaseDate: string | null

  sourceName:
    PhoneSourceName

  sourceUrl: string
  sourceKey: string
  sourceUpdatedAt: string
}


export type WikiPhonePreview = {
  character: string
  fetchedAt: string

  voiceCalls:
    WikiPhoneRecord[]

  videoCalls:
    WikiPhoneRecord[]

  total: number

  sources: {
    wikiGG: number
  }
}


export type WikiPhoneSyncResult = {
  character: string
  fetchedAt: string

  discovered: number
  created: number
  updated: number
  skipped: number

  voiceCalls: number
  videoCalls: number

  sources: {
    wikiGG: number
  }
}


type PhoneTableColumns = {
  character: number
  item: number
  interactionType: number
  releaseDate: number | null
}


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


async function fetchPhoneSource(
  url: string
) {

  const now =
    Date.now()


  const elapsed =
    now -
    lastRequestAt


  const waitFor =
    requestMinimumDelayMs -
    elapsed


  if (
    lastRequestAt >
      0 &&
    waitFor >
      0
  ) {

    await sleep(
      waitFor
    )

  }


  lastRequestAt =
    Date.now()


  const controller =
    new AbortController()


  const timeout =
    setTimeout(
      () => {

        controller.abort()

      },
      requestTimeoutMs
    )


  let response:
    Response


  try {

    response =
      await fetch(
        url,
        {
          redirect:
            'follow',

          signal:
            controller.signal,

          headers: {
            'User-Agent':
              'DeepSpaceArchive/1.0 phone metadata catalog sync',
          },
        }
      )

  } catch (error) {

    if (
      error instanceof
        Error &&
      error.name ===
        'AbortError'
    ) {

      throw new Error(
        `Phone wiki request timed out after ${Math.round(
          requestTimeoutMs /
          1000
        )} seconds for ${url}.`
      )

    }


    throw error

  } finally {

    clearTimeout(
      timeout
    )

  }


  if (
    response.status ===
    429
  ) {

    const retryAfter =
      response.headers.get(
        'retry-after'
      )


    throw new Error(
      retryAfter
        ? `wiki.gg phone rate limit reached. Retry after ${retryAfter}.`
        : 'wiki.gg phone rate limit reached. Try again later.'
    )

  }


  if (
    !response.ok
  ) {

    throw new Error(
      `wiki.gg Phone / All request failed with status ${response.status}.`
    )

  }


  return response

}


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


function normalizeText(
  value: string
) {

  return value
    .normalize(
      'NFKD'
    )
    .toLowerCase()
    .replace(
      /['’]/g,
      ''
    )
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


function normalizeSourceKey(
  value: string
) {

  return normalizeText(
    value
  )
    .replace(
      /\s+/g,
      '-'
    )

}


function escapeRegExp(
  value: string
) {

  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  )

}


function stripCharacterPrefix(
  value: string,
  character: string
) {

  const cleaned =
    cleanText(
      value
    )


  const prefixPattern =
    new RegExp(
      `^${escapeRegExp(
        character
      )}\\s*:\\s*`,
      'i'
    )


  return cleanText(
    cleaned.replace(
      prefixPattern,
      ''
    )
  )

}


function stripCallSuffix(
  value: string
) {

  return cleanText(
    value.replace(
      /\s*\((?:Voice|Video|Phone)\s+Call\)\s*$/i,
      ''
    )
  )

}


function absoluteUrl(
  href:
    string | undefined
) {

  if (
    !href
  ) {

    return null

  }


  try {

    return new URL(
      href,
      wikiBaseUrl
    )
      .toString()

  } catch {

    return null

  }

}


function extractReleaseDate(
  value: string
) {

  const isoDate =
    value.match(
      /\b(20\d{2}-\d{2}-\d{2})\b/
    )


  return (
    isoDate?.[1] ??
    null
  )

}


function canonicalCharacter(
  value: string
) {

  const normalized =
    normalizeText(
      value
    )


  for (
    const character
    of companionNames
  ) {

    const characterPattern =
      new RegExp(
        `(?:^|\\s)${normalizeText(
          character
        )}(?:$|\\s)`
      )


    if (
      characterPattern.test(
        normalized
      )
    ) {

      return character

    }

  }


  return null

}


function phoneKindFromInteractionType(
  value: string
): PhoneCallKind | null {

  const normalized =
    normalizeText(
      value
    )


  if (
    normalized.includes(
      'video call'
    ) ||
    normalized.includes(
      'phone video'
    )
  ) {

    return 'video'

  }


  if (
    normalized.includes(
      'voice call'
    ) ||
    normalized.includes(
      'phone call'
    )
  ) {

    return 'voice'

  }


  return null

}


function phoneCategory(
  kind:
    PhoneCallKind
): WikiPhoneRecord['category'] {

  return kind ===
    'voice'
    ? 'Phone Call'
    : 'Phone Video'

}


function phoneSourceKey(
  character: string,
  kind:
    PhoneCallKind,
  canonicalName:
    string
) {

  return (
    `phone:${kind}:${normalizeSourceKey(
      character
    )}:${normalizeSourceKey(
      canonicalName
    )}`
  )

}


function tableColumns(
  headers:
    string[]
): PhoneTableColumns | null {

  const normalizedHeaders =
    headers.map(
      normalizeText
    )


  const findHeader = (
    names:
      string[]
  ) =>
    normalizedHeaders.findIndex(
      (header) =>
        names.includes(
          header
        )
    )


  const character =
    findHeader([
      'character',
      'characters',
    ])


  const item =
    findHeader([
      'item',
      'interaction name',
    ])


  const interactionType =
    findHeader([
      'interaction type',
      'type',
    ])


  const releaseDate =
    findHeader([
      'release date',
      'released',
      'date',
    ])


  if (
    character <
      0 ||
    item <
      0 ||
    interactionType <
      0
  ) {

    return null

  }


  return {
    character,
    item,
    interactionType,
    releaseDate:
      releaseDate >=
        0
        ? releaseDate
        : null,
  }

}


function cellText(
  $:
    ReturnType<
      typeof load
    >,
  cell:
    ReturnType<
      typeof $
    >
) {

  const text =
    cleanText(
      cell.text()
    )


  if (
    text
  ) {

    return text

  }


  const titledText =
    cleanText(
      cell
        .find(
          'a[title], [title]'
        )
        .map(
          (
            _index,
            element
          ) =>
            $(
              element
            )
              .attr(
                'title'
              ) ??
            ''
        )
        .get()
        .join(
          ' '
        )
    )


  if (
    titledText
  ) {

    return titledText

  }


  return cleanText(
    cell
      .find(
        'img[alt]'
      )
      .map(
        (
          _index,
          element
        ) =>
          $(
            element
          )
            .attr(
              'alt'
            ) ??
          ''
      )
      .get()
      .join(
        ' '
      )
  )

}


function parseWikiGGPhoneAll(
  html: string,
  selectedCharacter:
    string,
  fetchedAt:
    string
) {

  const $ =
    load(
      html
    )


  const wantedCharacter =
    canonicalCharacter(
      selectedCharacter
    ) ??
    cleanText(
      selectedCharacter
    )


  const records =
    new Map<
      string,
      WikiPhoneRecord
    >()


  let recognizedTable =
    false


  $(
    'table'
  )
    .each(
      (
        _tableIndex,
        tableElement
      ) => {

        const table =
          $(
            tableElement
          )


        const rows =
          table.find(
            'tr'
          )


        if (
          rows.length ===
          0
        ) {

          return

        }


        let headerRowIndex =
          -1


        let columns:
          PhoneTableColumns |
          null =
          null


        const rowElements =
          rows.toArray()


        for (
          let rowIndex =
            0;
          rowIndex <
            rowElements.length;
          rowIndex +=
            1
        ) {

          const rowElement =
            rowElements[
              rowIndex
            ]


          const headerCells =
            $(
              rowElement
            )
              .children(
                'th, td'
              )


          const headers =
            headerCells
              .map(
                (
                  _cellIndex,
                  cellElement
                ) =>
                  cellText(
                    $,
                    $(
                      cellElement
                    )
                  )
              )
              .get()


          const detected =
            tableColumns(
              headers
            )


          if (
            detected
          ) {

            headerRowIndex =
              rowIndex

            columns =
              detected

            break

          }

        }


        if (
          !columns ||
          headerRowIndex <
            0
        ) {

          return

        }


        recognizedTable =
          true


        const rowColumns =
          columns


        rows
          .slice(
            headerRowIndex +
            1
          )
          .each(
            (
              _rowIndex,
              rowElement
            ) => {

              const cells =
                $(
                  rowElement
                )
                  .children(
                    'th, td'
                  )


              const requiredIndex =
                Math.max(
                  rowColumns.character,
                  rowColumns.item,
                  rowColumns.interactionType
                )


              if (
                cells.length <=
                requiredIndex
              ) {

                return

              }


              const characterCell =
                cells.eq(
                  rowColumns.character
                )


              const itemCell =
                cells.eq(
                  rowColumns.item
                )


              const typeCell =
                cells.eq(
                  rowColumns.interactionType
                )


              const rowCharacter =
                canonicalCharacter(
                  cellText(
                    $,
                    characterCell
                  )
                )


              if (
                !rowCharacter ||
                normalizeText(
                  rowCharacter
                ) !==
                normalizeText(
                  wantedCharacter
                )
              ) {

                return

              }


              const kind =
                phoneKindFromInteractionType(
                  cellText(
                    $,
                    typeCell
                  )
                )


              if (
                !kind
              ) {

                return

              }


              const canonicalName =
                stripCallSuffix(
                  stripCharacterPrefix(
                    cellText(
                      $,
                      itemCell
                    ),
                    rowCharacter
                  )
                )


              if (
                !canonicalName
              ) {

                return

              }


              const itemHref =
                itemCell
                  .find(
                    'a[href]'
                  )
                  .first()
                  .attr(
                    'href'
                  )


              const sourceUrl =
                absoluteUrl(
                  itemHref
                ) ??
                wikiPhoneAllUrl


              const releaseDate =
                rowColumns.releaseDate !==
                  null &&
                cells.length >
                  rowColumns.releaseDate
                  ? extractReleaseDate(
                      cellText(
                        $,
                        cells.eq(
                          rowColumns.releaseDate
                        )
                      )
                    )
                  : null


              const sourceKey =
                phoneSourceKey(
                  rowCharacter,
                  kind,
                  canonicalName
                )


              records.set(
                sourceKey,
                {
                  canonicalName,
                  character:
                    rowCharacter,
                  category:
                    phoneCategory(
                      kind
                    ),
                  releaseDate,
                  sourceName:
                    'wiki.gg',
                  sourceUrl,
                  sourceKey,
                  sourceUpdatedAt:
                    fetchedAt,
                }
              )

            }
          )

      }
    )


  if (
    !recognizedTable
  ) {

    throw new Error(
      'wiki.gg Phone / All did not contain a table with Characters, Item, and Interaction Type columns.'
    )

  }


  const allRecords = [
    ...records.values(),
  ]
    .sort(
      (
        left,
        right
      ) =>
        left.canonicalName
          .localeCompare(
            right.canonicalName
          )
    )


  return {
    voiceCalls:
      allRecords.filter(
        (record) =>
          record.category ===
          'Phone Call'
      ),

    videoCalls:
      allRecords.filter(
        (record) =>
          record.category ===
          'Phone Video'
      ),
  }

}


function fullInputFromExistingPhone(
  existing:
    CatalogItem,
  record:
    WikiPhoneRecord
): CatalogItemInput {

  return {
    canonicalName:
      record.canonicalName,

    character:
      record.character,

    category:
      record.category,

    subcategory:
      existing.subcategory,

    /*
     * Phone / All may not expose a release date for
     * every row. Never erase an existing one.
     */
    releaseDate:
      record.releaseDate ??
      existing.releaseDate,

    rarity:
      existing.rarity,

    position:
      existing.position,

    attribute:
      existing.attribute,

    source:
      existing.source,

    imageUrl:
      existing.imageUrl,

    sourceName:
      record.sourceName,

    sourceUrl:
      record.sourceUrl,

    sourceKey:
      record.sourceKey,

    sourceUpdatedAt:
      record.sourceUpdatedAt,

    manualNotes:
      existing.manualNotes,

    memoryText:
      existing.memoryText,

    memoryTextSourceUrl:
      existing.memoryTextSourceUrl,
  }

}


export async function fetchWikiPhoneCalls(
  character: string
): Promise<WikiPhonePreview> {

  const fetchedAt =
    new Date()
      .toISOString()


  const response =
    await fetchPhoneSource(
      wikiPhoneAllUrl
    )


  const html =
    await response.text()


  const parsed =
    parseWikiGGPhoneAll(
      html,
      character,
      fetchedAt
    )


  const total =
    parsed.voiceCalls.length +
    parsed.videoCalls.length


  if (
    total ===
    0
  ) {

    throw new Error(
      `No Voice Calls or Video Calls could be discovered for ${character} from wiki.gg Phone / All.`
    )

  }


  return {
    character,
    fetchedAt,
    voiceCalls:
      parsed.voiceCalls,
    videoCalls:
      parsed.videoCalls,
    total,
    sources: {
      wikiGG:
        total,
    },
  }

}


export async function syncWikiPhoneCalls(
  character: string
): Promise<WikiPhoneSyncResult> {

  const preview =
    await fetchWikiPhoneCalls(
      character
    )


  const records = [
    ...preview.voiceCalls,
    ...preview.videoCalls,
  ]


  let created =
    0


  let updated =
    0


  let skipped =
    0


  for (
    const record
    of records
  ) {

    try {

      /*
       * Match by character + item name + archive
       * category first. This preserves existing IDs,
       * manual notes, and file matches while changing
       * the metadata source to wiki.gg Phone / All.
       */
      const existing =
        findCatalogItemByCharacterAndName(
          record.character,
          record.canonicalName,
          record.category
        )


      if (
        existing
      ) {

        const refreshed =
          updateCatalogItem(
            existing.id,
            fullInputFromExistingPhone(
              existing,
              record
            )
          )


        if (
          refreshed
        ) {

          updated +=
            1

        } else {

          skipped +=
            1

        }


        continue

      }


      const input:
        CatalogItemInput = {

        canonicalName:
          record.canonicalName,

        character:
          record.character,

        category:
          record.category,

        releaseDate:
          record.releaseDate,

        sourceName:
          record.sourceName,

        sourceUrl:
          record.sourceUrl,

        sourceKey:
          record.sourceKey,

        sourceUpdatedAt:
          record.sourceUpdatedAt,
      }


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
        `Unable to import phone record ${record.canonicalName}:`,
        error
      )


      skipped +=
        1

    }

  }


  return {
    character:
      preview.character,

    fetchedAt:
      preview.fetchedAt,

    discovered:
      records.length,

    created,

    updated,

    skipped,

    voiceCalls:
      preview.voiceCalls.length,

    videoCalls:
      preview.videoCalls.length,

    sources:
      preview.sources,
  }

}
