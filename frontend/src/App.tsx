import {
  BrowserRouter,
  HashRouter,
  Navigate,
  Routes,
  Route,
  useLocation,
} from 'react-router-dom'

import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import type {
  ReactNode,
} from 'react'

import HomePage from './pages/HomePage'

import FavoritesPage from './pages/FavoritesPage'
import ContinueWatchingPage from './pages/ContinueWatchingPage'
import HistoryPage from './pages/HistoryPage'
import StatsPage from './pages/StatsPage'

import PlaylistsPage from './pages/PlaylistsPage'
import PlaylistDetailPage from './pages/PlaylistDetailPage'

import MemoriaPage from './pages/MemoriaPage'
import MemoryPlayerPage from './pages/MemoryPlayerPage'

import SecretTimesPage from './pages/SecretTimesPage'
import SecretTimesPlayerPage from './pages/SecretTimesPlayerPage'

import MythsPage from './pages/MythsPage'
import MythsPlayerPage from './pages/MythsPlayerPage'

import BondPage from './pages/BondPage'
import BondPlayerPage from './pages/BondPlayerPage'

import TenderMomentsPage from './pages/TenderMomentsPage'
import TenderMomentsPlayerPage from './pages/TenderMomentsPlayerPage'

import BackupPage from './pages/BackupPage'

import SettingsPage from './pages/SettingsPage'

import LibraryStatusPage from './pages/LibraryStatusPage'
import MetadataHealthPage from './pages/MetadataHealthPage'
import ThumbnailCachePage from './pages/ThumbnailCachePage'
import DatabaseMaintenancePage from './pages/DatabaseMaintenancePage'

import AboutPage from './pages/AboutPage'
import MetadataCatalogPage from './pages/MetadataCatalogPage'
import GalleryPage from './pages/GalleryPage'
import GalleryWikiSettingsPage from './pages/GalleryWikiSettingsPage'
import FileLocationsPage from './pages/FileLocationsPage'
import SetupPage from './pages/SetupPage'


import PhonePage from './pages/PhonePage'
import PhoneCallsPage from './pages/PhoneCallsPage'
import PhoneVideosPage from './pages/PhoneVideosPage'
import PhonePlayerPage from './pages/PhonePlayerPage'

import IllusioPage from './pages/IllusioPage'
import IllusioPlayerPage from './pages/IllusioPlayerPage'


import MainStoryPage from './pages/MainStoryPage'
import MainStoryChapterPage from './pages/MainStoryChapterPage'
import MainStoryPlayerPage from './pages/MainStoryPlayerPage'



const mobileMarkerKey =
  'deepspaceArchiveMobile'

const mobileConnectionEvent =
  'deepspace-archive-connection'

const offlineCacheHeader =
  'X-DeepSpace-Archive-Offline-Cache'


type MobileNativeBridge = {
  apiRequest?: (
    requestJson: string
  ) => string

  getServerUrl?: () => string

  getAppBaseUrl?: () => string
}


type NativeApiResult = {
  status: number
  contentType: string
  body: string
  connected: boolean
}


let mobileNasConnected =
  true


function getMobileBridge() {

  return (
    window as typeof window & {
      DeepSpaceArchiveMobile?:
        MobileNativeBridge
    }
  ).DeepSpaceArchiveMobile

}


function isDeepSpaceMobile() {

  if (
    typeof window ===
      'undefined'
  ) {

    return false

  }


  const mobile =
    Boolean(
      getMobileBridge()
    )


  if (
    mobile
  ) {

    try {

      window.localStorage.setItem(
        mobileMarkerKey,
        'true'
      )

    } catch {
      // Native bridge is still the source of truth.
    }

  } else {

    try {

      window.localStorage.removeItem(
        mobileMarkerKey
      )

    } catch {
      // Browser cleanup is best-effort only.
    }

  }


  return mobile

}


function isBundledMobileArchive() {

  const bridge =
    getMobileBridge()


  if (
    !bridge
  ) {

    return false

  }


  try {

    const appBaseUrl =
      bridge.getAppBaseUrl?.()


    if (
      appBaseUrl
    ) {

      return (
        new URL(
          appBaseUrl
        ).origin ===
        window.location.origin
      )

    }

  } catch {
    // Fall through to the normal Capacitor host check.
  }


  return (
    window.location.hostname ===
      'localhost' ||
    window.location.hostname ===
      '127.0.0.1'
  )

}


