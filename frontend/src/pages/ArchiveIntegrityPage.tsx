import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Link,
} from 'react-router-dom'


type IntegrityStatus =
  | 'verified'
  | 'unverified'
  | 'modified'
  | 'hash-changed'
  | 'missing'


type IntegrityItem = {
  relativePath: string
  mediaType: string
  status: IntegrityStatus
  sizeBytes: number
  baselineSizeBytes: number
  mtimeMs: number
  baselineMtimeMs: number
  sha256: string | null
  observedSha256: string | null
  verifiedAt: string | null
  firstSeenAt: string
  lastSeenAt: string
}


type DuplicateGroup = {
  sha256: string
  count: number
  sizeBytes: number
  items: string[]
}


type IntegrityJob = {
  id: string
  mode: 'quick' | 'verify'
  status:
    | 'running'
    | 'completed'
    | 'failed'
  startedAt: string
  completedAt: string | null
  total: number
  processed: number
  currentPath: string | null
  error: string | null
  warnings: string[]
}


type IntegrityReport = {
  latestCompletedRun: {
    mode: string
    startedAt: string
    completedAt: string | null
    fileCount: number
  } | null
  summary: {
    tracked: number
    current: number
    verified: number
    unverified: number
    modified: number
    hashChanged: number
    missing: number
    duplicateGroups: number
    duplicateFiles: number
  }
  items: IntegrityItem[]
  duplicates: DuplicateGroup[]
  job: IntegrityJob | null
}


