export type PlaybackQueueItem = {
  category: string
  relativePath: string
  title: string
  character: string
  playerPath: string
}


const queueStorageKey =
  'deepspace-archive-up-next:v1'


const queueChangedEvent =
  'deepspace-archive-queue-changed'


function notifyQueueChanged() {

  if (
    typeof window ===
      'undefined'
  ) {

    return

  }


  window.dispatchEvent(
    new CustomEvent(
      queueChangedEvent
    )
  )

}


function validQueueItem(
  value:
    unknown
): value is
  PlaybackQueueItem {

  if (
    !value ||
    typeof value !==
      'object'
  ) {

    return false

  }


  const item =
    value as
      Partial<
        PlaybackQueueItem
      >


  return (
    typeof item.category ===
      'string' &&
    typeof item.relativePath ===
      'string' &&
    typeof item.title ===
      'string' &&
    typeof item.character ===
      'string' &&
    typeof item.playerPath ===
      'string'
  )

}


export function readPlaybackQueue():
  PlaybackQueueItem[] {

  try {

    const raw =
      localStorage.getItem(
        queueStorageKey
      )


    if (!raw) {

      return []

    }


    const parsed =
      JSON.parse(
        raw
      )


    return Array.isArray(
      parsed
    )
      ? parsed.filter(
          validQueueItem
        )
      : []

  } catch {

    return []

  }

}


export function replacePlaybackQueue(
  items:
    PlaybackQueueItem[]
) {

  try {

    if (
      items.length ===
        0
    ) {

      localStorage.removeItem(
        queueStorageKey
      )

    } else {

      localStorage.setItem(
        queueStorageKey,
        JSON.stringify(
          items
        )
      )

    }

  } finally {

    notifyQueueChanged()

  }

}


export function clearPlaybackQueue() {

  replacePlaybackQueue(
    []
  )

}


export function addPlaybackNext(
  item:
    PlaybackQueueItem
) {

  const current =
    readPlaybackQueue()


  replacePlaybackQueue([
    item,
    ...current.filter(
      (candidate) =>
        !(
          candidate.category ===
            item.category &&
          candidate.relativePath ===
            item.relativePath
        )
    ),
  ])

}


export function addPlaybackLast(
  item:
    PlaybackQueueItem
) {

  const current =
    readPlaybackQueue()
      .filter(
        (candidate) =>
          !(
            candidate.category ===
              item.category &&
            candidate.relativePath ===
              item.relativePath
          )
      )


  replacePlaybackQueue([
    ...current,
    item,
  ])

}


export function shiftPlaybackQueue() {

  const current =
    readPlaybackQueue()


  const [
    next,
    ...rest
  ] =
    current


  replacePlaybackQueue(
    rest
  )


  return next ??
    null

}


export function playbackQueueItemUrl(
  item:
    PlaybackQueueItem
) {

  const query =
    new URLSearchParams({
      file:
        item.relativePath,
    })


  if (
    item.category ===
      'Phone Call' ||
    item.category ===
      'Phone Video'
  ) {

    query.set(
      'category',
      item.category
    )

  }


  return (
    `${item.playerPath}?${query}`
  )

}


export function archiveIndexToQueueItem(
  item: {
    archiveCategory: string
    relativePath: string
    title: string
    character: string
    playerPath: string
  }
): PlaybackQueueItem {

  return {
    category:
      item.archiveCategory,

    relativePath:
      item.relativePath,

    title:
      item.title,

    character:
      item.character,

    playerPath:
      item.playerPath,
  }

}


export function subscribePlaybackQueue(
  listener:
    () => void
) {

  window.addEventListener(
    queueChangedEvent,
    listener
  )


  return () => {

    window.removeEventListener(
      queueChangedEvent,
      listener
    )

  }

}