import {
  DatabaseSync,
} from 'node:sqlite'

import {
  applicationDatabasePath,
  ensureApplicationDatabaseMigrations,
} from '../services/databaseMigrations'


ensureApplicationDatabaseMigrations()


const database =
  new DatabaseSync(
    applicationDatabasePath
  )


export type ArchiveState = {
  category: string
  relativePath: string
  favorite: boolean
  rating: number | null
  playCount: number
  lastWatched: string | null
  progressSeconds: number
  durationSeconds: number | null
  completed: boolean
  totalWatchSeconds: number
}


type DatabaseStateRow = {
  category: string
  relative_path: string
  favorite: number
  rating: number | null
  play_count: number
  last_watched: string | null
  progress_seconds: number
  duration_seconds: number | null
  completed: number
  total_watch_seconds: number
}


function rowToArchiveState(
  row: DatabaseStateRow
): ArchiveState {

  return {
    category:
      row.category,

    relativePath:
      row.relative_path,

    favorite:
      Boolean(
        row.favorite
      ),

    rating:
      row.rating,

    playCount:
      row.play_count,

    lastWatched:
      row.last_watched,

    progressSeconds:
      row.progress_seconds,

    durationSeconds:
      row.duration_seconds,

    completed:
      Boolean(
        row.completed
      ),

    totalWatchSeconds:
      row.total_watch_seconds,
  }

}


function ensureState(
  category: string,
  relativePath: string
) {

  database
    .prepare(`
      INSERT OR IGNORE INTO archive_state (
        category,
        relative_path
      )
      VALUES (?, ?)
    `)
    .run(
      category,
      relativePath
    )

}


export function getArchiveState(
  category: string,
  relativePath: string
): ArchiveState {

  ensureState(
    category,
    relativePath
  )


  const row =
    database
      .prepare(`
        SELECT *
        FROM archive_state
        WHERE
          category = ?
          AND relative_path = ?
      `)
      .get(
        category,
        relativePath
      ) as DatabaseStateRow


  return rowToArchiveState(
    row
  )

}



export function renameArchiveStatePath(
  category: string,
  oldRelativePath: string,
  newRelativePath: string
) {

  if (
    oldRelativePath ===
    newRelativePath
  ) {

    return false

  }


  database.exec(
    'BEGIN IMMEDIATE'
  )


  try {

    /*
     * A physical target file is required to be absent
     * before Override runs, so any state already stored
     * at the target path is stale. Prefer the state that
     * belongs to the file being renamed.
     */
    database
      .prepare(`
        DELETE FROM archive_state
        WHERE
          category = ?
          AND relative_path = ?
      `)
      .run(
        category,
        newRelativePath
      )


    const result =
      database
        .prepare(`
          UPDATE archive_state

          SET
            relative_path = ?

          WHERE
            category = ?
            AND relative_path = ?
        `)
        .run(
          newRelativePath,
          category,
          oldRelativePath
        )


    database.exec(
      'COMMIT'
    )


    return (
      result.changes >
      0
    )

  } catch (error) {

    database.exec(
      'ROLLBACK'
    )


    throw error

  }

}


export function listArchiveStates():
  ArchiveState[] {

  const rows =
    database
      .prepare(`
        SELECT *
        FROM archive_state
        ORDER BY
          last_watched DESC
      `)
      .all() as DatabaseStateRow[]


  return rows.map(
    rowToArchiveState
  )

}


export function setFavorite(
  category: string,
  relativePath: string,
  favorite: boolean
) {

  ensureState(
    category,
    relativePath
  )


  database
    .prepare(`
      UPDATE archive_state
      SET favorite = ?
      WHERE
        category = ?
        AND relative_path = ?
    `)
    .run(
      favorite ? 1 : 0,
      category,
      relativePath
    )


  return getArchiveState(
    category,
    relativePath
  )

}


export function setRating(
  category: string,
  relativePath: string,
  rating: number | null
) {

  ensureState(
    category,
    relativePath
  )


  database
    .prepare(`
      UPDATE archive_state
      SET rating = ?
      WHERE
        category = ?
        AND relative_path = ?
    `)
    .run(
      rating,
      category,
      relativePath
    )


  return getArchiveState(
    category,
    relativePath
  )

}


