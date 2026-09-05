import {
  Router,
} from 'express'

import {
  randomUUID,
} from 'node:crypto'

import fs from 'node:fs/promises'
import path from 'node:path'

import {
  createCatalogItem,
  deleteCatalogItem,
  getCatalogItem,
  getCatalogStats,
  linkCatalogFile,
  linkCatalogMemory,
  listCatalogArchiveLinks,
  listCatalogItems,
  listCatalogMemoryLinks,
  renameCatalogFilePath,
  unlinkCatalogFile,
  unlinkCatalogMemory,
  updateCatalogItem,
} from '../state/metadataCatalog'

import type {
  CatalogItemInput,
} from '../state/metadataCatalog'

import {
  renameArchiveStatePath,
} from '../state/archiveState'

import {
  renamePlaylistItemPath,
} from '../state/playlists'

import {
  autoMatchCatalog,
  getBulkCatalogMatchOptions,
  getCatalogMatchCandidates,
} from '../services/catalogMatcher'

import {
  fetchWikiMemories,
  syncWikiMemories,
} from '../services/wikiCatalogSync'

import {
  syncSupplementalCatalog,
} from '../services/supplementalCatalogSync'

import type {
  SupplementalSyncResult,
} from '../services/supplementalCatalogSync'

import {
  fetchWikiPhoneCalls,
  syncWikiPhoneCalls,
} from '../services/phoneCatalogSync'

import type {
  WikiSyncProgress,
  WikiSyncResult,
} from '../services/wikiCatalogSync'


import {
  checkWikiPageFreshness,
  clearWikiPageFreshnessCache,
} from '../services/wikiPageFreshness'


const router =
  Router()


type WikiSyncJob = {
  id: string
  character: string
  status:
    | 'running'
    | 'complete'
    | 'error'

  progress:
    WikiSyncProgress

  result:
    WikiSyncResult | null

  supplementalResult:
    SupplementalSyncResult | null

  phoneResult:
    Awaited<
      ReturnType<
        typeof syncWikiPhoneCalls
      >
    > | null

  error:
    string | null

  createdAt: string
  updatedAt: string
}


const wikiSyncJobs =
  new Map<
    string,
    WikiSyncJob
  >()


function parseOptionalBoolean(
  value:
    unknown
) {

  if (
    value ===
      'true'
  ) {

    return true

  }


  if (
    value ===
      'false'
  ) {

    return false

  }


  return undefined

}


function parseOptionalInteger(
  value:
    unknown
) {

  if (
    typeof value !==
      'string' ||
    !value.trim()
  ) {

    return undefined

  }


  const parsed =
    Number(
      value
    )


  if (
    !Number.isInteger(
      parsed
    )
  ) {

    return undefined

  }


  return parsed

}



function normalizePortablePath(
  value: string
) {

  return value
    .replace(
      /\\/g,
      '/'
    )
    .replace(
      /^\.\/+/,
      ''
    )

}


