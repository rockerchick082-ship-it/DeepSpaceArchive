import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Link,
} from 'react-router-dom'


type CoreLibraryStatus = {
  connected: boolean
  libraryRoot: string
  totalMedia: number

  categories: {
    memoria: number
    secretTimes: number
    myths: number
    bond: number
    tenderMoments: number
  }

  characters:
    Record<string, number>

  mediaTypes: {
    video: number
    audio: number
    image: number
  }

  scannedAt: string
}


type ArchiveItemSummary = {
  character?: string | null

  mediaType?:
    | 'video'
    | 'audio'
    | 'image'
}


type ArchiveResponse = {
  count: number
  items: ArchiveItemSummary[]
}


type MainStoryResponse = {
  branchCount: number
  chapterCount: number
  partCount: number
}


type GalleryItemSummary = {
  character: string | null
}


type GalleryResponse = {
  connected: boolean
  count: number
  items: GalleryItemSummary[]
}


type ExtendedLibraryStatus = {
  connected: boolean
  libraryRoot: string
  totalMedia: number

  categories: {
    mainStory: number
    memoria: number
    secretTimes: number
    myths: number
    bond: number
    tenderMoments: number
    phoneCalls: number
    phoneVideos: number
    illusio: number
    gallery: number
  }

  characters:
    Record<string, number>

  mediaTypes: {
    video: number
    audio: number
    image: number
  }

  scannedAt: string
  warnings: string[]
}


type SupplementalSource = {
  key:
    | 'phoneCalls'
    | 'phoneVideos'
    | 'illusio'

  label: string
  endpoint: string
}


const supplementalSources:
  SupplementalSource[] = [
    {
      key:
        'phoneCalls',

      label:
        'Phone Calls',

      endpoint:
        '/api/library/phone-calls',
    },

    {
      key:
        'phoneVideos',

      label:
        'Phone Videos',

      endpoint:
        '/api/library/phone-videos',
    },

    {
      key:
        'illusio',

      label:
        'Illusio',

      endpoint:
        '/api/library/illusio',
    },
  ]


async function fetchJson<T>(
  endpoint:
    string,
  fallback:
    string
) {

  const response =
    await fetch(
      endpoint
    )


  if (
    !response.ok
  ) {

    throw new Error(
      fallback
    )

  }


  return (
    await response.json()
  ) as T

}


function addCharacter(
  counts:
    Record<string, number>,
  character:
    string | null | undefined
) {

  const normalized =
    character?.trim()


  if (
    !normalized
  ) {

    return

  }


  counts[
    normalized
  ] =
    (
      counts[
        normalized
      ] ??
      0
    ) +
    1

}


function addMediaType(
  counts:
    ExtendedLibraryStatus['mediaTypes'],
  mediaType:
    ArchiveItemSummary['mediaType']
) {

  if (
    mediaType ===
      'video'
  ) {

    counts.video +=
      1

  }


  if (
    mediaType ===
      'audio'
  ) {

    counts.audio +=
      1

  }


  if (
    mediaType ===
      'image'
  ) {

    counts.image +=
      1

  }

}


