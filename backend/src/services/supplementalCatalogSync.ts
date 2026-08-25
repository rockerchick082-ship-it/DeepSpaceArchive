import {
  load,
} from 'cheerio'

import {
  findCatalogItemByCharacterAndName,
  linkCatalogMemory,
  listCatalogItems,
  listCatalogMemoryLinks,
  updateCatalogItem,
  upsertCatalogItemFromSource,
} from '../state/metadataCatalog'

import type {
  CatalogItem,
  CatalogItemInput,
} from '../state/metadataCatalog'


const wikiBaseUrl =
  'https://loveanddeepspace.wiki.gg'


const fallingForYouUrl =
  `${wikiBaseUrl}/wiki/Falling_for_You`


const byYourSideUrl =
  `${wikiBaseUrl}/wiki/By_Your_Side`


const wikiRequestMinimumDelayMs =
  2200


const wikiFallbackCooldownMs =
  60 * 1000


/*
 * Start the supplemental request clock now rather
 * than at zero. This deliberately gives the primary
 * All Memories sync a short breathing period before
 * the first supplemental request begins.
 */
let lastWikiRequestAt =
  Date.now()


let wikiCooldownUntil =
  0


type SupplementalSource =
  | 'falling-for-you'
  | 'by-your-side'


type FallingForYouKind =
  | 'Bond'
  | 'Memoria'
  | 'Myths'


type ByYourSideKind =
  | 'Secret Times'
  | 'Tender Moments'


type SupplementalKind =
  | FallingForYouKind
  | ByYourSideKind


export type SupplementalCatalogRecord = {
  character: string
  title: string
  canonicalName: string
  category:
    | 'Memoria'
    | 'Bond'
    | 'Myths'
    | 'Secret Times'
    | 'Tender Moments'
  sourceKind:
    SupplementalKind
  sourceName: 'wiki.gg'
  sourceUrl: string
  sourceKey: string
  releaseDate: string | null
  memoryText: string | null
  imageUrl: string | null

  /*
   * Underlying Memory cards required to unlock this
   * archive item. Myths can have two; Memoria /
   * Tender Moment / Secret Time usually have one.
   * Bonds can legitimately have none.
   */
  linkedMemoryNames: string[]
}


export type SupplementalSyncProgress = {
  phase:
    | 'fetching-falling-for-you'
    | 'reading-date-pages'
    | 'importing-falling-for-you'
    | 'fetching-by-your-side'
    | 'importing-by-your-side'
    | 'complete'

  current: number
  total: number
  percent: number
  message: string
}


export type SupplementalSyncResult = {
  character: string
  fetchedAt: string

  fallingForYou: {
    discovered: number
    created: number
    enriched: number
    existing: number
    skipped: number
  }

  byYourSide: {
    discovered: number
    created: number

    /*
     * Kept for frontend compatibility.
     * existingMemory now counts archive entries that
     * successfully linked to at least one Memory.
     * existingSupplemental counts existing archive
     * records refreshed from By Your Side.
     */
    existingMemory: number
    existingSupplemental: number
    skipped: number

    linkedMemories: number
  }

  totalCreated: number
  totalEnriched: number
  totalLinkedMemories: number
}


