import {
  useEffect,
  useState,
} from 'react'

import {
  Link,
} from 'react-router-dom'


type SyncProgress = {
  phase:
    | 'loading-category'
    | 'resolving-images'
    | 'downloading'
    | 'complete'

  current: number
  total: number
  percent: number
  message: string
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


type SyncJob = {
  id: string
  character: string
  status:
    | 'running'
    | 'complete'
    | 'error'

  progress:
    SyncProgress

  result:
    SyncResult | null

  error:
    string | null
}


type GalleryMemoryImageSyncProps = {
  character: string
}


function GalleryMemoryImageSync({
  character,
}: GalleryMemoryImageSyncProps) {

  const storageKey =
    `deepspace-gallery-memory-sync-${character}`


  const [
    lastResult,
    setLastResult,
  ] =
    useState<SyncResult | null>(
      () => {

        const stored =
          localStorage.getItem(
            storageKey
          )


        if (
          !stored
        ) {

          return null

        }


        try {

          return JSON.parse(
            stored
          ) as SyncResult

        } catch {

          return null

        }

      }
    )


  const [
    progress,
    setProgress,
  ] =
    useState<SyncProgress | null>(
      null
    )


  const [
    syncing,
    setSyncing,
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


  useEffect(
    () => {

      if (
        !lastResult
      ) {

        return

      }


      localStorage.setItem(
        storageKey,
        JSON.stringify(
          lastResult
        )
      )

    },
    [
      lastResult,
      storageKey,
    ]
  )


  async function syncImages() {

    try {

      setSyncing(
        true
      )


      setError(
        ''
      )


      setProgress({
        phase:
          'loading-category',

        current:
          0,

        total:
          1,

        percent:
          0,

        message:
          `Starting ${character} image sync...`,
      })


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

        const data =
          await startResponse.json()
            .catch(
              () => null
            ) as
              {
                error?: string
              } |
              null


        throw new Error(
          data?.error ??
          'Unable to start Gallery image sync.'
        )

      }


      const started =
        await startResponse.json() as {
          jobId: string
        }


      let complete =
        false


      while (
        !complete
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
            'Unable to read Gallery sync progress.'
          )

        }


        const job:
          SyncJob =
          await statusResponse.json()


        setProgress(
          job.progress
        )


        if (
          job.status ===
          'error'
        ) {

          throw new Error(
            job.error ??
            'Gallery image sync failed.'
          )

        }


        if (
          job.status ===
          'complete'
        ) {

          complete =
            true


          if (
            job.result
          ) {

            setLastResult(
              job.result
            )

          }

        }

      }

    } catch (syncError) {

      console.error(
        syncError
      )


      setError(
        syncError instanceof
          Error
          ? syncError.message
          : 'Gallery image sync failed.'
      )

    } finally {

      setSyncing(
        false
      )

    }

  }


  const synced =
    Boolean(
      lastResult &&
      lastResult.failed ===
        0 &&
      lastResult.localCount ===
        lastResult.discovered
    )


  return (

    <section className="memory-gallery-sync">

      <div className="memory-gallery-sync-header">

        <div>

          <span className="archive-eyebrow">
            MEMORY IMAGES
          </span>

          <h3>
            Gallery Artwork
          </h3>

        </div>


        <Link
          to="/settings/gallery-wiki"
          className="memory-gallery-settings-button"
          aria-label="Gallery image source settings"
          title="Gallery image source settings"
        >
          ⚙
        </Link>

      </div>


      <div className="memory-gallery-sync-status">

        <div className="memory-gallery-count">

          {synced && (

            <span
              className="memory-gallery-check"
              title="Local image count matches wiki count"
            >
              ✓
            </span>

          )}


          <strong>
            {lastResult
              ? lastResult.localCount
              : '—'}
          </strong>

          <span>
            local images
          </span>

        </div>


        {lastResult && (

          <div className="memory-gallery-remote-count">

            <strong>
              {lastResult.discovered}
            </strong>

            <span>
              wiki images
            </span>

          </div>

        )}


        <button
          type="button"
          className="catalog-primary-button"
          disabled={
            syncing
          }
          onClick={() =>
            void syncImages()
          }
        >
          {syncing
            ? 'Syncing...'
            : lastResult
              ? 'Resync'
              : 'Sync Images'}
        </button>

      </div>


      {progress && (

        <div className="catalog-wiki-progress">

          <div className="catalog-wiki-progress-header">

            <strong>
              {progress.phase ===
                'downloading'
                ? 'Downloading images'
                : progress.phase ===
                    'complete'
                  ? 'Sync complete'
                  : 'Reading wiki'}
            </strong>

            <span>
              {progress.percent}
              %
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
              progress.percent
            }
          >

            <div
              className="catalog-wiki-progress-fill"
              style={{
                width:
                  `${progress.percent}%`,
              }}
            />

          </div>


          <div className="catalog-wiki-progress-message">
            {progress.message}
          </div>

        </div>

      )}


      {error && (

        <div className="settings-status-message settings-status-error">
          {error}
        </div>

      )}

    </section>

  )

}


export default GalleryMemoryImageSync