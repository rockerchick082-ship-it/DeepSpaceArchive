import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Link,
  useNavigate,
} from 'react-router-dom'

import ArchiveSequenceNav
  from '../components/ArchiveSequenceNav'
import ArchiveCoverageNotice
  from '../components/ArchiveCoverageNotice'
import BulkMediaActions from '../components/BulkMediaActions'

import type {
  Memory,
} from '../data/memoria'

import { useArchiveCharacters } from '../hooks/useArchiveCharacters'
import { useMediaTags } from '../data/mediaTags'
import { MediaTagChips, MediaTagEditor } from '../components/MediaTagControls'


import {
  readArchiveViewState,
  restoreArchiveScroll,
  saveArchiveScroll,
  writeArchiveViewState,
} from '../data/archiveViewState'


const illusioViewStateKey =
  'illusio'

import ArchiveQuickActions

  from '../components/ArchiveQuickActions'



type LibraryResponse = {
  count: number
  items: Memory[]
}


function IllusioPage() {

  const initialViewState =
    useMemo(
      () =>
        readArchiveViewState(
          illusioViewStateKey,
          {
            character:
              'All',

            search:
              '',

            tag:
              'All',
          }
        ),
      []
    )

  const navigate =
    useNavigate()

  const {
    characters: discoveredCharacters,
  } = useArchiveCharacters()

  const characters = [
    'All',
    ...discoveredCharacters,
  ]

  const {
    tags: availableTags,
    tagsFor,
    saveTags,
  } = useMediaTags()


  const [
    items,
    setItems,
  ] =
    useState<Memory[]>(
      []
    )


  const [
    selectedCharacter,
    setSelectedCharacter,
  ] =
    useState(
      initialViewState.character
    )


  const [
    searchText,
    setSearchText,
  ] =
    useState(
      initialViewState.search
    )

  const [
    selectedTag,
    setSelectedTag,
  ] =
    useState(
      initialViewState.tag
    )


  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    )


  const [
    error,
    setError,
  ] =
    useState(
      ''
    )


  useEffect(
    () => {

      writeArchiveViewState(
        illusioViewStateKey,
        {
          character:
            selectedCharacter,

          search:
            searchText,

          tag:
            selectedTag,
        }
      )

    },
    [
      searchText,
      selectedCharacter,
      selectedTag,
    ]
  )


  useEffect(
    () => {

      if (
        loading
      ) {

        return

      }


      const restoreTimer =
        window.setTimeout(
          () =>
            restoreArchiveScroll(
              illusioViewStateKey
            ),
          0
        )


      const save =
        () =>
          saveArchiveScroll(
            illusioViewStateKey
          )


      window.addEventListener(
        'pagehide',
        save
      )


      return () => {

        window.clearTimeout(
          restoreTimer
        )

        window.removeEventListener(
          'pagehide',
          save
        )

        save()

      }

    },
    [
      loading,
    ]
  )

  useEffect(
    () => {

      async function loadIllusio() {

        try {

          setLoading(
            true
          )

          setError(
            ''
          )


          const response =
            await fetch(
              '/api/library/illusio'
            )


          if (!response.ok) {

            throw new Error(
              'Unable to load Illusio.'
            )

          }


          const data:
            LibraryResponse =
            await response.json()


          setItems(
            data.items
          )

        } catch (error) {

          console.error(
            error
          )


          setError(
            'Illusio could not be loaded.'
          )

        } finally {

          setLoading(
            false
          )

        }

      }


      loadIllusio()

    },
    []
  )


  const filteredItems =
    useMemo(
      () => {

        const query =
          searchText
            .trim()
            .toLowerCase()


        return items.filter(
          (item) => {

            const characterMatches =
              selectedCharacter ===
                'All' ||
              item.character ===
                selectedCharacter


            if (
              !characterMatches
            ) {

              return false

            }


            const itemTags =
              tagsFor(
                item.category,
                item.relativePath
              )


            const tagMatches =
              selectedTag ===
                'All' ||
              itemTags.some(
                (tag) =>
                  tag ===
                  selectedTag
              )


            if (!tagMatches) {

              return false

            }


            if (!query) {

              return true

            }


            return (
              item.title
                .toLowerCase()
                .includes(
                  query
                ) ||
              item.character
                .toLowerCase()
                .includes(
                  query
                ) ||
              itemTags.some(
                (tag) =>
                  tag
                    .toLowerCase()
                    .includes(
                      query
                    )
              )
            )

          }
        )

      },
      [
        items,
        selectedCharacter,
        selectedTag,
        searchText,
        tagsFor,
      ]
    )


  if (
    loading
  ) {

    return (

      <main className="archive-page player-message">
        Loading Illusio...
      </main>

    )

  }


  return (

    <main className="archive-page">

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
            Illusio
          </h1>

          <ArchiveSequenceNav />

        </div>

      </header>

      <ArchiveCoverageNotice category="Illusio" />

      <section className="illusio-page-content">

        <div className="illusio-page-heading">

          <span className="archive-eyebrow">
            ILLUSIO · KINDLE
          </span>

          <h2>
            Illusio Collection
          </h2>

          <p>
            Browse Illusio recordings by
            character.
          </p>

        </div>


        <div className="character-filters">

          {characters.map(
            (character) => (

              <button
                type="button"
                key={
                  character
                }
                className={
                  selectedCharacter ===
                  character
                    ? 'filter-button active'
                    : 'filter-button'
                }
                onClick={() =>
                  setSelectedCharacter(
                    character
                  )
                }
              >
                {character}
              </button>

            )
          )}

        </div>


        <div className="archive-toolbar-row illusio-toolbar-row">

          <input
            className="memory-search archive-toolbar-search"
            value={
              searchText
            }
            placeholder="Search Illusio..."
            onChange={(event) =>
              setSearchText(
                event.target.value
              )
            }
          />


          <select
            className="archive-toolbar-select"
            aria-label="Filter Illusio by tag"
            value={
              selectedTag
            }
            onChange={(event) =>
              setSelectedTag(
                event.target.value
              )
            }
          >

            <option value="All">
              All Tags
            </option>

            {availableTags.map(
              (tag) => (

                <option
                  key={
                    tag.name
                  }
                  value={
                    tag.name
                  }
                >
                  {tag.name} ({tag.count})
                </option>

              )
            )}

          </select>

        </div>


        <div className="illusio-result-count">

          {filteredItems.length}

          {' '}

          {filteredItems.length === 1
            ? 'item'
            : 'items'}

        </div>

        <BulkMediaActions
          items={filteredItems.map((item) => ({
            category: item.category,
            relativePath: item.relativePath,
            title: item.title,
          }))}
          label={`Bulk actions on ${filteredItems.length} shown`}
        />

        {error && (

          <div className="settings-status-message settings-status-error">
            {error}
          </div>

        )}


        {!error &&
        filteredItems.length === 0 && (

          <div className="metadata-health-empty">

            <h3>
              Nothing Found
            </h3>

            <p>
              No Illusio media matches
              the current filters.
            </p>

          </div>

        )}


        {!error &&
        filteredItems.length > 0 && (

          <div className="illusio-media-grid">

            {filteredItems.map(
              (item) => (

                <div
                  className="illusio-media-card-wrapper"
                  key={
                    item.relativePath
                  }
                >

                  <button
                    type="button"
                    className="illusio-media-card"
                    onClick={() => {

                      const query =
                        new URLSearchParams({

                          file:
                            item.relativePath,

                        })


                      navigate(
                        `/illusio/watch?${query}`
                      )

                    }}
                  >

                    <IllusioThumbnail
                      item={
                        item
                      }
                    />


                    <div className="illusio-media-info">

                      <strong>
                        {item.title}
                      </strong>

                      <span>
                        {item.character}
                      </span>


                      <MediaTagChips
                        tags={
                          tagsFor(
                            item.category,
                            item.relativePath
                          )
                        }
                      />

                    </div>

                  </button>


                  <MediaTagEditor

                    title={

                      item.title

                    }

                    tags={

                      tagsFor(

                        item.category,

                        item.relativePath

                      )

                    }

                    availableTags={

                      availableTags

                    }

                    onSave={(nextTags) =>

                      saveTags(

                        item.category,

                        item.relativePath,

                        nextTags

                      )

                    }

                  />





                  <ArchiveQuickActions

                    category="Illusio"

                    relativePath={

                      item.relativePath

                    }

                    title={

                      item.title

                    }

                    character={

                      item.character

                    }

                    playerPath="/illusio/watch"

                  />

                </div>

              )
            )}

          </div>

        )}

      </section>

    </main>

  )

}