type SupplementalSyncProgressCallback =
  (
    progress:
      SupplementalSyncProgress
  ) => void


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
   * Falling for You / By Your Side now behave like the
   * All Memories puller: a 429 pauses this exact request,
   * retries it when the cooldown expires, and then resumes
   * from the same archive item.
   *
   * There is intentionally no retry-count limit.
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
              'DeepSpaceArchive/1.0 supplemental metadata catalog sync',
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
        )} seconds and retrying automatically (attempt ${attempt}).`
      )


      await sleep(
        waitMs +
        250
      )


      continue

    }


    if (
      !response.ok
    ) {

      throw new Error(
        `Wiki request failed with status ${response.status}.`
      )

    }


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


function isInvalidSummaryText(
  value:
    string | null | undefined
) {

  if (
    !value
  ) {

    return true

  }


  const normalized =
    normalizeText(
      value
    )


  return (
    normalized.includes(
      'the information on this page is updated automatically'
    ) ||
    normalized.includes(
      'please purge the cache and check again'
    ) ||
    normalized.includes(
      'if the information youre looking for doesnt appear'
    ) ||
    normalized.includes(
      'falling for you is a date type in love and deepspace'
    )
  )

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


function originalMediaWikiImageUrl(
  value: string
) {

  try {

    const url =
      new URL(
        value
      )


    const marker =
      '/thumb/'


    const markerIndex =
      url.pathname.indexOf(
        marker
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


    const pieces =
      url.pathname
        .slice(
          markerIndex +
          marker.length
        )
        .split(
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
      `${beforeThumb}/${pieces.join(
        '/'
      )}`


    return url.toString()

  } catch {

    return value

  }

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


function titleWithoutCharacter(
  value: string,
  character: string
) {

  const normalizedValue =
    normalizeText(
      value
    )


  const normalizedCharacter =
    normalizeText(
      character
    )


  const prefixes = [
    `${normalizedCharacter} `,
    `${normalizedCharacter}s `,
  ]


  for (
    const prefix
    of prefixes
  ) {

    if (
      normalizedValue.startsWith(
        prefix
      )
    ) {

      return normalizedValue
        .slice(
          prefix.length
        )
        .trim()

    }

  }


  return normalizedValue

}


function pageTitleFromHref(
  href: string
) {

  try {

    const absolute =
      new URL(
        href,
        wikiBaseUrl
      )


    const prefix =
      '/wiki/'


    if (
      !absolute.pathname.startsWith(
        prefix
      )
    ) {

      return ''

    }


    return decodeURIComponent(
      absolute.pathname
        .slice(
          prefix.length
        )
    )
      .replace(
        /_/g,
        ' '
      )
      .trim()

  } catch {

    return ''

  }

}


function pageKindFromTitle(
  pageTitle: string
): SupplementalKind | null {

  if (
    /\(Memoria\)$/i.test(
      pageTitle
    )
  ) {

    return 'Memoria'

  }


  if (
    /\(Bond\)$/i.test(
      pageTitle
    )
  ) {

    return 'Bond'

  }


  if (
    /\(Myth\)$/i.test(
      pageTitle
    )
  ) {

    return 'Myths'

  }


  if (
    /\(Secret[ _]Time\)$/i.test(
      pageTitle
    )
  ) {

    return 'Secret Times'

  }


  if (
    /\(Tender[ _]Moment\)$/i.test(
      pageTitle
    )
  ) {

    return 'Tender Moments'

  }


  return null

}


function cleanPageTitle(
  pageTitle: string
) {

  return cleanText(
    pageTitle.replace(
      /\s*\((?:Memoria|Bond|Myth|Secret[ _]Time|Tender[ _]Moment)\)\s*$/i,
      ''
    )
  )

}


function catalogCategoryForKind(
  kind:
    SupplementalKind
): SupplementalCatalogRecord['category'] {

  /*
   * Falling for You / By Your Side define the
   * archive-facing categories directly. Memoria is
   * no longer collapsed into the generic Memory
   * catalog category.
   */
  return kind

}


function sourceKeyForRecord(
  source:
    SupplementalSource,
  character:
    string,
  kind:
    SupplementalKind,
  title:
    string
) {

  return [
    source,
    normalizeSourceKey(
      character
    ),
    normalizeSourceKey(
      kind
    ),
    normalizeSourceKey(
      title
    ),
  ].join(
    ':'
  )

}


function extractReleaseDate(
  value: string
) {

  const isoMatch =
    value.match(
      /\b(20\d{2})-(\d{2})-(\d{2})\b/
    )


  if (
    isoMatch
  ) {

    return isoMatch[0]

  }


  const monthMatch =
    value.match(
      /\b(?:Released\s+on\s+)?([A-Z][a-z]+)\s+(\d{1,2}),\s+(20\d{2})\b/
    )


  if (
    !monthMatch
  ) {

    return null

  }


  const parsed =
    new Date(
      `${monthMatch[1]} ${monthMatch[2]}, ${monthMatch[3]} 00:00:00 UTC`
    )


  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {

    return null

  }


  return parsed
    .toISOString()
    .slice(
      0,
      10
    )

}


function scoreArtworkCandidate(
  title: string,
  url: string,
  altText: string,
  width:
    number | null
) {

  const normalizedTitle =
    normalizeText(
      title
    )


  const searchable =
    normalizeText(
      `${url} ${altText}`
    )


  let score =
    0


  const titleTokens =
    normalizedTitle
      .split(
        ' '
      )
      .filter(
        (token) =>
          token.length >
          1
      )


  const matchingTokens =
    titleTokens.filter(
      (token) =>
        searchable.includes(
          token
        )
    ).length


  if (
    titleTokens.length >
    0
  ) {

    score +=
      Math.round(
        (
          matchingTokens /
          titleTokens.length
        ) *
        180
      )

  }


  if (
    normalizedTitle &&
    searchable.includes(
      normalizedTitle
    )
  ) {

    score +=
      160

  }


  if (
    searchable.includes(
      'large'
    )
  ) {

    score +=
      120

  }


  if (
    searchable.includes(
      'adjusted'
    )
  ) {

    score +=
      90

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
    'position',
    'avatar',
    'discord',
    'twitter',
    'youtube',
    'tab icon',
    'notice',
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


function extractBestArtwork(
  html: string,
  title: string
) {

  const $ =
    load(
      html
    )


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


        const rawSources = [
          image.attr(
            'src'
          ),
          image.attr(
            'data-src'
          ),
        ]


        const srcSet =
          image.attr(
            'srcset'
          )


        if (
          srcSet
        ) {

          rawSources.push(
            ...srcSet
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
          )

        }


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


        for (
          const rawSource
          of rawSources
        ) {

          const absolute =
            absoluteWikiUrl(
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


          candidates.push({
            url:
              original,

            score:
              scoreArtworkCandidate(
                title,
                original,
                altText,
                width
              ),
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


  return (
    best &&
    best.score >=
      120
  )
    ? best.url
    : null

}


function extractSummaryText(
  html: string,
  title: string,
  character: string,
  kind:
    SupplementalKind
) {

  const $ =
    load(
      html
    )


  const content =
    $(
      '.mw-parser-output'
    )
      .first()


  if (
    content.length ===
    0
  ) {

    return null

  }


  /*
   * Date pages place their short synopsis near the
   * top of the article, before the Script/Diagram
   * sections. We score short top-of-page blocks
   * instead of relying on a generated template
   * class that wiki.gg could rename.
   */
  const candidates:
    Array<{
      text: string
      score: number
    }> =
    []


  content
    .find(
      'p, blockquote'
    )
    .each(
      (
        index,
        element
      ) => {

        if (
          index >
          20
        ) {

          return false

        }


        const text =
          cleanText(
            $(
              element
            )
              .text()
          )


        if (
          !text ||
          text.length <
          12 ||
          text.length >
          900
        ) {

          return

        }


        const normalized =
          normalizeText(
            text
          )


        const blocked = [
          normalizeText(
            title
          ),
          normalizeText(
            character
          ),
          normalizeText(
            kind
          ),
          'the information on this page is updated automatically',
          'released on',
          'unlock conditions',
          'love and deepspace wiki',
        ]


        if (
          blocked.some(
            (value) =>
              value &&
              (
                normalized ===
                  value ||
                normalized.includes(
                  value
                )
              )
          ) ||
          isSupplementalKindLabel(
            text,
            kind
          ) ||
          isInvalidSummaryText(
            text
          )
        ) {

          return

        }


        if (
          /\bis an? .+ in love and deepspace\b/i.test(
            text
          )
        ) {

          return

        }


        let score =
          0


        if (
          index <
          12
        ) {

          score +=
            40

        }


        if (
          text.length >=
            35 &&
          text.length <=
            450
        ) {

          score +=
            60

        }


        if (
          /[.!?…]$/.test(
            text
          )
        ) {

          score +=
            20

        }


        if (
          text.includes(
            ':'
          ) &&
          text.length <
          70
        ) {

          score -=
            20

        }


        candidates.push({
          text,
          score,
        })

      }
    )


  candidates.sort(
    (
      left,
      right
    ) => {

      if (
        right.score !==
        left.score
      ) {

        return (
          right.score -
          left.score
        )

      }


      return (
        right.text.length -
        left.text.length
      )

    }
  )


  return (
    candidates[0]?.text ??
    null
  )

}


async function loadAllCatalogItems() {

  const items:
    CatalogItem[] =
    []


  let offset =
    0


  const limit =
    500


  while (
    true
  ) {

    const page =
      listCatalogItems({
        limit,
        offset,
      })


    items.push(
      ...page.items
    )


    offset +=
      page.items.length


    if (
      page.items.length <
      limit ||
      offset >=
      page.count
    ) {

      break

    }

  }


  return items

}


function findExistingByCharacterAndTitle(
  items:
    CatalogItem[],
  character:
    string,
  title:
    string,
  categories?:
    string[]
) {

  const wantedCharacter =
    normalizeText(
      character
    )


  const wantedTitle =
    titleWithoutCharacter(
      title,
      character
    )


  return items.find(
    (item) => {

      if (
        normalizeText(
          item.character ??
          ''
        ) !==
        wantedCharacter
      ) {

        return false

      }


      if (
        categories &&
        !categories.some(
          (category) =>
            normalizeText(
              category
            ) ===
            normalizeText(
              item.category
            )
        )
      ) {

        return false

      }


      return (
        titleWithoutCharacter(
          item.canonicalName,
          character
        ) ===
        wantedTitle
      )

    }
  )

}


function fullInputFromExisting(
  existing:
    CatalogItem,
  overrides:
    Partial<
      CatalogItemInput
    >
): CatalogItemInput {

  return {
    canonicalName:
      existing.canonicalName,

    character:
      existing.character,

    category:
      existing.category,

    subcategory:
      existing.subcategory,

    releaseDate:
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
      existing.sourceName,

    sourceUrl:
      existing.sourceUrl,

    sourceKey:
      existing.sourceKey,

    sourceUpdatedAt:
      existing.sourceUpdatedAt,

    manualNotes:
      existing.manualNotes,

    memoryText:
      existing.memoryText,

    memoryTextSourceUrl:
      existing.memoryTextSourceUrl,

    ...overrides,
  }

}


function headingLevel(
  elementName:
    string
) {

  const match =
    elementName.match(
      /^h([1-6])$/i
    )


  return match
    ? Number(
        match[1]
      )
    : null

}




function isSupplementalKindLabel(
  value:
    string | null | undefined,
  kind:
    SupplementalKind
) {

  if (
    !value
  ) {

    return false

  }


  const normalized =
    normalizeText(
      value
    )


  const labels:
    Record<
      SupplementalKind,
      string[]
    > = {
      Bond: [
        'bond',
      ],

      Memoria: [
        'memoria',
      ],

      Myths: [
        'myth',
        'myths',
      ],

      'Secret Times': [
        'secret time',
        'secret times',
      ],

      'Tender Moments': [
        'tender moment',
        'tender moments',
      ],
    }


  return labels[
    kind
  ]
    .includes(
      normalized
    )

}


function extractListingMetadata(
  $:
    ReturnType<
      typeof load
    >,
  anchor:
    unknown,
  title:
    string,
  kind:
    SupplementalKind
) {

  const anchorNode =
    $(
      anchor as never
    )


  /*
   * Falling for You is rendered as cards. The
   * synopsis the user sees sits directly beneath
   * the title/type inside that card. Walk upward
   * from the title link and choose the smallest
   * ancestor that contains both the title and a
   * plausible release date or synopsis.
   */
  let container =
    anchorNode.parent()


  for (
    let depth =
      0;
    depth <
      7 &&
    container.length >
      0;
    depth +=
      1
  ) {

    const containerText =
      cleanText(
        container.text()
      )


    const hasTitle =
      normalizeText(
        containerText
      ).includes(
        normalizeText(
          title
        )
      )


    const hasDate =
      Boolean(
        extractReleaseDate(
          containerText
        )
      )


    const paragraphs =
      container
        .find(
          'p'
        )
        .map(
          (
            _index,
            element
          ) =>
            cleanText(
              $(
                element
              )
                .text()
            )
        )
        .get()
        .filter(
          (value) =>
            value.length >=
              12 &&
            value.length <=
              900 &&
            !isInvalidSummaryText(
              value
            )
        )


    const synopsis =
      paragraphs.find(
        (value) => {

          const normalized =
            normalizeText(
              value
            )


          return (
            normalized !==
              normalizeText(
                title
              ) &&
            !isSupplementalKindLabel(
              value,
              kind
            ) &&
            !normalized.startsWith(
              'released on '
            )
          )

        }
      ) ??
      null


    if (
      hasTitle &&
      (
        synopsis ||
        hasDate
      )
    ) {

      return {
        listingText:
          synopsis,

        listingReleaseDate:
          extractReleaseDate(
            containerText
          ),
      }

    }


    container =
      container.parent()

  }


  return {
    listingText:
      null,

    listingReleaseDate:
      null,
  }

}


function collectCharacterSectionLinks(
  html: string,
  character: string,
  allowedKinds:
    SupplementalKind[]
) {

  const $ =
    load(
      html
    )


  const heading =
    $(
      `#${character}`
    )
      .first()


  if (
    heading.length ===
    0
  ) {

    return []

  }


  const headingElement =
    heading.is(
      'h1, h2, h3, h4, h5, h6'
    )
      ? heading
      : heading.closest(
          'h1, h2, h3, h4, h5, h6'
        )


  if (
    headingElement.length ===
    0
  ) {

    return []

  }


  const headingNode =
    headingElement.get(
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


  const sectionElements:
    ReturnType<
      typeof headingElement.nextAll
    > =
    headingElement.nextAll()


  const links =
    new Map<
      string,
      {
        url: string
        title: string
        kind:
          SupplementalKind
        listingText: string | null
        listingReleaseDate: string | null
      }
    >()


  for (
    const element
    of sectionElements
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
          anchor
        ) => {

          const href =
            $(
              anchor
            )
              .attr(
                'href'
              )


          if (
            !href
          ) {

            return

          }


          const pageTitle =
            pageTitleFromHref(
              href
            )


          const kind =
            pageKindFromTitle(
              pageTitle
            )


          if (
            !kind ||
            !allowedKinds.includes(
              kind
            )
          ) {

            return

          }


          const title =
            cleanPageTitle(
              pageTitle
            )


          const url =
            absoluteWikiUrl(
              href
            )


          if (
            !title ||
            !url
          ) {

            return

          }


          const listingMetadata =
            extractListingMetadata(
              $,
              anchor,
              title,
              kind
            )


          links.set(
            url,
            {
              url,
              title,
              kind,

              listingText:
                listingMetadata.listingText,

              listingReleaseDate:
                listingMetadata.listingReleaseDate,
            }
          )

        }
      )

  }


  return [
    ...links.values(),
  ]

}


