const maxFreshAgeMs =
  24 * 60 * 60 * 1000


const requestTimeoutMs =
  20 * 1000


export type WikiPageFreshnessStatus = {
  id: string
  label: string
  sourceUrl: string
  purgeUrl: string
  checkedAt: string
  updatedAt: string | null
  ageHours: number | null
  fresh: boolean | null
  stale: boolean
  autoPurgeAttempted: boolean
  autoPurgeSucceeded: boolean | null
  error: string | null
}


export type WikiCacheFreshnessResult = {
  checkedAt: string
  maxAgeHours: number
  allFresh: boolean
  needsAttention: boolean
  pages: WikiPageFreshnessStatus[]
}


type WikiPageDefinition = {
  id: string
  label: string
  sourceUrl: string
}


const pages:
  WikiPageDefinition[] = [
    {
      id:
        'all-memories',

      label:
        'All Memories',

      sourceUrl:
        'https://loveanddeepspace.wiki.gg/wiki/All_Memories',
    },

    {
      id:
        'falling-for-you',

      label:
        'Falling for You',

      sourceUrl:
        'https://loveanddeepspace.wiki.gg/wiki/Falling_for_You',
    },

    {
      id:
        'by-your-side',

      label:
        'By Your Side',

      sourceUrl:
        'https://loveanddeepspace.wiki.gg/wiki/By_Your_Side',
    },

    {
      id:
        'phone-calls',

      label:
        'Phone Calls',

      sourceUrl:
        'https://loveanddeepspace.wiki.gg/wiki/Phone_Calls',
    },
  ]


let cachedResult:
  WikiCacheFreshnessResult | null =
    null


let cachedAt =
  0


const statusCacheMs =
  5 * 60 * 1000


function manualPurgeUrl(
  sourceUrl: string
) {

  const url =
    new URL(
      sourceUrl
    )


  url.searchParams.set(
    'action',
    'purge'
  )


  return url.toString()

}


function mediaWikiTitle(
  sourceUrl: string
) {

  const url =
    new URL(
      sourceUrl
    )


  const marker =
    '/wiki/'


  const index =
    url.pathname.indexOf(
      marker
    )


  if (
    index <
    0
  ) {

    return null

  }


  return decodeURIComponent(
    url.pathname.slice(
      index +
      marker.length
    )
  )

}


function parseGeneratedPageUpdatedAt(
  html: string
) {

  const normalized =
    html
      .replace(
        /&nbsp;/gi,
        ' '
      )
      .replace(
        /\s+/g,
        ' '
      )


  const match =
    normalized.match(
      /last update was(?: on)?\s+(\d{4}-\d{1,2}-\d{1,2})\s+(\d{1,2}:\d{2})(?::\d{2})?\s+UTC/i
    )


  if (
    !match
  ) {

    return null

  }


  const dateParts =
    match[1]
      .split(
        '-'
      )
      .map(
        Number
      )


  const timeParts =
    match[2]
      .split(
        ':'
      )
      .map(
        Number
      )


  if (
    dateParts.length !==
      3 ||
    timeParts.length !==
      2
  ) {

    return null

  }


  const timestamp =
    Date.UTC(
      dateParts[0],
      dateParts[1] - 1,
      dateParts[2],
      timeParts[0],
      timeParts[1],
      0,
      0
    )


  if (
    !Number.isFinite(
      timestamp
    )
  ) {

    return null

  }


  return new Date(
    timestamp
  )

}


async function fetchPageHtml(
  sourceUrl: string
) {

  const url =
    new URL(
      sourceUrl
    )


  url.searchParams.set(
    'dsaFreshnessCheck',
    String(
      Date.now()
    )
  )


  const response =
    await fetch(
      url,
      {
        headers: {
          'User-Agent':
            'DeepSpaceArchive/1.0 wiki cache freshness check',

          'Cache-Control':
            'no-cache',
        },

        signal:
          AbortSignal.timeout(
            requestTimeoutMs
          ),
      }
    )


  if (
    !response.ok
  ) {

    throw new Error(
      `HTTP ${response.status}`
    )

  }


  return response.text()

}


async function purgePage(
  sourceUrl: string
) {

  const source =
    new URL(
      sourceUrl
    )


  const title =
    mediaWikiTitle(
      sourceUrl
    )


  if (
    !title
  ) {

    return false

  }


  const apiUrl =
    new URL(
      '/api.php',
      source.origin
    )


  const body =
    new URLSearchParams({
      action:
        'purge',

      format:
        'json',

      formatversion:
        '2',

      titles:
        title,

      forcelinkupdate:
        '1',
    })


  const response =
    await fetch(
      apiUrl,
      {
        method:
          'POST',

        headers: {
          'User-Agent':
            'DeepSpaceArchive/1.0 wiki cache freshness check',

          'Content-Type':
            'application/x-www-form-urlencoded;charset=UTF-8',
        },

        body,

        signal:
          AbortSignal.timeout(
            requestTimeoutMs
          ),
      }
    )


  if (
    !response.ok
  ) {

    return false

  }


  const payload =
    await response.json()
      .catch(
        () => null
      ) as
        {
          purge?:
            Array<{
              title?: string
              purged?: boolean
            }>
        } |
        null


  return Boolean(
    payload?.purge?.some(
      (item) =>
        item.purged ===
          true
    )
  )

}


