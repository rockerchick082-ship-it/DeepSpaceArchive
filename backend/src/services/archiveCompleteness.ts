import path from 'node:path'

import {
  scanCategory,
} from '../scanner/libraryScanner'

import type {
  LibraryItem,
} from '../scanner/libraryScanner'

import {
  listCatalogFileMatches,
  listCatalogItems,
} from '../state/metadataCatalog'

import type {
  CatalogItem,
} from '../state/metadataCatalog'

import {
  discoverArchiveCharacters,
} from './characterRegistry'


type CompletenessCategoryDefinition = {
  key: string
  label: string
  catalogCategories: string[]
  libraryCategories: string[]
}


const categoryDefinitions:
  CompletenessCategoryDefinition[] = [
    {
      key: 'memoria',
      label: 'Memoria',
      catalogCategories: ['Memoria'],
      libraryCategories: ['Memoria'],
    },
    {
      key: 'secret-times',
      label: 'Secret Times',
      catalogCategories: ['Secret Times'],
      libraryCategories: ['Secret Times'],
    },
    {
      key: 'tender-moments',
      label: 'Tender Moments',
      catalogCategories: ['Tender Moments'],
      libraryCategories: ['Tender Moments'],
    },
    {
      key: 'myths',
      label: 'Myths',
      catalogCategories: ['Myths'],
      libraryCategories: ['Myths'],
    },
    {
      key: 'bond',
      label: 'Bond',
      catalogCategories: ['Bond'],
      libraryCategories: ['Bond'],
    },
    {
      key: 'phone-call',
      label: 'Phone Calls',
      catalogCategories: ['Phone Call'],
      libraryCategories: ['Phone Call'],
    },
    {
      key: 'phone-video',
      label: 'Phone Videos',
      catalogCategories: ['Phone Video'],
      libraryCategories: ['Phone Video'],
    },
    {
      key: 'illusio',
      label: 'Illusio',
      catalogCategories: [
        'Illusio',
        'Illusio Kindle',
      ],
      libraryCategories: [
        'Illusio Kindle',
      ],
    },
  ]


type CoverageAccumulator = {
  expected: number
  present: number
  missing: number
  stale: number
  localFiles: number
  unmatchedLocal: number
}


type CompletenessMissingItem = {
  id: number
  title: string
  canonicalName: string
  character: string | null
  categoryKey: string
  category: string
  releaseDate: string | null
  sourceUrl: string | null
  status: 'missing' | 'stale'
  stalePaths: string[]
}


type CompletenessUnmatchedLocalItem = {
  title: string
  character: string
  categoryKey: string
  category: string
  relativePath: string
  mediaType: LibraryItem['mediaType']
}


function normalizeText(
  value: string
) {
  return value
    .trim()
    .toLocaleLowerCase()
}


const catalogCategoryLookup =
  new Map<string, CompletenessCategoryDefinition>()

const libraryCategoryLookup =
  new Map<string, CompletenessCategoryDefinition>()


for (
  const definition
  of categoryDefinitions
) {
  for (
    const category
    of definition.catalogCategories
  ) {
    catalogCategoryLookup.set(
      normalizeText(category),
      definition
    )
  }

  for (
    const category
    of definition.libraryCategories
  ) {
    libraryCategoryLookup.set(
      normalizeText(category),
      definition
    )
  }
}


function emptyCoverage(): CoverageAccumulator {
  return {
    expected: 0,
    present: 0,
    missing: 0,
    stale: 0,
    localFiles: 0,
    unmatchedLocal: 0,
  }
}


function percentage(
  present: number,
  expected: number
) {
  if (
    expected <= 0
  ) {
    return null
  }

  return Math.round(
    (
      present /
      expected
    ) *
    1000
  ) / 10
}


function finalizeCoverage(
  accumulator: CoverageAccumulator
) {
  return {
    ...accumulator,
    percent:
      percentage(
        accumulator.present,
        accumulator.expected
      ),
  }
}


function fileMatchKey(
  category: string,
  relativePath: string
) {
  return `${normalizeText(category)}\u0000${relativePath
    .replace(/\\/g, '/')
    .replace(/^\.\/+/, '')
    .toLocaleLowerCase()}`
}


function displayCatalogTitle(
  item: CatalogItem
) {
  if (
    !item.character
  ) {
    return item.canonicalName
  }

  const prefix =
    `${item.character}:`

  if (
    item.canonicalName
      .toLocaleLowerCase()
      .startsWith(
        prefix.toLocaleLowerCase()
      )
  ) {
    return item.canonicalName
      .slice(prefix.length)
      .trim()
  }

  return item.canonicalName
}