async function fetchFallingForYouRecords(
  character: string,
  onProgress?:
    SupplementalSyncProgressCallback
) {

  onProgress?.({
    phase:
      'fetching-falling-for-you',

    current:
      0,

    total:
      1,

    percent:
      1,

    message:
      `Loading Falling for You entries for ${character}...`,
  })


  const response =
    await fetchWikiPage(
      `${fallingForYouUrl}#${encodeURIComponent(
        character
      )}`,
      (
        retry
      ) => {

        onProgress?.({
          phase:
            'fetching-falling-for-you',

          current:
            0,

          total:
            1,

          percent:
            1,

          message:
            `Falling for You rate limit: waiting ${Math.max(
              1,
              Math.ceil(
                retry.waitMs /
                1000
              )
            )}s, then retrying automatically.`,
        })

      }
    )


  const html =
    await response.text()


  const links =
    collectCharacterSectionLinks(
      html,
      character,
      [
        'Bond',
        'Memoria',
        'Myths',
      ]
    )


  onProgress?.({
    phase:
      'fetching-falling-for-you',

    current:
      1,

    total:
      1,

    percent:
      8,

    message:
      `Found ${links.length} Falling for You entries for ${character}.`,
  })


  return links

}


async function fetchByYourSideRecords(
  character: string,
  onProgress?:
    SupplementalSyncProgressCallback
) {

  onProgress?.({
    phase:
      'fetching-by-your-side',

    current:
      0,

    total:
      1,

    percent:
      70,

    message:
      `Loading By Your Side entries for ${character}...`,
  })


  const response =
    await fetchWikiPage(
      `${byYourSideUrl}#${encodeURIComponent(
        character
      )}`,
      (
        retry
      ) => {

        onProgress?.({
          phase:
            'fetching-by-your-side',

          current:
            0,

          total:
            1,

          percent:
            70,

          message:
            `By Your Side rate limit: waiting ${Math.max(
              1,
              Math.ceil(
                retry.waitMs /
                1000
              )
            )}s, then retrying automatically.`,
        })

      }
    )


  const html =
    await response.text()


  const links =
    collectCharacterSectionLinks(
      html,
      character,
      [
        'Secret Times',
        'Tender Moments',
      ]
    )


  onProgress?.({
    phase:
      'fetching-by-your-side',

    current:
      1,

    total:
      1,

    percent:
      76,

    message:
      `Found ${links.length} By Your Side entries for ${character}.`,
  })


  return links

}



