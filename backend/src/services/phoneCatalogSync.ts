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
 * PHONE METADATA SOURCES
 * ========================================
 *
 * Primary:
 *   wiki.gg Phone Calls
 *
 * Backup:
 *   lads.wiki Calls
 *
 * Tertiary backup:
 *   lads.wiki Video Call category
 *   lads.wiki Voice Call category
 *
 * The lads.wiki Calls page can contain both Voice
 * and Video calls, so the category pages are only
 * fetched if the Calls page fails to produce one
 * of the two call types for the selected character.
 */

const wikiBaseUrl =
  'https://loveanddeepspace.wiki.gg'


const wikiPhoneCallsUrl =
  `${wikiBaseUrl}/wiki/Phone_Calls`


const ladsBaseUrl =
  'https://lads.wiki'


const ladsCallsUrl =
  `${ladsBaseUrl}/wiki/Calls`


const ladsVideoCategoryUrl =
  `${ladsBaseUrl}/wiki/Category:Video_Call`


const ladsVoiceCategoryUrl =
  `${ladsBaseUrl}/wiki/Category:Voice_Call`


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
  | 'wiki.gg'
  | 'lads.wiki'


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
    ladsCalls: number
    ladsCategories: number
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
    ladsCalls: number
    ladsCategories: number
  }
}


