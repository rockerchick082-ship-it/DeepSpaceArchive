import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  Link,
  useNavigate,
  useSearchParams,
} from 'react-router-dom'

import type {
  ArchiveItem,
} from '../data/archive'

import type {
  ArchiveState,
} from '../data/archiveState'

import type {
  Playlist,
  PlaylistItem,
} from '../data/playlists'

import PlaylistPicker from './PlaylistPicker'


declare global {
  interface Window {
    DeepSpaceArchiveMobile?: {
      isMobileApp: () => boolean
      download: (
        payloadJson: string
      ) => void
      getDownloads: () => string
      isDownloaded: (
        relativePath: string
      ) => boolean
      getLocalMediaPath: (
        relativePath: string
      ) => string
      getLocalMediaUrl?: (
        relativePath: string
      ) => string
      getLocalMediaStreamUrl?: (
        relativePath: string
      ) => string
      getMediaStreamUrl?: (
        relativePath: string
      ) => string
      getServerUrl?: () => string
      deleteDownload: (
        relativePath: string
      ) => boolean
    }

    Capacitor?: {
      convertFileSrc: (
        filePath: string
      ) => string
    }
  }
}


type ArchiveResponse = {
  count: number
  items: ArchiveItem[]
}


type VideoInfo = {
  width: number | null
  height: number | null
  resolutionLabel: string
  duration: number | null
  codec: string | null
  frameRate: string | null
}


type PlaylistResponse = {
  items: Playlist[]
}


type PlaylistItemsResponse = {
  items: PlaylistItem[]
}


type VideoArchivePlayerProps = {
  categoryLabel: string
  apiEndpoint: string
  returnPath: string
  playerPath: string
  sequenceMode?: boolean
}


const categoryPlayerPaths:
  Record<string, string> = {

  Memoria:
    '/memoria/watch',

  'Secret Times':
    '/secret-times/watch',

  Myths:
    '/myths/watch',

  Bond:
    '/bond/watch',

  'Tender Moments':
    '/tender-moments/watch',

  'Phone Call':
    '/phone/watch',

  'Phone Video':
    '/phone/watch',

  Illusio:
    '/illusio/watch',

  'Main Story':
    '/main-story/watch',

}


const autoPlayNextStorageKey =
  'deepspace-archive-auto-play-next'


const mobileProgressStoragePrefix =
  'deepspace-archive-mobile-progress:'


type MobileProgressCheckpoint = {
  progressSeconds: number
  durationSeconds: number | null
  savedAt: number
}


type MobileOfflinePlaybackRuntime = {
  saveProgress: (
    input: {
      category: string
      relativePath: string
      progressSeconds: number
      durationSeconds: number | null
      watchedSeconds: number
    }
  ) => ArchiveState | null

  restart: (
    input: {
      category: string
      relativePath: string
    }
  ) => ArchiveState | null

  flush: () => void
  connected: () => boolean
}


function getMobileOfflinePlaybackRuntime() {

  if (
    typeof window ===
      'undefined'
  ) {

    return undefined

  }


  return (
    window as typeof window & {
      DeepSpaceArchiveOfflinePlayback?:
        MobileOfflinePlaybackRuntime
    }
  ).DeepSpaceArchiveOfflinePlayback

}


function mobileProgressStorageKey(
  categoryLabel: string,
  relativePath: string
) {

  return (
    mobileProgressStoragePrefix +
    encodeURIComponent(
      categoryLabel
    ) +
    ':' +
    encodeURIComponent(
      relativePath
    )
  )

}


function readMobileProgressCheckpoint(
  categoryLabel: string,
  relativePath: string
) {

  try {

    const raw =
      localStorage.getItem(
        mobileProgressStorageKey(
          categoryLabel,
          relativePath
        )
      )


    if (
      !raw
    ) {

      return null

    }


    const parsed =
      JSON.parse(
        raw
      ) as
        MobileProgressCheckpoint


    if (
      !Number.isFinite(
        parsed.progressSeconds
      )
    ) {

      return null

    }


    return parsed

  } catch {

    return null

  }

}


function writeMobileProgressCheckpoint(
  categoryLabel: string,
  relativePath: string,
  progressSeconds: number,
  durationSeconds: number | null
) {

  try {

    localStorage.setItem(
      mobileProgressStorageKey(
        categoryLabel,
        relativePath
      ),
      JSON.stringify({
        progressSeconds,
        durationSeconds,
        savedAt:
          Date.now(),
      } satisfies
        MobileProgressCheckpoint)
    )

  } catch {
    // Local resume cache is best-effort only.
  }

}


function clearMobileProgressCheckpoint(
  categoryLabel: string,
  relativePath: string
) {

  try {

    localStorage.removeItem(
      mobileProgressStorageKey(
        categoryLabel,
        relativePath
      )
    )

  } catch {
    // Local resume cache is best-effort only.
  }

}


function getInitialAutoPlayNext() {

  try {

    const stored =
      localStorage.getItem(
        autoPlayNextStorageKey
      )


    if (
      stored ===
      'false'
    ) {

      return false

    }


    return true

  } catch {

    return true

  }

}


