import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Link,
} from 'react-router-dom'

import type {
  ArchiveState,
} from '../data/archiveState'

import {
  canonicalArchiveCategory,
  fetchPersonalArchiveData,
  personalArchiveSources,
} from '../data/personalArchive'

import type {
  PersonalArchiveEntry,
} from '../data/personalArchive'


type StatsCharacter =
  | 'All'
  | 'Xavier'
  | 'Zayne'
  | 'Rafayel'
  | 'Sylus'
  | 'Caleb'
  | 'Other'


type CategoryStat = {
  category: string
  trackedItems: number
  completedItems: number
  completedPlays: number
  watchSeconds: number
  favorites: number
  ratedItems: number
  averageRating: number | null
}


type CharacterStat = {
  character: string
  trackedItems: number
  completedPlays: number
  watchSeconds: number
  favorites: number
}


const characterFilters:
  StatsCharacter[] = [
    'All',
    'Xavier',
    'Zayne',
    'Rafayel',
    'Sylus',
    'Caleb',
    'Other',
  ]


const ratingValues = [
  5,
  4.5,
  4,
  3.5,
  3,
  2.5,
  2,
  1.5,
  1,
  0.5,
]


function characterBucket(
  entry:
    PersonalArchiveEntry
): StatsCharacter {

  const character =
    entry.item?.character


  if (
    character ===
      'Xavier' ||
    character ===
      'Zayne' ||
    character ===
      'Rafayel' ||
    character ===
      'Sylus' ||
    character ===
      'Caleb'
  ) {

    return character

  }


  return 'Other'

}


function titleForEntry(
  entry:
    PersonalArchiveEntry
) {

  if (
    entry.item?.title
  ) {

    return entry.item.title

  }


  const normalized =
    entry.state.relativePath
      .replace(
        /\\/g,
        '/'
      )


  const filename =
    normalized
      .split(
        '/'
      )
      .pop() ??
    normalized


  return filename
    .replace(
      /\.[^.]+$/,
      ''
    )
    .replace(
      /[_-]+/g,
      ' '
    )
    .replace(
      /\s+/g,
      ' '
    )
    .trim()

}


function formatDuration(
  seconds:
    number
) {

  const safeSeconds =
    Math.max(
      0,
      Math.round(
        seconds
      )
    )


  const hours =
    Math.floor(
      safeSeconds /
      3600
    )


  const minutes =
    Math.floor(
      (
        safeSeconds %
        3600
      ) /
      60
    )


  if (
    hours >
    0
  ) {

    return (
      `${hours}h ${minutes}m`
    )

  }


  if (
    minutes >
    0
  ) {

    return `${minutes}m`

  }


  return `${safeSeconds}s`

}


function averageRating(
  states:
    ArchiveState[]
) {

  const ratings =
    states
      .map(
        (state) =>
          state.rating
      )
      .filter(
        (
          rating
        ): rating is number =>
          rating !==
          null
      )


  if (
    ratings.length ===
    0
  ) {

    return null

  }


  return (
    ratings.reduce(
      (
        total,
        rating
      ) =>
        total +
        rating,
      0
    ) /
    ratings.length
  )

}


function completedPlays(
  states:
    ArchiveState[]
) {

  return states.reduce(
    (
      total,
      state
    ) =>
      total +
      state.playCount,
    0
  )

}


function watchSeconds(
  states:
    ArchiveState[]
) {

  return states.reduce(
    (
      total,
      state
    ) =>
      total +
      state.totalWatchSeconds,
    0
  )

}