function publishMobileConnection(
  connected: boolean
) {

  mobileNasConnected =
    connected


  document.documentElement.dataset
    .nasConnected =
      connected
        ? 'true'
        : 'false'


  window.dispatchEvent(
    new CustomEvent(
      mobileConnectionEvent,
      {
        detail: {
          connected,
        },
      }
    )
  )

}


function getRequestUrl(
  input:
    RequestInfo |
    URL
) {

  if (
    input instanceof
      Request
  ) {

    return input.url

  }


  return input.toString()

}


function getRequestMethod(
  input:
    RequestInfo |
    URL,
  init?:
    RequestInit
) {

  return (
    init?.method ??
    (
      input instanceof
        Request
        ? input.method
        : 'GET'
    )
  ).toUpperCase()

}


async function requestHeadersObject(
  input:
    RequestInfo |
    URL,
  init?:
    RequestInit
) {

  const headers =
    new Headers(
      input instanceof
        Request
        ? input.headers
        : undefined
    )


  if (
    init?.headers
  ) {

    new Headers(
      init.headers
    ).forEach(
      (
        value,
        key
      ) => {

        headers.set(
          key,
          value
        )

      }
    )

  }


  const result:
    Record<
      string,
      string
    > = {}


  headers.forEach(
    (
      value,
      key
    ) => {

      result[
        key
      ] =
        value

    }
  )


  return result

}


async function requestBodyText(
  input:
    RequestInfo |
    URL,
  init?:
    RequestInit
) {

  if (
    typeof init?.body ===
      'string'
  ) {

    return init.body

  }


  if (
    init?.body instanceof
      URLSearchParams
  ) {

    return init.body.toString()

  }


  if (
    input instanceof
      Request
  ) {

    try {

      return await input
        .clone()
        .text()

    } catch {

      return ''

    }

  }


  return ''

}


type MobileArchiveState = {
  category: string
  relativePath: string
  favorite: boolean
  rating: number | null
  playCount: number
  lastWatched: string | null
  progressSeconds: number
  durationSeconds: number | null
  completed: boolean
  totalWatchSeconds: number
}


type OfflinePlaybackEvent = {
  eventId: string
  category: string
  relativePath: string
  occurredAt: string
  progressSeconds: number
  durationSeconds: number | null
  watchedSecondsDelta: number
  playCountDelta: number
  completed: boolean
}


type OfflinePlaybackSyncResult = {
  processedEventIds: string[]
  duplicateEventIds: string[]
  states: MobileArchiveState[]
}


type MobileOfflinePlaybackRuntime = {
  saveProgress: (
    input: {
      category: string
      relativePath: string
      progressSeconds: number
      durationSeconds: number | null
      watchedSeconds: number
    }
  ) => MobileArchiveState | null

  restart: (
    input: {
      category: string
      relativePath: string
    }
  ) => MobileArchiveState | null

  flush: () => void
  connected: () => boolean
}


const offlinePlaybackQueueKey =
  'deepspaceArchiveOfflinePlaybackQueue:v1'


const archiveSnapshotPrefix =
  'deepspaceArchiveArchiveState:v1:'


function archiveSnapshotKey(
  category: string,
  relativePath: string
) {

  return (
    archiveSnapshotPrefix +
    encodeURIComponent(
      category
    ) +
    ':' +
    encodeURIComponent(
      relativePath
    )
  )

}


function blankArchiveState(
  category: string,
  relativePath: string
): MobileArchiveState {

  return {
    category,
    relativePath,
    favorite:
      false,
    rating:
      null,
    playCount:
      0,
    lastWatched:
      null,
    progressSeconds:
      0,
    durationSeconds:
      null,
    completed:
      false,
    totalWatchSeconds:
      0,
  }

}


function readArchiveSnapshot(
  category: string,
  relativePath: string
) {

  try {

    const raw =
      window.localStorage.getItem(
        archiveSnapshotKey(
          category,
          relativePath
        )
      )


    if (
      !raw
    ) {

      return blankArchiveState(
        category,
        relativePath
      )

    }


    return JSON.parse(
      raw
    ) as MobileArchiveState

  } catch {

    return blankArchiveState(
      category,
      relativePath
    )

  }

}


function writeArchiveSnapshot(
  state: MobileArchiveState
) {

  try {

    window.localStorage.setItem(
      archiveSnapshotKey(
        state.category,
        state.relativePath
      ),
      JSON.stringify(
        state
      )
    )

  } catch {
    // Resume/stat snapshots are best-effort.
  }

}


