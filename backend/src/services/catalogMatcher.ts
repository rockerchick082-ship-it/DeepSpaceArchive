import {
  scanCategory,
} from '../scanner/libraryScanner'

import type {
  LibraryItem,
} from '../scanner/libraryScanner'

import {
  getCatalogItem,
  getCatalogItemsForFile,
  linkCatalogFile,
  listCatalogArchiveLinks,
  listCatalogItems,
  listCatalogMemoryLinks,
  unlinkCatalogFile,
} from '../state/metadataCatalog'

import type {
  CatalogItem,
} from '../state/metadataCatalog'


export type MatchCandidate = {
  catalogItemId: number
  catalogName: string
  fileTitle: string
  character: string
  category: string
  relativePath: string
  confidence: number

  linkedCatalogItems:
    Array<{
      id: number
      canonicalName: string
      rarity: number | null
    }>
}


export type BulkMatchOption = {
  fileTitle: string
  character: string
  category: string
  relativePath: string
  confidence: number
}


export type BulkMatchRow = {
  catalogItemId: number
  catalogName: string
  character: string | null
  category: string
  options: BulkMatchOption[]
}


type AutoMatchResult = {
  scannedCatalogItems: number
  scannedLibraryFiles: number
  matched: number
  alreadyMatched: number
  needsReview: MatchCandidate[]
  unmatchedCatalogItems: number
}


const categoryDefinitions = [
  {
    catalogCategory:
      'Secret Times',

    libraryCategories: [
      'Secret Times',
    ],
  },
  {
    catalogCategory:
      'Tender Moments',

    libraryCategories: [
      'Tender Moments',
    ],
  },
  {
    catalogCategory:
      'Memoria',

    libraryCategories: [
      'Memoria',
    ],
  },
  {
    catalogCategory:
      'Bond',

    libraryCategories: [
      'Bond',
    ],
  },
  {
    catalogCategory:
      'Myths',

    libraryCategories: [
      'Myths',
    ],
  },
  {
    catalogCategory:
      'Phone Call',

    libraryCategories: [
      'Phone Call',
    ],
  },
  {
    catalogCategory:
      'Phone Video',

    libraryCategories: [
      'Phone Video',
    ],
  },
  {
    catalogCategory:
      'Illusio',

    libraryCategories: [
      'Illusio Kindle',
    ],
  },
  {
    catalogCategory:
      'Illusio Kindle',

    libraryCategories: [
      'Illusio Kindle',
    ],
  },
]