function getCatalogDefinition(
  category: string
) {
  return catalogCategoryLookup.get(
    normalizeText(category)
  ) ?? null
}


function getLibraryDefinition(
  category: string
) {
  return libraryCategoryLookup.get(
    normalizeText(category)
  ) ?? null
}


function incrementCoverage(
  map: Map<string, CoverageAccumulator>,
  key: string,
  field: keyof CoverageAccumulator
) {
  const current =
    map.get(key) ??
    emptyCoverage()

  current[field] += 1
  map.set(key, current)
}


function addExpectedCoverage(
  map: Map<string, CoverageAccumulator>,
  key: string,
  present: boolean,
  stale: boolean
) {
  incrementCoverage(
    map,
    key,
    'expected'
  )

  incrementCoverage(
    map,
    key,
    present
      ? 'present'
      : 'missing'
  )

  if (
    stale
  ) {
    incrementCoverage(
      map,
      key,
      'stale'
    )
  }
}


function loadCatalogItems() {
  const items:
    CatalogItem[] = []

  let offset = 0

  while (
    true
  ) {
    const page =
      listCatalogItems({
        excludeRarity: 3,
        limit: 500,
        offset,
      })

    for (
      const item
      of page.items
    ) {
      if (
        normalizeText(item.category) ===
        'memory'
      ) {
        continue
      }

      if (
        getCatalogDefinition(
          item.category
        )
      ) {
        items.push(item)
      }
    }

    offset +=
      page.items.length

    if (
      page.items.length === 0 ||
      offset >= page.count
    ) {
      break
    }
  }

  return items
}


async function scanLocalItems(
  libraryPath: string
) {
  const items:
    LibraryItem[] = []

  const warnings:
    string[] = []

  const scanned =
    new Set<string>()

  for (
    const definition
    of categoryDefinitions
  ) {
    for (
      const category
      of definition.libraryCategories
    ) {
      const normalized =
        normalizeText(category)

      if (
        scanned.has(normalized)
      ) {
        continue
      }

      scanned.add(normalized)

      try {
        items.push(
          ...await scanCategory(
            libraryPath,
            category
          )
        )
      } catch (
        error
      ) {
        const code =
          (
            error as
              NodeJS.ErrnoException
          ).code

        if (
          code === 'ENOENT'
        ) {
          continue
        }

        warnings.push(
          `Unable to scan ${category}: ${
            error instanceof Error
              ? error.message
              : String(error)
          }`
        )
      }
    }
  }

  return {
    items,
    warnings,
  }
}