async function fetchLibraryStatus():
  Promise<ExtendedLibraryStatus> {

  const [
    coreResult,
    phoneCallsResult,
    phoneVideosResult,
    illusioResult,
    mainStoryResult,
    galleryResult,
  ] =
    await Promise.allSettled([
      fetchJson<CoreLibraryStatus>(
        '/api/library-health/status',
        'Unable to load core library status.'
      ),

      fetchJson<ArchiveResponse>(
        '/api/library/phone-calls',
        'Unable to scan Phone Calls.'
      ),

      fetchJson<ArchiveResponse>(
        '/api/library/phone-videos',
        'Unable to scan Phone Videos.'
      ),

      fetchJson<ArchiveResponse>(
        '/api/library/illusio',
        'Unable to scan Illusio.'
      ),

      fetchJson<MainStoryResponse>(
        '/api/library/main-story',
        'Unable to scan Main Story.'
      ),

      fetchJson<GalleryResponse>(
        '/api/gallery',
        'Unable to scan Gallery.'
      ),
    ])


  if (
    coreResult.status ===
    'rejected'
  ) {

    throw coreResult.reason

  }


  const core =
    coreResult.value


  const warnings:
    string[] = []


  const categories:
    ExtendedLibraryStatus[
      'categories'
    ] = {
      mainStory:
        0,

      memoria:
        core.categories.memoria,

      secretTimes:
        core.categories.secretTimes,

      myths:
        core.categories.myths,

      bond:
        core.categories.bond,

      tenderMoments:
        core.categories.tenderMoments,

      phoneCalls:
        0,

      phoneVideos:
        0,

      illusio:
        0,

      gallery:
        0,
    }


  const characters = {
    ...core.characters,
  }


  const mediaTypes = {
    ...core.mediaTypes,
  }


  const archiveResults = [
    phoneCallsResult,
    phoneVideosResult,
    illusioResult,
  ]


  archiveResults.forEach(
    (
      result,
      index
    ) => {

      const source =
        supplementalSources[
          index
        ]


      if (
        result.status ===
        'rejected'
      ) {

        warnings.push(
          source.label
        )


        return

      }


      categories[
        source.key
      ] =
        result.value.count


      for (
        const item
        of result.value.items
      ) {

        addCharacter(
          characters,
          item.character
        )


        addMediaType(
          mediaTypes,
          item.mediaType
        )

      }

    }
  )


  if (
    mainStoryResult.status ===
    'fulfilled'
  ) {

    categories.mainStory =
      mainStoryResult
        .value
        .partCount


    /*
     * Main Story parts are playable video story
     * segments in the current archive model.
     */
    mediaTypes.video +=
      mainStoryResult
        .value
        .partCount

  } else {

    warnings.push(
      'Main Story'
    )

  }


  if (
    galleryResult.status ===
    'fulfilled'
  ) {

    categories.gallery =
      galleryResult
        .value
        .count


    mediaTypes.image +=
      galleryResult
        .value
        .count


    for (
      const item
      of galleryResult
        .value
        .items
    ) {

      addCharacter(
        characters,
        item.character
      )

    }

  } else {

    warnings.push(
      'Gallery'
    )

  }


  const totalMedia =
    Object.values(
      categories
    ).reduce(
      (
        total,
        count
      ) =>
        total +
        count,
      0
    )


  return {
    connected:
      core.connected,

    libraryRoot:
      core.libraryRoot,

    totalMedia,

    categories,

    characters,

    mediaTypes,

    scannedAt:
      new Date()
        .toISOString(),

    warnings,
  }

}


function formatScanTime(
  value:
    string
) {

  return new Date(
    value
  ).toLocaleString()

}


