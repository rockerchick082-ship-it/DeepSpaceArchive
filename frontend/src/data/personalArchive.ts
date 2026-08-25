import type {
  ArchiveItem,
} from './archive'

import type {
  ArchiveState,
} from './archiveState'


type ArchiveResponse = {
  count: number
  items: ArchiveItem[]
}


type ArchiveStatesResponse = {
  count: number
  items: ArchiveState[]
}


export type PersonalArchiveSource = {
  category: string
  endpoint: string
  playerPath: string
}


export type PersonalArchiveEntry = {
  state: ArchiveState
  item: ArchiveItem | null

  availability:
    | 'available'
    | 'missing'
    | 'source-error'
}


export type PersonalArchiveData = {
  entries: PersonalArchiveEntry[]

  sourceErrors:
    Record<
      string,
      string
    >
}


export const personalArchiveSources:
  PersonalArchiveSource[] = [
    {
      category:
        'Memoria',

      endpoint:
        '/api/library/memoria',

      playerPath:
        '/memoria/watch',
    },

    {
      category:
        'Secret Times',

      endpoint:
        '/api/library/secret-times',

      playerPath:
        '/secret-times/watch',
    },

    {
      category:
        'Myths',

      endpoint:
        '/api/library/myths',

      playerPath:
        '/myths/watch',
    },

    {
      category:
        'Bond',

      endpoint:
        '/api/library/bond',

      playerPath:
        '/bond/watch',
    },

    {
      category:
        'Tender Moments',

      endpoint:
        '/api/library/tender-moments',

      playerPath:
        '/tender-moments/watch',
    },

    {
      category:
        'Phone Call',

      endpoint:
        '/api/library/phone-calls',

      playerPath:
        '/phone/watch',
    },

    {
      category:
        'Phone Video',

      endpoint:
        '/api/library/phone-videos',

      playerPath:
        '/phone/watch',
    },

    {
      category:
        'Illusio',

      endpoint:
        '/api/library/illusio',

      playerPath:
        '/illusio/watch',
    },

    {
      category:
        'Main Story',

      endpoint:
        '/api/library/main-story/sequence',

      playerPath:
        '/main-story/watch',
    },
  ]


export function canonicalArchiveCategory(
  category: string
) {

  if (
    category ===
    'Illusio Kindle'
  ) {

    return 'Illusio'

  }


  return category

}


export function normalizeArchiveRelativePath(
  value: string
) {

  return value
    .replace(
      /\\/g,
      '/'
    )
    .replace(
      /^\/+/,
      ''
    )

}


export function personalArchiveKey(
  category: string,
  relativePath: string
) {

  return (
    `${canonicalArchiveCategory(
      category
    ).toLowerCase()}::${normalizeArchiveRelativePath(
      relativePath
    ).toLowerCase()}`
  )

}


export function getPersonalArchiveSource(
  category: string
) {

  const canonicalCategory =
    canonicalArchiveCategory(
      category
    )


  return (
    personalArchiveSources.find(
      (source) =>
        source.category ===
        canonicalCategory
    ) ??
    null
  )

}


export function getPersonalArchivePlayerUrl(
  category: string,
  relativePath: string
) {

  const source =
    getPersonalArchiveSource(
      category
    )


  if (
    !source
  ) {

    return null

  }


  const query =
    new URLSearchParams({
      file:
        relativePath,
    })


  if (
    source.category ===
      'Phone Call' ||
    source.category ===
      'Phone Video'
  ) {

    query.set(
      'category',
      source.category
    )

  }


  return (
    `${source.playerPath}?${query}`
  )

}


async function fetchArchiveStates() {

  const response =
    await fetch(
      '/api/archive/states'
    )


  if (
    !response.ok
  ) {

    throw new Error(
      'Unable to load archive activity.'
    )

  }


  return (
    await response.json()
  ) as ArchiveStatesResponse

}


