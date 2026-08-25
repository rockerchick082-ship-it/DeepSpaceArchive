import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  Link,
} from 'react-router-dom'


type SafetyBackup = {
  fileName: string
  size: number
  createdAt: string
}


type OrphanedState = {
  category: string
  relativePath: string
}


type DatabaseStatus = {

  database: {
    path: string
    size: number
    modifiedAt: string
  }

  sqlite: {
    version: string
    journalMode: string
    pageSize: number
    pageCount: number
    freePages: number
    estimatedFreeBytes: number
    userVersion: number
  }

  records: {
    archiveState: number
    favorites: number
    rated: number
    completed: number
    playlists: number
    playlistItems: number
  }

  libraryConnected:
    boolean

  libraryScanWarnings:
    string[]

  orphanedStateRecords:
    OrphanedState[]

  orphanedStateCount:
    number

  safetyBackups:
    SafetyBackup[]

  safetyBackupCount:
    number

  scannedAt:
    string

}


type IntegrityResult = {

  healthy:
    boolean

  messages:
    string[]

  checkedAt:
    string

}


type OptimizeResult = {

  success:
    boolean

  beforeSize:
    number

  afterSize:
    number

  bytesSaved:
    number

  safetyBackup:
    string

  completedAt:
    string

}


type SnapshotResult = {
  success: boolean
  fileName: string
  size: number
  createdAt: string
}


function formatBytes(
  bytes:
    number
) {

  if (
    bytes <=
    0
  ) {

    return '0 B'

  }


  const units = [
    'B',
    'KB',
    'MB',
    'GB',
    'TB',
  ]


  const index =
    Math.min(
      Math.floor(
        Math.log(
          bytes
        ) /
        Math.log(
          1024
        )
      ),
      units.length -
      1
    )


  const value =
    bytes /
    Math.pow(
      1024,
      index
    )


  return (
    `${value.toFixed(
      index ===
        0
        ? 0
        : 2
    )} ${units[index]}`
  )

}


async function readResponseError(
  response:
    Response,
  fallback:
    string
) {

  const data =
    await response.json()
      .catch(
        () => null
      ) as
        {
          error?: string
        } |
        null


  return (
    data?.error ??
    fallback
  )

}


async function fetchDatabaseStatus() {

  const response =
    await fetch(
      '/api/database-maintenance/status'
    )


  if (
    !response.ok
  ) {

    throw new Error(
      await readResponseError(
        response,
        'Unable to load database status.'
      )
    )

  }


  return (
    await response.json()
  ) as DatabaseStatus

}