function readOfflinePlaybackQueue() {

  try {

    const raw =
      window.localStorage.getItem(
        offlinePlaybackQueueKey
      )


    if (
      !raw
    ) {

      return [] as
        OfflinePlaybackEvent[]

    }


    const parsed =
      JSON.parse(
        raw
      )


    return Array.isArray(
      parsed
    )
      ? parsed as
          OfflinePlaybackEvent[]
      : []

  } catch {

    return [] as
      OfflinePlaybackEvent[]

  }

}


function writeOfflinePlaybackQueue(
  events:
    OfflinePlaybackEvent[]
) {

  try {

    if (
      events.length ===
        0
    ) {

      window.localStorage.removeItem(
        offlinePlaybackQueueKey
      )


      return

    }


    window.localStorage.setItem(
      offlinePlaybackQueueKey,
      JSON.stringify(
        events
      )
    )

  } catch (error) {

    console.error(
      'Unable to persist offline playback queue:',
      error
    )

  }

}


function createOfflineEventId() {

  try {

    return crypto.randomUUID()

  } catch {

    return (
      `offline-${Date.now()}-` +
      Math.random()
        .toString(
          36
        )
        .slice(
          2
        )
    )

  }

}


function applyOfflinePlaybackEvent(
  state:
    MobileArchiveState,
  event:
    OfflinePlaybackEvent
): MobileArchiveState {

  return {
    ...state,

    progressSeconds:
      event.progressSeconds,

    durationSeconds:
      event.durationSeconds ??
      state.durationSeconds,

    completed:
      event.completed,

    playCount:
      state.playCount +
      event.playCountDelta,

    totalWatchSeconds:
      state.totalWatchSeconds +
      event.watchedSecondsDelta,

    lastWatched:
      event.occurredAt,
  }

}


function createPlaybackEvent(
  pathname: string,
  bodyText: string
) {

  let body:
    Record<
      string,
      unknown
    >


  try {

    body =
      JSON.parse(
        bodyText ||
        '{}'
      ) as Record<
        string,
        unknown
      >

  } catch {

    return null

  }


  if (
    typeof body.category !==
      'string' ||
    typeof body.relativePath !==
      'string'
  ) {

    return null

  }


  const category =
    body.category


  const relativePath =
    body.relativePath


  const current =
    readArchiveSnapshot(
      category,
      relativePath
    )


  const occurredAt =
    new Date()
      .toISOString()


  if (
    pathname ===
      '/api/archive/restart'
  ) {

    const event:
      OfflinePlaybackEvent = {
      eventId:
        createOfflineEventId(),

      category,
      relativePath,
      occurredAt,

      progressSeconds:
        0,

      durationSeconds:
        current.durationSeconds,

      watchedSecondsDelta:
        0,

      playCountDelta:
        0,

      completed:
        false,
    }


    return {
      event,

      optimisticState:
        applyOfflinePlaybackEvent(
          current,
          event
        ),
    }

  }


  if (
    pathname !==
      '/api/archive/progress'
  ) {

    return null

  }


  const progressSeconds =
    Number(
      body.progressSeconds
    )


  const durationSeconds =
    body.durationSeconds ===
      null ||
    body.durationSeconds ===
      undefined
      ? null
      : Number(
          body.durationSeconds
        )


  const watchedSecondsDelta =
    Math.max(
      0,
      Number(
        body.watchedSeconds ??
        0
      ) ||
      0
    )


  if (
    !Number.isFinite(
      progressSeconds
    ) ||
    progressSeconds <
      0 ||
    (
      durationSeconds !==
        null &&
      (
        !Number.isFinite(
          durationSeconds
        ) ||
        durationSeconds <
          0
      )
    )
  ) {

    return null

  }


  const completed =
    durationSeconds !==
      null &&
    durationSeconds >
      0
      ? progressSeconds /
          durationSeconds >=
        0.95
      : false


  const playCountDelta =
    completed &&
    !current.completed
      ? 1
      : 0


  const event:
    OfflinePlaybackEvent = {
    eventId:
      createOfflineEventId(),

    category,
    relativePath,
    occurredAt,
    progressSeconds,
    durationSeconds,
    watchedSecondsDelta,
    playCountDelta,
    completed,
  }


  return {
    event,

    optimisticState:
      applyOfflinePlaybackEvent(
        current,
        event
      ),
  }

}


