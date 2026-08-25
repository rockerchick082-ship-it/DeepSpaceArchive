import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  Link,
} from 'react-router-dom'


type ThumbnailStatus = {
  generatedCache: {
    path: string
    count: number
    bytes: number
  }

  customArtwork: {
    count: number
    bytes: number
  }

  libraryConnected: boolean

  scannedAt: string
}


type ClearResult = {
  success: boolean
  removedFiles: number
  removedBytes: number
}


function formatBytes(
  bytes:
    number
) {

  if (
    bytes ===
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


async function fetchThumbnailStatus() {

  const response =
    await fetch(
      '/api/thumbnail-maintenance/status'
    )


  if (
    !response.ok
  ) {

    throw new Error(
      'Unable to load thumbnail status.'
    )

  }


  return (
    await response.json()
  ) as ThumbnailStatus

}


function ThumbnailCachePage() {

  const [
    status,
    setStatus,
  ] =
    useState<ThumbnailStatus | null>(
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
    clearing,
    setClearing,
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
    clearResult,
    setClearResult,
  ] =
    useState<ClearResult | null>(
      null
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
            await fetchThumbnailStatus()


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
              : 'Thumbnail information could not be loaded.'
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


  async function clearGeneratedCache() {

    const confirmed =
      window.confirm(
        'Clear the generated thumbnail cache?\n\n' +
        'Only disposable generated preview images will be removed. ' +
        'Custom artwork stored beside your media will NOT be deleted. ' +
        'Generated previews are recreated automatically when needed.'
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


      setClearResult(
        null
      )


      const response =
        await fetch(
          '/api/thumbnail-maintenance/clear-generated',
          {
            method:
              'POST',
          }
        )


      const data =
        await response.json() as
          Partial<ClearResult> & {
            error?: string
          }


      if (
        !response.ok
      ) {

        throw new Error(
          data.error ||
          'Unable to clear generated cache.'
        )

      }


      setClearResult(
        data as ClearResult
      )


      await loadStatus(
        true
      )

    } catch (
      clearError
    ) {

      console.error(
        clearError
      )


      setError(
        clearError instanceof
          Error
          ? clearError.message
          : 'Unable to clear generated cache.'
      )

    } finally {

      setClearing(
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
              Thumbnails & Cache
            </h1>

          </div>

        </header>


        <section className="archive-feedback-panel">
          Inspecting thumbnails...
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
              Thumbnails & Cache
            </h1>

          </div>

        </header>


        <section className="archive-feedback-panel">

          <span className="archive-feedback-kicker">
            UNAVAILABLE
          </span>


          <h2>
            Thumbnail information could not be loaded.
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
            Thumbnails & Cache
          </h1>

        </div>

      </header>


      <section className="thumbnail-maintenance-content thumbnail-maintenance-consistency">

        <div className="thumbnail-maintenance-toolbar">

          <div>

            <span className="archive-eyebrow">
              IMAGE STORAGE
            </span>


            <h2>
              Preview Artwork
            </h2>


            <p>
              DeepSpace Archive prefers custom artwork
              and Metadata Catalog artwork. Generated
              video frames are a disposable fallback
              when no linked artwork is available.
            </p>

          </div>


          <button
            type="button"
            disabled={
              refreshing ||
              clearing
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


        {error && (

          <div className="settings-status-message settings-status-error thumbnail-maintenance-error">
            {error}
          </div>

        )}


        <section className="thumbnail-summary-grid thumbnail-summary-grid-consistency">

          <div className="thumbnail-summary-card">

            <span>
              GENERATED CACHE
            </span>


            <strong>
              {status.generatedCache.count}
            </strong>


            <small>
              {formatBytes(
                status.generatedCache.bytes
              )}
            </small>

          </div>


          <div className="thumbnail-summary-card">

            <span>
              CUSTOM ARTWORK
            </span>


            <strong>
              {status.customArtwork.count}
            </strong>


            <small>
              {formatBytes(
                status.customArtwork.bytes
              )}
            </small>

          </div>


          <div className="thumbnail-summary-card">

            <span>
              LIBRARY
            </span>


            <strong
              className={
                status.libraryConnected
                  ? 'thumbnail-status-word healthy'
                  : 'thumbnail-status-word problem'
              }
            >
              {status.libraryConnected
                ? 'Connected'
                : 'Unavailable'}
            </strong>


            <small>
              Media access
            </small>

          </div>

        </section>


        <div className="thumbnail-maintenance-grid">

          <section className="library-health-panel">

            <div className="library-health-panel-header">

              <div>

                <span className="archive-eyebrow">
                  GENERATED CACHE
                </span>


                <h2>
                  Temporary Thumbnails
                </h2>

              </div>


              <span className="thumbnail-cache-size">
                {formatBytes(
                  status.generatedCache.bytes
                )}
              </span>

            </div>


            <p className="thumbnail-maintenance-description">
              These are temporary preview frames
              generated from video files. Clearing
              them can reclaim cache space; previews
              are recreated automatically if a page
              later needs them.
            </p>


            <div className="thumbnail-cache-path">

              <span>
                CACHE LOCATION
              </span>


              <strong>
                {status.generatedCache.path}
              </strong>

            </div>


            <div className="thumbnail-maintenance-action thumbnail-maintenance-action-consistency">

              <div>

                <strong>
                  Clear Generated Cache
                </strong>


                <span>
                  Removes only the
                  {' '}
                  {status.generatedCache.count}
                  {' '}
                  disposable generated preview
                  {status.generatedCache.count ===
                  1
                    ? ''
                    : 's'}.
                </span>

              </div>


              <button
                className="thumbnail-danger-button"
                type="button"
                disabled={
                  clearing ||
                  refreshing ||
                  status.generatedCache.count ===
                    0
                }
                onClick={() =>
                  void clearGeneratedCache()
                }
              >
                {clearing
                  ? 'Clearing...'
                  : 'Clear Generated Cache'}
              </button>

            </div>

          </section>


          <section className="library-health-panel">

            <div className="library-health-panel-header">

              <div>

                <span className="archive-eyebrow">
                  CUSTOM ARTWORK
                </span>


                <h2>
                  Protected Archive Artwork
                </h2>

              </div>


              <span className="thumbnail-cache-size">
                {formatBytes(
                  status.customArtwork.bytes
                )}
              </span>

            </div>


            <p className="thumbnail-maintenance-description">
              Custom thumbnails live beside your
              media and are referenced by archive
              metadata. They are part of your archive,
              not the disposable cache.
            </p>


            <div className="thumbnail-protected-banner">

              <span>
                ✓
              </span>


              <div>

                <strong>
                  Protected from cache cleanup
                </strong>


                <p>
                  Clear Generated Cache never removes
                  these {status.customArtwork.count}
                  {' '}
                  custom artwork
                  {status.customArtwork.count ===
                  1
                    ? ' file'
                    : ' files'}.
                </p>

              </div>

            </div>


            <div className="thumbnail-maintenance-link-row">

              <Link to="/settings/metadata">
                Check Metadata Health
              </Link>


              <Link to="/settings/catalog">
                Open Metadata Catalog
              </Link>

            </div>

          </section>

        </div>


        {clearResult && (

          <section className="thumbnail-clear-result">

            <span>
              ✓
            </span>


            <div>

              <strong>
                Generated cache cleared
              </strong>


              <p>

                Removed{' '}

                {clearResult.removedFiles}

                {' '}

                {clearResult.removedFiles ===
                1
                  ? 'file'
                  : 'files'}

                {' · '}

                {formatBytes(
                  clearResult.removedBytes
                )}

              </p>

            </div>

          </section>

        )}


        <section className="thumbnail-priority-panel">

          <span className="archive-eyebrow">
            DISPLAY PRIORITY
          </span>


          <h2>
            Which artwork does the archive use?
          </h2>


          <div className="thumbnail-priority-flow">

            <div>

              <strong>
                1
              </strong>


              <span>
                Custom thumbnail
              </span>

            </div>


            <span>
              ›
            </span>


            <div>

              <strong>
                2
              </strong>


              <span>
                Metadata Catalog artwork
              </span>

            </div>


            <span>
              ›
            </span>


            <div>

              <strong>
                3
              </strong>


              <span>
                Generated video frame
              </span>

            </div>

          </div>

        </section>


        <div className="library-scan-footer library-scan-footer-consistency">

          <div>

            <span>
              LAST CHECKED
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
              clearing
            }
            onClick={() =>
              void loadStatus(
                true
              )
            }
          >
            {refreshing
              ? 'Refreshing...'
              : 'Refresh Thumbnail Status'}
          </button>

        </div>

      </section>

    </main>

  )

}


export default ThumbnailCachePage