import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Link,
} from 'react-router-dom'


type Coverage = {
  expected: number
  present: number
  missing: number
  stale: number
  localFiles: number
  unmatchedLocal: number
  percent: number | null
}


type CategoryCoverage =
  Coverage & {
    key: string
    label: string
  }


type CharacterCoverage =
  Coverage & {
    character: string
  }


type MissingItem = {
  id: number
  title: string
  canonicalName: string
  character: string | null
  categoryKey: string
  category: string
  releaseDate: string | null
  sourceUrl: string | null
  status: 'missing' | 'stale'
  stalePaths: string[]
}


type UnmatchedLocalItem = {
  title: string
  character: string
  categoryKey: string
  category: string
  relativePath: string
  mediaType:
    | 'video'
    | 'audio'
    | 'image'
    | 'other'
}


type CompletenessResponse = {
  connected: boolean
  libraryRoot: string
  catalogReady: boolean
  overall: Coverage
  categories: CategoryCoverage[]
  characters: CharacterCoverage[]
  missingItems: MissingItem[]
  unmatchedLocalItems: UnmatchedLocalItem[]
  warnings: string[]
  generatedAt: string
}


function formatPercent(
  value: number | null
) {
  if (
    value === null
  ) {
    return '—'
  }

  return `${value.toFixed(
    value % 1 === 0
      ? 0
      : 1
  )}%`
}


function formatReleaseDate(
  value: string | null
) {
  if (
    !value
  ) {
    return null
  }

  const parsed =
    new Date(value)

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return value
  }

  return parsed.toLocaleDateString()
}


function formatGeneratedAt(
  value: string
) {
  return new Date(value)
    .toLocaleString()
}


function ProgressBar({
  value,
}: {
  value: number | null
}) {
  const safeValue =
    value === null
      ? 0
      : Math.max(
          0,
          Math.min(
            100,
            value
          )
        )

  return (
    <div
      className="completeness-progress"
      aria-label={
        value === null
          ? 'No expected catalog items'
          : `${formatPercent(value)} complete`
      }
    >
      <span
        style={{
          width:
            `${safeValue}%`,
        }}
      />
    </div>
  )
}