function enqueueOfflinePlaybackEvent(
  event:
    OfflinePlaybackEvent,
  optimisticState:
    MobileArchiveState
) {

  const queue =
    readOfflinePlaybackQueue()


  queue.push(
    event
  )


  writeOfflinePlaybackQueue(
    queue
  )


  writeArchiveSnapshot(
    optimisticState
  )

}


function responseFromArchiveState(
  state:
    MobileArchiveState,
  offline:
    boolean
) {

  return new Response(
    JSON.stringify(
      state
    ),
    {
      status:
        200,

      headers: {
        'Content-Type':
          'application/json',

        [offlineCacheHeader]:
          offline
            ? '1'
            : '0',
      },
    }
  )

}


function overlayQueuedEvents(
  state:
    MobileArchiveState
) {

  let next =
    state


  for (
    const event
    of readOfflinePlaybackQueue()
  ) {

    if (
      event.category ===
        state.category &&
      event.relativePath ===
        state.relativePath
    ) {

      next =
        applyOfflinePlaybackEvent(
          next,
          event
        )

    }

  }


  writeArchiveSnapshot(
    next
  )


  return next

}


async function overlayArchiveGetResponse(
  requestUrl:
    URL,
  response:
    Response
) {

  if (
    !response.ok
  ) {

    return response

  }


  if (
    requestUrl.pathname ===
      '/api/archive/state'
  ) {

    try {

      const state =
        await response
          .clone()
          .json() as
            MobileArchiveState


      const next =
        overlayQueuedEvents(
          state
        )


      return new Response(
        JSON.stringify(
          next
        ),
        {
          status:
            response.status,

          statusText:
            response.statusText,

          headers:
            response.headers,
        }
      )

    } catch {

      return response

    }

  }


  if (
    requestUrl.pathname ===
      '/api/archive/states'
  ) {

    try {

      const payload =
        await response
          .clone()
          .json() as {
            count: number
            items: MobileArchiveState[]
          }


      const byIdentity =
        new Map<
          string,
          MobileArchiveState
        >()


      for (
        const state
        of payload.items
      ) {

        const next =
          overlayQueuedEvents(
            state
          )


        byIdentity.set(
          `${state.category}\u0000${state.relativePath}`,
          next
        )

      }


      for (
        const event
        of readOfflinePlaybackQueue()
      ) {

        const key =
          `${event.category}\u0000${event.relativePath}`


        if (
          byIdentity.has(
            key
          )
        ) {

          continue

        }


        const next =
          overlayQueuedEvents(
            blankArchiveState(
              event.category,
              event.relativePath
            )
          )


        byIdentity.set(
          key,
          next
        )

      }


      const items =
        [
          ...byIdentity.values(),
        ]


      return new Response(
        JSON.stringify({
          count:
            items.length,

          items,
        }),
        {
          status:
            response.status,

          statusText:
            response.statusText,

          headers:
            response.headers,
        }
      )

    } catch {

      return response

    }

  }


  if (
    requestUrl.pathname ===
      '/api/archive/stats'
  ) {

    try {

      const payload =
        await response
          .clone()
          .json() as {
            totalCompletedWatches: number
            totalWatchSeconds: number
            categoryStats:
              Array<{
                category: string
                completedWatches: number
                watchSeconds: number
                favorites: number
                ratedItems: number
                averageRating: number | null
              }>
            [key: string]: unknown
          }


      const queue =
        readOfflinePlaybackQueue()


      const playDelta =
        queue.reduce(
          (
            total,
            event
          ) =>
            total +
            event.playCountDelta,
          0
        )


      const watchDelta =
        queue.reduce(
          (
            total,
            event
          ) =>
            total +
            event.watchedSecondsDelta,
          0
        )


      const categoryStats =
        payload.categoryStats.map(
          (row) => ({
            ...row,
          })
        )


      for (
        const event
        of queue
      ) {

        let row =
          categoryStats.find(
            (item) =>
              item.category ===
              event.category
          )


        if (
          !row
        ) {

          row = {
            category:
              event.category,

            completedWatches:
              0,

            watchSeconds:
              0,

            favorites:
              0,

            ratedItems:
              0,

            averageRating:
              null,
          }


          categoryStats.push(
            row
          )

        }


        row.completedWatches +=
          event.playCountDelta


        row.watchSeconds +=
          event.watchedSecondsDelta

      }


      return new Response(
        JSON.stringify({
          ...payload,

          totalCompletedWatches:
            payload.totalCompletedWatches +
            playDelta,

          totalWatchSeconds:
            payload.totalWatchSeconds +
            watchDelta,

          categoryStats,
        }),
        {
          status:
            response.status,

          statusText:
            response.statusText,

          headers:
            response.headers,
        }
      )

    } catch {

      return response

    }

  }


  return response

}


