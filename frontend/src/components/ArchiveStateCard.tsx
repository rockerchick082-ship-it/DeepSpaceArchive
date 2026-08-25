import {
  useEffect,
  useState,
} from 'react'

import {
  useNavigate,
} from 'react-router-dom'

import type {
  ArchiveItem,
} from '../data/archive'

import type {
  ArchiveState,
} from '../data/archiveState'

import {
  formatPlaybackTime,
  getPersonalArchivePlayerUrl,
} from '../data/personalArchive'


type ArchiveStateCardProps = {
  item: ArchiveItem
  state: ArchiveState
  showProgress?: boolean
  showLastWatched?: boolean
  showResumeAt?: boolean
}


function formatLastWatched(
  value: string
) {

  const date =
    new Date(
      value
    )


  return date.toLocaleString(
    undefined,
    {
      month:
        'short',

      day:
        'numeric',

      year:
        'numeric',

      hour:
        'numeric',

      minute:
        '2-digit',
    }
  )

}


function ArchiveStateCard({
  item,
  state,
  showProgress = false,
  showLastWatched = false,
  showResumeAt = false,
}: ArchiveStateCardProps) {

  const navigate =
    useNavigate()


  const phoneLogStyle =
    state.category ===
      'Phone Call' ||
    state.category ===
      'Phone Video'


  const customThumbnailUrl =
    !phoneLogStyle &&
    item.thumbnailPath
      ? `/api/custom-thumbnail?${
          new URLSearchParams({
            filePath:
              item.thumbnailPath,
          })
        }`
      : null


  /*
   * Match the main archive card artwork priority:
   *
   *   1. User-supplied custom thumbnail
   *   2. Artwork linked through the metadata catalog
   *   3. Automatically generated video frame
   *
   * ArchiveItem.imageUrl is populated by the library scanner
   * from the matched archive/catalog metadata.
   */
  const catalogImageUrl =
    !phoneLogStyle
      ? (
          item.imageUrl ??
          item.catalogItems
            ?.map(
              (catalogItem) =>
                catalogItem.imageUrl
            )
            .find(
              (
                imageUrl
              ): imageUrl is string =>
                Boolean(
                  imageUrl?.trim()
                )
            ) ??
          null
        )
      : null


  const [
    generatedThumbnail,
    setGeneratedThumbnail,
  ] =
    useState<{
      filePath: string
      url: string
    } | null>(
      null
    )


  useEffect(
    () => {

      /*
       * Do not generate a video frame when the item already
       * has either a custom thumbnail or catalog artwork.
       */
      if (
        phoneLogStyle ||
        customThumbnailUrl ||
        catalogImageUrl ||
        item.mediaType !==
          'video'
      ) {

        return

      }


      let cancelled =
        false


      async function loadThumbnail() {

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

            setGeneratedThumbnail({
              filePath:
                item.filePath,

              url:
                `${data.thumbnailUrl}`,
            })

          }

        } catch (error) {

          console.error(
            'Unable to load archive thumbnail:',
            error
          )

        }

      }


      void loadThumbnail()


      return () => {

        cancelled =
          true

      }

    },
    [
      catalogImageUrl,
      customThumbnailUrl,
      item.filePath,
      item.mediaType,
      phoneLogStyle,
    ]
  )


  const thumbnailUrl =
    customThumbnailUrl ??
    catalogImageUrl ??
    (
      generatedThumbnail
        ?.filePath ===
        item.filePath
        ? generatedThumbnail.url
        : null
    )


  function openItem() {

    const playerUrl =
      getPersonalArchivePlayerUrl(
        state.category,
        item.relativePath
      )


    if (
      !playerUrl
    ) {

      return

    }


    navigate(
      playerUrl
    )

  }


  const progressPercent =
    state.durationSeconds &&
    state.durationSeconds >
      0
      ? Math.min(
          100,
          Math.max(
            0,
            (
              state.progressSeconds /
              state.durationSeconds
            ) *
            100
          )
        )
      : 0


  return (

    <button
      type="button"
      className="state-archive-card"
      onClick={
        openItem
      }
    >

      <div
        className={
          phoneLogStyle
            ? 'state-card-thumbnail state-card-phone-placeholder'
            : 'state-card-thumbnail'
        }
      >

        {phoneLogStyle ? (

          <div className="state-card-phone-icon">

            {state.category ===
              'Phone Call'
              ? '☎'
              : '▶'}

          </div>

        ) : thumbnailUrl ? (

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


        <span className="state-card-category">
          {state.category}
        </span>

      </div>


      <div className="state-card-content">

        <h2>
          {item.title}
        </h2>


        <span className="state-card-character">
          {item.character}
        </span>


        {showResumeAt &&
        !state.completed &&
        state.progressSeconds >
          0 && (

          <span className="state-card-resume-time">

            Resume at{' '}

            {formatPlaybackTime(
              state.progressSeconds
            )}

          </span>

        )}


        {showProgress &&
        !state.completed && (

          <div className="state-card-progress">

            <div className="state-card-progress-track">

              <div
                className="state-card-progress-fill"
                style={{
                  width:
                    `${progressPercent}%`,
                }}
              />

            </div>


            <span>

              {Math.round(
                progressPercent
              )}

              %

            </span>

          </div>

        )}


        {state.completed &&
        showProgress && (

          <div className="state-card-completed">
            ✓ Completed
          </div>

        )}


        <div className="state-card-meta">

          {state.rating !==
            null && (

            <span>
              ★ {state.rating.toFixed(
                1
              )}
            </span>

          )}


          {state.playCount >
            0 && (

            <span>

              {state.playCount}

              {' '}

              {state.playCount ===
              1
                ? 'completion'
                : 'completions'}

            </span>

          )}

        </div>


        {showLastWatched &&
        state.lastWatched && (

          <span className="state-card-last-watched">

            Last watched{' '}

            {formatLastWatched(
              state.lastWatched
            )}

          </span>

        )}

      </div>

    </button>

  )

}


export default ArchiveStateCard