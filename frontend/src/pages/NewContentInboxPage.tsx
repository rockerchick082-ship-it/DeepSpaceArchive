import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Link,
} from 'react-router-dom'

import type {
  CatalogItem,
} from '../features/catalog/catalogTypes'


type InboxFileStatus =
  | 'present'
  | 'missing'
  | 'stale'
  | 'unknown'


type InboxItem = {
  id: number
  catalogItemId: number
  discoveredAt: string
  item: CatalogItem
  fileStatus: InboxFileStatus
  matchedPaths: string[]
}


type InboxResponse = {
  libraryConfigured: boolean
  summary: {
    total: number
    present: number
    missing: number
    stale: number
    unknown: number
  }
  items: InboxItem[]
}


type StatusFilter =
  | 'All'
  | InboxFileStatus


function formatDate(
  value: string | null
) {
  if (!value) {
    return 'Unknown'
  }

  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value
  }

  return date
    .toLocaleDateString()
}


function formatDateTime(
  value: string
) {
  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value
  }

  return date
    .toLocaleString()
}


function statusLabel(
  status: InboxFileStatus
) {
  if (
    status ===
      'present'
  ) {
    return 'Present on NAS'
  }

  if (
    status ===
      'stale'
  ) {
    return 'Stale match'
  }

  if (
    status ===
      'unknown'
  ) {
    return 'Match not verified'
  }

  return 'Missing from archive'
}


