import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  Link,
} from 'react-router-dom'


type SystemInfo = {

  application: {
    name: string
    backendPackage: string
    version: string
    license: string | null
    licenseFileExists: boolean
    unofficialFanProject: boolean
  }

  build: {
    channel: string
    commit: string | null
    buildDate: string | null
  }

  project: {
    repositoryUrl: string
    issuesUrl: string
  }

  runtime: {
    nodeVersion: string
    platform: string
    architecture: string
    operatingSystem: string
    hostname: string
    uptimeSeconds: number
    workingDirectory: string
  }

  mediaLibrary: {
    configured: boolean
    connected: boolean
    path: string | null
  }

  ffmpeg: {
    available: boolean
    version: string | null
  }

  storage: {
    dataDirectory: string

    databasePath: string
    databaseExists: boolean
    databaseSize: number

    catalogDatabasePath: string
    catalogDatabaseExists: boolean
    catalogDatabaseSize: number

    thumbnailCachePath: string

    safetyBackupPath: string
    safetyBackupCount: number

    restoreUploadPath: string
  }

  checkedAt:
    string

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


function formatUptime(
  seconds:
    number
) {

  const days =
    Math.floor(
      seconds /
      86400
    )


  const hours =
    Math.floor(
      (
        seconds %
        86400
      ) /
      3600
    )


  const minutes =
    Math.floor(
      (
        seconds %
        3600
      ) /
      60
    )


  const parts:
    string[] = []


  if (
    days >
    0
  ) {

    parts.push(
      `${days}d`
    )

  }


  if (
    hours >
      0 ||
    days >
      0
  ) {

    parts.push(
      `${hours}h`
    )

  }


  parts.push(
    `${minutes}m`
  )


  return parts.join(
    ' '
  )

}


function formatDate(
  value:
    string | null
) {

  if (
    !value
  ) {

    return 'Not provided'
  }


  return new Date(
    value
  ).toLocaleString()

}


function AboutPage() {

  const [
    info,
    setInfo,
  ] =
    useState<SystemInfo | null>(
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
    diagnosticDownloading,
    setDiagnosticDownloading,
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


  const loadInfo =
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


          setError(
            ''
          )


          const response =
            await fetch(
              '/api/system-info'
            )


          if (
            !response.ok
          ) {

            throw new Error(
              'Unable to load system information.'
            )

          }


          setInfo(
            await response.json() as
              SystemInfo
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
              : 'System information could not be loaded.'
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

            void loadInfo()

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
      loadInfo,
    ]
  )


  async function downloadDiagnostics() {

    try {

      setDiagnosticDownloading(
        true
      )


      setError(
        ''
      )


      const response =
        await fetch(
          '/api/system-info/diagnostics'
        )


      if (
        !response.ok
      ) {

        throw new Error(
          'Unable to create support diagnostics.'
        )

      }


      const blob =
        await response.blob()


      const url =
        URL.createObjectURL(
          blob
        )


      const disposition =
        response.headers.get(
          'content-disposition'
        )


      const match =
        disposition?.match(
          /filename="([^"]+)"/
        )


      const fileName =
        match?.[1] ??
        'deepspace-archive-diagnostics.json'


      const anchor =
        document.createElement(
          'a'
        )


      anchor.href =
        url


      anchor.download =
        fileName


      document.body.appendChild(
        anchor
      )


      anchor.click()


      anchor.remove()


      URL.revokeObjectURL(
        url
      )

    } catch (
      diagnosticError
    ) {

      console.error(
        diagnosticError
      )


      setError(
        diagnosticError instanceof
          Error
          ? diagnosticError.message
          : 'Unable to create support diagnostics.'
      )

    } finally {

      setDiagnosticDownloading(
        false
      )

    }

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
              About DeepSpace Archive
            </h1>

          </div>

        </header>


        <section className="archive-feedback-panel">
          Loading system information...
        </section>

      </main>

    )

  }


  if (
    error &&
    !info
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
              About DeepSpace Archive
            </h1>

          </div>

        </header>


        <section className="archive-feedback-panel">

          <span className="archive-feedback-kicker">
            UNAVAILABLE
          </span>


          <h2>
            System information could not be loaded.
          </h2>


          <p>
            {error}
          </p>


          <button
            type="button"
            className="archive-feedback-button"
            onClick={() =>
              void loadInfo()
            }
          >
            Retry
          </button>

        </section>

      </main>

    )

  }


  if (
    !info
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
            About DeepSpace Archive
          </h1>

        </div>

      </header>


      <section className="about-system-content about-release-content">

        <section className="about-release-hero">

          <div>

            <span className="archive-eyebrow">
              APPLICATION
            </span>


            <h2>
              {info.application.name}
            </h2>


            <p>
              A self-hosted personal media archive
              for organizing, preserving, watching,
              and managing Love and Deepspace content
              you provide.
            </p>

          </div>


          <div className="about-release-version">

            <span>
              VERSION
            </span>


            <strong>
              {info.application.version}
            </strong>


            <small>
              {info.build.channel}
            </small>

          </div>

        </section>


        {error && (

          <div className="settings-status-message settings-status-error about-release-error">
            {error}
          </div>

        )}


        <div className="about-release-summary">

          <div>

            <span>
              BUILD
            </span>


            <strong>
              {info.build.commit ??
                'No commit ID'}
            </strong>

          </div>


          <div>

            <span>
              BUILD DATE
            </span>


            <strong>
              {formatDate(
                info.build.buildDate
              )}
            </strong>

          </div>


          <div>

            <span>
              PACKAGE LICENSE
            </span>


            <strong>
              {info.application.license ??
                'Not declared'}
            </strong>

          </div>


          <div>

            <span>
              LIBRARY
            </span>


            <strong
              className={
                info.mediaLibrary.connected
                  ? 'about-release-good'
                  : 'about-release-problem'
              }
            >
              {info.mediaLibrary.connected
                ? 'Connected'
                : 'Unavailable'}
            </strong>

          </div>

        </div>


        <div className="about-release-grid">

          <section className="library-health-panel">

            <div className="library-health-panel-header">

              <div>

                <span className="archive-eyebrow">
                  RELEASE
                </span>


                <h2>
                  Version & Build
                </h2>

              </div>

            </div>


            <div className="about-info-grid about-info-grid-consistency">

              <div>

                <span>
                  Version
                </span>


                <strong>
                  {info.application.version}
                </strong>

              </div>


              <div>

                <span>
                  Channel
                </span>


                <strong>
                  {info.build.channel}
                </strong>

              </div>


              <div>

                <span>
                  Commit
                </span>


                <strong>
                  {info.build.commit ??
                    'Not available'}
                </strong>

              </div>


              <div>

                <span>
                  Build Date
                </span>


                <strong>
                  {formatDate(
                    info.build.buildDate
                  )}
                </strong>

              </div>


              <div>

                <span>
                  Backend Package
                </span>


                <strong>
                  {info.application.backendPackage}
                </strong>

              </div>


              <div>

                <span>
                  Package License
                </span>


                <strong>
                  {info.application.license ??
                    'Not declared'}
                </strong>

              </div>

            </div>


            {!info.application.licenseFileExists && (

              <div className="about-license-warning">
                No repository LICENSE file was detected
                from the running backend. We should add
                one before the first public release.
              </div>

            )}

          </section>


          <section className="library-health-panel">

            <div className="library-health-panel-header">

              <div>

                <span className="archive-eyebrow">
                  SYSTEM
                </span>


                <h2>
                  Runtime
                </h2>

              </div>

            </div>


            <div className="about-info-grid about-info-grid-consistency">

              <div>

                <span>
                  Node.js
                </span>


                <strong>
                  {info.runtime.nodeVersion}
                </strong>

              </div>


              <div>

                <span>
                  Platform
                </span>


                <strong>
                  {info.runtime.platform}
                </strong>

              </div>


              <div>

                <span>
                  Architecture
                </span>


                <strong>
                  {info.runtime.architecture}
                </strong>

              </div>


              <div>

                <span>
                  Operating System
                </span>


                <strong>
                  {info.runtime.operatingSystem}
                </strong>

              </div>


              <div>

                <span>
                  Hostname
                </span>


                <strong>
                  {info.runtime.hostname}
                </strong>

              </div>


              <div>

                <span>
                  Backend Uptime
                </span>


                <strong>
                  {formatUptime(
                    info.runtime.uptimeSeconds
                  )}
                </strong>

              </div>

            </div>

          </section>

        </div>


        <div className="about-release-grid">

          <section className="library-health-panel">

            <div className="library-health-panel-header">

              <div>

                <span className="archive-eyebrow">
                  MEDIA
                </span>


                <h2>
                  Library & FFmpeg
                </h2>

              </div>


              <span
                className={
                  info.mediaLibrary.connected
                    ? 'library-health-badge healthy'
                    : 'library-health-badge problem'
                }
              >
                {info.mediaLibrary.connected
                  ? 'Ready'
                  : 'Needs Attention'}
              </span>

            </div>


            <div className="about-path-block">

              <span>
                MEDIA LIBRARY
              </span>


              <strong>
                {info.mediaLibrary.path ??
                  'Not configured'}
              </strong>

            </div>


            <div className="about-release-ffmpeg">

              <div>

                <span>
                  FFMPEG
                </span>


                <strong
                  className={
                    info.ffmpeg.available
                      ? 'about-release-good'
                      : 'about-release-problem'
                  }
                >
                  {info.ffmpeg.available
                    ? 'Detected'
                    : 'Unavailable'}
                </strong>

              </div>


              <p>
                {info.ffmpeg.version ??
                  'Thumbnail generation and video inspection may not work until FFmpeg is available to the backend.'}
              </p>

            </div>


            <Link
              to="/settings/file-locations"
              className="about-release-inline-link"
            >
              Manage File Locations
            </Link>

          </section>


          <section className="library-health-panel">

            <div className="library-health-panel-header">

              <div>

                <span className="archive-eyebrow">
                  STORAGE
                </span>


                <h2>
                  Application Data
                </h2>

              </div>

            </div>


            <div className="about-storage-list about-storage-list-consistency">

              <div>

                <span>
                  State Database
                </span>


                <div>

                  <strong>
                    {info.storage.databasePath}
                  </strong>


                  <small>
                    {formatBytes(
                      info.storage.databaseSize
                    )}
                  </small>

                </div>

              </div>


              <div>

                <span>
                  Metadata Catalog
                </span>


                <div>

                  <strong>
                    {info.storage.catalogDatabasePath}
                  </strong>


                  <small>
                    {formatBytes(
                      info.storage.catalogDatabaseSize
                    )}
                  </small>

                </div>

              </div>


              <div>

                <span>
                  Thumbnail Cache
                </span>


                <strong>
                  {info.storage.thumbnailCachePath}
                </strong>

              </div>


              <div>

                <span>
                  Safety Backups
                </span>


                <div>

                  <strong>
                    {info.storage.safetyBackupPath}
                  </strong>


                  <small>
                    {info.storage.safetyBackupCount}
                    {' '}
                    {info.storage.safetyBackupCount ===
                    1
                      ? 'file'
                      : 'files'}
                  </small>

                </div>

              </div>


              <div>

                <span>
                  Working Directory
                </span>


                <strong>
                  {info.runtime.workingDirectory}
                </strong>

              </div>

            </div>

          </section>

        </div>


        <section className="about-support-panel">

          <div>

            <span className="archive-eyebrow">
              SUPPORT
            </span>


            <h2>
              Project & Diagnostics
            </h2>


            <p>
              The diagnostic report is designed for
              bug reports. It includes versions and
              component status but deliberately
              excludes your media-library path,
              hostname, working directory, filenames,
              and media titles.
            </p>

          </div>


          <div className="about-support-actions">

            <a
              href={
                info.project.repositoryUrl
              }
              target="_blank"
              rel="noreferrer"
            >
              GitHub Repository
            </a>


            <a
              href={
                info.project.issuesUrl
              }
              target="_blank"
              rel="noreferrer"
            >
              Report an Issue
            </a>


            <button
              type="button"
              disabled={
                diagnosticDownloading
              }
              onClick={() =>
                void downloadDiagnostics()
              }
            >
              {diagnosticDownloading
                ? 'Preparing...'
                : 'Download Diagnostics'}
            </button>

          </div>

        </section>


        <section className="about-deployment-panel">

          <span className="archive-eyebrow">
            DEPLOYMENT
          </span>


          <h2>
            Windows, Docker & NAS
          </h2>


          <p>
            Application data is kept separately from
            the media library, library locations are
            editable from Settings, and portable
            backups use relative media paths. This
            allows the same archive data to move
            between local Windows development,
            Docker, and NAS-hosted deployments.
          </p>

        </section>


        <section className="about-fan-project-panel">

          <span className="archive-eyebrow">
            UNOFFICIAL FAN PROJECT
          </span>


          <h2>
            User-provided media only
          </h2>


          <p>
            DeepSpace Archive is an unofficial
            fan-made archiving tool and is not
            affiliated with or endorsed by the
            creators or publishers of Love and
            Deepspace. The application does not
            include or distribute Love and Deepspace
            media; users supply and manage their own
            local archive files.
          </p>

        </section>


        <div className="library-scan-footer library-scan-footer-consistency">

          <div>

            <span>
              LAST CHECKED
            </span>


            <strong>
              {new Date(
                info.checkedAt
              ).toLocaleString()}
            </strong>

          </div>


          <button
            type="button"
            className="library-rescan-button"
            disabled={
              refreshing
            }
            onClick={() =>
              void loadInfo(
                true
              )
            }
          >
            {refreshing
              ? 'Refreshing...'
              : 'Refresh System Info'}
          </button>

        </div>

      </section>

    </main>

  )

}


export default AboutPage