async function checkPage(
  page:
    WikiPageDefinition,
  attemptAutoPurge:
    boolean
): Promise<WikiPageFreshnessStatus> {

  const checkedAt =
    new Date()
      .toISOString()


  try {

    let html =
      await fetchPageHtml(
        page.sourceUrl
      )


    let updatedAt =
      parseGeneratedPageUpdatedAt(
        html
      )


    let ageHours =
      updatedAt
        ? (
            Date.now() -
            updatedAt.getTime()
          ) /
          (
            60 *
            60 *
            1000
          )
        : null


    let fresh =
      ageHours ===
        null
        ? null
        : ageHours <=
          24


    let stale =
      fresh ===
        false


    let autoPurgeAttempted =
      false


    let autoPurgeSucceeded:
      boolean | null =
      null


    if (
      stale &&
      attemptAutoPurge
    ) {

      autoPurgeAttempted =
        true


      const purgeAccepted =
        await purgePage(
          page.sourceUrl
        )


      autoPurgeSucceeded =
        purgeAccepted


      if (
        purgeAccepted
      ) {

        await new Promise<void>(
          (resolve) => {

            setTimeout(
              resolve,
              1200
            )

          }
        )


        html =
          await fetchPageHtml(
            page.sourceUrl
          )


        updatedAt =
          parseGeneratedPageUpdatedAt(
            html
          )


        ageHours =
          updatedAt
            ? (
                Date.now() -
                updatedAt.getTime()
              ) /
              (
                60 *
                60 *
                1000
              )
            : null


        fresh =
          ageHours ===
            null
            ? null
            : ageHours <=
              24


        stale =
          fresh ===
            false


        autoPurgeSucceeded =
          !stale &&
          fresh !==
            null

      }

    }


    return {
      id:
        page.id,

      label:
        page.label,

      sourceUrl:
        page.sourceUrl,

      purgeUrl:
        manualPurgeUrl(
          page.sourceUrl
        ),

      checkedAt,

      updatedAt:
        updatedAt
          ?.toISOString() ??
        null,

      ageHours:
        ageHours ===
          null
          ? null
          : Math.max(
              0,
              Math.round(
                ageHours *
                10
              ) /
              10
            ),

      fresh,

      stale,

      autoPurgeAttempted,

      autoPurgeSucceeded,

      error:
        null,
    }

  } catch (error) {

    return {
      id:
        page.id,

      label:
        page.label,

      sourceUrl:
        page.sourceUrl,

      purgeUrl:
        manualPurgeUrl(
          page.sourceUrl
        ),

      checkedAt,

      updatedAt:
        null,

      ageHours:
        null,

      fresh:
        null,

      stale:
        false,

      autoPurgeAttempted:
        false,

      autoPurgeSucceeded:
        null,

      error:
        error instanceof
          Error
          ? error.message
          : 'Unable to check page freshness.',
    }

  }

}


export async function checkWikiPageFreshness(
  options: {
    force?:
      boolean

    attemptAutoPurge?:
      boolean
  } = {}
): Promise<WikiCacheFreshnessResult> {

  const now =
    Date.now()


  if (
    !options.force &&
    cachedResult &&
    now -
      cachedAt <
      statusCacheMs
  ) {

    return cachedResult

  }


  const statuses:
    WikiPageFreshnessStatus[] =
    []


  /*
   * Run sequentially to be gentle with wiki.gg and avoid turning
   * one freshness check into a burst of four simultaneous requests.
   */
  for (
    const page
    of pages
  ) {

    statuses.push(
      await checkPage(
        page,
        options.attemptAutoPurge !==
          false
      )
    )

  }


  const result:
    WikiCacheFreshnessResult = {
    checkedAt:
      new Date()
        .toISOString(),

    maxAgeHours:
      maxFreshAgeMs /
      (
        60 *
        60 *
        1000
      ),

    allFresh:
      statuses.every(
        (status) =>
          status.fresh ===
            true
      ),

    needsAttention:
      statuses.some(
        (status) =>
          status.fresh !==
            true ||
          status.error !==
            null ||
          (
            status.autoPurgeAttempted &&
            status.autoPurgeSucceeded ===
              false
          )
      ),

    pages:
      statuses,
  }


  cachedResult =
    result


  cachedAt =
    Date.now()


  return result

}


export function clearWikiPageFreshnessCache() {

  cachedResult =
    null


  cachedAt =
    0

}
