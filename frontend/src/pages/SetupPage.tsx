import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Link,
  useNavigate,
} from 'react-router-dom'


type FolderDetection = {
  id: string
  label: string
  found: boolean
  matchedFolder: string | null
}


type SetupStatus = {
  schemaVersion: number

  mode:
    | 'first-run'
    | 'existing'
    | 'completed'
    | 'locked-invalid'

  setupRequired: boolean
  explicitCompleted: boolean
  existingInstallation: boolean
  completedAt: string | null
  canComplete: boolean

  library: {
    path: string | null

    source:
      | 'saved'
      | 'environment'
      | 'unconfigured'

    locked: boolean
    exists: boolean
    isDirectory: boolean
    accessible: boolean
    detectedFolderCount: number
    folders: FolderDetection[]
    browseRoots: string[]
  }

  requirements: {
    ffmpeg: {
      available: boolean
      version: string | null
    }

    dataWritable: boolean
    applicationDatabaseExists: boolean
    catalogDatabaseExists: boolean
  }

  checkedAt: string
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


type TestResult = {
  path: string
  exists: boolean
  isDirectory: boolean
  folders: FolderDetection[]
}


const steps = [
  'Welcome',
  'Library',
  'System Check',
  'Finish',
]


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


async function fetchSetupStatus() {

  const response =
    await fetch(
      '/api/setup/status'
    )


  if (
    !response.ok
  ) {

    throw new Error(
      await readJsonError(
        response,
        'Unable to load setup status.'
      )
    )

  }


  return (
    await response.json()
  ) as SetupStatus

}


function SetupPage() {

  const navigate =
    useNavigate()


  const [
    status,
    setStatus,
  ] =
    useState<SetupStatus | null>(
      null
    )


  const [
    activeStep,
    setActiveStep,
  ] =
    useState(
      0
    )


  const [
    mediaLibraryPath,
    setMediaLibraryPath,
  ] =
    useState(
      ''
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
    testResult,
    setTestResult,
  ] =
    useState<TestResult | null>(
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
    working,
    setWorking,
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


  const [
    message,
    setMessage,
  ] =
    useState(
      ''
    )


  const loadStatus =
    useCallback(
      async () => {

        try {

          setLoading(
            true
          )


          const data =
            await fetchSetupStatus()


          setStatus(
            data
          )


          setMediaLibraryPath(
            data.library.path ??
            ''
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
              : 'Setup status could not be loaded.'
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


  async function browseTo(
    requestedPath?:
      string
  ) {

    try {

      setWorking(
        true
      )


      setError(
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


      setBrowseResult(
        await response.json() as
          BrowseResult
      )

    } catch (
      browseError
    ) {

      console.error(
        browseError
      )


      setError(
        browseError instanceof
          Error
          ? browseError.message
          : 'Unable to browse folders.'
      )

    } finally {

      setWorking(
        false
      )

    }

  }


  async function testPath(
    pathValue:
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
                pathValue,
            }),
        }
      )


    if (
      !response.ok
    ) {

      throw new Error(
        await readJsonError(
          response,
          'Unable to test library folder.'
        )
      )

    }


    return (
      await response.json()
    ) as TestResult

  }


  async function saveLibrary() {

    if (
      status?.library.locked
    ) {

      return

    }


    const trimmed =
      mediaLibraryPath.trim()


    if (
      !trimmed
    ) {

      setError(
        'Choose a media library folder first.'
      )


      return

    }


    try {

      setWorking(
        true
      )


      setError(
        ''
      )


      setMessage(
        ''
      )


      const tested =
        await testPath(
          trimmed
        )


      setTestResult(
        tested
      )


      if (
        !tested.exists ||
        !tested.isDirectory
      ) {

        throw new Error(
          'That folder could not be opened as a directory.'
        )

      }


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
                mediaLibraryPath:
                  trimmed,
              }),
          }
        )


      if (
        !response.ok
      ) {

        throw new Error(
          await readJsonError(
            response,
            'Unable to save media library folder.'
          )
        )

      }


      const nextStatus =
        await fetchSetupStatus()


      setStatus(
        nextStatus
      )


      setMediaLibraryPath(
        nextStatus.library.path ??
        trimmed
      )


      setMessage(
        'Library folder saved and activated.'
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
          : 'Unable to save media library folder.'
      )

    } finally {

      setWorking(
        false
      )

    }

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


    try {

      setWorking(
        true
      )


      const tested =
        await testPath(
          selectedPath
        )


      setTestResult(
        tested
      )


      setMessage(
        tested.exists &&
        tested.isDirectory
          ? 'Folder selected. Save it to make it active.'
          : ''
      )

    } catch (
      chooseError
    ) {

      setError(
        chooseError instanceof
          Error
          ? chooseError.message
          : 'Unable to verify selected folder.'
      )

    } finally {

      setWorking(
        false
      )

    }

  }


  async function refreshChecks() {

    try {

      setWorking(
        true
      )


      const nextStatus =
        await fetchSetupStatus()


      setStatus(
        nextStatus
      )


      setMediaLibraryPath(
        nextStatus.library.path ??
        mediaLibraryPath
      )


      setError(
        ''
      )


      setMessage(
        'System checks refreshed.'
      )

    } catch (
      refreshError
    ) {

      setError(
        refreshError instanceof
          Error
          ? refreshError.message
          : 'Unable to refresh system checks.'
      )

    } finally {

      setWorking(
        false
      )

    }

  }


  async function completeSetup() {

    try {

      setWorking(
        true
      )


      setError(
        ''
      )


      const response =
        await fetch(
          '/api/setup/complete',
          {
            method:
              'POST',
          }
        )


      if (
        !response.ok
      ) {

        throw new Error(
          await readJsonError(
            response,
            'Unable to complete setup.'
          )
        )

      }


      const nextStatus =
        await response.json() as
          SetupStatus


      setStatus(
        nextStatus
      )


      setMessage(
        'First-run setup is complete.'
      )


      window.dispatchEvent(
        new Event(
          'deepspace-archive-setup-completed'
        )
      )


      navigate(
        '/',
        {
          replace:
            true,
        }
      )

    } catch (
      completeError
    ) {

      setError(
        completeError instanceof
          Error
          ? completeError.message
          : 'Unable to complete setup.'
      )

    } finally {

      setWorking(
        false
      )

    }

  }


  const displayedFolders =
    useMemo(
      () =>
        testResult?.folders ??
        status?.library.folders ??
        [],
      [
        status,
        testResult,
      ]
    )


  const selectedPathAccessible =
    testResult
      ? (
          testResult.exists &&
          testResult.isDirectory
        )
      : Boolean(
          status?.library.accessible
        )


  const completed =
    Boolean(
      status?.explicitCompleted
    )


  if (
    loading
  ) {

    return (

      <main className="setup-page">

        <section className="setup-shell setup-loading">
          Loading setup…
        </section>

      </main>

    )

  }


  return (

    <main className="setup-page">

      <section className="setup-shell">

        <header className="setup-header">

          <div>

            <span className="archive-eyebrow">
              DEEPSPACE ARCHIVE
            </span>

            <h1>
              First-Run Setup
            </h1>

            <p>
              Configure the local archive location and verify
              that this installation is ready to use.
            </p>

          </div>


          {!status?.setupRequired && (

            <Link
              to="/"
              className="setup-exit-link"
            >
              Exit Setup
            </Link>

          )}

        </header>


        {status?.existingInstallation && (
          <div className="setup-notice">
            This looks like an existing installation with a working
            library. Setup is not required, but you can review the
            steps and save a setup marker for future upgrades.
          </div>
        )}


        {completed && (
          <div className="setup-notice setup-notice-success">
            Setup was completed
            {status?.completedAt
              ? ` on ${new Date(
                  status.completedAt
                ).toLocaleString()}.`
              : '.'}
            {' '}
            You can safely review these steps again without
            changing your library.
          </div>
        )}


        {status?.mode ===
          'locked-invalid' && (
          <div className="setup-notice setup-notice-error">
            This deployment locks the media-library path, but the
            configured path is not accessible. Update the deployment
            MEDIA_LIBRARY_PATH or remove MEDIA_LIBRARY_PATH_LOCKED
            before completing setup.
          </div>
        )}


        <ol className="setup-stepper">

          {steps.map(
            (
              step,
              index
            ) => (

              <li
                key={
                  step
                }
                className={
                  index ===
                    activeStep
                    ? 'active'
                    : index <
                        activeStep
                      ? 'complete'
                      : ''
                }
              >
                <button
                  type="button"
                  onClick={() =>
                    setActiveStep(
                      index
                    )
                  }
                >
                  <span>
                    {index + 1}
                  </span>

                  {step}
                </button>
              </li>

            )
          )}

        </ol>


        {error && (
          <div
            className="setup-message setup-message-error"
            role="alert"
          >
            {error}
          </div>
        )}


        {message && (
          <div
            className="setup-message"
            role="status"
          >
            {message}
          </div>
        )}


        {activeStep ===
          0 && (

          <section className="setup-panel">

            <span className="archive-eyebrow">
              STEP 1
            </span>

            <h2>
              Welcome to DeepSpace Archive
            </h2>

            <p>
              DeepSpace Archive organizes and plays media from your
              own local Love and Deepspace archive. The application
              does not include or download game media for you.
            </p>

            <div className="setup-callout">

              <strong>
                Your media stays where it is.
              </strong>

              <p>
                Setup only tells DeepSpace Archive which folder to
                scan. Application databases, playlists, watch state,
                and cache remain separate from your media library.
              </p>

            </div>

            <div className="setup-callout">

              <strong>
                Docker / NAS users
              </strong>

              <p>
                Mount the parent media folder into the container
                first, then choose the archive child folder here.
                A typical container path is
                {' '}
                <code>
                  /media/All LADS Content Archive
                </code>
                .
              </p>

            </div>

          </section>

        )}


        {activeStep ===
          1 && (

          <section className="setup-panel">

            <span className="archive-eyebrow">
              STEP 2
            </span>

            <h2>
              Choose Your Archive Folder
            </h2>

            <p>
              Select the folder that contains Main Story, Memoria,
              Secret Times, Gallery, home, and your other archive
              sections.
            </p>


            {status?.library.locked ? (

              <div className="setup-locked-path">

                <span>
                  DEPLOYMENT-MANAGED PATH
                </span>

                <strong>
                  {status.library.path ??
                    'Not configured'}
                </strong>

                <p>
                  This installation has
                  {' '}
                  <code>
                    MEDIA_LIBRARY_PATH_LOCKED=true
                  </code>
                  , so the path cannot be changed from the web UI.
                </p>

              </div>

            ) : (

              <>

                <label className="setup-field">

                  <span>
                    Media library path
                  </span>

                  <input
                    type="text"
                    value={
                      mediaLibraryPath
                    }
                    onChange={(event) => {

                      setMediaLibraryPath(
                        event.target.value
                      )

                      setTestResult(
                        null
                      )

                      setMessage(
                        ''
                      )

                    }}
                    placeholder="Choose or enter your archive folder"
                  />

                </label>


                <div className="setup-action-row">

                  <button
                    type="button"
                    className="setup-secondary-button"
                    disabled={
                      working
                    }
                    onClick={() => {

                      setBrowserOpen(
                        true
                      )

                      void browseTo()

                    }}
                  >
                    Browse Folders
                  </button>


                  <button
                    type="button"
                    className="setup-primary-button"
                    disabled={
                      working ||
                      !mediaLibraryPath.trim()
                    }
                    onClick={() =>
                      void saveLibrary()
                    }
                  >
                    Save & Verify
                  </button>

                </div>

              </>

            )}


            <div className="setup-library-summary">

              <div>
                <span>
                  PATH STATUS
                </span>

                <strong
                  className={
                    selectedPathAccessible
                      ? 'setup-good'
                      : 'setup-bad'
                  }
                >
                  {selectedPathAccessible
                    ? 'Accessible'
                    : 'Not Ready'}
                </strong>
              </div>


              <div>
                <span>
                  ARCHIVE FOLDERS FOUND
                </span>

                <strong>
                  {displayedFolders.filter(
                    (folder) =>
                      folder.found
                  ).length}
                  {' / '}
                  {displayedFolders.length}
                </strong>
              </div>

            </div>


            <div className="setup-folder-grid">

              {displayedFolders.map(
                (folder) => (

                  <div
                    key={
                      folder.id
                    }
                    className={
                      folder.found
                        ? 'setup-folder-card found'
                        : 'setup-folder-card'
                    }
                  >
                    <span>
                      {folder.found
                        ? '✓'
                        : '—'}
                    </span>

                    <strong>
                      {folder.label}
                    </strong>

                    {folder.matchedFolder && (
                      <small>
                        {folder.matchedFolder}
                      </small>
                    )}
                  </div>

                )
              )}

            </div>

          </section>

        )}


        {activeStep ===
          2 &&
          status && (

          <section className="setup-panel">

            <span className="archive-eyebrow">
              STEP 3
            </span>

            <h2>
              System Check
            </h2>

            <p>
              These checks confirm the app can reach the library and
              write its own application data.
            </p>


            <div className="setup-check-list">

              <SetupCheck
                label="Media Library"
                good={
                  status.library.accessible
                }
                detail={
                  status.library.accessible
                    ? 'Configured folder is accessible.'
                    : 'Choose and save an accessible archive folder.'
                }
              />


              <SetupCheck
                label="Application Data"
                good={
                  status.requirements.dataWritable
                }
                detail={
                  status.requirements.dataWritable
                    ? 'Backend data directory is writable.'
                    : 'The backend cannot write its data directory.'
                }
              />


              <SetupCheck
                label="Application Database"
                good={
                  status.requirements.applicationDatabaseExists
                }
                detail={
                  status.requirements.applicationDatabaseExists
                    ? 'deepspace-archive.db is initialized.'
                    : 'Application database was not detected.'
                }
              />


              <SetupCheck
                label="Metadata Catalog"
                good={
                  status.requirements.catalogDatabaseExists
                }
                detail={
                  status.requirements.catalogDatabaseExists
                    ? 'metadata-catalog.db is initialized.'
                    : 'Metadata Catalog database was not detected.'
                }
              />


              <SetupCheck
                label="FFmpeg"
                good={
                  status.requirements.ffmpeg.available
                }
                warning={
                  !status.requirements.ffmpeg.available
                }
                detail={
                  status.requirements.ffmpeg.available
                    ? status.requirements.ffmpeg.version ??
                      'FFmpeg detected.'
                    : 'Not detected. The archive can still be configured, but thumbnail generation and media inspection will be limited.'
                }
              />

            </div>


            <button
              type="button"
              className="setup-secondary-button"
              disabled={
                working
              }
              onClick={() =>
                void refreshChecks()
              }
            >
              Refresh Checks
            </button>

          </section>

        )}


        {activeStep ===
          3 &&
          status && (

          <section className="setup-panel">

            <span className="archive-eyebrow">
              STEP 4
            </span>

            <h2>
              {completed
                ? 'Setup Complete'
                : 'Ready to Finish'}
            </h2>


            {status.canComplete ? (

              <>

                <div className="setup-ready-card">

                  <span className="setup-ready-icon">
                    ✓
                  </span>

                  <div>

                    <strong>
                      DeepSpace Archive is ready.
                    </strong>

                    <p>
                      The library is accessible and both application
                      databases are initialized.
                    </p>

                  </div>

                </div>


                {!status.requirements.ffmpeg.available && (
                  <div className="setup-notice">
                    FFmpeg is not currently detected. This does not
                    block setup, but installing FFmpeg is recommended
                    for generated thumbnails and media information.
                  </div>
                )}


                {!completed ? (

                  <button
                    type="button"
                    className="setup-primary-button"
                    disabled={
                      working
                    }
                    onClick={() =>
                      void completeSetup()
                    }
                  >
                    Complete Setup
                  </button>

                ) : (

                  <div className="setup-finish-actions">

                    <Link
                      to="/"
                      className="setup-primary-link"
                    >
                      Open DeepSpace Archive
                    </Link>

                    <Link
                      to="/settings"
                      className="setup-secondary-link"
                    >
                      Open Settings
                    </Link>

                  </div>

                )}

              </>

            ) : (

              <div className="setup-ready-card setup-ready-card-blocked">

                <span className="setup-ready-icon">
                  !
                </span>

                <div>

                  <strong>
                    Setup is not ready to finish.
                  </strong>

                  <p>
                    Return to the Library step and confirm the archive
                    path. Then refresh the System Check.
                  </p>

                </div>

              </div>

            )}

          </section>

        )}


        <footer className="setup-footer">

          <button
            type="button"
            className="setup-secondary-button"
            disabled={
              activeStep ===
                0
            }
            onClick={() =>
              setActiveStep(
                (current) =>
                  Math.max(
                    0,
                    current - 1
                  )
              )
            }
          >
            Back
          </button>


          <span>
            Step {activeStep + 1} of {steps.length}
          </span>


          <button
            type="button"
            className="setup-primary-button"
            disabled={
              activeStep >=
              steps.length - 1
            }
            onClick={() =>
              setActiveStep(
                (current) =>
                  Math.min(
                    steps.length - 1,
                    current + 1
                  )
              )
            }
          >
            Next
          </button>

        </footer>

      </section>


      {browserOpen && (
        <div
          className="setup-browser-backdrop"
          role="presentation"
        >

          <section
            className="setup-browser-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Choose media library folder"
          >

            <header>

              <div>

                <span className="archive-eyebrow">
                  FOLDER BROWSER
                </span>

                <h2>
                  Choose Archive Folder
                </h2>

              </div>


              <button
                type="button"
                className="setup-browser-close"
                onClick={() =>
                  setBrowserOpen(
                    false
                  )
                }
                aria-label="Close folder browser"
              >
                ×
              </button>

            </header>


            {browseResult ? (

              <>

                <div className="setup-browser-current">
                  {browseResult.currentPath}
                </div>


                <div className="setup-browser-roots">

                  {browseResult.roots.map(
                    (root) => (

                      <button
                        type="button"
                        key={
                          root
                        }
                        disabled={
                          working
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


                <div className="setup-browser-directory-list">

                  {browseResult.parentPath && (

                    <button
                      type="button"
                      disabled={
                        working
                      }
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
                        key={
                          directory.path
                        }
                        disabled={
                          working
                        }
                        onClick={() =>
                          void browseTo(
                            directory.path
                          )
                        }
                      >
                        <span>
                          📁
                        </span>

                        <strong>
                          {directory.name}
                        </strong>
                      </button>

                    )
                  )}

                </div>


                <footer>

                  <button
                    type="button"
                    className="setup-secondary-button"
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
                    className="setup-primary-button"
                    disabled={
                      working
                    }
                    onClick={() =>
                      void chooseBrowsedFolder()
                    }
                  >
                    Use This Folder
                  </button>

                </footer>

              </>

            ) : (

              <div className="setup-browser-loading">
                {working
                  ? 'Loading folders…'
                  : 'Folder browser is unavailable.'}
              </div>

            )}

          </section>

        </div>
      )}

    </main>

  )

}


type SetupCheckProps = {
  label: string
  good: boolean
  warning?: boolean
  detail: string
}


function SetupCheck({
  label,
  good,
  warning = false,
  detail,
}: SetupCheckProps) {

  return (

    <div
      className={
        good
          ? 'setup-check good'
          : warning
            ? 'setup-check warning'
            : 'setup-check bad'
      }
    >

      <span className="setup-check-icon">
        {good
          ? '✓'
          : warning
            ? '!'
            : '×'}
      </span>


      <div>

        <strong>
          {label}
        </strong>

        <p>
          {detail}
        </p>

      </div>

    </div>

  )

}


export default SetupPage
