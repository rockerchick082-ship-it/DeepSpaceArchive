import {
  useEffect,
  useRef,
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




type MobileDownloadRecord = {
  relativePath?: string
  status?: string
}


type MobileHomeBridge = {
  getDownloads?: () => string

  isDownloaded?: (
    relativePath: string
  ) => boolean

  getLocalMediaPath?: (
    relativePath: string
  ) => string

  download?: (
    payloadJson: string
  ) => void

  downloadSystemMedia?: (
    payloadJson: string
  ) => void
}


type CapacitorFileBridge = {
  convertFileSrc?: (
    filePath: string
  ) => string
}


function getMobileHomeBridge() {

  return (
    window as typeof window & {
      DeepSpaceArchiveMobile?:
        MobileHomeBridge
    }
  ).DeepSpaceArchiveMobile

}


function getCapacitorFileBridge() {

  return (
    window as typeof window & {
      Capacitor?:
        CapacitorFileBridge
    }
  ).Capacitor

}


function safeHomeFileName(
  character: string,
  item: HomeMediaItem
) {

  const sourceName =
    item.fileName ||
    item.relativePath
      .split(
        /[\\/]/
      )
      .pop() ||
    'home-media'


  return (
    `home-${character}-${sourceName}`
  ).replace(
    /[^a-zA-Z0-9._-]+/g,
    '_'
  )

}


function queueHomeMediaDownload(
  character: string,
  item: HomeMediaItem,
  bridge: MobileHomeBridge,
  requested:
    Set<string>
) {

  if (
    requested.has(
      item.relativePath
    )
  ) {

    return

  }


  const query =
    new URLSearchParams({
      relativePath:
        item.relativePath,
    })


  const downloadUrl =
    `${window.location.origin}/api/mobile/media/download?${query}`


  const payload =
    JSON.stringify({
      title:
        `${character} Home Background`,

      character,

      category:
        'Home Background',

      relativePath:
        item.relativePath,

      downloadUrl,

      fileName:
        safeHomeFileName(
          character,
          item
        ),
    })


  requested.add(
    item.relativePath
  )


  if (
    bridge.downloadSystemMedia
  ) {

    bridge.downloadSystemMedia(
      payload
    )

    return

  }


  bridge.download?.(
    payload
  )

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


  const [
    nasConnected,
    setNasConnected,
  ] =
    useState(
      true
    )


  const [
    localMediaUrls,
    setLocalMediaUrls,
  ] =
    useState<
      Record<
        string,
        string
      >
    >({})


  const requestedHomeDownloadsRef =
    useRef<
      Set<string>
    >(
      new Set()
    )


  const homePrefetchStartedRef =
    useRef(
      false
    )


  const homeVideoRefs =
    useRef<
      Record<
        string,
        HTMLVideoElement |
        null
      >
    >({})


  const isMobileApp =
    typeof window !==
      'undefined' &&
    window.localStorage.getItem(
      'deepspaceArchiveMobile'
    ) ===
      'true'


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


          const fromOfflineCache =
            response.headers.get(
              'X-DeepSpace-Archive-Offline-Cache'
            ) ===
              '1'


          const data:
            HomeMediaResponse =
            await response.json()


          if (
            cancelled
          ) {

            return

          }


          setNasConnected(
            !fromOfflineCache
          )


          if (
            isMobileApp &&
            !fromOfflineCache
          ) {

            try {

              const bridge =
                getMobileHomeBridge()


              if (
                bridge
              ) {

                const records =
                  bridge.getDownloads
                    ? (
                        JSON.parse(
                          bridge.getDownloads()
                        ) as
                          MobileDownloadRecord[]
                      )
                    : []


                const alreadyTracked =
                  new Set(
                    records
                      .filter(
                        (record) =>
                          record.relativePath &&
                          record.status !==
                            'failed' &&
                          record.status !==
                            'missing'
                      )
                      .map(
                        (record) =>
                          record.relativePath as string
                      )
                  )


                for (
                  const homeItem
                  of data.items
                ) {

                  if (
                    alreadyTracked.has(
                      homeItem.relativePath
                    )
                  ) {

                    continue

                  }


                  queueHomeMediaDownload(
                    selectedCharacter,
                    homeItem,
                    bridge,
                    requestedHomeDownloadsRef.current
                  )

                }

              }

            } catch (downloadError) {

              console.error(
                'Unable to queue Home media for offline use:',
                downloadError
              )

            }

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


          setNasConnected(
            false
          )


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
      isMobileApp,
      selectedCharacter,
    ]
  )


  useEffect(
    () => {

      if (
        !isMobileApp ||
        !nasConnected ||
        homePrefetchStartedRef.current
      ) {

        return

      }


      homePrefetchStartedRef.current =
        true


      let cancelled =
        false


      async function prefetchHomeMedia() {

        const bridge =
          getMobileHomeBridge()


        if (
          !bridge
        ) {

          return

        }


        let records:
          MobileDownloadRecord[] =
          []


        try {

          records =
            bridge.getDownloads
              ? (
                  JSON.parse(
                    bridge.getDownloads()
                  ) as
                    MobileDownloadRecord[]
                )
              : []

        } catch (error) {

          console.error(
            'Unable to read Home download records:',
            error
          )

        }


        const alreadyTracked =
          new Set(
            records
              .filter(
                (record) =>
                  record.relativePath &&
                  record.status !==
                    'failed' &&
                  record.status !==
                    'missing'
              )
              .map(
                (record) =>
                  record.relativePath as string
              )
          )


        for (
          const character
          of characters
        ) {

          if (
            cancelled
          ) {

            return

          }


          try {

            const query =
              new URLSearchParams({
                character,
              })


            const response =
              await fetch(
                `/api/library/home?${query}`
              )


            if (
              !response.ok ||
              response.headers.get(
                'X-DeepSpace-Archive-Offline-Cache'
              ) ===
                '1'
            ) {

              continue

            }


            const data:
              HomeMediaResponse =
              await response.json()


            for (
              const homeItem
              of data.items
            ) {

              if (
                alreadyTracked.has(
                  homeItem.relativePath
                )
              ) {

                continue

              }


              queueHomeMediaDownload(
                character,
                homeItem,
                bridge,
                requestedHomeDownloadsRef.current
              )


              alreadyTracked.add(
                homeItem.relativePath
              )

            }

          } catch (error) {

            console.error(
              `Unable to prefetch ${character} Home media:`,
              error
            )

          }

        }

      }


      void prefetchHomeMedia()


      return () => {

        cancelled =
          true

      }

    },
    [
      isMobileApp,
      nasConnected,
    ]
  )


  useEffect(
    () => {

      if (
        !isMobileApp ||
        mediaItems.length ===
          0
      ) {

        return

      }


      let cancelled =
        false


      function refreshLocalHomeMedia() {

        if (
          cancelled
        ) {

          return

        }


        const bridge =
          getMobileHomeBridge()


        const capacitor =
          getCapacitorFileBridge()


        if (
          !bridge?.isDownloaded ||
          !bridge.getLocalMediaPath ||
          !capacitor?.convertFileSrc
        ) {

          return

        }


        const nextUrls:
          Record<
            string,
            string
          > = {}


        for (
          const homeItem
          of mediaItems
        ) {

          try {

            if (
              !bridge.isDownloaded(
                homeItem.relativePath
              )
            ) {

              continue

            }


            const localPath =
              bridge.getLocalMediaPath(
                homeItem.relativePath
              )


            if (
              localPath
            ) {

              nextUrls[
                homeItem.relativePath
              ] =
                capacitor.convertFileSrc(
                  localPath
                )

            }

          } catch (error) {

            console.error(
              'Unable to resolve cached Home media:',
              error
            )

          }

        }


        setLocalMediaUrls(
          nextUrls
        )

      }


      const initialTimer =
        window.setTimeout(
          refreshLocalHomeMedia,
          0
        )


      const interval =
        window.setInterval(
          refreshLocalHomeMedia,
          1000
        )


      return () => {

        cancelled =
          true


        window.clearTimeout(
          initialTimer
        )


        window.clearInterval(
          interval
        )

      }

    },
    [
      isMobileApp,
      mediaItems,
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
      ? (
          localMediaUrls[
            currentMedia.relativePath
          ] ??
          (
            nasConnected
              ? homeMediaUrl(
                  currentMedia
                )
              : null
          )
        )
      : null


  const currentMediaType =
    currentMedia?.mediaType ??
    null


  const currentMediaPath =
    currentMedia?.relativePath ??
    null


  function resolvedHomeMediaUrl(
    homeItem: HomeMediaItem
  ) {

    return (
      localMediaUrls[
        homeItem.relativePath
      ] ??
      (
        nasConnected
          ? homeMediaUrl(
              homeItem
            )
          : null
      )
    )

  }


  useEffect(
    () => {

      for (
        const [
          relativePath,
          video,
        ]
        of Object.entries(
          homeVideoRefs.current
        )
      ) {

        if (
          !video
        ) {

          continue

        }


        if (
          relativePath ===
          currentMediaPath
        ) {

          if (
            video.ended
          ) {

            video.currentTime =
              0

          }


          void video
            .play()
            .catch(
              () => {}
            )

        } else {

          video.pause()

        }

      }

    },
    [
      currentMediaPath,
    ]
  )


  useEffect(
    () => {

      for (
        const [
          relativePath,
          video,
        ]
        of Object.entries(
          homeVideoRefs.current
        )
      ) {

        if (
          !video
        ) {

          continue

        }


        video.muted =
          relativePath !==
            currentMediaPath ||
          !soundEnabled

      }

    },
    [
      currentMediaPath,
      soundEnabled,
    ]
  )


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
        currentMediaUrl && (

          currentMedia.mediaType ===
            'video' ? (

            <video
              className="background-video-blur"
              src={
                currentMediaUrl
              }
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              aria-hidden="true"
            />

          ) : (

            <img
              className="background-video-blur"
              src={
                currentMediaUrl
              }
              alt=""
              aria-hidden="true"
            />

          )

        )}


        <div className="home-media-main-stack">

          {mediaItems.map(
            (
              homeItem,
              index
            ) => {

              const mediaUrl =
                resolvedHomeMediaUrl(
                  homeItem
                )


              if (
                !mediaUrl
              ) {

                return null

              }


              const active =
                index ===
                mediaIndex


              if (
                homeItem.mediaType ===
                'video'
              ) {

                return (

                  <video
                    key={
                      homeItem.relativePath
                    }
                    ref={(node) => {

                      homeVideoRefs.current[
                        homeItem.relativePath
                      ] =
                        node

                    }}
                    className={
                      active
                        ? 'background-video-main home-media-layer active'
                        : 'background-video-main home-media-layer'
                    }
                    src={
                      mediaUrl
                    }
                    autoPlay={
                      active
                    }
                    loop={
                      mediaItems.length <=
                      1
                    }
                    muted={
                      !active ||
                      !soundEnabled
                    }
                    playsInline
                    preload="auto"
                    onEnded={() => {

                      if (
                        active
                      ) {

                        advanceMedia()

                      }

                    }}
                  />

                )

              }


              return (

                <img
                  key={
                    homeItem.relativePath
                  }
                  className={
                    active
                      ? 'background-video-main home-media-layer active'
                      : 'background-video-main home-media-layer'
                  }
                  src={
                    mediaUrl
                  }
                  alt={
                    active
                      ? `${selectedCharacter} Home artwork`
                      : ''
                  }
                  aria-hidden={
                    active
                      ? undefined
                      : 'true'
                  }
                />

              )

            }
          )}

        </div>


        {!currentMediaUrl && (

          <div className="home-media-message">

            {loadingMedia
              ? 'Loading Home media…'
              : mediaError ||
                `No offline Home media is available for ${selectedCharacter}.`}

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
