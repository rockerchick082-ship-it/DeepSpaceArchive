import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  Link,
} from 'react-router-dom'


type PersonalDataCounts = {
  archiveState: number
  favorites: number
  rated: number
  completed: number
  playlists: number
  playlistItems: number
  rankingVotes: number
  mediaTags: number
  mediaTagAssignments: number
  smartPlaylists: number
}


type DatabaseStatusResponse = {
  records: PersonalDataCounts
}


type PersonalDataResetResult = {
  success: boolean
  deleted: {
    archiveState: number
    favorites: number
    rated: number
    playlists: number
    playlistItems: number
    rankingVotes: number
    mediaTags: number
    mediaTagAssignments: number
    smartPlaylists: number
  }
  preserved: {
    catalog: boolean
    catalogFileMatches: boolean
    archiveOfflineEventLedger: boolean
  }
  safetyBackup: string
  completedAt: string
}


const archiveSnapshotPrefix =
  'deepspaceArchiveArchiveState:v1:'

const offlinePlaybackQueueKey =
  'deepspaceArchiveOfflinePlaybackQueue:v1'

const offlineMutationQueueKey =
  'deepspaceArchiveOfflineMutationQueue:v1'

const mobileProgressStoragePrefix =
  'deepspace-archive-mobile-progress:'


function clearCurrentDevicePersonalCache() {

  try {

    const keys =
      Array.from(
        {
          length:
            window.localStorage.length,
        },
        (_, index) =>
          window.localStorage.key(
            index
          )
      )
        .filter(
          (key): key is string =>
            Boolean(
              key
            )
        )


    for (
      const key
      of keys
    ) {

      if (
        key ===
          offlinePlaybackQueueKey ||
        key ===
          offlineMutationQueueKey ||
        key.startsWith(
          archiveSnapshotPrefix
        ) ||
        key.startsWith(
          mobileProgressStoragePrefix
        )
      ) {

        window.localStorage.removeItem(
          key
        )

      }

    }

  } catch {
    // Browser storage cleanup is best-effort only.
  }

}


async function readError(
  response: Response,
  fallback: string
) {

  const body =
    await response.json()
      .catch(
        () => null
      ) as {
        error?: string
      } | null



  return (
    body?.error ??
    fallback
  )

}


