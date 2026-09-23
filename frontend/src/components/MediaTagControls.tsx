import {
  useMemo,
  useState,
} from 'react'

import type {
  MediaTagSummary,
} from '../data/mediaTags'


export function MediaTagChips({
  tags,
  className = '',
}: {
  tags: string[]
  className?: string
}) {

  if (
    tags.length ===
    0
  ) {

    return null

  }


  return (

    <div
      className={
        `media-tag-chips ${className}`
          .trim()
      }
    >

      {tags.map(
        (tag) => (

          <span
            key={
              tag
            }
            className="media-tag-chip"
          >
            {tag}
          </span>

        )
      )}

    </div>

  )

}


type MediaTagEditorProps = {
  title: string
  tags: string[]
  availableTags: MediaTagSummary[]
  onSave: (
    tags: string[]
  ) => Promise<unknown>
  buttonLabel?: string
  buttonClassName?: string
}


function normalized(
  value: string
) {

  return value
    .trim()
    .replace(
      /\s+/g,
      ' '
    )
    .toLocaleLowerCase()

}


function cleaned(
  value: string
) {

  return value
    .trim()
    .replace(
      /\s+/g,
      ' '
    )
    .slice(
      0,
      50
    )

}


export function MediaTagEditor({
  title,
  tags,
  availableTags,
  onSave,
  buttonLabel = 'Tags',
  buttonClassName = 'media-tag-edit-button',
}: MediaTagEditorProps) {

  const [
    open,
    setOpen,
  ] =
    useState(
      false
    )

  const [
    draft,
    setDraft,
  ] =
    useState<string[]>(
      tags
    )

  const [
    input,
    setInput,
  ] =
    useState(
      ''
    )

  const [
    saving,
    setSaving,
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


  const suggestions =
    useMemo(
      () => {

        const selected =
          new Set(
            draft.map(
              normalized
            )
          )


        return availableTags
          .filter(
            (tag) =>
              !selected.has(
                normalized(
                  tag.name
                )
              )
          )
          .slice(
            0,
            18
          )

      },
      [
        availableTags,
        draft,
      ]
    )


  function addTag(
    value: string
  ) {

    const next =
      cleaned(
        value
      )


    if (!next) {
      return
    }


    if (
      draft.some(
        (tag) =>
          normalized(
            tag
          ) ===
          normalized(
            next
          )
      )
    ) {

      setInput(
        ''
      )

      return

    }


    setDraft(
      (current) => [
        ...current,
        next,
      ]
    )


    setInput(
      ''
    )

  }


  function removeTag(
    tag: string
  ) {

    setDraft(
      (current) =>
        current.filter(
          (candidate) =>
            normalized(
              candidate
            ) !==
            normalized(
              tag
            )
        )
    )

  }


  async function save() {

    try {

      setSaving(
        true
      )

      setError(
        ''
      )


      const nextDraft =
        input.trim()
          ? [
              ...draft,
              cleaned(
                input
              ),
            ].filter(
              Boolean
            )
          : draft


      await onSave(
        nextDraft
      )


      setOpen(
        false
      )

      setInput(
        ''
      )

    } catch (saveError) {

      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to save tags.'
      )

    } finally {

      setSaving(
        false
      )

    }

  }


  return (

    <>

      <button
        type="button"
        className={
          buttonClassName
        }
        onClick={(event) => {

          event.preventDefault()
          event.stopPropagation()

          setDraft(
            tags
          )

          setInput(
            ''
          )

          setError(
            ''
          )

          setOpen(
            true
          )

        }}
      >
        {buttonLabel}
      </button>


      {open && (

        <div
          className="media-tag-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {

            if (
              event.target ===
              event.currentTarget &&
              !saving
            ) {

              setOpen(
                false
              )

            }

          }}
        >

          <section
            className="media-tag-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="media-tag-modal-title"
          >

            <header className="media-tag-modal-header">

              <div>

                <span className="archive-eyebrow">
                  MEDIA TAGS
                </span>

                <h2 id="media-tag-modal-title">
                  {title}
                </h2>

              </div>


              <button
                type="button"
                className="media-tag-modal-close"
                aria-label="Close tag editor"
                disabled={
                  saving
                }
                onClick={() =>
                  setOpen(
                    false
                  )
                }
              >
                ×
              </button>

            </header>


            <div className="media-tag-editor-body">

              <div className="media-tag-editor-selected">

                {draft.length > 0 ? (

                  draft.map(
                    (tag) => (

                      <button
                        type="button"
                        key={
                          tag
                        }
                        className="media-tag-chip media-tag-chip-removable"
                        title={`Remove ${tag}`}
                        onClick={() =>
                          removeTag(
                            tag
                          )
                        }
                      >
                        {tag}
                        <span aria-hidden="true">
                          ×
                        </span>
                      </button>

                    )
                  )

                ) : (

                  <p className="media-tag-empty-copy">
                    No tags yet.
                  </p>

                )}

              </div>


              <div className="media-tag-input-row">

                <input
                  type="text"
                  value={
                    input
                  }
                  maxLength={
                    50
                  }
                  placeholder="Add a tag…"
                  onChange={(event) =>
                    setInput(
                      event.target.value
                    )
                  }
                  onKeyDown={(event) => {

                    if (
                      event.key ===
                        'Enter' ||
                      event.key ===
                        ','
                    ) {

                      event.preventDefault()

                      addTag(
                        input
                      )

                    }

                  }}
                />


                <button
                  type="button"
                  disabled={
                    !input.trim()
                  }
                  onClick={() =>
                    addTag(
                      input
                    )
                  }
                >
                  Add
                </button>

              </div>


              {suggestions.length > 0 && (

                <div className="media-tag-suggestions">

                  <span>
                    Existing tags
                  </span>

                  <div>

                    {suggestions.map(
                      (tag) => (

                        <button
                          type="button"
                          key={
                            tag.name
                          }
                          onClick={() =>
                            addTag(
                              tag.name
                            )
                          }
                        >
                          {tag.name}
                          <small>
                            {tag.count}
                          </small>
                        </button>

                      )
                    )}

                  </div>

                </div>

              )}


              {error && (

                <div
                  className="settings-status-message settings-status-error"
                  role="alert"
                >
                  {error}
                </div>

              )}

            </div>


            <footer className="media-tag-modal-actions">

              <button
                type="button"
                className="archive-clear-filters"
                disabled={
                  saving
                }
                onClick={() =>
                  setOpen(
                    false
                  )
                }
              >
                Cancel
              </button>


              <button
                type="button"
                className="archive-feedback-button"
                disabled={
                  saving
                }
                onClick={() =>
                  void save()
                }
              >
                {saving
                  ? 'Saving…'
                  : 'Save Tags'}
              </button>

            </footer>

          </section>

        </div>

      )}

    </>

  )

}