function StatsPage() {

  const [
    entries,
    setEntries,
  ] =
    useState<
      PersonalArchiveEntry[]
    >([])


  const [
    sourceErrors,
    setSourceErrors,
  ] =
    useState<
      Record<
        string,
        string
      >
    >({})


  const [
    selectedCharacter,
    setSelectedCharacter,
  ] =
    useState<StatsCharacter>(
      'All'
    )


  const [
    selectedCategory,
    setSelectedCategory,
  ] =
    useState(
      'All'
    )


  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    )


  const [
    refreshing,
    setRefreshing,
  ] =
    useState(
      false
    )


  const [
    error,
    setError,
  ] =
    useState(
      ''
    )


  const loadStats =
    useCallback(
      async (
        refresh =
          false
      ) => {

        try {

          if (
            refresh
          ) {

            setRefreshing(
              true
            )

          } else {

            setLoading(
              true
            )

          }


          const data =
            await fetchPersonalArchiveData()


          setEntries(
            data.entries
          )


          setSourceErrors(
            data.sourceErrors
          )


          setError(
            ''
          )

        } catch (
          loadError
        ) {

          console.error(
            'Unable to load Statistics:',
            loadError
          )


          setError(
            loadError instanceof
              Error
              ? loadError.message
              : 'Unable to load Statistics.'
          )

        } finally {

          setLoading(
            false
          )


          setRefreshing(
            false
          )

        }

      },
      []
    )


  useEffect(
    () => {

      const timeoutId =
        window.setTimeout(
          () => {

            void loadStats()

          },
          0
        )


      return () => {

        window.clearTimeout(
          timeoutId
        )

      }

    },
    [
      loadStats,
    ]
  )


  const categories =
    useMemo(
      () => {

        const presentCategories =
          new Set(
            entries.map(
              (entry) =>
                canonicalArchiveCategory(
                  entry.state.category
                )
            )
          )


        return personalArchiveSources
          .map(
            (source) =>
              source.category
          )
          .filter(
            (category) =>
              presentCategories.has(
                category
              )
          )

      },
      [
        entries,
      ]
    )


  const scopedEntries =
    useMemo(
      () => {

        return entries.filter(
          (entry) => {

            const characterMatches =
              selectedCharacter ===
                'All' ||
              characterBucket(
                entry
              ) ===
                selectedCharacter


            const categoryMatches =
              selectedCategory ===
                'All' ||
              canonicalArchiveCategory(
                entry.state.category
              ) ===
                selectedCategory


            return (
              characterMatches &&
              categoryMatches
            )

          }
        )

      },
      [
        entries,
        selectedCategory,
        selectedCharacter,
      ]
    )


  const scopedStates =
    useMemo(
      () =>
        scopedEntries.map(
          (entry) =>
            entry.state
        ),
      [
        scopedEntries,
      ]
    )


  const metrics =
    useMemo(
      () => {

        const trackedItems =
          scopedStates.length


        const completedItems =
          scopedStates.filter(
            (state) =>
              state.completed
          ).length


        const inProgressItems =
          scopedStates.filter(
            (state) =>
              !state.completed &&
              state.progressSeconds >
                0
          ).length


        const favorites =
          scopedStates.filter(
            (state) =>
              state.favorite
          ).length


        const ratedItems =
          scopedStates.filter(
            (state) =>
              state.rating !==
              null
          ).length


        return {
          trackedItems,

          watchSeconds:
            watchSeconds(
              scopedStates
            ),

          completedPlays:
            completedPlays(
              scopedStates
            ),

          completedItems,

          inProgressItems,

          favorites,

          ratedItems,

          averageRating:
            averageRating(
              scopedStates
            ),
        }

      },
      [
        scopedStates,
      ]
    )


  const categoryStats =
    useMemo(
      () => {

        return categories
          .map(
            (
              category
            ): CategoryStat => {

              const categoryEntries =
                entries.filter(
                  (entry) => {

                    if (
                      canonicalArchiveCategory(
                        entry.state.category
                      ) !==
                      category
                    ) {

                      return false

                    }


                    return (
                      selectedCharacter ===
                        'All' ||
                      characterBucket(
                        entry
                      ) ===
                        selectedCharacter
                    )

                  }
                )


              const states =
                categoryEntries.map(
                  (entry) =>
                    entry.state
                )


              const ratedStates =
                states.filter(
                  (state) =>
                    state.rating !==
                    null
                )


              return {
                category,

                trackedItems:
                  states.length,

                completedItems:
                  states.filter(
                    (state) =>
                      state.completed
                  ).length,

                completedPlays:
                  completedPlays(
                    states
                  ),

                watchSeconds:
                  watchSeconds(
                    states
                  ),

                favorites:
                  states.filter(
                    (state) =>
                      state.favorite
                  ).length,

                ratedItems:
                  ratedStates.length,

                averageRating:
                  averageRating(
                    states
                  ),
              }

            }
          )
          .filter(
            (stat) =>
              stat.trackedItems >
              0
          )
          .sort(
            (
              left,
              right
            ) =>
              right.watchSeconds -
              left.watchSeconds ||
              right.completedPlays -
              left.completedPlays ||
              left.category.localeCompare(
                right.category
              )
          )

      },
      [
        categories,
        entries,
        selectedCharacter,
      ]
    )


  const characterStats =
    useMemo(
      () => {

        return characterFilters
          .filter(
            (character) =>
              character !==
              'All'
          )
          .map(
            (
              character
            ): CharacterStat => {

              const characterEntries =
                entries.filter(
                  (entry) => {

                    if (
                      characterBucket(
                        entry
                      ) !==
                      character
                    ) {

                      return false

                    }


                    return (
                      selectedCategory ===
                        'All' ||
                      canonicalArchiveCategory(
                        entry.state.category
                      ) ===
                        selectedCategory
                    )

                  }
                )


              const states =
                characterEntries.map(
                  (entry) =>
                    entry.state
                )


              return {
                character,

                trackedItems:
                  states.length,

                completedPlays:
                  completedPlays(
                    states
                  ),

                watchSeconds:
                  watchSeconds(
                    states
                  ),

                favorites:
                  states.filter(
                    (state) =>
                      state.favorite
                  ).length,
              }

            }
          )
          .filter(
            (stat) =>
              stat.trackedItems >
              0
          )
          .sort(
            (
              left,
              right
            ) =>
              right.watchSeconds -
              left.watchSeconds ||
              right.completedPlays -
              left.completedPlays ||
              left.character.localeCompare(
                right.character
              )
          )

      },
      [
        entries,
        selectedCategory,
      ]
    )


  const ratingDistribution =
    useMemo(
      () => {

        return ratingValues.map(
          (rating) => ({
            rating,

            count:
              scopedStates.filter(
                (state) =>
                  state.rating ===
                  rating
              ).length,
          })
        )

      },
      [
        scopedStates,
      ]
    )


  const maxRatingCount =
    Math.max(
      1,
      ...ratingDistribution.map(
        (entry) =>
          entry.count
      )
    )


  const maxCategoryWatchSeconds =
    Math.max(
      1,
      ...categoryStats.map(
        (entry) =>
          entry.watchSeconds
      )
    )


  const maxCharacterWatchSeconds =
    Math.max(
      1,
      ...characterStats.map(
        (entry) =>
          entry.watchSeconds
      )
    )


  const topItems =
    useMemo(
      () => {

        return [
          ...scopedEntries,
        ]
          .filter(
            (entry) =>
              entry.state.totalWatchSeconds >
                0 ||
              entry.state.playCount >
                0
          )
          .sort(
            (
              left,
              right
            ) =>
              right.state.totalWatchSeconds -
              left.state.totalWatchSeconds ||
              right.state.playCount -
              left.state.playCount ||
              titleForEntry(
                left
              ).localeCompare(
                titleForEntry(
                  right
                )
              )
          )
          .slice(
            0,
            10
          )

      },
      [
        scopedEntries,
      ]
    )


  const unavailableSourceNames =
    Object.keys(
      sourceErrors
    )


  const missingMetadataCount =
    scopedEntries.filter(
      (entry) =>
        entry.item ===
        null
    ).length


  const hasScopeFilter =
    selectedCharacter !==
      'All' ||
    selectedCategory !==
      'All'


  function clearScope() {

    setSelectedCharacter(
      'All'
    )


    setSelectedCategory(
      'All'
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
            PERSONAL LIBRARY
          </span>


          <h1>
            Statistics
          </h1>

        </div>

      </header>


      <section className="stats-page-content">

        <div className="stats-scope-panel">

          <div className="stats-scope-heading">

            <div>

              <span className="archive-eyebrow">
                DATA SCOPE
              </span>


              <h2>
                All-Time Archive Activity
              </h2>


              <p>
                Statistics use the lifetime activity
                currently stored for playable archive
                items.
              </p>

            </div>


            <button
              type="button"
              className="stats-refresh-button"
              disabled={
                refreshing
              }
              onClick={() =>
                void loadStats(
                  true
                )
              }
            >
              {refreshing
                ? 'Refreshing...'
                : 'Refresh'}
            </button>

          </div>


          <div className="stats-filter-row">

            <div className="stats-character-filters">

              {characterFilters.map(
                (character) => (

                  <button
                    key={
                      character
                    }
                    type="button"
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


            <div className="stats-category-control">

              <select
                value={
                  selectedCategory
                }
                onChange={(event) =>
                  setSelectedCategory(
                    event.target.value
                  )
                }
                aria-label="Statistics category"
              >

                <option value="All">
                  All Categories
                </option>


                {categories.map(
                  (category) => (

                    <option
                      key={
                        category
                      }
                      value={
                        category
                      }
                    >
                      {category}
                    </option>

                  )
                )}

              </select>


              <button
                type="button"
                className="stats-clear-button"
                disabled={
                  !hasScopeFilter
                }
                onClick={
                  clearScope
                }
              >
                Clear Scope
              </button>

            </div>

          </div>


          <div className="stats-scope-summary">

            <span>
              Period:
              {' '}
              <strong>
                All Time
              </strong>
            </span>


            <span>
              Character:
              {' '}
              <strong>
                {selectedCharacter}
              </strong>
            </span>


            <span>
              Category:
              {' '}
              <strong>
                {selectedCategory}
              </strong>
            </span>

          </div>

        </div>


        {unavailableSourceNames.length >
          0 && (

          <div className="archive-state-warning">

            <span>

              Some collections could not be checked:
              {' '}

              {unavailableSourceNames.join(
                ', '
              )}

              . Their saved activity remains included,
              but item titles/characters may be
              unavailable.

            </span>


            <button
              type="button"
              onClick={() =>
                void loadStats(
                  true
                )
              }
            >
              Retry
            </button>

          </div>

        )}


        {loading ? (

          <section className="archive-feedback-panel">
            Loading statistics...
          </section>

        ) : error ? (

          <section className="archive-feedback-panel">

            <span className="archive-feedback-kicker">
              UNAVAILABLE
            </span>


            <h2>
              Statistics could not be loaded.
            </h2>


            <p>
              {error}
            </p>


            <button
              type="button"
              className="archive-feedback-button"
              onClick={() =>
                void loadStats()
              }
            >
              Retry
            </button>

          </section>

        ) : scopedEntries.length ===
          0 ? (

          <section className="archive-feedback-panel">

            <span className="archive-feedback-kicker">
              NO ACTIVITY
            </span>


            <h2>
              No saved activity matches this scope.
            </h2>


            <p>
              Start watching or listening to archive
              media, or clear the current scope.
            </p>


            {hasScopeFilter && (

              <button
                type="button"
                className="archive-feedback-button"
                onClick={
                  clearScope
                }
              >
                Clear Scope
              </button>

            )}

          </section>

        ) : (

          <>

            <section className="stats-metric-grid">

              <article className="stats-metric-card">

                <span>
                  WATCH TIME
                </span>


                <strong>
                  {formatDuration(
                    metrics.watchSeconds
                  )}
                </strong>


                <p>
                  Actual playback time accumulated
                  across the selected scope.
                </p>

              </article>


              <article className="stats-metric-card">

                <span>
                  COMPLETED PLAYS
                </span>


                <strong>
                  {metrics.completedPlays}
                </strong>


                <p>
                  Lifetime completions. A completion
                  is counted when playback first
                  reaches about 95%.
                </p>

              </article>


              <article className="stats-metric-card">

                <span>
                  TRACKED ITEMS
                </span>


                <strong>
                  {metrics.trackedItems}
                </strong>


                <p>
                  Items with saved activity such as
                  progress, rating, favorite, or
                  playback history.
                </p>

              </article>


              <article className="stats-metric-card">

                <span>
                  FAVORITES
                </span>


                <strong>
                  {metrics.favorites}
                </strong>


                <p>
                  Items currently marked as a
                  favorite.
                </p>

              </article>


              <article className="stats-metric-card">

                <span>
                  CURRENTLY COMPLETED
                </span>


                <strong>
                  {metrics.completedItems}
                </strong>


                <p>
                  Items whose current saved state is
                  completed.
                </p>

              </article>


              <article className="stats-metric-card">

                <span>
                  IN PROGRESS
                </span>


                <strong>
                  {metrics.inProgressItems}
                </strong>


                <p>
                  Items with a resume position that
                  are not currently completed.
                </p>

              </article>


              <article className="stats-metric-card">

                <span>
                  RATED ITEMS
                </span>


                <strong>
                  {metrics.ratedItems}
                </strong>


                <p>
                  Items with a saved half-star
                  rating.
                </p>

              </article>


              <article className="stats-metric-card">

                <span>
                  AVERAGE RATING
                </span>


                <strong>
                  {metrics.averageRating ===
                  null
                    ? '—'
                    : `★ ${metrics.averageRating.toFixed(
                        2
                      )}`}
                </strong>


                <p>
                  Mean rating across rated items
                  only.
                </p>

              </article>

            </section>


            <div className="stats-dashboard-grid">

              <section className="stats-panel">

                <div className="stats-panel-heading">

                  <div>

                    <span className="archive-eyebrow">
                      BREAKDOWN
                    </span>


                    <h2>
                      Watch Time by Category
                    </h2>

                  </div>


                  <span>
                    All Time
                  </span>

                </div>


                {categoryStats.length ===
                  0 ? (

                  <p className="stats-panel-empty">
                    No category activity in this
                    scope.
                  </p>

                ) : (

                  <div className="stats-bar-list">

                    {categoryStats.map(
                      (stat) => (

                        <div
                          className="stats-bar-row"
                          key={
                            stat.category
                          }
                        >

                          <div className="stats-bar-label">

                            <strong>
                              {stat.category}
                            </strong>


                            <span>
                              {formatDuration(
                                stat.watchSeconds
                              )}
                            </span>

                          </div>


                          <div className="stats-bar-track">

                            <span
                              style={{
                                width:
                                  `${Math.max(
                                    2,
                                    (
                                      stat.watchSeconds /
                                      maxCategoryWatchSeconds
                                    ) *
                                    100
                                  )}%`,
                              }}
                            />

                          </div>

                        </div>

                      )
                    )}

                  </div>

                )}

              </section>


              <section className="stats-panel">

                <div className="stats-panel-heading">

                  <div>

                    <span className="archive-eyebrow">
                      BREAKDOWN
                    </span>


                    <h2>
                      Watch Time by Character
                    </h2>

                  </div>


                  <span>
                    All Time
                  </span>

                </div>


                {characterStats.length ===
                  0 ? (

                  <p className="stats-panel-empty">
                    No character metadata is
                    available in this scope.
                  </p>

                ) : (

                  <div className="stats-bar-list">

                    {characterStats.map(
                      (stat) => (

                        <div
                          className="stats-bar-row"
                          key={
                            stat.character
                          }
                        >

                          <div className="stats-bar-label">

                            <strong>
                              {stat.character}
                            </strong>


                            <span>
                              {formatDuration(
                                stat.watchSeconds
                              )}
                            </span>

                          </div>


                          <div className="stats-bar-track">

                            <span
                              style={{
                                width:
                                  `${Math.max(
                                    2,
                                    (
                                      stat.watchSeconds /
                                      maxCharacterWatchSeconds
                                    ) *
                                    100
                                  )}%`,
                              }}
                            />

                          </div>

                        </div>

                      )
                    )}

                  </div>

                )}

              </section>


              <section className="stats-panel">

                <div className="stats-panel-heading">

                  <div>

                    <span className="archive-eyebrow">
                      RATINGS
                    </span>


                    <h2>
                      Rating Distribution
                    </h2>

                  </div>


                  <span>
                    {metrics.ratedItems}
                    {' rated'}
                  </span>

                </div>


                <div className="stats-rating-distribution">

                  {ratingDistribution.map(
                    (entry) => (

                      <div
                        className="stats-rating-row"
                        key={
                          entry.rating
                        }
                      >

                        <span className="stats-rating-label">
                          ★ {entry.rating}
                        </span>


                        <div className="stats-rating-track">

                          <span
                            style={{
                              width:
                                entry.count >
                                0
                                  ? `${Math.max(
                                      5,
                                      (
                                        entry.count /
                                        maxRatingCount
                                      ) *
                                      100
                                    )}%`
                                  : '0%',
                            }}
                          />

                        </div>


                        <strong>
                          {entry.count}
                        </strong>

                      </div>

                    )
                  )}

                </div>

              </section>


              <section className="stats-panel">

                <div className="stats-panel-heading">

                  <div>

                    <span className="archive-eyebrow">
                      MOST PLAYED
                    </span>


                    <h2>
                      Top Activity
                    </h2>

                  </div>


                  <span>
                    Top 10
                  </span>

                </div>


                {topItems.length ===
                  0 ? (

                  <p className="stats-panel-empty">
                    No completed playback or watch
                    time has been recorded yet.
                  </p>

                ) : (

                  <div className="stats-top-list">

                    {topItems.map(
                      (
                        entry,
                        index
                      ) => (

                        <article
                          className="stats-top-item"
                          key={
                            `${entry.state.category}::${entry.state.relativePath}`
                          }
                        >

                          <span className="stats-top-rank">
                            {index + 1}
                          </span>


                          <div className="stats-top-copy">

                            <strong>
                              {titleForEntry(
                                entry
                              )}
                            </strong>


                            <span>

                              {entry.item?.character ||
                                'Other / Unassigned'}

                              {' · '}

                              {entry.state.category}

                            </span>

                          </div>


                          <div className="stats-top-values">

                            <strong>
                              {formatDuration(
                                entry.state.totalWatchSeconds
                              )}
                            </strong>


                            <span>

                              {entry.state.playCount}

                              {' '}

                              {entry.state.playCount ===
                              1
                                ? 'completion'
                                : 'completions'}

                            </span>

                          </div>

                        </article>

                      )
                    )}

                  </div>

                )}

              </section>

            </div>


            <section className="stats-panel stats-category-table-panel">

              <div className="stats-panel-heading">

                <div>

                  <span className="archive-eyebrow">
                    DETAILS
                  </span>


                  <h2>
                    Category Summary
                  </h2>

                </div>


                <span>
                  {categoryStats.length}
                  {' categories'}
                </span>

              </div>


              <div className="stats-table-scroll">

                <table className="stats-category-table">

                  <thead>

                    <tr>

                      <th>
                        Category
                      </th>

                      <th>
                        Tracked
                      </th>

                      <th>
                        Current Completed
                      </th>

                      <th>
                        Completed Plays
                      </th>

                      <th>
                        Watch Time
                      </th>

                      <th>
                        Favorites
                      </th>

                      <th>
                        Rated
                      </th>

                      <th>
                        Avg Rating
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {categoryStats.map(
                      (stat) => (

                        <tr
                          key={
                            stat.category
                          }
                        >

                          <td>
                            <strong>
                              {stat.category}
                            </strong>
                          </td>


                          <td>
                            {stat.trackedItems}
                          </td>


                          <td>
                            {stat.completedItems}
                          </td>


                          <td>
                            {stat.completedPlays}
                          </td>


                          <td>
                            {formatDuration(
                              stat.watchSeconds
                            )}
                          </td>


                          <td>
                            {stat.favorites}
                          </td>


                          <td>
                            {stat.ratedItems}
                          </td>


                          <td>

                            {stat.averageRating ===
                            null
                              ? '—'
                              : `★ ${stat.averageRating.toFixed(
                                  2
                                )}`}

                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>

            </section>


            <section className="stats-definition-panel">

              <div>

                <span className="archive-eyebrow">
                  HOW THESE NUMBERS WORK
                </span>


                <h2>
                  Measurement Notes
                </h2>

              </div>


              <div className="stats-definition-grid">

                <article>

                  <strong>
                    Watch Time
                  </strong>


                  <p>
                    Accumulated playback time. Seeking
                    forward does not intentionally add
                    the skipped interval as watched
                    time.
                  </p>

                </article>


                <article>

                  <strong>
                    Completed Plays
                  </strong>


                  <p>
                    Lifetime completion count. A play
                    is counted when an item crosses
                    the completion threshold from an
                    incomplete state.
                  </p>

                </article>


                <article>

                  <strong>
                    Currently Completed
                  </strong>


                  <p>
                    Current completion state, not a
                    lifetime count. Restarting an item
                    resets its current completed state
                    while preserving its lifetime
                    completion count.
                  </p>

                </article>


                <article>

                  <strong>
                    All-Time Only
                  </strong>


                  <p>
                    The current database stores
                    lifetime totals plus each item's
                    latest watch timestamp. It does
                    not yet store individual viewing
                    sessions, so historical date-range
                    totals would not be accurate.
                  </p>

                </article>

              </div>


              {missingMetadataCount >
                0 && (

                <p className="stats-metadata-note">

                  {missingMetadataCount}

                  {' '}

                  {missingMetadataCount ===
                  1
                    ? 'tracked item does'
                    : 'tracked items do'}

                  {' '}

                  not currently resolve to library
                  metadata. Their activity is included
                  in totals, but character assignment
                  may appear under Other.

                </p>

              )}

            </section>

          </>

        )}

      </section>

    </main>

  )

}


export default StatsPage