function DatabaseMaintenancePage() {

  const [
    status,
    setStatus,
  ] =
    useState<DatabaseStatus | null>(
      null
    )


  const [
    integrity,
    setIntegrity,
  ] =
    useState<IntegrityResult | null>(
      null
    )


  const [
    optimizeResult,
    setOptimizeResult,
  ] =
    useState<OptimizeResult | null>(
      null
    )


  const [
    snapshotResult,
    setSnapshotResult,
  ] =
    useState<SnapshotResult | null>(
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
    refreshing,
    setRefreshing,
  ] =
    useState(
      false
    )


  const [
    checking,
    setChecking,
  ] =
    useState(
      false
    )


  const [
    snapshotting,
    setSnapshotting,
  ] =
    useState(
      false
    )


  const [
    optimizing,
    setOptimizing,
  ] =
    useState(
      false
    )


  const [
    error,
    setError,
  ] =
    useState(
      ''
    )


  const loadStatus =
    useCallback(
      async (
        refresh =
          false
      ) => {

        try {

          if (
            refresh
          ) {

            setRefreshing(
              true
            )

          } else {

            setLoading(
              true
            )

          }


          const data =
            await fetchDatabaseStatus()


          setStatus(
            data
          )


          setError(
            ''
          )

        } catch (
          loadError
        ) {

          console.error(
            loadError
          )


          setError(
            loadError instanceof
              Error
              ? loadError.message
              : 'Database maintenance information could not be loaded.'
          )

        } finally {

          setLoading(
            false
          )


          setRefreshing(
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

            void loadStatus()

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
      loadStatus,
    ]
  )


  async function runIntegrityCheck() {

    try {

      setChecking(
        true
      )


      setError(
        ''
      )


      const response =
        await fetch(
          '/api/database-maintenance/integrity'
        )


      if (
        !response.ok
      ) {

        throw new Error(
          await readResponseError(
            response,
            'Unable to check database.'
          )
        )

      }


      setIntegrity(
        await response.json() as
          IntegrityResult
      )

    } catch (
      checkError
    ) {

      setError(
        checkError instanceof
          Error
          ? checkError.message
          : 'Unable to check database.'
      )

    } finally {

      setChecking(
        false
      )

    }

  }


  async function createSnapshot() {

    try {

      setSnapshotting(
        true
      )


      setError(
        ''
      )


      setSnapshotResult(
        null
      )


      const response =
        await fetch(
          '/api/database-maintenance/snapshot',
          {
            method:
              'POST',
          }
        )


      if (
        !response.ok
      ) {

        throw new Error(
          await readResponseError(
            response,
            'Unable to create safety snapshot.'
          )
        )

      }


      const data =
        await response.json() as
          SnapshotResult


      setSnapshotResult(
        data
      )


      await loadStatus(
        true
      )

    } catch (
      snapshotError
    ) {

      setError(
        snapshotError instanceof
          Error
          ? snapshotError.message
          : 'Unable to create safety snapshot.'
      )

    } finally {

      setSnapshotting(
        false
      )

    }

  }


  async function optimizeDatabase() {

    const confirmed =
      window.confirm(
        'Optimize the DeepSpace Archive database?\n\n' +
        'A safety snapshot will be created automatically first. ' +
        'This operation runs SQLite optimization and compaction. ' +
        'It does not delete archive records.'
      )


    if (
      !confirmed
    ) {

      return

    }


    try {

      setOptimizing(
        true
      )


      setError(
        ''
      )


      setOptimizeResult(
        null
      )


      const response =
        await fetch(
          '/api/database-maintenance/optimize',
          {
            method:
              'POST',
          }
        )


      if (
        !response.ok
      ) {

        throw new Error(
          await readResponseError(
            response,
            'Unable to optimize database.'
          )
        )

      }


      setOptimizeResult(
        await response.json() as
          OptimizeResult
      )


      await loadStatus(
        true
      )

    } catch (
      optimizeError
    ) {

      setError(
        optimizeError instanceof
          Error
          ? optimizeError.message
          : 'Unable to optimize database.'
      )

    } finally {

      setOptimizing(
        false
      )

    }

  }


  function downloadSnapshot(
    backup:
      SafetyBackup
  ) {

    const encoded =
      encodeURIComponent(
        backup.fileName
      )


    window.location.assign(
      `/api/database-maintenance/snapshots/${encoded}/download`
    )

  }


  if (
    loading
  ) {

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
              Database Maintenance
            </h1>

          </div>

        </header>


        <section className="archive-feedback-panel">
          Inspecting database...
        </section>

      </main>

    )

  }


  if (
    error &&
    !status
  ) {

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
              Database Maintenance
            </h1>

          </div>

        </header>


        <section className="archive-feedback-panel">

          <span className="archive-feedback-kicker">
            UNAVAILABLE
          </span>


          <h2>
            Database maintenance could not be loaded.
          </h2>


          <p>
            {error}
          </p>


          <button
            type="button"
            className="archive-feedback-button"
            onClick={() =>
              void loadStatus()
            }
          >
            Retry
          </button>

        </section>

      </main>

    )

  }


  if (
    !status
  ) {

    return null

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
            Database Maintenance
          </h1>

        </div>

      </header>


      <section className="database-maintenance-content database-maintenance-consistency">

        <section className="database-maintenance-overview">

          <div>

            <span className="archive-eyebrow">
              SQLITE
            </span>


            <h2>
              Application State Database
            </h2>


            <p>
              This database stores watch state,
              favorites, ratings, and playlists.
              Maintenance actions here never delete
              your source media files.
            </p>

          </div>


          <button
            type="button"
            className="library-rescan-button"
            disabled={
              refreshing ||
              checking ||
              snapshotting ||
              optimizing
            }
            onClick={() =>
              void loadStatus(
                true
              )
            }
          >
            {refreshing
              ? 'Refreshing...'
              : 'Refresh'}
          </button>

        </section>


        {error && (

          <div className="settings-status-message settings-status-error database-maintenance-error">
            {error}
          </div>

        )}


        {status.libraryScanWarnings.length >
          0 && (

          <div className="archive-state-warning">

            <span>

              Orphan detection could not verify:
              {' '}

              {status.libraryScanWarnings.join(
                ', '
              )}

              . Those categories were excluded from
              orphan results rather than being
              incorrectly marked missing.

            </span>


            <button
              type="button"
              onClick={() =>
                void loadStatus(
                  true
                )
              }
            >
              Retry
            </button>

          </div>

        )}


        <section className="database-summary-grid database-summary-grid-consistency">

          <div className="database-summary-card">

            <span>
              DATABASE SIZE
            </span>


            <strong>
              {formatBytes(
                status.database.size
              )}
            </strong>


            <small>
              Main application database
            </small>

          </div>


          <div className="database-summary-card">

            <span>
              STATE RECORDS
            </span>


            <strong>
              {status.records.archiveState}
            </strong>


            <small>
              Saved archive activity
            </small>

          </div>


          <div className="database-summary-card">

            <span>
              ORPHANED STATE
            </span>


            <strong>
              {status.libraryConnected
                ? status.orphanedStateCount
                : '—'}
            </strong>


            <small>
              Across supported playable categories
            </small>

          </div>


          <div className="database-summary-card">

            <span>
              SAFETY SNAPSHOTS
            </span>


            <strong>
              {status.safetyBackupCount}
            </strong>


            <small>
              Local SQLite snapshots
            </small>

          </div>

        </section>


        <div className="database-maintenance-grid">

          <section className="library-health-panel">

            <div className="library-health-panel-header">

              <div>

                <span className="archive-eyebrow">
                  DATABASE
                </span>


                <h2>
                  SQLite Details
                </h2>

              </div>

            </div>


            <div className="database-detail-grid">

              <div>

                <span>
                  SQLite Version
                </span>


                <strong>
                  {status.sqlite.version}
                </strong>

              </div>


              <div>

                <span>
                  Journal Mode
                </span>


                <strong>
                  {status.sqlite.journalMode}
                </strong>

              </div>


              <div>

                <span>
                  Page Size
                </span>


                <strong>
                  {formatBytes(
                    status.sqlite.pageSize
                  )}
                </strong>

              </div>


              <div>

                <span>
                  Pages
                </span>


                <strong>
                  {status.sqlite.pageCount}
                </strong>

              </div>


              <div>

                <span>
                  Free Pages
                </span>


                <strong>
                  {status.sqlite.freePages}
                </strong>

              </div>


              <div>

                <span>
                  Est. Free Space
                </span>


                <strong>
                  {formatBytes(
                    status.sqlite.estimatedFreeBytes
                  )}
                </strong>

              </div>

            </div>


            <div className="database-path-box">

              <span>
                DATABASE PATH
              </span>


              <strong>
                {status.database.path}
              </strong>

            </div>

          </section>


          <section className="library-health-panel">

            <div className="library-health-panel-header">

              <div>

                <span className="archive-eyebrow">
                  RECORDS
                </span>


                <h2>
                  Stored Application State
                </h2>

              </div>

            </div>


            <div className="database-record-grid">

              <div>
                <span>
                  Archive State
                </span>
                <strong>
                  {status.records.archiveState}
                </strong>
              </div>


              <div>
                <span>
                  Favorites
                </span>
                <strong>
                  {status.records.favorites}
                </strong>
              </div>


              <div>
                <span>
                  Rated Items
                </span>
                <strong>
                  {status.records.rated}
                </strong>
              </div>


              <div>
                <span>
                  Completed Items
                </span>
                <strong>
                  {status.records.completed}
                </strong>
              </div>


              <div>
                <span>
                  Playlists
                </span>
                <strong>
                  {status.records.playlists}
                </strong>
              </div>


              <div>
                <span>
                  Playlist Items
                </span>
                <strong>
                  {status.records.playlistItems}
                </strong>
              </div>

            </div>

          </section>

        </div>


        <section className="library-health-panel">

          <div className="library-health-panel-header">

            <div>

              <span className="archive-eyebrow">
                INTEGRITY
              </span>


              <h2>
                Database Health
              </h2>

            </div>


            <button
              type="button"
              className="library-rescan-button"
              onClick={() =>
                void runIntegrityCheck()
              }
              disabled={
                checking ||
                optimizing
              }
            >
              {checking
                ? 'Checking...'
                : 'Run Integrity Check'}
            </button>

          </div>


          {!integrity ? (

            <p className="database-description">
              Runs SQLite's built-in
              <code> PRAGMA integrity_check </code>
              without changing the database.
            </p>

          ) : (

            <div
              className={
                integrity.healthy
                  ? 'database-health-result healthy'
                  : 'database-health-result problem'
              }
            >

              <strong>

                {integrity.healthy
                  ? '✓ Database is healthy'
                  : '⚠ Database problems detected'}

              </strong>


              <span className="database-check-time">
                Checked{' '}
                {new Date(
                  integrity.checkedAt
                ).toLocaleString()}
              </span>


              {!integrity.healthy && (

                <ul>

                  {integrity.messages.map(
                    (
                      integrityMessage,
                      index
                    ) => (

                      <li
                        key={
                          `${integrityMessage}:${index}`
                        }
                      >
                        {integrityMessage}
                      </li>

                    )
                  )}

                </ul>

              )}

            </div>

          )}

        </section>


        <section className="library-health-panel">

          <div className="library-health-panel-header">

            <div>

              <span className="archive-eyebrow">
                LIBRARY MATCHING
              </span>


              <h2>
                Orphaned State
              </h2>

            </div>


            <span
              className={
                !status.libraryConnected
                  ? 'library-health-badge problem'
                  : status.orphanedStateCount ===
                      0
                    ? 'library-health-badge healthy'
                    : 'library-health-badge problem'
              }
            >

              {!status.libraryConnected
                ? 'Unavailable'
                : `${status.orphanedStateCount} ${
                    status.orphanedStateCount ===
                    1
                      ? 'record'
                      : 'records'
                  }`}

            </span>

          </div>


          {!status.libraryConnected ? (

            <>

              <p className="database-description">
                The media library could not be reached,
                so orphan detection is unavailable.
                No state has been changed.
              </p>


              <Link
                to="/settings/file-locations"
                className="database-inline-link"
              >
                Check File Locations
              </Link>

            </>

          ) : status.orphanedStateCount ===
            0 ? (

            <div className="database-health-result healthy">

              <strong>
                ✓ Saved state matches the currently scanned library
              </strong>

            </div>

          ) : (

            <>

              <p className="database-description">
                These records point to media that
                cannot currently be found. They are
                informational only—nothing is deleted
                automatically.
              </p>


              <div className="database-orphan-list">

                {status.orphanedStateRecords.map(
                  (
                    record,
                    index
                  ) => (

                    <div
                      key={
                        `${record.category}:${record.relativePath}:${index}`
                      }
                    >

                      <span>
                        {record.category}
                      </span>


                      <strong>
                        {record.relativePath}
                      </strong>

                    </div>

                  )
                )}

              </div>

            </>

          )}

        </section>


        <section className="library-health-panel">

          <div className="library-health-panel-header">

            <div>

              <span className="archive-eyebrow">
                SAFETY
              </span>


              <h2>
                Database Snapshots
              </h2>

            </div>


            <button
              type="button"
              className="library-rescan-button"
              disabled={
                snapshotting ||
                optimizing
              }
              onClick={() =>
                void createSnapshot()
              }
            >
              {snapshotting
                ? 'Creating...'
                : 'Create Snapshot'}
            </button>

          </div>


          <p className="database-description">
            Snapshots are standalone SQLite copies of
            the application state database. Download
            them for safekeeping. Application-wide
            restore is handled separately in Backup &
            Restore.
          </p>


          {snapshotResult && (

            <div className="database-snapshot-result">

              <strong>
                ✓ Snapshot created
              </strong>


              <span>
                {snapshotResult.fileName}
                {' · '}
                {formatBytes(
                  snapshotResult.size
                )}
              </span>

            </div>

          )}


          {status.safetyBackups.length ===
            0 ? (

            <div className="database-empty-state">
              No database safety snapshots have been
              created yet.
            </div>

          ) : (

            <div className="database-backup-list database-backup-list-consistency">

              {status.safetyBackups.map(
                (
                  backup
                ) => (

                  <div
                    key={
                      backup.fileName
                    }
                  >

                    <div>

                      <strong>
                        {backup.fileName}
                      </strong>


                      <span>
                        {new Date(
                          backup.createdAt
                        ).toLocaleString()}
                        {' · '}
                        {formatBytes(
                          backup.size
                        )}
                      </span>

                    </div>


                    <button
                      type="button"
                      className="database-download-button"
                      onClick={() =>
                        downloadSnapshot(
                          backup
                        )
                      }
                    >
                      Download
                    </button>

                  </div>

                )
              )}

            </div>

          )}

        </section>


        <section className="library-health-panel database-optimize-panel">

          <div className="library-health-panel-header">

            <div>

              <span className="archive-eyebrow">
                OPTIMIZATION
              </span>


              <h2>
                Optimize Database
              </h2>

            </div>

          </div>


          <p className="database-description">
            Runs SQLite optimization and VACUUM to
            refresh query statistics and compact
            reclaimable space. A safety snapshot is
            created automatically before any
            optimization begins.
          </p>


          <div className="database-optimize-estimate">

            <span>
              ESTIMATED RECLAIMABLE SPACE
            </span>


            <strong>
              {formatBytes(
                status.sqlite.estimatedFreeBytes
              )}
            </strong>

          </div>


          <button
            type="button"
            className="backup-primary-button"
            disabled={
              optimizing ||
              checking ||
              snapshotting
            }
            onClick={() =>
              void optimizeDatabase()
            }
          >
            {optimizing
              ? 'Optimizing...'
              : 'Optimize Database'}
          </button>


          {optimizeResult && (

            <div className="database-optimize-result">

              <strong>
                ✓ Optimization Complete
              </strong>


              <span>
                Before:{' '}
                {formatBytes(
                  optimizeResult.beforeSize
                )}
              </span>


              <span>
                After:{' '}
                {formatBytes(
                  optimizeResult.afterSize
                )}
              </span>


              <span>
                Space recovered:{' '}
                {formatBytes(
                  optimizeResult.bytesSaved
                )}
              </span>


              <span>
                Safety snapshot:{' '}
                {optimizeResult.safetyBackup}
              </span>

            </div>

          )}

        </section>


        <div className="library-scan-footer library-scan-footer-consistency">

          <div>

            <span>
              LAST INSPECTED
            </span>


            <strong>
              {new Date(
                status.scannedAt
              ).toLocaleString()}
            </strong>

          </div>


          <button
            type="button"
            className="library-rescan-button"
            disabled={
              refreshing ||
              checking ||
              snapshotting ||
              optimizing
            }
            onClick={() =>
              void loadStatus(
                true
              )
            }
          >
            {refreshing
              ? 'Refreshing...'
              : 'Refresh Database Status'}
          </button>

        </div>

      </section>

    </main>

  )

}


export default DatabaseMaintenancePage