function memoryLibraryCategories(
  rarity:
    number | null
) {

  if (
    rarity ===
    5
  ) {

    return [
      'Memoria',
      'Bond',
      'Myths',
    ]

  }


  if (
    rarity ===
    4
  ) {

    return [
      'Memoria',
      'Secret Times',
      'Tender Moments',
    ]

  }


  return []

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


function normalizeCharacter(
  value:
    string | null
) {

  return normalizeText(
    value ??
    ''
  )

}


function stripCharacterPrefix(
  title: string,
  character:
    string | null
) {

  const normalizedTitle =
    normalizeText(
      title
    )


  const normalizedCharacter =
    normalizeCharacter(
      character
    )


  if (
    !normalizedCharacter
  ) {

    return normalizedTitle

  }


  const prefixes = [
    `${normalizedCharacter} `,
    `${normalizedCharacter}s `,
  ]


  for (
    const prefix
    of prefixes
  ) {

    if (
      normalizedTitle.startsWith(
        prefix
      )
    ) {

      return normalizedTitle
        .slice(
          prefix.length
        )
        .trim()

    }

  }


  return normalizedTitle

}


function tokenSet(
  value: string
) {

  return new Set(
    normalizeText(
      value
    )
      .split(
        ' '
      )
      .filter(
        Boolean
      )
  )

}


function tokenSimilarity(
  left: string,
  right: string
) {

  const leftTokens =
    tokenSet(
      left
    )


  const rightTokens =
    tokenSet(
      right
    )


  if (
    leftTokens.size ===
      0 ||
    rightTokens.size ===
      0
  ) {

    return 0

  }


  let intersection =
    0


  for (
    const token
    of leftTokens
  ) {

    if (
      rightTokens.has(
        token
      )
    ) {

      intersection +=
        1

    }

  }


  const union =
    new Set([
      ...leftTokens,
      ...rightTokens,
    ]).size


  return (
    intersection /
    union
  )

}


function titleConfidence(
  catalogItem:
    CatalogItem,
  libraryItem:
    LibraryItem
) {

  const catalogTitle =
    stripCharacterPrefix(
      catalogItem.canonicalName,
      catalogItem.character
    )


  const fileTitle =
    stripCharacterPrefix(
      libraryItem.title,
      libraryItem.character
    )


  if (
    !catalogTitle ||
    !fileTitle
  ) {

    return 0

  }


  if (
    catalogTitle ===
    fileTitle
  ) {

    return 1

  }


  const compactCatalog =
    catalogTitle.replace(
      /\s+/g,
      ''
    )


  const compactFile =
    fileTitle.replace(
      /\s+/g,
      ''
    )


  if (
    compactCatalog ===
    compactFile
  ) {

    return 0.99

  }


  if (
    catalogTitle.length >=
      6 &&
    fileTitle.length >=
      6 &&
    (
      catalogTitle.includes(
        fileTitle
      ) ||
      fileTitle.includes(
        catalogTitle
      )
    )
  ) {

    return 0.94

  }


  const similarity =
    tokenSimilarity(
      catalogTitle,
      fileTitle
    )


  if (
    similarity >=
    0.8
  ) {

    return 0.9

  }


  if (
    similarity >=
    0.6
  ) {

    return 0.78

  }


  return 0

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


function getLibraryCategoriesForCatalogItem(
  catalogItem:
    CatalogItem
) {

  if (
    normalizeText(
      catalogItem.category
    ) ===
    'memory'
  ) {

    /*
     * Most Memory rows remain reference-only.
     *
     * Exception: the two underlying Memory cards linked
     * to a Myth can have their own Memoria shorts in the
     * user's library even though wiki.gg only classifies
     * those cards as Memories. Allow only those Myth-linked
     * Memory rows to search the Memoria folder.
     */
    const archiveLinks =
      listCatalogArchiveLinks(
        catalogItem.id
      )


    const linkedToMyth =
      archiveLinks.some(
        (link) =>
          normalizeText(
            link.archiveItem.category
          ) ===
          'myths'
      )


    return linkedToMyth
      ? [
          'Memoria',
        ]
      : []

  }


  const normalized =
    normalizeText(
      catalogItem.category
    )


  const definition =
    categoryDefinitions.find(
      (entry) =>
        normalizeText(
          entry.catalogCategory
        ) ===
        normalized
    )


  return (
    definition?.libraryCategories ??
    []
  )

}


export async function getCatalogMatchCandidates(
  catalogItemId: number,
  libraryRoot: string
): Promise<MatchCandidate[]> {

  const catalogItem =
    getCatalogItem(
      catalogItemId
    )


  if (
    !catalogItem
  ) {

    return []

  }


  const libraryCategories =
    getLibraryCategoriesForCatalogItem(
      catalogItem
    )


  if (
    libraryCategories.length ===
    0
  ) {

    return []

  }


  const libraryItems =
    (
      await Promise.all(
        libraryCategories.map(
          (libraryCategory) =>
            scanCategory(
              libraryRoot,
              libraryCategory
            )
        )
      )
    )
      .flat()


  const catalogCharacter =
    normalizeCharacter(
      catalogItem.character
    )


  return libraryItems
    .filter(
      (libraryItem) => {

        if (
          !catalogCharacter
        ) {

          return true

        }


        return (
          normalizeCharacter(
            libraryItem.character
          ) ===
          catalogCharacter
        )

      }
    )
    .map(
      (libraryItem) => ({
        catalogItemId:
          catalogItem.id,

        catalogName:
          catalogItem.canonicalName,

        fileTitle:
          libraryItem.title,

        character:
          libraryItem.character,

        category:
          libraryItem.category,

        relativePath:
          libraryItem.relativePath,

        confidence:
          titleConfidence(
            catalogItem,
            libraryItem
          ),

        linkedCatalogItems:
          getCatalogItemsForFile(
            libraryItem.category,
            libraryItem.relativePath
          )
            .filter(
              (linkedItem) =>
                linkedItem.id !==
                catalogItem.id
            )
            .map(
              (linkedItem) => ({
                id:
                  linkedItem.id,

                canonicalName:
                  linkedItem.canonicalName,

                rarity:
                  linkedItem.rarity,
              })
            ),
      })
    )
    .sort(
      (left, right) => {

        if (
          right.confidence !==
          left.confidence
        ) {

          return (
            right.confidence -
            left.confidence
          )

        }


        return left.fileTitle
          .localeCompare(
            right.fileTitle
          )

      }
    )
    .slice(
      0,
      100
    )

}




export async function getBulkCatalogMatchOptions(
  catalogItemIds:
    number[],
  libraryRoot:
    string
): Promise<BulkMatchRow[]> {

  const uniqueIds =
    [
      ...new Set(
        catalogItemIds.filter(
          (value) =>
            Number.isInteger(
              value
            )
        )
      ),
    ]


  const catalogItems =
    uniqueIds
      .map(
        (id) =>
          getCatalogItem(
            id
          )
      )
      .filter(
        (
          item
        ): item is NonNullable<
          ReturnType<
            typeof getCatalogItem
          >
        > =>
          Boolean(
            item
          )
      )
      .filter(
        (item) =>
          item.files.length ===
          0
      )


  const libraryCache =
    new Map<
      string,
      LibraryItem[]
    >()


  const unmatchedLibraryCache =
    new Map<
      string,
      LibraryItem[]
    >()


  async function unmatchedFilesForCategory(
    category:
      string
  ) {

    const existing =
      unmatchedLibraryCache.get(
        category
      )


    if (
      existing
    ) {

      return existing

    }


    let scanned =
      libraryCache.get(
        category
      )


    if (
      !scanned
    ) {

      scanned =
        await scanCategory(
          libraryRoot,
          category
        )


      libraryCache.set(
        category,
        scanned
      )

    }


    const unmatched =
      scanned.filter(
        (libraryItem) =>
          getCatalogItemsForFile(
            libraryItem.category,
            libraryItem.relativePath
          ).length ===
          0
      )


    unmatchedLibraryCache.set(
      category,
      unmatched
    )


    return unmatched

  }


  const rows:
    BulkMatchRow[] =
    []


  for (
    const catalogItem
    of catalogItems
  ) {

    const libraryCategories =
      getLibraryCategoriesForCatalogItem(
        catalogItem
      )


    if (
      libraryCategories.length ===
      0
    ) {

      rows.push({
        catalogItemId:
          catalogItem.id,

        catalogName:
          catalogItem.canonicalName,

        character:
          catalogItem.character,

        category:
          catalogItem.category,

        options:
          [],
      })


      continue

    }


    const libraryGroups:
      LibraryItem[][] =
      []


    for (
      const libraryCategory
      of libraryCategories
    ) {

      try {

        libraryGroups.push(
          await unmatchedFilesForCategory(
            libraryCategory
          )
        )

      } catch (error) {

        console.warn(
          `Unable to scan ${libraryCategory} for bulk catalog matching:`,
          error
        )

      }

    }


    const catalogCharacter =
      normalizeCharacter(
        catalogItem.character
      )


    const options =
      libraryGroups
        .flat()
        .filter(
          (libraryItem) => {

            if (
              !catalogCharacter
            ) {

              return true

            }


            return (
              normalizeCharacter(
                libraryItem.character
              ) ===
              catalogCharacter
            )

          }
        )
        .map(
          (libraryItem) => ({
            fileTitle:
              libraryItem.title,

            character:
              libraryItem.character,

            category:
              libraryItem.category,

            relativePath:
              libraryItem.relativePath,

            confidence:
              titleConfidence(
                catalogItem,
                libraryItem
              ),
          })
        )
        .sort(
          (
            left,
            right
          ) => {

            if (
              right.confidence !==
              left.confidence
            ) {

              return (
                right.confidence -
                left.confidence
              )

            }


            return left.fileTitle
              .localeCompare(
                right.fileTitle
              )

          }
        )


    rows.push({
      catalogItemId:
        catalogItem.id,

      catalogName:
        catalogItem.canonicalName,

      character:
        catalogItem.character,

      category:
        catalogItem.category,

      options,
    })

  }


  return rows

}


function migrateLegacyMemoryFileMatches(
  archiveItem:
    CatalogItem
) {

  const allowedCategories =
    new Set(
      getLibraryCategoriesForCatalogItem(
        archiveItem
      )
        .map(
          normalizeText
        )
    )


  if (
    allowedCategories.size ===
    0
  ) {

    return 0

  }


  const linkedMemories =
    listCatalogMemoryLinks(
      archiveItem.id
    )


  let migrated =
    0


  for (
    const relationship
    of linkedMemories
  ) {

    const memory =
      getCatalogItem(
        relationship.memory.id
      )


    if (
      !memory
    ) {

      continue

    }


    for (
      const fileMatch
      of memory.files
    ) {

      if (
        !allowedCategories.has(
          normalizeText(
            fileMatch.category
          )
        )
      ) {

        continue

      }


      const linked =
        linkCatalogFile(
          archiveItem.id,
          fileMatch.category,
          fileMatch.relativePath,
          {
            matchMethod:
              fileMatch.matchMethod,

            confidence:
              fileMatch.confidence,

            manuallyConfirmed:
              fileMatch.manuallyConfirmed,
          }
        )


      if (
        !linked
      ) {

        continue

      }


      /*
       * Remove the old direct Memory match only after
       * the archive-facing record inherited it.
       */
      if (
        unlinkCatalogFile(
          memory.id,
          fileMatch.id
        )
      ) {

        migrated +=
          1

      }

    }

  }


  return migrated

}


export async function autoMatchCatalog(
  libraryRoot: string,
  includedCategories?:
    string[]
): Promise<AutoMatchResult> {

  const catalogItems =
    await loadAllCatalogItems()


  const normalizedIncludedCategories =
    includedCategories
      ? new Set(
          includedCategories
            .map(
              normalizeText
            )
            .filter(
              Boolean
            )
        )
      : null


  /*
   * Match records only when their catalog category is
   * included by the user's checkbox selection AND the
   * record has at least one valid library category.
   *
   * This keeps normal Memory references out by default,
   * while allowing Myth-linked Memory cards to participate
   * when the user explicitly checks Memory.
   */
  const matchableCatalogItems =
    catalogItems.filter(
      (item) => {

        if (
          normalizedIncludedCategories &&
          !normalizedIncludedCategories.has(
            normalizeText(
              item.category
            )
          )
        ) {

          return false

        }


        return (
          getLibraryCategoriesForCatalogItem(
            item
          ).length >
          0
        )

      }
    )


  const libraryCache =
    new Map<
      string,
      LibraryItem[]
    >()


  let scannedLibraryFiles =
    0


  let matched =
    0


  let alreadyMatched =
    0


  let unmatchedCatalogItems =
    0


  const needsReview:
    MatchCandidate[] =
    []


  for (
    const catalogItem
    of matchableCatalogItems
  ) {

    /*
     * Migrate any legacy direct Memory file links
     * to this archive record before normal matching.
     */
    migrateLegacyMemoryFileMatches(
      catalogItem
    )


    const fullItem =
      getCatalogItem(
        catalogItem.id
      )


    if (
      fullItem &&
      fullItem.files.length >
        0
    ) {

      alreadyMatched +=
        1

      continue

    }


    const libraryCategories =
      getLibraryCategoriesForCatalogItem(
        catalogItem
      )


    if (
      libraryCategories.length ===
      0
    ) {

      unmatchedCatalogItems +=
        1

      continue

    }


    const libraryGroups:
      LibraryItem[][] =
      []


    for (
      const libraryCategory
      of libraryCategories
    ) {

      let libraryItems =
        libraryCache.get(
          libraryCategory
        )


      if (
        !libraryItems
      ) {

        try {

          libraryItems =
            await scanCategory(
              libraryRoot,
              libraryCategory
            )

        } catch (error) {

          console.warn(
            `Unable to scan ${libraryCategory} during catalog auto-match:`,
            error
          )


          libraryItems =
            []

        }


        libraryCache.set(
          libraryCategory,
          libraryItems
        )


        scannedLibraryFiles +=
          libraryItems.length

      }


      libraryGroups.push(
        libraryItems
      )

    }


    const libraryItems =
      libraryGroups.flat()


    const catalogCharacter =
      normalizeCharacter(
        catalogItem.character
      )


    const candidates =
      libraryItems
        .filter(
          (libraryItem) => {

            if (
              !catalogCharacter
            ) {

              return true

            }


            return (
              normalizeCharacter(
                libraryItem.character
              ) ===
              catalogCharacter
            )

          }
        )
        .map(
          (libraryItem) => ({
            libraryItem,

            confidence:
              titleConfidence(
                catalogItem,
                libraryItem
              ),
          })
        )
        .filter(
          (candidate) =>
            candidate.confidence >
            0
        )
        .sort(
          (left, right) =>
            right.confidence -
            left.confidence
        )


    const best =
      candidates[0]


    if (
      !best
    ) {

      unmatchedCatalogItems +=
        1

      continue

    }


    const second =
      candidates[1]


    const ambiguous =
      Boolean(
        second &&
        (
          best.confidence -
          second.confidence
        ) <
        0.08
      )


    if (
      best.confidence >=
        0.9 &&
      !ambiguous
    ) {

      const updated =
        linkCatalogFile(
          catalogItem.id,
          best.libraryItem.category,
          best.libraryItem.relativePath,
          {
            matchMethod:
              'automatic',

            confidence:
              best.confidence,

            manuallyConfirmed:
              false,
          }
        )


      if (
        updated
      ) {

        matched +=
          1

      }


      continue

    }


    if (
      best.confidence >=
      0.75
    ) {

      needsReview.push({
        catalogItemId:
          catalogItem.id,

        catalogName:
          catalogItem.canonicalName,

        fileTitle:
          best.libraryItem.title,

        character:
          best.libraryItem.character,

        category:
          best.libraryItem.category,

        relativePath:
          best.libraryItem.relativePath,

        confidence:
          best.confidence,

        linkedCatalogItems:
          getCatalogItemsForFile(
            best.libraryItem.category,
            best.libraryItem.relativePath
          )
            .filter(
              (linkedItem) =>
                linkedItem.id !==
                catalogItem.id
            )
            .map(
              (linkedItem) => ({
                id:
                  linkedItem.id,

                canonicalName:
                  linkedItem.canonicalName,

                rarity:
                  linkedItem.rarity,
              })
            ),
      })


      continue

    }


    unmatchedCatalogItems +=
      1

  }

  return {
    scannedCatalogItems:
      matchableCatalogItems.length,

    scannedLibraryFiles,

    matched,

    alreadyMatched,

    needsReview,

    unmatchedCatalogItems,
  }

}