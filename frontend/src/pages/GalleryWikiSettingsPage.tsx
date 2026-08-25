import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Link,
  useLocation,
} from 'react-router-dom'


type GalleryCharacter =
  | 'Xavier'
  | 'Zayne'
  | 'Rafayel'
  | 'Sylus'
  | 'Caleb'


type Source = {
  character:
    GalleryCharacter

  url:
    string
}


type SyncResult = {
  character: string
  sourceUrl: string
  discovered: number
  downloaded: number
  skippedExisting: number
  failed: number
  localCount: number
}


type SyncHistoryEntry = {
  character:
    GalleryCharacter

  lastAttemptAt:
    string | null

  lastSuccessAt:
    string | null

  lastResult:
    SyncResult | null

  lastError:
    string | null
}


type SourceResponse = {
  sources: Source[]
  defaults: Source[]
  syncHistory: SyncHistoryEntry[]
}


type SourceTestResult = {
  ok: boolean
  status: number
  statusText: string
  finalUrl: string
  contentType: string | null
}


type SyncJob = {
  status:
    | 'running'
    | 'complete'
    | 'error'

  progress: {
    percent: number
    message: string
  }

  result:
    SyncResult | null

  error:
    string | null
}


function formatDate(
  value:
    string | null
) {

  if (
    !value
  ) {

    return 'Never'

  }


  return new Date(
    value
  ).toLocaleString()

}


async function responseError(
  response:
    Response,
  fallback:
    string
) {

  const body =
    await response.json()
      .catch(
        () => null
      ) as
        {
          error?: string
        } |
        null


  return (
    body?.error ??
    fallback
  )

}