function extractLinkedMemoryNames(
  html: string,
  character: string
) {

  const $ =
    load(
      html
    )


  const unlockHeading =
    $(
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
          'unlock conditions'
      )
      .first()


  if (
    unlockHeading.length ===
    0
  ) {

    return []

  }


  const headingNode =
    unlockHeading.get(
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
    2


  const prefix =
    `${normalizeText(
      character
    )} `


  const names =
    new Map<
      string,
      string
    >()


  for (
    const element
    of unlockHeading
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
          anchor
        ) => {

          const href =
            $(
              anchor
            )
              .attr(
                'href'
              )


          if (
            !href
          ) {

            return

          }


          const pageTitle =
            pageTitleFromHref(
              href
            )


          /*
           * Underlying Memory pages use names such
           * as "Xavier: Lightseeking Obsession".
           * Date pages themselves end in parenthetical
           * type suffixes, so exclude those.
           */
          const normalizedTitle =
            normalizeText(
              pageTitle
            )


          if (
            !normalizedTitle.startsWith(
              prefix
            ) ||
            /\((?:Memoria|Bond|Myth|Secret[ _]Time|Tender[ _]Moment)\)$/i
              .test(
                pageTitle
              )
          ) {

            return

          }


          const cleanName =
            cleanText(
              pageTitle
            )


          names.set(
            normalizeText(
              cleanName
            ),
            cleanName
          )

        }
      )

  }


  return [
    ...names.values(),
  ]

}


