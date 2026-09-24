import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Link,
} from 'react-router-dom'


type DownloadRecord = {
  relativePath?: string
  status?: string
  title?: string
  character?: string
  category?: string
  fileName?: string
  fileSize?: number
  downloadedAt?: number
}


type StorageStats = {
  downloadedCount?: number
  downloadBytes?: number
  availableBytes?: number
  totalBytes?: number
}

type DownloadBridge = {
  getDownloads?: () => string
  getStorageStats?: () => string

  deleteDownload?: (
    relativePath: string
  ) => boolean
}


function getDownloadBridge() {

  return (
    window as typeof window & {
      DeepSpaceArchiveMobile?:
        DownloadBridge
    }
  ).DeepSpaceArchiveMobile

}


function fallbackTitle(
  item:
    DownloadRecord
) {

  return (
    item.title?.trim() ||
    item.fileName?.trim() ||
    item.relativePath
      ?.split(
        /[\\/]/
      )
      .pop() ||
    'Offline media'
  )

}


function formatBytes(value: number | undefined) {
  const bytes = Number(value ?? 0)
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  )
  const amount = bytes / Math.pow(1024, index)
  return `${amount >= 10 || index === 0 ? amount.toFixed(0) : amount.toFixed(1)} ${units[index]}`
}


function OfflineDownloadsPage() {

  const [
    items,
    setItems,
  ] =
    useState<
      DownloadRecord[]
    >([])


  const [
    selected,
    setSelected,
  ] =
    useState<
      Set<string>
    >(
      new Set()
    )


  const [
    searchText,
    setSearchText,
  ] =
    useState(
      ''
    )


  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    )


  const [
    message,
    setMessage,
  ] =
    useState(
      ''
    )


  const [storageStats, setStorageStats] =
    useState<StorageStats>({})

  const [sortBy, setSortBy] =
    useState<'date' | 'size' | 'title' | 'character'>('date')


  const bridge =
    getDownloadBridge()


  const load =
    useCallback(
      () => {

        if (
          !bridge?.getDownloads
        ) {

          setItems(
            []
          )

          setLoading(
            false
          )

          return

        }


        try {

          const parsed =
            JSON.parse(
              bridge.getDownloads()
            )


          setItems(
            Array.isArray(
              parsed
            )
              ? (
                  parsed as
                    DownloadRecord[]
                )
                  .filter(
                    (item) =>
                      item.status ===
                        'downloaded' &&
                      Boolean(
                        item.relativePath
                      )
                  )
              : []
          )


          if (bridge.getStorageStats) {
            try {
              const storage = JSON.parse(bridge.getStorageStats()) as StorageStats
              setStorageStats(storage)
            } catch {
              setStorageStats({})
            }
          }

          setMessage(
            ''
          )

        } catch {

          setMessage(
            'Unable to read offline downloads from the Android app.'
          )

        } finally {

          setLoading(
            false
          )

        }

      },
      [
        bridge,
      ]
    )


  useEffect(
    () => {

      const timer =
        window.setTimeout(
          load,
          0
        )


      return () =>
        window.clearTimeout(
          timer
        )

    },
    [
      load,
    ]
  )


  const visible =
    useMemo(
      () => {
        const search = searchText.trim().toLocaleLowerCase()

        const filtered = !search
          ? [...items]
          : items.filter((item) =>
              [
                fallbackTitle(item),
                item.character ?? '',
                item.category ?? '',
                item.relativePath ?? '',
              ]
                .join(' ')
                .toLocaleLowerCase()
                .includes(search)
            )

        filtered.sort((first, second) => {
          if (sortBy === 'size') {
            return (second.fileSize ?? 0) - (first.fileSize ?? 0)
          }
          if (sortBy === 'title') {
            return fallbackTitle(first).localeCompare(fallbackTitle(second))
          }
          if (sortBy === 'character') {
            return (first.character ?? '').localeCompare(second.character ?? '') ||
              fallbackTitle(first).localeCompare(fallbackTitle(second))
          }
          return (second.downloadedAt ?? 0) - (first.downloadedAt ?? 0)
        })

        return filtered
      },
      [items, searchText, sortBy]
    )



  function toggle(
    relativePath:
      string
  ) {

    setSelected(
      (current) => {

        const next =
          new Set(
            current
          )


        if (
          next.has(
            relativePath
          )
        ) {

          next.delete(
            relativePath
          )

        } else {

          next.add(
            relativePath
          )

        }


        return next

      }
    )

  }


  function removeOne(
    relativePath:
      string
  ) {

    if (
      !bridge?.deleteDownload
    ) {

      return false

    }


    try {

      return Boolean(
        bridge.deleteDownload(
          relativePath
        )
      )

    } catch {

      return false

    }

  }


  function deleteSelected() {

    if (
      selected.size ===
        0
    ) {

      return

    }


    if (
      !window.confirm(
        `Remove ${selected.size} offline download${selected.size === 1 ? '' : 's'} from this device?`
      )
    ) {

      return

    }


    let removed =
      0


    for (
      const relativePath
      of selected
    ) {

      if (
        removeOne(
          relativePath
        )
      ) {

        removed +=
          1

      }

    }


    setSelected(
      new Set()
    )


    setMessage(
      `Removed ${removed} offline download${removed === 1 ? '' : 's'}.`
    )


    load()

  }


  function deleteAll() {

    if (
      items.length ===
        0
    ) {

      return

    }


    if (
      !window.confirm(
        `Remove all ${items.length} offline downloads from this device?`
      )
    ) {

      return

    }


    let removed =
      0


    for (
      const item
      of items
    ) {

      if (
        item.relativePath &&
        removeOne(
          item.relativePath
        )
      ) {

        removed +=
          1

      }

    }


    setSelected(
      new Set()
    )


    setMessage(
      `Removed ${removed} offline download${removed === 1 ? '' : 's'}.`
    )


    load()

  }

  async function deleteWatched() {
    try {
      const response = await fetch('/api/archive/states')
      if (!response.ok) throw new Error('Unable to load watch state.')
      const data = await response.json() as { items?: Array<{ category: string; relativePath: string; completed: boolean }> }
      const completed = new Set(
        (data.items ?? [])
          .filter((item) => item.completed)
          .map((item) => `${item.category}\u0000${item.relativePath}`)
      )
      const watched = items.filter((item) =>
        Boolean(item.relativePath) && completed.has(`${item.category ?? ''}\u0000${item.relativePath}`)
      )
      if (watched.length === 0) {
        setMessage('No completed downloads are ready to remove.')
        return
      }
      if (!window.confirm(`Remove ${watched.length} completed offline download${watched.length === 1 ? '' : 's'}?`)) return
      let removed = 0
      for (const item of watched) {
        if (item.relativePath && removeOne(item.relativePath)) removed += 1
      }
      setMessage(`Removed ${removed} completed offline download${removed === 1 ? '' : 's'}.`)
      setSelected(new Set())
      load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to remove completed downloads.')
    }
  }



  return (

    <main className="archive-page offline-downloads-page">

      <header className="archive-page-header">

        <Link
          to="/"
          className="back-button"
        >
          ‹
        </Link>


        <div>

          <span className="archive-eyebrow">
            MOBILE
          </span>

          <h1>
            Offline Downloads
          </h1>

        </div>


        <button
          type="button"
          className="library-rescan-button"
          onClick={
            load
          }
        >
          Refresh
        </button>

      </header>


      {!bridge ? (

        <section className="archive-feedback-panel">

          <h2>
            Offline downloads are available in the Android app.
          </h2>

          <p>
            Open this page inside the DeepSpace Archive mobile app to manage downloaded media.
          </p>

        </section>

      ) : loading ? (

        <section className="archive-feedback-panel">
          Loading offline downloads…
        </section>

      ) : (

        <>

          <section className="personal-data-summary-grid offline-storage-summary">
            <div><strong>{items.length}</strong><span>Downloads</span></div>
            <div><strong>{formatBytes(storageStats.downloadBytes)}</strong><span>Used by Downloads</span></div>
            <div><strong>{formatBytes(storageStats.availableBytes)}</strong><span>Device Space Free</span></div>
            <div><strong>{formatBytes(storageStats.totalBytes)}</strong><span>Device Storage</span></div>
          </section>

          <section className="offline-download-toolbar">

            <input
              type="search"
              value={
                searchText
              }
              placeholder="Search downloads…"
              onChange={(event) =>
                setSearchText(
                  event.target.value
                )
              }
            />


            <label className="offline-download-sort">
              <span>Sort</span>
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)}>
                <option value="date">Newest</option>
                <option value="size">Largest</option>
                <option value="title">Title</option>
                <option value="character">Character</option>
              </select>
            </label>

            <button
              type="button"
              onClick={() =>
                setSelected(
                  new Set(
                    visible
                      .map(
                        (item) =>
                          item.relativePath
                      )
                      .filter(
                        (
                          value
                        ): value is
                          string =>
                            Boolean(
                              value
                            )
                      )
                  )
                )
              }
            >
              Select Visible
            </button>


            <button
              type="button"
              onClick={() =>
                setSelected(
                  new Set()
                )
              }
            >
              Clear
            </button>


            <button
              type="button"
              disabled={
                selected.size ===
                  0
              }
              onClick={
                deleteSelected
              }
            >
              Delete Selected ({selected.size})
            </button>


            <button
              type="button"
              disabled={items.length === 0}
              onClick={() => void deleteWatched()}
            >
              Remove Watched
            </button>

            <button
              type="button"
              className="offline-download-danger"
              disabled={
                items.length ===
                  0
              }
              onClick={
                deleteAll
              }
            >
              Remove All
            </button>

          </section>


          {message && (

            <section className="settings-status-success">
              {message}
            </section>

          )}


          <div className="library-count">
            {items.length} offline item{items.length === 1 ? '' : 's'}
          </div>


          {visible.length ===
            0 ? (

            <section className="archive-feedback-panel">

              <h2>
                {items.length === 0
                  ? 'No offline media downloaded.'
                  : 'No downloads match this search.'}
              </h2>

            </section>

          ) : (

            <section className="offline-download-list">

              {visible.map(
                (item) => {

                  const relativePath =
                    item.relativePath ??
                    ''


                  const checked =
                    selected.has(
                      relativePath
                    )


                  return (

                    <article
                      key={
                        relativePath
                      }
                      className="offline-download-row"
                    >

                      <label>

                        <input
                          type="checkbox"
                          checked={
                            checked
                          }
                          onChange={() =>
                            toggle(
                              relativePath
                            )
                          }
                        />


                        <div>

                          <strong>
                            {fallbackTitle(
                              item
                            )}
                          </strong>

                          <span>
                            {[
                              item.character,
                              item.category,
                            ]
                              .filter(
                                Boolean
                              )
                              .join(
                                ' · '
                              ) ||
                              'Downloaded media'}
                          </span>

                          <code>
                            {relativePath}
                          </code>

                          <small>
                            {formatBytes(item.fileSize)}
                            {item.downloadedAt ? ` · ${new Date(item.downloadedAt).toLocaleString()}` : ''}
                          </small>

                        </div>

                      </label>


                      <button
                        type="button"
                        className="offline-download-danger"
                        onClick={() => {

                          if (
                            removeOne(
                              relativePath
                            )
                          ) {

                            setMessage(
                              `Removed ${fallbackTitle(item)}.`
                            )

                            load()

                          }

                        }}
                      >
                        Delete
                      </button>

                    </article>

                  )

                }
              )}

            </section>

          )}

        </>

      )}

    </main>

  )

}


export default OfflineDownloadsPage