function GalleryWikiSettingsPage() {

  const location =
    useLocation()


  const requestedReturnTo =
    (
      location.state as
        {
          returnTo?: unknown
        } |
        null
    )?.returnTo


  const returnTo =
    typeof requestedReturnTo ===
      'string' &&
    requestedReturnTo.startsWith(
      '/'
    ) &&
    !requestedReturnTo.startsWith(
      '//'
    )
      ? requestedReturnTo
      : '/settings'


  const [
    sources,
    setSources,
  ] =
    useState<Source[]>(
      []
    )


  const [
    defaults,
    setDefaults,
  ] =
    useState<Source[]>(
      []
    )


  const [
    syncHistory,
    setSyncHistory,
  ] =
    useState<SyncHistoryEntry[]>(
      []
    )


  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    )


  const [
    savingCharacter,
    setSavingCharacter,
  ] =
    useState<GalleryCharacter | null>(
      null
    )


  const [
    testingCharacter,
    setTestingCharacter,
  ] =
    useState<GalleryCharacter | null>(
      null
    )


  const [
    syncingCharacter,
    setSyncingCharacter,
  ] =
    useState<GalleryCharacter | null>(
      null
    )


  const [
    syncingAll,
    setSyncingAll,
  ] =
    useState(
      false
    )


  const [
    restoringDefaults,
    setRestoringDefaults,
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


  const [
    syncProgress,
    setSyncProgress,
  ] =
    useState<
      Partial<
        Record<
          GalleryCharacter,
          {
            percent: number
            message: string
          }
        >
      >
    >(
      {}
    )


  const [
    syncResults,
    setSyncResults,
  ] =
    useState<
      Partial<
        Record<
          GalleryCharacter,
          SyncResult
        >
      >
    >(
      {}
    )


  const [
    testResults,
    setTestResults,
  ] =
    useState<
      Partial<
        Record<
          GalleryCharacter,
          SourceTestResult
        >
      >
    >(
      {}
    )


  const loadSources =
    useCallback(
      async () => {

        try {

          setError(
            ''
          )


          const response =
            await fetch(
              '/api/gallery-wiki/sources'
            )


          if (
            !response.ok
          ) {

            throw new Error(
              await responseError(
                response,
                'Unable to load Gallery wiki sources.'
              )
            )

          }


          const data =
            await response.json() as
              SourceResponse


          setSources(
            data.sources
          )


          setDefaults(
            data.defaults
          )


          setSyncHistory(
            data.syncHistory
          )


          const savedResults:
            Partial<
              Record<
                GalleryCharacter,
                SyncResult
              >
            > = {}


          for (
            const entry
            of data.syncHistory
          ) {

            if (
              entry.lastResult
            ) {

              savedResults[
                entry.character
              ] =
                entry.lastResult

            }

          }


          setSyncResults(
            savedResults
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
              : 'Gallery wiki sources could not be loaded.'
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

            void loadSources()

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
      loadSources,
    ]
  )


  const historyByCharacter =
    useMemo(
      () => {

        const result =
          new Map<
            GalleryCharacter,
            SyncHistoryEntry
          >()


        for (
          const entry
          of syncHistory
        ) {

          result.set(
            entry.character,
            entry
          )

        }


        return result

      },
      [
        syncHistory,
      ]
    )


  const defaultByCharacter =
    useMemo(
      () => {

        const result =
          new Map<
            GalleryCharacter,
            string
          >()


        for (
          const source
          of defaults
        ) {

          result.set(
            source.character,
            source.url
          )

        }


        return result

      },
      [
        defaults,
      ]
    )


  const successfulSyncs =
    syncHistory.filter(
      (entry) =>
        Boolean(
          entry.lastSuccessAt
        )
    ).length


  function updateUrl(
    character:
      GalleryCharacter,
    url:
      string
  ) {

    setSources(
      (current) =>
        current.map(
          (source) =>
            source.character ===
              character
              ? {
                  ...source,
                  url,
                }
              : source
        )
    )


    setTestResults(
      (current) => {

        const next = {
          ...current,
        }


        delete next[
          character
        ]


        return next

      }
    )


    setMessage(
      ''
    )

  }


  async function saveSource(
    source:
      Source
  ) {

    try {

      setSavingCharacter(
        source.character
      )


      setError(
        ''
      )


      setMessage(
        ''
      )


      const response =
        await fetch(
          `/api/gallery-wiki/sources/${source.character}`,
          {
            method:
              'PUT',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                url:
                  source.url,
              }),
          }
        )


      if (
        !response.ok
      ) {

        throw new Error(
          await responseError(
            response,
            'Unable to save Gallery wiki source.'
          )
        )

      }


      setMessage(
        `${source.character} source saved.`
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
          : `Could not save ${source.character}.`
      )

    } finally {

      setSavingCharacter(
        null
      )

    }

  }


  async function testSource(
    source:
      Source
  ) {

    try {

      setTestingCharacter(
        source.character
      )


      setError(
        ''
      )


      setMessage(
        ''
      )


      const response =
        await fetch(
          `/api/gallery-wiki/sources/${source.character}/test`,
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                url:
                  source.url,
              }),
          }
        )


      if (
        !response.ok
      ) {

        throw new Error(
          await responseError(
            response,
            `Unable to test ${source.character}.`
          )
        )

      }


      const data =
        await response.json() as
          SourceTestResult


      setTestResults(
        (current) => ({
          ...current,

          [source.character]:
            data,
        })
      )

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
          : `Unable to test ${source.character}.`
      )

    } finally {

      setTestingCharacter(
        null
      )

    }

  }


  async function runSync(
    character:
      GalleryCharacter
  ) {

    setSyncProgress(
      (current) => ({
        ...current,

        [character]: {
          percent:
            0,

          message:
            `Starting ${character} image import...`,
        },
      })
    )


    const startResponse =
      await fetch(
        `/api/gallery-wiki/sync/${character}/start`,
        {
          method:
            'POST',
        }
      )


    if (
      !startResponse.ok
    ) {

      throw new Error(
        await responseError(
          startResponse,
          `Unable to start ${character} image import.`
        )
      )

    }


    const started =
      await startResponse.json() as {
        jobId: string
      }


    while (
      true
    ) {

      await new Promise<void>(
        (resolve) => {

          window.setTimeout(
            resolve,
            750
          )

        }
      )


      const statusResponse =
        await fetch(
          `/api/gallery-wiki/sync/${started.jobId}`
        )


      if (
        !statusResponse.ok
      ) {

        throw new Error(
          'Unable to read image import progress.'
        )

      }


      const job =
        await statusResponse.json() as
          SyncJob


      setSyncProgress(
        (current) => ({
          ...current,

          [character]: {
            percent:
              job.progress.percent,

            message:
              job.progress.message,
          },
        })
      )


      if (
        job.status ===
        'error'
      ) {

        throw new Error(
          job.error ??
          `${character} image import failed.`
        )

      }


      if (
        job.status ===
        'complete'
      ) {

        if (
          job.result
        ) {

          setSyncResults(
            (current) => ({
              ...current,

              [character]:
                job.result as
                  SyncResult,
            })
          )

        }


        return job.result

      }

    }

  }


  async function syncCharacter(
    character:
      GalleryCharacter
  ) {

    try {

      setSyncingCharacter(
        character
      )


      setError(
        ''
      )


      setMessage(
        ''
      )


      await runSync(
        character
      )


      setMessage(
        `${character} Gallery sync completed.`
      )


      await loadSources()

    } catch (
      syncError
    ) {

      console.error(
        syncError
      )


      setError(
        syncError instanceof
          Error
          ? syncError.message
          : `${character} image import failed.`
      )


      await loadSources()

    } finally {

      setSyncingCharacter(
        null
      )

    }

  }


  async function syncAllCharacters() {

    try {

      setSyncingAll(
        true
      )


      setError(
        ''
      )


      setMessage(
        ''
      )


      let failed =
        0


      for (
        const source
        of sources
      ) {

        setSyncingCharacter(
          source.character
        )


        try {

          await runSync(
            source.character
          )

        } catch (
          syncError
        ) {

          failed +=
            1


          console.error(
            `${source.character} Gallery sync failed:`,
            syncError
          )

        }

      }


      await loadSources()


      if (
        failed ===
        0
      ) {

        setMessage(
          'All Gallery character syncs completed.'
        )

      } else {

        setError(
          `${failed} Gallery character sync${failed === 1 ? '' : 's'} failed. Review the character status below.`
        )

      }

    } finally {

      setSyncingCharacter(
        null
      )


      setSyncingAll(
        false
      )

    }

  }


  async function restoreDefaults() {

    const confirmed =
      window.confirm(
        'Restore all Gallery wiki source URLs to the DeepSpace Archive defaults?\n\n' +
        'Existing downloaded Gallery images and sync history will not be deleted.'
      )


    if (
      !confirmed
    ) {

      return

    }


    try {

      setRestoringDefaults(
        true
      )


      setError(
        ''
      )


      setMessage(
        ''
      )


      const response =
        await fetch(
          '/api/gallery-wiki/sources/restore-defaults',
          {
            method:
              'POST',
          }
        )


      if (
        !response.ok
      ) {

        throw new Error(
          await responseError(
            response,
            'Unable to restore Gallery wiki defaults.'
          )
        )

      }


      const data =
        await response.json() as {
          sources: Source[]
        }


      setSources(
        data.sources
      )


      setTestResults(
        {}
      )


      setMessage(
        'Default Gallery wiki sources restored.'
      )

    } catch (
      restoreError
    ) {

      console.error(
        restoreError
      )


      setError(
        restoreError instanceof
          Error
          ? restoreError.message
          : 'Unable to restore Gallery wiki defaults.'
      )

    } finally {

      setRestoringDefaults(
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
            to={returnTo}
            className="back-button"
          >
            ‹
          </Link>


          <div>

            <span className="archive-eyebrow">
              SETTINGS
            </span>


            <h1>
              Gallery Wiki Sources
            </h1>

          </div>

        </header>


        <section className="archive-feedback-panel">
          Loading Gallery wiki sources...
        </section>

      </main>

    )

  }


  return (

    <main className="archive-page">

      <header className="archive-page-header">

        <Link
          to={returnTo}
          className="back-button"
        >
          ‹
        </Link>


        <div>

          <span className="archive-eyebrow">
            SETTINGS
          </span>


          <h1>
            Gallery Wiki Sources
          </h1>

        </div>

      </header>


      <section className="gallery-source-settings gallery-source-settings-consistency">

        <section className="gallery-source-overview">

          <div>

            <span className="archive-eyebrow">
              MEMORY IMAGES
            </span>


            <h2>
              Character Source Pages
            </h2>


            <p>
              These URLs are used to import full-size
              Memory artwork into your local Gallery.
              You can test or customize each source
              without changing application code.
            </p>

          </div>


          <div className="gallery-source-overview-actions">

            <button
              type="button"
              className="catalog-primary-button"
              disabled={
                syncingAll ||
                syncingCharacter !==
                  null ||
                sources.length ===
                  0
              }
              onClick={() =>
                void syncAllCharacters()
              }
            >
              {syncingAll
                ? 'Syncing All...'
                : 'Sync All'}
            </button>


            <button
              type="button"
              className="catalog-secondary-button"
              disabled={
                restoringDefaults ||
                syncingAll ||
                syncingCharacter !==
                  null
              }
              onClick={() =>
                void restoreDefaults()
              }
            >
              {restoringDefaults
                ? 'Restoring...'
                : 'Restore Defaults'}
            </button>


            <Link
              to="/gallery"
              className="gallery-source-gallery-link"
            >
              Open Gallery
            </Link>

          </div>

        </section>


        <div className="gallery-source-summary">

          <div>

            <span>
              SOURCES
            </span>


            <strong>
              {sources.length}
            </strong>

          </div>


          <div>

            <span>
              EVER SYNCED
            </span>


            <strong>
              {successfulSyncs}
              {' / '}
              {sources.length}
            </strong>

          </div>


          <div>

            <span>
              ACTIVE SYNC
            </span>


            <strong>
              {syncingCharacter ??
                'None'}
            </strong>

          </div>

        </div>


        {message && (

          <div className="settings-status-message gallery-source-success">
            ✓ {message}
          </div>

        )}


        {error && (

          <div className="settings-status-message settings-status-error">
            {error}
          </div>

        )}


        <div className="gallery-source-list gallery-source-list-consistency">

          {sources.map(
            (source) => {

              const history =
                historyByCharacter.get(
                  source.character
                )


              const test =
                testResults[
                  source.character
                ]


              const result =
                syncResults[
                  source.character
                ]


              const isDefault =
                source.url.trim() ===
                (
                  defaultByCharacter.get(
                    source.character
                  ) ??
                  ''
                ).trim()


              const currentlySyncing =
                syncingCharacter ===
                source.character


              const synced =
                Boolean(
                  result &&
                  result.failed ===
                    0 &&
                  result.localCount ===
                    result.discovered
                )


              return (

                <article
                  key={
                    source.character
                  }
                  className="gallery-source-card"
                >

                  <div className="gallery-source-card-header">

                    <div>

                      <span className="archive-eyebrow">
                        CHARACTER
                      </span>


                      <h3>
                        {source.character}
                      </h3>

                    </div>


                    <div className="gallery-source-card-badges">

                      <span
                        className={
                          isDefault
                            ? 'gallery-source-badge default'
                            : 'gallery-source-badge custom'
                        }
                      >
                        {isDefault
                          ? 'DEFAULT'
                          : 'CUSTOM'}
                      </span>


                      {synced && (

                        <span className="gallery-source-badge synced">
                          ✓ SYNCED
                        </span>

                      )}

                    </div>

                  </div>


                  <label className="gallery-source-url-field">

                    <span>
                      SOURCE URL
                    </span>


                    <input
                      type="url"
                      value={
                        source.url
                      }
                      onChange={(event) =>
                        updateUrl(
                          source.character,
                          event.target.value
                        )
                      }
                    />

                  </label>


                  <div className="gallery-source-actions gallery-source-actions-consistency">

                    <button
                      type="button"
                      className="catalog-secondary-button"
                      disabled={
                        testingCharacter !==
                          null ||
                        savingCharacter !==
                          null ||
                        syncingAll ||
                        syncingCharacter !==
                          null
                      }
                      onClick={() =>
                        void testSource(
                          source
                        )
                      }
                    >
                      {testingCharacter ===
                        source.character
                        ? 'Testing...'
                        : 'Test Source'}
                    </button>


                    <button
                      type="button"
                      className="catalog-secondary-button"
                      disabled={
                        savingCharacter !==
                          null ||
                        syncingAll ||
                        syncingCharacter !==
                          null
                      }
                      onClick={() =>
                        void saveSource(
                          source
                        )
                      }
                    >
                      {savingCharacter ===
                        source.character
                        ? 'Saving...'
                        : 'Save Source'}
                    </button>


                    <button
                      type="button"
                      className="catalog-primary-button"
                      disabled={
                        syncingAll ||
                        syncingCharacter !==
                          null
                      }
                      onClick={() =>
                        void syncCharacter(
                          source.character
                        )
                      }
                    >
                      {currentlySyncing
                        ? 'Syncing...'
                        : result
                          ? 'Resync'
                          : 'Sync Images'}
                    </button>

                  </div>


                  {test && (

                    <div
                      className={
                        test.ok
                          ? 'gallery-source-test-result success'
                          : 'gallery-source-test-result failure'
                      }
                    >

                      <strong>
                        {test.ok
                          ? '✓ Source reachable'
                          : 'Source returned an error'}
                      </strong>


                      <span>
                        HTTP {test.status}
                        {test.statusText
                          ? ` ${test.statusText}`
                          : ''}
                        {test.contentType
                          ? ` · ${test.contentType}`
                          : ''}
                      </span>

                    </div>

                  )}


                  {syncProgress[
                    source.character
                  ] && (

                    <div className="gallery-source-progress">

                      <div className="catalog-wiki-progress-header">

                        <strong>
                          {
                            syncProgress[
                              source.character
                            ]?.percent
                          }
                          %
                        </strong>


                        <span>
                          {
                            syncProgress[
                              source.character
                            ]?.message
                          }
                        </span>

                      </div>


                      <div
                        className="catalog-wiki-progress-track"
                        role="progressbar"
                        aria-valuemin={
                          0
                        }
                        aria-valuemax={
                          100
                        }
                        aria-valuenow={
                          syncProgress[
                            source.character
                          ]?.percent ??
                          0
                        }
                      >

                        <div
                          className="catalog-wiki-progress-fill"
                          style={{
                            width:
                              `${syncProgress[
                                source.character
                              ]?.percent ?? 0}%`,
                          }}
                        />

                      </div>

                    </div>

                  )}


                  <div className="gallery-source-history">

                    <div>

                      <span>
                        LAST SUCCESS
                      </span>


                      <strong>
                        {formatDate(
                          history?.lastSuccessAt ??
                          null
                        )}
                      </strong>

                    </div>


                    <div>

                      <span>
                        LAST ATTEMPT
                      </span>


                      <strong>
                        {formatDate(
                          history?.lastAttemptAt ??
                          null
                        )}
                      </strong>

                    </div>


                    {result && (

                      <div>

                        <span>
                          LAST RESULT
                        </span>


                        <strong>
                          {result.localCount}
                          {' local / '}
                          {result.discovered}
                          {' wiki'}
                        </strong>

                      </div>

                    )}

                  </div>


                  {history?.lastError && (

                    <div className="gallery-source-last-error">
                      Last sync error: {history.lastError}
                    </div>

                  )}

                </article>

              )

            }
          )}

        </div>


        <section className="gallery-source-notes">

          <span className="archive-eyebrow">
            SYNC BEHAVIOR
          </span>


          <h2>
            Local-first Gallery storage
          </h2>


          <p>
            Sync downloads full-size wiki images into
            Gallery/&lt;Character&gt;/Memory Images.
            Existing local files are skipped, so
            resyncing does not redownload artwork you
            already have. Restoring source defaults
            never removes downloaded images.
          </p>

        </section>

      </section>

    </main>

  )

}


export default GalleryWikiSettingsPage