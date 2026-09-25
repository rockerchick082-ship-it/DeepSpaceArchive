import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import type { Playlist } from '../data/playlists'
import { bulkUpdateMediaTags } from '../data/mediaTags'

export type BulkMediaActionItem = {
  category: string
  relativePath: string
  title?: string
}

type BulkMediaActionsProps = {
  items: BulkMediaActionItem[]
  label?: string
  onChanged?: () => void | Promise<void>
  onClear?: () => void
}

async function readError(
  response: Response,
  fallback: string
) {
  const body = await response.json().catch(() => null) as {
    error?: string
  } | null

  return body?.error ?? fallback
}

function initialExpandedState() {
  if (typeof window === 'undefined') return true
  return !window.matchMedia('(max-width: 700px)').matches
}

function BulkMediaActions({
  items,
  label,
  onChanged,
  onClear,
}: BulkMediaActionsProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [playlistId, setPlaylistId] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [expanded, setExpanded] = useState(initialExpandedState)

  const uniqueItems = useMemo(() => {
    const seen = new Set<string>()

    return items.filter((item) => {
      const key = `${item.category}\u0000${item.relativePath}`
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }, [items])

  useEffect(() => {
    let cancelled = false

    void fetch('/api/playlists')
      .then(async (response) => {
        if (!response.ok) {
          return [] as Playlist[]
        }

        const body = await response.json() as {
          items?: Playlist[]
        }

        return Array.isArray(body.items)
          ? body.items
          : []
      })
      .then((nextPlaylists) => {
        if (!cancelled) {
          setPlaylists(nextPlaylists)
          if (nextPlaylists.length > 0) {
            setPlaylistId((current) => current || String(nextPlaylists[0].id))
          }
        }
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [])

  async function finish(success: string) {
    setMessage(success)
    await onChanged?.()
  }

  async function setBooleanState(
    endpoint: 'favorite' | 'completion',
    field: 'favorite' | 'completed',
    value: boolean,
    success: string
  ) {
    if (uniqueItems.length === 0) return

    try {
      setBusy(true)
      setMessage('')

      await Promise.all(
        uniqueItems.map(async (item) => {
          const response = await fetch(
            `/api/archive/${endpoint}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                category: item.category,
                relativePath: item.relativePath,
                [field]: value,
              }),
            }
          )

          if (!response.ok) {
            throw new Error(
              await readError(response, `Unable to update ${item.title ?? item.relativePath}.`)
            )
          }
        })
      )

      await finish(success)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Bulk update failed.')
    } finally {
      setBusy(false)
    }
  }

  async function addTags() {
    if (uniqueItems.length === 0) return

    const raw = window.prompt(
      `Add tags to ${uniqueItems.length} item${uniqueItems.length === 1 ? '' : 's'}. Separate tags with commas:`
    )

    if (raw === null) return

    const tags = raw
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)

    if (tags.length === 0) return

    try {
      setBusy(true)
      setMessage('')
      await bulkUpdateMediaTags(uniqueItems, { addTags: tags })
      await finish(`Added ${tags.length} tag${tags.length === 1 ? '' : 's'} to ${uniqueItems.length} item${uniqueItems.length === 1 ? '' : 's'}.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to add tags.')
    } finally {
      setBusy(false)
    }
  }

  async function addToPlaylist() {
    const numericPlaylistId = Number(playlistId)
    if (!Number.isInteger(numericPlaylistId) || uniqueItems.length === 0) return

    try {
      setBusy(true)
      setMessage('')

      for (const item of uniqueItems) {
        const response = await fetch(
          `/api/playlists/${numericPlaylistId}/items`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              category: item.category,
              relativePath: item.relativePath,
            }),
          }
        )

        if (!response.ok) {
          const errorText = await readError(response, 'Unable to add selected items to the playlist.')
          // Existing playlist membership is harmless in a bulk operation.
          if (!/already|exists|duplicate/i.test(errorText)) {
            throw new Error(errorText)
          }
        }
      }

      await finish(`Added selected items to ${playlists.find((playlist) => playlist.id === numericPlaylistId)?.name ?? 'playlist'}.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update playlist.')
    } finally {
      setBusy(false)
    }
  }

  if (uniqueItems.length === 0) {
    return null
  }

  return (
    <section
      className={`bulk-media-actions${expanded ? ' expanded' : ''}`}
      aria-label="Bulk media actions"
    >
      <div className="bulk-media-actions-summary">
        <div className="bulk-media-actions-copy">
          <span className="bulk-media-actions-kicker">BULK EDIT</span>
          <strong>{label ?? `${uniqueItems.length} selected`}</strong>
        </div>

        <button
          type="button"
          className="bulk-media-actions-toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? 'Hide' : 'Actions'}
          <span aria-hidden="true">{expanded ? '⌃' : '⌄'}</span>
        </button>
      </div>

      {expanded && (
        <div className="bulk-media-actions-body">
          <div className="bulk-media-actions-buttons">
            <button type="button" disabled={busy} onClick={() => void setBooleanState('favorite', 'favorite', true, 'Shown items added to favorites.')}>
              Favorite
            </button>
            <button type="button" disabled={busy} onClick={() => void setBooleanState('completion', 'completed', true, 'Shown items marked watched.')}>
              Watched
            </button>
            <button type="button" disabled={busy} onClick={() => void setBooleanState('completion', 'completed', false, 'Shown items marked unwatched.')}>
              Unwatched
            </button>
            <button type="button" disabled={busy} onClick={() => void addTags()}>
              Add tags
            </button>
          </div>

          {playlists.length > 0 && (
            <div className="bulk-media-actions-playlist">
              <select
                aria-label="Bulk playlist"
                disabled={busy}
                value={playlistId}
                onChange={(event) => setPlaylistId(event.target.value)}
              >
                {playlists.map((playlist) => (
                  <option key={playlist.id} value={playlist.id}>
                    {playlist.name}
                  </option>
                ))}
              </select>
              <button type="button" disabled={busy || !playlistId} onClick={() => void addToPlaylist()}>
                Add to playlist
              </button>
            </div>
          )}

          {onClear && (
            <button
              type="button"
              className="bulk-media-actions-clear"
              disabled={busy}
              onClick={onClear}
            >
              Clear selection
            </button>
          )}
        </div>
      )}

      {message && (
        <p className="bulk-media-actions-message" aria-live="polite">
          {message}
        </p>
      )}
    </section>
  )
}

export default BulkMediaActions
