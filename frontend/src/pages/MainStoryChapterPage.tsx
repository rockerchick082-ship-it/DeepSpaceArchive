import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  Link,
  useSearchParams,
} from 'react-router-dom'


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
  branchCount?: number
  chapterCount?: number
  partCount?: number
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


type StoryChapterLocation = {
  branch: MainStoryBranch
  chapter: MainStoryChapter
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


function partProgressPercent(
  state:
    ArchiveStateSummary |
    undefined
) {
  if (
    !state ||
    !state.durationSeconds ||
    state.durationSeconds <=
      0
  ) {
    return state?.completed
      ? 100
      : 0
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        (
          state.progressSeconds /
          state.durationSeconds
        ) *
        100
      )
    )
  )
}


type BulkPartEdit = {
  id: string
  filePath: string
  fileName: string
  title: string
  order: string
  releaseDate: string
}


function MainStoryChapterPage() {

  const [
    searchParams,
  ] =
    useSearchParams()


  const branchId =
    searchParams.get(
      'branch'
    )


  const chapterId =
    searchParams.get(
      'chapter'
    )


  /*
   * =====================================
   * CHAPTER STATE
   * =====================================
   */

  const [
    branch,
    setBranch,
  ] =
    useState<MainStoryBranch | null>(
      null
    )


  const [
    chapter,
    setChapter,
  ] =
    useState<MainStoryChapter | null>(
      null
    )


  const [
    storyBranches,
    setStoryBranches,
  ] =
    useState<MainStoryBranch[]>(
      []
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
    loadError,
    setLoadError,
  ] =
    useState(
      ''
    )


  const [
    loadedRequestKey,
    setLoadedRequestKey,
  ] =
    useState<string | null>(
      null
    )


  const requestKey =
    branchId &&
    chapterId
      ? `${branchId}::${chapterId}`
      : null


  const loading =
    requestKey !== null &&
    loadedRequestKey !==
      requestKey


  /*
   * =====================================
   * SINGLE PART EDITOR
   * =====================================
   */

  const [
    editingPart,
    setEditingPart,
  ] =
    useState<MainStoryPart | null>(
      null
    )


  const [
    editTitle,
    setEditTitle,
  ] =
    useState(
      ''
    )


  const [
    editOrder,
    setEditOrder,
  ] =
    useState(
      ''
    )


  const [
    editReleaseDate,
    setEditReleaseDate,
  ] =
    useState(
      ''
    )


  const [
    editThumbnail,
    setEditThumbnail,
  ] =
    useState<File | null>(
      null
    )


  const [
    saving,
    setSaving,
  ] =
    useState(
      false
    )


  const [
    saveError,
    setSaveError,
  ] =
    useState(
      ''
    )


  /*
   * =====================================
   * BULK CHAPTER EDITOR
   * =====================================
   */

  const [
    bulkEditorOpen,
    setBulkEditorOpen,
  ] =
    useState(
      false
    )


  const [
    bulkParts,
    setBulkParts,
  ] =
    useState<BulkPartEdit[]>(
      []
    )


  const [
    bulkSaving,
    setBulkSaving,
  ] =
    useState(
      false
    )


  const [
    bulkSaveError,
    setBulkSaveError,
  ] =
    useState(
      ''
    )


  /*
   * =====================================
   * LOAD CHAPTER
   * =====================================
   */

  const loadChapter =
    useCallback(
      async () => {

        if (
          !branchId ||
          !chapterId ||
          !requestKey
        ) {

          return

        }


        try {

          /*
           * Important for React's
           * set-state-in-effect lint rule:
           *
           * do not synchronously call a
           * state setter before the first
           * awaited external operation.
           */

          const [
            storyResponse,
            statesResponse,
          ] =
            await Promise.all([
              fetch(
                '/api/library/main-story'
              ),
              fetch(
                '/api/archive/states'
              ),
            ])


          if (
            !storyResponse.ok
          ) {

            throw new Error(
              'Unable to load Main Story.'
            )

          }


          const data:
            MainStoryResponse =
            await storyResponse.json()


          const selectedBranch =
            data.branches.find(
              (current) =>
                current.id ===
                branchId
            )


          const selectedChapter =
            selectedBranch
              ?.chapters.find(
                (current) =>
                  current.id ===
                  chapterId
              )


          const nextArchiveStates:
            Record<
              string,
              ArchiveStateSummary
            > = {}


          if (
            statesResponse.ok
          ) {

            const stateData:
              ArchiveStatesResponse =
              await statesResponse.json()


            for (
              const state
              of stateData.items
            ) {

              if (
                state.category ===
                'Main Story'
              ) {

                nextArchiveStates[
                  normalizeRelativePath(
                    state.relativePath
                  )
                ] =
                  state

              }

            }

          }


          setStoryBranches(
            data.branches
          )


          setArchiveStates(
            nextArchiveStates
          )


          setBranch(
            selectedBranch ??
            null
          )


          setChapter(
            selectedChapter ??
            null
          )


          setLoadError(
            ''
          )


          setLoadedRequestKey(
            requestKey
          )

        } catch (error) {

          console.error(
            'Unable to load Main Story chapter:',
            error
          )


          setBranch(
            null
          )


          setChapter(
            null
          )


          setStoryBranches(
            []
          )


          setLoadError(
            error instanceof Error
              ? error.message
              : 'Unable to load Main Story chapter.'
          )


          setLoadedRequestKey(
            requestKey
          )

        }

      },
      [
        branchId,
        chapterId,
        requestKey,
      ]
    )


  useEffect(
    () => {

      const timeoutId =
        window.setTimeout(
          () => {

            void loadChapter()

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
      loadChapter,
    ]
  )


  /*
   * =====================================
   * SINGLE PART EDITOR
   * =====================================
   */

  function openEditor(
    part: MainStoryPart
  ) {

    setEditingPart(
      part
    )


    const isFallbackTitle =
      /^Story Part \d+$/i.test(
        part.title
      )


    setEditTitle(
      isFallbackTitle
        ? ''
        : part.title
    )


    setEditOrder(
      String(
        part.order
      )
    )


    setEditReleaseDate(
      part.releaseDate ??
      ''
    )


    setEditThumbnail(
      null
    )


    setSaveError(
      ''
    )

  }


  function closeEditor() {

    if (
      saving
    ) {

      return

    }


    setEditingPart(
      null
    )


    setEditThumbnail(
      null
    )


    setSaveError(
      ''
    )

  }


  async function savePart() {

    if (
      !editingPart
    ) {

      return

    }


    try {

      setSaving(
        true
      )


      setSaveError(
        ''
      )


      const formData =
        new FormData()


      formData.append(
        'mediaFilePath',
        editingPart.filePath
      )


      formData.append(
        'displayTitle',
        editTitle.trim()
      )


      formData.append(
        'sortOrder',
        editOrder.trim()
      )


      formData.append(
        'releaseDate',
        editReleaseDate.trim()
      )


      if (
        editThumbnail
      ) {

        formData.append(
          'thumbnail',
          editThumbnail
        )

      }


      const response =
        await fetch(
          '/api/library/metadata',
          {
            method:
              'POST',

            body:
              formData,
          }
        )


      const data =
        await response.json()


      if (
        !response.ok
      ) {

        throw new Error(
          data.error ||
          'Unable to save Main Story metadata.'
        )

      }


      await loadChapter()


      setEditingPart(
        null
      )


      setEditThumbnail(
        null
      )

    } catch (error) {

      console.error(
        'Unable to save Main Story part:',
        error
      )


      setSaveError(
        error instanceof Error
          ? error.message
          : 'Unable to save Main Story part.'
      )

    } finally {

      setSaving(
        false
      )

    }

  }


  /*
   * =====================================
   * BULK EDITOR
   * =====================================
   */

  function openBulkEditor() {

    if (
      !chapter
    ) {

      return

    }


    const edits =
      chapter.parts.map(
        (
          part,
          index
        ) => {

          const isFallbackTitle =
            /^Story Part \d+$/i.test(
              part.title
            )


          return {

            id:
              part.id,

            filePath:
              part.filePath,

            fileName:
              part.fileName,

            title:
              isFallbackTitle
                ? ''
                : part.title,

            order:
              String(
                Number.isFinite(
                  part.order
                )
                  ? part.order
                  : index
              ),

            releaseDate:
              part.releaseDate ??
              '',

          }

        }
      )


    setBulkParts(
      edits
    )


    setBulkSaveError(
      ''
    )


    setBulkEditorOpen(
      true
    )

  }


  function updateBulkPart(
    id: string,
    field:
      'title' |
      'order' |
      'releaseDate',
    value: string
  ) {

    setBulkParts(
      (current) =>
        current.map(
          (part) => {

            if (
              part.id !==
              id
            ) {

              return part

            }


            return {

              ...part,

              [field]:
                value,

            }

          }
        )
    )

  }


  function closeBulkEditor() {

    if (
      bulkSaving
    ) {

      return

    }


    setBulkEditorOpen(
      false
    )


    setBulkSaveError(
      ''
    )

  }


  async function saveBulkParts() {

    try {

      setBulkSaving(
        true
      )


      setBulkSaveError(
        ''
      )


      for (
        const part
        of bulkParts
      ) {

        const formData =
          new FormData()


        formData.append(
          'mediaFilePath',
          part.filePath
        )


        formData.append(
          'displayTitle',
          part.title.trim()
        )


        formData.append(
          'sortOrder',
          part.order.trim()
        )


        formData.append(
          'releaseDate',
          part.releaseDate.trim()
        )


        const response =
          await fetch(
            '/api/library/metadata',
            {
              method:
                'POST',

              body:
                formData,
            }
          )


        const data =
          await response.json()


        if (
          !response.ok
        ) {

          throw new Error(
            data.error ||
            `Unable to save ${part.fileName}`
          )

        }

      }


      await loadChapter()


      setBulkEditorOpen(
        false
      )

    } catch (error) {

      console.error(
        'Unable to save chapter:',
        error
      )


      setBulkSaveError(
        error instanceof Error
          ? error.message
          : 'Unable to save chapter.'
      )

    } finally {

      setBulkSaving(
        false
      )

    }

  }


  /*
   * =====================================
   * LOADING / NOT FOUND
   * =====================================
   */

  if (
    loading
  ) {

    return (

      <main className="archive-page player-message">
        Loading chapter...
      </main>

    )

  }


  if (
    loadError
  ) {

    return (

      <main className="archive-page">

        <header className="archive-page-header">

          <Link
            to="/main-story"
            className="back-button"
          >
            ‹
          </Link>


          <div>

            <span className="archive-eyebrow">
              MAIN STORY
            </span>

            <h1>
              Chapter
            </h1>

          </div>

        </header>


        <section className="main-story-chapter-content">

          <div className="metadata-health-empty">

            <h3>
              Chapter Unavailable
            </h3>


            <p>
              {loadError}
            </p>


            <button
              type="button"
              className="archive-retry-button"
              onClick={() =>
                void loadChapter()
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
    !branch ||
    !chapter
  ) {

    return (

      <main className="archive-page player-message">

        <p>
          Story chapter could not be found.
        </p>


        <Link
          to="/main-story"
          className="player-return-link"
        >
          Return to Main Story
        </Link>

      </main>

    )

  }


  const orderedChapters:
    StoryChapterLocation[] =
    storyBranches.flatMap(
      (storyBranch) =>
        storyBranch.chapters.map(
          (storyChapter) => ({
            branch:
              storyBranch,

            chapter:
              storyChapter,
          })
        )
    )


  const currentChapterIndex =
    orderedChapters.findIndex(
      (entry) =>
        entry.branch.id ===
          branch.id &&
        entry.chapter.id ===
          chapter.id
    )


  const previousChapter =
    currentChapterIndex >
      0
      ? orderedChapters[
          currentChapterIndex -
          1
        ]
      : null


  const nextChapter =
    currentChapterIndex >=
      0 &&
    currentChapterIndex <
      orderedChapters.length -
      1
      ? orderedChapters[
          currentChapterIndex +
          1
        ]
      : null


  const watchedParts =
    chapter.parts.filter(
      (part) =>
        archiveStates[
          mainStoryRelativePath(
            part.relativePath
          )
        ]?.completed
    ).length


  const chapterProgress =
    chapter.parts.length >
      0
      ? Math.round(
          (
            watchedParts /
            chapter.parts.length
          ) *
          100
        )
      : 0


  function chapterUrl(
    entry:
      StoryChapterLocation
  ) {

    return (
      `/main-story/chapter?${new URLSearchParams({
        branch:
          entry.branch.id,

        chapter:
          entry.chapter.id,
      })}`
    )

  }


  /*
   * =====================================
   * PAGE
   * =====================================
   */

  return (

    <main className="archive-page">

      <header className="archive-page-header">

        <Link
          to="/main-story"
          className="back-button"
        >
          ‹
        </Link>


        <div>

          <span className="archive-eyebrow">
            {branch.title}
          </span>

          <h1>
            {chapter.title}
          </h1>

        </div>

      </header>


      <section className="main-story-chapter-content">

        <nav
          className="main-story-breadcrumb"
          aria-label="Main Story breadcrumb"
        >

          <Link to="/main-story">
            Main Story
          </Link>

          <span>
            ›
          </span>

          <span>
            {branch.title}
          </span>

          <span>
            ›
          </span>

          <span className="current">
            {chapter.title}
          </span>

        </nav>


        {/* ===============================
            CHAPTER HEADING
        ================================ */}

        <div className="main-story-chapter-heading">

          <span className="main-story-large-number">

            {String(
              chapter.order
            ).padStart(
              2,
              '0'
            )}

          </span>


          <div className="main-story-chapter-heading-info">

            <span className="archive-eyebrow">
              CHAPTER
            </span>


            <h2>
              {chapter.title}
            </h2>


            <p>

              {chapter.partCount}

              {' '}

              {chapter.partCount ===
              1
                ? 'story part'
                : 'story parts'}

              {' · '}

              {watchedParts}
              {' watched'}

            </p>


            <div
              className="main-story-progress-track main-story-heading-progress"
              aria-label={`${chapterProgress}% of this chapter watched`}
            >

              <span
                style={{
                  width:
                    `${chapterProgress}%`,
                }}
              />

            </div>

          </div>


          <button
            type="button"
            className="main-story-bulk-edit-button"
            onClick={
              openBulkEditor
            }
          >
            Edit Chapter
          </button>

        </div>


        <div className="main-story-chapter-navigation">

          {previousChapter ? (

            <Link
              className="main-story-chapter-nav-link previous"
              to={
                chapterUrl(
                  previousChapter
                )
              }
            >

              <span>
                ‹ PREVIOUS CHAPTER
              </span>

              <strong>
                {previousChapter.chapter.title}
              </strong>

              <small>
                {previousChapter.branch.title}
              </small>

            </Link>

          ) : (

            <div className="main-story-chapter-nav-spacer" />

          )}


          <Link
            to="/main-story"
            className="main-story-chapter-index-link"
          >
            All Chapters
          </Link>


          {nextChapter ? (

            <Link
              className="main-story-chapter-nav-link next"
              to={
                chapterUrl(
                  nextChapter
                )
              }
            >

              <span>
                NEXT CHAPTER ›
              </span>

              <strong>
                {nextChapter.chapter.title}
              </strong>

              <small>
                {nextChapter.branch.title}
              </small>

            </Link>

          ) : (

            <div className="main-story-chapter-nav-spacer" />

          )}

        </div>


        {/* ===============================
            PART LIST
        ================================ */}

        <div className="main-story-parts">

          {chapter.parts.map(
            (
              part,
              index
            ) => {

              const relativePath =
                mainStoryRelativePath(
                  part.relativePath
                )


              const state =
                archiveStates[
                  relativePath
                ]


              const progress =
                partProgressPercent(
                  state
                )


              const statusLabel =
                state?.completed
                  ? '✓ Watched'
                  : progress >
                      0
                    ? `${progress}%`
                    : 'Not Started'


              return (

                <div
                  className="main-story-part-wrapper"
                  key={
                    part.id
                  }
                >

                  <Link
                    className="main-story-part-card"
                    to={
                      `/main-story/watch?${new URLSearchParams({
                        branch:
                          branch.id,

                        chapter:
                          chapter.id,

                        file:
                          relativePath,
                      })}`
                    }
                  >

                    <div className="main-story-part-order">

                      {String(
                        part.order
                      ).padStart(
                        2,
                        '0'
                      )}

                    </div>


                    <div className="main-story-part-type">
                      STORY
                    </div>


                    <div className="main-story-part-info">

                      <strong>
                        {part.title}
                      </strong>


                      <span>

                        Part{' '}

                        {index + 1}

                        {' of '}

                        {chapter.parts.length}

                      </span>


                      {part.releaseDate && (

                        <span>
                          {part.releaseDate}
                        </span>

                      )}


                      <div
                        className="main-story-progress-track main-story-part-progress"
                        aria-label={`${progress}% watched`}
                      >

                        <span
                          style={{
                            width:
                              `${progress}%`,
                          }}
                        />

                      </div>

                    </div>


                    <div className="main-story-part-actions">

                      <span
                        className={
                          state?.completed
                            ? 'main-story-part-status watched'
                            : progress >
                                0
                              ? 'main-story-part-status progress'
                              : 'main-story-part-status'
                        }
                      >
                        {statusLabel}
                      </span>


                      <span className="main-story-part-play">
                        ▶
                      </span>

                    </div>

                  </Link>


                  <button
                    type="button"
                    className="main-story-edit-button"
                    onClick={() =>
                      openEditor(
                        part
                      )
                    }
                  >
                    Edit
                  </button>

                </div>

              )

            }
          )}

        </div>


        <div className="main-story-chapter-navigation main-story-chapter-navigation-bottom">

          {previousChapter ? (

            <Link
              className="main-story-chapter-nav-link previous"
              to={
                chapterUrl(
                  previousChapter
                )
              }
            >

              <span>
                ‹ PREVIOUS CHAPTER
              </span>

              <strong>
                {previousChapter.chapter.title}
              </strong>

              <small>
                {previousChapter.branch.title}
              </small>

            </Link>

          ) : (

            <div className="main-story-chapter-nav-spacer" />

          )}


          <Link
            to="/main-story"
            className="main-story-chapter-index-link"
          >
            All Chapters
          </Link>


          {nextChapter ? (

            <Link
              className="main-story-chapter-nav-link next"
              to={
                chapterUrl(
                  nextChapter
                )
              }
            >

              <span>
                NEXT CHAPTER ›
              </span>

              <strong>
                {nextChapter.chapter.title}
              </strong>

              <small>
                {nextChapter.branch.title}
              </small>

            </Link>

          ) : (

            <div className="main-story-chapter-nav-spacer" />

          )}

        </div>


      </section>


      {/* =================================
          SINGLE PART EDITOR
      ================================== */}

      {editingPart && (

        <div
          className="main-story-editor-backdrop"
          onMouseDown={(event) => {

            if (
              event.target ===
              event.currentTarget
            ) {

              closeEditor()

            }

          }}
        >

          <section
            className="main-story-editor"
            role="dialog"
            aria-modal="true"
            aria-label="Edit Main Story part"
          >

            <div className="main-story-editor-header">

              <div>

                <span className="archive-eyebrow">
                  MAIN STORY
                </span>

                <h2>
                  Edit Story Part
                </h2>

              </div>


              <button
                type="button"
                className="main-story-editor-close"
                disabled={
                  saving
                }
                onClick={
                  closeEditor
                }
                aria-label="Close"
              >
                ×
              </button>

            </div>


            <div className="main-story-editor-file">

              <span>
                ORIGINAL FILE
              </span>

              <strong>
                {editingPart.fileName}
              </strong>

            </div>


            <label className="main-story-editor-field">

              <span>
                Display Title
              </span>


              <input
                type="text"
                value={
                  editTitle
                }
                placeholder="e.g. Singularity Echo"
                onChange={(event) =>
                  setEditTitle(
                    event.target.value
                  )
                }
              />

            </label>


            <label className="main-story-editor-field">

              <span>
                Story Order
              </span>


              <input
                type="number"
                min="0"
                step="1"
                value={
                  editOrder
                }
                placeholder="0"
                onChange={(event) =>
                  setEditOrder(
                    event.target.value
                  )
                }
              />


              <small>
                Use 0 for the first story part,
                1 for the second, 2 for the third,
                and so on.
              </small>

            </label>


            <label className="main-story-editor-field">

              <span>
                Release Date
              </span>


              <input
                type="date"
                value={
                  editReleaseDate
                }
                onChange={(event) =>
                  setEditReleaseDate(
                    event.target.value
                  )
                }
              />

            </label>


            <label className="main-story-editor-field">

              <span>
                Custom Thumbnail
              </span>


              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={(event) =>
                  setEditThumbnail(
                    event.target
                      .files?.[0] ??
                    null
                  )
                }
              />


              <small>

                {editThumbnail
                  ? `Selected: ${editThumbnail.name}`
                  : editingPart.thumbnailPath
                    ? 'A custom thumbnail is already assigned. Choose another file to replace it.'
                    : 'Optional. JPG, PNG, and WebP are supported.'}

              </small>

            </label>


            {saveError && (

              <div className="main-story-editor-error">
                {saveError}
              </div>

            )}


            <div className="main-story-editor-actions">

              <button
                type="button"
                className="main-story-editor-cancel"
                disabled={
                  saving
                }
                onClick={
                  closeEditor
                }
              >
                Cancel
              </button>


              <button
                type="button"
                className="backup-primary-button"
                disabled={
                  saving
                }
                onClick={
                  savePart
                }
              >

                {saving
                  ? 'Saving...'
                  : 'Save Changes'}

              </button>

            </div>

          </section>

        </div>

      )}


      {/* =================================
          BULK CHAPTER EDITOR
      ================================== */}

      {bulkEditorOpen && (

        <div
          className="main-story-editor-backdrop"
          onMouseDown={(event) => {

            if (
              event.target ===
              event.currentTarget
            ) {

              closeBulkEditor()

            }

          }}
        >

          <section
            className="main-story-editor main-story-bulk-editor"
            role="dialog"
            aria-modal="true"
            aria-label="Edit Main Story chapter"
          >

            <div className="main-story-editor-header">

              <div>

                <span className="archive-eyebrow">
                  {branch.title}
                </span>

                <h2>
                  Edit {chapter.title}
                </h2>

                <p className="main-story-bulk-description">
                  Edit all story parts in this chapter.
                </p>

              </div>


              <button
                type="button"
                className="main-story-editor-close"
                disabled={
                  bulkSaving
                }
                onClick={
                  closeBulkEditor
                }
                aria-label="Close"
              >
                ×
              </button>

            </div>


            <div className="main-story-bulk-header">

              <span>
                #
              </span>

              <span>
                Display Title
              </span>

              <span>
                Release Date
              </span>

            </div>


            <div className="main-story-bulk-list">

              {bulkParts.map(
                (
                  part,
                  index
                ) => (

                  <div
                    className="main-story-bulk-row"
                    key={
                      part.id
                    }
                  >

                    <input
                      className="main-story-bulk-order"
                      type="number"
                      min="0"
                      step="1"
                      value={
                        part.order
                      }
                      aria-label={
                        `Order for part ${index + 1}`
                      }
                      onChange={(event) =>
                        updateBulkPart(
                          part.id,
                          'order',
                          event.target.value
                        )
                      }
                    />


                    <div className="main-story-bulk-title">

                      <input
                        type="text"
                        value={
                          part.title
                        }
                        placeholder={
                          `Story Part ${index + 1}`
                        }
                        onChange={(event) =>
                          updateBulkPart(
                            part.id,
                            'title',
                            event.target.value
                          )
                        }
                      />


                      <small>
                        {part.fileName}
                      </small>

                    </div>


                    <input
                      className="main-story-bulk-date"
                      type="date"
                      value={
                        part.releaseDate
                      }
                      onChange={(event) =>
                        updateBulkPart(
                          part.id,
                          'releaseDate',
                          event.target.value
                        )
                      }
                    />

                  </div>

                )
              )}

            </div>


            {bulkSaveError && (

              <div className="main-story-editor-error">
                {bulkSaveError}
              </div>

            )}


            <div className="main-story-editor-actions">

              <button
                type="button"
                className="main-story-editor-cancel"
                disabled={
                  bulkSaving
                }
                onClick={
                  closeBulkEditor
                }
              >
                Cancel
              </button>


              <button
                type="button"
                className="backup-primary-button"
                disabled={
                  bulkSaving
                }
                onClick={
                  saveBulkParts
                }
              >

                {bulkSaving
                  ? 'Saving Chapter...'
                  : 'Save Chapter'}

              </button>

            </div>

          </section>

        </div>

      )}

    </main>

  )

}


export default MainStoryChapterPage