import type {
  ArchiveItem,
} from './archive'

import {
  personalArchiveSources,
} from './personalArchive'


export type ArchiveIndexItem =
  ArchiveItem & {
    archiveCategory: string
    playerPath: string
  }


export type ArchiveIndexResult = {
  items: ArchiveIndexItem[]
  sourceErrors:
    Record<string, string>
}


export function archiveIndexKey(
  category: string,
  relativePath: string
) {
  return `${category}\u0000${relativePath}`
}


export function archiveIndexPlayerUrl(
  item: ArchiveIndexItem
) {
  const query =
    new URLSearchParams({
      file:
        item.relativePath,
    })

  if (
    item.archiveCategory === 'Phone Call' ||
    item.archiveCategory === 'Phone Video'
  ) {
    query.set(
      'category',
      item.archiveCategory
    )
  }

  return `${item.playerPath}?${query}`
}


export async function fetchArchiveIndex():
  Promise<ArchiveIndexResult> {

  const results =
    await Promise.allSettled(
      personalArchiveSources.map(
        async (
          source
        ) => {
          const response =
            await fetch(
              source.endpoint
            )

          if (!response.ok) {
            throw new Error(
              `Unable to load ${source.category}.`
            )
          }

          const data =
            await response.json() as {
              items?: ArchiveItem[]
            }

          return (
            Array.isArray(data.items)
              ? data.items
              : []
          ).map(
            (item): ArchiveIndexItem => ({
              ...item,
              category:
                source.category,
              archiveCategory:
                source.category,
              playerPath:
                source.playerPath,
            })
          )
        }
      )
    )


  const items:
    ArchiveIndexItem[] = []

  const sourceErrors:
    Record<string, string> = {}


  results.forEach(
    (
      result,
      index
    ) => {
      const source =
        personalArchiveSources[index]

      if (
        !source
      ) {
        return
      }

      if (
        result.status === 'fulfilled'
      ) {
        items.push(
          ...result.value
        )
      } else {
        sourceErrors[
          source.category
        ] =
          result.reason instanceof Error
            ? result.reason.message
            : `Unable to load ${source.category}.`
      }
    }
  )


  return {
    items,
    sourceErrors,
  }
}
