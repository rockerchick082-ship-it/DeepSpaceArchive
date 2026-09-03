import type {
  AutoMatchResult,
  BulkMatchResponse,
  BulkOverrideResponse,
  CandidateResponse,
  CatalogArchiveLink,
  CatalogItem,
  CatalogMemoryLink,
  CatalogRelationshipView,
  CatalogResponse,
  CatalogStats,
  WikiCacheFreshnessResult,
  WikiPhoneSyncResult,
  WikiPreviewResponse,
  WikiSyncJob,
  WikiSyncProgress,
} from './catalogTypes'


type CatalogRecordInput = {
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
  sourceKey: string | null
  sourceUpdatedAt: string | null
  manualNotes: string | null
}


export type CatalogFileLinkInput = {
  category: string
  relativePath: string
  matchMethod: string
  confidence: number
  manuallyConfirmed: boolean
}


export type CatalogOverrideResult = {
  changed?: boolean
  fileName?: string
  warnings?: string[]
}


type ErrorPayload = {
  error?: string
}


async function readErrorMessage(
  response: Response,
  fallback: string
) {

  const data =
    await response.json()
      .catch(
        () => null
      ) as ErrorPayload | null


  return (
    data?.error ??
    fallback
  )

}


async function requestJson<T>(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  fallbackError: string
) {

  const response =
    await fetch(
      input,
      init
    )


  if (
    !response.ok
  ) {

    throw new Error(
      await readErrorMessage(
        response,
        fallbackError
      )
    )

  }


  return (
    await response.json()
  ) as T

}


async function requestOk(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  fallbackError: string
) {

  const response =
    await fetch(
      input,
      init
    )


  if (
    !response.ok
  ) {

    throw new Error(
      await readErrorMessage(
        response,
        fallbackError
      )
    )

  }

}


export async function fetchCatalog(
  queryString: string
) {

  return requestJson<CatalogResponse>(
    `/api/catalog${queryString}`,
    undefined,
    'Unable to load metadata catalog.'
  )

}


export async function fetchAllCatalogItems(
  queryString: string
): Promise<CatalogItem[]> {

  const allItems:
    CatalogItem[] =
      []


  const query =
    new URLSearchParams(
      queryString.startsWith(
        '?'
      )
        ? queryString.slice(
            1
          )
        : queryString
    )


  /*
   * The backend intentionally caps one catalog request
   * at 500 records. Walk the filtered result in 500-row
   * chunks so bulk tools and next-record navigation are
   * never limited by table pagination.
   */
  const chunkSize =
    500


  let offset =
    0


  let total =
    Number.POSITIVE_INFINITY


  while (
    offset <
    total
  ) {

    query.set(
      'limit',
      String(
        chunkSize
      )
    )


    query.set(
      'offset',
      String(
        offset
      )
    )


    const data =
      await fetchCatalog(
        `?${query.toString()}`
      )


    total =
      data.count


    allItems.push(
      ...data.items
    )


    if (
      data.items.length ===
      0
    ) {

      break

    }


    offset +=
      data.items.length

  }


  return allItems

}


export async function fetchAllCatalogItemIds(
  queryString: string
) {

  const items =
    await fetchAllCatalogItems(
      queryString
    )


  return items.map(
    (item) =>
      item.id
  )

}


export async function fetchCatalogStats() {

  return requestJson<CatalogStats>(
    '/api/catalog/stats',
    undefined,
    'Unable to load catalog statistics.'
  )

}


export async function saveCatalogRecord(
  catalogItemId: number | null,
  body: CatalogRecordInput
) {

  await requestOk(
    catalogItemId ===
      null
      ? '/api/catalog'
      : `/api/catalog/${catalogItemId}`,
    {
      method:
        catalogItemId ===
          null
          ? 'POST'
          : 'PUT',

      headers: {
        'Content-Type':
          'application/json',
      },

      body:
        JSON.stringify(
          body
        ),
    },
    'Unable to save catalog record.'
  )

}


export async function deleteCatalogRecord(
  catalogItemId: number
) {

  await requestOk(
    `/api/catalog/${catalogItemId}`,
    {
      method:
        'DELETE',
    },
    'Unable to delete catalog record.'
  )

}


export async function fetchWikiCacheStatus(
  force = false
) {

  const query =
    new URLSearchParams()


  if (
    force
  ) {

    query.set(
      'force',
      'true'
    )

  }


  const suffix =
    query.toString()
      ? `?${query}`
      : ''


  return requestJson<WikiCacheFreshnessResult>(
    `/api/catalog/wiki/cache/status${suffix}`,
    undefined,
    'Unable to check wiki page freshness.'
  )

}


export async function refreshWikiCacheStatus() {

  return requestJson<WikiCacheFreshnessResult>(
    '/api/catalog/wiki/cache/check',
    {
      method:
        'POST',
    },
    'Unable to refresh wiki page freshness.'
  )

}


export async function fetchWikiMemoryPreview(
  character: string
) {

  const query =
    new URLSearchParams({
      character,
    })


  return requestJson<WikiPreviewResponse>(
    `/api/catalog/wiki/memories/preview?${query}`,
    undefined,
    'Unable to preview wiki memories.'
  )

}


export async function startWikiMemorySync(
  character: string
) {

  return requestJson<{
    jobId: string
    progress: WikiSyncProgress
  }>(
    '/api/catalog/wiki/memories/sync/start',
    {
      method:
        'POST',

      headers: {
        'Content-Type':
          'application/json',
      },

      body:
        JSON.stringify({
          character,
        }),
    },
    'Unable to start wiki sync.'
  )

}


