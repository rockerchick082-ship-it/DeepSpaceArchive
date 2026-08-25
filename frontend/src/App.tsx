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