function NewContentInboxPage() {
  const [
    inbox,
    setInbox,
  ] = useState<InboxResponse | null>(
    null
  )

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    refreshing,
    setRefreshing,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')

  const [
    actionError,
    setActionError,
  ] = useState('')

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<StatusFilter>(
    'All'
  )

  const [
    characterFilter,
    setCharacterFilter,
  ] = useState('All')

  const [
    categoryFilter,
    setCategoryFilter,
  ] = useState('All')

  const [
    searchText,
    setSearchText,
  ] = useState('')

  const [
    dismissingId,
    setDismissingId,
  ] = useState<number | null>(
    null
  )

  const [
    dismissingAll,
    setDismissingAll,
  ] = useState(false)


  const loadInbox =
    useCallback(
      async (
        refresh = false
      ) => {
        try {
          if (refresh) {
            setRefreshing(true)
          } else {
            setLoading(true)
          }

          const response =
            await fetch(
              '/api/catalog/inbox'
            )

          if (!response.ok) {
            const body =
              await response.json()
                .catch(
                  () => null
                ) as {
                  error?: string
                } | null

            throw new Error(
              body?.error ??
              'Unable to load new content.'
            )
          }

          const data =
            await response.json() as
              InboxResponse

          setInbox(data)
          setError('')
        } catch (
          loadError
        ) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Unable to load new content.'
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
            void loadInbox()
          },
          0
        )

      return () => {
        window.clearTimeout(
          timeoutId
        )
      }
    },
    [loadInbox]
  )


  const characters =
    useMemo(
      () => [
        ...new Set(
          inbox?.items
            .map(
              (entry) =>
                entry.item.character
                  ?.trim() ??
                ''
            )
            .filter(Boolean) ??
          []
        ),
      ].sort(
        (left, right) =>
          left.localeCompare(
            right
          )
      ),
      [inbox]
    )


  const categories =
    useMemo(
      () => [
        ...new Set(
          inbox?.items
            .map(
              (entry) =>
                entry.item.category
            ) ??
          []
        ),
      ].sort(
        (left, right) =>
          left.localeCompare(
            right
          )
      ),
      [inbox]
    )


  const filteredItems =
    useMemo(
      () => {
        const normalizedSearch =
          searchText
            .trim()
            .toLocaleLowerCase()

        return inbox?.items.filter(
          (entry) => {
            if (
              statusFilter !==
                'All' &&
              entry.fileStatus !==
                statusFilter
            ) {
              return false
            }

            if (
              characterFilter !==
                'All' &&
              entry.item.character !==
                characterFilter
            ) {
              return false
            }

            if (
              categoryFilter !==
                'All' &&
              entry.item.category !==
                categoryFilter
            ) {
              return false
            }

            if (
              normalizedSearch &&
              ![
                entry.item.canonicalName,
                entry.item.character ?? '',
                entry.item.category,
                entry.item.subcategory ?? '',
                entry.item.source ?? '',
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
        ) ?? []
      },
      [
        categoryFilter,
        characterFilter,
        inbox,
        searchText,
        statusFilter,
      ]
    )


  async function dismissItem(
    catalogItemId: number
  ) {
    try {
      setDismissingId(
        catalogItemId
      )
      setActionError('')

      const response =
        await fetch(
          `/api/catalog/inbox/${catalogItemId}/dismiss`,
          {
            method: 'POST',
          }
        )

      if (!response.ok) {
        throw new Error(
          'Unable to dismiss this item.'
        )
      }

      await loadInbox(true)
    } catch (
      dismissError
    ) {
      setActionError(
        dismissError instanceof Error
          ? dismissError.message
          : 'Unable to dismiss this item.'
      )
    } finally {
      setDismissingId(null)
    }
  }


  async function dismissAll() {
    if (
      !inbox ||
      inbox.summary.total ===
        0
    ) {
      return
    }

    if (
      !window.confirm(
        `Dismiss all ${inbox.summary.total} new-content items? They will not reappear unless the catalog record is deleted and discovered again.`
      )
    ) {
      return
    }

    try {
      setDismissingAll(true)
      setActionError('')

      const response =
        await fetch(
          '/api/catalog/inbox/dismiss-all',
          {
            method: 'POST',
          }
        )

      if (!response.ok) {
        throw new Error(
          'Unable to dismiss the inbox.'
        )
      }

      await loadInbox(true)
    } catch (
      dismissError
    ) {
      setActionError(
        dismissError instanceof Error
          ? dismissError.message
          : 'Unable to dismiss the inbox.'
      )
    } finally {
      setDismissingAll(false)
    }
  }


  if (
    loading
  ) {
    return (
      <main className="archive-page new-content-inbox-page">
        <header className="archive-page-header">
          <Link
            to="/settings"
            className="back-button"
          >
            ‹
          </Link>

          <div>
            <span className="archive-eyebrow">
              METADATA
            </span>

            <h1>
              New Content Inbox
            </h1>
          </div>
        </header>

        <section className="new-content-empty">
          Loading newly discovered catalog records...
        </section>
      </main>
    )
  }


  return (
    <main className="archive-page new-content-inbox-page">
      <header className="archive-page-header">
        <Link
          to="/settings"
          className="back-button"
        >
          ‹
        </Link>

        <div>
          <span className="archive-eyebrow">
            METADATA
          </span>

          <h1>
            New Content Inbox
          </h1>
        </div>
      </header>


      <section className="new-content-intro">
        <div>
          <span className="archive-eyebrow">
            SINCE YOUR WIKI SYNCS
          </span>

          <h2>
            Newly discovered archive records
          </h2>

          <p>
            Only records first created by a metadata sync appear here.
            Existing catalog records are not retroactively marked new.
          </p>
        </div>

        <div className="new-content-intro-actions">
          <button
            type="button"
            onClick={() =>
              void loadInbox(true)
            }
            disabled={refreshing}
          >
            {refreshing
              ? 'Refreshing...'
              : 'Refresh'}
          </button>

          <Link to="/settings/catalog">
            Run Catalog Sync
          </Link>
        </div>
      </section>


      {error && (
        <div className="settings-status-message settings-status-error">
          {error}
        </div>
      )}


      {actionError && (
        <div className="settings-status-message settings-status-error">
          {actionError}
        </div>
      )}


      {inbox && (
        <>
          <section className="new-content-summary-grid">
            <button
              type="button"
              className={
                statusFilter ===
                  'All'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setStatusFilter('All')
              }
            >
              <strong>
                {inbox.summary.total}
              </strong>
              <span>New</span>
            </button>

            <button
              type="button"
              className={
                statusFilter ===
                  'missing'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setStatusFilter('missing')
              }
            >
              <strong>
                {inbox.summary.missing}
              </strong>
              <span>Missing</span>
            </button>

            <button
              type="button"
              className={
                statusFilter ===
                  'present'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setStatusFilter('present')
              }
            >
              <strong>
                {inbox.summary.present}
              </strong>
              <span>Present</span>
            </button>

            <button
              type="button"
              className={
                statusFilter ===
                  'stale'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setStatusFilter('stale')
              }
            >
              <strong>
                {inbox.summary.stale}
              </strong>
              <span>Stale Match</span>
            </button>
          </section>


          {!inbox.libraryConfigured &&
           inbox.summary.unknown > 0 && (
            <div className="settings-status-message">
              {inbox.summary.unknown} matched item(s) cannot be verified because the media library path is not configured.
            </div>
          )}


          <section className="new-content-toolbar">
            <input
              type="search"
              value={searchText}
              onChange={(event) =>
                setSearchText(
                  event.target.value
                )
              }
              placeholder="Search new content..."
            />

            <select
              value={characterFilter}
              onChange={(event) =>
                setCharacterFilter(
                  event.target.value
                )
              }
            >
              <option value="All">
                All characters
              </option>

              {characters.map(
                (character) => (
                  <option
                    key={character}
                    value={character}
                  >
                    {character}
                  </option>
                )
              )}
            </select>

            <select
              value={categoryFilter}
              onChange={(event) =>
                setCategoryFilter(
                  event.target.value
                )
              }
            >
              <option value="All">
                All categories
              </option>

              {categories.map(
                (category) => (
                  <option
                    key={category}
                    value={category}
                  >
                    {category}
                  </option>
                )
              )}
            </select>

            <button
              type="button"
              className="new-content-dismiss-all"
              disabled={
                dismissingAll ||
                inbox.summary.total ===
                  0
              }
              onClick={() =>
                void dismissAll()
              }
            >
              {dismissingAll
                ? 'Dismissing...'
                : 'Dismiss All'}
            </button>
          </section>


          {inbox.summary.total ===
            0 ? (
            <section className="new-content-empty">
              <strong>
                You are caught up.
              </strong>

              <p>
                The next wiki or phone sync that discovers a brand-new catalog record will place it here automatically.
              </p>

              <Link to="/settings/catalog">
                Open Metadata Catalog
              </Link>
            </section>
          ) : filteredItems.length ===
              0 ? (
            <section className="new-content-empty">
              No new items match the current filters.
            </section>
          ) : (
            <section className="new-content-list">
              {filteredItems.map(
                (entry) => (
                  <article
                    key={entry.id}
                    className={`new-content-row new-content-status-${entry.fileStatus}`}
                  >
                    <div className="new-content-row-main">
                      <div className="new-content-row-heading">
                        <div>
                          <span className="archive-eyebrow">
                            {entry.item.character ??
                              'Archive'}
                            {' · '}
                            {entry.item.category}
                          </span>

                          <h3>
                            {entry.item.canonicalName}
                          </h3>
                        </div>

                        <span className="new-content-status-badge">
                          {statusLabel(
                            entry.fileStatus
                          )}
                        </span>
                      </div>

                      <div className="new-content-meta">
                        <span>
                          Discovered {formatDateTime(entry.discoveredAt)}
                        </span>

                        <span>
                          Released {formatDate(entry.item.releaseDate)}
                        </span>

                        {entry.item.subcategory && (
                          <span>
                            {entry.item.subcategory}
                          </span>
                        )}
                      </div>

                      {entry.fileStatus ===
                        'stale' &&
                       entry.matchedPaths.length >
                        0 && (
                        <details className="new-content-stale-paths">
                          <summary>
                            Show stale matched path
                            {entry.matchedPaths.length === 1
                              ? ''
                              : 's'}
                          </summary>

                          {entry.matchedPaths.map(
                            (relativePath) => (
                              <code key={relativePath}>
                                {relativePath}
                              </code>
                            )
                          )}
                        </details>
                      )}
                    </div>

                    <div className="new-content-row-actions">
                      <Link
                        to={`/search?q=${encodeURIComponent(entry.item.canonicalName)}`}
                      >
                        Search Archive
                      </Link>

                      {entry.item.sourceUrl && (
                        <a
                          href={entry.item.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Wiki Source
                        </a>
                      )}

                      <button
                        type="button"
                        disabled={
                          dismissingId ===
                            entry.catalogItemId
                        }
                        onClick={() =>
                          void dismissItem(
                            entry.catalogItemId
                          )
                        }
                      >
                        {dismissingId ===
                          entry.catalogItemId
                          ? 'Dismissing...'
                          : 'Dismiss'}
                      </button>
                    </div>
                  </article>
                )
              )}
            </section>
          )}
        </>
      )}
    </main>
  )
}


export default NewContentInboxPage
