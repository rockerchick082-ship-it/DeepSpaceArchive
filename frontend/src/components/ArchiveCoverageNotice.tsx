import {
  useEffect,
  useState,
} from 'react'

import {
  Link,
} from 'react-router-dom'


type CategoryCoverage = {
  key: string
  label: string
  expected: number
  present: number
  missing: number
  stale: number
  percent: number | null
}


type MissingCoverageItem = {
  id: number
  title: string
  character?: string | null
  categoryKey: string
  status: 'missing' | 'stale'
}


type CompletenessResponse = {
  categories?: CategoryCoverage[]
  missingItems?: MissingCoverageItem[]
}


let cachedReport: CompletenessResponse | null = null
let reportPromise: Promise<CompletenessResponse> | null = null


async function loadReport() {
  if (cachedReport) return cachedReport

  if (!reportPromise) {
    reportPromise = fetch('/api/catalog/completeness')
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load archive coverage.')
        return await response.json() as CompletenessResponse
      })
      .then((result) => {
        cachedReport = result
        return result
      })
      .finally(() => {
        reportPromise = null
      })
  }

  return await reportPromise
}


function ArchiveCoverageNotice({
  category,
}: {
  category: string
}) {
  const [coverage, setCoverage] = useState<CategoryCoverage | null>(null)
  const [missingItems, setMissingItems] = useState<MissingCoverageItem[]>([])

  useEffect(() => {
    let cancelled = false

    void loadReport()
      .then((report) => {
        if (cancelled) return

        const wanted = category.trim().toLocaleLowerCase()
        const found = (report.categories ?? []).find((item) =>
          item.label.toLocaleLowerCase() === wanted ||
          item.key.toLocaleLowerCase() === wanted ||
          (wanted === 'phone call' && item.key === 'phone-call') ||
          (wanted === 'phone video' && item.key === 'phone-video') ||
          (wanted === 'illusio kindle' && item.key === 'illusio')
        ) ?? null

        setCoverage(found)
        setMissingItems(
          found
            ? (report.missingItems ?? []).filter(
                (item) => item.categoryKey === found.key
              )
            : []
        )
      })
      .catch(() => {
        // Coverage is supplemental and should not block browsing.
      })

    return () => {
      cancelled = true
    }
  }, [category])

  if (!coverage || coverage.expected === 0) return null

  const issues = coverage.missing + coverage.stale

  return (
    <section className={`archive-coverage-notice ${issues > 0 ? 'has-missing' : 'complete'}`}>
      <Link
        to={`/settings/completeness?category=${encodeURIComponent(coverage.key)}`}
        className="archive-coverage-notice-summary"
      >
        <strong>
          {coverage.percent === null ? '—' : `${coverage.percent.toFixed(coverage.percent % 1 === 0 ? 0 : 1)}%`} archived
        </strong>
        <span>
          {coverage.present} of {coverage.expected} expected
          {issues > 0 ? ` · ${coverage.missing} missing${coverage.stale ? ` · ${coverage.stale} stale` : ''}` : ' · complete'}
        </span>
        <span>View coverage ›</span>
      </Link>

      {missingItems.length > 0 && (
        <details className="archive-coverage-missing-list">
          <summary>
            Missing from this archive ({missingItems.length})
          </summary>
          <div>
            {missingItems.slice(0, 8).map((item) => (
              <span key={item.id} className={item.status === 'stale' ? 'stale' : 'missing'}>
                {item.character ? `${item.character} · ` : ''}{item.title}
                {item.status === 'stale' ? ' · stale file link' : ''}
              </span>
            ))}
            {missingItems.length > 8 && (
              <Link to={`/settings/completeness?category=${encodeURIComponent(coverage.key)}`}>
                +{missingItems.length - 8} more…
              </Link>
            )}
          </div>
        </details>
      )}
    </section>
  )
}


export default ArchiveCoverageNotice
