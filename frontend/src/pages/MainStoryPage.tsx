import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Link,
} from 'react-router-dom'

import ArchiveSequenceNav from '../components/ArchiveSequenceNav'


type MainStoryPart = {
  id: string
  title: string
  order: number
  fileName: string
  filePath: string
  relativePath: string
  releaseDate: string | null
  thumbnailPath: string | null
}


type MainStoryChapter = {
  id: string
  title: string
  order: number
  parts: MainStoryPart[]
  partCount: number
}


type MainStoryBranch = {
  id: string
  title: string
  chapters: MainStoryChapter[]
  chapterCount?: number
  partCount?: number
}


type MainStoryResponse = {
  branchCount: number
  chapterCount: number
  partCount: number
  branches: MainStoryBranch[]
}


type ArchiveStateSummary = {
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


type ArchiveStatesResponse = {
  count: number
  items: ArchiveStateSummary[]
}


function normalizeRelativePath(
  value: string
) {
  return value
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
}


function mainStoryRelativePath(
  value: string
) {
  const normalized =
    normalizeRelativePath(value)

  return normalized
    .toLowerCase()
    .startsWith('main story/')
      ? normalized
      : `Main Story/${normalized}`
}


function MainStoryPage() {
  const [
    story,
    setStory,
  ] =
    useState<MainStoryResponse | null>(
      null
    )

  const [
    archiveStates,
    setArchiveStates,
  ] =
    useState<
      Record<
        string,
        ArchiveStateSummary
      >
    >({})

  const [
    expandedBranches,
    setExpandedBranches,
  ] =
    useState<Set<string>>(
      new Set()
    )

  const [
    loading,
    setLoading,
  ] =
    useState(true)

  const [
    error,
    setError,
  ] =
    useState('')

  const [
    stateWarning,
    setStateWarning,
  ] =
    useState('')


  const fetchStory =
    useCallback(
      async () => {
        const response =
          await fetch(
            '/api/library/main-story'
          )

        if (!response.ok) {
          throw new Error(
            'Unable to load Main Story.'
          )
        }

        return (
          await response.json()
        ) as MainStoryResponse
      },
      []
    )


  const fetchStates =
    useCallback(
      async () => {
        const response =
          await fetch(
            '/api/archive/states'
          )

        if (!response.ok) {
          throw new Error(
            'Unable to load watch status.'
          )
        }

        return (
          await response.json()
        ) as ArchiveStatesResponse
      },
      []
    )


  const loadData =
    useCallback(
      async () => {
        try {
          const [
            storyResult,
            stateResult,
          ] =
            await Promise.allSettled([
              fetchStory(),
              fetchStates(),
            ])

          if (
            storyResult.status ===
            'rejected'
          ) {
            throw storyResult.reason
          }

          const storyData =
            storyResult.value

          const nextStates:
            Record<
              string,
              ArchiveStateSummary
            > = {}

          if (
            stateResult.status ===
            'fulfilled'
          ) {
            for (
              const state
              of stateResult.value.items
            ) {
              if (
                state.category ===
                'Main Story'
              ) {
                nextStates[
                  normalizeRelativePath(
                    state.relativePath
                  )
                ] =
                  state
              }
            }

            setStateWarning('')
          } else {
            setStateWarning(
              'Watch progress is temporarily unavailable.'
            )
          }

          setStory(storyData)
          setArchiveStates(nextStates)
          setError('')
          setLoading(false)

          setExpandedBranches(
            (current) => {
              if (
                current.size >
                0
              ) {
                return current
              }

              const firstBranch =
                storyData.branches[0]

              return firstBranch
                ? new Set([
                    firstBranch.id,
                  ])
                : current
            }
          )
        } catch (loadError) {
          console.error(
            'Unable to load Main Story:',
            loadError
          )

          setError(
            'Main Story could not be loaded.'
          )
          setLoading(false)
        }
      },
      [
        fetchStates,
        fetchStory,
      ]
    )


  useEffect(
    () => {

      const timeoutId =
        window.setTimeout(
          () => {

            void loadData()

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
      loadData,
    ]
  )


  function toggleBranch(
    branchId: string
  ) {
    setExpandedBranches(
      (current) => {
        const next =
          new Set(current)

        if (
          next.has(branchId)
        ) {
          next.delete(branchId)
        } else {
          next.add(branchId)
        }

        return next
      }
    )
  }


  const progress =
    useMemo(
      () => {
        if (!story) {
          return {
            watched:
              0,
            total:
              0,
            percent:
              0,
          }
        }

        const parts =
          story.branches.flatMap(
            (branch) =>
              branch.chapters.flatMap(
                (chapter) =>
                  chapter.parts
              )
          )

        const watched =
          parts.filter(
            (part) =>
              archiveStates[
                mainStoryRelativePath(
                  part.relativePath
                )
              ]?.completed
          ).length

        return {
          watched,
          total:
            parts.length,
          percent:
            parts.length >
              0
              ? Math.round(
                  (
                    watched /
                    parts.length
                  ) *
                  100
                )
              : 0,
        }
      },
      [
        archiveStates,
        story,
      ]
    )


  if (loading) {
    return (
      <main className="archive-page player-message">
        Loading Main Story...
      </main>
    )
  }


  if (error) {
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
              STORY ARCHIVE
            </span>

            <h1>
              Main Story
            </h1>

            <ArchiveSequenceNav />
          </div>
        </header>

        <section className="main-story-content">
          <div className="metadata-health-empty">
            <h3>
              Main Story Unavailable
            </h3>

            <p>
              {error}
            </p>

            <button
              type="button"
              className="archive-retry-button"
              onClick={() =>
                void loadData()
              }
            >
              Retry
            </button>
          </div>
        </section>
      </main>
    )
  }


  if (
    !story ||
    story.branches.length ===
      0
  ) {
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
              STORY ARCHIVE
            </span>

            <h1>
              Main Story
            </h1>

            <ArchiveSequenceNav />
          </div>
        </header>

        <section className="main-story-content">
          <div className="metadata-health-empty">
            <h3>
              No Main Story Media Found
            </h3>

            <p>
              Add Main Story files to the configured
              library and reload this page.
            </p>
          </div>
        </section>
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
            STORY ARCHIVE
          </span>

          <h1>
            Main Story
          </h1>

          <ArchiveSequenceNav />
        </div>
      </header>

      <section className="main-story-content">
        <nav
          className="main-story-breadcrumb"
          aria-label="Main Story breadcrumb"
        >
          <span className="current">
            Main Story
          </span>
        </nav>

        {stateWarning && (
          <div className="archive-state-warning">
            <span>
              {stateWarning}
            </span>

            <button
              type="button"
              onClick={() =>
                void loadData()
              }
            >
              Retry
            </button>
          </div>
        )}

        <div className="main-story-summary main-story-summary-consistency">
          <div>
            <span>
              STORY BRANCHES
            </span>

            <strong>
              {story.branchCount}
            </strong>
          </div>

          <div>
            <span>
              CHAPTERS
            </span>

            <strong>
              {story.chapterCount}
            </strong>
          </div>

          <div>
            <span>
              STORY PARTS
            </span>

            <strong>
              {story.partCount}
            </strong>
          </div>

          <div>
            <span>
              WATCHED
            </span>

            <strong>
              {progress.watched}
              {' / '}
              {progress.total}
            </strong>

            <small>
              {progress.percent}% complete
            </small>

            <div
              className="main-story-progress-track"
              aria-label={`${progress.percent}% of Main Story watched`}
            >
              <span
                style={{
                  width:
                    `${progress.percent}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="main-story-branches">
          {story.branches.map(
            (branch) => {
              const branchParts =
                branch.chapters.flatMap(
                  (chapter) =>
                    chapter.parts
                )

              const branchWatched =
                branchParts.filter(
                  (part) =>
                    archiveStates[
                      mainStoryRelativePath(
                        part.relativePath
                      )
                    ]?.completed
                ).length

              const branchPercent =
                branchParts.length >
                  0
                  ? Math.round(
                      (
                        branchWatched /
                        branchParts.length
                      ) *
                      100
                    )
                  : 0

              const expanded =
                expandedBranches.has(
                  branch.id
                )

              return (
                <section
                  className="main-story-branch"
                  key={
                    branch.id
                  }
                >
                  <button
                    type="button"
                    className="main-story-branch-header"
                    aria-expanded={
                      expanded
                    }
                    onClick={() =>
                      toggleBranch(
                        branch.id
                      )
                    }
                  >
                    <div className="main-story-branch-header-copy">
                      <span className="archive-eyebrow">
                        STORY BRANCH
                      </span>

                      <h2>
                        {branch.title}
                      </h2>

                      <p>
                        {branch.chapters.length}
                        {' '}
                        {branch.chapters.length ===
                        1
                          ? 'chapter'
                          : 'chapters'}
                        {' · '}
                        {branchParts.length}
                        {' '}
                        {branchParts.length ===
                        1
                          ? 'part'
                          : 'parts'}
                        {' · '}
                        {branchWatched}
                        {' watched'}
                      </p>

                      <div
                        className="main-story-progress-track main-story-branch-progress"
                        aria-label={`${branchPercent}% of ${branch.title} watched`}
                      >
                        <span
                          style={{
                            width:
                              `${branchPercent}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="main-story-branch-status">
                      <span>
                        {branchPercent}%
                      </span>

                      <span className="main-story-expand-arrow">
                        {expanded
                          ? '⌃'
                          : '⌄'}
                      </span>
                    </div>
                  </button>

                  {expanded && (
                    <div className="main-story-chapter-grid">
                      {branch.chapters.map(
                        (chapter) => {
                          const chapterWatched =
                            chapter.parts.filter(
                              (part) =>
                                archiveStates[
                                  mainStoryRelativePath(
                                    part.relativePath
                                  )
                                ]?.completed
                            ).length

                          const chapterPercent =
                            chapter.parts.length >
                              0
                              ? Math.round(
                                  (
                                    chapterWatched /
                                    chapter.parts.length
                                  ) *
                                  100
                                )
                              : 0

                          return (
                            <Link
                              key={
                                chapter.id
                              }
                              className="main-story-chapter-card"
                              to={
                                `/main-story/chapter?${new URLSearchParams({
                                  branch:
                                    branch.id,
                                  chapter:
                                    chapter.id,
                                })}`
                              }
                            >
                              <span className="main-story-chapter-number">
                                {String(
                                  chapter.order
                                ).padStart(
                                  2,
                                  '0'
                                )}
                              </span>

                              <div className="main-story-chapter-card-copy">
                                <span className="archive-eyebrow">
                                  CHAPTER
                                </span>

                                <h3>
                                  {chapter.title}
                                </h3>

                                <p>
                                  {chapter.partCount}
                                  {' '}
                                  {chapter.partCount ===
                                  1
                                    ? 'story part'
                                    : 'story parts'}
                                  {' · '}
                                  {chapterWatched}
                                  {' watched'}
                                </p>

                                <div
                                  className="main-story-progress-track main-story-chapter-progress"
                                  aria-label={`${chapterPercent}% of ${chapter.title} watched`}
                                >
                                  <span
                                    style={{
                                      width:
                                        `${chapterPercent}%`,
                                    }}
                                  />
                                </div>
                              </div>

                              <div className="main-story-chapter-card-status">
                                {chapterPercent >
                                0 && (
                                  <span>
                                    {chapterPercent}%
                                  </span>
                                )}

                                <span className="main-story-chapter-arrow">
                                  ›
                                </span>
                              </div>
                            </Link>
                          )
                        }
                      )}
                    </div>
                  )}
                </section>
              )
            }
          )}
        </div>
      </section>
    </main>
  )
}


export default MainStoryPage