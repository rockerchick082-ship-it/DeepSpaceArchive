import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  Link,
} from 'react-router-dom'


type MobileBridge = {
  isMobileApp?: () => boolean
  getServerUrl?: () => string
  setServerUrl?: (value: string) => void
  getAppVersion?: () => string
  getOfflineCacheStats?: () => string
  getStorageStats?: () => string
}


type CacheStats = {
  fileCount?: number
  bytes?: number
  newestModified?: number
}


type StorageStats = {
  downloadedCount?: number
  downloadBytes?: number
  availableBytes?: number
  totalBytes?: number
}


function bridge() {
  return (
    window as typeof window & {
      DeepSpaceArchiveMobile?: MobileBridge
    }
  ).DeepSpaceArchiveMobile
}


function formatBytes(value: number | undefined) {
  const bytes = Number(value ?? 0)

  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B'
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  )
  const amount = bytes / Math.pow(1024, index)

  return `${amount >= 10 || index === 0 ? amount.toFixed(0) : amount.toFixed(1)} ${units[index]}`
}


function MobileSettingsPage() {
  const mobileBridge = bridge()

  const [serverUrl, setServerUrl] = useState(
    mobileBridge?.getServerUrl?.() ?? ''
  )
  const [connected, setConnected] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(false)
  const [message, setMessage] = useState('')
  const [cacheStats, setCacheStats] = useState<CacheStats>({})
  const [storageStats, setStorageStats] = useState<StorageStats>({})

  const refreshNativeStats = useCallback(() => {
    try {
      if (mobileBridge?.getOfflineCacheStats) {
        setCacheStats(
          JSON.parse(mobileBridge.getOfflineCacheStats()) as CacheStats
        )
      }

      if (mobileBridge?.getStorageStats) {
        setStorageStats(
          JSON.parse(mobileBridge.getStorageStats()) as StorageStats
        )
      }
    } catch {
      // Native statistics are best-effort only.
    }
  }, [mobileBridge])

  const testConnection = useCallback(async () => {
    if (!mobileBridge) {
      setConnected(false)
      return
    }

    try {
      setChecking(true)
      const response = await fetch('/api/system-info', {
        cache: 'no-store',
      })
      const offline = response.headers.get('X-DeepSpace-Offline') === '1'
      setConnected(response.ok && !offline)
      setMessage(response.ok && !offline
        ? 'Connected to the DeepSpace Archive server.'
        : 'The NAS is not reachable. Cached archive data and downloaded media remain available.')
    } catch {
      setConnected(false)
      setMessage('The NAS is not reachable. Cached archive data and downloaded media remain available.')
    } finally {
      setChecking(false)
      refreshNativeStats()
    }
  }, [mobileBridge, refreshNativeStats])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refreshNativeStats()
      void testConnection()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [refreshNativeStats, testConnection])

  function saveServer() {
    const normalized = serverUrl.trim().replace(/\/+$/, '')

    if (!normalized || !mobileBridge?.setServerUrl) {
      return
    }

    mobileBridge.setServerUrl(normalized)
    setServerUrl(normalized)
    setMessage('Server address saved. Checking connection…')
    void testConnection()
  }

  const cachedAt = cacheStats.newestModified
    ? new Date(cacheStats.newestModified).toLocaleString()
    : 'No cached API data yet'

  return (
    <main className="archive-page">
      <header className="archive-page-header">
        <Link to="/settings" className="back-button">‹</Link>
        <div>
          <span className="archive-eyebrow">ANDROID APP</span>
          <h1>Mobile Connection &amp; Storage</h1>
        </div>
      </header>

      {!mobileBridge ? (
        <section className="archive-feedback-panel">
          <h2>Open this page in the Android app.</h2>
          <p>Native connection, cache, and download controls are only available inside DeepSpace Archive Mobile.</p>
        </section>
      ) : (
        <section className="settings-page-content">
          <section className="library-health-panel">
            <div className="library-health-panel-header">
              <div>
                <span className="archive-eyebrow">CONNECTION</span>
                <h2>Archive Server</h2>
              </div>
              <span className={`library-health-badge ${connected ? 'healthy' : 'problem'}`}>
                {connected === null ? 'Checking' : connected ? 'Connected' : 'Offline'}
              </span>
            </div>

            <label className="settings-field">
              <span>NAS / server address</span>
              <input
                type="url"
                value={serverUrl}
                placeholder="http://192.168.1.50:3000"
                onChange={(event) => setServerUrl(event.target.value)}
              />
            </label>

            <div className="personal-data-actions">
              <button type="button" onClick={saveServer}>Save &amp; Reconnect</button>
              <button type="button" disabled={checking} onClick={() => void testConnection()}>
                {checking ? 'Checking…' : 'Test Connection'}
              </button>
            </div>

            {message && <p>{message}</p>}
          </section>

          <section className="personal-data-summary-grid">
            <div><strong>{mobileBridge.getAppVersion?.() ?? 'Unknown'}</strong><span>App Version</span></div>
            <div><strong>{storageStats.downloadedCount ?? 0}</strong><span>Offline Downloads</span></div>
            <div><strong>{formatBytes(storageStats.downloadBytes)}</strong><span>Download Storage</span></div>
            <div><strong>{formatBytes(storageStats.availableBytes)}</strong><span>Device Space Free</span></div>
            <div><strong>{cacheStats.fileCount ?? 0}</strong><span>Cached API Responses</span></div>
            <div><strong>{formatBytes(cacheStats.bytes)}</strong><span>API Cache Size</span></div>
          </section>

          <section className="library-health-panel">
            <span className="archive-eyebrow">OFFLINE CACHE</span>
            <h2>Cached archive data</h2>
            <p>
              Most recent cached response: <strong>{cachedAt}</strong>. This cache lets the bundled app browse previously loaded archive data while the NAS is unavailable.
            </p>
            <Link to="/offline-downloads" className="catalog-primary-button">
              Manage Offline Downloads
            </Link>
          </section>
        </section>
      )}
    </main>
  )
}


export default MobileSettingsPage