function initializeMobileRuntime() {

  if (
    typeof window ===
      'undefined' ||
    !isDeepSpaceMobile()
  ) {

    return

  }


  document.documentElement.dataset
    .dsaMobile =
      'true'


  const mobileWindow =
    window as typeof window & {
      __deepSpaceArchiveMobileFetchInstalled?:
        boolean

      DeepSpaceArchiveOfflinePlayback?:
        MobileOfflinePlaybackRuntime
    }


  if (
    mobileWindow
      .__deepSpaceArchiveMobileFetchInstalled
  ) {

    return

  }


  mobileWindow
    .__deepSpaceArchiveMobileFetchInstalled =
      true


  const originalFetch =
    window.fetch.bind(
      window
    )


  let flushingOfflinePlayback =
    false


  async function sendArchiveProxy(
    targetPath:
      string,
    method:
      string,
    body:
      string
  ) {

    const proxyQuery =
      new URLSearchParams({
        path:
          targetPath,

        method,

        body,
      })


    return originalFetch(
      `/_dsa/archive-write?${proxyQuery}`,
      {
        method:
          'GET',

        cache:
          'no-store',

        headers: {
          Accept:
            'application/json',
        },
      }
    )

  }


  async function flushOfflinePlaybackQueue() {

    if (
      flushingOfflinePlayback
    ) {

      return

    }


    const queue =
      readOfflinePlaybackQueue()


    if (
      queue.length ===
        0
    ) {

      return

    }


    flushingOfflinePlayback =
      true


    try {

      const batch =
        queue.slice(
          0,
          200
        )


      const response =
        await sendArchiveProxy(
          '/api/archive/offline-sync',
          'POST',
          JSON.stringify({
            events:
              batch,
          })
        )


      if (
        !response.ok
      ) {

        return

      }


      const result =
        await response.json() as
          OfflinePlaybackSyncResult


      const acknowledged =
        new Set([
          ...result.processedEventIds,
          ...result.duplicateEventIds,
        ])


      const currentQueue =
        readOfflinePlaybackQueue()


      writeOfflinePlaybackQueue(
        currentQueue.filter(
          (event) =>
            !acknowledged.has(
              event.eventId
            )
        )
      )


      for (
        const state
        of result.states
      ) {

        writeArchiveSnapshot(
          state
        )

      }


      if (
        readOfflinePlaybackQueue()
          .length >
          0
      ) {

        window.setTimeout(
          () => {

            void flushOfflinePlaybackQueue()

          },
          50
        )

      }

    } catch (error) {

      console.error(
        'Unable to sync offline playback events:',
        error
      )

    } finally {

      flushingOfflinePlayback =
        false

    }

  }


  function queuePlaybackRequestLocally(
    pathname: string,
    body: Record<string, unknown>
  ) {

    const playbackWrite =
      createPlaybackEvent(
        pathname,
        JSON.stringify(
          body
        )
      )


    if (
      !playbackWrite
    ) {

      return null

    }


    /*
     * Persist locally BEFORE doing any network work. This makes pause,
     * navigation, app backgrounding, and true offline playback durable
     * immediately instead of depending on an async fetch finishing.
     */
    enqueueOfflinePlaybackEvent(
      playbackWrite.event,
      playbackWrite.optimisticState
    )


    if (
      mobileNasConnected
    ) {

      window.setTimeout(
        () => {

          void flushOfflinePlaybackQueue()

        },
        0
      )

    }


    return playbackWrite.optimisticState

  }


  mobileWindow.DeepSpaceArchiveOfflinePlayback = {
    saveProgress: (input) =>
      queuePlaybackRequestLocally(
        '/api/archive/progress',
        input
      ),

    restart: (input) =>
      queuePlaybackRequestLocally(
        '/api/archive/restart',
        input
      ),

    flush: () => {

      void flushOfflinePlaybackQueue()

    },

    connected: () =>
      mobileNasConnected,
  }


  window.fetch =
    async (
      input:
        RequestInfo |
        URL,
      init?:
        RequestInit
    ) => {

      const requestUrl =
        new URL(
          getRequestUrl(
            input
          ),
          window.location.href
        )


      const sameOriginApi =
        requestUrl.origin ===
          window.location.origin &&
        requestUrl.pathname.startsWith(
          '/api/'
        )


      if (
        !sameOriginApi
      ) {

        return originalFetch(
          input,
          init
        )

      }


      const method =
        getRequestMethod(
          input,
          init
        )


      /*
       * If an older installed build is still displaying the NAS-hosted
       * page, let that page use its ordinary same-origin fetch behavior.
       * The browser path already saves progress/completions correctly.
       *
       * Native proxying is only needed by the APK-bundled archive whose
       * origin is Capacitor's localhost.
       */
      const bundledArchive =
        isBundledMobileArchive()


      if (
        !bundledArchive
      ) {

        const response =
          await originalFetch(
            input,
            init
          )


        if (
          requestUrl.pathname ===
            '/api/system-info'
        ) {

          publishMobileConnection(
            response.ok
          )

        }


        return response

      }


      if (
        method ===
          'GET'
      ) {

        const response =
          await originalFetch(
            input,
            init
          )


        const offline =
          response.headers.get(
            offlineCacheHeader
          ) ===
            '1'


        if (
          requestUrl.pathname ===
            '/api/system-info'
        ) {

          const connected =
            !offline &&
            response.status !==
              503


          publishMobileConnection(
            connected
          )


          if (
            connected
          ) {

            void flushOfflinePlaybackQueue()

          }

        }


        if (
          requestUrl.pathname.startsWith(
            '/api/archive/'
          )
        ) {

          return overlayArchiveGetResponse(
            requestUrl,
            response
          )

        }


        return response

      }


      if (
        requestUrl.pathname.startsWith(
          '/api/archive/'
        )
      ) {

        const body =
          await requestBodyText(
            input,
            init
          )


        /*
         * Progress/restart writes from the bundled Android app use the
         * idempotent offline-event endpoint even while online. If the NAS
         * disappears between play and pause, the exact same event can be
         * queued and retried later without double-counting watch time or
         * completed plays.
         */
        const playbackWrite =
          createPlaybackEvent(
            requestUrl.pathname,
            body
          )


        if (
          playbackWrite
        ) {

          const response =
            await sendArchiveProxy(
              '/api/archive/offline-sync',
              'POST',
              JSON.stringify({
                events: [
                  playbackWrite.event,
                ],
              })
            )


          const offline =
            response.status ===
              503 ||
            response.headers.get(
              offlineCacheHeader
            ) ===
              '1'


          if (
            offline
          ) {

            enqueueOfflinePlaybackEvent(
              playbackWrite.event,
              playbackWrite.optimisticState
            )


            publishMobileConnection(
              false
            )


            return responseFromArchiveState(
              playbackWrite.optimisticState,
              true
            )

          }


          if (
            !response.ok
          ) {

            return response

          }


          const result =
            await response.json() as
              OfflinePlaybackSyncResult


          const state =
            result.states.find(
              (item) =>
                item.category ===
                  playbackWrite.event.category &&
                item.relativePath ===
                  playbackWrite.event.relativePath
            ) ??
            playbackWrite.optimisticState


          writeArchiveSnapshot(
            state
          )


          publishMobileConnection(
            true
          )


          return responseFromArchiveState(
            state,
            false
          )

        }


        return sendArchiveProxy(
          requestUrl.pathname +
          requestUrl.search,
          method,
          body
        )

      }


      const bridge =
        getMobileBridge()


      if (
        !bridge?.apiRequest
      ) {

        return originalFetch(
          input,
          init
        )

      }


      const headers =
        await requestHeadersObject(
          input,
          init
        )


      const body =
        await requestBodyText(
          input,
          init
        )


      const raw =
        bridge.apiRequest(
          JSON.stringify({
            path:
              requestUrl.pathname +
              requestUrl.search,

            method,

            headers,

            body,
          })
        )


      const result =
        JSON.parse(
          raw
        ) as NativeApiResult


      if (
        result.connected
      ) {

        publishMobileConnection(
          true
        )

      }


      return new Response(
        result.body ??
        '',
        {
          status:
            result.status ||
            503,

          headers: {
            'Content-Type':
              result.contentType ||
              'application/json',
          },
        }
      )

    }


  /*
   * Warm the persistent native GET cache while the NAS is reachable.
   * This makes the core library available after a cold offline launch.
   */
  const warmupEndpoints = [
    '/api/system-info',
    '/api/setup/status',
    '/api/archive/states',
    '/api/archive/stats',
    '/api/playlists',
    '/api/library/memoria',
    '/api/library/secret-times',
    '/api/library/myths',
    '/api/library/bond',
    '/api/library/tender-moments',
    '/api/library/phone-calls',
    '/api/library/phone-videos',
    '/api/library/illusio',
    '/api/library/main-story',
  ]


  window.setTimeout(
    () => {

      void Promise.allSettled(
        warmupEndpoints.map(
          (endpoint) =>
            window.fetch(
              endpoint
            )
        )
      )

    },
    900
  )


  /*
   * Connection state means "can Android reach the NAS right now?"
   * It is intentionally independent of whether a video is streamed
   * from the NAS or served from a downloaded local copy.
   */
  function refreshConnectionStatus() {

    void window.fetch(
      '/api/system-info',
      {
        cache:
          'no-store',
      }
    ).catch(
      () => {

        publishMobileConnection(
          false
        )

      }
    )

  }


  window.setTimeout(
    refreshConnectionStatus,
    250
  )


  window.setInterval(
    refreshConnectionStatus,
    10000
  )

}