function catalogFileBaseName(
  canonicalName: string,
  character:
    string | null
) {

  let value =
    canonicalName
      .trim()


  if (
    character
  ) {

    const prefix =
      `${character}:`


    if (
      value
        .toLowerCase()
        .startsWith(
          prefix
            .toLowerCase()
        )
    ) {

      value =
        value
          .slice(
            prefix.length
          )
          .trim()

    }

  }


  /*
   * Preserve apostrophes and normal punctuation, but
   * remove characters Windows does not allow in file
   * names. This keeps names such as Rain's Embrace.
   */
  value =
    value
      .replace(
        /[<>:"/\\|?*\u0000-\u001f]/g,
        '-'
      )
      .replace(
        /\s+/g,
        ' '
      )
      .replace(
        /[. ]+$/g,
        ''
      )
      .trim()


  return (
    value ||
    'Archive Item'
  )

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


function resolvedLibraryFilePath(
  libraryPath: string,
  relativePath: string
) {

  const root =
    path.resolve(
      libraryPath
    )


  const candidate =
    path.resolve(
      root,
      ...normalizePortablePath(
        relativePath
      )
        .split('/')
    )


  const relative =
    path.relative(
      root,
      candidate
    )


  if (
    relative.startsWith(
      '..'
    ) ||
    path.isAbsolute(
      relative
    )
  ) {

    throw new Error(
      'Catalog file path resolves outside the media library.'
    )

  }


  return {
    root,
    candidate,
  }

}


function readCatalogInput(
  body:
    Record<
      string,
      unknown
    >
): CatalogItemInput | null {

  const canonicalName =
    body.canonicalName


  const category =
    body.category


  if (
    typeof canonicalName !==
      'string' ||
    !canonicalName.trim() ||
    typeof category !==
      'string' ||
    !category.trim()
  ) {

    return null

  }


  const rarity =
    body.rarity


  if (
    rarity !==
      undefined &&
    rarity !==
      null &&
    (
      typeof rarity !==
        'number' ||
      !Number.isInteger(
        rarity
      )
    )
  ) {

    return null

  }


  const readOptionalString =
    (
      value:
        unknown
    ) => {

      if (
        value ===
          undefined ||
        value ===
          null
      ) {

        return null

      }


      if (
        typeof value !==
          'string'
      ) {

        return undefined

      }


      return value

    }


  const character =
    readOptionalString(
      body.character
    )


  const subcategory =
    readOptionalString(
      body.subcategory
    )


  const releaseDate =
    readOptionalString(
      body.releaseDate
    )


  const position =
    readOptionalString(
      body.position
    )


  const attribute =
    readOptionalString(
      body.attribute
    )


  const source =
    readOptionalString(
      body.source
    )


  const imageUrl =
    readOptionalString(
      body.imageUrl
    )


  const sourceName =
    readOptionalString(
      body.sourceName
    )


  const sourceUrl =
    readOptionalString(
      body.sourceUrl
    )


  const sourceKey =
    readOptionalString(
      body.sourceKey
    )


  const sourceUpdatedAt =
    readOptionalString(
      body.sourceUpdatedAt
    )


  const manualNotes =
    readOptionalString(
      body.manualNotes
    )


  const memoryText =
    readOptionalString(
      body.memoryText
    )


  const memoryTextSourceUrl =
    readOptionalString(
      body.memoryTextSourceUrl
    )


  if (
    character ===
      undefined ||
    subcategory ===
      undefined ||
    releaseDate ===
      undefined ||
    position ===
      undefined ||
    attribute ===
      undefined ||
    source ===
      undefined ||
    imageUrl ===
      undefined ||
    sourceName ===
      undefined ||
    sourceUrl ===
      undefined ||
    sourceKey ===
      undefined ||
    sourceUpdatedAt ===
      undefined ||
    manualNotes ===
      undefined ||
    memoryText ===
      undefined ||
    memoryTextSourceUrl ===
      undefined
  ) {

    return null

  }


  return {
    canonicalName:
      canonicalName.trim(),

    character,

    category:
      category.trim(),

    subcategory,

    releaseDate,

    rarity:
      rarity ===
        undefined
        ? null
        : rarity as
            number | null,

    position,

    attribute,

    source,

    imageUrl,

    sourceName,

    sourceUrl,

    sourceKey,

    sourceUpdatedAt,

    manualNotes,

    memoryText,

    memoryTextSourceUrl,
  }

}


router.get(
  '/',
  (request, response) => {

    const rarity =
      parseOptionalInteger(
        request.query.rarity
      )


    const excludeRarity =
      parseOptionalInteger(
        request.query.excludeRarity
      )


    const limit =
      parseOptionalInteger(
        request.query.limit
      )


    const offset =
      parseOptionalInteger(
        request.query.offset
      )


    const categories =
      typeof request.query.categories ===
        'string'
        ? request.query.categories
            .split(
              '|'
            )
            .map(
              (value) =>
                value.trim()
            )
            .filter(
              Boolean
            )
        : undefined


    response.json(
      listCatalogItems({
        query:
          typeof request.query.q ===
            'string'
            ? request.query.q
            : undefined,

        character:
          typeof request.query.character ===
            'string'
            ? request.query.character
            : undefined,

        category:
          typeof request.query.category ===
            'string'
            ? request.query.category
            : undefined,

        categories,

        subcategory:
          typeof request.query.subcategory ===
            'string'
            ? request.query.subcategory
            : undefined,

        rarity,

        excludeRarity,

        hasFile:
          parseOptionalBoolean(
            request.query.hasFile
          ),

        limit,

        offset,
      })
    )

  }
)


router.get(
  '/wiki/cache/status',
  async (
    request,
    response
  ) => {

    try {

      const force =
        request.query.force ===
          'true'


      const result =
        await checkWikiPageFreshness({
          force,

          attemptAutoPurge:
            true,
        })


      response.json(
        result
      )

    } catch (error) {

      console.error(
        'Unable to check wiki page freshness:',
        error
      )


      response.status(502).json({
        error:
          'Unable to check wiki page freshness.',
      })

    }

  }
)


router.post(
  '/wiki/cache/check',
  async (
    _request,
    response
  ) => {

    try {

      clearWikiPageFreshnessCache()


      const result =
        await checkWikiPageFreshness({
          force:
            true,

          attemptAutoPurge:
            true,
        })


      response.json(
        result
      )

    } catch (error) {

      console.error(
        'Unable to refresh wiki page freshness:',
        error
      )


      response.status(502).json({
        error:
          'Unable to refresh wiki page freshness.',
      })

    }

  }
)


router.get(
  '/stats',
  (_request, response) => {

    response.json(
      getCatalogStats()
    )

  }
)


router.get(
  '/wiki/memories/preview',
  async (
    request,
    response
  ) => {

    const character =
      typeof request.query.character ===
        'string'
        ? request.query.character.trim()
        : ''


    if (
      !character
    ) {

      response.status(400).json({
        error:
          'character is required',
      })

      return

    }


    try {

      const items =
        await fetchWikiMemories(
          character
        )


      response.json({
        character,

        count:
          items.length,

        items,
      })

    } catch (error) {

      console.error(
        'Unable to preview wiki memories:',
        error
      )


      response.status(502).json({
        error:
          'Unable to read memories from wiki.gg',
      })

    }

  }
)


router.post(
  '/wiki/memories/sync/start',
  (
    request,
    response
  ) => {

    const character =
      typeof request.body.character ===
        'string'
        ? request.body.character.trim()
        : ''


    if (
      !character
    ) {

      response.status(400).json({
        error:
          'character is required',
      })

      return

    }


    const jobId =
      randomUUID()


    const now =
      new Date()
        .toISOString()


    const job:
      WikiSyncJob = {
      id:
        jobId,

      character,

      status:
        'running',

      progress: {
        phase:
          'fetching-list',

        current:
          0,

        total:
          1,

        percent:
          0,

        message:
          `Starting ${character} wiki sync...`,
      },

      result:
        null,

      supplementalResult:
        null,

      phoneResult:
        null,

      error:
        null,

      createdAt:
        now,

      updatedAt:
        now,
    }


    wikiSyncJobs.set(
      jobId,
      job
    )


    void (
      async () => {

        /*
         * ========================================
         * STEP 1 — ALL MEMORIES BACKUP / ENRICHMENT
         * ========================================
         *
         * All Memories is no longer responsible for
         * deciding which archive section an item belongs
         * to. It supplies the underlying Memory-card
         * records, artwork, rarity, Stellactrum, position,
         * dates when available, and a completeness check.
         */
        const memoryResult =
          await syncWikiMemories(
            character,
            (progress) => {

              const currentJob =
                wikiSyncJobs.get(
                  jobId
                )


              if (
                !currentJob
              ) {

                return

              }


              currentJob.progress = {
                ...progress,

                /*
                 * The backup/enrichment pass occupies
                 * the first 40% of the complete sync.
                 */
                percent:
                  Math.round(
                    progress.percent *
                    0.4
                  ),

                message:
                  `Memory backup: ${progress.message}`,
              }


              currentJob.updatedAt =
                new Date()
                  .toISOString()

            }
          )


        const currentAfterMemories =
          wikiSyncJobs.get(
            jobId
          )


        if (
          currentAfterMemories
        ) {

          currentAfterMemories.result =
            memoryResult

          currentAfterMemories.updatedAt =
            new Date()
              .toISOString()

        }


        /*
         * ========================================
         * STEP 2 — ARCHIVE STRUCTURE
         * ========================================
         *
         * Falling for You:
         *   Bond / Memoria / Myths
         *
         * By Your Side:
         *   Tender Moments / Secret Times
         *
         * These sources are now authoritative for the
         * archive-facing catalog records and create the
         * relationships to their underlying Memories.
         */
        const supplementalResult =
          await syncSupplementalCatalog(
            character,
            (progress) => {

              const currentJob =
                wikiSyncJobs.get(
                  jobId
                )


              if (
                !currentJob
              ) {

                return

              }


              currentJob.progress = {
                /*
                 * Keep the existing frontend-compatible
                 * WikiSyncProgress shape.
                 */
                phase:
                  'importing',

                current:
                  progress.current,

                total:
                  progress.total,

                /*
                 * Archive-structure work occupies 40–100%.
                 */
                percent:
                  40 +
                  Math.round(
                    progress.percent *
                    0.6
                  ),

                message:
                  `Archive structure: ${progress.message}`,
              }


              currentJob.updatedAt =
                new Date()
                  .toISOString()

            }
          )


        const currentJob =
          wikiSyncJobs.get(
            jobId
          )


        if (
          !currentJob
        ) {

          return

        }


        currentJob.supplementalResult =
          supplementalResult


        /*
         * Phone metadata is intentionally NOT part of
         * the main wiki pipeline right now. The existing
         * diagnostic phone endpoints remain available
         * separately while that source is rebuilt.
         */
        currentJob.phoneResult =
          null


        currentJob.status =
          'complete'


        currentJob.progress = {
          phase:
            'complete',

          current:
            1,

          total:
            1,

          percent:
            100,

          message:
            `Complete: Memory backup plus Falling for You and By Your Side archive structure synced for ${character}.`,
        }


        currentJob.updatedAt =
          new Date()
            .toISOString()

      }
    )()
      .catch(
        (error) => {

          console.error(
            'Unable to run complete wiki metadata sync:',
            error
          )


          const currentJob =
            wikiSyncJobs.get(
              jobId
            )


          if (
            !currentJob
          ) {

            return

          }


          currentJob.status =
            'error'


          currentJob.error =
            error instanceof
              Error
              ? error.message
              : 'Unable to complete metadata sync from wiki.gg'


          currentJob.updatedAt =
            new Date()
              .toISOString()

        }
      )


    response.status(202).json({
      jobId,

      progress:
        job.progress,
    })

  }
)


router.get(
  '/wiki/memories/sync/:jobId',
  (
    request,
    response
  ) => {

    const job =
      wikiSyncJobs.get(
        request.params.jobId
      )


    if (
      !job
    ) {

      response.status(404).json({
        error:
          'Wiki sync job not found',
      })

      return

    }


    response.json(
      job
    )

  }
)


router.post(
  '/wiki/memories/sync',
  async (
    request,
    response
  ) => {

    const character =
      typeof request.body.character ===
        'string'
        ? request.body.character.trim()
        : ''


    if (
      !character
    ) {

      response.status(400).json({
        error:
          'character is required',
      })

      return

    }


    try {

      const result =
        await syncWikiMemories(
          character
        )


      response.json(
        result
      )

    } catch (error) {

      console.error(
        'Unable to sync wiki memories:',
        error
      )


      response.status(502).json({
        error:
          'Unable to sync memories from wiki.gg',
      })

    }

  }
)


router.get(
  '/wiki/phone/preview',
  async (
    request,
    response
  ) => {

    const character =
      typeof request.query.character ===
        'string'
        ? request.query.character.trim()
        : ''


    if (
      !character
    ) {

      response.status(400).json({
        error:
          'character is required',
      })

      return

    }


    try {

      const result =
        await fetchWikiPhoneCalls(
          character
        )


      response.json(
        result
      )

    } catch (error) {

      console.error(
        'Unable to preview wiki phone calls:',
        error
      )


      response.status(502).json({
        error:
          error instanceof
            Error
            ? error.message
            : 'Unable to read phone interactions from wiki.gg Phone / All',
      })

    }

  }
)


router.post(
  '/wiki/phone/sync',
  async (
    request,
    response
  ) => {

    const character =
      typeof request.body.character ===
        'string'
        ? request.body.character.trim()
        : ''


    if (
      !character
    ) {

      response.status(400).json({
        error:
          'character is required',
      })

      return

    }


    try {

      const result =
        await syncWikiPhoneCalls(
          character
        )


      response.json(
        result
      )

    } catch (error) {

      console.error(
        'Unable to sync wiki phone calls:',
        error
      )


      response.status(502).json({
        error:
          error instanceof
            Error
            ? error.message
            : 'Unable to sync phone interactions from wiki.gg Phone / All',
      })

    }

  }
)


router.post(
  '/auto-match',
  async (
    request,
    response
  ) => {

    const libraryPath =
      process.env.MEDIA_LIBRARY_PATH


    if (
      !libraryPath
    ) {

      response
        .status(500)
        .json({
          error:
            'MEDIA_LIBRARY_PATH is not configured',
        })

      return

    }


    try {

      const includedCategories =
        Array.isArray(
          request.body
            ?.includedCategories
        )
          ? request.body
              .includedCategories
              .filter(
                (
                  value:
                    unknown
                ): value is string =>
                  typeof value ===
                    'string' &&
                  Boolean(
                    value.trim()
                  )
              )
              .map(
                (
                  value:
                    string
                ) =>
                  value.trim()
              )
          : undefined


      const result =
        await autoMatchCatalog(
          libraryPath,
          includedCategories
        )


      response.json(
        result
      )

    } catch (error) {

      console.error(
        'Unable to auto-match metadata catalog:',
        error
      )


      response
        .status(500)
        .json({
          error:
            'Unable to auto-match metadata catalog',
        })

    }

  }
)




router.post(
  '/bulk-override-preview',
  (
    request,
    response
  ) => {

    const catalogItemIds:
      number[] =
      Array.isArray(
        request.body
          ?.catalogItemIds
      )
        ? request.body
            .catalogItemIds
            .map(
              (
                value:
                  unknown
              ) =>
                Number(
                  value
                )
            )
            .filter(
              (
                value:
                  number
              ) =>
                Number.isInteger(
                  value
                )
            )
        : []


    if (
      catalogItemIds.length ===
      0
    ) {

      response.json({
        count:
          0,

        eligible:
          0,

        alreadyNamed:
          0,

        rows:
          [],
      })


      return

    }


    if (
      catalogItemIds.length >
      500
    ) {

      response.status(400).json({
        error:
          'Bulk Override is limited to 500 filtered catalog items at a time.',
      })


      return

    }


    try {

      /*
       * The frontend sends only the catalog rows that
       * survive its CURRENT filters. This makes Bulk
       * Override follow Character, Category, Rarity,
       * File Status, search text, and category-checkbox
       * filtering instead of scanning the whole catalog.
       */
      const rows =
        [
          ...new Set(
            catalogItemIds
          ),
        ]
          .map(
            (catalogItemId) => {

              const item =
                getCatalogItem(
                  catalogItemId
                )


              if (
                !item ||
                item.files.length ===
                  0
              ) {

                /*
                 * Bulk Override is specifically for
                 * matched files. Missing-file rows in
                 * the current filter are intentionally
                 * omitted from this rename review.
                 */
                return null

              }


              const eligible =
                item.files.length ===
                1


              const file =
                item.files[0]


              if (
                !file
              ) {

                return null

              }


              const currentFileName =
                path.basename(
                  normalizePortablePath(
                    file.relativePath
                  )
                )


              const extension =
                path.extname(
                  currentFileName
                )


              const targetFileName =
                `${catalogFileBaseName(
                  item.canonicalName,
                  item.character
                )}${extension}`


              return {
                catalogItemId:
                  item.id,

                itemName:
                  item.canonicalName,

                displayName:
                  catalogFileBaseName(
                    item.canonicalName,
                    item.character
                  ),

                character:
                  item.character,

                category:
                  item.category,

                fileMatchId:
                  file.id,

                currentFileName,

                relativePath:
                  normalizePortablePath(
                    file.relativePath
                  ),

                targetFileName,

                alreadyNamed:
                  currentFileName ===
                  targetFileName,

                eligible,

                reason:
                  eligible
                    ? null
                    : `${item.files.length} files are matched to this catalog item; use the individual Override action.`,
              }

            }
          )
          .filter(
            (
              row
            ): row is NonNullable<
              typeof row
            > =>
              Boolean(
                row
              )
          )


      response.json({
        count:
          rows.length,

        eligible:
          rows.filter(
            (row) =>
              row.eligible
          )
            .length,

        alreadyNamed:
          rows.filter(
            (row) =>
              row.alreadyNamed
          )
            .length,

        rows,
      })

    } catch (error) {

      console.error(
        'Unable to load filtered Bulk Override preview:',
        error
      )


      response.status(500).json({
        error:
          error instanceof
            Error
            ? error.message
            : 'Unable to load filtered matched files for Bulk Override.',
      })

    }

  }
)


router.post(
  '/bulk-match-options',
  async (
    request,
    response
  ) => {

    const catalogItemIds =
      Array.isArray(
        request.body
          ?.catalogItemIds
      )
        ? request.body
            .catalogItemIds
            .map(
              (
                value:
                  unknown
              ) =>
                Number(
                  value
                )
            )
            .filter(
              (
                value:
                  number
              ) =>
                Number.isInteger(
                  value
                )
            )
        : []


    if (
      catalogItemIds.length ===
      0
    ) {

      response.status(400).json({
        error:
          'At least one filtered catalog item is required.',
      })


      return

    }


    if (
      catalogItemIds.length >
      500
    ) {

      response.status(400).json({
        error:
          'Bulk matching is limited to 500 filtered catalog items at a time.',
      })


      return

    }


    const libraryPath =
      process.env.MEDIA_LIBRARY_PATH


    if (
      !libraryPath
    ) {

      response.status(500).json({
        error:
          'MEDIA_LIBRARY_PATH is not configured',
      })


      return

    }


    try {

      const rows =
        await getBulkCatalogMatchOptions(
          catalogItemIds,
          libraryPath
        )


      response.json({
        count:
          rows.length,

        rows,
      })

    } catch (error) {

      console.error(
        'Unable to load bulk catalog match options:',
        error
      )


      response.status(500).json({
        error:
          error instanceof
            Error
            ? error.message
            : 'Unable to load filtered matching options.',
      })

    }

  }
)


router.get(
  '/:catalogItemId/candidates',
  async (
    request,
    response
  ) => {

    const catalogItemId =
      Number(
        request.params.catalogItemId
      )


    if (
      !Number.isInteger(
        catalogItemId
      )
    ) {

      response.status(400).json({
        error:
          'Invalid catalog item ID',
      })

      return

    }


    const item =
      getCatalogItem(
        catalogItemId
      )


    if (
      !item
    ) {

      response.status(404).json({
        error:
          'Catalog item not found',
      })

      return

    }


    const libraryPath =
      process.env.MEDIA_LIBRARY_PATH


    if (
      !libraryPath
    ) {

      response.status(500).json({
        error:
          'MEDIA_LIBRARY_PATH is not configured',
      })

      return

    }


    try {

      const candidates =
        await getCatalogMatchCandidates(
          catalogItemId,
          libraryPath
        )


      response.json({
        catalogItem:
          item,

        count:
          candidates.length,

        candidates,
      })

    } catch (error) {

      console.error(
        'Unable to load catalog match candidates:',
        error
      )


      response.status(500).json({
        error:
          'Unable to load catalog match candidates',
      })

    }

  }
)



router.get(
  '/:catalogItemId/memories',
  (
    request,
    response
  ) => {

    const catalogItemId =
      Number(
        request.params.catalogItemId
      )


    if (
      !Number.isInteger(
        catalogItemId
      )
    ) {

      response.status(400).json({
        error:
          'Invalid catalog item ID',
      })

      return

    }


    const item =
      getCatalogItem(
        catalogItemId
      )


    if (
      !item
    ) {

      response.status(404).json({
        error:
          'Catalog item not found',
      })

      return

    }


    const links =
      listCatalogMemoryLinks(
        catalogItemId
      )


    response.json({
      catalogItem:
        item,

      count:
        links.length,

      items:
        links,
    })

  }
)


router.get(
  '/:catalogItemId/archive-links',
  (
    request,
    response
  ) => {

    const catalogItemId =
      Number(
        request.params.catalogItemId
      )


    if (
      !Number.isInteger(
        catalogItemId
      )
    ) {

      response.status(400).json({
        error:
          'Invalid catalog item ID',
      })

      return

    }


    const item =
      getCatalogItem(
        catalogItemId
      )


    if (
      !item
    ) {

      response.status(404).json({
        error:
          'Catalog item not found',
      })

      return

    }


    const links =
      listCatalogArchiveLinks(
        catalogItemId
      )


    response.json({
      catalogItem:
        item,

      count:
        links.length,

      items:
        links,
    })

  }
)


router.post(
  '/:catalogItemId/memories',
  (
    request,
    response
  ) => {

    const catalogItemId =
      Number(
        request.params.catalogItemId
      )


    const memoryCatalogItemId =
      Number(
        request.body
          .memoryCatalogItemId
      )


    if (
      !Number.isInteger(
        catalogItemId
      ) ||
      !Number.isInteger(
        memoryCatalogItemId
      )
    ) {

      response.status(400).json({
        error:
          'Valid archive and Memory catalog item IDs are required',
      })

      return

    }


    try {

      const link =
        linkCatalogMemory(
          catalogItemId,
          memoryCatalogItemId,
          typeof request.body
            .relationType ===
            'string'
            ? request.body
                .relationType
            : 'manual'
        )


      if (
        !link
      ) {

        response.status(404).json({
          error:
            'Archive or Memory catalog item not found',
        })

        return

      }


      response.status(201).json(
        link
      )

    } catch (error) {

      response.status(400).json({
        error:
          error instanceof
            Error
            ? error.message
            : 'Unable to link Memory record',
      })

    }

  }
)


router.delete(
  '/:catalogItemId/memories/:memoryCatalogItemId',
  (
    request,
    response
  ) => {

    const catalogItemId =
      Number(
        request.params.catalogItemId
      )


    const memoryCatalogItemId =
      Number(
        request.params
          .memoryCatalogItemId
      )


    if (
      !Number.isInteger(
        catalogItemId
      ) ||
      !Number.isInteger(
        memoryCatalogItemId
      )
    ) {

      response.status(400).json({
        error:
          'Invalid archive or Memory catalog item ID',
      })

      return

    }


    const deleted =
      unlinkCatalogMemory(
        catalogItemId,
        memoryCatalogItemId
      )


    if (
      !deleted
    ) {

      response.status(404).json({
        error:
          'Catalog Memory relationship not found',
      })

      return

    }


    response.json({
      success:
        true,
    })

  }
)


router.get(
  '/:catalogItemId',
  (request, response) => {

    const catalogItemId =
      Number(
        request.params.catalogItemId
      )


    if (
      !Number.isInteger(
        catalogItemId
      )
    ) {

      response.status(400).json({
        error:
          'Invalid catalog item ID',
      })

      return

    }


    const item =
      getCatalogItem(
        catalogItemId
      )


    if (!item) {

      response.status(404).json({
        error:
          'Catalog item not found',
      })

      return

    }


    response.json({
      ...item,

      linkedMemories:
        listCatalogMemoryLinks(
          catalogItemId
        ),

      linkedArchiveItems:
        listCatalogArchiveLinks(
          catalogItemId
        ),
    })

  }
)


router.post(
  '/',
  (request, response) => {

    const input =
      readCatalogInput(
        request.body as
          Record<
            string,
            unknown
          >
      )


    if (!input) {

      response.status(400).json({
        error:
          'canonicalName and category are required, and all supplied fields must have valid types',
      })

      return

    }


    try {

      const item =
        createCatalogItem(
          input
        )


      response.status(201).json(
        item
      )

    } catch (error) {

      console.error(
        'Unable to create catalog item:',
        error
      )


      response.status(500).json({
        error:
          'Unable to create catalog item',
      })

    }

  }
)


router.put(
  '/:catalogItemId',
  (request, response) => {

    const catalogItemId =
      Number(
        request.params.catalogItemId
      )


    if (
      !Number.isInteger(
        catalogItemId
      )
    ) {

      response.status(400).json({
        error:
          'Invalid catalog item ID',
      })

      return

    }


    const input =
      readCatalogInput(
        request.body as
          Record<
            string,
            unknown
          >
      )


    if (!input) {

      response.status(400).json({
        error:
          'canonicalName and category are required, and all supplied fields must have valid types',
      })

      return

    }


    const item =
      updateCatalogItem(
        catalogItemId,
        input
      )


    if (!item) {

      response.status(404).json({
        error:
          'Catalog item not found',
      })

      return

    }


    response.json(
      item
    )

  }
)


router.delete(
  '/:catalogItemId',
  (request, response) => {

    const catalogItemId =
      Number(
        request.params.catalogItemId
      )


    if (
      !Number.isInteger(
        catalogItemId
      )
    ) {

      response.status(400).json({
        error:
          'Invalid catalog item ID',
      })

      return

    }


    const deleted =
      deleteCatalogItem(
        catalogItemId
      )


    if (!deleted) {

      response.status(404).json({
        error:
          'Catalog item not found',
      })

      return

    }


    response.json({
      success:
        true,
    })

  }
)



router.post(
  '/:catalogItemId/files/override-name',
  async (
    request,
    response
  ) => {

    const catalogItemId =
      Number(
        request.params.catalogItemId
      )


    if (
      !Number.isInteger(
        catalogItemId
      )
    ) {

      response.status(400).json({
        error:
          'Invalid catalog item ID',
      })


      return

    }


    const item =
      getCatalogItem(
        catalogItemId
      )


    if (
      !item
    ) {

      response.status(404).json({
        error:
          'Catalog item not found',
      })


      return

    }


    if (
      item.category ===
      'Memory'
    ) {

      response.status(400).json({
        error:
          'Memory reference records do not own archive files.',
      })


      return

    }


    if (
      item.files.length ===
      0
    ) {

      response.status(400).json({
        error:
          'Match a file to this catalog item before using Override.',
      })


      return

    }


    if (
      item.files.length >
      1
    ) {

      response.status(409).json({
        error:
          'This catalog item has more than one matched file. Reduce it to one file before using Override.',
      })


      return

    }


    const libraryPath =
      process.env.MEDIA_LIBRARY_PATH


    if (
      !libraryPath
    ) {

      response.status(500).json({
        error:
          'MEDIA_LIBRARY_PATH is not configured',
      })


      return

    }


    const fileMatch =
      item.files[0]


    try {

      const {
        root,
        candidate:
          sourcePath,
      } =
        resolvedLibraryFilePath(
          libraryPath,
          fileMatch.relativePath
        )


      const sourceStats =
        await fs.stat(
          sourcePath
        )


      if (
        !sourceStats.isFile()
      ) {

        response.status(400).json({
          error:
            'The matched path is not a file.',
        })


        return

      }


      const parsed =
        path.parse(
          sourcePath
        )


      const targetBaseName =
        catalogFileBaseName(
          item.canonicalName,
          item.character
        )


      const targetFileName =
        `${targetBaseName}${parsed.ext}`


      const targetPath =
        path.join(
          parsed.dir,
          targetFileName
        )


      const newRelativePath =
        normalizePortablePath(
          path.relative(
            root,
            targetPath
          )
        )


      const oldRelativePath =
        normalizePortablePath(
          fileMatch.relativePath
        )


      if (
        path.resolve(
          sourcePath
        ) ===
        path.resolve(
          targetPath
        )
      ) {

        response.json({
          success:
            true,

          changed:
            false,

          catalogItemId:
            item.id,

          oldRelativePath,

          newRelativePath,

          fileName:
            targetFileName,

          message:
            'The file already matches the catalog title.',
        })


        return

      }


      if (
        await pathExists(
          targetPath
        )
      ) {

        response.status(409).json({
          error:
            `A file named "${targetFileName}" already exists in this folder.`,
        })


        return

      }


      const oldSidecarPath =
        path.join(
          parsed.dir,
          `${parsed.name}.json`
        )


      const newSidecarPath =
        path.join(
          parsed.dir,
          `${targetBaseName}.json`
        )


      const hasSidecar =
        await pathExists(
          oldSidecarPath
        )


      if (
        hasSidecar &&
        await pathExists(
          newSidecarPath
        )
      ) {

        response.status(409).json({
          error:
            `A metadata sidecar named "${targetBaseName}.json" already exists in this folder.`,
        })


        return

      }


      let mediaRenamed =
        false


      let sidecarRenamed =
        false


      try {

        await fs.rename(
          sourcePath,
          targetPath
        )


        mediaRenamed =
          true


        if (
          hasSidecar
        ) {

          await fs.rename(
            oldSidecarPath,
            newSidecarPath
          )


          sidecarRenamed =
            true

        }


        /*
         * This is the core database update. If it
         * fails, put the physical files back so the
         * existing catalog match remains valid.
         */
        const catalogLinksUpdated =
          renameCatalogFilePath(
            fileMatch.category,
            oldRelativePath,
            newRelativePath
          )


        let archiveStateUpdated =
          false


        let playlistItemsUpdated =
          0


        const warnings:
          string[] =
          []


        try {

          archiveStateUpdated =
            renameArchiveStatePath(
              fileMatch.category,
              oldRelativePath,
              newRelativePath
            )

        } catch (stateError) {

          console.warn(
            'File renamed, but archive state path could not be migrated:',
            stateError
          )


          warnings.push(
            'Playback/favorite state path could not be migrated automatically.'
          )

        }


        try {

          playlistItemsUpdated =
            renamePlaylistItemPath(
              fileMatch.category,
              oldRelativePath,
              newRelativePath
            )

        } catch (playlistError) {

          console.warn(
            'File renamed, but playlist paths could not be migrated:',
            playlistError
          )


          warnings.push(
            'Playlist references could not be migrated automatically.'
          )

        }


        response.json({
          success:
            true,

          changed:
            true,

          catalogItemId:
            item.id,

          oldRelativePath,

          newRelativePath,

          fileName:
            targetFileName,

          catalogLinksUpdated,

          archiveStateUpdated,

          playlistItemsUpdated,

          warnings,
        })


        return

      } catch (renameError) {

        /*
         * Best-effort rollback if the core catalog path
         * update failed after the physical rename.
         */
        try {

          if (
            sidecarRenamed &&
            await pathExists(
              newSidecarPath
            ) &&
            !await pathExists(
              oldSidecarPath
            )
          ) {

            await fs.rename(
              newSidecarPath,
              oldSidecarPath
            )

          }


          if (
            mediaRenamed &&
            await pathExists(
              targetPath
            ) &&
            !await pathExists(
              sourcePath
            )
          ) {

            await fs.rename(
              targetPath,
              sourcePath
            )

          }

        } catch (rollbackError) {

          console.error(
            'Unable to fully roll back Override rename:',
            rollbackError
          )

        }


        throw renameError

      }

    } catch (error) {

      console.error(
        `Unable to override file name for catalog item ${catalogItemId}:`,
        error
      )


      response.status(500).json({
        error:
          error instanceof
            Error
            ? error.message
            : 'Unable to rename the matched archive file.',
      })

    }

  }
)


router.post(
  '/:catalogItemId/files',
  (request, response) => {

    const catalogItemId =
      Number(
        request.params.catalogItemId
      )


    const category =
      request.body.category


    const relativePath =
      request.body.relativePath


    if (
      !Number.isInteger(
        catalogItemId
      ) ||
      typeof category !==
        'string' ||
      !category.trim() ||
      typeof relativePath !==
        'string' ||
      !relativePath.trim()
    ) {

      response.status(400).json({
        error:
          'Valid catalogItemId, category, and relativePath are required',
      })

      return

    }


    const confidence =
      request.body.confidence


    if (
      confidence !==
        undefined &&
      confidence !==
        null &&
      typeof confidence !==
        'number'
    ) {

      response.status(400).json({
        error:
          'confidence must be a number or null',
      })

      return

    }


    const item =
      linkCatalogFile(
        catalogItemId,
        category,
        relativePath,
        {
          matchMethod:
            typeof request.body.matchMethod ===
              'string'
              ? request.body.matchMethod
              : 'manual',

          confidence:
            confidence ===
              undefined
              ? null
              : confidence,

          manuallyConfirmed:
            request.body.manuallyConfirmed ===
              true,
        }
      )


    if (!item) {

      response.status(404).json({
        error:
          'Catalog item not found',
      })

      return

    }


    response.json(
      item
    )

  }
)


router.delete(
  '/:catalogItemId/files/:matchId',
  (request, response) => {

    const catalogItemId =
      Number(
        request.params.catalogItemId
      )


    const matchId =
      Number(
        request.params.matchId
      )


    if (
      !Number.isInteger(
        catalogItemId
      ) ||
      !Number.isInteger(
        matchId
      )
    ) {

      response.status(400).json({
        error:
          'Invalid catalog item or match ID',
      })

      return

    }


    const deleted =
      unlinkCatalogFile(
        catalogItemId,
        matchId
      )


    if (!deleted) {

      response.status(404).json({
        error:
          'Catalog file match not found',
      })

      return

    }


    response.json({
      success:
        true,
    })

  }
)


export default router