function mergeUniqueMemoryNames(
  values:
    string[]
) {

  const unique =
    new Map<
      string,
      string
    >()


  for (
    const value
    of values
  ) {

    const cleaned =
      cleanText(
        value
      )


    if (
      !cleaned
    ) {

      continue

    }


    unique.set(
      normalizeText(
        cleaned
      ),
      cleaned
    )

  }


  return [
    ...unique.values(),
  ]

}


async function readFallingForYouDetail(
  character:
    string,
  entry: {
    url: string
    title: string
    kind:
      SupplementalKind
    listingText:
      string | null
    listingReleaseDate:
      string | null
  },
  onRetry?:
    WikiRetryCallback
): Promise<SupplementalCatalogRecord> {

  const response =
    await fetchWikiPage(
      entry.url,
      onRetry
    )


  const html =
    await response.text()


  const pageText =
    cleanText(
      load(
        html
      )(
        '#mw-content-text'
      )
        .text()
    )


  const releaseDate =
    entry.listingReleaseDate ??
    extractReleaseDate(
      pageText
    )


  /*
   * Prefer the synopsis displayed directly beneath
   * the card title on Falling for You. This avoids
   * accidentally capturing the global automatic-
   * update notice at the top of wiki pages.
   */
  const detailSummary =
    extractSummaryText(
      html,
      entry.title,
      character,
      entry.kind
    )


  const memoryText =
    !isInvalidSummaryText(
      entry.listingText
    ) &&
    !isSupplementalKindLabel(
      entry.listingText,
      entry.kind
    )
      ? entry.listingText
      : (
          !isInvalidSummaryText(
            detailSummary
          ) &&
          !isSupplementalKindLabel(
            detailSummary,
            entry.kind
          )
            ? detailSummary
            : null
        )


  /*
   * Falling for You date pages expose their own
   * full-size adjusted artwork:
   *
   * - Bond pages use the character Bond artwork
   * - Memoria pages use the large adjusted card art
   * - Myth pages use the Myth background artwork
   *
   * The caller still decides whether an existing
   * catalog value may be changed. Resolving it here
   * lets new/sparse supplemental records be complete.
   */
  const imageUrl =
    extractBestArtwork(
      html,
      entry.title
    )


  const linkedMemoryNames =
    extractLinkedMemoryNames(
      html,
      character
    )


  return {
    character,

    title:
      entry.title,

    canonicalName:
      `${character}: ${entry.title}`,

    category:
      catalogCategoryForKind(
        entry.kind
      ),

    sourceKind:
      entry.kind,

    sourceName:
      'wiki.gg',

    sourceUrl:
      entry.url,

    sourceKey:
      sourceKeyForRecord(
        'falling-for-you',
        character,
        entry.kind,
        entry.title
      ),

    releaseDate,

    memoryText,

    imageUrl,

    linkedMemoryNames,
  }

}