async function fetchArchiveSource(
  source:
    PersonalArchiveSource
) {

  const response =
    await fetch(
      source.endpoint
    )


  if (
    !response.ok
  ) {

    throw new Error(
      `Unable to load ${source.category}.`
    )

  }


  const data =
    await response.json() as
      ArchiveResponse


  return data.items.map(
    (item) => ({
      ...item,

      /*
       * Personal-library state is keyed by the
       * user-facing archive category. This also
       * normalizes the physical "Illusio Kindle"
       * folder to the existing "Illusio" state.
       */
      category:
        source.category,
    })
  )

}


export async function fetchPersonalArchiveData():
  Promise<PersonalArchiveData> {

  const [
    stateResult,
    ...sourceResults
  ] =
    await Promise.allSettled([
      fetchArchiveStates(),

      ...personalArchiveSources.map(
        (source) =>
          fetchArchiveSource(
            source
          )
      ),
    ])


  if (
    stateResult.status ===
    'rejected'
  ) {

    throw stateResult.reason

  }


  const itemMap =
    new Map<
      string,
      ArchiveItem
    >()


  const sourceErrors:
    Record<
      string,
      string
    > = {}


  personalArchiveSources.forEach(
    (
      source,
      index
    ) => {

      const result =
        sourceResults[
          index
        ]


      if (
        !result ||
        result.status ===
          'rejected'
      ) {

        sourceErrors[
          source.category
        ] =
          result?.status ===
            'rejected' &&
          result.reason instanceof
            Error
            ? result.reason.message
            : `Unable to load ${source.category}.`


        return

      }


      for (
        const item
        of result.value
      ) {

        itemMap.set(
          personalArchiveKey(
            source.category,
            item.relativePath
          ),
          item
        )

      }

    }
  )


  const supportedCategories =
    new Set(
      personalArchiveSources.map(
        (source) =>
          source.category
      )
    )


  const entries =
    stateResult.value.items
      .filter(
        (state) =>
          supportedCategories.has(
            canonicalArchiveCategory(
              state.category
            )
          )
      )
      .map(
        (
          state
        ): PersonalArchiveEntry => {

          const canonicalCategory =
            canonicalArchiveCategory(
              state.category
            )


          const item =
            itemMap.get(
              personalArchiveKey(
                canonicalCategory,
                state.relativePath
              )
            ) ??
            null


          const availability:
            PersonalArchiveEntry[
              'availability'
            ] =
              item
                ? 'available'
                : sourceErrors[
                    canonicalCategory
                  ]
                  ? 'source-error'
                  : 'missing'


          return {
            state: {
              ...state,

              category:
                canonicalCategory,
            },

            item,

            availability,
          }

        }
      )


  return {
    entries,
    sourceErrors,
  }

}


export function fallbackArchiveTitle(
  relativePath: string
) {

  const normalized =
    normalizeArchiveRelativePath(
      relativePath
    )


  const fileName =
    normalized
      .split(
        '/'
      )
      .pop() ??
    normalized


  return fileName
    .replace(
      /\.[^.]+$/,
      ''
    )
    .replace(
      /[_-]+/g,
      ' '
    )
    .replace(
      /\s+/g,
      ' '
    )
    .trim()

}


export function formatPlaybackTime(
  seconds: number
) {

  const safeSeconds =
    Math.max(
      0,
      Math.floor(
        seconds
      )
    )


  const hours =
    Math.floor(
      safeSeconds /
      3600
    )


  const minutes =
    Math.floor(
      (
        safeSeconds %
        3600
      ) /
      60
    )


  const remainingSeconds =
    safeSeconds %
    60


  if (
    hours >
    0
  ) {

    return (
      `${hours}:${String(
        minutes
      ).padStart(
        2,
        '0'
      )}:${String(
        remainingSeconds
      ).padStart(
        2,
        '0'
      )}`
    )

  }


  return (
    `${minutes}:${String(
      remainingSeconds
    ).padStart(
      2,
      '0'
    )}`
  )

}