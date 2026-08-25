import fs from 'node:fs/promises'
import path from 'node:path'

import {
  dataDirectory,
} from '../config/appPaths'

import type {
  GalleryWikiSyncResult,
} from './galleryWikiSync'


export type GalleryWikiCharacter =
  | 'Xavier'
  | 'Zayne'
  | 'Rafayel'
  | 'Sylus'
  | 'Caleb'


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

  const supplied =
    Array.isArray(
      value
    )
      ? value
      : []


  return characters.map(
    (character) => {

      const matching =
        supplied.find(
          (candidate) => {

            if (
              !candidate ||
              typeof candidate !==
                'object'
            ) {

              return false

            }


            return (
              (
                candidate as
                  Partial<GalleryWikiSource>
              ).character ===
              character
            )

          }
        ) as
          Partial<GalleryWikiSource> |
          undefined


      const fallback =
        defaultSources.find(
          (source) =>
            source.character ===
            character
        ) as GalleryWikiSource


      return {
        character,

        url:
          typeof matching?.url ===
            'string' &&
          matching.url.trim()
            ? matching.url.trim()
            : fallback.url,
      }

    }
  )

}


function normalizeHistory(
  value:
    unknown
) {

  const supplied =
    Array.isArray(
      value
    )
      ? value
      : []


  return characters.map(
    (character) => {

      const matching =
        supplied.find(
          (candidate) => {

            if (
              !candidate ||
              typeof candidate !==
                'object'
            ) {

              return false

            }


            return (
              (
                candidate as
                  Partial<GalleryWikiSyncHistoryEntry>
              ).character ===
              character
            )

          }
        ) as
          Partial<GalleryWikiSyncHistoryEntry> |
          undefined


      return {
        character,

        lastAttemptAt:
          typeof matching
            ?.lastAttemptAt ===
            'string'
            ? matching.lastAttemptAt
            : null,

        lastSuccessAt:
          typeof matching
            ?.lastSuccessAt ===
            'string'
            ? matching.lastSuccessAt
            : null,

        lastResult:
          matching?.lastResult &&
          typeof matching.lastResult ===
            'object'
            ? matching.lastResult as
                GalleryWikiSyncResult
            : null,

        lastError:
          typeof matching
            ?.lastError ===
            'string'
            ? matching.lastError
            : null,
      }

    }
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
):
  value is GalleryWikiCharacter {

  return characters.includes(
    value as
      GalleryWikiCharacter
  )

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


  const nextSources =
    settings.sources.map(
      (source) =>
        source.character ===
          character
          ? {
              character,
              url:
                url.trim(),
            }
          : source
    )


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

              lastAttemptAt:
                attemptedAt,

              lastError:
                null,
            }
          : entry
    )


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

              lastAttemptAt:
                entry.lastAttemptAt ??
                completedAt,

              lastSuccessAt:
                completedAt,

              lastResult:
                result,

              lastError:
                null,
            }
          : entry
    )


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

              lastAttemptAt:
                entry.lastAttemptAt ??
                failedAt,

              lastError:
                errorMessage,
            }
          : entry
    )


  await writeSettings({
    sources:
      settings.sources,

    syncHistory,
  })

}