type IllusioThumbnailProps = {
  item: Memory
}


function IllusioThumbnail({
  item,
}: IllusioThumbnailProps) {

  const [
    thumbnailUrl,
    setThumbnailUrl,
  ] =
    useState<string | null>(
      null
    )


  useEffect(
    () => {

      let cancelled =
        false


      async function loadThumbnail() {

        /*
         * CUSTOM ARTWORK
         */

        if (
          item.thumbnailPath
        ) {

          const query =
            new URLSearchParams({

              filePath:
                item.thumbnailPath,

            })


          if (
            !cancelled
          ) {

            setThumbnailUrl(
              `/api/custom-thumbnail?${query}`
            )

          }


          return

        }


        /*
         * GENERATED VIDEO THUMBNAIL
         */

        try {

          const query =
            new URLSearchParams({

              filePath:
                item.filePath,

            })


          const response =
            await fetch(
              `/api/thumbnail?${query}`
            )


          if (
            !response.ok
          ) {

            return

          }


          const data:
            {
              thumbnailUrl:
                string
            } =
            await response.json()


          if (
            !cancelled
          ) {

            setThumbnailUrl(
              `${data.thumbnailUrl}`
            )

          }

        } catch (error) {

          console.error(
            'Unable to load Illusio thumbnail:',
            error
          )

        }

      }


      loadThumbnail()


      return () => {

        cancelled =
          true

      }

    },
    [
      item.filePath,
      item.thumbnailPath,
    ]
  )


  return (

    <div className="illusio-media-thumbnail">

      {thumbnailUrl ? (

        <img
          src={
            thumbnailUrl
          }
          alt={
            item.title
          }
        />

      ) : (

        <div className="memory-placeholder">
          ▶
        </div>

      )}

    </div>

  )

}


export default IllusioPage