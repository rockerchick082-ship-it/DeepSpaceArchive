import {
  BrowserRouter,
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

const mobileOfflineCachePrefix =
  'deepspace-archive-mobile-cache:'

const mobileConnectionEvent =
  'deepspace-archive-connection'

const offlineCacheHeader =
  'X-DeepSpace-Archive-Offline-Cache'


type MobileOfflineBridge = {
  cacheApiResponse?: (
    key: string,
    payload: string
  ) => void

  getCachedApiResponse?: (
    key: string
  ) => string
}


function getMobileOfflineBridge() {

  return (
    window as typeof window & {
      DeepSpaceArchiveMobile?:
        MobileOfflineBridge
    }
  ).DeepSpaceArchiveMobile

}


type MobileCachedResponse = {
  body: string
  contentType: string
  savedAt: number
}


let mobileNasConnected =
  true


function isDeepSpaceMobile() {

  if (
    typeof window ===
      'undefined'
  ) {

    return false

  }


  const query =
    new URLSearchParams(
      window.location.search
    )


  const queryMobile =
    query.get(
      'dsaMobile'
    ) ===
      '1'


  const storedMobile =
    window.localStorage.getItem(
      mobileMarkerKey
    ) ===
      'true'


  if (
    queryMobile
  ) {

    window.localStorage.setItem(
      mobileMarkerKey,
      'true'
    )

  }


  return (
    queryMobile ||
    storedMobile
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


function mobileCacheKey(
  url: URL
) {

  return (
    mobileOfflineCachePrefix +
    encodeURIComponent(
      url.pathname +
      url.search
    )
  )

}


function readMobileCache(
  url: URL
) {

  const key =
    url.pathname +
    url.search


  try {

    const nativeValue =
      getMobileOfflineBridge()
        ?.getCachedApiResponse?.(
          key
        )


    if (
      nativeValue
    ) {

      return JSON.parse(
        nativeValue
      ) as MobileCachedResponse

    }

  } catch (error) {

    console.error(
      'Unable to read native mobile API cache:',
      error
    )

  }


  try {

    const stored =
      window.localStorage.getItem(
        mobileCacheKey(
          url
        )
      )


    if (
      !stored
    ) {

      return null

    }


    return JSON.parse(
      stored
    ) as MobileCachedResponse

  } catch (error) {

    console.error(
      'Unable to read mobile API cache:',
      error
    )


    return null

  }

}


function writeMobileCache(
  url: URL,
  value: MobileCachedResponse
) {

  const serialized =
    JSON.stringify(
      value
    )


  const key =
    url.pathname +
    url.search


  try {

    getMobileOfflineBridge()
      ?.cacheApiResponse?.(
        key,
        serialized
      )

  } catch (error) {

    console.error(
      'Unable to update native mobile API cache:',
      error
    )

  }


  try {

    window.localStorage.setItem(
      mobileCacheKey(
        url
      ),
      serialized
    )

  } catch (error) {

    console.error(
      'Unable to update browser mobile API cache:',
      error
    )

  }

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


  const query =
    new URLSearchParams(
      window.location.search
    )


  mobileNasConnected =
    query.get(
      'dsaOffline'
    ) !==
      '1'


  document.documentElement.dataset
    .nasConnected =
      mobileNasConnected
        ? 'true'
        : 'false'


  const mobileWindow =
    window as typeof window & {
      __deepSpaceArchiveMobileFetchInstalled?:
        boolean
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


      const method =
        getRequestMethod(
          input,
          init
        )


      const sameOrigin =
        requestUrl.origin ===
        window.location.origin


      const cacheableApiRequest =
        sameOrigin &&
        method ===
          'GET' &&
        requestUrl.pathname.startsWith(
          '/api/'
        )


      if (
        !cacheableApiRequest
      ) {

        return originalFetch(
          input,
          init
        )

      }


      try {

        const networkResponse =
          await originalFetch(
            input,
            init
          )


        const contentType =
          networkResponse.headers.get(
            'content-type'
          ) ??
          ''


        const usableJsonResponse =
          networkResponse.ok &&
          contentType.includes(
            'application/json'
          )


        if (
          usableJsonResponse
        ) {

          const body =
            await networkResponse
              .clone()
              .text()


          writeMobileCache(
            requestUrl,
            {
              body,
              contentType,
              savedAt:
                Date.now(),
            }
          )


          publishMobileConnection(
            true
          )


          return networkResponse

        }


        const cached =
          readMobileCache(
            requestUrl
          )


        if (
          cached
        ) {

          publishMobileConnection(
            false
          )


          return new Response(
            cached.body,
            {
              status:
                200,

              headers: {
                'Content-Type':
                  cached.contentType ||
                  'application/json',

                [offlineCacheHeader]:
                  '1',
              },
            }
          )

        }


        publishMobileConnection(
          networkResponse.ok
        )


        return networkResponse

      } catch (networkError) {

        const cached =
          readMobileCache(
            requestUrl
          )


        if (
          cached
        ) {

          publishMobileConnection(
            false
          )


          return new Response(
            cached.body,
            {
              status:
                200,

              headers: {
                'Content-Type':
                  cached.contentType ||
                  'application/json',

                [offlineCacheHeader]:
                  '1',
              },
            }
          )

        }


        publishMobileConnection(
          false
        )


        throw networkError

      }

    }

  /*
   * Warm the core mobile cache while the NAS is reachable so the
   * primary archive pages can still render even if the user has
   * not opened each one during this app session.
   */
  const warmupEndpoints = [
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
        ? 'NAS Connected'
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

  return (

    <BrowserRouter>

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

    </BrowserRouter>

  )

}


export default App