async function readByYourSideDetail(
  character:
    string,
  entry: {
    url: string
    title: string
    kind:
      SupplementalKind
    listingText:
      string | null
    listingReleaseDate:
      string | null
  },
  onRetry?:
    WikiRetryCallback
): Promise<SupplementalCatalogRecord> {

  const response =
    await fetchWikiPage(
      entry.url,
      onRetry
    )


  const html =
    await response.text()


  const pageText =
    cleanText(
      load(
        html
      )(
        '#mw-content-text'
      )
        .text()
    )


  const detailSummary =
    extractSummaryText(
      html,
      entry.title,
      character,
      entry.kind
    )


  const memoryText =
    !isInvalidSummaryText(
      entry.listingText
    )
      ? entry.listingText
      : (
          !isInvalidSummaryText(
            detailSummary
          )
            ? detailSummary
            : null
        )


  const linkedMemoryNames =
    extractLinkedMemoryNames(
      html,
      character
    )


  return {
    character,

    title:
      entry.title,

    canonicalName:
      `${character}: ${entry.title}`,

    category:
      catalogCategoryForKind(
        entry.kind
      ),

    sourceKind:
      entry.kind,

    sourceName:
      'wiki.gg',

    sourceUrl:
      entry.url,

    sourceKey:
      sourceKeyForRecord(
        'by-your-side',
        character,
        entry.kind,
        entry.title
      ),

    releaseDate:
      entry.listingReleaseDate ??
      extractReleaseDate(
        pageText
      ),

    memoryText,

    imageUrl:
      extractBestArtwork(
        html,
        entry.title
      ),

    linkedMemoryNames,
  }

}




function findExistingArchiveRecord(
  items:
    CatalogItem[],
  record:
    SupplementalCatalogRecord
) {

  const archiveRecord =
    findExistingByCharacterAndTitle(
      items,
      record.character,
      record.title,
      [
        record.category,
      ]
    )


  if (
    archiveRecord
  ) {

    return archiveRecord

  }


  /*
   * Migration compatibility:
   *
   * Older supplemental builds incorrectly created
   * Falling for You Memoria rows as category Memory.
   * Only adopt that legacy row when its source
   * identity is the Falling for You source itself.
   *
   * Never convert the real All Memories Memory row
   * into Memoria; that Memory record is now the
   * underlying card metadata we want to link.
   */
  if (
    record.category ===
      'Memoria'
  ) {

    const wantedTitle =
      titleWithoutCharacter(
        record.title,
        record.character
      )


    return items.find(
      (item) =>
        item.category ===
          'Memory' &&
        item.sourceKey ===
          record.sourceKey &&
        titleWithoutCharacter(
          item.canonicalName,
          record.character
        ) ===
          wantedTitle
    )

  }


  return undefined

}