export async function buildArchiveCompleteness(
  libraryPath: string
) {
  const resolvedLibraryPath =
    path.resolve(libraryPath)

  const [
    catalogItems,
    localScan,
    discoveredCharacters,
  ] =
    await Promise.all([
      Promise.resolve(
        loadCatalogItems()
      ),
      scanLocalItems(
        resolvedLibraryPath
      ),
      discoverArchiveCharacters(
        resolvedLibraryPath
      ),
    ])

  const actualFileKeys =
    new Set(
      localScan.items.map(
        (item) =>
          fileMatchKey(
            item.category,
            item.relativePath
          )
      )
    )

  const categoryCoverage =
    new Map<string, CoverageAccumulator>()

  const characterCoverage =
    new Map<string, CoverageAccumulator>()

  const missingItems:
    CompletenessMissingItem[] = []

  const overall =
    emptyCoverage()


  for (
    const item
    of catalogItems
  ) {
    const definition =
      getCatalogDefinition(
        item.category
      )

    if (
      !definition
    ) {
      continue
    }

    const matches =
      listCatalogFileMatches(
        item.id
      )

    const existingMatches =
      matches.filter(
        (match) =>
          actualFileKeys.has(
            fileMatchKey(
              match.category,
              match.relativePath
            )
          )
      )

    const present =
      existingMatches.length > 0

    const stale =
      !present &&
      matches.length > 0

    overall.expected += 1

    if (
      present
    ) {
      overall.present += 1
    } else {
      overall.missing += 1
    }

    if (
      stale
    ) {
      overall.stale += 1
    }

    addExpectedCoverage(
      categoryCoverage,
      definition.key,
      present,
      stale
    )

    if (
      item.character
    ) {
      addExpectedCoverage(
        characterCoverage,
        item.character,
        present,
        stale
      )
    }

    if (
      !present
    ) {
      missingItems.push({
        id: item.id,
        title:
          displayCatalogTitle(item),
        canonicalName:
          item.canonicalName,
        character:
          item.character,
        categoryKey:
          definition.key,
        category:
          definition.label,
        releaseDate:
          item.releaseDate,
        sourceUrl:
          item.sourceUrl,
        status:
          stale
            ? 'stale'
            : 'missing',
        stalePaths:
          stale
            ? matches.map(
                (match) =>
                  match.relativePath
              )
            : [],
      })
    }
  }


  const unmatchedLocalItems:
    CompletenessUnmatchedLocalItem[] = []


  for (
    const item
    of localScan.items
  ) {
    const definition =
      getLibraryDefinition(
        item.category
      )

    if (
      !definition
    ) {
      continue
    }

    overall.localFiles += 1

    incrementCoverage(
      categoryCoverage,
      definition.key,
      'localFiles'
    )

    incrementCoverage(
      characterCoverage,
      item.character,
      'localFiles'
    )

    if (
      item.catalogMatched
    ) {
      continue
    }

    overall.unmatchedLocal += 1

    incrementCoverage(
      categoryCoverage,
      definition.key,
      'unmatchedLocal'
    )

    incrementCoverage(
      characterCoverage,
      item.character,
      'unmatchedLocal'
    )

    unmatchedLocalItems.push({
      title:
        item.title,
      character:
        item.character,
      categoryKey:
        definition.key,
      category:
        definition.label,
      relativePath:
        item.relativePath,
      mediaType:
        item.mediaType,
    })
  }


  const characterOrder =
    new Map(
      discoveredCharacters.map(
        (
          entry,
          index
        ) => [
          entry.name,
          index,
        ]
      )
    )

  const characterNames =
    new Set<string>([
      ...characterCoverage.keys(),
      ...catalogItems
        .map(
          (item) =>
            item.character
        )
        .filter(
          (
            character
          ): character is string =>
            Boolean(character)
        ),
      ...localScan.items.map(
        (item) =>
          item.character
      ),
    ])

  const characters =
    [...characterNames]
      .sort(
        (
          left,
          right
        ) => {
          const leftOrder =
            characterOrder.get(left) ??
            Number.MAX_SAFE_INTEGER

          const rightOrder =
            characterOrder.get(right) ??
            Number.MAX_SAFE_INTEGER

          return (
            leftOrder -
              rightOrder ||
            left.localeCompare(right)
          )
        }
      )
      .map(
        (character) => ({
          character,
          ...finalizeCoverage(
            characterCoverage.get(
              character
            ) ??
            emptyCoverage()
          ),
        })
      )


  const categories =
    categoryDefinitions.map(
      (definition) => ({
        key:
          definition.key,
        label:
          definition.label,
        ...finalizeCoverage(
          categoryCoverage.get(
            definition.key
          ) ??
          emptyCoverage()
        ),
      })
    )


  missingItems.sort(
    (
      left,
      right
    ) => {
      const leftCharacter =
        left.character ??
        ''

      const rightCharacter =
        right.character ??
        ''

      const characterDifference =
        (
          characterOrder.get(
            leftCharacter
          ) ??
          Number.MAX_SAFE_INTEGER
        ) -
        (
          characterOrder.get(
            rightCharacter
          ) ??
          Number.MAX_SAFE_INTEGER
        )

      if (
        characterDifference !== 0
      ) {
        return characterDifference
      }

      const categoryDifference =
        categoryDefinitions.findIndex(
          (definition) =>
            definition.key ===
            left.categoryKey
        ) -
        categoryDefinitions.findIndex(
          (definition) =>
            definition.key ===
            right.categoryKey
        )

      if (
        categoryDifference !== 0
      ) {
        return categoryDifference
      }

      return left.title.localeCompare(
        right.title,
        undefined,
        {
          numeric: true,
          sensitivity: 'base',
        }
      )
    }
  )


  unmatchedLocalItems.sort(
    (
      left,
      right
    ) =>
      left.character.localeCompare(
        right.character
      ) ||
      left.category.localeCompare(
        right.category
      ) ||
      left.title.localeCompare(
        right.title,
        undefined,
        {
          numeric: true,
          sensitivity: 'base',
        }
      )
  )


  return {
    connected: true,
    libraryRoot:
      resolvedLibraryPath,
    catalogReady:
      catalogItems.length > 0,
    overall:
      finalizeCoverage(
        overall
      ),
    categories,
    characters,
    missingItems,
    unmatchedLocalItems,
    warnings:
      localScan.warnings,
    generatedAt:
      new Date()
        .toISOString(),
  }
}