initializeMobileRuntime()


function MobileConnectionStatus() {

  const [
    connected,
    setConnected,
  ] =
    useState(
      mobileNasConnected
    )


  const mobile =
    isDeepSpaceMobile()


  useEffect(
    () => {

      if (
        !mobile
      ) {

        return

      }


      function handleConnection(
        event: Event
      ) {

        const detail =
          (
            event as
              CustomEvent<{
                connected:
                  boolean
              }>
          ).detail


        setConnected(
          Boolean(
            detail?.connected
          )
        )

      }


      window.addEventListener(
        mobileConnectionEvent,
        handleConnection
      )


      return () => {

        window.removeEventListener(
          mobileConnectionEvent,
          handleConnection
        )

      }

    },
    [
      mobile,
    ]
  )


  if (
    !mobile
  ) {

    return null

  }


  return (

    <div
      className={
        connected
          ? 'mobile-nas-status connected'
          : 'mobile-nas-status offline'
      }
      role="status"
    >

      <span
        aria-hidden="true"
      />


      {connected
        ? 'Connected'
        : 'Offline Mode'}

    </div>

  )

}


type SetupGateStatus = {
  setupRequired: boolean
}


const setupCompletedEvent =
  'deepspace-archive-setup-completed'


function SetupGate({
  children,
}: {
  children: ReactNode
}) {

  const location =
    useLocation()


  const [checking, setChecking] =
    useState(
      true
    )


  const [setupRequired, setSetupRequired] =
    useState(
      false
    )


  const checkSetup =
    useCallback(
      async () => {

        try {

          const response =
            await fetch(
              '/api/setup/status'
            )


          if (
            !response.ok
          ) {

            throw new Error(
              'Setup status request failed.'
            )

          }


          const data =
            await response.json() as
              SetupGateStatus


          setSetupRequired(
            Boolean(
              data.setupRequired
            )
          )

        } catch (
          error
        ) {

          /*
           * Fail open if the setup-status endpoint itself is
           * temporarily unavailable. Normal pages will surface
           * their own backend/library errors, while an established
           * installation is never accidentally trapped in setup.
           */
          console.error(
            'Unable to check first-run setup status:',
            error
          )


          setSetupRequired(
            false
          )

        } finally {

          setChecking(
            false
          )

        }

      },
      []
    )


  useEffect(
    () => {

      const timeoutId =
        window.setTimeout(
          () => {

            void checkSetup()

          },
          0
        )


      function handleSetupCompleted() {

        /*
         * Completion is already confirmed by the setup API before
         * this event is dispatched. Clear the gate immediately so
         * navigation to the Home page cannot bounce back to /setup.
         */
        setSetupRequired(
          false
        )


        void checkSetup()

      }


      window.addEventListener(
        setupCompletedEvent,
        handleSetupCompleted
      )


      return () => {

        window.clearTimeout(
          timeoutId
        )


        window.removeEventListener(
          setupCompletedEvent,
          handleSetupCompleted
        )

      }

    },
    [
      checkSetup,
    ]
  )


  if (
    checking &&
    location.pathname !==
      '/setup'
  ) {

    return (

      <main className="setup-page">

        <section className="setup-shell setup-loading">
          Checking installation…
        </section>

      </main>

    )

  }


  if (
    setupRequired &&
    location.pathname !==
      '/setup'
  ) {

    return (

      <Navigate
        to="/setup"
        replace
      />

    )

  }


  return children

}


