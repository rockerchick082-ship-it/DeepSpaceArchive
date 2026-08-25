import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Link,
} from 'react-router-dom'


type IssueSeverity =
  | 'error'
  | 'warning'
  | 'info'


type MetadataIssue = {
  type:
    | 'missing-sidecar'
    | 'missing-thumbnail'
    | 'invalid-sidecar'
    | 'orphaned-sidecar'
    | 'orphaned-thumbnail'
    | 'broken-thumbnail-reference'

  severity:
    IssueSeverity

  relativePath:
    string

  message:
    string
}


type MetadataHealth = {
  totalMedia: number
  sidecarMetadata: number
  customThumbnails: number

  mediaWithoutSidecar: number
  mediaWithoutCustomThumbnail: number

  invalidSidecars: number
  orphanedSidecars: number
  orphanedThumbnails: number
  brokenThumbnailReferences: number

  actualProblems: number

  issues: MetadataIssue[]

  scannedAt: string
}


type HealthFilter =
  | 'Problems'
  | 'All'
  | 'Errors'
  | 'Warnings'
  | 'No Metadata'
  | 'No Custom Artwork'


const filters:
  HealthFilter[] = [
    'Problems',
    'All',
    'Errors',
    'Warnings',
    'No Metadata',
    'No Custom Artwork',
  ]


function severityLabel(
  severity:
    IssueSeverity
) {

  if (
    severity ===
    'error'
  ) {

    return 'ERROR'

  }


  if (
    severity ===
    'warning'
  ) {

    return 'WARNING'

  }


  return 'INFO'

}


function issueLabel(
  type:
    MetadataIssue['type']
) {

  switch (
    type
  ) {

    case 'missing-sidecar':

      return 'No Metadata'


    case 'missing-thumbnail':

      return 'No Custom Artwork'


    case 'invalid-sidecar':

      return 'Invalid Sidecar'


    case 'orphaned-sidecar':

      return 'Orphaned Sidecar'


    case 'orphaned-thumbnail':

      return 'Orphaned Artwork'


    case 'broken-thumbnail-reference':

      return 'Broken Artwork Reference'

  }

}


async function fetchMetadataHealth() {

  const response =
    await fetch(
      '/api/library-health/metadata'
    )


  if (
    !response.ok
  ) {

    throw new Error(
      'Unable to check metadata health.'
    )

  }


  return (
    await response.json()
  ) as MetadataHealth

}


function downloadHealthReport(
  health:
    MetadataHealth
) {

  const report = {
    reportType:
      'deepspace-archive-metadata-health',

    createdAt:
      new Date()
        .toISOString(),

    scannedAt:
      health.scannedAt,

    summary: {
      totalMedia:
        health.totalMedia,

      sidecarMetadata:
        health.sidecarMetadata,

      customThumbnails:
        health.customThumbnails,

      mediaWithoutSidecar:
        health.mediaWithoutSidecar,

      mediaWithoutCustomThumbnail:
        health.mediaWithoutCustomThumbnail,

      actualProblems:
        health.actualProblems,

      invalidSidecars:
        health.invalidSidecars,

      orphanedSidecars:
        health.orphanedSidecars,

      orphanedThumbnails:
        health.orphanedThumbnails,

      brokenThumbnailReferences:
        health.brokenThumbnailReferences,
    },

    issues:
      health.issues,
  }


  const blob =
    new Blob(
      [
        JSON.stringify(
          report,
          null,
          2
        ),
      ],
      {
        type:
          'application/json',
      }
    )


  const url =
    URL.createObjectURL(
      blob
    )


  const anchor =
    document.createElement(
      'a'
    )


  anchor.href =
    url


  anchor.download =
    `deepspace-archive-metadata-health-${
      new Date()
        .toISOString()
        .slice(
          0,
          10
        )
    }.json`


  document.body.appendChild(
    anchor
  )


  anchor.click()


  anchor.remove()


  URL.revokeObjectURL(
    url
  )

}