export async function fetchWikiMemorySyncJob(
  jobId: string
) {

  return requestJson<WikiSyncJob>(
    `/api/catalog/wiki/memories/sync/${jobId}`,
    undefined,
    'Unable to read wiki sync progress.'
  )

}


export async function syncPhoneCatalog(
  character: string
) {

  return requestJson<WikiPhoneSyncResult>(
    '/api/catalog/wiki/phone/sync',
    {
      method:
        'POST',

      headers: {
        'Content-Type':
          'application/json',
      },

      body:
        JSON.stringify({
          character,
        }),
    },
    'Unable to sync phone metadata.'
  )

}


export async function fetchBulkOverridePreview(
  catalogItemIds: number[]
) {

  if (
    catalogItemIds.length ===
    0
  ) {

    return {
      count:
        0,

      eligible:
        0,

      alreadyNamed:
        0,

      rows:
        [],
    } as BulkOverrideResponse

  }


  const chunkSize =
    500


  const responses:
    BulkOverrideResponse[] =
      []


  for (
    let offset =
      0;

    offset <
      catalogItemIds.length;

    offset +=
      chunkSize
  ) {

    const ids =
      catalogItemIds.slice(
        offset,
        offset +
          chunkSize
      )


    responses.push(
      await requestJson<BulkOverrideResponse>(
        '/api/catalog/bulk-override-preview',
        {
          method:
            'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify({
              catalogItemIds:
                ids,
            }),
        },
        'Unable to load matched files for bulk Override.'
      )
    )

  }


  return {
    count:
      responses.reduce(
        (
          total,
          response
        ) =>
          total +
          response.count,
        0
      ),

    eligible:
      responses.reduce(
        (
          total,
          response
        ) =>
          total +
          response.eligible,
        0
      ),

    alreadyNamed:
      responses.reduce(
        (
          total,
          response
        ) =>
          total +
          response.alreadyNamed,
        0
      ),

    rows:
      responses.flatMap(
        (response) =>
          response.rows
      ),
  } as BulkOverrideResponse

}



export async function overrideCatalogFileName(
  catalogItemId: number,
  fallbackError:
    string =
      'Unable to rename the matched archive file.'
) {

  return requestJson<
    CatalogOverrideResult
  >(
    `/api/catalog/${catalogItemId}/files/override-name`,
    {
      method:
        'POST',
    },
    fallbackError
  )

}


export async function fetchBulkMatchOptions(
  catalogItemIds: number[]
) {

  if (
    catalogItemIds.length ===
    0
  ) {

    return {
      count:
        0,

      rows:
        [],
    } as BulkMatchResponse

  }


  const chunkSize =
    500


  const responses:
    BulkMatchResponse[] =
      []


  for (
    let offset =
      0;

    offset <
      catalogItemIds.length;

    offset +=
      chunkSize
  ) {

    const ids =
      catalogItemIds.slice(
        offset,
        offset +
          chunkSize
      )


    responses.push(
      await requestJson<BulkMatchResponse>(
        '/api/catalog/bulk-match-options',
        {
          method:
            'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify({
              catalogItemIds:
                ids,
            }),
        },
        'Unable to load filtered match options.'
      )
    )

  }


  return {
    count:
      responses.reduce(
        (
          total,
          response
        ) =>
          total +
          response.count,
        0
      ),

    rows:
      responses.flatMap(
        (response) =>
          response.rows
      ),
  } as BulkMatchResponse

}



export async function linkCatalogFile(
  catalogItemId: number,
  input: CatalogFileLinkInput,
  fallbackError:
    string =
      'Unable to link file.'
) {

  await requestOk(
    `/api/catalog/${catalogItemId}/files`,
    {
      method:
        'POST',

      headers: {
        'Content-Type':
          'application/json',
      },

      body:
        JSON.stringify(
          input
        ),
    },
    fallbackError
  )

}


export async function fetchCatalogCandidates(
  catalogItemId: number
) {

  return requestJson<CandidateResponse>(
    `/api/catalog/${catalogItemId}/candidates`,
    undefined,
    'Unable to load file candidates.'
  )

}


export async function fetchCatalogRelationshipItems(
  catalogItemId: number,
  mode:
    CatalogRelationshipView['mode']
): Promise<CatalogItem[]> {

  if (
    mode ===
      'memories'
  ) {

    const data =
      await requestJson<{
        items:
          CatalogMemoryLink[]
      }>(
        `/api/catalog/${catalogItemId}/memories`,
        undefined,
        'Unable to load catalog relationships.'
      )


    return data.items.map(
      (link) =>
        link.memory
    )

  }


  const data =
    await requestJson<{
      items:
        CatalogArchiveLink[]
    }>(
      `/api/catalog/${catalogItemId}/archive-links`,
      undefined,
      'Unable to load catalog relationships.'
    )


  return data.items.map(
    (link) =>
      link.archiveItem
  )

}


export async function runCatalogAutoMatch(
  includedCategories: string[]
) {

  return requestJson<AutoMatchResult>(
    '/api/catalog/auto-match',
    {
      method:
        'POST',

      headers: {
        'Content-Type':
          'application/json',
      },

      body:
        JSON.stringify({
          includedCategories,
        }),
    },
    'Unable to auto-match catalog.'
  )

}