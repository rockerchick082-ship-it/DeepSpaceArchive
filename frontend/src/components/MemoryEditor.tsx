import {
  useEffect,
  useRef,
  useState,
} from 'react'

import type {
  ArchiveItem,
} from '../data/archive'


type ArchiveEditorProps = {
  item: ArchiveItem
  onClose: () => void
  onSaved: () => void
}


function MemoryEditor({
  item,
  onClose,
  onSaved,
}: ArchiveEditorProps) {

  const [displayTitle, setDisplayTitle] =
    useState(
      item.title
    )


  const [releaseDate, setReleaseDate] =
    useState(
      item.releaseDate ?? ''
    )


  const [sortOrder, setSortOrder] =
    useState(
      item.sortOrder?.toString() ??
      ''
    )


  const [thumbnail, setThumbnail] =
    useState<File | null>(
      null
    )


  const [previewUrl, setPreviewUrl] =
    useState<string | null>(
      null
    )


  const previewUrlRef =
    useRef<string | null>(
      null
    )


  const [saving, setSaving] =
    useState(false)


  const [error, setError] =
    useState('')


  const currentThumbnailUrl =
    item.thumbnailPath
      ? `/api/custom-thumbnail?${
          new URLSearchParams({
            filePath:
              item.thumbnailPath,
          })
        }`
      : null


  useEffect(() => {

    return () => {

      if (
        previewUrlRef.current
      ) {

        URL.revokeObjectURL(
          previewUrlRef.current
        )

      }

    }

  }, [])


  function selectThumbnail(
    file: File | null
  ) {

    if (
      previewUrlRef.current
    ) {

      URL.revokeObjectURL(
        previewUrlRef.current
      )

      previewUrlRef.current =
        null

    }


    setThumbnail(
      file
    )


    if (!file) {

      setPreviewUrl(
        null
      )

      return

    }


    const objectUrl =
      URL.createObjectURL(
        file
      )


    previewUrlRef.current =
      objectUrl


    setPreviewUrl(
      objectUrl
    )

  }


  async function saveItem() {

    try {

      setSaving(true)
      setError('')


      const formData =
        new FormData()


      formData.append(
        'mediaFilePath',
        item.filePath
      )


      formData.append(
        'displayTitle',
        displayTitle
      )


      formData.append(
        'releaseDate',
        releaseDate
      )


      formData.append(
        'sortOrder',
        sortOrder
      )


      if (thumbnail) {

        formData.append(
          'thumbnail',
          thumbnail
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


      if (!response.ok) {

        throw new Error(
          'Unable to save archive item'
        )

      }


      onSaved()

    } catch (err) {

      console.error(err)


      setError(
        'Could not save this archive item.'
      )

    } finally {

      setSaving(false)

    }

  }


  async function removeThumbnail() {

    try {

      setSaving(true)
      setError('')


      const response =
        await fetch(
          '/api/library/remove-thumbnail',
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                mediaFilePath:
                  item.filePath,
              }),
          }
        )


      if (!response.ok) {

        throw new Error(
          'Unable to remove thumbnail'
        )

      }


      onSaved()

    } catch (err) {

      console.error(err)


      setError(
        'Could not remove the custom thumbnail.'
      )

    } finally {

      setSaving(false)

    }

  }


  return (

    <div className="editor-backdrop">

      <div className="memory-editor">

        <div className="editor-header">

          <div>

            <span className="archive-eyebrow">
              EDIT ARCHIVE ITEM
            </span>


            <h2>
              {item.title}
            </h2>

          </div>


          <button
            className="editor-close"
            onClick={onClose}
          >
            ×
          </button>

        </div>


        {(previewUrl ||
          currentThumbnailUrl) && (

          <div className="editor-thumbnail-preview">

            <img
              src={
                previewUrl ??
                currentThumbnailUrl ??
                ''
              }
              alt="Current thumbnail"
            />


            <span>

              {previewUrl
                ? 'New thumbnail preview'
                : 'Current custom thumbnail'}

            </span>

          </div>

        )}


        <label className="editor-field">

          <span>
            Display title
          </span>


          <input
            value={displayTitle}
            onChange={(event) =>
              setDisplayTitle(
                event.target.value
              )
            }
          />

        </label>


        <label className="editor-field">

          <span>
            Release date
          </span>


          <input
            type="date"
            value={releaseDate}
            onChange={(event) =>
              setReleaseDate(
                event.target.value
              )
            }
          />

        </label>


        <label className="editor-field">

          <span>
            Sort order
          </span>


          <input
            type="number"
            value={sortOrder}
            onChange={(event) =>
              setSortOrder(
                event.target.value
              )
            }
          />

        </label>


        <label className="editor-field">

          <span>
            Replace thumbnail
          </span>


          <input
            type="file"
            accept="
              image/jpeg,
              image/png,
              image/webp
            "
            onChange={(event) =>
              selectThumbnail(
                event.target.files?.[0] ??
                null
              )
            }
          />

        </label>


        {item.thumbnailPath && (

          <button
            className="editor-remove-thumbnail"
            onClick={
              removeThumbnail
            }
            disabled={
              saving
            }
          >
            Remove Custom Thumbnail
          </button>

        )}


        {error && (

          <p className="editor-error">
            {error}
          </p>

        )}


        <div className="editor-actions">

          <button
            className="editor-cancel"
            onClick={onClose}
          >
            Cancel
          </button>


          <button
            className="editor-save"
            onClick={saveItem}
            disabled={saving}
          >

            {saving
              ? 'Saving...'
              : 'Save'}

          </button>

        </div>

      </div>

    </div>

  )

}


export default MemoryEditor