function formatBytes(
  value: number
) {
  if (
    !Number.isFinite(value) ||
    value <= 0
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

  let amount = value
  let unit = 0

  while (
    amount >= 1024 &&
    unit < units.length - 1
  ) {
    amount /= 1024
    unit += 1
  }

  return `${amount.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`
}


function statusLabel(
  status: IntegrityStatus
) {
  switch (status) {
    case 'hash-changed':
      return 'CONTENT CHANGED'
    case 'modified':
      return 'NEEDS VERIFY'
    case 'unverified':
      return 'UNVERIFIED'
    case 'missing':
      return 'MISSING'
    default:
      return 'VERIFIED'
  }
}


function ArchiveIntegrityPage() {
  const [
    report,
    setReport,
  ] = useState<IntegrityReport | null>(
    null
  )

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    error,
    setError,
  ] = useState('')

  const [
    starting,
    setStarting,
  ] = useState(false)

  const [
    filter,
    setFilter,
  ] = useState<IntegrityStatus | 'issues'>(
    'issues'
  )

  const [
    searchText,
    setSearchText,
  ] = useState('')


  const loadReport =
    useCallback(
      async () => {
        try {
          const response =
            await fetch(
              '/api/archive-integrity'
            )

          if (!response.ok) {
            throw new Error(
              'Unable to load archive integrity.'
            )
          }

          const data =
            await response.json() as
              IntegrityReport

          setReport(data)
          setError('')
        } catch (
          loadError
        ) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Unable to load archive integrity.'
          )
        } finally {
          setLoading(false)
        }
      },
      []
    )


  useEffect(
    () => {
      const timer =
        window.setTimeout(
          () => {
            void loadReport()
          },
          0
        )

      return () =>
        window.clearTimeout(timer)
    },
    [loadReport]
  )


  useEffect(
    () => {
      if (
        report?.job?.status !==
        'running'
      ) {
        return
      }

      const interval =
        window.setInterval(
          () => {
            void loadReport()
          },
          1000
        )

      return () =>
        window.clearInterval(
          interval
        )
    },
    [report?.job?.status, loadReport]
  )


  async function startScan(
    mode: 'quick' | 'verify'
  ) {
    try {
      setStarting(true)
      setError('')

      const response =
        await fetch(
          '/api/archive-integrity/scan',
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
            },
            body:
              JSON.stringify({
                mode,
              }),
          }
        )

      const body =
        await response.json()
          .catch(
            () => null
          ) as {
            error?: string
          } | null

      if (!response.ok) {
        throw new Error(
          body?.error ??
          'Unable to start integrity scan.'
        )
      }

      await loadReport()
    } catch (
      scanError
    ) {
      setError(
        scanError instanceof Error
          ? scanError.message
          : 'Unable to start integrity scan.'
      )
    } finally {
      setStarting(false)
    }
  }


  async function acceptChanges() {
    if (
      !window.confirm(
        'Accept the currently verified changed files as the new integrity baseline?'
      )
    ) {
      return
    }

    try {
      const response =
        await fetch(
          '/api/archive-integrity/accept',
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
            },
            body:
              JSON.stringify({}),
          }
        )

      if (!response.ok) {
        throw new Error(
          'Unable to accept integrity changes.'
        )
      }

      await loadReport()
    } catch (
      acceptError
    ) {
      setError(
        acceptError instanceof Error
          ? acceptError.message
          : 'Unable to accept integrity changes.'
      )
    }
  }


  const issueItems =
    useMemo(
      () => {
        if (!report) {
          return []
        }

        const search =
          searchText
            .trim()
            .toLocaleLowerCase()

        return report.items.filter(
          (item) => {
            const matchesStatus =
              filter === 'issues'
                ? item.status !== 'verified'
                : item.status === filter

            return (
              matchesStatus &&
              (
                !search ||
                item.relativePath
                  .toLocaleLowerCase()
                  .includes(search)
              )
            )
          }
        )
      },
      [
        filter,
        report,
        searchText,
      ]
    )


  if (
    loading &&
    !report
  ) {
    return (
      <main className="archive-page">
        <p>
          Loading archive integrity…
        </p>
      </main>
    )
  }


  const job =
    report?.job ??
    null

  const progress =
    job &&
    job.total > 0
      ? Math.round(
          job.processed /
          job.total *
          100
        )
      : 0


  return (
    <main className="archive-page integrity-page">
      <header className="archive-page-header">
        <Link
          to="/settings"
          className="back-button"
        >
          ‹
        </Link>

        <div>
          <span className="archive-eyebrow">
            PRESERVATION
          </span>
          <h1>
            Archive Integrity
          </h1>
        </div>
      </header>

      <section className="integrity-intro">
        <div>
          <h2>
            Verify the files you preserved
          </h2>
          <p>
            Quick Scan checks file presence, size, and modified dates. Full Verify reads each media file and calculates SHA-256 so exact duplicates and content changes can be detected.
          </p>
        </div>

        <div className="integrity-actions">
          <button
            type="button"
            disabled={
              starting ||
              job?.status === 'running'
            }
            onClick={() =>
              void startScan('quick')
            }
          >
            Quick Scan
          </button>
          <button
            type="button"
            className="integrity-primary-button"
            disabled={
              starting ||
              job?.status === 'running'
            }
            onClick={() =>
              void startScan('verify')
            }
          >
            Full SHA-256 Verify
          </button>
        </div>
      </section>

      {error && (
        <section className="settings-status-error">
          {error}
        </section>
      )}

      {job?.status === 'running' && (
        <section className="integrity-job-card">
          <div>
            <strong>
              {job.mode === 'verify'
                ? 'Verifying archive'
                : 'Scanning archive'}
            </strong>
            <span>
              {job.processed} / {job.total || '…'} files · {progress}%
            </span>
          </div>
          <div className="integrity-job-progress">
            <span
              style={{
                width:
                  `${progress}%`,
              }}
            />
          </div>
          {job.currentPath && (
            <code>
              {job.currentPath}
            </code>
          )}
        </section>
      )}

      {report && (
        <>
          <section className="integrity-summary-grid">
            {[
              ['Current', report.summary.current],
              ['Verified', report.summary.verified],
              ['Unverified', report.summary.unverified],
              ['Needs verify', report.summary.modified],
              ['Content changed', report.summary.hashChanged],
              ['Missing', report.summary.missing],
              ['Duplicate sets', report.summary.duplicateGroups],
            ].map(
              ([label, value]) => (
                <div key={label as string}>
                  <strong>
                    {value}
                  </strong>
                  <span>
                    {label}
                  </span>
                </div>
              )
            )}
          </section>

          {report.summary.hashChanged > 0 && (
            <section className="integrity-warning-card">
              <div>
                <strong>
                  {report.summary.hashChanged} file{report.summary.hashChanged === 1 ? '' : 's'} have a different SHA-256 than the saved baseline.
                </strong>
                <p>
                  Review these before accepting them. DeepSpace Archive will never replace the saved baseline automatically when file contents change.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  void acceptChanges()
                }
              >
                Accept verified changes
              </button>
            </section>
          )}

          <section className="integrity-panel">
            <header>
              <div>
                <span className="archive-eyebrow">
                  FILE STATUS
                </span>
                <h2>
                  Files needing attention
                </h2>
              </div>

              <div className="integrity-filters">
                <select
                  value={filter}
                  onChange={(event) =>
                    setFilter(
                      event.target.value as IntegrityStatus | 'issues'
                    )
                  }
                >
                  <option value="issues">
                    All issues
                  </option>
                  <option value="unverified">
                    Unverified
                  </option>
                  <option value="modified">
                    Needs verify
                  </option>
                  <option value="hash-changed">
                    Content changed
                  </option>
                  <option value="missing">
                    Missing
                  </option>
                  <option value="verified">
                    Verified
                  </option>
                </select>
                <input
                  type="search"
                  value={searchText}
                  placeholder="Filter path"
                  onChange={(event) =>
                    setSearchText(
                      event.target.value
                    )
                  }
                />
              </div>
            </header>

            {issueItems.length === 0 ? (
              <p className="integrity-empty">
                Nothing matches this filter.
              </p>
            ) : (
              <div className="integrity-file-list">
                {issueItems.slice(0, 500).map(
                  (item) => (
                    <div
                      key={item.relativePath}
                      className={`integrity-file-row status-${item.status}`}
                    >
                      <div>
                        <strong>
                          {item.relativePath}
                        </strong>
                        <span>
                          {item.mediaType} · {formatBytes(item.sizeBytes)}
                        </span>
                      </div>
                      <span className="integrity-status-badge">
                        {statusLabel(item.status)}
                      </span>
                    </div>
                  )
                )}
              </div>
            )}
          </section>

          <section className="integrity-panel">
            <header>
              <div>
                <span className="archive-eyebrow">
                  EXACT DUPLICATES
                </span>
                <h2>
                  Duplicate hashes
                </h2>
                <p>
                  Files only appear here when their SHA-256 values are identical. Nothing is deleted automatically.
                </p>
              </div>
            </header>

            {report.duplicates.length === 0 ? (
              <p className="integrity-empty">
                No verified duplicate sets found.
              </p>
            ) : (
              <div className="integrity-duplicate-list">
                {report.duplicates.map(
                  (group) => (
                    <details
                      key={group.sha256}
                      className="integrity-duplicate-group"
                    >
                      <summary>
                        <strong>
                          {group.count} identical files
                        </strong>
                        <span>
                          {formatBytes(group.sizeBytes)} each
                        </span>
                      </summary>
                      <code>
                        SHA-256 {group.sha256}
                      </code>
                      <ul>
                        {group.items.map(
                          (relativePath) => (
                            <li key={relativePath}>
                              {relativePath}
                            </li>
                          )
                        )}
                      </ul>
                    </details>
                  )
                )}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  )
}


export default ArchiveIntegrityPage
