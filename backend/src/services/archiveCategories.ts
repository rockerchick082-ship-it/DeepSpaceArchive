export type ArchiveCategoryDefinition = {
  key: string
  label: string
  stateCategory: string
  scanMode: 'category' | 'main-story' | 'gallery'
  libraryCategories: string[]
  catalogCategories: string[]
  apiEndpoint: string
  playerPath: string | null
  completeness: boolean
  playable: boolean
}


export const archiveCategoryDefinitions:
  ArchiveCategoryDefinition[] = [
  {
    key: 'memoria',
    label: 'Memoria',
    stateCategory: 'Memoria',
    scanMode: 'category',
    libraryCategories: ['Memoria'],
    catalogCategories: ['Memoria'],
    apiEndpoint: '/api/library/memoria',
    playerPath: '/memoria/watch',
    completeness: true,
    playable: true,
  },
  {
    key: 'secret-times',
    label: 'Secret Times',
    stateCategory: 'Secret Times',
    scanMode: 'category',
    libraryCategories: ['Secret Times'],
    catalogCategories: ['Secret Times'],
    apiEndpoint: '/api/library/secret-times',
    playerPath: '/secret-times/watch',
    completeness: true,
    playable: true,
  },
  {
    key: 'tender-moments',
    label: 'Tender Moments',
    stateCategory: 'Tender Moments',
    scanMode: 'category',
    libraryCategories: ['Tender Moments'],
    catalogCategories: ['Tender Moments'],
    apiEndpoint: '/api/library/tender-moments',
    playerPath: '/tender-moments/watch',
    completeness: true,
    playable: true,
  },
  {
    key: 'myths',
    label: 'Myths',
    stateCategory: 'Myths',
    scanMode: 'category',
    libraryCategories: ['Myths'],
    catalogCategories: ['Myths'],
    apiEndpoint: '/api/library/myths',
    playerPath: '/myths/watch',
    completeness: true,
    playable: true,
  },
  {
    key: 'bond',
    label: 'Bond',
    stateCategory: 'Bond',
    scanMode: 'category',
    libraryCategories: ['Bond'],
    catalogCategories: ['Bond'],
    apiEndpoint: '/api/library/bond',
    playerPath: '/bond/watch',
    completeness: true,
    playable: true,
  },
  {
    key: 'phone-call',
    label: 'Phone Calls',
    stateCategory: 'Phone Call',
    scanMode: 'category',
    libraryCategories: ['Phone Call'],
    catalogCategories: ['Phone Call'],
    apiEndpoint: '/api/library/phone-calls',
    playerPath: '/phone/watch',
    completeness: true,
    playable: true,
  },
  {
    key: 'phone-video',
    label: 'Phone Videos',
    stateCategory: 'Phone Video',
    scanMode: 'category',
    libraryCategories: ['Phone Video'],
    catalogCategories: ['Phone Video'],
    apiEndpoint: '/api/library/phone-videos',
    playerPath: '/phone/watch',
    completeness: true,
    playable: true,
  },
  {
    key: 'illusio',
    label: 'Illusio',
    stateCategory: 'Illusio',
    scanMode: 'category',
    libraryCategories: ['Illusio Kindle'],
    catalogCategories: ['Illusio', 'Illusio Kindle'],
    apiEndpoint: '/api/library/illusio',
    playerPath: '/illusio/watch',
    completeness: true,
    playable: true,
  },
  {
    key: 'main-story',
    label: 'Main Story',
    stateCategory: 'Main Story',
    scanMode: 'main-story',
    libraryCategories: ['Main Story'],
    catalogCategories: ['Main Story'],
    apiEndpoint: '/api/library/main-story/sequence',
    playerPath: '/main-story/watch',
    completeness: false,
    playable: true,
  },
  {
    key: 'gallery',
    label: 'Gallery',
    stateCategory: 'Gallery',
    scanMode: 'gallery',
    libraryCategories: ['Gallery'],
    catalogCategories: [],
    apiEndpoint: '/api/gallery',
    playerPath: null,
    completeness: false,
    playable: false,
  },
]


function normalized(
  value: string
) {
  return value
    .trim()
    .toLocaleLowerCase()
}


export const categoryScanDefinitions =
  archiveCategoryDefinitions.filter(
    (definition) =>
      definition.scanMode === 'category'
  )


export const completenessCategoryDefinitions =
  archiveCategoryDefinitions.filter(
    (definition) =>
      definition.completeness
  )


export const playableCategoryDefinitions =
  archiveCategoryDefinitions.filter(
    (definition) =>
      definition.playable
  )


export function archiveCategoryByCatalogCategory(
  category: string
) {
  const wanted = normalized(category)

  return archiveCategoryDefinitions.find(
    (definition) =>
      definition.catalogCategories.some(
        (candidate) =>
          normalized(candidate) === wanted
      )
  ) ?? null
}


export function archiveCategoryByLibraryCategory(
  category: string
) {
  const wanted = normalized(category)

  return archiveCategoryDefinitions.find(
    (definition) =>
      definition.libraryCategories.some(
        (candidate) =>
          normalized(candidate) === wanted
      ) ||
      normalized(definition.stateCategory) === wanted
  ) ?? null
}


export function canonicalArchiveCategory(
  category: string
) {
  return (
    archiveCategoryByLibraryCategory(
      category
    )?.stateCategory ??
    category.trim()
  )
}
