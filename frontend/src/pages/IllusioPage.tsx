import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Link,
  useNavigate,
} from 'react-router-dom'

import type {
  Memory,
} from '../data/memoria'


type LibraryResponse = {
  count: number
  items: Memory[]
}


const characters = [
  'All',
  'Xavier',
  'Zayne',
  'Rafayel',
  'Sylus',
  'Caleb',
]


function IllusioPage() {

  const navigate =
    useNavigate()


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
      'All'
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
    error,
    setError,
  ] =
    useState(
      ''
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
                )
            )

          }
        )

      },
      [
        items,
        selectedCharacter,
        searchText,
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

        </div>

      </header>


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


        <input
          className="memory-search"
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


        <div className="illusio-result-count">

          {filteredItems.length}

          {' '}

          {filteredItems.length === 1
            ? 'item'
            : 'items'}

        </div>


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

                <button
                  type="button"
                  className="illusio-media-card"
                  key={
                    item.relativePath
                  }
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

                  </div>

                </button>

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