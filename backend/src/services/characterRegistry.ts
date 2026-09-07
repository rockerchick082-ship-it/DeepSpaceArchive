import fs from 'node:fs/promises'
import path from 'node:path'

export const defaultCharacters = [
  'Xavier',
  'Zayne',
  'Rafayel',
  'Sylus',
  'Caleb',
] as const

const characterCategoryFolders = [
  'Memoria',
  'Secret Times',
  'Tender Moments',
  'Myths',
  'Bond',
  'Phone Call',
  'Phone Video',
  'Illusio Kindle',
  'Illusio',
  'Gallery',
  'home',
]

export type ArchiveCharacter = {
  name: string
  source: 'default' | 'library'
  /** Display order. The built-in characters are 1-5; future characters can use folder prefixes such as 6. Name. */
  order: number
}

function normalized(value: string) {
  return value.trim().toLocaleLowerCase()
}

function parseCharacterFolder(value: string) {
  const match = value.match(/^(\d+)\.\s*(.+)$/)
  if (match) {
    return {
      name: match[2].trim(),
      order: Number(match[1]),
    }
  }

  return { name: value.trim(), order: null as number | null }
}

async function directoriesAt(directory: string) {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true })
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name)
  } catch {
    return [] as string[]
  }
}

async function resolveCategoryDirectory(libraryPath: string, wanted: string) {
  const entries = await directoriesAt(libraryPath)
  const match = entries.find((entry) => normalized(entry) === normalized(wanted))
  return match ? path.join(libraryPath, match) : null
}

/**
 * Characters are intentionally discovered from the archive folders instead of
 * being hard-coded in each page. Adding a new first-level character folder to
 * any archive category (for example Memoria/New Character) makes that
 * character available throughout the UI on the next API refresh.
 */
export async function discoverArchiveCharacters(libraryPath: string | null | undefined) {
  const discovered = new Map<string, ArchiveCharacter>()

  defaultCharacters.forEach((character, index) => {
    discovered.set(normalized(character), { name: character, source: 'default', order: index + 1 })
  })

  if (!libraryPath) {
    return [...discovered.values()]
  }

  for (const category of characterCategoryFolders) {
    const categoryDirectory = await resolveCategoryDirectory(libraryPath, category)
    if (!categoryDirectory) continue

    for (const folder of await directoriesAt(categoryDirectory)) {
      const parsed = parseCharacterFolder(folder)
      if (!parsed.name) continue
      const key = normalized(parsed.name)
      const existing = discovered.get(key)
      if (!existing) {
        // Future love interests are intentionally ordered by their numeric
        // folder prefix: 6. Name, 7. Name, etc. This keeps the archive in
        // the same canonical character order everywhere instead of alphabetizing.
        discovered.set(key, {
          name: parsed.name,
          source: 'library',
          order: parsed.order ?? Number.MAX_SAFE_INTEGER,
        })
      } else if (
        existing.source === 'library' &&
        existing.order === Number.MAX_SAFE_INTEGER &&
        parsed.order !== null
      ) {
        // If one category used an unnumbered folder but another category has
        // the canonical numbered folder, adopt the numbered position.
        existing.order = parsed.order
      }
    }
  }

  const defaults = defaultCharacters
    .map((character) => discovered.get(normalized(character)))
    .filter((value): value is ArchiveCharacter => Boolean(value))

  const extras = [...discovered.values()]
    .filter((entry) => !defaultCharacters.some((character) => normalized(character) === normalized(entry.name)))
    .sort((left, right) => left.order - right.order)

  return [...defaults, ...extras]
}

export async function isArchiveCharacter(libraryPath: string | null | undefined, character: string) {
  const wanted = normalized(character)
  const characters = await discoverArchiveCharacters(libraryPath)
  return characters.some((entry) => normalized(entry.name) === wanted)
}