function upsertArchiveRecord(
  record:
    SupplementalCatalogRecord,
  existing:
    CatalogItem | undefined
) {

  const now =
    new Date()
      .toISOString()


  if (
    existing
  ) {

    /*
     * Adopt/refresh an existing archive-facing row
     * in place so any current file match attached to
     * its catalog ID survives the migration.
     *
     * The structured Date page is authoritative for
     * title/category/date/text. If an artwork scrape
     * temporarily returns null, keep the last known
     * artwork rather than erasing it.
     */
    const item =
      updateCatalogItem(
        existing.id,
        fullInputFromExisting(
          existing,
          {
            canonicalName:
              record.canonicalName,

            character:
              record.character,

            category:
              record.category,

            releaseDate:
              record.releaseDate ??
              existing.releaseDate,

            imageUrl:
              record.imageUrl ??
              existing.imageUrl,

            sourceName:
              record.sourceName,

            sourceUrl:
              record.sourceUrl,

            sourceKey:
              record.sourceKey,

            sourceUpdatedAt:
              now,

            memoryText:
              record.memoryText ??
              existing.memoryText,

            memoryTextSourceUrl:
              record.memoryText
                ? record.sourceUrl
                : existing
                    .memoryTextSourceUrl,
          }
        )
      )


    return {
      created:
        false,

      updated:
        true,

      item,
    }

  }


  return upsertCatalogItemFromSource({
    canonicalName:
      record.canonicalName,

    character:
      record.character,

    category:
      record.category,

    releaseDate:
      record.releaseDate,

    imageUrl:
      record.imageUrl,

    sourceName:
      record.sourceName,

    sourceUrl:
      record.sourceUrl,

    sourceKey:
      record.sourceKey,

    sourceUpdatedAt:
      now,

    memoryText:
      record.memoryText,

    memoryTextSourceUrl:
      record.memoryText
        ? record.sourceUrl
        : null,
  })

}


function linkArchiveRecordToMemories(
  archiveItem:
    CatalogItem,
  record:
    SupplementalCatalogRecord
) {

  const candidates =
    mergeUniqueMemoryNames([
      ...record.linkedMemoryNames,

      /*
       * Most Memoria / Tender Moment / Secret Time
       * entries share their title with the underlying
       * Memory. This fallback also handles wiki pages
       * where Unlock Conditions do not expose a link.
       */
      ...(
        record.category ===
          'Memoria' ||
        record.category ===
          'Secret Times' ||
        record.category ===
          'Tender Moments'
          ? [
              `${record.character}: ${record.title}`,
            ]
          : []
      ),
    ])


  const existingLinks =
    new Set(
      listCatalogMemoryLinks(
        archiveItem.id
      )
        .map(
          (link) =>
            link.memoryCatalogItemId
        )
    )


  let linked =
    0


  let newlyLinked =
    0


  for (
    const memoryName
    of candidates
  ) {

    const memory =
      findCatalogItemByCharacterAndName(
        record.character,
        memoryName,
        'Memory'
      )


    if (
      !memory
    ) {

      continue

    }


    const alreadyLinked =
      existingLinks.has(
        memory.id
      )


    linkCatalogMemory(
      archiveItem.id,
      memory.id,
      'unlock'
    )


    linked +=
      1


    if (
      !alreadyLinked
    ) {

      newlyLinked +=
        1

    }

  }


  return {
    linked,
    newlyLinked,
  }

}


