import type {
  CatalogForm,
  CatalogItem,
} from '../catalogTypes'


type CatalogEditorModalProps = {
  open: boolean
  editingItem: CatalogItem | null
  form: CatalogForm
  saveError: string
  saving: boolean

  onClose:
    () => void

  onUpdateForm:
    (
      field:
        keyof CatalogForm,
      value:
        string
    ) => void

  onSave:
    () => void
}


function CatalogEditorModal({
  open,
  editingItem,
  form,
  saveError,
  saving,
  onClose,
  onUpdateForm,
  onSave,
}: CatalogEditorModalProps) {

  if (
    !open
  ) {

    return null

  }


  return (
    <div
      className="catalog-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {

        if (
          event.target ===
          event.currentTarget
        ) {

          onClose()

        }

      }}
    >

      <section
        className="catalog-editor-modal"
        role="dialog"
        aria-modal="true"
        aria-label={
          editingItem
            ? 'Edit metadata catalog record'
            : 'Add metadata catalog record'
        }
      >

        <header className="catalog-editor-header">

          <div>

            <span className="archive-eyebrow">
              {editingItem
                ? 'EDIT RECORD'
                : 'NEW RECORD'}
            </span>

            <h2>
              {editingItem
                ? editingItem.canonicalName
                : 'Add Catalog Record'}
            </h2>

          </div>


          <button
            type="button"
            className="catalog-modal-close"
            onClick={
              onClose
            }
            aria-label="Close"
          >
            ×
          </button>

        </header>


        <div className="catalog-form-grid">

          <label className="catalog-form-field catalog-form-field-wide">

            <span>
              Canonical Name *
            </span>

            <input
              value={
                form.canonicalName
              }
              onChange={(event) =>
                onUpdateForm(
                  'canonicalName',
                  event.target.value
                )
              }
            />

          </label>


          <label className="catalog-form-field">

            <span>
              Character
            </span>

            <input
              value={
                form.character
              }
              onChange={(event) =>
                onUpdateForm(
                  'character',
                  event.target.value
                )
              }
              placeholder="Xavier"
            />

          </label>


          <label className="catalog-form-field">

            <span>
              Category *
            </span>

            <input
              value={
                form.category
              }
              onChange={(event) =>
                onUpdateForm(
                  'category',
                  event.target.value
                )
              }
              placeholder="Memoria"
            />

          </label>


          <label className="catalog-form-field">

            <span>
              Subcategory
            </span>

            <input
              value={
                form.subcategory
              }
              onChange={(event) =>
                onUpdateForm(
                  'subcategory',
                  event.target.value
                )
              }
            />

          </label>


          <label className="catalog-form-field">

            <span>
              Release Date
            </span>

            <input
              type="date"
              value={
                form.releaseDate
              }
              onChange={(event) =>
                onUpdateForm(
                  'releaseDate',
                  event.target.value
                )
              }
            />

          </label>


          <label className="catalog-form-field">

            <span>
              Rarity
            </span>

            <input
              type="number"
              min="1"
              max="5"
              step="1"
              value={
                form.rarity
              }
              onChange={(event) =>
                onUpdateForm(
                  'rarity',
                  event.target.value
                )
              }
            />

          </label>


          <label className="catalog-form-field">

            <span>
              Position
            </span>

            <input
              value={
                form.position
              }
              onChange={(event) =>
                onUpdateForm(
                  'position',
                  event.target.value
                )
              }
              placeholder="Lunar"
            />

          </label>


          <label className="catalog-form-field">

            <span>
              Attribute
            </span>

            <input
              value={
                form.attribute
              }
              onChange={(event) =>
                onUpdateForm(
                  'attribute',
                  event.target.value
                )
              }
            />

          </label>


          <label className="catalog-form-field">

            <span>
              Source / Acquisition
            </span>

            <input
              value={
                form.source
              }
              onChange={(event) =>
                onUpdateForm(
                  'source',
                  event.target.value
                )
              }
            />

          </label>


          <label className="catalog-form-field catalog-form-field-wide">

            <span>
              Image URL
            </span>

            <input
              type="url"
              value={
                form.imageUrl
              }
              onChange={(event) =>
                onUpdateForm(
                  'imageUrl',
                  event.target.value
                )
              }
            />

          </label>


          <label className="catalog-form-field">

            <span>
              Data Source
            </span>

            <input
              value={
                form.sourceName
              }
              onChange={(event) =>
                onUpdateForm(
                  'sourceName',
                  event.target.value
                )
              }
              placeholder="manual"
            />

          </label>


          <label className="catalog-form-field">

            <span>
              Source Key
            </span>

            <input
              value={
                form.sourceKey
              }
              onChange={(event) =>
                onUpdateForm(
                  'sourceKey',
                  event.target.value
                )
              }
            />

          </label>


          <label className="catalog-form-field catalog-form-field-wide">

            <span>
              Source URL
            </span>

            <input
              type="url"
              value={
                form.sourceUrl
              }
              onChange={(event) =>
                onUpdateForm(
                  'sourceUrl',
                  event.target.value
                )
              }
            />

          </label>


          <label className="catalog-form-field">

            <span>
              Source Updated
            </span>

            <input
              type="datetime-local"
              value={
                form.sourceUpdatedAt
              }
              onChange={(event) =>
                onUpdateForm(
                  'sourceUpdatedAt',
                  event.target.value
                )
              }
            />

          </label>


          <label className="catalog-form-field catalog-form-field-wide">

            <span>
              Notes
            </span>

            <textarea
              rows={
                4
              }
              value={
                form.manualNotes
              }
              onChange={(event) =>
                onUpdateForm(
                  'manualNotes',
                  event.target.value
                )
              }
            />

          </label>

        </div>


        {saveError && (

          <div className="settings-status-message settings-status-error">
            {saveError}
          </div>

        )}


        <footer className="catalog-editor-actions">

          <button
            type="button"
            onClick={
              onClose
            }
            disabled={
              saving
            }
          >
            Cancel
          </button>


          <button
            type="button"
            className="catalog-primary-button"
            onClick={
              onSave
            }
            disabled={
              saving
            }
          >
            {saving
              ? 'Saving...'
              : editingItem
                ? 'Save Changes'
                : 'Create Record'}
          </button>

        </footer>

      </section>

    </div>
  )

}


export default CatalogEditorModal