function MetadataHealthPage() {

  const [
    health,
    setHealth,
  ] =
    useState<MetadataHealth | null>(
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


  const [
    selectedFilter,
    setSelectedFilter,
  ] =
    useState<HealthFilter>(
      'Problems'
    )


  const [
    searchText,
    setSearchText,
  ] =
    useState(
      ''
    )


  const loadHealth =
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
            await fetchMetadataHealth()


          setHealth(
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
              : 'Metadata health could not be loaded.'
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

            void loadHealth()

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
      loadHealth,
    ]
  )


  const filteredIssues =
    useMemo(
      () => {

        if (
          !health
        ) {

          return []

        }


        const query =
          searchText
            .trim()
            .toLowerCase()


        return health.issues
          .filter(
            (issue) => {

              if (
                selectedFilter ===
                'Problems'
              ) {

                return (
                  issue.severity ===
                    'error' ||
                  issue.severity ===
                    'warning'
                )

              }


              if (
                selectedFilter ===
                'Errors'
              ) {

                return (
                  issue.severity ===
                  'error'
                )

              }


              if (
                selectedFilter ===
                'Warnings'
              ) {

                return (
                  issue.severity ===
                  'warning'
                )

              }


              if (
                selectedFilter ===
                'No Metadata'
              ) {

                return (
                  issue.type ===
                  'missing-sidecar'
                )

              }


              if (
                selectedFilter ===
                'No Custom Artwork'
              ) {

                return (
                  issue.type ===
                  'missing-thumbnail'
                )

              }


              return true

            }
          )
          .filter(
            (issue) => {

              if (
                !query
              ) {

                return true

              }


              return (
                issue.relativePath
                  .toLowerCase()
                  .includes(
                    query
                  ) ||
                issue.message
                  .toLowerCase()
                  .includes(
                    query
                  ) ||
                issueLabel(
                  issue.type
                )
                  .toLowerCase()
                  .includes(
                    query
                  )
              )

            }
          )

      },
      [
        health,
        searchText,
        selectedFilter,
      ]
    )


  const errorCount =
    health?.issues.filter(
      (issue) =>
        issue.severity ===
        'error'
    ).length ??
    0


  const warningCount =
    health?.issues.filter(
      (issue) =>
        issue.severity ===
        'warning'
    ).length ??
    0


  const infoCount =
    health?.issues.filter(
      (issue) =>
        issue.severity ===
        'info'
    ).length ??
    0


  const hasActiveFilters =
    selectedFilter !==
      'Problems' ||
    searchText.trim() !==
      ''


  function clearFilters() {

    setSelectedFilter(
      'Problems'
    )


    setSearchText(
      ''
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
              Metadata Health
            </h1>

          </div>

        </header>


        <section className="archive-feedback-panel">
          Checking metadata...
        </section>

      </main>

    )

  }


  if (
    error ||
    !health
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
              Metadata Health
            </h1>

          </div>

        </header>


        <section className="archive-feedback-panel">

          <span className="archive-feedback-kicker">
            UNAVAILABLE
          </span>


          <h2>
            Metadata health could not be loaded.
          </h2>


          <p>
            {error ||
              'Unable to scan archive metadata.'}
          </p>


          <button
            type="button"
            className="archive-feedback-button"
            onClick={() =>
              void loadHealth()
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
            Metadata Health
          </h1>

        </div>

      </header>


      <section className="metadata-health-content metadata-health-consistency">

        <div className="metadata-health-toolbar">

          <div>

            <span className="archive-eyebrow">
              ARCHIVE CHECK
            </span>


            <h2>
              Sidecars & Custom Artwork
            </h2>


            <p>
              Errors and warnings indicate files that
              may need attention. Missing sidecars and
              missing custom artwork are optional
              coverage information, not damage.
            </p>

          </div>


          <div className="metadata-health-toolbar-actions">

            <button
              type="button"
              disabled={
                refreshing
              }
              onClick={() =>
                void loadHealth(
                  true
                )
              }
            >
              {refreshing
                ? 'Scanning...'
                : 'Rescan'}
            </button>


            <button
              type="button"
              onClick={() =>
                downloadHealthReport(
                  health
                )
              }
            >
              Export Report
            </button>

          </div>

        </div>


        <section className="metadata-health-summary metadata-health-summary-consistency">

          <div className="metadata-health-card">

            <span>
              MEDIA
            </span>


            <strong>
              {health.totalMedia}
            </strong>


            <small>
              Files inspected
            </small>

          </div>


          <div className="metadata-health-card">

            <span>
              SIDECARS
            </span>


            <strong>
              {health.sidecarMetadata}
            </strong>


            <small>
              Custom metadata files
            </small>

          </div>


          <div className="metadata-health-card">

            <span>
              CUSTOM ART
            </span>


            <strong>
              {health.customThumbnails}
            </strong>


            <small>
              Local custom artwork
            </small>

          </div>


          <div
            className={
              health.actualProblems >
              0
                ? 'metadata-health-card problem'
                : 'metadata-health-card healthy'
            }
          >

            <span>
              ACTUAL PROBLEMS
            </span>


            <strong>
              {health.actualProblems}
            </strong>


            <small>
              Errors + warnings
            </small>

          </div>

        </section>


        <div className="metadata-health-dashboard">

          <section className="library-health-panel">

            <div className="library-health-panel-header">

              <div>

                <span className="archive-eyebrow">
                  HEALTH
                </span>


                <h2>
                  Problems
                </h2>

              </div>

            </div>


            <div className="metadata-problem-grid metadata-problem-grid-consistency">

              <div>

                <span>
                  Errors
                </span>


                <strong>
                  {errorCount}
                </strong>

              </div>


              <div>

                <span>
                  Warnings
                </span>


                <strong>
                  {warningCount}
                </strong>

              </div>


              <div>

                <span>
                  Invalid sidecars
                </span>


                <strong>
                  {health.invalidSidecars}
                </strong>

              </div>


              <div>

                <span>
                  Broken artwork refs
                </span>


                <strong>
                  {health.brokenThumbnailReferences}
                </strong>

              </div>


              <div>

                <span>
                  Orphaned sidecars
                </span>


                <strong>
                  {health.orphanedSidecars}
                </strong>

              </div>


              <div>

                <span>
                  Orphaned artwork
                </span>


                <strong>
                  {health.orphanedThumbnails}
                </strong>

              </div>

            </div>

          </section>


          <section className="library-health-panel">

            <div className="library-health-panel-header">

              <div>

                <span className="archive-eyebrow">
                  OPTIONAL COVERAGE
                </span>


                <h2>
                  Custom Metadata Coverage
                </h2>

              </div>


              <span className="metadata-health-info-count">
                {infoCount}
                {' info'}
              </span>

            </div>


            <div className="metadata-coverage-grid">

              <div>

                <span>
                  Without sidecar
                </span>


                <strong>
                  {health.mediaWithoutSidecar}
                </strong>

              </div>


              <div>

                <span>
                  Without custom artwork
                </span>


                <strong>
                  {health.mediaWithoutCustomThumbnail}
                </strong>

              </div>

            </div>


            <p className="metadata-health-coverage-note">
              These counts do not mean the media is
              broken. Catalog artwork and generated
              thumbnails can still provide archive
              presentation without a custom local
              thumbnail.
            </p>


            <div className="metadata-health-link-row">

              <Link to="/settings/catalog">
                Open Metadata Catalog
              </Link>


              <Link to="/settings/thumbnails">
                Open Thumbnails & Cache
              </Link>

            </div>

          </section>

        </div>


        <section className="library-health-panel">

          <div className="library-health-panel-header metadata-issue-heading">

            <div>

              <span className="archive-eyebrow">
                DETAILS
              </span>


              <h2>
                Issue Report
              </h2>

            </div>


            <span>
              Showing {filteredIssues.length}
              {' of '}
              {health.issues.length}
            </span>

          </div>


          <div className="metadata-health-controls metadata-health-controls-consistency">

            <div className="metadata-health-filters">

              {filters.map(
                (filter) => (

                  <button
                    key={
                      filter
                    }
                    type="button"
                    className={
                      selectedFilter ===
                      filter
                        ? 'filter-button active'
                        : 'filter-button'
                    }
                    onClick={() =>
                      setSelectedFilter(
                        filter
                      )
                    }
                  >
                    {filter}
                  </button>

                )
              )}

            </div>


            <div className="metadata-health-search-row">

              <input
                type="search"
                placeholder="Search paths, issue types, or messages..."
                value={
                  searchText
                }
                onChange={(event) =>
                  setSearchText(
                    event.target.value
                  )
                }
              />


              <button
                type="button"
                disabled={
                  !hasActiveFilters
                }
                onClick={
                  clearFilters
                }
              >
                Clear Filters
              </button>

            </div>

          </div>


          {filteredIssues.length ===
            0 ? (

            <div className="metadata-health-empty metadata-health-empty-consistency">

              <strong>

                {hasActiveFilters
                  ? 'No issues match these filters.'
                  : health.actualProblems ===
                      0
                    ? 'No metadata problems detected.'
                    : 'No issues to display.'}

              </strong>


              <span>

                {hasActiveFilters
                  ? 'Try another filter or clear the current search.'
                  : 'Rescan after changing files or metadata.'}

              </span>


              {hasActiveFilters && (

                <button
                  type="button"
                  className="archive-feedback-button"
                  onClick={
                    clearFilters
                  }
                >
                  Clear Filters
                </button>

              )}

            </div>

          ) : (

            <div className="metadata-issue-list">

              {filteredIssues.map(
                (
                  issue,
                  index
                ) => (

                  <article
                    className={
                      `metadata-issue-row ${issue.severity}`
                    }
                    key={
                      `${issue.type}-${issue.relativePath}-${index}`
                    }
                  >

                    <span
                      className={
                        `metadata-issue-severity ${issue.severity}`
                      }
                    >
                      {severityLabel(
                        issue.severity
                      )}
                    </span>


                    <div className="metadata-issue-copy">

                      <div className="metadata-issue-title-row">

                        <strong>
                          {issueLabel(
                            issue.type
                          )}
                        </strong>


                        <span>
                          {issue.relativePath}
                        </span>

                      </div>


                      <p>
                        {issue.message}
                      </p>

                    </div>

                  </article>

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
              {new Date(
                health.scannedAt
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
              void loadHealth(
                true
              )
            }
          >
            {refreshing
              ? 'Scanning...'
              : 'Rescan Metadata'}
          </button>

        </div>

      </section>

    </main>

  )

}


export default MetadataHealthPage