import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Link,
} from 'react-router-dom'

import {
  archiveIndexPlayerUrl,
  fetchArchiveIndex,
} from '../data/archiveIndex'

import type {
  ArchiveIndexItem,
} from '../data/archiveIndex'


type IntegrityItem = {
  relativePath: string
  mediaType: string
  firstSeenAt: string
  lastSeenAt: string
  status: string
  sizeBytes: number
}


type RecentItem = IntegrityItem & {
  archiveItem: ArchiveIndexItem | null
}


function normalize(value: string) {
  return value.replace(/\\/g, '/').toLocaleLowerCase()
}


function formatBytes(bytes: number) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const amount = bytes / Math.pow(1024, index)
  return `${amount >= 10 || index === 0 ? amount.toFixed(0) : amount.toFixed(1)} ${units[index]}`
}


function RecentlyAddedPage() {
  const [items, setItems] = useState<RecentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [days, setDays] = useState(30)
  const [referenceTime] = useState(() => Date.now())

  useEffect(() => {
    let cancelled = false

    void Promise.all([
      fetch('/api/archive-integrity').then(async (response) => {
        if (!response.ok) throw new Error('Unable to load archive file history.')
        return await response.json() as { items?: IntegrityItem[] }
      }),
      fetchArchiveIndex(),
    ])
      .then(([integrity, archive]) => {
        if (cancelled) return

        const archiveItems = archive.items
        const resolved = (integrity.items ?? [])
          .filter((item) => item.status !== 'missing')
          .map((item): RecentItem => {
            const manifestPath = normalize(item.relativePath)
            const match = archiveItems.find((archiveItem) => {
              const relative = normalize(archiveItem.relativePath)
              return manifestPath === relative || manifestPath.endsWith(`/${relative}`)
            }) ?? null

            return {
              ...item,
              archiveItem: match,
            }
          })
          .sort((left, right) =>
            new Date(right.firstSeenAt).getTime() - new Date(left.firstSeenAt).getTime()
          )

        setItems(resolved)
        setError(Object.values(archive.sourceErrors).join(' '))
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load recently added media.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const visible = useMemo(() => {
    const cutoff = referenceTime - days * 24 * 60 * 60 * 1000
    return items.filter((item) => new Date(item.firstSeenAt).getTime() >= cutoff)
  }, [days, items, referenceTime])

  return (
    <main className="archive-page">
      <header className="archive-page-header">
        <Link to="/" className="back-button">‹</Link>
        <div>
          <span className="archive-eyebrow">LIBRARY</span>
          <h1>Recently Imported</h1>
        </div>
      </header>

      <section className="settings-page-content">
        <section className="library-health-panel">
          <div className="library-health-panel-header">
            <div>
              <span className="archive-eyebrow">FIRST SEEN BY ARCHIVE INTEGRITY</span>
              <h2>New local media</h2>
            </div>
            <select value={days} onChange={(event) => setDays(Number(event.target.value))}>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last year</option>
            </select>
          </div>
          <p>
            This is separate from the wiki-driven New Content Inbox. It shows files the integrity scanner first discovered on your NAS.
          </p>
        </section>

        {error && <section className="settings-status-message settings-status-error">{error}</section>}

        {loading ? (
          <section className="archive-feedback-panel">Loading recently imported media…</section>
        ) : visible.length === 0 ? (
          <section className="archive-feedback-panel">
            <h2>No newly discovered files in this period.</h2>
            <p>Run Archive Integrity after adding media so DeepSpace Archive can record when files first appear.</p>
          </section>
        ) : (
          <section className="offline-download-list">
            {visible.map((item) => (
              <article className="offline-download-row" key={item.relativePath}>
                <div>
                  <strong>{item.archiveItem?.title ?? item.relativePath.split('/').pop()}</strong>
                  <span>
                    {[item.archiveItem?.character, item.archiveItem?.archiveCategory, item.mediaType]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                  <code>{item.relativePath}</code>
                  <small>{new Date(item.firstSeenAt).toLocaleString()} · {formatBytes(item.sizeBytes)}</small>
                </div>

                {item.archiveItem && (
                  <Link className="catalog-primary-button" to={archiveIndexPlayerUrl(item.archiveItem)}>
                    Open
                  </Link>
                )}
              </article>
            ))}
          </section>
        )}
      </section>
    </main>
  )
}

export default RecentlyAddedPage