function ArchiveCompletenessPage() {
  const [
    report,
    setReport,
  ] =
    useState<CompletenessResponse | null>(
      null
    )

  const [
    loading,
    setLoading,
  ] =
    useState(true)

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false)

  const [
    error,
    setError,
  ] =
    useState('')

  const [
    selectedCharacter,
    setSelectedCharacter,
  ] =
    useState('All')

  const [
    selectedCategory,
    setSelectedCategory,
  ] =
    useState('All')

  const [
    searchText,
    setSearchText,
  ] =
    useState('')


  const loadReport =
    useCallback(
      async (
        refresh = false
      ) => {
        try {
          if (
            refresh
          ) {
            setRefreshing(true)
          } else {
            setLoading(true)
          }

          const response =
            await fetch(
              '/api/catalog/completeness'
            )

          if (
            !response.ok
          ) {
            const body =
              await response.json()
                .catch(
                  () => null
                ) as {
                  error?: string
                } | null

            throw new Error(
              body?.error ??
              'Archive completeness could not be loaded.'
            )
          }

          const data =
            await response.json() as
              CompletenessResponse

          setReport(data)
          setError('')
        } catch (
          loadError
        ) {
          console.error(
            loadError
          )

          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Archive completeness could not be loaded.'
          )
        } finally {
          setLoading(false)
          setRefreshing(false)
        }
      },
      []
    )


  useEffect(
    () => {
      const timeoutId =
        window.setTimeout(
          () => {
            void loadReport()
          },
          0
        )

      return () => {
        window.clearTimeout(
          timeoutId
        )
      }
    },
    [loadReport]
  )


  const visibleCategories =
    useMemo(
      () =>
        report?.categories.filter(
          (category) =>
            category.expected > 0 ||
            category.localFiles > 0
        ) ??
        [],
      [report]
    )


  const normalizedSearch =
    searchText
      .trim()
      .toLocaleLowerCase()


  const filteredMissingItems =
    useMemo(
      () => {
        if (
          !report
        ) {
          return []
        }

        return report.missingItems.filter(
          (item) => {
            if (
              selectedCharacter !==
                'All' &&
              item.character !==
                selectedCharacter
            ) {
              return false
            }

            if (
              selectedCategory !==
                'All' &&
              item.categoryKey !==
                selectedCategory
            ) {
              return false
            }

            if (
              normalizedSearch &&
              ![
                item.title,
                item.character ?? '',
                item.category,
                item.canonicalName,
              ]
                .join(' ')
                .toLocaleLowerCase()
                .includes(
                  normalizedSearch
                )
            ) {
              return false
            }

            return true
          }
        )
      },
      [
        normalizedSearch,
        report,
        selectedCategory,
        selectedCharacter,
      ]
    )


  const filteredUnmatchedItems =
    useMemo(
      () => {
        if (
          !report
        ) {
          return []
        }

        return report.unmatchedLocalItems.filter(
          (item) => {
            if (
              selectedCharacter !==
                'All' &&
              item.character !==
                selectedCharacter
            ) {
              return false
            }

            if (
              selectedCategory !==
                'All' &&
              item.categoryKey !==
                selectedCategory
            ) {
              return false
            }

            if (
              normalizedSearch &&
              ![
                item.title,
                item.character,
                item.category,
                item.relativePath,
              ]
                .join(' ')
                .toLocaleLowerCase()
                .includes(
                  normalizedSearch
                )
            ) {
              return false
            }

            return true
          }
        )
      },
      [
        normalizedSearch,
        report,
        selectedCategory,
        selectedCharacter,
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
              LIBRARY
            </span>

            <h1>
              Archive Completeness
            </h1>
          </div>
        </header>

        <section className="completeness-loading">
          Comparing your catalog with the NAS archive...
        </section>
      </main>
    )
  }


  if (
    error ||
    !report
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
              LIBRARY
            </span>

            <h1>
              Archive Completeness
            </h1>
          </div>
        </header>

        <section className="settings-status-error">
          <strong>
            Unable to build completeness report
          </strong>

          <span>
            {error}
          </span>

          <button
            type="button"
            className="library-rescan-button"
            onClick={() =>
              void loadReport()
            }
          >
            Try Again
          </button>
        </section>
      </main>
    )
  }


  return (
    <main className="archive-page">
      <header className="archive-page-header completeness-header">
        <Link
          to="/settings"
          className="back-button"
        >
          ‹
        </Link>

        <div>
          <span className="archive-eyebrow">
            LIBRARY
          </span>

          <h1>
            Archive Completeness
          </h1>

          <p>
            Compare wiki-synced archive metadata with the audio and video files actually present on your NAS.
          </p>
        </div>
      </header>


      <section className="completeness-content">
        <div className="completeness-toolbar">
          <div>
            <span className="archive-eyebrow">
              COVERAGE REPORT
            </span>

            <h2>
              {report.overall.expected > 0
                ? `${report.overall.present} of ${report.overall.expected} expected items present`
                : 'No archive expectations are synced yet'}
            </h2>

            <p>
              Main Story and Gallery are not included because they do not currently have a wiki-backed expected-item catalog. A file only counts as present when its catalog match points to a file that still exists on the NAS.
            </p>
          </div>

          <div className="completeness-toolbar-actions">
            <Link
              to="/settings/catalog"
            >
              Metadata Catalog
            </Link>

            <button
              type="button"
              disabled={
                refreshing
              }
              onClick={() =>
                void loadReport(true)
              }
            >
              {refreshing
                ? 'Scanning...'
                : 'Rescan'}
            </button>
          </div>
        </div>


        {!report.catalogReady ? (
          <section className="completeness-empty-catalog">
            <strong>
              Sync the Metadata Catalog first
            </strong>

            <p>
              Completeness needs the wiki catalog to know what media should exist. Your local files are still scanned, but there is nothing to compare them against yet.
            </p>

            <Link
              to="/settings/catalog"
            >
              Open Metadata Catalog
            </Link>
          </section>
        ) : null}


        <section className="completeness-summary-grid">
          <article className="completeness-summary-card completeness-summary-primary">
            <span>
              OVERALL COVERAGE
            </span>

            <strong>
              {formatPercent(
                report.overall.percent
              )}
            </strong>

            <ProgressBar
              value={
                report.overall.percent
              }
            />

            <small>
              {report.overall.present}
              {' present · '}
              {report.overall.expected}
              {' expected'}
            </small>
          </article>

          <article className="completeness-summary-card">
            <span>
              MISSING MEDIA
            </span>

            <strong>
              {report.overall.missing}
            </strong>

            <small>
              {report.overall.stale > 0
                ? `${report.overall.stale} have stale file links`
                : 'No stale catalog links detected'}
            </small>
          </article>

          <article className="completeness-summary-card">
            <span>
              LOCAL MEDIA
            </span>

            <strong>
              {report.overall.localFiles}
            </strong>

            <small>
              Audio/video/image files in catalog-backed sections
            </small>
          </article>

          <article className="completeness-summary-card">
            <span>
              UNMATCHED LOCAL
            </span>

            <strong>
              {report.overall.unmatchedLocal}
            </strong>

            <small>
              Present on the NAS but not linked to catalog metadata
            </small>
          </article>
        </section>


        <section className="completeness-panel">
          <div className="completeness-panel-heading">
            <div>
              <span className="archive-eyebrow">
                ARCHIVE SECTIONS
              </span>

              <h2>
                Coverage by category
              </h2>
            </div>

            <span>
              {visibleCategories.length}
              {' tracked'}
            </span>
          </div>

          <div className="completeness-category-grid">
            {visibleCategories.map(
              (category) => (
                <button
                  type="button"
                  className={
                    selectedCategory ===
                    category.key
                      ? 'completeness-coverage-card selected'
                      : 'completeness-coverage-card'
                  }
                  key={
                    category.key
                  }
                  onClick={() =>
                    setSelectedCategory(
                      selectedCategory ===
                        category.key
                        ? 'All'
                        : category.key
                    )
                  }
                >
                  <div className="completeness-coverage-card-title">
                    <strong>
                      {category.label}
                    </strong>

                    <span>
                      {formatPercent(
                        category.percent
                      )}
                    </span>
                  </div>

                  <ProgressBar
                    value={
                      category.percent
                    }
                  />

                  <small>
                    {category.present}
                    {' / '}
                    {category.expected}
                    {' present'}

                    {category.unmatchedLocal > 0
                      ? ` · ${category.unmatchedLocal} unmatched local`
                      : ''}
                  </small>
                </button>
              )
            )}
          </div>
        </section>


        <section className="completeness-panel">
          <div className="completeness-panel-heading">
            <div>
              <span className="archive-eyebrow">
                CHARACTERS
              </span>

              <h2>
                Coverage by character
              </h2>
            </div>

            <span>
              {report.characters.length}
              {' detected'}
            </span>
          </div>

          <div className="completeness-character-grid">
            {report.characters.map(
              (character) => (
                <button
                  type="button"
                  className={
                    selectedCharacter ===
                    character.character
                      ? 'completeness-character-card selected'
                      : 'completeness-character-card'
                  }
                  key={
                    character.character
                  }
                  onClick={() =>
                    setSelectedCharacter(
                      selectedCharacter ===
                        character.character
                        ? 'All'
                        : character.character
                    )
                  }
                >
                  <div>
                    <strong>
                      {character.character}
                    </strong>

                    <span>
                      {formatPercent(
                        character.percent
                      )}
                    </span>
                  </div>

                  <ProgressBar
                    value={
                      character.percent
                    }
                  />

                  <small>
                    {character.present}
                    {' / '}
                    {character.expected}
                    {' present'}
                  </small>
                </button>
              )
            )}
          </div>
        </section>


        <section className="completeness-panel completeness-missing-panel">
          <div className="completeness-panel-heading">
            <div>
              <span className="archive-eyebrow">
                GAPS
              </span>

              <h2>
                Missing media
              </h2>
            </div>

            <span>
              {filteredMissingItems.length}
              {' shown'}
            </span>
          </div>

          <div className="completeness-filters">
            <select
              value={
                selectedCharacter
              }
              onChange={
                (event) =>
                  setSelectedCharacter(
                    event.target.value
                  )
              }
            >
              <option value="All">
                All characters
              </option>

              {report.characters.map(
                (character) => (
                  <option
                    key={
                      character.character
                    }
                    value={
                      character.character
                    }
                  >
                    {character.character}
                  </option>
                )
              )}
            </select>

            <select
              value={
                selectedCategory
              }
              onChange={
                (event) =>
                  setSelectedCategory(
                    event.target.value
                  )
              }
            >
              <option value="All">
                All categories
              </option>

              {visibleCategories.map(
                (category) => (
                  <option
                    key={
                      category.key
                    }
                    value={
                      category.key
                    }
                  >
                    {category.label}
                  </option>
                )
              )}
            </select>

            <input
              type="search"
              value={
                searchText
              }
              placeholder="Search missing or unmatched media..."
              onChange={
                (event) =>
                  setSearchText(
                    event.target.value
                  )
              }
            />

            {(selectedCharacter !== 'All' ||
              selectedCategory !== 'All' ||
              searchText) ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedCharacter('All')
                  setSelectedCategory('All')
                  setSearchText('')
                }}
              >
                Clear
              </button>
            ) : null}
          </div>


          {filteredMissingItems.length ===
          0 ? (
            <div className="completeness-empty-state">
              <strong>
                No missing media in this view
              </strong>

              <span>
                Change the filters to inspect another character or archive section.
              </span>
            </div>
          ) : (
            <div className="completeness-missing-list">
              {filteredMissingItems.map(
                (item) => {
                  const releaseDate =
                    formatReleaseDate(
                      item.releaseDate
                    )

                  return (
                    <article
                      className="completeness-missing-row"
                      key={
                        item.id
                      }
                    >
                      <div className="completeness-missing-main">
                        <div className="completeness-missing-title-row">
                          <strong>
                            {item.title}
                          </strong>

                          <span
                            className={
                              item.status ===
                                'stale'
                                ? 'completeness-status stale'
                                : 'completeness-status missing'
                            }
                          >
                            {item.status ===
                              'stale'
                              ? 'STALE LINK'
                              : 'MISSING'}
                          </span>
                        </div>

                        <div className="completeness-missing-meta">
                          <span>
                            {item.character ??
                              'No character'}
                          </span>

                          <span>
                            {item.category}
                          </span>

                          {releaseDate ? (
                            <span>
                              {releaseDate}
                            </span>
                          ) : null}
                        </div>

                        {item.status ===
                          'stale' &&
                        item.stalePaths[0] ? (
                          <code>
                            {item.stalePaths[0]}
                          </code>
                        ) : null}
                      </div>

                      <div className="completeness-missing-actions">
                        {item.sourceUrl ? (
                          <a
                            href={
                              item.sourceUrl
                            }
                            target="_blank"
                            rel="noreferrer"
                          >
                            Wiki source ↗
                          </a>
                        ) : null}
                      </div>
                    </article>
                  )
                }
              )}
            </div>
          )}
        </section>


        <section className="completeness-panel completeness-unmatched-panel">
          <details>
            <summary>
              <div>
                <span className="archive-eyebrow">
                  LOCAL FILES
                </span>

                <strong>
                  Unmatched media
                </strong>
              </div>

              <span>
                {filteredUnmatchedItems.length}
              </span>
            </summary>

            <p className="completeness-panel-note">
              These files exist on the NAS but have no catalog link. They are not treated as missing, but matching them can improve the accuracy of the completeness report.
            </p>

            {filteredUnmatchedItems.length ===
            0 ? (
              <div className="completeness-empty-state compact">
                <span>
                  No unmatched local media in this view.
                </span>
              </div>
            ) : (
              <div className="completeness-unmatched-list">
                {filteredUnmatchedItems.map(
                  (item) => (
                    <div
                      className="completeness-unmatched-row"
                      key={
                        `${item.categoryKey}:${item.relativePath}`
                      }
                    >
                      <div>
                        <strong>
                          {item.title}
                        </strong>

                        <span>
                          {item.character}
                          {' · '}
                          {item.category}
                        </span>
                      </div>

                      <code>
                        {item.relativePath}
                      </code>
                    </div>
                  )
                )}
              </div>
            )}
          </details>
        </section>


        {report.warnings.length > 0 ? (
          <section className="completeness-warning-panel">
            <strong>
              Scan warnings
            </strong>

            {report.warnings.map(
              (warning) => (
                <span
                  key={
                    warning
                  }
                >
                  {warning}
                </span>
              )
            )}
          </section>
        ) : null}


        <footer className="completeness-footer">
          <span>
            Generated {
              formatGeneratedAt(
                report.generatedAt
              )
            }
          </span>

          <span>
            Catalog expectations come from your locally synced wiki metadata.
          </span>
        </footer>
      </section>
    </main>
  )
}


export default ArchiveCompletenessPage