function App() {

  const ArchiveRouter =
    isDeepSpaceMobile()
      ? HashRouter
      : BrowserRouter


  return (

    <ArchiveRouter>

      <MobileConnectionStatus />


      <SetupGate>

        <Routes>

        <Route
          path="/setup"
          element={
            <SetupPage />
          }
        />


        <Route
          path="/"
          element={
            <HomePage />
          }
        />


        <Route
          path="/favorites"
          element={
            <FavoritesPage />
          }
        />


        <Route
          path="/continue-watching"
          element={
            <ContinueWatchingPage />
          }
        />


        <Route
          path="/history"
          element={
            <HistoryPage />
          }
        />


        <Route
          path="/stats"
          element={
            <StatsPage />
          }
        />


        <Route
          path="/playlists"
          element={
            <PlaylistsPage />
          }
        />


        <Route
          path="/playlists/:playlistId"
          element={
            <PlaylistDetailPage />
          }
        />
<Route
  path="/phone"
  element={
    <PhonePage />
  }
/>


<Route
  path="/phone/calls"
  element={
    <PhoneCallsPage />
  }
/>


<Route
  path="/phone/videos"
  element={
    <PhoneVideosPage />
  }
/>


<Route
  path="/phone/watch"
  element={
    <PhonePlayerPage />
  }
/>
<Route
  path="/illusio"
  element={
    <IllusioPage />
  }
/>


<Route
  path="/illusio/watch"
  element={
    <IllusioPlayerPage />
  }
/>
<Route
  path="/main-story"
  element={
    <MainStoryPage />
  }
/>


<Route
  path="/main-story/chapter"
  element={
    <MainStoryChapterPage />
  }
/>


<Route
  path="/main-story/watch"
  element={
    <MainStoryPlayerPage />
  }
/>
<Route
  path="/settings"
  element={
    <SettingsPage />
  }
/>

<Route
  path="/settings/library"
  element={
    <LibraryStatusPage />
  }
/>

<Route
  path="/settings/metadata"
  element={
    <MetadataHealthPage />
  }
/>

<Route
  path="/settings/thumbnails"
  element={
    <ThumbnailCachePage />
  }
/>

<Route
  path="/settings/database"
  element={
    <DatabaseMaintenancePage />
  }
/>
<Route
  path="/settings/about"
  element={
    <AboutPage />
  }
/>

<Route
  path="/settings/catalog"
  element={
    <MetadataCatalogPage />
  }
/>

        <Route
          path="/backup"
          element={
            <BackupPage />
          }
        />


        <Route
          path="/gallery"
          element={
            <GalleryPage />
          }
        />


        <Route
          path="/settings/gallery-wiki"
          element={
            <GalleryWikiSettingsPage />
          }
        />


        <Route
          path="/settings/file-locations"
          element={
            <FileLocationsPage />
          }
        />


        <Route
          path="/memoria"
          element={
            <MemoriaPage />
          }
        />


        <Route
          path="/memoria/watch"
          element={
            <MemoryPlayerPage />
          }
        />


        <Route
          path="/secret-times"
          element={
            <SecretTimesPage />
          }
        />


        <Route
          path="/secret-times/watch"
          element={
            <SecretTimesPlayerPage />
          }
        />


        <Route
          path="/myths"
          element={
            <MythsPage />
          }
        />


        <Route
          path="/myths/watch"
          element={
            <MythsPlayerPage />
          }
        />


        <Route
          path="/bond"
          element={
            <BondPage />
          }
        />


        <Route
          path="/bond/watch"
          element={
            <BondPlayerPage />
          }
        />


        <Route
          path="/tender-moments"
          element={
            <TenderMomentsPage />
          }
        />


        <Route
          path="/tender-moments/watch"
          element={
            <TenderMomentsPlayerPage />
          }
        />

        </Routes>

      </SetupGate>

    </ArchiveRouter>

  )

}


export default App