import type {
  BulkMatchOption,
  BulkMatchRow,
} from '../catalogTypes'


type Props = {
  open: boolean
  loading: boolean
  saving: boolean
  rows: BulkMatchRow[]
  selections: Record<number, string>
  error: string
  onClose: () => void
  onChoose: (
    catalogItemId: number,
    optionKey: string
  ) => void
  onSave: () => void
  optionKey: (
    option: BulkMatchOption
  ) => string
}


function CatalogBulkMatchModal({
  open: bulkMatchOpen,
  loading: bulkMatchLoading,
  saving: bulkMatchSaving,
  rows: bulkMatchRows,
  selections: bulkSelections,
  error: bulkMatchError,
  onClose,
  onChoose,
  onSave,
  optionKey,
}: Props) {

  function closeBulkMatchView() {
    onClose()
  }


  function chooseBulkMatch(
    catalogItemId: number,
    value: string
  ) {
    onChoose(
      catalogItemId,
      value
    )
  }


  function saveBulkMatches() {
    onSave()
  }


  function bulkMatchOptionKey(
    option: BulkMatchOption
  ) {
    return optionKey(
      option
    )
  }


  return (

    <>

{bulkMatchOpen && (

  <div
    className="catalog-modal-backdrop"
    role="presentation"
    onMouseDown={(event) => {

      if (
        event.target ===
        event.currentTarget
      ) {

        closeBulkMatchView()

      }

    }}
  >

    <section
      className="catalog-editor-modal catalog-bulk-match-modal"
      role="dialog"
      aria-modal="true"
      aria-label="View all filtered catalog matches"
    >

      <header className="catalog-editor-header">

        <div>

          <span className="archive-eyebrow">
            FILTERED FILE MATCHING
          </span>

          <h2>
            View All Filtered Matches
          </h2>

          <p className="catalog-match-modal-context">
            The left side is your filtered catalog list.
            The right side only shows currently unmatched
            files from the folder(s) valid for that item.
          </p>

        </div>


        <button
          type="button"
          className="catalog-modal-close"
          onClick={
            closeBulkMatchView
          }
          aria-label="Close"
        >
          ×
        </button>

      </header>


      {bulkMatchLoading ? (

        <div className="catalog-empty-state">
          Loading unmatched files for the current filters...
        </div>

      ) : bulkMatchError ? (

        <div className="settings-status-message settings-status-error">
          {bulkMatchError}
        </div>

      ) : bulkMatchRows.length ===
        0 ? (

        <div className="catalog-empty-state">

          <strong>
            No unmatched catalog items in the current filtered view.
          </strong>

        </div>

      ) : (

        <>

          <div className="catalog-bulk-match-summary">

            <span>
              {bulkMatchRows.length}
              {' unmatched catalog '}
              {bulkMatchRows.length ===
                1
                ? 'item'
                : 'items'}
            </span>

            <span>
              {
                Object.values(
                  bulkSelections
                )
                  .filter(
                    Boolean
                  )
                  .length
              }
              {' selected'}
            </span>

          </div>


          <div className="catalog-bulk-match-list">

            {bulkMatchRows.map(
              (row) => {

                const selectedKey =
                  bulkSelections[
                    row.catalogItemId
                  ] ??
                  ''


                return (

                  <div
                    key={
                      row.catalogItemId
                    }
                    className="catalog-bulk-match-row"
                  >

                    <div className="catalog-candidate-main">

                      <strong>
                        {row.catalogName}
                      </strong>

                      <span>
                        {[
                          row.character,
                          row.category,
                        ]
                          .filter(
                            Boolean
                          )
                          .join(
                            ' · '
                          )}
                      </span>

                    </div>


                    <select
                      className="catalog-bulk-match-select"
                      value={
                        selectedKey
                      }
                      disabled={
                        bulkMatchSaving ||
                        row.options.length ===
                          0
                      }
                      onChange={
                        (event) =>
                          chooseBulkMatch(
                            row.catalogItemId,
                            event.target.value
                          )
                      }
                    >

                      <option value="">
                        {row.options.length ===
                          0
                          ? 'No unmatched files available in this folder'
                          : 'Select an unmatched file...'}
                      </option>


                      {row.options.map(
                        (option) => {

                          const optionKey =
                            bulkMatchOptionKey(
                              option
                            )


                          const selectedElsewhere =
                            Object.entries(
                              bulkSelections
                            )
                              .some(
                                (
                                  [
                                    catalogItemId,
                                    value,
                                  ]
                                ) =>
                                  Number(
                                    catalogItemId
                                  ) !==
                                    row.catalogItemId &&
                                  value ===
                                    optionKey
                              )


                          return (

                            <option
                              key={
                                optionKey
                              }
                              value={
                                optionKey
                              }
                              disabled={
                                selectedElsewhere
                              }
                            >
                              {Math.round(
                                option.confidence *
                                100
                              )}
                              {'% · '}
                              {option.fileTitle}
                            </option>

                          )

                        }
                      )}

                    </select>

                  </div>

                )

              }
            )}

          </div>


          <div className="catalog-editor-actions">

            <button
              type="button"
              onClick={
                closeBulkMatchView
              }
              disabled={
                bulkMatchSaving
              }
            >
              Close
            </button>


            <button
              type="button"
              className="catalog-primary-button"
              onClick={() =>
                void saveBulkMatches()
              }
              disabled={
                bulkMatchSaving ||
                Object.values(
                  bulkSelections
                )
                  .filter(
                    Boolean
                  )
                  .length ===
                  0
              }
            >
              {bulkMatchSaving
                ? 'Matching Selected...'
                : 'Match Selected'}
            </button>

          </div>

        </>

      )}

    </section>

  </div>

)}

    </>

  )

}


export default CatalogBulkMatchModal
