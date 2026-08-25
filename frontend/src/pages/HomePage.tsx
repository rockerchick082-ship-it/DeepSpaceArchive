import {
  useEffect,
  useState,
} from 'react'

import {
  Link,
} from 'react-router-dom'

import '../App.css'

import HomeNavigation from '../components/HomeNavigation'
import CharacterSelector from '../components/CharacterSelector'


type HomeMediaItem = {
  fileName: string
  relativePath: string

  mediaType:
    | 'video'
    | 'image'
}


type HomeMediaResponse = {
  character: string
  count: number
  items: HomeMediaItem[]
}


const characters = [
  'Xavier',
  'Zayne',
  'Rafayel',
  'Sylus',
  'Caleb',
]


const characterStorageKey =
  'deepspace-archive-selected-character'


function rememberCharacter(
  character: string
) {

  try {

    localStorage.setItem(
      characterStorageKey,
      character
    )

  } catch (error) {

    console.error(
      'Unable to remember selected character:',
      error
    )

  }

}


function getInitialCharacter() {

  try {

    const savedCharacter =
      localStorage.getItem(
        characterStorageKey
      )


    if (
      savedCharacter &&
      characters.includes(
        savedCharacter
      )
    ) {

      return savedCharacter

    }

  } catch (error) {

    console.error(
      'Unable to read selected character:',
      error
    )

  }


  /*
   * The Home page has no "All" option.
   * Xavier remains the safe default for
   * a new install or after "All" was
   * selected on an archive page.
   */
  rememberCharacter(
    'Xavier'
  )


  return 'Xavier'

}


function homeMediaUrl(
  item: HomeMediaItem
) {

  const query =
    new URLSearchParams({
      relativePath:
        item.relativePath,
    })


  return `/api/media?${query}`

}


