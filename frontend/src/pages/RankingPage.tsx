import {
  useEffect,
  useMemo,
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


type RankingCategory = {
  key: string
  label: string
  category: string
  apiEndpoint: string
  playerPath: string
  playerQuery?: Record<string, string>
}


type ArchiveResponse = {
  count: number
  items: ArchiveItem[]
}


type RankingVote = {
  category: string
  character: string
  itemA: string
  itemB: string
  winner: string
  createdAt: string
  updatedAt: string
}


type RankingVoteResponse = {
  count: number
  items: RankingVote[]
}


type RankingPair = {
  left: ArchiveItem
  right: ArchiveItem
}


type RankingRow = {
  item: ArchiveItem
  wins: number
  comparisons: number
  winRate: number
}


const rankingCategories:
  RankingCategory[] = [
  {
    key:
      'memoria',

    label:
      'Memoria',

    category:
      'Memoria',

    apiEndpoint:
      '/api/library/memoria',

    playerPath:
      '/memoria/watch',
  },

  {
    key:
      'myths',

    label:
      'Myths',

    category:
      'Myths',

    apiEndpoint:
      '/api/library/myths',

    playerPath:
      '/myths/watch',
  },

  {
    key:
      'bond',

    label:
      'Bond',

    category:
      'Bond',

    apiEndpoint:
      '/api/library/bond',

    playerPath:
      '/bond/watch',
  },

  {
    key:
      'secret-times',

    label:
      'Secret Times',

    category:
      'Secret Times',

    apiEndpoint:
      '/api/library/secret-times',

    playerPath:
      '/secret-times/watch',
  },

  {
    key:
      'tender-moments',

    label:
      'Tender Moments',

    category:
      'Tender Moments',

    apiEndpoint:
      '/api/library/tender-moments',

    playerPath:
      '/tender-moments/watch',
  },
]


const characterOrder = [
  'Xavier',
  'Zayne',
  'Rafayel',
  'Sylus',
  'Caleb',
]


function pairKey(
  first: string,
  second: string
) {

  const ordered =
    first.localeCompare(
      second
    ) <= 0
      ? [
          first,
          second,
        ]
      : [
          second,
          first,
        ]


  return `${ordered[0]}\u0000${ordered[1]}`

}


function buildRoundRobinPairs(
  items: ArchiveItem[]
) {

  if (
    items.length < 2
  ) {

    return []

  }


  const participants:
    Array<ArchiveItem | null> =
    [...items]


  if (
    participants.length % 2 !==
    0
  ) {

    participants.push(
      null
    )

  }


  const pairs:
    RankingPair[] = []

  const count =
    participants.length


  for (
    let round = 0;
    round < count - 1;
    round += 1
  ) {

    for (
      let index = 0;
      index < count / 2;
      index += 1
    ) {

      const left =
        participants[index]

      const right =
        participants[
          count - 1 - index
        ]


      if (
        left &&
        right
      ) {

        pairs.push({
          left,
          right,
        })

      }

    }


    const fixed =
      participants[0]

    const last =
      participants[
        participants.length - 1
      ]

    const middle =
      participants.slice(
        1,
        -1
      )


    participants.splice(
      0,
      participants.length,
      fixed,
      last,
      ...middle
    )

  }


  return pairs

}


function compareArchiveItems(
  left: ArchiveItem,
  right: ArchiveItem
) {

  const leftOrder =
    left.sortOrder ??
    Number.MAX_SAFE_INTEGER

  const rightOrder =
    right.sortOrder ??
    Number.MAX_SAFE_INTEGER


  if (
    leftOrder !==
    rightOrder
  ) {

    return (
      leftOrder -
      rightOrder
    )

  }


  const leftRelease =
    left.releaseDate ??
    ''

  const rightRelease =
    right.releaseDate ??
    ''


  if (
    leftRelease !==
    rightRelease
  ) {

    return rightRelease.localeCompare(
      leftRelease
    )

  }


  return left.title.localeCompare(
    right.title
  )

}


async function readError(
  response: Response,
  fallback: string
) {

  const body =
    await response.json()
      .catch(
        () => null
      ) as {
        error?: string
      } | null


  return (
    body?.error ??
    fallback
  )

}


function RankingThumbnail({
  item,
  onWatch,
}: {
  item: ArchiveItem
  onWatch: () => void
}) {

  const customThumbnailUrl =
    item.thumbnailPath
      ? `/api/custom-thumbnail?${new URLSearchParams({
          filePath:
            item.thumbnailPath,
        })}`
      : null


  const catalogArtwork =
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
            imageUrl
          )
      ) ??
    null


  const [
    generatedThumbnailUrl,
    setGeneratedThumbnailUrl,
  ] =
    useState<string | null>(
      null
    )


  useEffect(
    () => {

      if (
        customThumbnailUrl ||
        catalogArtwork ||
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


          const data =
            await response.json() as {
              thumbnailUrl?: string
            }


          if (
            !cancelled &&
            data.thumbnailUrl
          ) {

            setGeneratedThumbnailUrl(
              data.thumbnailUrl
            )

          }

        } catch {
          // A missing generated thumbnail should not block ranking.
        }

      }


      void loadThumbnail()


      return () => {

        cancelled =
          true

      }

    },
    [
      catalogArtwork,
      customThumbnailUrl,
      item.filePath,
      item.mediaType,
    ]
  )


  const imageUrl =
    customThumbnailUrl ??
    catalogArtwork ??
    generatedThumbnailUrl


  return (

    <button
      type="button"
      className="ranking-thumbnail-button"
      onClick={
        onWatch
      }
      aria-label={
        `Watch ${item.title}`
      }
    >

      {imageUrl ? (

        <img
          src={
            imageUrl
          }
          alt=""
        />

      ) : (

        <span className="ranking-thumbnail-placeholder">
          ▶
        </span>

      )}


      <span className="ranking-watch-overlay">
        ▶ Watch
      </span>

    </button>

  )

}


