import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  Link,
} from 'react-router-dom'


type FolderDetection = {
  id: string
  label: string
  found: boolean
  matchedFolder: string | null
}


type PathStatus = {
  mediaLibraryPath: string | null

  source:
    | 'saved'
    | 'environment'
    | 'unconfigured'

  locked: boolean

  exists: boolean
  isDirectory: boolean

  folders: FolderDetection[]

  browseRoots: string[]

  applicationPaths: {
    data: string
    cache: string
    database: string
  }
}


type TestResult = {
  path: string
  exists: boolean
  isDirectory: boolean
  folders: FolderDetection[]
}


type BrowseResult = {
  currentPath: string
  rootPath: string
  parentPath: string | null
  roots: string[]

  directories:
    Array<{
      name: string
      path: string
    }>
}


function sourceLabel(
  source:
    PathStatus['source']
) {

  if (
    source ===
    'saved'
  ) {

    return 'Saved application setting'

  }


  if (
    source ===
    'environment'
  ) {

    return 'Deployment default'

  }


  return 'Not configured'

}


async function readJsonError(
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


async function fetchPathStatus() {

  const response =
    await fetch(
      '/api/path-settings'
    )


  if (
    !response.ok
  ) {

    throw new Error(
      await readJsonError(
        response,
        'Unable to load file locations.'
      )
    )

  }


  return (
    await response.json()
  ) as PathStatus

}


function FileLocationsPage() {

  const [
    status,
    setStatus,
  ] =
    useState<PathStatus | null>(
      null
    )


  const [
    mediaLibraryPath,
    setMediaLibraryPath,
  ] =
    useState(
      ''
    )


  const [
    testResult,
    setTestResult,
  ] =
    useState<TestResult | null>(
      null
    )


  const [
    browseResult,
    setBrowseResult,
  ] =
    useState<BrowseResult | null>(
      null
    )


  const [
    browserOpen,
    setBrowserOpen,
  ] =
    useState(
      false
    )


  const [
    browsing,
    setBrowsing,
  ] =
    useState(
      false
    )


  const [
    browseError,
    setBrowseError,
  ] =
    useState(
      ''
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
    testing,
    setTesting,
  ] =
    useState(
      false
    )


  const [
    saving,
    setSaving,
  ] =
    useState(
      false
    )


  const [
    message,
    setMessage,
  ] =
    useState(
      ''
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
            await fetchPathStatus()


          setStatus(
            data
          )


          setMediaLibraryPath(
            data.mediaLibraryPath ??
            ''
          )


          setTestResult(
            null
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
              : 'File locations could not be loaded.'
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


  async function testSpecificPath(
    value:
      string
  ) {

    const response =
      await fetch(
        '/api/path-settings/test',
        {
          method:
            'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify({
              mediaLibraryPath:
                value,
            }),
        }
      )


    if (
      !response.ok
    ) {

      throw new Error(
        await readJsonError(
          response,
          'Unable to test path.'
        )
      )

    }


    return (
      await response.json()
    ) as TestResult

  }


  async function testPath() {

    try {

      setTesting(
        true
      )


      setMessage(
        ''
      )


      setError(
        ''
      )


      const data =
        await testSpecificPath(
          mediaLibraryPath
        )


      setTestResult(
        data
      )


      if (
        data.exists &&
        data.isDirectory
      ) {

        setMessage(
          'Path is accessible.'
        )

      } else {

        setError(
          'That path could not be opened as a directory.'
        )

      }

    } catch (
      testError
    ) {

      console.error(
        testError
      )


      setError(
        testError instanceof
          Error
          ? testError.message
          : 'Unable to test path.'
      )

    } finally {

      setTesting(
        false
      )

    }

  }


  async function browseTo(
    requestedPath?:
      string
  ) {

    try {

      setBrowsing(
        true
      )


      setBrowseError(
        ''
      )


      const query =
        new URLSearchParams()


      if (
        requestedPath
      ) {

        query.set(
          'path',
          requestedPath
        )

      }


      const response =
        await fetch(
          `/api/path-settings/browse${
            query.size >
            0
              ? `?${query}`
              : ''
          }`
        )


      if (
        !response.ok
      ) {

        throw new Error(
          await readJsonError(
            response,
            'Unable to browse folders.'
          )
        )

      }


      const data =
        await response.json() as
          BrowseResult


      setBrowseResult(
        data
      )

    } catch (
      browseFailure
    ) {

      console.error(
        browseFailure
      )


      setBrowseError(
        browseFailure instanceof
          Error
          ? browseFailure.message
          : 'Unable to browse folders.'
      )

    } finally {

      setBrowsing(
        false
      )

    }

  }


  async function openBrowser() {

    setBrowserOpen(
      true
    )


    /*
     * Let the backend choose the safest starting
     * point when the currently typed path is not
     * inside a configured browse root.
     */
    await browseTo()

  }


  async function chooseBrowsedFolder() {

    if (
      !browseResult
    ) {

      return

    }


    const selectedPath =
      browseResult.currentPath


    setMediaLibraryPath(
      selectedPath
    )


    setBrowserOpen(
      false
    )


    setMessage(
      ''
    )


    setError(
      ''
    )


    try {

      setTesting(
        true
      )


      const data =
        await testSpecificPath(
          selectedPath
        )


      setTestResult(
        data
      )


      if (
        data.exists &&
        data.isDirectory
      ) {

        setMessage(
          'Folder selected and verified. Save to make it active.'
        )

      }

    } catch (
      testError
    ) {

      setError(
        testError instanceof
          Error
          ? testError.message
          : 'Unable to verify selected folder.'
      )

    } finally {

      setTesting(
        false
      )

    }

  }


  async function verifyActiveLibrary() {

    const response =
      await fetch(
        '/api/library-health/status'
      )


    if (
      !response.ok
    ) {

      throw new Error(
        'The path was saved, but the library verification scan failed.'
      )

    }

  }


  async function savePath() {

    if (
      status?.locked
    ) {

      return

    }


    try {

      setSaving(
        true
      )


      setMessage(
        ''
      )


      setError(
        ''
      )


      const response =
        await fetch(
          '/api/path-settings/media-library',
          {
            method:
              'PUT',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                mediaLibraryPath,
              }),
          }
        )


      if (
        !response.ok
      ) {

        throw new Error(
          await readJsonError(
            response,
            'Unable to save media library path.'
          )
        )

      }


      const data =
        await response.json() as
          PathStatus


      setStatus(
        data
      )


      setMediaLibraryPath(
        data.mediaLibraryPath ??
        mediaLibraryPath
      )


      setTestResult(
        null
      )


      await verifyActiveLibrary()


      setMessage(
        'Media library path saved, activated, and verified.'
      )

    } catch (
      saveError
    ) {

      console.error(
        saveError
      )


      setError(
        saveError instanceof
          Error
          ? saveError.message
          : 'Unable to save media library path.'
      )

    } finally {

      setSaving(
        false
      )

    }

  }


  const folders =
    testResult?.folders ??
    status?.folders ??
    []


  const detectedCount =
    folders.filter(
      (folder) =>
        folder.found
    ).length


  const pathAccessible =
    testResult
      ? (
          testResult.exists &&
          testResult.isDirectory
        )
      : (
          status?.exists &&
          status.isDirectory
        )


  const pathChanged =
    Boolean(
      status &&
      mediaLibraryPath.trim() !==
        (
          status.mediaLibraryPath ??
          ''
        ).trim()
    )


  const locked =
    Boolean(
      status?.locked
    )


  const currentPathLabel =
    testResult
      ? 'Tested path'
      : 'Active path'


  const connectionText =
    pathAccessible
      ? 'Accessible'
      : status?.mediaLibraryPath
        ? 'Unavailable'
        : 'Not configured'


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
              File Locations
            </h1>

          </div>

        </header>


        <section className="archive-feedback-panel">
          Loading file locations...
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
              File Locations
            </h1>

          </div>

        </header>


        <section className="archive-feedback-panel">

          <span className="archive-feedback-kicker">
            UNAVAILABLE
          </span>


          <h2>
            File locations could not be loaded.
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
            File Locations
          </h1>

        </div>

      </header>


      <section className="file-locations-page file-locations-consistency">

        <div className="file-location-status-strip">

          <div>

            <span>
              LIBRARY
            </span>


            <strong>
              {connectionText}
            </strong>

          </div>


          <div>

            <span>
              SOURCE
            </span>


            <strong>
              {status
                ? sourceLabel(
                    status.source
                  )
                : 'Unknown'}
            </strong>

          </div>


          <div>

            <span>
              FOLDERS
            </span>


            <strong>
              {detectedCount}
              {' / '}
              {folders.length}
              {' detected'}
            </strong>

          </div>


          <button
            type="button"
            className="file-location-refresh-button"
            disabled={
              refreshing ||
              testing ||
              saving
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

        </div>


        <section className="file-location-panel">

          <div className="settings-section-heading file-location-panel-heading">

            <div>

              <span className="archive-eyebrow">
                MEDIA LIBRARY
              </span>


              <h2>
                Archive Location
              </h2>


              <p>
                Select any archive folder the
                DeepSpace Archive backend can access.
                In Docker, mount a parent media folder
                into the container and select the
                archive beneath that mount.
              </p>

            </div>


            {locked && (

              <span className="file-location-managed-badge">
                LOCKED BY DEPLOYMENT
              </span>

            )}

          </div>


          {locked && (

            <div className="file-location-managed-note">

              <strong>
                Browser editing was explicitly disabled
                by this deployment.
              </strong>


              <span>
                Remove MEDIA_LIBRARY_PATH_LOCKED=true
                from the deployment configuration to
                restore normal editable behavior.
              </span>

            </div>

          )}


          <div className="file-location-current file-location-current-expanded">

            <div>

              <span>
                {currentPathLabel}
              </span>


              <strong>
                {testResult?.path ??
                  status?.mediaLibraryPath ??
                  'Not configured'}
              </strong>

            </div>


            <span
              className={
                pathAccessible
                  ? 'library-health-badge healthy'
                  : 'library-health-badge problem'
              }
            >
              {pathAccessible
                ? 'Accessible'
                : 'Unavailable'}
            </span>

          </div>


          <label className="file-location-field">

            <span>
              Media Library Path
            </span>


            <div className="file-location-path-input-row">

              <input
                type="text"
                value={
                  mediaLibraryPath
                }
                readOnly={
                  locked
                }
                placeholder={
                  'Z:\\All LADS Content Archive or /media/All LADS Content Archive'
                }
                onChange={(event) => {

                  if (
                    locked
                  ) {

                    return

                  }


                  setMediaLibraryPath(
                    event.target.value
                  )


                  setTestResult(
                    null
                  )


                  setMessage(
                    ''
                  )


                  setError(
                    ''
                  )

                }}
              />


              <button
                type="button"
                className="file-location-browse-button"
                disabled={
                  locked ||
                  browsing
                }
                onClick={() =>
                  void openBrowser()
                }
              >
                {browsing
                  ? 'Opening...'
                  : 'Browse Folders'}
              </button>

            </div>

          </label>


          <div className="file-location-editable-note">

            <strong>
              Editable by default
            </strong>


            <span>
              Changing this setting updates the active
              library immediately. No backend restart
              or container rebuild is required.
            </span>

          </div>


          <div className="file-location-actions file-location-actions-consistency">

            <button
              type="button"
              className="catalog-secondary-button"
              disabled={
                testing ||
                saving ||
                !mediaLibraryPath.trim()
              }
              onClick={() =>
                void testPath()
              }
            >
              {testing
                ? 'Testing...'
                : 'Test Path'}
            </button>


            <button
              type="button"
              className="catalog-primary-button"
              disabled={
                locked ||
                testing ||
                saving ||
                !mediaLibraryPath.trim() ||
                !pathChanged
              }
              onClick={() =>
                void savePath()
              }
            >
              {saving
                ? 'Saving & Verifying...'
                : locked
                  ? 'Locked by Deployment'
                  : 'Save, Activate & Verify'}
            </button>


            <Link
              to="/settings/library"
              className="file-location-library-link"
            >
              View Library Status
            </Link>

          </div>


          {message && (

            <div className="settings-status-message file-location-success">
              ✓ {message}
            </div>

          )}


          {error && (

            <div className="settings-status-message settings-status-error">
              {error}
            </div>

          )}

        </section>


        <section className="file-location-panel">

          <div className="settings-section-heading">

            <span className="archive-eyebrow">
              FOLDER CHECK
            </span>


            <h2>
              Detected Archive Sections
            </h2>


            <p>
              Missing folders are informational.
              DeepSpace Archive does not require every
              section to exist.
            </p>

          </div>


          <div className="file-location-folder-summary">

            <strong>
              {detectedCount}
            </strong>


            <span>
              of {folders.length} known archive
              sections detected
            </span>

          </div>


          <div className="file-location-folder-grid">

            {folders.map(
              (folder) => (

                <div
                  key={
                    folder.id
                  }
                  className={
                    folder.found
                      ? 'file-location-folder found'
                      : 'file-location-folder missing'
                  }
                >

                  <span className="file-location-folder-status">
                    {folder.found
                      ? '✓'
                      : '—'}
                  </span>


                  <div>

                    <strong>
                      {folder.label}
                    </strong>


                    <span>
                      {folder.found
                        ? folder.matchedFolder
                        : 'Not detected'}
                    </span>

                  </div>

                </div>

              )
            )}

          </div>

        </section>


        {status && (

          <section className="file-location-panel">

            <div className="settings-section-heading">

              <span className="archive-eyebrow">
                APPLICATION STORAGE
              </span>


              <h2>
                Managed Paths
              </h2>


              <p>
                These paths contain application state,
                cache files, and the SQLite database.
                In container deployments they should
                live on persistent volumes.
              </p>

            </div>


            <div className="managed-path-list managed-path-list-consistency">

              <div>

                <span>
                  Application Data
                </span>


                <code>
                  {status.applicationPaths.data}
                </code>

              </div>


              <div>

                <span>
                  Cache
                </span>


                <code>
                  {status.applicationPaths.cache}
                </code>

              </div>


              <div>

                <span>
                  Primary Database
                </span>


                <code>
                  {status.applicationPaths.database}
                </code>

              </div>

            </div>

          </section>

        )}

      </section>


      {browserOpen && (

        <div
          className="file-browser-overlay"
          role="presentation"
          onMouseDown={(event) => {

            if (
              event.target ===
              event.currentTarget
            ) {

              setBrowserOpen(
                false
              )

            }

          }}
        >

          <section
            className="file-browser-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Select media library folder"
          >

            <div className="file-browser-header">

              <div>

                <span className="archive-eyebrow">
                  FOLDER BROWSER
                </span>


                <h2>
                  Select Media Library
                </h2>

              </div>


              <button
                type="button"
                className="file-browser-close"
                onClick={() =>
                  setBrowserOpen(
                    false
                  )
                }
                aria-label="Close folder browser"
              >
                ×
              </button>

            </div>


            {browseResult &&
            browseResult.roots.length >
              1 && (

              <div className="file-browser-roots">

                {browseResult.roots.map(
                  (root) => (

                    <button
                      type="button"
                      key={
                        root
                      }
                      className={
                        root ===
                        browseResult.rootPath
                          ? 'active'
                          : ''
                      }
                      onClick={() =>
                        void browseTo(
                          root
                        )
                      }
                    >
                      {root}
                    </button>

                  )
                )}

              </div>

            )}


            {browseResult && (

              <div className="file-browser-current">

                <span>
                  CURRENT FOLDER
                </span>


                <strong>
                  {browseResult.currentPath}
                </strong>

              </div>

            )}


            {browseError ? (

              <div className="settings-status-message settings-status-error">
                {browseError}
              </div>

            ) : browsing ? (

              <div className="file-browser-loading">
                Loading folders...
              </div>

            ) : browseResult ? (

              <div className="file-browser-directory-list">

                {browseResult.parentPath && (

                  <button
                    type="button"
                    className="file-browser-directory file-browser-parent"
                    onClick={() =>
                      void browseTo(
                        browseResult.parentPath ??
                        undefined
                      )
                    }
                  >

                    <span>
                      ↑
                    </span>


                    <strong>
                      Parent Folder
                    </strong>

                  </button>

                )}


                {browseResult.directories.map(
                  (directory) => (

                    <button
                      type="button"
                      className="file-browser-directory"
                      key={
                        directory.path
                      }
                      onClick={() =>
                        void browseTo(
                          directory.path
                        )
                      }
                    >

                      <span>
                        ▣
                      </span>


                      <strong>
                        {directory.name}
                      </strong>


                      <small>
                        ›
                      </small>

                    </button>

                  )
                )}


                {browseResult.directories.length ===
                  0 && (

                  <div className="file-browser-empty">
                    No subfolders in this location.
                  </div>

                )}

              </div>

            ) : null}


            <div className="file-browser-footer">

              <button
                type="button"
                className="catalog-secondary-button"
                onClick={() =>
                  setBrowserOpen(
                    false
                  )
                }
              >
                Cancel
              </button>


              <button
                type="button"
                className="catalog-primary-button"
                disabled={
                  !browseResult ||
                  browsing
                }
                onClick={() =>
                  void chooseBrowsedFolder()
                }
              >
                Use This Folder
              </button>

            </div>

          </section>

        </div>

      )}

    </main>

  )

}


export default FileLocationsPage