function HomePage() {

  const [
    selectedCharacter,
    setSelectedCharacter,
  ] =
    useState(
      getInitialCharacter
    )


  const [
    mediaItems,
    setMediaItems,
  ] =
    useState<HomeMediaItem[]>(
      []
    )


  const [
    mediaIndex,
    setMediaIndex,
  ] =
    useState(
      0
    )


  const [
    soundEnabled,
    setSoundEnabled,
  ] =
    useState(
      false
    )


  const [
    loadingMedia,
    setLoadingMedia,
  ] =
    useState(
      true
    )


  const [
    mediaError,
    setMediaError,
  ] =
    useState(
      ''
    )


  /*
   * =====================================
   * LOAD HOME MEDIA FROM THE LIBRARY
   * =====================================
   *
   * The backend reads:
   *
   *   <library>/home/<Character>/
   *
   * so users can add or remove images and
   * videos without rebuilding the frontend.
   */

  useEffect(
    () => {

      let cancelled =
        false


      async function loadHomeMedia() {

        try {

          const query =
            new URLSearchParams({
              character:
                selectedCharacter,
            })


          const response =
            await fetch(
              `/api/library/home?${query}`
            )


          if (
            !response.ok
          ) {

            const data =
              await response
                .json()
                .catch(
                  () => null
                ) as
                  {
                    error?: string
                  } |
                  null


            throw new Error(
              data?.error ??
              'Unable to load Home media.'
            )

          }


          const data:
            HomeMediaResponse =
            await response.json()


          if (
            cancelled
          ) {

            return

          }


          setMediaItems(
            data.items
          )


          setMediaIndex(
            0
          )


          setMediaError(
            ''
          )

        } catch (error) {

          console.error(
            'Unable to load Home media:',
            error
          )


          if (
            cancelled
          ) {

            return

          }


          setMediaItems(
            []
          )


          setMediaIndex(
            0
          )


          setMediaError(
            error instanceof
              Error
              ? error.message
              : 'Unable to load Home media.'
          )

        } finally {

          if (
            !cancelled
          ) {

            setLoadingMedia(
              false
            )

          }

        }

      }


      void loadHomeMedia()


      return () => {

        cancelled =
          true

      }

    },
    [
      selectedCharacter,
    ]
  )


  const currentMedia =
    mediaItems[
      Math.min(
        mediaIndex,
        Math.max(
          0,
          mediaItems.length - 1
        )
      )
    ] ??
    null


  const currentMediaUrl =
    currentMedia
      ? homeMediaUrl(
          currentMedia
        )
      : null


  const currentMediaType =
    currentMedia?.mediaType ??
    null


  const currentMediaPath =
    currentMedia?.relativePath ??
    null


  /*
   * =====================================
   * AUTOMATIC HOME CAROUSEL
   * =====================================
   *
   * Videos advance when playback ends.
   * Images remain visible for 15 seconds
   * before advancing to the next item.
   */

  useEffect(
    () => {

      if (
        currentMediaType !==
          'image' ||
        mediaItems.length <=
          1
      ) {

        return

      }


      const timeoutId =
        window.setTimeout(
          () => {

            setMediaIndex(
              (current) =>
                (
                  current +
                  1
                ) %
                mediaItems.length
            )

          },
          15000
        )


      return () => {

        window.clearTimeout(
          timeoutId
        )

      }

    },
    [
      currentMediaPath,
      currentMediaType,
      mediaItems.length,
    ]
  )


  function advanceMedia() {

    if (
      mediaItems.length <=
        1
    ) {

      return

    }


    setMediaIndex(
      (current) =>
        (
          current +
          1
        ) %
        mediaItems.length
    )

  }


  function selectCharacter(
    character: string
  ) {

    rememberCharacter(
      character
    )


    setSelectedCharacter(
      character
    )


    setMediaIndex(
      0
    )


    setLoadingMedia(
      true
    )


    setMediaError(
      ''
    )

  }


  return (

    <main className="home-page">

      {/* =================================
          HOME MEDIA STAGE
      ================================== */}

      <div className="video-stage">

        {currentMedia &&
        currentMediaUrl ? (

          currentMedia.mediaType ===
            'video' ? (

            <>

              <video
                className="background-video-blur"
                src={
                  currentMediaUrl
                }
                autoPlay
                loop
                muted
                playsInline
                key={
                  `blur-${currentMedia.relativePath}`
                }
              />


              <video
                className="background-video-main"
                src={
                  currentMediaUrl
                }
                autoPlay
                loop={
                  mediaItems.length <=
                  1
                }
                muted={
                  !soundEnabled
                }
                playsInline
                onEnded={
                  advanceMedia
                }
                key={
                  `main-${currentMedia.relativePath}`
                }
              />

            </>

          ) : (

            <>

              <img
                className="background-video-blur"
                src={
                  currentMediaUrl
                }
                alt=""
                aria-hidden="true"
                key={
                  `blur-${currentMedia.relativePath}`
                }
              />


              <img
                className="background-video-main"
                src={
                  currentMediaUrl
                }
                alt={
                  `${selectedCharacter} Home artwork`
                }
                key={
                  `main-${currentMedia.relativePath}`
                }
              />

            </>

          )

        ) : (

          <div className="home-media-message">

            {loadingMedia
              ? 'Loading Home media…'
              : mediaError ||
                `No Home media found for ${selectedCharacter}.`}

          </div>

        )}

      </div>


      <div className="video-overlay" />


      {/* =================================
          TOP BAR
      ================================== */}

      <header className="top-bar">

        <div className="archive-name">
          DeepSpace Archive
        </div>


        <div className="home-top-actions">

          <CharacterSelector
            selectedCharacter={
              selectedCharacter
            }
            onCharacterChange={
              selectCharacter
            }
          />


          <Link
            to="/settings"
            className="home-settings-button"
            aria-label="Settings"
            title="Settings"
          >
            ⚙
          </Link>

        </div>

      </header>


      {/* =================================
          BOTTOM INTERFACE
      ================================== */}

      <section className="bottom-interface">


        {(mediaItems.length >
          1 ||
          currentMedia?.mediaType ===
            'video') && (

          <div className="background-indicator-row home-media-control-row">

            {mediaItems.length >
              1 && (

              <div
                className="home-media-dots"
                role="group"
                aria-label={`${selectedCharacter} Home media`}
              >

                {mediaItems.map(
                  (
                    item,
                    index
                  ) => (

                    <button
                      key={
                        item.relativePath
                      }
                      type="button"
                      className={
                        index ===
                        mediaIndex
                          ? 'home-media-dot active'
                          : 'home-media-dot'
                      }
                      aria-label={
                        `Show Home media ${index + 1} of ${mediaItems.length}`
                      }
                      aria-current={
                        index ===
                        mediaIndex
                          ? 'true'
                          : undefined
                      }
                      onClick={() =>
                        setMediaIndex(
                          index
                        )
                      }
                    />

                  )
                )}

              </div>

            )}


            {currentMedia?.mediaType ===
              'video' && (

              <button
                type="button"
                className={
                  soundEnabled
                    ? 'home-sound-toggle active'
                    : 'home-sound-toggle'
                }
                aria-label={
                  soundEnabled
                    ? 'Mute Home video'
                    : 'Play Home video with sound'
                }
                title={
                  soundEnabled
                    ? 'Mute'
                    : 'Sound on'
                }
                aria-pressed={
                  soundEnabled
                }
                onClick={() =>
                  setSoundEnabled(
                    (current) =>
                      !current
                  )
                }
              >
                <span
                  className="home-sound-icon"
                  aria-hidden="true"
                >
                  {soundEnabled
                    ? '🔊'
                    : '🔇'}
                </span>
              </button>

            )}

          </div>

        )}


        <div className="section-heading">

          <span className="section-label">
            ARCHIVE
          </span>

          <span className="section-line" />

        </div>


        <HomeNavigation />


        <nav className="home-utility-navigation">


          <Link
            to="/favorites"
            className="home-utility-link"
          >

            <span className="home-utility-icon">
              ♡
            </span>

            <span>
              Favorites
            </span>

          </Link>


          <Link
            to="/continue-watching"
            className="home-utility-link"
          >

            <span className="home-utility-icon">
              ▶
            </span>

            <span>
              Continue Watching
            </span>

          </Link>


          <Link
            to="/history"
            className="home-utility-link"
          >

            <span className="home-utility-icon">
              ◷
            </span>

            <span>
              History
            </span>

          </Link>


          <Link
            to="/stats"
            className="home-utility-link"
          >

            <span className="home-utility-icon">
              ▥
            </span>

            <span>
              Statistics
            </span>

          </Link>


          <Link
            to="/playlists"
            className="home-utility-link"
          >

            <span className="home-utility-icon">
              ♫
            </span>

            <span>
              Playlists
            </span>

          </Link>

        </nav>

      </section>

    </main>

  )

}


export default HomePage
