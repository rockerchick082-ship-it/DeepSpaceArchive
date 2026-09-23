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
  archiveIndexKey,
  archiveIndexPlayerUrl,
  fetchArchiveIndex,
} from '../data/archiveIndex'

import type {
  ArchiveIndexItem,
} from '../data/archiveIndex'

import {
  bulkUpdateMediaTags,
  deleteMediaTag,
  renameMediaTag,
  useMediaTags,
} from '../data/mediaTags'

import {
  MediaTagChips,
} from '../components/MediaTagControls'


function parseTagList(
  value: string
) {
  return value
    .split(',')
    .map(
      (tag) =>
        tag.trim()
    )
    .filter(Boolean)
}


function TagManagerPage() {
  const [
    searchParams,
  ] = useSearchParams()

  const {
    tags,
    tagsFor,
    refresh,
  } = useMediaTags()

  const [
    items,
    setItems,
  ] = useState<ArchiveIndexItem[]>([])

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    error,
    setError,
  ] = useState('')

  const [
    searchText,
    setSearchText,
  ] = useState('')

  const [
    tagFilter,
    setTagFilter,
  ] = useState(
    searchParams.get('tag') ??
    'All'
  )

  const [
    selected,
    setSelected,
  ] = useState<Set<string>>(
    new Set()
  )

  const [
    bulkTags,
    setBulkTags,
  ] = useState('')

  const [
    savingBulk,
    setSavingBulk,
  ] = useState(false)

  const [
    actionError,
    setActionError,
  ] = useState('')

  const [
    actionMessage,
    setActionMessage,
  ] = useState('')


  const loadItems =
    useCallback(
      async () => {
        try {
          setLoading(true)

          const result =
            await fetchArchiveIndex()

          setItems(
            result.items
          )

          const warnings =
            Object.values(
              result.sourceErrors
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
              : 'Unable to load archive media.'
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
            void loadItems()
          },
          0
        )

      return () => {
        window.clearTimeout(
          timeoutId
        )
      }
    },
    [loadItems]
  )


  const visibleItems =
    useMemo(
      () => {
        const search =
          searchText
            .trim()
            .toLocaleLowerCase()

        return items.filter(
          (item) => {
            const itemTags =
              tagsFor(
                item.archiveCategory,
                item.relativePath
              )

            if (
              tagFilter !== 'All' &&
              !itemTags.some(
                (tag) =>
                  tag.toLocaleLowerCase() ===
                  tagFilter.toLocaleLowerCase()
              )
            ) {
              return false
            }

            if (!search) {
              return true
            }

            return [
              item.title,
              item.character,
              item.archiveCategory,
              item.relativePath,
              ...itemTags,
            ]
              .join(' ')
              .toLocaleLowerCase()
              .includes(search)
          }
        )
      },
      [
        items,
        searchText,
        tagFilter,
        tagsFor,
      ]
    )


  function toggleSelected(
    item: ArchiveIndexItem
  ) {
    const key =
      archiveIndexKey(
        item.archiveCategory,
        item.relativePath
      )

    setSelected(
      (current) => {
        const next =
          new Set(current)

        if (next.has(key)) {
          next.delete(key)
        } else {
          next.add(key)
        }

        return next
      }
    )
  }


  function selectVisible() {
    setSelected(
      new Set(
        visibleItems.map(
          (item) =>
            archiveIndexKey(
              item.archiveCategory,
              item.relativePath
            )
        )
      )
    )
  }


  const selectedItems =
    useMemo(
      () =>
        items.filter(
          (item) =>
            selected.has(
              archiveIndexKey(
                item.archiveCategory,
                item.relativePath
              )
            )
        ),
      [items, selected]
    )


  async function runBulk(
    mode: 'add' | 'remove'
  ) {
    const requestedTags =
      parseTagList(
        bulkTags
      )

    if (
      selectedItems.length === 0 ||
      requestedTags.length === 0
    ) {
      setActionError(
        'Select at least one media item and enter at least one tag.'
      )
      return
    }

    try {
      setSavingBulk(true)
      setActionError('')
      setActionMessage('')

      await bulkUpdateMediaTags(
        selectedItems.map(
          (item) => ({
            category:
              item.archiveCategory,
            relativePath:
              item.relativePath,
          })
        ),
        mode === 'add'
          ? {
              addTags:
                requestedTags,
            }
          : {
              removeTags:
                requestedTags,
            }
      )

      setActionMessage(
        `${mode === 'add' ? 'Updated' : 'Removed tags from'} ${selectedItems.length} media item${selectedItems.length === 1 ? '' : 's'}.`
      )
      setBulkTags('')
    } catch (
      bulkError
    ) {
      setActionError(
        bulkError instanceof Error
          ? bulkError.message
          : 'Unable to update tags.'
      )
    } finally {
      setSavingBulk(false)
    }
  }


  async function renameTag(
    currentName: string
  ) {
    const newName =
      window.prompt(
        `Rename or merge “${currentName}” into:`,
        currentName
      )

    if (
      !newName ||
      !newName.trim()
    ) {
      return
    }

    try {
      setActionError('')
      await renameMediaTag(
        currentName,
        newName
      )
      setActionMessage(
        `Tag updated to “${newName.trim()}”.`
      )
    } catch (
      renameError
    ) {
      setActionError(
        renameError instanceof Error
          ? renameError.message
          : 'Unable to rename tag.'
      )
    }
  }


  async function removeTag(
    name: string
  ) {
    if (
      !window.confirm(
        `Delete the “${name}” tag from every media item?`
      )
    ) {
      return
    }

    try {
      setActionError('')
      await deleteMediaTag(
        name
      )
      setActionMessage(
        `Deleted “${name}”.`
      )

      if (
        tagFilter === name
      ) {
        setTagFilter('All')
      }
    } catch (
      deleteError
    ) {
      setActionError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Unable to delete tag.'
      )
    }
  }


  return (
    <main className="archive-page tag-manager-page">
      <header className="archive-page-header">
        <Link
          to="/settings"
          className="back-button"
        >
          ‹
        </Link>

        <div>
          <span className="archive-eyebrow">
            ORGANIZATION
          </span>
          <h1>
            Tags
          </h1>
        </div>

        <button
          type="button"
          className="library-rescan-button"
          onClick={() => {
            void Promise.all([
              loadItems(),
              refresh(),
            ])
          }}
        >
          Refresh
        </button>
      </header>

      <section className="tag-manager-summary">
        <div>
          <strong>
            {tags.length}
          </strong>
          <span>
            tags
          </span>
        </div>
        <div>
          <strong>
            {items.length}
          </strong>
          <span>
            playable media items
          </span>
        </div>
        <div>
          <strong>
            {selected.size}
          </strong>
          <span>
            selected
          </span>
        </div>
      </section>

      {(error || actionError || actionMessage) && (
        <section
          className={
            actionError
              ? 'settings-status-error'
              : 'settings-status-success'
          }
        >
          {actionError || actionMessage || error}
        </section>
      )}

      <section className="tag-manager-panel">
        <div className="tag-manager-panel-heading">
          <div>
            <span className="archive-eyebrow">
              TAG LIBRARY
            </span>
            <h2>
              Manage tags
            </h2>
            <p>
              Rename a tag, merge it into an existing tag, or remove it everywhere.
            </p>
          </div>
        </div>

        {tags.length === 0 ? (
          <p className="tag-manager-empty">
            No tags yet. Add tags to media or use the bulk controls below.
          </p>
        ) : (
          <div className="tag-manager-tag-list">
            {tags.map(
              (tag) => (
                <div
                  key={tag.name}
                  className="tag-manager-tag-row"
                >
                  <button
                    type="button"
                    className="tag-manager-tag-name"
                    onClick={() =>
                      setTagFilter(
                        tag.name
                      )
                    }
                  >
                    {tag.name}
                  </button>
                  <span>
                    {tag.count} use{tag.count === 1 ? '' : 's'}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      void renameTag(
                        tag.name
                      )
                    }
                  >
                    Rename / Merge
                  </button>
                  <button
                    type="button"
                    className="tag-manager-danger"
                    onClick={() =>
                      void removeTag(
                        tag.name
                      )
                    }
                  >
                    Delete
                  </button>
                </div>
              )
            )}
          </div>
        )}
      </section>

      <section className="tag-manager-panel">
        <div className="tag-manager-panel-heading">
          <div>
            <span className="archive-eyebrow">
              BULK TAGGING
            </span>
            <h2>
              Tag multiple media items
            </h2>
          </div>

          <div className="tag-manager-selection-actions">
            <button
              type="button"
              onClick={selectVisible}
            >
              Select visible ({visibleItems.length})
            </button>
            <button
              type="button"
              onClick={() =>
                setSelected(
                  new Set()
                )
              }
            >
              Clear selection
            </button>
          </div>
        </div>

        <div className="tag-manager-filters">
          <input
            type="search"
            value={searchText}
            placeholder="Search title, character, category, path, or tag"
            onChange={(event) =>
              setSearchText(
                event.target.value
              )
            }
          />

          <select
            value={tagFilter}
            onChange={(event) =>
              setTagFilter(
                event.target.value
              )
            }
          >
            <option value="All">
              All tags
            </option>
            {tags.map(
              (tag) => (
                <option
                  key={tag.name}
                  value={tag.name}
                >
                  {tag.name} ({tag.count})
                </option>
              )
            )}
          </select>
        </div>

        <div className="tag-manager-bulk-controls">
          <input
            type="text"
            value={bulkTags}
            placeholder="Tags separated by commas"
            onChange={(event) =>
              setBulkTags(
                event.target.value
              )
            }
          />
          <button
            type="button"
            disabled={
              savingBulk ||
              selected.size === 0
            }
            onClick={() =>
              void runBulk('add')
            }
          >
            Add tags
          </button>
          <button
            type="button"
            disabled={
              savingBulk ||
              selected.size === 0
            }
            onClick={() =>
              void runBulk('remove')
            }
          >
            Remove tags
          </button>
        </div>

        {loading ? (
          <p className="tag-manager-empty">
            Loading archive media…
          </p>
        ) : (
          <div className="tag-manager-media-list">
            {visibleItems.map(
              (item) => {
                const key =
                  archiveIndexKey(
                    item.archiveCategory,
                    item.relativePath
                  )

                const itemTags =
                  tagsFor(
                    item.archiveCategory,
                    item.relativePath
                  )

                return (
                  <label
                    key={key}
                    className="tag-manager-media-row"
                  >
                    <input
                      type="checkbox"
                      checked={
                        selected.has(key)
                      }
                      onChange={() =>
                        toggleSelected(item)
                      }
                    />

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

                    <Link
                      to={
                        archiveIndexPlayerUrl(
                          item
                        )
                      }
                      onClick={(event) =>
                        event.stopPropagation()
                      }
                    >
                      Open
                    </Link>
                  </label>
                )
              }
            )}
          </div>
        )}
      </section>
    </main>
  )
}


export default TagManagerPage