type ParsedPhoneTitle = {
  canonicalName: string
  character: string
  kind: PhoneCallKind
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
        ? `Phone wiki rate limit reached. Retry after ${retryAfter}.`
        : 'Phone wiki rate limit reached. Try again later.'
    )

  }


  if (
    !response.ok
  ) {

    throw new Error(
      `Phone wiki request failed with status ${response.status} for ${url}.`
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


function escapeRegExp(
  value: string
) {

  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  )

}


function absoluteUrl(
  href:
    string | undefined,
  baseUrl:
    string
) {

  if (
    !href
  ) {

    return null

  }


  try {

    return new URL(
      href,
      baseUrl
    )
      .toString()

  } catch {

    return null

  }

}


function pageTitleFromHref(
  href: string,
  baseUrl: string
) {

  try {

    const url =
      new URL(
        href,
        baseUrl
      )


    const wikiIndex =
      url.pathname.indexOf(
        '/wiki/'
      )


    if (
      wikiIndex <
      0
    ) {

      return ''

    }


    return decodeURIComponent(
      url.pathname.slice(
        wikiIndex +
        '/wiki/'.length
      )
    )
      .replace(
        /_/g,
        ' '
      )
      .replace(
        /#.*$/,
        ''
      )

  } catch {

    return ''

  }

}


function extractReleaseDate(
  value: string
) {

  /*
   * Use explicit release wording first so unrelated
   * dates elsewhere on a wiki page are not selected.
   */
  const released =
    value.match(
      /\bReleased\s+(?:on\s+)?(20\d{2}-\d{2}-\d{2})\b/i
    )


  if (
    released?.[1]
  ) {

    return released[1]

  }


  const generic =
    value.match(
      /\b(20\d{2}-\d{2}-\d{2})\b/
    )


  return (
    generic?.[1] ??
    null
  )

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

  /*
   * The source key deliberately does NOT contain the
   * wiki provider. A call discovered from a backup
   * source represents the same catalog identity as a
   * call discovered from wiki.gg.
   */
  return (
    `phone:${kind}:${normalizeSourceKey(
      character
    )}:${normalizeSourceKey(
      canonicalName
    )}`
  )

}


function parseWikiGGPhoneTitle(
  title: string
): {
  canonicalName: string
  kind: PhoneCallKind
} | null {

  const match =
    cleanText(
      title
    )
      .match(
        /^(.*?)\s*\((Voice|Video)\s+Call\)\s*$/i
      )


  if (
    !match
  ) {

    return null

  }


  return {
    canonicalName:
      cleanText(
        match[1]
      ),

    kind:
      match[2]
        .toLowerCase() ===
        'voice'
        ? 'voice'
        : 'video',
  }

}


function parseLadsPhoneTitle(
  title: string
): ParsedPhoneTitle | null {

  /*
   * lads.wiki / the historical Love and Deepspace
   * wiki names call pages like:
   *
   *   The Bird (Rafayel Video Call)
   *   <Title> (Caleb Voice Call)
   *
   * This gives us title, character, and call type
   * directly from the page identity.
   */
  const match =
    cleanText(
      title
    )
      .match(
        /^(.*?)\s*\((Xavier|Zayne|Rafayel|Sylus|Caleb)\s+(Voice|Video)\s+Call\)\s*$/i
      )


  if (
    !match
  ) {

    return null

  }


  const character =
    match[2]
      .slice(
        0,
        1
      )
      .toUpperCase() +
    match[2]
      .slice(
        1
      )
      .toLowerCase()


  return {
    canonicalName:
      cleanText(
        match[1]
      ),

    character,

    kind:
      match[3]
        .toLowerCase() ===
        'voice'
        ? 'voice'
        : 'video',
  }

}


function sectionHeadingText(
  character: string,
  kind:
    PhoneCallKind
) {

  return normalizeText(
    `${character}'s ${
      kind ===
        'voice'
        ? 'Voice Calls'
        : 'Video Calls'
    }`
  )

}


function headingLevel(
  value: string
) {

  const match =
    value.match(
      /^h([1-6])$/i
    )


  return match
    ? Number(
        match[1]
      )
    : null

}


function findSectionHeading(
  $:
    ReturnType<
      typeof load
    >,
  character:
    string,
  kind:
    PhoneCallKind
) {

  const wanted =
    sectionHeadingText(
      character,
      kind
    )


  return $(
    'h1, h2, h3, h4, h5, h6'
  )
    .filter(
      (
        _index,
        element
      ) =>
        normalizeText(
          $(
            element
          )
            .text()
        ) ===
        wanted
    )
    .first()

}


function smallestWikiGGCallContainer(
  $:
    ReturnType<
      typeof load
    >,
  anchor:
    ReturnType<
      typeof $
    >
) {

  let current =
    anchor.parent()


  for (
    let depth =
      0;
    depth <
      8 &&
    current.length >
      0;
    depth +=
      1
  ) {

    const text =
      cleanText(
        current.text()
      )


    const callLinks =
      current
        .find(
          'a[href*="/wiki/"]'
        )
        .filter(
          (
            _index,
            element
          ) => {

            const href =
              $(
                element
              )
                .attr(
                  'href'
                )


            if (
              !href
            ) {

              return false

            }


            return Boolean(
              parseWikiGGPhoneTitle(
                pageTitleFromHref(
                  href,
                  wikiBaseUrl
                )
              )
            )

          }
        )


    if (
      callLinks.length ===
        1 &&
      extractReleaseDate(
        text
      )
    ) {

      return current

    }


    current =
      current.parent()

  }


  return anchor.parent()

}


function parseWikiGGSection(
  $:
    ReturnType<
      typeof load
    >,
  character:
    string,
  expectedKind:
    PhoneCallKind,
  fetchedAt:
    string
): WikiPhoneRecord[] {

  const heading =
    findSectionHeading(
      $,
      character,
      expectedKind
    )


  if (
    heading.length ===
    0
  ) {

    return []

  }


  const headingNode =
    heading.get(
      0
    ) as
      | {
          name?: string
        }
      | undefined


  const level =
    headingLevel(
      headingNode?.name ??
      ''
    ) ??
    3


  const records =
    new Map<
      string,
      WikiPhoneRecord
    >()


  for (
    const element
    of heading
      .nextAll()
      .toArray()
  ) {

    const elementName =
      (
        element as {
          name?: string
        }
      ).name ??
      ''


    const candidateLevel =
      headingLevel(
        elementName
      )


    if (
      candidateLevel !==
        null &&
      candidateLevel <=
        level
    ) {

      break

    }


    $(
      element
    )
      .find(
        'a[href*="/wiki/"]'
      )
      .addBack(
        'a[href*="/wiki/"]'
      )
      .each(
        (
          _index,
          anchorElement
        ) => {

          const anchor =
            $(
              anchorElement
            )


          const href =
            anchor.attr(
              'href'
            )


          if (
            !href
          ) {

            return

          }


          const parsed =
            parseWikiGGPhoneTitle(
              pageTitleFromHref(
                href,
                wikiBaseUrl
              )
            )


          if (
            !parsed ||
            parsed.kind !==
            expectedKind
          ) {

            return

          }


          const canonicalName =
            stripCharacterPrefix(
              parsed.canonicalName,
              character
            )


          const sourceUrl =
            absoluteUrl(
              href,
              wikiBaseUrl
            )


          if (
            !canonicalName ||
            !sourceUrl
          ) {

            return

          }


          const key =
            phoneSourceKey(
              character,
              parsed.kind,
              canonicalName
            )


          const releaseDate =
            extractReleaseDate(
              cleanText(
                smallestWikiGGCallContainer(
                  $,
                  anchor
                )
                  .text()
              )
            )


          const existing =
            records.get(
              key
            )


          if (
            existing &&
            (
              existing.releaseDate ||
              !releaseDate
            )
          ) {

            return

          }


          records.set(
            key,
            {
              canonicalName,

              character,

              category:
                phoneCategory(
                  parsed.kind
                ),

              releaseDate,

              sourceName:
                'wiki.gg',

              sourceUrl,

              sourceKey:
                key,

              sourceUpdatedAt:
                fetchedAt,
            }
          )

        }
      )

  }


  return [
    ...records.values(),
  ]

}


async function fetchWikiGGCalls(
  character: string,
  fetchedAt:
    string
) {

  const response =
    await fetchPhoneSource(
      wikiPhoneCallsUrl
    )


  const html =
    await response.text()


  const $ =
    load(
      html
    )


  return {
    voiceCalls:
      parseWikiGGSection(
        $,
        character,
        'voice',
        fetchedAt
      ),

    videoCalls:
      parseWikiGGSection(
        $,
        character,
        'video',
        fetchedAt
      ),
  }

}


function smallestLadsCallContainer(
  $:
    ReturnType<
      typeof load
    >,
  anchor:
    ReturnType<
      typeof $
    >
) {

  let current =
    anchor.parent()


  for (
    let depth =
      0;
    depth <
      6 &&
    current.length >
      0;
    depth +=
      1
  ) {

    const text =
      cleanText(
        current.text()
      )


    if (
      text.length <=
        1000 &&
      extractReleaseDate(
        text
      )
    ) {

      return current

    }


    current =
      current.parent()

  }


  return anchor.parent()

}


function parseLadsHtml(
  html: string,
  character: string,
  fetchedAt:
    string,
  pageUrl:
    string,
  expectedKind?:
    PhoneCallKind
) {

  const $ =
    load(
      html
    )


  const records =
    new Map<
      string,
      WikiPhoneRecord
    >()


  $(
    'a[href*="/wiki/"]'
  )
    .each(
      (
        _index,
        element
      ) => {

        const anchor =
          $(
            element
          )


        const href =
          anchor.attr(
            'href'
          )


        if (
          !href
        ) {

          return

        }


        const hrefTitle =
          pageTitleFromHref(
            href,
            ladsBaseUrl
          )


        const titleAttribute =
          anchor.attr(
            'title'
          ) ??
          ''


        const candidates = [
          hrefTitle,
          titleAttribute,
          cleanText(
            anchor.text()
          ),
        ]


        let parsed:
          ParsedPhoneTitle |
          null =
          null


        for (
          const candidate
          of candidates
        ) {

          parsed =
            parseLadsPhoneTitle(
              candidate
            )


          if (
            parsed
          ) {

            break

          }

        }


        if (
          !parsed ||
          normalizeText(
            parsed.character
          ) !==
          normalizeText(
            character
          ) ||
          (
            expectedKind &&
            parsed.kind !==
              expectedKind
          )
        ) {

          return

        }


        const canonicalName =
          stripCharacterPrefix(
            parsed.canonicalName,
            parsed.character
          )


        if (
          !canonicalName
        ) {

          return

        }


        const sourceUrl =
          absoluteUrl(
            href,
            ladsBaseUrl
          ) ??
          pageUrl


        const key =
          phoneSourceKey(
            parsed.character,
            parsed.kind,
            canonicalName
          )


        const releaseDate =
          extractReleaseDate(
            cleanText(
              smallestLadsCallContainer(
                $,
                anchor
              )
                .text()
            )
          )


        const existing =
          records.get(
            key
          )


        if (
          existing &&
          (
            existing.releaseDate ||
            !releaseDate
          )
        ) {

          return

        }


        records.set(
          key,
          {
            canonicalName,

            character:
              parsed.character,

            category:
              phoneCategory(
                parsed.kind
              ),

            releaseDate,

            sourceName:
              'lads.wiki',

            sourceUrl,

            sourceKey:
              key,

            sourceUpdatedAt:
              fetchedAt,
          }
        )

      }
    )


  return [
    ...records.values(),
  ]

}


async function fetchLadsCallsPage(
  character: string,
  fetchedAt:
    string
) {

  const response =
    await fetchPhoneSource(
      ladsCallsUrl
    )


  const html =
    await response.text()


  const records =
    parseLadsHtml(
      html,
      character,
      fetchedAt,
      ladsCallsUrl
    )


  return {
    voiceCalls:
      records.filter(
        (record) =>
          record.category ===
          'Phone Call'
      ),

    videoCalls:
      records.filter(
        (record) =>
          record.category ===
          'Phone Video'
      ),
  }

}


async function fetchLadsCategory(
  character: string,
  kind:
    PhoneCallKind,
  fetchedAt:
    string
) {

  const url =
    kind ===
      'voice'
      ? ladsVoiceCategoryUrl
      : ladsVideoCategoryUrl


  const response =
    await fetchPhoneSource(
      url
    )


  const html =
    await response.text()


  return parseLadsHtml(
    html,
    character,
    fetchedAt,
    url,
    kind
  )

}


function mergeRecords(
  primary:
    WikiPhoneRecord[],
  backup:
    WikiPhoneRecord[]
) {

  const records =
    new Map<
      string,
      WikiPhoneRecord
    >()


  /*
   * Primary records win. Backup records fill missing
   * calls and can supply a date only when the primary
   * record did not have one.
   */
  for (
    const record
    of primary
  ) {

    records.set(
      record.sourceKey,
      record
    )

  }


  for (
    const record
    of backup
  ) {

    const existing =
      records.get(
        record.sourceKey
      )


    if (
      !existing
    ) {

      records.set(
        record.sourceKey,
        record
      )


      continue

    }


    if (
      !existing.releaseDate &&
      record.releaseDate
    ) {

      records.set(
        record.sourceKey,
        {
          ...existing,

          releaseDate:
            record.releaseDate,
        }
      )

    }

  }


  return [
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
     * A backup wiki must never erase a release date
     * that an earlier source already supplied.
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


  let primaryVoice:
    WikiPhoneRecord[] =
    []


  let primaryVideo:
    WikiPhoneRecord[] =
    []


  let ladsCallsVoice:
    WikiPhoneRecord[] =
    []


  let ladsCallsVideo:
    WikiPhoneRecord[] =
    []


  let ladsCategoryVoice:
    WikiPhoneRecord[] =
    []


  let ladsCategoryVideo:
    WikiPhoneRecord[] =
    []


  /*
   * ========================================
   * PRIMARY — wiki.gg
   * ========================================
   *
   * Failure here no longer aborts the entire phone
   * sync. The backup sources can carry the import.
   */
  try {

    const primary =
      await fetchWikiGGCalls(
        character,
        fetchedAt
      )


    primaryVoice =
      primary.voiceCalls


    primaryVideo =
      primary.videoCalls

  } catch (error) {

    console.warn(
      `wiki.gg phone source unavailable for ${character}; trying backup source:`,
      error
    )

  }


  /*
   * ========================================
   * BACKUP — lads.wiki Calls
   * ========================================
   *
   * One request should normally provide both Voice
   * and Video calls.
   */
  try {

    const backup =
      await fetchLadsCallsPage(
        character,
        fetchedAt
      )


    ladsCallsVoice =
      backup.voiceCalls


    ladsCallsVideo =
      backup.videoCalls

  } catch (error) {

    console.warn(
      `lads.wiki Calls backup unavailable for ${character}; trying category backups:`,
      error
    )

  }


  /*
   * ========================================
   * TERTIARY BACKUP — category pages
   * ========================================
   *
   * Only make these extra requests when the combined
   * Calls page failed to produce that call type.
   */
  if (
    ladsCallsVoice.length ===
    0
  ) {

    try {

      ladsCategoryVoice =
        await fetchLadsCategory(
          character,
          'voice',
          fetchedAt
        )

    } catch (error) {

      console.warn(
        `lads.wiki Voice Call category unavailable for ${character}:`,
        error
      )

    }

  }


  if (
    ladsCallsVideo.length ===
    0
  ) {

    try {

      ladsCategoryVideo =
        await fetchLadsCategory(
          character,
          'video',
          fetchedAt
        )

    } catch (error) {

      console.warn(
        `lads.wiki Video Call category unavailable for ${character}:`,
        error
      )

    }

  }


  const backupVoice =
    mergeRecords(
      ladsCallsVoice,
      ladsCategoryVoice
    )


  const backupVideo =
    mergeRecords(
      ladsCallsVideo,
      ladsCategoryVideo
    )


  const voiceCalls =
    mergeRecords(
      primaryVoice,
      backupVoice
    )


  const videoCalls =
    mergeRecords(
      primaryVideo,
      backupVideo
    )


  const total =
    voiceCalls.length +
    videoCalls.length


  if (
    total ===
    0
  ) {

    throw new Error(
      `No Voice Calls or Video Calls could be discovered for ${character} from wiki.gg or the lads.wiki backup sources.`
    )

  }


  return {
    character,

    fetchedAt,

    voiceCalls,

    videoCalls,

    total,

    sources: {
      wikiGG:
        primaryVoice.length +
        primaryVideo.length,

      ladsCalls:
        ladsCallsVoice.length +
        ladsCallsVideo.length,

      ladsCategories:
        ladsCategoryVoice.length +
        ladsCategoryVideo.length,
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
       * Match by character + title + final archive
       * category before using source identity. This
       * migrates older wiki.gg phone rows in place
       * when a call is now supplied by lads.wiki,
       * preserving its catalog ID and any file match.
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