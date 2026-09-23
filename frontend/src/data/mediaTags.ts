import {
  useEffect,
  useSyncExternalStore,
} from 'react'


export type MediaTagSummary = {
  name: string
  count: number
}


export type MediaTagAssignment = {
  category: string
  relativePath: string
  tags: string[]
}


type MediaTagResponse = {
  tags: MediaTagSummary[]
  assignments: MediaTagAssignment[]
}


type MediaTagSaveResponse =
  MediaTagAssignment & {
    tagSummaries?:
      MediaTagSummary[]
  }


type MediaTagSnapshot = {
  loaded: boolean
  loading: boolean
  error: string
  tags: MediaTagSummary[]
  assignments:
    Record<string, string[]>
}


const listeners =
  new Set<() => void>()


let snapshot:
  MediaTagSnapshot = {
    loaded:
      false,

    loading:
      false,

    error:
      '',

    tags:
      [],

    assignments:
      {},
  }


let loadingPromise:
  Promise<void> |
  null =
  null


function mediaTagKey(
  category: string,
  relativePath: string
) {

  return `${category}\u0000${relativePath}`

}


function emit() {

  for (
    const listener
    of listeners
  ) {

    listener()

  }

}


function setSnapshot(
  next:
    MediaTagSnapshot
) {

  snapshot =
    next


  emit()

}


function subscribe(
  listener: () => void
) {

  listeners.add(
    listener
  )


  return () => {

    listeners.delete(
      listener
    )

  }

}


function getSnapshot() {

  return snapshot

}


function assignmentRecord(
  assignments:
    MediaTagAssignment[]
) {

  const result:
    Record<string, string[]> =
    {}


  for (
    const assignment
    of assignments
  ) {

    result[
      mediaTagKey(
        assignment.category,
        assignment.relativePath
      )
    ] =
      assignment.tags

  }


  return result

}


export function getCachedMediaTags(
  category: string,
  relativePath: string
) {

  return (
    snapshot.assignments[
      mediaTagKey(
        category,
        relativePath
      )
    ] ??
    []
  )

}


export async function loadMediaTags(
  force = false
) {

  if (
    snapshot.loaded &&
    !force
  ) {

    return

  }


  if (
    loadingPromise
  ) {

    return loadingPromise

  }


  setSnapshot({
    ...snapshot,
    loading:
      true,
    error:
      '',
  })


  loadingPromise =
    (async () => {

      try {

        const response =
          await fetch(
            '/api/media-tags'
          )


        if (!response.ok) {

          throw new Error(
            'Unable to load media tags.'
          )

        }


        const data =
          await response.json() as
            MediaTagResponse


        setSnapshot({
          loaded:
            true,

          loading:
            false,

          error:
            '',

          tags:
            Array.isArray(
              data.tags
            )
              ? data.tags
              : [],

          assignments:
            assignmentRecord(
              Array.isArray(
                data.assignments
              )
                ? data.assignments
                : []
            ),
        })

      } catch (error) {

        setSnapshot({
          ...snapshot,
          loaded:
            true,
          loading:
            false,
          error:
            error instanceof Error
              ? error.message
              : 'Unable to load media tags.',
        })

      } finally {

        loadingPromise =
          null

      }

    })()


  return loadingPromise

}


export async function saveMediaTags(
  category: string,
  relativePath: string,
  tags: string[]
) {

  const response =
    await fetch(
      '/api/media-tags/item',
      {
        method:
          'PUT',

        headers: {
          'Content-Type':
            'application/json',
        },

        body:
          JSON.stringify({
            category,
            relativePath,
            tags,
          }),
      }
    )


  if (!response.ok) {

    const body =
      await response.json()
        .catch(
          () => null
        ) as {
          error?: string
        } | null


    throw new Error(
      body?.error ??
      'Unable to save media tags.'
    )

  }


  const data =
    await response.json() as
      MediaTagSaveResponse


  const key =
    mediaTagKey(
      data.category,
      data.relativePath
    )


  const assignments = {
    ...snapshot.assignments,
  }


  if (
    data.tags.length >
    0
  ) {

    assignments[key] =
      data.tags

  } else {

    delete assignments[key]

  }


  setSnapshot({
    ...snapshot,
    loaded:
      true,
    loading:
      false,
    error:
      '',
    assignments,
    tags:
      data.tagSummaries ??
      snapshot.tags,
  })


  return data.tags

}


export function useMediaTags() {

  const current =
    useSyncExternalStore(
      subscribe,
      getSnapshot,
      getSnapshot
    )


  useEffect(
    () => {

      void loadMediaTags()

    },
    []
  )


  return {
    ...current,

    tagsFor: (
      category: string,
      relativePath: string
    ) =>
      current.assignments[
        mediaTagKey(
          category,
          relativePath
        )
      ] ??
      [],

    saveTags:
      saveMediaTags,

    refresh: () =>
      loadMediaTags(
        true
      ),
  }

}