function PersonalDataPage() {

  const [
    counts,
    setCounts,
  ] =
    useState<PersonalDataCounts | null>(
      null
    )


  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    )


  const [
    clearing,
    setClearing,
  ] =
    useState(
      false
    )


  const [
    importing,
    setImporting,
  ] =
    useState(false)


  const [
    error,
    setError,
  ] =
    useState(
      ''
    )

  const [
    message,
    setMessage,
  ] = useState('')


  const [
    result,
    setResult,
  ] =
    useState<PersonalDataResetResult | null>(
      null
    )


  const loadCounts =
    useCallback(
      async () => {

        try {

          setLoading(
            true
          )


          const response =
            await fetch(
              '/api/database-maintenance/status'
            )


          if (
            !response.ok
          ) {

            throw new Error(
              await readError(
                response,
                'Unable to load personal data counts.'
              )
            )

          }


          const data =
            await response.json() as
              DatabaseStatusResponse


          setCounts(
            data.records
          )


          setError(
            ''
          )

        } catch (loadError) {

          console.error(
            loadError
          )


          setError(
            loadError instanceof
              Error
              ? loadError.message
              : 'Unable to load personal data counts.'
          )

        } finally {

          setLoading(
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

            void loadCounts()

          },
          0
        )


      return () => {

        window.clearTimeout(
          timeoutId
        )

      }

    },
    [
      loadCounts,
    ]
  )


  async function clearPersonalData() {

    const confirmed =
      window.confirm(
        'Clear all personal archive data?\n\nThis deletes favorites, ratings, watch history, resume progress, completion/play counts, playlists, smart playlists, tags, tag assignments, and ranking votes. Catalog records and file-match links are preserved. A safety snapshot is created first.'
      )


    if (
      !confirmed
    ) {

      return

    }


    try {

      setClearing(
        true
      )


      setError(
        ''
      )
      setMessage('')


      setResult(
        null
      )


      const response =
        await fetch(
          '/api/database-maintenance/personal-data/reset',
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                confirmation:
                  'CLEAR PERSONAL DATA',
              }),
          }
        )


      if (
        !response.ok
      ) {

        throw new Error(
          await readError(
            response,
            'Unable to clear personal archive data.'
          )
        )

      }


      const resetResult =
        await response.json() as
          PersonalDataResetResult


      clearCurrentDevicePersonalCache()


      setResult(
        resetResult
      )


      await loadCounts()

    } catch (clearError) {

      console.error(
        clearError
      )


      setError(
        clearError instanceof
          Error
          ? clearError.message
          : 'Unable to clear personal archive data.'
      )

    } finally {

      setClearing(
        false
      )

    }

  }

  function exportPersonalData(format: 'json' | 'csv') {
    const anchor = document.createElement('a')
    anchor.href = `/api/database-maintenance/personal-data/export?format=${format}`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  }


  async function importPersonalData(file: File | null) {
    if (!file) return

    try {
      setImporting(true)
      setError('')
      setMessage('')
      setResult(null)

      const parsed = JSON.parse(await file.text()) as unknown
      const response = await fetch('/api/database-maintenance/personal-data/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      })

      if (!response.ok) {
        throw new Error(await readError(response, 'Unable to import personal data.'))
      }

      clearCurrentDevicePersonalCache()
      setMessage('Personal data import merged successfully. Refresh archive pages to see restored state.')
      await loadCounts()
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Unable to import personal data.')
    } finally {
      setImporting(false)
    }
  }


  return (
    <main className="archive-page">

      <header className="archive-page-header">

        <Link
          to="/settings"
          className="back-button"
        >
          ‹
        </Link>


        <div>

          <span className="archive-eyebrow">
            SETTINGS
          </span>


          <h1>
            Personal Data
          </h1>

        </div>

      </header>


      <section className="personal-data-settings">

        <div className="personal-data-intro">

          <span className="archive-eyebrow">
            PERSONAL ARCHIVE STATE
          </span>


          <h2>
            Clear viewing and preference data
          </h2>


          <p>
            Reset your personal use of the archive without rebuilding the metadata catalog or losing catalog-to-file matches.
          </p>

        </div>


        {error && (

          <div className="settings-status-message settings-status-error">
            {error}
          </div>

        )}


        {message && (

          <div className="settings-status-message settings-status-success">
            {message}
          </div>

        )}


        {result && (

          <div className="settings-status-message settings-status-success">
            Personal data cleared. Safety snapshot: {result.safetyBackup}
          </div>

        )}


        <div className="personal-data-summary-grid">

          <div>
            <strong>
              {loading
                ? '—'
                : counts?.favorites ?? 0}
            </strong>
            <span>Favorites</span>
          </div>


          <div>
            <strong>
              {loading
                ? '—'
                : counts?.rated ?? 0}
            </strong>
            <span>Ratings</span>
          </div>


          <div>
            <strong>
              {loading
                ? '—'
                : counts?.archiveState ?? 0}
            </strong>
            <span>History / State Records</span>
          </div>


          <div>
            <strong>
              {loading
                ? '—'
                : counts?.playlists ?? 0}
            </strong>
            <span>Playlists</span>
          </div>


          <div>
            <strong>
              {loading
                ? '—'
                : counts?.rankingVotes ?? 0}
            </strong>
            <span>Ranking Votes</span>
          </div>


          <div>
            <strong>
              {loading
                ? '—'
                : counts?.smartPlaylists ?? 0}
            </strong>
            <span>Smart Playlists</span>
          </div>


          <div>
            <strong>
              {loading
                ? '—'
                : counts?.mediaTags ?? 0}
            </strong>
            <span>Tags</span>
          </div>


          <div>
            <strong>
              {loading
                ? '—'
                : counts?.mediaTagAssignments ?? 0}
            </strong>
            <span>Tag Assignments</span>
          </div>

        </div>


        <section className="personal-data-reset-card">
          <div>
            <h3>Export / Import Personal Data</h3>
            <p>
              Export watch state, favorites, ratings, playlists, rankings, tags, and smart playlists without catalog metadata or media files. JSON exports can be merged back into this or another archive.
            </p>
          </div>

          <div className="personal-data-actions">
            <button type="button" onClick={() => exportPersonalData('json')}>Export JSON</button>
            <button type="button" onClick={() => exportPersonalData('csv')}>Export CSV</button>
            <label className="backup-v2-file-picker">
              <input
                type="file"
                accept="application/json,.json"
                disabled={importing}
                onChange={(event) => {
                  void importPersonalData(event.target.files?.[0] ?? null)
                  event.currentTarget.value = ''
                }}
              />
              <span>{importing ? 'Importing…' : 'Import JSON'}</span>
            </label>
          </div>
        </section>


        <section className="personal-data-reset-card">

          <div>

            <h3>
              Clear Personal Data
            </h3>


            <p>
              Deletes favorites, ratings, watch history, resume progress, completed/play counts, total watch time, playlists, playlist items, smart playlists, tags, tag assignments, and saved ranking votes.
            </p>


            <p className="personal-data-preserved">
              Preserved: metadata catalog, wiki-synced records, catalog file links/matches, Memory relationships, source media files, artwork, settings, and safety backups.
            </p>


            <p className="personal-data-note">
              A database safety snapshot is created automatically before deletion. Offline event IDs are retained so already-processed mobile playback events are not replayed. This browser's cached archive progress and offline queue are cleared too.
            </p>

          </div>


          <button
            type="button"
            className="personal-data-danger-button"
            onClick={() =>
              void clearPersonalData()
            }
            disabled={
              clearing ||
              loading
            }
          >
            {clearing
              ? 'Clearing...'
              : 'Clear Personal Data'}
          </button>

        </section>

      </section>

    </main>
  )

}


export default PersonalDataPage