export function saveProgress(
  category: string,
  relativePath: string,
  progressSeconds: number,
  durationSeconds: number | null,
  watchedSeconds: number
) {

  ensureState(
    category,
    relativePath
  )


  const currentState =
    getArchiveState(
      category,
      relativePath
    )


  const nowCompleted =
    durationSeconds &&
    durationSeconds > 0
      ? progressSeconds /
          durationSeconds >=
        0.95
      : false


  const justCompleted =
    nowCompleted &&
    !currentState.completed


  database
    .prepare(`
      UPDATE archive_state

      SET
        progress_seconds = ?,

        duration_seconds = ?,

        completed = ?,

        play_count =
          play_count + ?,

        total_watch_seconds =
          total_watch_seconds + ?,

        last_watched = ?

      WHERE
        category = ?
        AND relative_path = ?
    `)
    .run(
      progressSeconds,
      durationSeconds,
      nowCompleted ? 1 : 0,
      justCompleted ? 1 : 0,
      Math.max(
        0,
        watchedSeconds
      ),
      new Date().toISOString(),
      category,
      relativePath
    )


  return getArchiveState(
    category,
    relativePath
  )

}


export function resetCompletion(
  category: string,
  relativePath: string
) {

  ensureState(
    category,
    relativePath
  )


  database
    .prepare(`
      UPDATE archive_state
      SET
        completed = 0,
        progress_seconds = 0
      WHERE
        category = ?
        AND relative_path = ?
    `)
    .run(
      category,
      relativePath
    )


  return getArchiveState(
    category,
    relativePath
  )

}
export type ArchiveStats = {
  totalItemsWithState: number
  totalCompletedWatches: number
  totalWatchSeconds: number
  totalFavorites: number
  averageRating: number | null

  ratingDistribution: {
    rating: number
    count: number
  }[]

  categoryStats: {
    category: string
    completedWatches: number
    watchSeconds: number
    favorites: number
    ratedItems: number
    averageRating: number | null
  }[]
}


export function getArchiveStats():
  ArchiveStats {

  const states =
    listArchiveStates()


  const totalItemsWithState =
    states.length


  const totalCompletedWatches =
    states.reduce(
      (total, state) =>
        total +
        state.playCount,
      0
    )


  const totalWatchSeconds =
    states.reduce(
      (total, state) =>
        total +
        state.totalWatchSeconds,
      0
    )


  const totalFavorites =
    states.filter(
      (state) =>
        state.favorite
    ).length


  const ratedStates =
    states.filter(
      (state) =>
        state.rating !== null
    )


  const averageRating =
    ratedStates.length > 0
      ? ratedStates.reduce(
          (total, state) =>
            total +
            (
              state.rating ??
              0
            ),
          0
        ) /
        ratedStates.length
      : null


  const ratingValues = [
    0.5,
    1,
    1.5,
    2,
    2.5,
    3,
    3.5,
    4,
    4.5,
    5,
  ]


  const ratingDistribution =
    ratingValues.map(
      (rating) => ({
        rating,

        count:
          states.filter(
            (state) =>
              state.rating ===
              rating
          ).length,
      })
    )


  const categories =
    Array.from(
      new Set(
        states.map(
          (state) =>
            state.category
        )
      )
    )


  const categoryStats =
    categories.map(
      (category) => {

        const categoryStates =
          states.filter(
            (state) =>
              state.category ===
              category
          )


        const ratedCategoryStates =
          categoryStates.filter(
            (state) =>
              state.rating !== null
          )


        const categoryAverageRating =
          ratedCategoryStates.length > 0
            ? ratedCategoryStates.reduce(
                (total, state) =>
                  total +
                  (
                    state.rating ??
                    0
                  ),
                0
              ) /
              ratedCategoryStates.length
            : null


        return {
          category,

          completedWatches:
            categoryStates.reduce(
              (total, state) =>
                total +
                state.playCount,
              0
            ),

          watchSeconds:
            categoryStates.reduce(
              (total, state) =>
                total +
                state.totalWatchSeconds,
              0
            ),

          favorites:
            categoryStates.filter(
              (state) =>
                state.favorite
            ).length,

          ratedItems:
            ratedCategoryStates.length,

          averageRating:
            categoryAverageRating,
        }

      }
    )


  return {
    totalItemsWithState,
    totalCompletedWatches,
    totalWatchSeconds,
    totalFavorites,
    averageRating,
    ratingDistribution,
    categoryStats,
  }

}