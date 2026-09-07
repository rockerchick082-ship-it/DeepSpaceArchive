import fs from 'node:fs/promises'
import path from 'node:path'

import {
  dataDirectory,
} from '../config/appPaths'

import type {
  GalleryWikiSyncResult,
} from './galleryWikiSync'


export type GalleryWikiCharacter = string



export type GalleryWikiSource = {
  character:
    GalleryWikiCharacter

  url:
    string
}


export type GalleryWikiSyncHistoryEntry = {
  character:
    GalleryWikiCharacter

  lastAttemptAt:
    string | null

  lastSuccessAt:
    string | null

  lastResult:
    GalleryWikiSyncResult | null

  lastError:
    string | null
}


type GalleryWikiSettings = {
  sources:
    GalleryWikiSource[]

  syncHistory?:
    GalleryWikiSyncHistoryEntry[]
}


const settingsPath =
  path.join(
    dataDirectory,
    'gallery-wiki-sources.json'
  )


const defaultSources:
  GalleryWikiSource[] = [

    {
      character:
        'Xavier',

      url:
        'https://loveanddeepspace.wiki.gg/wiki/Category:Xavier_Memory_images',
    },

    {
      character:
        'Zayne',

      url:
        'https://loveanddeepspace.wiki.gg/wiki/Category:Zayne_Memory_images',
    },

    {
      character:
        'Rafayel',

      url:
        'https://loveanddeepspace.wiki.gg/wiki/Category:Rafayel_Memory_images',
    },

    {
      character:
        'Sylus',

      url:
        'https://loveanddeepspace.wiki.gg/wiki/Category:Sylus_Memory_images',
    },

    {
      character:
        'Caleb',

      url:
        'https://loveanddeepspace.wiki.gg/wiki/Category:Caleb_Memory_images',
    },

  ]


const characters =
  defaultSources.map(
    (source) =>
      source.character
  )


function emptyHistoryEntry(
  character:
    GalleryWikiCharacter
):
  GalleryWikiSyncHistoryEntry {

  return {
    character,

    lastAttemptAt:
      null,

    lastSuccessAt:
      null,

    lastResult:
      null,

    lastError:
      null,
  }

}


function normalizeSources(
  value:
    unknown
) {
  const supplied = Array.isArray(value) ? value : []
  const byCharacter = new Map<string, string>()

  for (const candidate of supplied) {
    if (!candidate || typeof candidate !== 'object') continue
    const source = candidate as Partial<GalleryWikiSource>
    const character = typeof source.character === 'string' ? source.character.trim() : ''
    const url = typeof source.url === 'string' ? source.url.trim() : ''
    if (character && url) byCharacter.set(character, url)
  }

  for (const fallback of defaultSources) {
    if (!byCharacter.has(fallback.character)) {
      byCharacter.set(fallback.character, fallback.url)
    }
  }

  const ordered = [
    ...characters.filter((character) => byCharacter.has(character)),
    ...[...byCharacter.keys()]
      .filter((character) => !characters.includes(character))
      .sort((left, right) => left.localeCompare(right)),
  ]

  return ordered.map((character) => ({
    character,
    url: byCharacter.get(character)!,
  }))
}



function normalizeHistory(
  value:
    unknown
) {
  const supplied = Array.isArray(value) ? value : []
  const byCharacter = new Map<string, GalleryWikiSyncHistoryEntry>()

  for (const candidate of supplied) {
    if (!candidate || typeof candidate !== 'object') continue
    const entry = candidate as Partial<GalleryWikiSyncHistoryEntry>
    const character = typeof entry.character === 'string' ? entry.character.trim() : ''
    if (!character) continue
    byCharacter.set(character, {
      character,
      lastAttemptAt: typeof entry.lastAttemptAt === 'string' ? entry.lastAttemptAt : null,
      lastSuccessAt: typeof entry.lastSuccessAt === 'string' ? entry.lastSuccessAt : null,
      lastResult: entry.lastResult ?? null,
      lastError: typeof entry.lastError === 'string' ? entry.lastError : null,
    })
  }

  const orderedCharacters = [
    ...characters,
    ...[...byCharacter.keys()]
      .filter((character) => !characters.includes(character))
      .sort((left, right) => left.localeCompare(right)),
  ]

  return orderedCharacters.map((character) =>
    byCharacter.get(character) ?? emptyHistoryEntry(character)
  )
}



async function writeSettings(
  settings:
    GalleryWikiSettings
) {

  await fs.mkdir(
    path.dirname(
      settingsPath
    ),
    {
      recursive:
        true,
    }
  )


  const temporaryPath =
    `${settingsPath}.tmp`


  await fs.writeFile(
    temporaryPath,
    JSON.stringify(
      settings,
      null,
      2
    ),
    'utf8'
  )


  await fs.rename(
    temporaryPath,
    settingsPath
  )

}


