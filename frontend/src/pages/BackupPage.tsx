import { useState } from 'react'
import { Link } from 'react-router-dom'


type RestorePreview = {
  valid: boolean
  backupVersion: number | null
  applicationSchemaVersion: number | null
  catalogSchemaVersion: number | null
  catalogPresent: boolean
  createdAt: string | null
  counts: {
    archiveState: number
    playlists: number
    metadata: number
    thumbnails: number
    catalogItems: number
    catalogFileMatches: number
    catalogMemoryLinks: number
  }
  media: {
    matched: number
    missing: number
    conflicts: number
  }
  missingFiles: string[]
  conflicts: string[]
  warnings: string[]
}


type CatalogRestoreResult = {
  safetyBackup: string | null
  items: {
    created: number
    existing: number
  }
  fileMatches: {
    added: number
    existing: number
  }
  memoryLinks: {
    added: number
    existing: number
  }
}


type RestoreResult = {
  success: true
  mode: 'merge'
  safetyBackup: string
  archiveState: {
    created: number
    merged: number
  }
  playlists: {
    created: number
    merged: number
    itemsAdded: number
  }
  metadata: {
    restored: number
    alreadyCurrent: number
    conflictsSkipped: number
    missingMediaSkipped: number
  }
  thumbnails: {
    restored: number
    existingSkipped: number
    missingMediaSkipped: number
  }
  catalog: CatalogRestoreResult | null
}


async function responseError(
  response: Response,
  fallback: string
) {
  const body = await response
    .json()
    .catch(() => null) as { error?: string } | null

  return body?.error ?? fallback
}


function triggerDownload(url: string) {
  const anchor = document.createElement('a')
  anchor.href = url
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}


function formatDate(value: string | null) {
  if (!value) {
    return 'Unknown'
  }

  return new Date(value).toLocaleString()
}


function BackupPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<RestorePreview | null>(null)
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [error, setError] = useState('')


  function chooseFile(file: File | null) {
    setSelectedFile(file)
    setPreview(null)
    setRestoreResult(null)
    setError('')
  }


  async function analyzeBackup() {
    if (!selectedFile) {
      return
    }

    try {
      setAnalyzing(true)
      setError('')
      setPreview(null)
      setRestoreResult(null)

      const formData = new FormData()
      formData.append('backup', selectedFile)

      const response = await fetch(
        '/api/backup/restore-preview',
        {
          method: 'POST',
          body: formData,
        }
      )

      if (!response.ok) {
        throw new Error(
          await responseError(
            response,
            'Unable to analyze backup.'
          )
        )
      }

      setPreview(await response.json() as RestorePreview)

    } catch (analyzeError) {
      console.error(analyzeError)
      setError(
        analyzeError instanceof Error
          ? analyzeError.message
          : 'Unable to analyze backup.'
      )
    } finally {
      setAnalyzing(false)
    }
  }


  async function restoreBackup() {
    if (!selectedFile || !preview?.valid) {
      return
    }

    const confirmed = window.confirm(
      'Merge this backup into DeepSpace Archive?\n\n' +
      'Safety snapshots will be created before database changes. ' +
      'Merge mode preserves current conflicting metadata and artwork, ' +
      'and never replaces or deletes your source media files.'
    )

    if (!confirmed) {
      return
    }

    try {
      setRestoring(true)
      setError('')
      setRestoreResult(null)

      const formData = new FormData()
      formData.append('backup', selectedFile)
      formData.append('mode', 'merge')

      const response = await fetch(
        '/api/backup/restore',
        {
          method: 'POST',
          body: formData,
        }
      )

      if (!response.ok) {
        throw new Error(
          await responseError(
            response,
            'Unable to restore backup.'
          )
        )
      }

      setRestoreResult(await response.json() as RestoreResult)

    } catch (restoreError) {
      console.error(restoreError)
      setError(
        restoreError instanceof Error
          ? restoreError.message
          : 'Unable to restore backup.'
      )
    } finally {
      setRestoring(false)
    }
  }


  return (
    <main className="archive-page">
      <header className="archive-page-header">
        <Link to="/settings" className="back-button">
          ‹
        </Link>

        <div>
          <span className="archive-eyebrow">SETTINGS</span>
          <h1>Backup &amp; Restore</h1>
        </div>
      </header>

      <section className="backup-v2-content">
        <section className="backup-v2-overview">
          <div>
            <span className="archive-eyebrow">ARCHIVE PROTECTION</span>
            <h2>Portable DeepSpace Archive Backups</h2>
            <p>
              Full backups protect application state, playlists, Metadata Catalog
              records and matches, sidecar metadata, and custom artwork. Your
              actual media files are never copied into the backup.
            </p>
          </div>

          <Link
            to="/settings/database"
            className="backup-v2-database-link"
          >
            Database Maintenance
          </Link>
        </section>

        <div className="backup-v2-grid">
          <section className="library-health-panel backup-v2-export-panel">
            <div className="library-health-panel-header">
              <div>
                <span className="archive-eyebrow">RECOMMENDED</span>
                <h2>Full Portable Backup</h2>
              </div>

              <span className="backup-v2-version-badge">FORMAT V2</span>
            </div>

            <p className="backup-v2-description">
              Best choice for normal backups and migration between Windows,
              Docker, and NAS installations.
            </p>

            <div className="backup-v2-includes">
              <span>✓ Watch state, favorites &amp; ratings</span>
              <span>✓ Playlists and playlist order</span>
              <span>✓ Metadata Catalog records</span>
              <span>✓ Catalog file matches</span>
              <span>✓ Archive ↔ Memory relationships</span>
              <span>✓ Sidecar metadata</span>
              <span>✓ Custom thumbnails</span>
              <span>✓ Emergency SQLite copies</span>
            </div>

            <button
              type="button"
              className="backup-primary-button"
              onClick={() => triggerDownload('/api/backup/export-full')}
            >
              Download Full Backup
            </button>

            <p className="backup-v2-footnote">
              Portable file references are stored relative to the media library root.
            </p>
          </section>

          <section className="library-health-panel">
            <div className="library-health-panel-header">
              <div>
                <span className="archive-eyebrow">LIGHTWEIGHT</span>
                <h2>Application State JSON</h2>
              </div>
            </div>

            <p className="backup-v2-description">
              A small human-readable export of watch state and playlists only.
              It does not contain Metadata Catalog data, sidecars, or custom artwork.
            </p>

            <div className="backup-v2-includes backup-v2-includes-muted">
              <span>✓ Favorites &amp; ratings</span>
              <span>✓ Watch progress &amp; history</span>
              <span>✓ Lifetime play totals</span>
              <span>✓ Playlists</span>
            </div>

            <button
              type="button"
              className="catalog-secondary-button backup-v2-secondary-download"
              onClick={() => triggerDownload('/api/backup/export')}
            >
              Download State JSON
            </button>

            <p className="backup-v2-footnote">
              Restore currently uses the full ZIP format, not this lightweight JSON.
            </p>
          </section>
        </div>

        <section className="library-health-panel backup-v2-restore-panel">
          <div className="library-health-panel-header">
            <div>
              <span className="archive-eyebrow">RESTORE</span>
              <h2>Analyze Before Restoring</h2>
            </div>

            <span className="backup-v2-merge-badge">MERGE ONLY</span>
          </div>

          <p className="backup-v2-description">
            Select a DeepSpace Archive full backup. Analysis is read-only and
            shows version, counts, missing sidecar media, conflicts, and compatibility
            warnings before anything is written.
          </p>

          <div className="backup-v2-file-row">
            <label className="backup-v2-file-picker">
              <input
                type="file"
                accept=".zip,application/zip"
                onChange={(event) =>
                  chooseFile(event.target.files?.[0] ?? null)
                }
              />
              <span>
                {selectedFile ? selectedFile.name : 'Choose full backup ZIP'}
              </span>
            </label>

            <button
              type="button"
              className="catalog-primary-button"
              disabled={!selectedFile || analyzing || restoring}
              onClick={() => void analyzeBackup()}
            >
              {analyzing ? 'Analyzing...' : 'Analyze Backup'}
            </button>
          </div>

          {error && (
            <div className="settings-status-message settings-status-error backup-v2-error">
              {error}
            </div>
          )}

          {preview && (
            <div className="backup-v2-preview">
              <div className="backup-v2-preview-heading">
                <div>
                  <span
                    className={
                      preview.valid
                        ? 'library-health-badge healthy'
                        : 'library-health-badge problem'
                    }
                  >
                    {preview.valid ? 'Valid Backup' : 'Invalid Backup'}
                  </span>
                  <h3>Backup Preview</h3>
                </div>

                <div className="backup-v2-preview-version">
                  <span>Created</span>
                  <strong>{formatDate(preview.createdAt)}</strong>
                </div>
              </div>

              <div className="backup-v2-version-grid">
                <div>
                  <span>FULL BACKUP FORMAT</span>
                  <strong>v{preview.backupVersion ?? '—'}</strong>
                </div>
                <div>
                  <span>APPLICATION SCHEMA</span>
                  <strong>v{preview.applicationSchemaVersion ?? '—'}</strong>
                </div>
                <div>
                  <span>CATALOG SCHEMA</span>
                  <strong>
                    {preview.catalogPresent
                      ? `v${preview.catalogSchemaVersion ?? '—'}`
                      : 'Not included'}
                  </strong>
                </div>
              </div>

              <div className="backup-v2-count-grid">
                <div><strong>{preview.counts.archiveState}</strong><span>State Records</span></div>
                <div><strong>{preview.counts.playlists}</strong><span>Playlists</span></div>
                <div><strong>{preview.counts.catalogItems}</strong><span>Catalog Items</span></div>
                <div><strong>{preview.counts.catalogFileMatches}</strong><span>File Matches</span></div>
                <div><strong>{preview.counts.catalogMemoryLinks}</strong><span>Memory Links</span></div>
                <div><strong>{preview.counts.metadata}</strong><span>Sidecars</span></div>
                <div><strong>{preview.counts.thumbnails}</strong><span>Custom Artwork</span></div>
              </div>

              <div className="backup-v2-media-grid">
                <div><span>SIDECAR MEDIA MATCHED</span><strong>{preview.media.matched}</strong></div>
                <div><span>SIDECAR MEDIA MISSING</span><strong>{preview.media.missing}</strong></div>
                <div><span>SIDECAR CONFLICTS</span><strong>{preview.media.conflicts}</strong></div>
              </div>

              {preview.warnings.length > 0 && (
                <details className="backup-v2-details warning">
                  <summary>
                    {preview.warnings.length} compatibility {preview.warnings.length === 1 ? 'warning' : 'warnings'}
                  </summary>
                  <ul>
                    {preview.warnings.map((warning, index) => (
                      <li key={`${warning}:${index}`}>{warning}</li>
                    ))}
                  </ul>
                </details>
              )}

              {preview.missingFiles.length > 0 && (
                <details className="backup-v2-details">
                  <summary>
                    {preview.missingFiles.length} missing sidecar media {preview.missingFiles.length === 1 ? 'reference' : 'references'}
                  </summary>
                  <ul>
                    {preview.missingFiles.map((file, index) => (
                      <li key={`${file}:${index}`}>{file}</li>
                    ))}
                  </ul>
                </details>
              )}

              {preview.conflicts.length > 0 && (
                <details className="backup-v2-details">
                  <summary>
                    {preview.conflicts.length} sidecar {preview.conflicts.length === 1 ? 'conflict' : 'conflicts'}
                  </summary>
                  <ul>
                    {preview.conflicts.map((conflict, index) => (
                      <li key={`${conflict}:${index}`}>{conflict}</li>
                    ))}
                  </ul>
                </details>
              )}

              <section className="backup-v2-merge-policy">
                <span className="archive-eyebrow">MERGE POLICY</span>
                <h3>Current data is protected.</h3>

                <div>
                  <p>
                    <strong>Archive state:</strong> favorites are combined,
                    lifetime totals keep the higher value, and the newer watch position wins.
                  </p>
                  <p>
                    <strong>Ratings:</strong> an existing current rating is not overwritten by the backup.
                  </p>
                  <p>
                    <strong>Playlists:</strong> current order is preserved and missing backup items are appended.
                  </p>
                  <p>
                    <strong>Sidecars &amp; artwork:</strong> existing local files win; missing files are restored only when their media exists.
                  </p>
                  <p>
                    <strong>Metadata Catalog:</strong> current records and matches are preserved; missing records, matches, and Memory relationships are added.
                  </p>
                </div>

                <button
                  type="button"
                  className="backup-primary-button backup-v2-restore-button"
                  disabled={restoring || analyzing || !preview.valid}
                  onClick={() => void restoreBackup()}
                >
                  {restoring ? 'Restoring...' : 'Merge Restore'}
                </button>
              </section>
            </div>
          )}

          {restoreResult && (
            <section className="backup-v2-success">
              <div className="backup-v2-success-heading">
                <span>✓</span>
                <div>
                  <strong>Restore completed</strong>
                  <p>
                    Current data was merged with the selected backup. Refresh archive pages to see restored state.
                  </p>
                </div>
              </div>

              <div className="backup-v2-result-grid">
                <div><span>STATE CREATED</span><strong>{restoreResult.archiveState.created}</strong></div>
                <div><span>STATE MERGED</span><strong>{restoreResult.archiveState.merged}</strong></div>
                <div><span>PLAYLISTS CREATED</span><strong>{restoreResult.playlists.created}</strong></div>
                <div><span>PLAYLIST ITEMS ADDED</span><strong>{restoreResult.playlists.itemsAdded}</strong></div>
                <div><span>SIDECARS RESTORED</span><strong>{restoreResult.metadata.restored}</strong></div>
                <div><span>ARTWORK RESTORED</span><strong>{restoreResult.thumbnails.restored}</strong></div>
                <div><span>CATALOG ITEMS ADDED</span><strong>{restoreResult.catalog?.items.created ?? 0}</strong></div>
                <div><span>CATALOG MATCHES ADDED</span><strong>{restoreResult.catalog?.fileMatches.added ?? 0}</strong></div>
                <div><span>MEMORY LINKS ADDED</span><strong>{restoreResult.catalog?.memoryLinks.added ?? 0}</strong></div>
              </div>

              <div className="backup-v2-safety-list">
                <div>
                  <span>APPLICATION DATABASE SAFETY COPY</span>
                  <strong>{restoreResult.safetyBackup}</strong>
                </div>

                {restoreResult.catalog?.safetyBackup && (
                  <div>
                    <span>METADATA CATALOG SAFETY COPY</span>
                    <strong>{restoreResult.catalog.safetyBackup}</strong>
                  </div>
                )}
              </div>
            </section>
          )}
        </section>

        <section className="backup-v2-notes">
          <span className="archive-eyebrow">PORTABILITY</span>
          <h2>Designed for library moves</h2>
          <p>
            Full backups do not restore an absolute media-library root. Choose the
            library folder for the new Windows, Docker, or NAS installation first,
            then analyze and merge the backup against that library.
          </p>
        </section>
      </section>
    </main>
  )
}


export default BackupPage