export async function syncSupplementalCatalog(
  character: string,
  onProgress?:
    SupplementalSyncProgressCallback
): Promise<SupplementalSyncResult> {

  let catalogItems =
    await loadAllCatalogItems()


  const fallingStats = {
    discovered:
      0,

    created:
      0,

    enriched:
      0,

    existing:
      0,

    skipped:
      0,

    linkedMemories:
      0,
  }


  const byYourSideStats = {
    discovered:
      0,

    created:
      0,

    existingMemory:
      0,

    existingSupplemental:
      0,

    skipped:
      0,

    linkedMemories:
      0,
  }


  /*
   * ========================================
   * FALLING FOR YOU
   * ========================================
   *
   * Authoritative archive structure for:
   *   - Bond
   *   - Memoria
   *   - Myths
   *
   * All Memories should already have run first
   * as the Memory-card backup/artwork source.
   */
  const fallingEntries =
    await fetchFallingForYouRecords(
      character,
      onProgress
    )


  fallingStats.discovered =
    fallingEntries.length


  for (
    const [
      index,
      entry,
    ]
    of fallingEntries.entries()
  ) {

    onProgress?.({
      phase:
        'reading-date-pages',

      current:
        index,

      total:
        fallingEntries.length,

      percent:
        8 +
        Math.round(
          (
            index /
            Math.max(
              1,
              fallingEntries.length
            )
          ) *
          52
        ),

      message:
        `Reading Falling for You ${index + 1} of ${fallingEntries.length}: ${entry.title}`,
    })


    try {

      const record =
        await readFallingForYouDetail(
          character,
          entry,
          (
            retry
          ) => {

            onProgress?.({
              phase:
                'reading-date-pages',

              current:
                index,

              total:
                fallingEntries.length,

              percent:
                8 +
                Math.round(
                  (
                    index /
                    Math.max(
                      1,
                      fallingEntries.length
                    )
                  ) *
                  52
                ),

              message:
                `Rate limit while reading Falling for You ${index + 1} of ${fallingEntries.length}: ${entry.title}. Waiting ${Math.max(
                  1,
                  Math.ceil(
                    retry.waitMs /
                    1000
                  )
                )}s, then resuming automatically.`,
            })

          }
        )


      const existing =
        findExistingArchiveRecord(
          catalogItems,
          record
        )


      const upserted =
        upsertArchiveRecord(
          record,
          existing
        )


      if (
        upserted.created
      ) {

        fallingStats.created +=
          1

      } else if (
        upserted.updated
      ) {

        fallingStats.enriched +=
          1

      } else {

        fallingStats.existing +=
          1

      }


      if (
        upserted.item
      ) {

        const relationships =
          linkArchiveRecordToMemories(
            upserted.item,
            record
          )


        fallingStats.linkedMemories +=
          relationships.newlyLinked

      }


      catalogItems =
        await loadAllCatalogItems()

    } catch (error) {

      console.error(
        `Unable to process Falling for You entry ${entry.title}:`,
        error
      )


      fallingStats.skipped +=
        1


    }

  }


  onProgress?.({
    phase:
      'importing-falling-for-you',

    current:
      fallingEntries.length,

    total:
      fallingEntries.length,

    percent:
      68,

    message:
      `Falling for You complete: ${fallingStats.created} created, ${fallingStats.enriched} refreshed, ${fallingStats.linkedMemories} new Memory links.`,
  })


  /*
   * ========================================
   * BY YOUR SIDE
   * ========================================
   *
   * Authoritative archive structure for:
   *   - Tender Moments
   *   - Secret Times
   *
   * Unlike the previous importer, a same-name Memory
   * NO LONGER causes the archive record to be skipped.
   * The archive row is created and related to the
   * Memory instead.
   */
  const byYourSideEntries =
    await fetchByYourSideRecords(
      character,
      onProgress
    )


  byYourSideStats.discovered =
    byYourSideEntries.length


  for (
    const [
      index,
      entry,
    ]
    of byYourSideEntries.entries()
  ) {

    onProgress?.({
      phase:
        'importing-by-your-side',

      current:
        index,

      total:
        byYourSideEntries.length,

      percent:
        76 +
        Math.round(
          (
            index /
            Math.max(
              1,
              byYourSideEntries.length
            )
          ) *
          23
        ),

      message:
        `Reading By Your Side ${index + 1} of ${byYourSideEntries.length}: ${entry.title}`,
    })


    try {

      const record =
        await readByYourSideDetail(
          character,
          entry,
          (
            retry
          ) => {

            onProgress?.({
              phase:
                'importing-by-your-side',

              current:
                index,

              total:
                byYourSideEntries.length,

              percent:
                76 +
                Math.round(
                  (
                    index /
                    Math.max(
                      1,
                      byYourSideEntries.length
                    )
                  ) *
                  23
                ),

              message:
                `Rate limit while reading By Your Side ${index + 1} of ${byYourSideEntries.length}: ${entry.title}. Waiting ${Math.max(
                  1,
                  Math.ceil(
                    retry.waitMs /
                    1000
                  )
                )}s, then resuming automatically.`,
            })

          }
        )


      const existing =
        findExistingArchiveRecord(
          catalogItems,
          record
        )


      const upserted =
        upsertArchiveRecord(
          record,
          existing
        )


      if (
        upserted.created
      ) {

        byYourSideStats.created +=
          1

      } else {

        byYourSideStats.existingSupplemental +=
          1

      }


      if (
        upserted.item
      ) {

        const relationships =
          linkArchiveRecordToMemories(
            upserted.item,
            record
          )


        byYourSideStats.linkedMemories +=
          relationships.newlyLinked


        if (
          relationships.linked >
          0
        ) {

          byYourSideStats.existingMemory +=
            1

        }

      }


      catalogItems =
        await loadAllCatalogItems()

    } catch (error) {

      console.error(
        `Unable to process By Your Side entry ${entry.title}:`,
        error
      )


      byYourSideStats.skipped +=
        1


    }

  }


  const result:
    SupplementalSyncResult = {

    character,

    fetchedAt:
      new Date()
        .toISOString(),

    fallingForYou:
      {
        discovered:
          fallingStats.discovered,

        created:
          fallingStats.created,

        enriched:
          fallingStats.enriched,

        existing:
          fallingStats.existing,

        skipped:
          fallingStats.skipped,
      },

    byYourSide:
      byYourSideStats,

    totalCreated:
      fallingStats.created +
      byYourSideStats.created,

    totalEnriched:
      fallingStats.enriched +
      byYourSideStats
        .existingSupplemental,

    totalLinkedMemories:
      fallingStats.linkedMemories +
      byYourSideStats
        .linkedMemories,
  }


  onProgress?.({
    phase:
      'complete',

    current:
      fallingEntries.length +
      byYourSideEntries.length,

    total:
      fallingEntries.length +
      byYourSideEntries.length,

    percent:
      100,

    message:
      `Archive structure sync complete: ${result.totalCreated} created, ${result.totalEnriched} refreshed, ${result.totalLinkedMemories} new Memory relationships.`,
  })


  return result

}