async function readSettings():
  Promise<Required<GalleryWikiSettings>> {

  try {

    const contents =
      await fs.readFile(
        settingsPath,
        'utf8'
      )


    const parsed =
      JSON.parse(
        contents
      ) as
        GalleryWikiSettings


    return {
      sources:
        normalizeSources(
          parsed.sources
        ),

      syncHistory:
        normalizeHistory(
          parsed.syncHistory
        ),
    }

  } catch (
    error
  ) {

    const code =
      (
        error as
          NodeJS.ErrnoException
      ).code


    if (
      code !==
      'ENOENT'
    ) {

      console.warn(
        'Unable to read Gallery wiki settings; restoring defaults:',
        error
      )

    }


    const initial = {
      sources:
        defaultSources.map(
          (source) => ({
            ...source,
          })
        ),

      syncHistory:
        characters.map(
          emptyHistoryEntry
        ),
    }


    await writeSettings(
      initial
    )


    return initial

  }

}


export function isGalleryWikiCharacter(
  value:
    string
): value is GalleryWikiCharacter {
  return value.trim().length > 0
}



export function getDefaultGalleryWikiSources() {

  return defaultSources.map(
    (source) => ({
      ...source,
    })
  )

}


export async function getGalleryWikiSources() {

  return (
    await readSettings()
  ).sources

}


export async function getGalleryWikiSettingsStatus() {

  const settings =
    await readSettings()


  return {
    sources:
      settings.sources,

    defaults:
      getDefaultGalleryWikiSources(),

    syncHistory:
      settings.syncHistory,
  }

}


export async function updateGalleryWikiSource(
  character:
    GalleryWikiCharacter,
  url:
    string
) {

  const settings =
    await readSettings()


  const existingIndex =
    settings.sources.findIndex(
      (source) => source.character === character
    )

  const nextSources = [
    ...settings.sources,
  ]

  const nextSource = {
    character: character.trim(),
    url: url.trim(),
  }

  if (existingIndex >= 0) {
    nextSources[existingIndex] = nextSource
  } else {
    nextSources.push(nextSource)
  }


  await writeSettings({
    sources:
      nextSources,

    syncHistory:
      settings.syncHistory,
  })


  return nextSources

}


export async function restoreDefaultGalleryWikiSources() {

  const settings =
    await readSettings()


  const sources =
    getDefaultGalleryWikiSources()


  await writeSettings({
    sources,

    /*
     * Source restoration is configuration-only.
     * Preserve sync history because it remains useful
     * diagnostic information.
     */
    syncHistory:
      settings.syncHistory,
  })


  return sources

}


export async function recordGalleryWikiSyncAttempt(
  character:
    GalleryWikiCharacter
) {

  const settings =
    await readSettings()


  const attemptedAt =
    new Date()
      .toISOString()


  const syncHistory =
    settings.syncHistory.map(
      (entry) =>
        entry.character ===
          character
          ? {
              ...entry,
              lastAttemptAt: attemptedAt,
              lastError: null,
            }
          : entry
    )

  if (!syncHistory.some((entry) => entry.character === character)) {
    syncHistory.push({
      ...emptyHistoryEntry(character),
      lastAttemptAt: attemptedAt,
    })
  }


  await writeSettings({
    sources:
      settings.sources,

    syncHistory,
  })

}


export async function recordGalleryWikiSyncSuccess(
  character:
    GalleryWikiCharacter,
  result:
    GalleryWikiSyncResult
) {

  const settings =
    await readSettings()


  const completedAt =
    new Date()
      .toISOString()


  const syncHistory =
    settings.syncHistory.map(
      (entry) =>
        entry.character ===
          character
          ? {
              ...entry,
              lastAttemptAt: entry.lastAttemptAt ?? completedAt,
              lastSuccessAt: completedAt,
              lastResult: result,
              lastError: null,
            }
          : entry
    )

  if (!syncHistory.some((entry) => entry.character === character)) {
    syncHistory.push({
      ...emptyHistoryEntry(character),
      lastAttemptAt: completedAt,
      lastSuccessAt: completedAt,
      lastResult: result,
    })
  }


  await writeSettings({
    sources:
      settings.sources,

    syncHistory,
  })

}


export async function recordGalleryWikiSyncFailure(
  character:
    GalleryWikiCharacter,
  errorMessage:
    string
) {

  const settings =
    await readSettings()


  const failedAt =
    new Date()
      .toISOString()


  const syncHistory =
    settings.syncHistory.map(
      (entry) =>
        entry.character ===
          character
          ? {
              ...entry,
              lastAttemptAt: entry.lastAttemptAt ?? failedAt,
              lastError: errorMessage,
            }
          : entry
    )

  if (!syncHistory.some((entry) => entry.character === character)) {
    syncHistory.push({
      ...emptyHistoryEntry(character),
      lastAttemptAt: failedAt,
      lastError: errorMessage,
    })
  }


  await writeSettings({
    sources:
      settings.sources,

    syncHistory,
  })

}