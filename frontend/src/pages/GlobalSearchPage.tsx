import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Link,
  useSearchParams,
} from 'react-router-dom'

import {
  archiveIndexPlayerUrl,
  fetchArchiveIndex,
} from '../data/archiveIndex'

import type {
  ArchiveIndexItem,
} from '../data/archiveIndex'

import type {
  Playlist,
} from '../data/playlists'

import type {
  CatalogItem,
  CatalogResponse,
} from '../features/catalog/catalogTypes'

import {
  MediaTagChips,
} from '../components/MediaTagControls'

import {
  useMediaTags,
} from '../data/mediaTags'


type SearchData = {
  media: ArchiveIndexItem[]
  playlists: Playlist[]
}


function normalize(
  value: string
) {
  return value
    .trim()
    .toLocaleLowerCase()
}


function GlobalSearchPage() {
  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams()

  const [
    query,
    setQuery,
  ] = useState(
    searchParams.get('q') ?? ''
  )

  const [
    data,
    setData,
  ] = useState<SearchData>({
    media: [],
    playlists: [],
  })

  const [
    catalogItems,
    setCatalogItems,
  ] = useState<CatalogItem[]>([])

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    catalogLoading,
    setCatalogLoading,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')

  const {
    tags,
    tagsFor,
  } = useMediaTags()


  const loadBaseData =
    useCallback(
      async () => {
        try {
          setLoading(true)

          const [
            archiveResult,
            playlistResponse,
          ] = await Promise.all([
            fetchArchiveIndex(),
            fetch('/api/playlists'),
          ])

          if (!playlistResponse.ok) {
            throw new Error(
              'Unable to load playlists.'
            )
          }

          const playlistData =
            await playlistResponse.json() as {
              items?: Playlist[]
            }

          setData({
            media:
              archiveResult.items,
            playlists:
              Array.isArray(
                playlistData.items
              )
                ? playlistData.items
                : [],
          })

          const warnings =
            Object.values(
              archiveResult.sourceErrors
            )

          setError(
            warnings.join(' ')
          )
        } catch (
          loadError
        ) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Unable to load archive search.'
          )
        } finally {
          setLoading(false)
        }
      },
      []
    )


  useEffect(
    () => {
      const timeoutId =
        window.setTimeout(
          () => {
            void loadBaseData()
          },
          0
        )

      return () => {
        window.clearTimeout(
          timeoutId
        )
      }
    },
    [loadBaseData]
  )


  useEffect(
    () => {
      const trimmed =
        query.trim()

      const next =
        new URLSearchParams(
          searchParams
        )

      if (trimmed) {
        next.set(
          'q',
          trimmed
        )
      } else {
        next.delete('q')
      }

      if (
        next.toString() !==
        searchParams.toString()
      ) {
        setSearchParams(
          next,
          {
            replace: true,
          }
        )
      }

      if (
        trimmed.length < 2
      ) {
        const clearTimer =
          window.setTimeout(
            () => {
              setCatalogItems([])
              setCatalogLoading(false)
            },
            0
          )

        return () => {
          window.clearTimeout(
            clearTimer
          )
        }
      }

      let cancelled = false

      const timeoutId =
        window.setTimeout(
          async () => {
            try {
              setCatalogLoading(true)

              const params =
                new URLSearchParams({
                  q:
                    trimmed,
                  limit:
                    '25',
                  offset:
                    '0',
                })

              const response =
                await fetch(
                  `/api/catalog?${params}`
                )

              if (!response.ok) {
                throw new Error(
                  'Unable to search metadata catalog.'
                )
              }

              const result =
                await response.json() as
                  CatalogResponse

              if (!cancelled) {
                setCatalogItems(
                  result.items
                )
              }
            } catch (
              catalogError
            ) {
              if (!cancelled) {
                console.error(
                  catalogError
                )
                setCatalogItems([])
              }
            } finally {
              if (!cancelled) {
                setCatalogLoading(false)
              }
            }
          },
          220
        )

      return () => {
        cancelled = true
        window.clearTimeout(
          timeoutId
        )
      }
    },
    [
      query,
      searchParams,
      setSearchParams,
    ]
  )


  const normalizedQuery =
    normalize(query)


  const mediaResults =
    useMemo(
      () => {
        if (!normalizedQuery) {
          return []
        }

        return data.media
          .filter(
            (item) => {
              const itemTags =
                tagsFor(
                  item.archiveCategory,
                  item.relativePath
                )

              return [
                item.title,
                item.character,
                item.archiveCategory,
                item.relativePath,
                item.fileName,
                ...itemTags,
              ]
                .join(' ')
                .toLocaleLowerCase()
                .includes(
                  normalizedQuery
                )
            }
          )
          .slice(0, 50)
      },
      [
        data.media,
        normalizedQuery,
        tagsFor,
      ]
    )


  const playlistResults =
    useMemo(
      () =>
        normalizedQuery
          ? data.playlists
              .filter(
                (playlist) =>
                  playlist.name
                    .toLocaleLowerCase()
                    .includes(
                      normalizedQuery
                    )
              )
              .slice(0, 20)
          : [],
      [
        data.playlists,
        normalizedQuery,
      ]
    )


  const tagResults =
    useMemo(
      () =>
        normalizedQuery
          ? tags
              .filter(
                (tag) =>
                  tag.name
                    .toLocaleLowerCase()
                    .includes(
                      normalizedQuery
                    )
              )
              .slice(0, 20)
          : [],
      [
        normalizedQuery,
        tags,
      ]
    )


  const resultCount =
    mediaResults.length +
    playlistResults.length +
    tagResults.length +
    catalogItems.length


  return (
    <main className="archive-page global-search-page">
      <header className="archive-page-header">
        <Link
          to="/"
          className="back-button"
        >
          ‹
        </Link>

        <div>
          <span className="archive-eyebrow">
            DEEPSPACE ARCHIVE
          </span>
          <h1>
            Search
          </h1>
        </div>
      </header>

      <section className="global-search-hero">
        <input
          autoFocus
          type="search"
          value={query}
          placeholder="Search media, characters, tags, playlists, filenames, or wiki metadata"
          onChange={(event) =>
            setQuery(
              event.target.value
            )
          }
        />

        <span>
          {normalizedQuery
            ? `${resultCount}${catalogLoading ? '+' : ''} results`
            : `${data.media.length} playable media items indexed`}
        </span>
      </section>

      {error && (
        <section className="settings-status-error">
          {error}
        </section>
      )}

      {loading ? (
        <section className="global-search-empty">
          Building archive search…
        </section>
      ) : !normalizedQuery ? (
        <section className="global-search-empty">
          Start typing to search across your archive.
        </section>
      ) : resultCount === 0 && !catalogLoading ? (
        <section className="global-search-empty">
          No matches for “{query.trim()}”.
        </section>
      ) : (
        <div className="global-search-groups">
          {mediaResults.length > 0 && (
            <section className="global-search-group">
              <header>
                <h2>
                  Media
                </h2>
                <span>
                  {mediaResults.length}
                </span>
              </header>

              <div className="global-search-results">
                {mediaResults.map(
                  (item) => {
                    const itemTags =
                      tagsFor(
                        item.archiveCategory,
                        item.relativePath
                      )

                    return (
                      <Link
                        key={`${item.archiveCategory}\u0000${item.relativePath}`}
                        to={
                          archiveIndexPlayerUrl(
                            item
                          )
                        }
                        className="global-search-result"
                      >
                        <div>
                          <strong>
                            {item.title}
                          </strong>
                          <span>
                            {[item.character, item.archiveCategory]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                          <MediaTagChips
                            tags={itemTags}
                          />
                        </div>
                        <span className="global-search-result-action">
                          Play ›
                        </span>
                      </Link>
                    )
                  }
                )}
              </div>
            </section>
          )}

          {tagResults.length > 0 && (
            <section className="global-search-group">
              <header>
                <h2>
                  Tags
                </h2>
                <span>
                  {tagResults.length}
                </span>
              </header>

              <div className="global-search-compact-grid">
                {tagResults.map(
                  (tag) => (
                    <Link
                      key={tag.name}
                      to={`/settings/tags?tag=${encodeURIComponent(tag.name)}`}
                      className="global-search-chip-result"
                    >
                      <strong>
                        #{tag.name}
                      </strong>
                      <span>
                        {tag.count} item{tag.count === 1 ? '' : 's'}
                      </span>
                    </Link>
                  )
                )}
              </div>
            </section>
          )}

          {playlistResults.length > 0 && (
            <section className="global-search-group">
              <header>
                <h2>
                  Playlists
                </h2>
                <span>
                  {playlistResults.length}
                </span>
              </header>

              <div className="global-search-compact-grid">
                {playlistResults.map(
                  (playlist) => (
                    <Link
                      key={playlist.id}
                      to={`/playlists/${playlist.id}`}
                      className="global-search-chip-result"
                    >
                      <strong>
                        {playlist.name}
                      </strong>
                      <span>
                        {playlist.itemCount} item{playlist.itemCount === 1 ? '' : 's'}
                      </span>
                    </Link>
                  )
                )}
              </div>
            </section>
          )}

          {(catalogItems.length > 0 || catalogLoading) && (
            <section className="global-search-group">
              <header>
                <h2>
                  Wiki / Metadata Catalog
                </h2>
                <span>
                  {catalogLoading
                    ? 'Searching…'
                    : catalogItems.length}
                </span>
              </header>

              <div className="global-search-results">
                {catalogItems.map(
                  (item) => (
                    <div
                      key={item.id}
                      className="global-search-result global-search-catalog-result"
                    >
                      <div>
                        <strong>
                          {item.canonicalName}
                        </strong>
                        <span>
                          {[item.character, item.category, item.subcategory]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </div>

                      <div className="global-search-catalog-actions">
                        {item.hasFile !== undefined && (
                          <span className={item.hasFile ? 'search-file-present' : 'search-file-missing'}>
                            {item.hasFile ? 'Archived' : 'Missing'}
                          </span>
                        )}
                        {item.sourceUrl && (
                          <a
                            href={item.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Wiki ↗
                          </a>
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  )
}


export default GlobalSearchPage