function VideoArchivePlayer({
  categoryLabel,
  apiEndpoint,
  returnPath,
  playerPath,
  sequenceMode = false,
}: VideoArchivePlayerProps) {

  const navigate =
    useNavigate()


  const [searchParams] =
    useSearchParams()


  const relativePath =
    searchParams.get('file')


  const isMobileApp =
    typeof window !==
      'undefined' &&
    Boolean(
      window.DeepSpaceArchiveMobile
    )


  /*
   * Choose the Android media transport exactly once per archive item.
   *
   * The native loopback server gives Chromium a real HTTP endpoint with
   * proper byte-range behavior. If the item was already downloaded when
   * this player opened, the URL is pinned to the local copy. Otherwise it
   * is pinned to the NAS proxy. A download finishing mid-playback therefore
   * cannot replace the active <video src>.
   */
  const mobilePlayback =
    useMemo(
      () => {

        if (
          !isMobileApp ||
          !relativePath ||
          !window.DeepSpaceArchiveMobile
        ) {

          return {
            url: '',
            local: false,
          }

        }


        const bridge =
          window.DeepSpaceArchiveMobile


        try {

          const local =
            bridge.isDownloaded(
              relativePath
            )


          const url =
            bridge.getMediaStreamUrl?.(
              relativePath
            ) ??
            ''


          return {
            url,
            local,
          }

        } catch (mediaSourceError) {

          console.error(
            'Unable to choose Android media source:',
            mediaSourceError
          )


          return {
            url: '',
            local: false,
          }

        }

      },
      [
        isMobileApp,
        relativePath,
      ]
    )


  const playlistText =
    searchParams.get('playlist')


  const playlistItemText =
    searchParams.get(
      'playlistItem'
    )


  const playlistId =
    playlistText
      ? Number(
          playlistText
        )
      : null


  const playlistItemId =
    playlistItemText
      ? Number(
          playlistItemText
        )
      : null


  const playlistMode =
    playlistId !== null &&
    Number.isInteger(
      playlistId
    )


  const videoRef =
    useRef<HTMLVideoElement | null>(
      null
    )


  const lastProgressSaveRef =
    useRef(0)


  const lastTrackedTimeRef =
    useRef(0)


  /*
   * Accumulate watched time locally while playback is active.
   * We intentionally do NOT write to SQLite every few seconds;
   * those periodic backend writes can interfere with media
   * streaming on lower-powered NAS hardware.
   */
  const pendingWatchedSecondsRef =
    useRef(0)


  const saveOnPageHideRef =
    useRef<() => void>(
      () => {}
    )


  const restartHandledRef =
    useRef(false)


  const seekingRef =
    useRef(false)


  const lastLocalCheckpointTimeRef =
    useRef(0)


  const [item, setItem] =
    useState<ArchiveItem | null>(
      null
    )


  const [allItems, setAllItems] =
    useState<ArchiveItem[]>([])


  const [videoInfo, setVideoInfo] =
    useState<VideoInfo | null>(
      null
    )


  const [archiveState, setArchiveState] =
    useState<ArchiveState | null>(
      null
    )


  const [playlistName, setPlaylistName] =
    useState('')


  const [playlistItems, setPlaylistItems] =
    useState<PlaylistItem[]>([])


  const [loading, setLoading] =
    useState(true)


  const [error, setError] =
    useState('')


  const [playbackSpeed, setPlaybackSpeed] =
    useState(1)


  const [loopVideo, setLoopVideo] =
    useState(false)


  const [
    mobileDownloaded,
    setMobileDownloaded,
  ] =
    useState(
      false
    )


  const [
    mobileLocalPath,
    setMobileLocalPath,
  ] =
    useState(
      ''
    )

  const [
    autoPlayNext,
    setAutoPlayNext,
  ] =
    useState(
      getInitialAutoPlayNext
    )

useEffect(
  () => {

    try {

      localStorage.setItem(
        autoPlayNextStorageKey,
        String(
          autoPlayNext
        )
      )

    } catch (error) {

      console.error(
        'Unable to save Auto-Play Next preference:',
        error
      )

    }

  },
  [
    autoPlayNext,
  ]
)

  useEffect(() => {

    lastProgressSaveRef.current =
      0

    lastTrackedTimeRef.current =
      0

    pendingWatchedSecondsRef.current =
      0

    restartHandledRef.current =
      false

    seekingRef.current =
      false

    lastLocalCheckpointTimeRef.current =
      0

  }, [relativePath])


  useEffect(
    () => {

      if (
        !relativePath ||
        typeof window ===
          'undefined' ||
        !window.DeepSpaceArchiveMobile
      ) {

        return

      }


      let cancelled =
        false


      function refreshLocalDownload() {

        if (
          cancelled ||
          !relativePath ||
          !window.DeepSpaceArchiveMobile
        ) {

          return

        }


        try {

          const bridge =
            window.DeepSpaceArchiveMobile


          const downloaded =
            bridge
              .isDownloaded(
                relativePath
              )


          const localPath =
            downloaded
              ? (
                  bridge
                    .getLocalMediaUrl?.(
                      relativePath
                    ) ||
                  bridge
                    .getLocalMediaPath(
                      relativePath
                    )
                )
              : ''


          setMobileDownloaded(
            downloaded
          )


          setMobileLocalPath(
            localPath
          )

        } catch (downloadError) {

          console.error(
            'Unable to read local download state:',
            downloadError
          )

        }

      }


      const initialTimer =
        window.setTimeout(
          refreshLocalDownload,
          0
        )


      const interval =
        window.setInterval(
          refreshLocalDownload,
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
      relativePath,
    ]
  )


  useEffect(() => {

    async function loadItem() {

      try {

        setLoading(true)


        if (!relativePath) {

          throw new Error(
            `No ${categoryLabel} item was selected`
          )

        }


        const response =
          await fetch(
            `${apiEndpoint}`
          )


        if (!response.ok) {

          throw new Error(
            `Unable to load ${categoryLabel}`
          )

        }


        const data:
          ArchiveResponse =
          await response.json()


        setAllItems(
          data.items
        )


        const selectedItem =
          data.items.find(
            (archiveItem) =>
              archiveItem.relativePath ===
              relativePath
          )


        if (!selectedItem) {

          throw new Error(
            `${categoryLabel} item could not be found`
          )

        }


        setItem(
          selectedItem
        )


        setError('')

      } catch (err) {

        console.error(err)


        setError(
          `This ${categoryLabel} item could not be loaded.`
        )

      } finally {

        setLoading(false)

      }

    }


    loadItem()

  }, [
    relativePath,
    apiEndpoint,
    categoryLabel,
  ])


  useEffect(() => {

    if (!relativePath) {
      return
    }


    const selectedRelativePath =
      relativePath


    async function loadVideoInfo() {

      try {

        setVideoInfo(
          null
        )


        const query =
          new URLSearchParams({
            relativePath:
              selectedRelativePath,
          })


        const response =
          await fetch(
            `/api/media-info?${query}`
          )


        if (!response.ok) {
          return
        }


        const data:
          VideoInfo =
          await response.json()


        setVideoInfo(
          data
        )

      } catch (error) {

        console.error(
          'Unable to load video information:',
          error
        )

      }

    }


    void loadVideoInfo()

  }, [relativePath])


  useEffect(() => {

    if (!relativePath) {
      return
    }


    const selectedRelativePath =
      relativePath


    async function loadArchiveState() {

      try {

        const query =
          new URLSearchParams({
            category:
              categoryLabel,

            relativePath:
              selectedRelativePath,
          })


        const response =
          await fetch(
            `/api/archive/state?${query}`
          )


        if (!response.ok) {
          return
        }


        const state:
          ArchiveState =
          await response.json()


        setArchiveState(
          state
        )

      } catch (error) {

        console.error(
          'Unable to load archive state:',
          error
        )

      }

    }


    void loadArchiveState()

  }, [
    relativePath,
    categoryLabel,
  ])


  useEffect(() => {

    if (
      !playlistMode ||
      playlistId === null
    ) {

      return

    }


    async function loadPlaylistContext() {

      try {

        const [
          playlistsResponse,
          itemsResponse,
        ] =
          await Promise.all([

            fetch(
              '/api/playlists'
            ),

            fetch(
              `/api/playlists/${playlistId}/items`
            ),

          ])


        if (
          !playlistsResponse.ok ||
          !itemsResponse.ok
        ) {
          return
        }


        const playlistData:
          PlaylistResponse =
          await playlistsResponse.json()


        const itemData:
          PlaylistItemsResponse =
          await itemsResponse.json()


        const playlist =
          playlistData.items.find(
            (entry) =>
              entry.id ===
              playlistId
          )


        setPlaylistName(
          playlist?.name ??
          'Playlist'
        )


        setPlaylistItems(
          [...itemData.items].sort(
            (a, b) =>
              a.position -
              b.position
          )
        )

      } catch (error) {

        console.error(
          'Unable to load playlist context:',
          error
        )

      }

    }


    loadPlaylistContext()

  }, [
    playlistMode,
    playlistId,
  ])


  async function toggleFavorite() {

    if (
      !archiveState ||
      !relativePath
    ) {
      return
    }


    try {

      const response =
        await fetch(
          '/api/archive/favorite',
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                category:
                  categoryLabel,

                relativePath,

                favorite:
                  !archiveState.favorite,
              }),
          }
        )


      if (!response.ok) {
        return
      }


      const state:
        ArchiveState =
        await response.json()


      setArchiveState(
        state
      )

    } catch (error) {

      console.error(
        'Unable to update favorite:',
        error
      )

    }

  }


  async function updateRating(
    rating: number
  ) {

    if (!relativePath) {
      return
    }


    try {

      const response =
        await fetch(
          '/api/archive/rating',
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                category:
                  categoryLabel,

                relativePath,

                rating,
              }),
          }
        )


      if (!response.ok) {
        return
      }


      const state:
        ArchiveState =
        await response.json()


      setArchiveState(
        state
      )

    } catch (error) {

      console.error(
        'Unable to update rating:',
        error
      )

    }

  }


  async function clearRating() {

    if (!relativePath) {
      return
    }


    try {

      const response =
        await fetch(
          '/api/archive/rating',
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                category:
                  categoryLabel,

                relativePath,

                rating:
                  null,
              }),
          }
        )


      if (!response.ok) {
        return
      }


      const state:
        ArchiveState =
        await response.json()


      setArchiveState(
        state
      )

    } catch (error) {

      console.error(
        'Unable to clear rating:',
        error
      )

    }

  }


  const resetCompletedWatch =
    useCallback(
      async () => {

    if (
      !archiveState?.completed ||
      restartHandledRef.current ||
      !relativePath
    ) {
      return
    }


    const video =
      videoRef.current


    if (!video) {
      return
    }


    if (
      video.currentTime > 5
    ) {
      return
    }


    restartHandledRef.current =
      true


    const mobileRuntime =
      getMobileOfflinePlaybackRuntime()


    if (
      isMobileApp &&
      mobileRuntime
    ) {

      const state =
        mobileRuntime.restart({
          category:
            categoryLabel,

          relativePath,
        })


      if (
        state
      ) {

        setArchiveState(
          state
        )


        clearMobileProgressCheckpoint(
          categoryLabel,
          relativePath
        )


        lastTrackedTimeRef.current =
          video.currentTime


        lastProgressSaveRef.current =
          video.currentTime


        return

      }


      restartHandledRef.current =
        false


      return

    }


    try {

      const response =
        await fetch(
          '/api/archive/restart',
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                category:
                  categoryLabel,

                relativePath,
              }),
          }
        )


      if (!response.ok) {

        restartHandledRef.current =
          false

        return
      }


      const state:
        ArchiveState =
        await response.json()


      setArchiveState(
        state
      )


      if (
        window.DeepSpaceArchiveMobile
      ) {

        clearMobileProgressCheckpoint(
          categoryLabel,
          relativePath
        )

      }


      lastTrackedTimeRef.current =
        video.currentTime


      lastProgressSaveRef.current =
        video.currentTime

    } catch (error) {

      restartHandledRef.current =
        false


      console.error(
        'Unable to restart completed watch:',
        error
      )

    }

      },
      [
        archiveState,
        relativePath,
        categoryLabel,
        isMobileApp,
      ]
    )


  function saveLocalResumeCheckpoint(
    force = false
  ) {

    const video =
      videoRef.current


    if (
      !video ||
      !relativePath ||
      !window.DeepSpaceArchiveMobile
    ) {

      return

    }


    const currentTime =
      video.currentTime


    const now =
      Date.now()


    if (
      !force &&
      now -
        lastLocalCheckpointTimeRef.current <
        2000
    ) {

      return

    }


    if (
      !Number.isFinite(
        currentTime
      ) ||
      currentTime < 0
    ) {

      return

    }


    lastLocalCheckpointTimeRef.current =
      now


    writeMobileProgressCheckpoint(
      categoryLabel,
      relativePath,
      currentTime,
      Number.isFinite(
        video.duration
      )
        ? video.duration
        : null
    )

  }


  function trackPlaybackLocally() {

    const video =
      videoRef.current


    if (
      !video ||
      !relativePath
    ) {

      return

    }


    const currentTime =
      video.currentTime


    const previousTime =
      lastTrackedTimeRef.current


    const delta =
      currentTime -
      previousTime


    /*
     * timeupdate normally advances in small increments.
     * Ignore negative/large jumps so seeking is not counted
     * as watched time.
     */
    if (
      delta >= 0 &&
      delta <= 3
    ) {

      pendingWatchedSecondsRef.current +=
        delta

    }


    lastTrackedTimeRef.current =
      currentTime


    /*
     * The Android app keeps a tiny local resume checkpoint instead
     * of sending a NAS request every 10 seconds. This is intentionally
     * local-only so it cannot stall the video stream.
     */
    saveLocalResumeCheckpoint()

  }


  function resetLocalTrackingPosition() {

    const video =
      videoRef.current


    if (!video) {

      return

    }


    lastTrackedTimeRef.current =
      video.currentTime

  }


  async function savePlaybackProgress() {

    const video =
      videoRef.current


    if (
      !video ||
      !relativePath
    ) {

      return

    }


    /*
     * Capture any final small playback delta before saving.
     */
    trackPlaybackLocally()


    const currentTime =
      video.currentTime


    const watchedSeconds =
      pendingWatchedSecondsRef.current


    const durationSeconds =
      Number.isFinite(
        video.duration
      )
        ? video.duration
        : null


    /*
     * Always persist the local resume checkpoint first. This is synchronous
     * browser storage and survives SPA navigation even when the NAS is gone.
     */
    if (
      isMobileApp
    ) {

      writeMobileProgressCheckpoint(
        categoryLabel,
        relativePath,
        currentTime,
        durationSeconds
      )

    }


    /*
     * Reset before any asynchronous work. If playback resumes while an online
     * browser request is in flight, new watched time starts in a fresh bucket.
     */
    pendingWatchedSecondsRef.current =
      0


    lastTrackedTimeRef.current =
      currentTime


    lastProgressSaveRef.current =
      currentTime


    const mobileRuntime =
      getMobileOfflinePlaybackRuntime()


    if (
      isMobileApp &&
      mobileRuntime
    ) {

      const state =
        mobileRuntime.saveProgress({
          category:
            categoryLabel,

          relativePath,

          progressSeconds:
            currentTime,

          durationSeconds,

          watchedSeconds,
        })


      if (
        !state
      ) {

        pendingWatchedSecondsRef.current +=
          watchedSeconds


        return

      }


      setArchiveState(
        state
      )


      /*
       * Do not clear a completed checkpoint here. Keeping the end checkpoint
       * until the next open lets restore logic decide whether it represents a
       * newer offline session than the cached NAS state.
       */
      return

    }


    try {

      const response =
        await fetch(
          '/api/archive/progress',
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                category:
                  categoryLabel,

                relativePath,

                progressSeconds:
                  currentTime,

                durationSeconds,

                watchedSeconds,
              }),

            keepalive:
              true,
          }
        )


      if (!response.ok) {

        pendingWatchedSecondsRef.current +=
          watchedSeconds

        return
      }


      const state:
        ArchiveState =
        await response.json()


      setArchiveState(
        state
      )

    } catch (error) {

      pendingWatchedSecondsRef.current +=
        watchedSeconds


      console.error(
        'Unable to save playback progress:',
        error
      )

    }

  }


  /*
   * Keep the latest save callback in the ref from an
   * effect instead of mutating the ref during render.
   */
  useEffect(
    () => {

      saveOnPageHideRef.current =
        () => {

          void savePlaybackProgress()

        }

    }
  )


  useEffect(
    () => {

      function handlePageHide() {

        saveOnPageHideRef.current()

      }


      window.addEventListener(
        'pagehide',
        handlePageHide
      )


      return () => {

        window.removeEventListener(
          'pagehide',
          handlePageHide
        )

      }

    },
    []
  )


  useEffect(
    () => {

      return () => {

        /*
         * React Router navigation does not fire pagehide. The mobile save path
         * persists synchronously before it starts any optional sync, so this
         * cleanup makes hardware-back and SPA navigation durable too.
         */
        saveOnPageHideRef.current()

      }

    },
    []
  )


  const restoreProgress =
    useCallback(
      () => {

    const video =
      videoRef.current


    if (
      !video ||
      !archiveState ||
      !relativePath
    ) {
      return
    }


    const mobileCheckpoint =
      window.DeepSpaceArchiveMobile
        ? readMobileProgressCheckpoint(
            categoryLabel,
            relativePath
          )
        : null


    const archiveTimestamp =
      archiveState.lastWatched
        ? Date.parse(
            archiveState.lastWatched
          )
        : Number.NEGATIVE_INFINITY


    const checkpointIsNewer =
      Boolean(
        mobileCheckpoint &&
        Number.isFinite(
          mobileCheckpoint.savedAt
        ) &&
        mobileCheckpoint.savedAt >
          archiveTimestamp
      )


    /*
     * A cached NAS state can still say "completed" while the user has a newer
     * offline/local session. Never discard that newer checkpoint merely because
     * the cached server state is completed.
     */
    if (
      archiveState.completed &&
      !checkpointIsNewer
    ) {

      video.currentTime =
        0


      lastTrackedTimeRef.current =
        0


      lastProgressSaveRef.current =
        0


      if (
        !video.paused &&
        !video.ended
      ) {

        void resetCompletedWatch()

      }


      return

    }


    const preferredProgress =
      checkpointIsNewer &&
      mobileCheckpoint
        ? mobileCheckpoint.progressSeconds
        : archiveState.progressSeconds


    const knownDuration =
      Number.isFinite(
        video.duration
      ) &&
      video.duration > 0
        ? video.duration
        : (
            mobileCheckpoint?.durationSeconds ??
            archiveState.durationSeconds
          )


    const beforeEnd =
      !knownDuration ||
      preferredProgress <
        knownDuration - 2


    if (
      Number.isFinite(
        preferredProgress
      ) &&
      preferredProgress > 1 &&
      beforeEnd
    ) {

      video.currentTime =
        preferredProgress


      lastTrackedTimeRef.current =
        preferredProgress


      lastProgressSaveRef.current =
        preferredProgress


      pendingWatchedSecondsRef.current =
        0

    }

      },
      [
        archiveState,
        categoryLabel,
        relativePath,
        resetCompletedWatch,
      ]
    )


  useEffect(() => {

    const video =
      videoRef.current


    if (
      !archiveState ||
      !video ||
      video.readyState < 1
    ) {
      return
    }


    restoreProgress()

  }, [
    archiveState,
    restoreProgress,
  ])


  if (loading) {

    return (

      <main className="player-page player-message">

        Loading {categoryLabel}...

      </main>

    )

  }


  if (
    error ||
    !item ||
    !relativePath
  ) {

    return (

      <main className="player-page player-message">

        <p>
          {error ||
            `${categoryLabel} item not found.`}
        </p>


        <Link
          to={returnPath}
          className="player-return-link"
        >
          Return to {categoryLabel}
        </Link>

      </main>

    )

  }


  const currentItem =
    item


  const currentRelativePath =
    relativePath


  const localMediaUrl =
    mobileDownloaded &&
    mobileLocalPath
      ? (
          /^https?:\/\//i.test(
            mobileLocalPath
          )
            ? mobileLocalPath
            : window.Capacitor
                ?.convertFileSrc
              ? window.Capacitor.convertFileSrc(
                  mobileLocalPath
                )
              : ''
        )
      : ''


  const usingLocalMedia =
    isMobileApp
      ? mobilePlayback.local
      : Boolean(
          localMediaUrl
        )


  function downloadForOffline() {

    if (
      !isMobileApp ||
      !window.DeepSpaceArchiveMobile
    ) {
      return
    }


    const fileName =
      currentRelativePath
        .split(/[\\/]/)
        .pop() ??
      currentItem.title


    const query =
      new URLSearchParams({
        relativePath:
          currentRelativePath,
      })


    const downloadUrl =
      `${window.location.origin}/api/mobile/media/download?${query}`


    window.DeepSpaceArchiveMobile.download(
      JSON.stringify({
        title:
          currentItem.title,

        character:
          currentItem.character,

        category:
          categoryLabel,

        relativePath:
          currentRelativePath,

        downloadUrl,

        fileName,
      })
    )

  }


  /*
   * =====================================
   * NORMAL PLAYBACK SEQUENCE
   * =====================================
   *
   * Standard archives:
   * only items belonging to the same
   * character participate.
   *
   * Main Story sequence mode:
   * every returned story part participates
   * in canonical story order.
   */

  const characterItems =
    sequenceMode
      ? allItems
      : allItems.filter(
          (archiveItem) =>
            archiveItem.character ===
            currentItem.character
        )


  const currentIndex =
    characterItems.findIndex(
      (archiveItem) =>
        archiveItem.relativePath ===
        currentItem.relativePath
    )


  /*
   * =====================================
   * MAIN STORY DISPLAY CONTEXT
   * =====================================
   *
   * Main Story sequence items currently
   * store:
   *
   *   "Story Branch · Chapter"
   *
   * in currentItem.character.
   *
   * Keep the shared ArchiveItem shape, but
   * present that information with proper
   * Main Story labels in the UI.
   */

  const storyContextParts =
    sequenceMode
      ? currentItem.character
          .split(' · ')
          .map(
            (value) =>
              value.trim()
          )
      : []


  const storyBranchTitle =
    storyContextParts[0] ??
    'Main Story'


  const storyChapterTitle =
    storyContextParts
      .slice(1)
      .join(' · ') ||
    'Chapter'


  const currentChapterItems =
    sequenceMode
      ? allItems.filter(
          (archiveItem) =>
            archiveItem.character ===
            currentItem.character
        )
      : []


  const currentChapterPartIndex =
    sequenceMode
      ? currentChapterItems.findIndex(
          (archiveItem) =>
            archiveItem.relativePath ===
            currentItem.relativePath
        )
      : -1


  let previousItem:
    ArchiveItem | null =
    null


  let nextItem:
    ArchiveItem | null =
    null


  if (
    currentIndex >= 0
  ) {

    if (
      sequenceMode
    ) {

      if (
        currentIndex > 0
      ) {

        previousItem =
          characterItems[
            currentIndex - 1
          ]

      }


      if (
        currentIndex <
        characterItems.length - 1
      ) {

        nextItem =
          characterItems[
            currentIndex + 1
          ]

      }

    } else {

      previousItem =
        currentIndex === 0
          ? characterItems[
              characterItems.length - 1
            ]
          : characterItems[
              currentIndex - 1
            ]


      nextItem =
        currentIndex ===
        characterItems.length - 1
          ? characterItems[0]
          : characterItems[
              currentIndex + 1
            ]

    }

  }


  function getStoryContext(
    archiveItem:
      ArchiveItem | null
  ) {

    const parts =
      archiveItem
        ? archiveItem.character
            .split(' · ')
            .map(
              (value) =>
                value.trim()
            )
        : []


    return {

      branch:
        parts[0] ??
        '',

      chapter:
        parts
          .slice(1)
          .join(' · '),

    }

  }


  const previousStoryContext =
    sequenceMode
      ? getStoryContext(
          previousItem
        )
      : {
          branch: '',
          chapter: '',
        }


  const nextStoryContext =
    sequenceMode
      ? getStoryContext(
          nextItem
        )
      : {
          branch: '',
          chapter: '',
        }


  const previousStartsNewChapter =
    sequenceMode &&
    previousItem !== null &&
    previousItem.character !==
      currentItem.character


  const nextStartsNewChapter =
    sequenceMode &&
    nextItem !== null &&
    nextItem.character !==
      currentItem.character


  const previousStartsNewBranch =
    previousStartsNewChapter &&
    previousStoryContext.branch !==
      storyBranchTitle


  const nextStartsNewBranch =
    nextStartsNewChapter &&
    nextStoryContext.branch !==
      storyBranchTitle


 function openNormalItem(
  selectedItem: ArchiveItem
) {

  const query =
    new URLSearchParams(
      searchParams
    )


  query.set(
    'file',
    selectedItem.relativePath
  )


  /*
   * Normal archive navigation should
   * leave playlist context out unless
   * we are actually playing a playlist.
   */

  if (
    !playlistMode
  ) {

    query.delete(
      'playlist'
    )

    query.delete(
      'playlistItem'
    )

  }


  navigate(
    `${playerPath}?${query}`
  )

}


  function shuffleNormalItem() {

    if (
      characterItems.length <= 1
    ) {
      return
    }


    const otherItems =
      characterItems.filter(
        (archiveItem) =>
          archiveItem.relativePath !==
          currentItem.relativePath
      )


    const randomIndex =
      Math.floor(
        Math.random() *
        otherItems.length
      )


    openNormalItem(
      otherItems[
        randomIndex
      ]
    )

  }


  const currentPlaylistItem =
    playlistItems.find(
      (entry) =>
        entry.id ===
        playlistItemId
    ) ??
    playlistItems.find(
      (entry) =>
        entry.category ===
          categoryLabel &&
        entry.relativePath ===
          relativePath
    )


  const playlistIndex =
    currentPlaylistItem
      ? playlistItems.findIndex(
          (entry) =>
            entry.id ===
            currentPlaylistItem.id
        )
      : -1


  const previousPlaylistItem =
    playlistIndex >= 0 &&
    playlistItems.length > 0
      ? playlistItems[
          playlistIndex === 0
            ? playlistItems.length - 1
            : playlistIndex - 1
        ]
      : null


  const nextPlaylistItem =
    playlistIndex >= 0 &&
    playlistItems.length > 0
      ? playlistItems[
          playlistIndex ===
          playlistItems.length - 1
            ? 0
            : playlistIndex + 1
        ]
      : null


  function openPlaylistItem(
    selectedItem: PlaylistItem
  ) {

    if (
      playlistId === null
    ) {
      return
    }


    const targetPlayerPath =
      categoryPlayerPaths[
        selectedItem.category
      ]


    if (!targetPlayerPath) {
      return
    }


    const query =
      new URLSearchParams({
        file:
          selectedItem.relativePath,

        playlist:
          playlistId.toString(),

        playlistItem:
          selectedItem.id.toString(),
      })


    navigate(
      `${targetPlayerPath}?${query}`
    )

  }


  function shufflePlaylistItem() {

    if (
      playlistItems.length <= 1
    ) {
      return
    }


    const otherItems =
      playlistItems.filter(
        (entry) =>
          entry.id !==
          currentPlaylistItem?.id
      )


    const randomIndex =
      Math.floor(
        Math.random() *
        otherItems.length
      )


    openPlaylistItem(
      otherItems[
        randomIndex
      ]
    )

  }


  async function handleVideoEnded() {

    /*
     * Save the true end position first.
     *
     * The backend increments playCount when progress crosses the
     * completion threshold from incomplete -> completed. Resetting
     * completion before this save is unnecessary for a normal play
     * and, if that reset succeeds while the following progress write
     * fails, it erases the saved position without counting the play.
     */
    await savePlaybackProgress()


    restartHandledRef.current =
      false


    if (
      loopVideo
    ) {

      const video =
        videoRef.current


      if (
        !video ||
        !relativePath
      ) {

        return

      }


      const mobileRuntime =
        getMobileOfflinePlaybackRuntime()


      if (
        isMobileApp &&
        mobileRuntime
      ) {

        const state =
          mobileRuntime.restart({
            category:
              categoryLabel,

            relativePath,
          })


        if (
          state
        ) {

          setArchiveState(
            state
          )


          restartHandledRef.current =
            true

        }

      } else try {

        const response =
          await fetch(
            '/api/archive/restart',
            {
              method:
                'POST',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body:
                JSON.stringify({
                  category:
                    categoryLabel,

                  relativePath,
                }),
            }
          )


        if (
          response.ok
        ) {

          const state:
            ArchiveState =
            await response.json()


          setArchiveState(
            state
          )


          restartHandledRef.current =
            true

        }

      } catch (restartError) {

        console.error(
          'Unable to start next loop play:',
          restartError
        )

      }


      pendingWatchedSecondsRef.current =
        0


      lastTrackedTimeRef.current =
        0


      lastProgressSaveRef.current =
        0


      video.currentTime =
        0


      try {

        await video.play()

      } catch (playError) {

        console.error(
          'Unable to restart looping video:',
          playError
        )

      }


      return

    }


    if (
      !autoPlayNext
    ) {

      return

    }


    if (
      playlistMode
    ) {

      if (
        nextPlaylistItem &&
        playlistItems.length > 1
      ) {

        openPlaylistItem(
          nextPlaylistItem
        )

      }


      return

    }


    if (
      nextItem &&
      characterItems.length > 1
    ) {

      openNormalItem(
        nextItem
      )

    }

  }



  const mediaQuery =
    new URLSearchParams({
      relativePath:
        currentRelativePath,
    })


  const streamedMediaUrl =
    `/api/media?${mediaQuery}`


  /*
   * Android video bypasses WebResourceResponse entirely. Chromium talks to
   * the app's loopback HTTP media server, which either proxies the NAS or
   * serves the pinned downloaded file with genuine Range / 206 responses.
   * This is what makes seeking reliable in both online and offline mode.
   */
  const mediaUrl =
    isMobileApp
      ? (
          mobilePlayback.url ||
          streamedMediaUrl
        )
      : (
          localMediaUrl ||
          streamedMediaUrl
        )


  return (

    <main className="player-page">

      <header className="player-header">

        <Link
          to={
            playlistMode &&
            playlistId !== null
              ? `/playlists/${playlistId}`
              : returnPath
          }
          className="back-button"
          onClick={() => {

            saveLocalResumeCheckpoint(
              true
            )


            void savePlaybackProgress()

          }}
        >
          ‹
        </Link>


        <div className="player-title">

          <span className="archive-eyebrow">

            {sequenceMode ? (

              <>

                {storyBranchTitle}

                {' · '}

                {storyChapterTitle}

                {' · PART '}

                {currentChapterPartIndex + 1}

                {' OF '}

                {currentChapterItems.length}

              </>

            ) : (

              <>

                {currentItem.character}

                {' · '}

                {categoryLabel.toUpperCase()}

              </>

            )}

          </span>


          <h1>
            {currentItem.title}
          </h1>

        </div>

      </header>


      {playlistMode && (

        <section className="player-playlist-context">

          <div>

            <span className="archive-eyebrow">
              PLAYING FROM
            </span>

            <strong>
              {playlistName ||
                'Playlist'}
            </strong>

          </div>


          <span>

            {playlistIndex >= 0
              ? `${playlistIndex + 1} / ${playlistItems.length}`
              : `${playlistItems.length} items`}

          </span>

        </section>

      )}


      <div className="player-source-info">

        <span>
          SOURCE
        </span>


        <strong>

          {usingLocalMedia
            ? 'Offline Copy'
            : (
                videoInfo?.resolutionLabel ??
                'Detecting...'
              )}

        </strong>


        {!usingLocalMedia &&
          videoInfo?.width &&
          videoInfo?.height && (

          <span>

            {videoInfo.width}

            ×

            {videoInfo.height}

          </span>

        )}

      </div>


      <section className="player-stage">

        <video
          ref={videoRef}
          className="memory-video-player"
          src={mediaUrl}
          controls
          autoPlay
          playsInline
          preload="auto"
          onLoadedMetadata={
            restoreProgress
          }
          onPlay={() => {

            resetLocalTrackingPosition()

            void resetCompletedWatch()

          }}
          onTimeUpdate={
            trackPlaybackLocally
          }
          onSeeking={() => {

            seekingRef.current =
              true

            resetLocalTrackingPosition()

          }}
          onSeeked={() => {

            seekingRef.current =
              false

            resetLocalTrackingPosition()

            /*
             * Do not save the seek destination immediately. A failed seek
             * must not poison the local resume checkpoint. Once playback
             * actually advances again, onTimeUpdate will save the new stable
             * position without touching the NAS.
             */

          }}
          onPause={() => {

            /*
             * Seeking can briefly pause Android's media element.
             * Do not start a NAS write in the middle of the seek.
             */
            if (
              !videoRef.current?.ended &&
              !seekingRef.current
            ) {

              saveLocalResumeCheckpoint(
                true
              )

              void savePlaybackProgress()

            }

          }}
          onEnded={
            handleVideoEnded
          }
        />

      </section>


      <section className="player-user-state">

        <button
          className={
            archiveState?.favorite
              ? 'favorite-button active'
              : 'favorite-button'
          }
          onClick={
            toggleFavorite
          }
        >

          <span className="favorite-heart">

            {archiveState?.favorite
              ? '♥'
              : '♡'}

          </span>


          {archiveState?.favorite
            ? 'Favorited'
            : 'Favorite'}

        </button>


        <div className="rating-control">

          <span className="rating-label">
            YOUR RATING
          </span>


          <div className="rating-stars">

            {[1, 2, 3, 4, 5].map(
              (star) => {

                const rating =
                  archiveState?.rating ??
                  0


                const starValue =
                  rating -
                  (star - 1)


                let symbol =
                  '☆'


                if (
                  starValue >= 1
                ) {

                  symbol =
                    '★'

                }


                const halfFilled =
                  starValue >= 0.5 &&
                  starValue < 1


                return (

                  <div
                    key={star}
                    className="rating-star-wrapper"
                  >

                    <button
                      className="rating-half rating-left"
                      aria-label={`${star - 0.5} stars`}
                      onClick={() =>
                        updateRating(
                          star - 0.5
                        )
                      }
                    />


                    <button
                      className="rating-half rating-right"
                      aria-label={`${star} stars`}
                      onClick={() =>
                        updateRating(
                          star
                        )
                      }
                    />


                    <span
                      className={
                        halfFilled
                          ? 'rating-star-symbol rating-star-symbol-half'
                          : 'rating-star-symbol'
                      }
                    >
                      {symbol}
                    </span>

                  </div>

                )

              }
            )}

          </div>


          <span className="rating-value">

            {archiveState?.rating
              ? `${archiveState.rating.toFixed(1)} / 5`
              : 'Not rated'}

          </span>


          {archiveState?.rating !==
            null &&
            archiveState?.rating !==
            undefined && (

            <button
              className="rating-clear"
              onClick={
                clearRating
              }
            >
              Clear
            </button>

          )}

        </div>


        <PlaylistPicker
          category={
            categoryLabel
          }
          relativePath={
            currentRelativePath
          }
        />

      </section>


      {playlistMode ? (

        <section className="player-navigation">

          <button
            className="player-nav-button"
            onClick={() =>
              previousPlaylistItem &&
              openPlaylistItem(
                previousPlaylistItem
              )
            }
            disabled={
              !previousPlaylistItem
            }
          >

            <span className="player-nav-direction">
              ‹ Previous
            </span>

            <strong>
              {previousPlaylistItem
                ? previousPlaylistItem.category
                : 'Previous'}
            </strong>

          </button>


          <button
            className="player-shuffle-button"
            onClick={
              shufflePlaylistItem
            }
            disabled={
              playlistItems.length <= 1
            }
          >

            <span className="shuffle-symbol">
              ⇄
            </span>

            <span>
              Shuffle Playlist
            </span>

          </button>


          <button
            className="player-nav-button player-nav-next"
            onClick={() =>
              nextPlaylistItem &&
              openPlaylistItem(
                nextPlaylistItem
              )
            }
            disabled={
              !nextPlaylistItem
            }
          >

            <span className="player-nav-direction">
              Next ›
            </span>

            <strong>
              {nextPlaylistItem
                ? nextPlaylistItem.category
                : 'Next'}
            </strong>

          </button>

        </section>

      ) : (

        <section
          className={
            sequenceMode
              ? 'player-navigation player-navigation-sequence'
              : 'player-navigation'
          }
        >

          <button
            className="player-nav-button"
            onClick={() =>
              previousItem &&
              openNormalItem(
                previousItem
              )
            }
            disabled={
              !previousItem
            }
          >

            <span className="player-nav-direction">

              {sequenceMode &&
              previousStartsNewBranch
                ? '‹ Previous Story Branch'
                : sequenceMode &&
                  previousStartsNewChapter
                  ? '‹ Previous Chapter'
                  : '‹ Previous'}

            </span>

            <strong>

              {previousItem
                ? sequenceMode &&
                  previousStartsNewChapter
                  ? (
                      previousStartsNewBranch
                        ? `${previousStoryContext.branch} · ${previousStoryContext.chapter}`
                        : previousStoryContext.chapter
                    )
                  : previousItem.title
                : (
                    sequenceMode
                      ? 'Beginning of Story'
                      : `Previous ${categoryLabel}`
                  )}

            </strong>

            {sequenceMode &&
              previousStartsNewChapter &&
              previousItem && (

              <small className="player-nav-subtitle">
                {previousItem.title}
              </small>

            )}

          </button>


          {!sequenceMode && (

            <button
              className="player-shuffle-button"
              onClick={
                shuffleNormalItem
              }
              disabled={
                characterItems.length <= 1
              }
            >

              <span className="shuffle-symbol">
                ⇄
              </span>

              <span>
                Shuffle
              </span>

            </button>

          )}


          <button
            className="player-nav-button player-nav-next"
            onClick={() =>
              nextItem &&
              openNormalItem(
                nextItem
              )
            }
            disabled={
              !nextItem
            }
          >

            <span className="player-nav-direction">

              {sequenceMode &&
              nextStartsNewBranch
                ? 'Next Story Branch ›'
                : sequenceMode &&
                  nextStartsNewChapter
                  ? 'Next Chapter ›'
                  : 'Next ›'}

            </span>

            <strong>

              {nextItem
                ? sequenceMode &&
                  nextStartsNewChapter
                  ? (
                      nextStartsNewBranch
                        ? `${nextStoryContext.branch} · ${nextStoryContext.chapter}`
                        : nextStoryContext.chapter
                    )
                  : nextItem.title
                : (
                    sequenceMode
                      ? 'End of Story'
                      : `Next ${categoryLabel}`
                  )}

            </strong>

            {sequenceMode &&
              nextStartsNewChapter &&
              nextItem && (

              <small className="player-nav-subtitle">
                {nextItem.title}
              </small>

            )}

          </button>

        </section>

      )}


      <section className="player-extra-controls">

        <label className="player-control">

          <span>
            Playback Speed
          </span>


          <select
            value={
              playbackSpeed
            }
            onChange={(event) => {

              const speed =
                Number(
                  event.target.value
                )


              setPlaybackSpeed(
                speed
              )


              if (
                videoRef.current
              ) {

                videoRef.current.playbackRate =
                  speed

              }

            }}
          >

            <option value="0.5">
              0.5×
            </option>

            <option value="0.75">
              0.75×
            </option>

            <option value="1">
              Normal
            </option>

            <option value="1.25">
              1.25×
            </option>

            <option value="1.5">
              1.5×
            </option>

            <option value="1.75">
              1.75×
            </option>

            <option value="2">
              2×
            </option>

          </select>

        </label>

        <button
          type="button"
          className={
            autoPlayNext
              ? 'player-toggle active'
              : 'player-toggle'
          }
          onClick={() =>
            setAutoPlayNext(
              (current) =>
                !current
            )
          }
        >

          ▶ Auto-Play Next{' '}

          {autoPlayNext
            ? 'On'
            : 'Off'}

        </button>


        <button
          type="button"
          className={
            loopVideo
              ? 'player-toggle active'
              : 'player-toggle'
          }
          onClick={() =>
            setLoopVideo(
              (current) =>
                !current
            )
          }
        >

          ↻ Loop{' '}

          {loopVideo
            ? 'On'
            : 'Off'}

        </button>


        {isMobileApp && (

          mobileDownloaded ? (

            <button
              type="button"
              className="player-toggle active"
              disabled
            >
              ✓ Available Offline
            </button>

          ) : (

            <button
              type="button"
              className="player-toggle"
              onClick={
                downloadForOffline
              }
            >
              ↓ Download for Offline
            </button>

          )

        )}


        <button
          className="player-toggle"
          onClick={() => {

            videoRef.current
              ?.requestFullscreen()

          }}
        >
          ⛶ Fullscreen
        </button>

      </section>


      <section className="player-details">

        {sequenceMode ? (

          <>

            <div>

              <span className="player-detail-label">
                STORY BRANCH
              </span>

              <strong>
                {storyBranchTitle}
              </strong>

            </div>


            <div>

              <span className="player-detail-label">
                CHAPTER
              </span>

              <strong>
                {storyChapterTitle}
              </strong>

            </div>


            <div>

              <span className="player-detail-label">
                STORY PART
              </span>

              <strong>

                {currentChapterPartIndex + 1}

                {' / '}

                {currentChapterItems.length}

              </strong>

            </div>


            <div>

              <span className="player-detail-label">
                STORY PROGRESS
              </span>

              <strong>

                {currentIndex + 1}

                {' / '}

                {characterItems.length}

              </strong>

            </div>


            {currentItem.releaseDate && (

              <div>

                <span className="player-detail-label">
                  RELEASE DATE
                </span>

                <strong>
                  {currentItem.releaseDate}
                </strong>

              </div>

            )}


            <div>

              <span className="player-detail-label">
                COMPLETED PLAYS
              </span>

              <strong>
                {archiveState?.playCount ??
                  0}
              </strong>

            </div>

          </>

        ) : (

          <>

            <div>

              <span className="player-detail-label">
                CHARACTER
              </span>

              <strong>
                {currentItem.character}
              </strong>

            </div>


            <div>

              <span className="player-detail-label">
                CATEGORY
              </span>

              <strong>
                {categoryLabel}
              </strong>

            </div>


            {currentItem.releaseDate && (

              <div>

                <span className="player-detail-label">
                  RELEASE DATE
                </span>

                <strong>
                  {currentItem.releaseDate}
                </strong>

              </div>

            )}


            {currentItem.sortOrder !== null && (

              <div>

                <span className="player-detail-label">
                  RELEASE ORDER
                </span>

                <strong>
                  {currentItem.sortOrder}
                </strong>

              </div>

            )}


            <div>

              <span className="player-detail-label">
                CHARACTER LIBRARY
              </span>

              <strong>

                {currentIndex + 1}

                {' / '}

                {characterItems.length}

              </strong>

            </div>


            <div>

              <span className="player-detail-label">
                COMPLETED PLAYS
              </span>

              <strong>
                {archiveState?.playCount ??
                  0}
              </strong>

            </div>

          </>

        )}

      </section>

    </main>

  )

}


export default VideoArchivePlayer