function LibraryStatusPage() {

  const [
    status,
    setStatus,
  ] =
    useState<ExtendedLibraryStatus | null>(
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
            await fetchLibraryStatus()


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
              : 'Library status could not be loaded.'
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


  const categoryRows =
    useMemo(
      () => {

        if (
          !status
        ) {

          return []

        }


        return [
          [
            'Main Story',
            status.categories
              .mainStory,
          ],

          [
            'Memoria',
            status.categories
              .memoria,
          ],

          [
            'Secret Times',
            status.categories
              .secretTimes,
          ],

          [
            'Myths',
            status.categories
              .myths,
          ],

          [
            'Bond',
            status.categories
              .bond,
          ],

          [
            'Tender Moments',
            status.categories
              .tenderMoments,
          ],

          [
            'Phone Calls',
            status.categories
              .phoneCalls,
          ],

          [
            'Phone Videos',
            status.categories
              .phoneVideos,
          ],

          [
            'Illusio',
            status.categories
              .illusio,
          ],

          [
            'Gallery',
            status.categories
              .gallery,
          ],
        ] as
          Array<
            [
              string,
              number,
            ]
          >

      },
      [
        status,
      ]
    )


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
              Library Status
            </h1>

          </div>

        </header>


        <section className="archive-feedback-panel">
          Scanning archive...
        </section>

      </main>

    )

  }


  if (
    error ||
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
              Library Status
            </h1>

          </div>

        </header>


        <section className="archive-feedback-panel">

          <span className="archive-feedback-kicker">
            UNAVAILABLE
          </span>


          <h2>
            Library status could not be loaded.
          </h2>


          <p>
            {error ||
              'Unable to scan the configured media library.'}
          </p>


          <div className="library-status-error-actions">

            <button
              type="button"
              className="archive-feedback-button"
              onClick={() =>
                void loadStatus()
              }
            >
              Retry
            </button>


            <Link
              to="/settings/file-locations"
              className="archive-feedback-button library-status-link-button"
            >
              Check File Locations
            </Link>

          </div>

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
            Library Status
          </h1>

        </div>

      </header>


      <section className="library-status-content library-status-consistency">

        {status.warnings.length >
          0 && (

          <div className="archive-state-warning">

            <span>

              The main library is connected, but these
              sections could not be scanned:
              {' '}

              {status.warnings.join(
                ', '
              )}

              .

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


        <section className="library-health-panel">

          <div className="library-health-panel-header">

            <div>

              <span className="archive-eyebrow">
                LIBRARY
              </span>


              <h2>
                Connection
              </h2>

            </div>


            <span
              className={
                status.connected
                  ? 'library-health-badge healthy'
                  : 'library-health-badge problem'
              }
            >
              {status.connected
                ? 'Connected'
                : 'Unavailable'}
            </span>

          </div>


          <div className="library-path-display library-path-display-consistency">

            <div>

              <span>
                MEDIA LIBRARY ROOT
              </span>


              <strong>
                {status.libraryRoot}
              </strong>

            </div>


            <Link
              to="/settings/file-locations"
              className="library-path-manage-link"
            >
              Manage Location
            </Link>

          </div>

        </section>


        <section className="library-summary-grid library-summary-grid-consistency">

          <div className="library-summary-card">

            <span>
              TOTAL MEDIA
            </span>


            <strong>
              {status.totalMedia}
            </strong>


            <small>
              Across all scanned sections
            </small>

          </div>


          <div className="library-summary-card">

            <span>
              VIDEO
            </span>


            <strong>
              {status.mediaTypes.video}
            </strong>


            <small>
              Playable video files
            </small>

          </div>


          <div className="library-summary-card">

            <span>
              AUDIO
            </span>


            <strong>
              {status.mediaTypes.audio}
            </strong>


            <small>
              Playable audio files
            </small>

          </div>


          <div className="library-summary-card">

            <span>
              IMAGE
            </span>


            <strong>
              {status.mediaTypes.image}
            </strong>


            <small>
              Gallery images
            </small>

          </div>

        </section>


        <section className="library-health-panel">

          <div className="library-health-panel-header">

            <div>

              <span className="archive-eyebrow">
                ARCHIVE
              </span>


              <h2>
                Sections
              </h2>

            </div>


            <span className="library-section-count">
              {categoryRows.length}
              {' tracked'}
            </span>

          </div>


          <div className="library-count-list library-count-list-expanded">

            {categoryRows.map(
              (
                [
                  label,
                  count,
                ]
              ) => (

                <div
                  key={
                    label
                  }
                >

                  <span>
                    {label}
                  </span>


                  <strong>
                    {count}
                  </strong>

                </div>

              )
            )}

          </div>

        </section>


        <section className="library-health-panel">

          <div className="library-health-panel-header">

            <div>

              <span className="archive-eyebrow">
                COLLECTION
              </span>


              <h2>
                Characters
              </h2>

            </div>

          </div>


          {Object.keys(
            status.characters
          ).length ===
          0 ? (

            <div className="metadata-health-empty">
              No character information was detected.
            </div>

          ) : (

            <div className="library-character-grid">

              {Object.entries(
                status.characters
              )
                .sort(
                  (
                    [
                      characterA,
                    ],
                    [
                      characterB,
                    ]
                  ) =>
                    characterA.localeCompare(
                      characterB
                    )
                )
                .map(
                  (
                    [
                      character,
                      count,
                    ]
                  ) => (

                    <div
                      className="library-character-card"
                      key={
                        character
                      }
                    >

                      <span>
                        {character}
                      </span>


                      <strong>
                        {count}
                      </strong>

                    </div>

                  )
                )}

            </div>

          )}

        </section>


        <div className="library-scan-footer library-scan-footer-consistency">

          <div>

            <span>
              LAST SCANNED
            </span>


            <strong>
              {formatScanTime(
                status.scannedAt
              )}
            </strong>

          </div>


          <button
            type="button"
            className="library-rescan-button"
            disabled={
              refreshing
            }
            onClick={() =>
              void loadStatus(
                true
              )
            }
          >
            {refreshing
              ? 'Scanning...'
              : 'Rescan Library'}
          </button>

        </div>

      </section>

    </main>

  )

}


export default LibraryStatusPage