function RankingPage() {

  const navigate =
    useNavigate()

  const [
    searchParams,
    setSearchParams,
  ] =
    useSearchParams()


  const requestedCategory =
    searchParams.get(
      'category'
    ) ??
    rankingCategories[0].key


  const selectedCategory =
    rankingCategories.find(
      (category) =>
        category.key ===
        requestedCategory
    ) ??
    rankingCategories[0]


  const requestedCharacter =
    searchParams.get(
      'character'
    ) ??
    ''


  const [
    allItems,
    setAllItems,
  ] =
    useState<ArchiveItem[]>(
      []
    )

  const [
    votes,
    setVotes,
  ] =
    useState<RankingVote[]>(
      []
    )

  const [
    loadingItems,
    setLoadingItems,
  ] =
    useState(
      true
    )

  const [
    loadingVotes,
    setLoadingVotes,
  ] =
    useState(
      false
    )

  const [
    voting,
    setVoting,
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


  useEffect(
    () => {

      let cancelled =
        false


      async function loadItems() {

        try {

          setLoadingItems(
            true
          )

          setError(
            ''
          )


          const response =
            await fetch(
              selectedCategory.apiEndpoint
            )


          if (
            !response.ok
          ) {

            throw new Error(
              await readError(
                response,
                `Unable to load ${selectedCategory.label}.`
              )
            )

          }


          const data =
            await response.json() as
              ArchiveResponse


          if (
            !cancelled
          ) {

            setAllItems(
              data.items.filter(
                (item) =>
                  item.mediaType ===
                  'video'
              )
            )

          }

        } catch (
          loadError
        ) {

          if (
            !cancelled
          ) {

            setAllItems(
              []
            )

            setError(
              loadError instanceof Error
                ? loadError.message
                : `Unable to load ${selectedCategory.label}.`
            )

          }

        } finally {

          if (
            !cancelled
          ) {

            setLoadingItems(
              false
            )

          }

        }

      }


      void loadItems()


      return () => {

        cancelled =
          true

      }

    },
    [
      selectedCategory.apiEndpoint,
      selectedCategory.label,
    ]
  )


  const characters =
    useMemo(
      () => {

        const available =
          new Set(
            allItems
              .map(
                (item) =>
                  item.character
              )
              .filter(
                Boolean
              )
          )


        return Array.from(
          available
        ).sort(
          (
            left,
            right
          ) => {

            const leftIndex =
              characterOrder.indexOf(
                left
              )

            const rightIndex =
              characterOrder.indexOf(
                right
              )


            if (
              leftIndex !== -1 ||
              rightIndex !== -1
            ) {

              return (
                (
                  leftIndex === -1
                    ? Number.MAX_SAFE_INTEGER
                    : leftIndex
                ) -
                (
                  rightIndex === -1
                    ? Number.MAX_SAFE_INTEGER
                    : rightIndex
                )
              )

            }


            return left.localeCompare(
              right
            )

          }
        )

      },
      [
        allItems,
      ]
    )


  const selectedCharacter =
    characters.includes(
      requestedCharacter
    )
      ? requestedCharacter
      : (
          characters[0] ??
          ''
        )


  useEffect(
    () => {

      if (
        loadingItems ||
        !selectedCharacter ||
        requestedCharacter ===
          selectedCharacter
      ) {

        return

      }


      const next =
        new URLSearchParams(
          searchParams
        )


      next.set(
        'category',
        selectedCategory.key
      )

      next.set(
        'character',
        selectedCharacter
      )


      setSearchParams(
        next,
        {
          replace:
            true,
        }
      )

    },
    [
      loadingItems,
      requestedCharacter,
      searchParams,
      selectedCategory.key,
      selectedCharacter,
      setSearchParams,
    ]
  )


  const characterItems =
    useMemo(
      () =>
        allItems
          .filter(
            (item) =>
              item.character ===
              selectedCharacter
          )
          .sort(
            compareArchiveItems
          ),
      [
        allItems,
        selectedCharacter,
      ]
    )


  const validRelativePaths =
    useMemo(
      () =>
        new Set(
          characterItems.map(
            (item) =>
              item.relativePath
          )
        ),
      [
        characterItems,
      ]
    )


  useEffect(
    () => {

      let cancelled =
        false


      async function loadVotes() {

        if (
          !selectedCharacter
        ) {

          if (
            !cancelled
          ) {

            setVotes(
              []
            )

            setLoadingVotes(
              false
            )

          }


          return

        }


        try {

          setLoadingVotes(
            true
          )

          setError(
            ''
          )


          const query =
            new URLSearchParams({
              category:
                selectedCategory.category,

              character:
                selectedCharacter,
            })


          const response =
            await fetch(
              `/api/rankings/votes?${query}`
            )


          if (
            !response.ok
          ) {

            throw new Error(
              await readError(
                response,
                'Unable to load ranking votes.'
              )
            )

          }


          const data =
            await response.json() as
              RankingVoteResponse


          if (
            !cancelled
          ) {

            setVotes(
              data.items
            )

          }

        } catch (
          voteError
        ) {

          if (
            !cancelled
          ) {

            setVotes(
              []
            )

            setError(
              voteError instanceof Error
                ? voteError.message
                : 'Unable to load ranking votes.'
            )

          }

        } finally {

          if (
            !cancelled
          ) {

            setLoadingVotes(
              false
            )

          }

        }

      }


      void loadVotes()


      return () => {

        cancelled =
          true

      }

    },
    [
      selectedCategory.category,
      selectedCharacter,
    ]
  )


  const pairs =
    useMemo(
      () =>
        buildRoundRobinPairs(
          characterItems
        ),
      [
        characterItems,
      ]
    )


  const voteMap =
    useMemo(
      () => {

        const map =
          new Map<string, RankingVote>()


        for (
          const vote
          of votes
        ) {

          if (
            validRelativePaths.has(
              vote.itemA
            ) &&
            validRelativePaths.has(
              vote.itemB
            ) &&
            validRelativePaths.has(
              vote.winner
            )
          ) {

            map.set(
              pairKey(
                vote.itemA,
                vote.itemB
              ),
              vote
            )

          }

        }


        return map

      },
      [
        validRelativePaths,
        votes,
      ]
    )


  const completedComparisons =
    pairs.reduce(
      (
        total,
        pair
      ) =>
        total +
        (
          voteMap.has(
            pairKey(
              pair.left.relativePath,
              pair.right.relativePath
            )
          )
            ? 1
            : 0
        ),
      0
    )


  const currentPair =
    pairs.find(
      (pair) =>
        !voteMap.has(
          pairKey(
            pair.left.relativePath,
            pair.right.relativePath
          )
        )
    ) ??
    null


  const ranking =
    useMemo<RankingRow[]>(
      () => {

        const stats =
          new Map<
            string,
            {
              wins: number
              comparisons: number
            }
          >()


        for (
          const item
          of characterItems
        ) {

          stats.set(
            item.relativePath,
            {
              wins:
                0,

              comparisons:
                0,
            }
          )

        }


        for (
          const vote
          of voteMap.values()
        ) {

          const first =
            stats.get(
              vote.itemA
            )

          const second =
            stats.get(
              vote.itemB
            )

          const winner =
            stats.get(
              vote.winner
            )


          if (
            first &&
            second &&
            winner
          ) {

            first.comparisons +=
              1

            second.comparisons +=
              1

            winner.wins +=
              1

          }

        }


        return characterItems
          .map(
            (item) => {

              const itemStats =
                stats.get(
                  item.relativePath
                ) ?? {
                  wins:
                    0,

                  comparisons:
                    0,
                }


              return {
                item,

                wins:
                  itemStats.wins,

                comparisons:
                  itemStats.comparisons,

                winRate:
                  itemStats.comparisons > 0
                    ? itemStats.wins /
                      itemStats.comparisons
                    : 0,
              }

            }
          )
          .sort(
            (
              left,
              right
            ) =>
              right.wins -
                left.wins ||
              right.winRate -
                left.winRate ||
              compareArchiveItems(
                left.item,
                right.item
              )
          )

      },
      [
        characterItems,
        voteMap,
      ]
    )


  const latestVote =
    [...voteMap.values()]
      .sort(
        (
          left,
          right
        ) =>
          Date.parse(
            right.updatedAt
          ) -
          Date.parse(
            left.updatedAt
          )
      )[0] ??
    null


  function updateSelection(
    categoryKey: string,
    character?: string
  ) {

    if (
      categoryKey !==
      selectedCategory.key
    ) {

      setLoadingItems(
        true
      )

    }


    setLoadingVotes(
      true
    )

    setVotes(
      []
    )


    const next =
      new URLSearchParams()


    next.set(
      'category',
      categoryKey
    )


    if (
      character
    ) {

      next.set(
        'character',
        character
      )

    }


    setSearchParams(
      next
    )

  }


  async function chooseWinner(
    winner: ArchiveItem
  ) {

    if (
      !currentPair ||
      voting ||
      !selectedCharacter
    ) {

      return

    }


    try {

      setVoting(
        true
      )

      setError(
        ''
      )


      const response =
        await fetch(
          '/api/rankings/vote',
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
                  selectedCategory.category,

                character:
                  selectedCharacter,

                itemA:
                  currentPair.left.relativePath,

                itemB:
                  currentPair.right.relativePath,

                winner:
                  winner.relativePath,
              }),
          }
        )


      if (
        !response.ok
      ) {

        throw new Error(
          await readError(
            response,
            'Unable to save ranking vote.'
          )
        )

      }


      const savedVote =
        await response.json() as
          RankingVote


      setVotes(
        (current) => [
          ...current.filter(
            (vote) =>
              pairKey(
                vote.itemA,
                vote.itemB
              ) !==
              pairKey(
                savedVote.itemA,
                savedVote.itemB
              )
          ),
          savedVote,
        ]
      )

    } catch (
      voteError
    ) {

      setError(
        voteError instanceof Error
          ? voteError.message
          : 'Unable to save ranking vote.'
      )

    } finally {

      setVoting(
        false
      )

    }

  }


  async function undoLastVote() {

    if (
      !latestVote ||
      voting
    ) {

      return

    }


    try {

      setVoting(
        true
      )

      setError(
        ''
      )


      const response =
        await fetch(
          '/api/rankings/vote',
          {
            method:
              'DELETE',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                category:
                  latestVote.category,

                character:
                  latestVote.character,

                itemA:
                  latestVote.itemA,

                itemB:
                  latestVote.itemB,
              }),
          }
        )


      if (
        !response.ok
      ) {

        throw new Error(
          await readError(
            response,
            'Unable to undo the last vote.'
          )
        )

      }


      const latestKey =
        pairKey(
          latestVote.itemA,
          latestVote.itemB
        )


      setVotes(
        (current) =>
          current.filter(
            (vote) =>
              pairKey(
                vote.itemA,
                vote.itemB
              ) !==
              latestKey
          )
      )

    } catch (
      undoError
    ) {

      setError(
        undoError instanceof Error
          ? undoError.message
          : 'Unable to undo the last vote.'
      )

    } finally {

      setVoting(
        false
      )

    }

  }


  async function resetRanking() {

    if (
      !selectedCharacter ||
      voting ||
      voteMap.size === 0 ||
      !window.confirm(
        `Restart ${selectedCharacter} ${selectedCategory.label} ranking?\n\nAll saved comparisons for this selection will be deleted.`
      )
    ) {

      return

    }


    try {

      setVoting(
        true
      )

      setError(
        ''
      )


      const query =
        new URLSearchParams({
          category:
            selectedCategory.category,

          character:
            selectedCharacter,
        })


      const response =
        await fetch(
          `/api/rankings/votes?${query}`,
          {
            method:
              'DELETE',
          }
        )


      if (
        !response.ok
      ) {

        throw new Error(
          await readError(
            response,
            'Unable to restart ranking.'
          )
        )

      }


      setVotes(
        []
      )

    } catch (
      resetError
    ) {

      setError(
        resetError instanceof Error
          ? resetError.message
          : 'Unable to restart ranking.'
      )

    } finally {

      setVoting(
        false
      )

    }

  }


  function watchItem(
    item: ArchiveItem
  ) {

    const rankingReturn =
      `/rankings?${new URLSearchParams({
        category:
          selectedCategory.key,

        character:
          selectedCharacter,
      })}`


    const query =
      new URLSearchParams({
        file:
          item.relativePath,

        return:
          rankingReturn,

        ...selectedCategory.playerQuery,
      })


    navigate(
      `${selectedCategory.playerPath}?${query}`
    )

  }


  const progressPercent =
    pairs.length > 0
      ? Math.round(
          completedComparisons /
          pairs.length *
          100
        )
      : 0


  const complete =
    pairs.length > 0 &&
    completedComparisons ===
      pairs.length


  return (

    <main className="archive-page ranking-page">

      <header className="archive-page-header">

        <Link
          to="/"
          className="back-button"
        >
          ‹
        </Link>


        <div>

          <span className="archive-eyebrow">
            THIS OR THAT
          </span>

          <h1>
            Rankings
          </h1>

        </div>

      </header>


      <section className="ranking-content">

        <div className="ranking-intro">

          <span className="archive-eyebrow">
            FAVORITE FINDER
          </span>

          <h2>
            Compare every video head-to-head
          </h2>

          <p>
            Choose a character and archive category. Every video is paired with every other video exactly once, and your choices are saved so you can leave and resume later.
          </p>

        </div>


        <div className="ranking-filters">

          <label>
            <span>
              Category
            </span>

            <select
              value={
                selectedCategory.key
              }
              onChange={
                (event) =>
                  updateSelection(
                    event.target.value
                  )
              }
            >

              {rankingCategories.map(
                (category) => (

                  <option
                    key={
                      category.key
                    }
                    value={
                      category.key
                    }
                  >
                    {category.label}
                  </option>

                )
              )}

            </select>
          </label>


          <label>
            <span>
              Character
            </span>

            <select
              value={
                selectedCharacter
              }
              disabled={
                loadingItems ||
                characters.length === 0
              }
              onChange={
                (event) =>
                  updateSelection(
                    selectedCategory.key,
                    event.target.value
                  )
              }
            >

              {characters.map(
                (character) => (

                  <option
                    key={
                      character
                    }
                    value={
                      character
                    }
                  >
                    {character}
                  </option>

                )
              )}

            </select>
          </label>

        </div>


        {error && (

          <div className="settings-status-message settings-status-error">
            {error}
          </div>

        )}


        {(
          loadingItems ||
          loadingVotes
        ) ? (

          <div className="ranking-empty-state">
            Loading ranking data...
          </div>

        ) : characterItems.length < 2 ? (

          <div className="ranking-empty-state">
            <strong>
              Not enough videos to rank.
            </strong>
            <span>
              This selection needs at least two detected video files.
            </span>
          </div>

        ) : (

          <>

            <section className="ranking-progress-card">

              <div className="ranking-progress-copy">

                <div>

                  <strong>
                    {completedComparisons.toLocaleString()}
                    {' / '}
                    {pairs.length.toLocaleString()}
                  </strong>

                  <span>
                    comparisons complete
                  </span>

                </div>


                <div>

                  <strong>
                    {characterItems.length}
                  </strong>

                  <span>
                    {selectedCharacter} {selectedCategory.label} videos
                  </span>

                </div>


                <div>

                  <strong>
                    {progressPercent}%
                  </strong>

                  <span>
                    finished
                  </span>

                </div>

              </div>


              <div className="ranking-progress-track">

                <span
                  style={{
                    width:
                      `${progressPercent}%`,
                  }}
                />

              </div>


              <div className="ranking-progress-actions">

                <button
                  type="button"
                  className="library-rescan-button"
                  onClick={() =>
                    void undoLastVote()
                  }
                  disabled={
                    !latestVote ||
                    voting
                  }
                >
                  Undo Last Choice
                </button>


                <button
                  type="button"
                  className="ranking-reset-button"
                  onClick={() =>
                    void resetRanking()
                  }
                  disabled={
                    voteMap.size === 0 ||
                    voting
                  }
                >
                  Restart Ranking
                </button>

              </div>

            </section>


            {currentPair ? (

              <section className="ranking-matchup-section">

                <div className="ranking-matchup-heading">

                  <span className="archive-eyebrow">
                    WHICH ONE DO YOU PREFER?
                  </span>

                  <p>
                    Click a thumbnail to watch it without casting a vote.
                  </p>

                </div>


                <div className="ranking-matchup-grid">

                  {[
                    currentPair.left,
                    currentPair.right,
                  ].map(
                    (item) => (

                      <article
                        className="ranking-choice-card"
                        key={
                          item.relativePath
                        }
                      >

                        <RankingThumbnail
                          item={
                            item
                          }
                          onWatch={() =>
                            watchItem(
                              item
                            )
                          }
                        />


                        <div className="ranking-choice-copy">

                          <span>
                            {item.character}
                          </span>

                          <h3>
                            {item.title}
                          </h3>

                          {item.releaseDate && (

                            <small>
                              {item.releaseDate}
                            </small>

                          )}

                        </div>


                        <button
                          type="button"
                          className="ranking-choice-button"
                          disabled={
                            voting
                          }
                          onClick={() =>
                            void chooseWinner(
                              item
                            )
                          }
                        >
                          {voting
                            ? 'Saving...'
                            : 'Choose This One'}
                        </button>

                      </article>

                    )
                  )}

                </div>

                <div className="ranking-versus-badge">
                  VS
                </div>

              </section>

            ) : complete ? (

              <section className="ranking-complete-card">

                <span className="archive-eyebrow">
                  COMPLETE
                </span>

                <h2>
                  Your {selectedCharacter} {selectedCategory.label} ranking is finished.
                </h2>

                <p>
                  Every one of the {pairs.length.toLocaleString()} unique matchups has a winner. Your full ranking is below.
                </p>

              </section>

            ) : null}


            <section className="ranking-leaderboard-section">

              <div className="ranking-leaderboard-heading">

                <div>

                  <span className="archive-eyebrow">
                    {complete
                      ? 'FINAL RESULTS'
                      : 'PROVISIONAL RESULTS'}
                  </span>

                  <h2>
                    Current Ranking
                  </h2>

                </div>

                <span>
                  Most head-to-head wins first
                </span>

              </div>


              <div className="ranking-leaderboard">

                {ranking.map(
                  (
                    row,
                    index
                  ) => (

                    <button
                      type="button"
                      className="ranking-leaderboard-row"
                      key={
                        row.item.relativePath
                      }
                      onClick={() =>
                        watchItem(
                          row.item
                        )
                      }
                    >

                      <strong className="ranking-place">
                        {index + 1}
                      </strong>

                      <span className="ranking-result-title">
                        {row.item.title}
                      </span>

                      <span className="ranking-result-score">
                        {row.wins} win{row.wins === 1 ? '' : 's'}
                        {' · '}
                        {row.comparisons} compared
                      </span>

                    </button>

                  )
                )}

              </div>

            </section>

          </>

        )}

      </section>

    </main>

  )

}


export default RankingPage
