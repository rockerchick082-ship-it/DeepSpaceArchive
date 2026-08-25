import type {
  BulkOverrideRow,
} from '../catalogTypes'


type Progress = {
  current: number
  total: number
}


type Props = {
  current: boolean
  loading: boolean
  saving: boolean
  rows: BulkOverrideRow[]
  selections: Record<number, boolean>
  progress: Progress
  error: string
  message: string
  onLoad: () => void
  onSetAll: (value: boolean) => void
  onSetChoice: (
    catalogItemId: number,
    value: boolean
  ) => void
  onRun: () => void
}


function CatalogBulkOverridePanel({
  current: bulkOverrideCurrent,
  loading: bulkOverrideLoading,
  saving: bulkOverrideSaving,
  rows: bulkOverrideRows,
  selections: bulkOverrideSelections,
  progress: bulkOverrideProgress,
  error: bulkOverrideError,
  message: bulkOverrideMessage,
  onLoad,
  onSetAll,
  onSetChoice,
  onRun,
}: Props) {

  function loadBulkOverridePreview() {
    onLoad()
  }


  function setAllBulkOverrideChoices(
    value: boolean
  ) {
    onSetAll(
      value
    )
  }


  function setBulkOverrideChoice(
    catalogItemId: number,
    value: boolean
  ) {
    onSetChoice(
      catalogItemId,
      value
    )
  }


  function runBulkOverride() {
    onRun()
  }


  return (

<section className="catalog-bulk-override-section">

  <details
    onToggle={
      (event) => {

        const open =
          event.currentTarget.open


        if (
          open &&
          !bulkOverrideCurrent &&
          !bulkOverrideLoading
        ) {

          void loadBulkOverridePreview()

        }

      }
    }
  >

    <summary>

      <span>
        Bulk Override Matched Files
      </span>

      <small>
        Rename matched files from the current catalog filters
      </small>

    </summary>


    <div className="catalog-bulk-override-content">

      <div className="catalog-bulk-override-toolbar">

        <div>

          <strong>
            Matched file rename review
          </strong>

          <p>
            This list uses the filters above. Each eligible matched
            file starts at Yes. Review the current file name and full
            relative path before running the bulk rename.
          </p>

        </div>


        <div className="catalog-row-actions">

          <button
            type="button"
            onClick={() =>
              setAllBulkOverrideChoices(
                true
              )
            }
            disabled={
              bulkOverrideLoading ||
              bulkOverrideSaving
            }
          >
            All Yes
          </button>


          <button
            type="button"
            onClick={() =>
              setAllBulkOverrideChoices(
                false
              )
            }
            disabled={
              bulkOverrideLoading ||
              bulkOverrideSaving
            }
          >
            All No
          </button>


          <button
            type="button"
            onClick={() =>
              void loadBulkOverridePreview()
            }
            disabled={
              bulkOverrideLoading ||
              bulkOverrideSaving
            }
          >
            {bulkOverrideLoading
              ? 'Refreshing...'
              : 'Refresh'}
          </button>

        </div>

      </div>


      {bulkOverrideLoading &&
        bulkOverrideRows.length ===
          0 ? (

        <div className="catalog-empty-state">
          Loading matched files from the current filters...
        </div>

      ) : !bulkOverrideCurrent ? (

        <div className="catalog-empty-state">

          <strong>
            Bulk Override follows the current filters.
          </strong>

          <span>
            Load the matched files currently visible in this filtered catalog view.
          </span>

          <button
            type="button"
            onClick={() =>
              void loadBulkOverridePreview()
            }
          >
            Load Current Filter
          </button>

        </div>

      ) : bulkOverrideRows.length ===
        0 ? (

        <div className="catalog-empty-state">
          No matched files exist in the current filtered view.
        </div>

      ) : (

        <>

          <div className="catalog-bulk-override-summary">

            <span>
              {bulkOverrideRows.length}
              {' matched catalog '}
              {bulkOverrideRows.length ===
                1
                ? 'item'
                : 'items'}
            </span>

            <span>
              {
                bulkOverrideRows.filter(
                  (row) =>
                    row.eligible &&
                    bulkOverrideSelections[
                      row.catalogItemId
                    ]
                ).length
              }
              {' set to Yes'}
            </span>

          </div>


          <div className="catalog-bulk-override-list">

            {bulkOverrideRows.map(
              (row) => (

                <div
                  key={
                    row.catalogItemId
                  }
                  className={
                    [
                      'catalog-bulk-override-row',
                      row.alreadyNamed
                        ? 'catalog-bulk-override-row-current'
                        : '',
                      !row.eligible
                        ? 'catalog-bulk-override-row-disabled'
                        : '',
                    ]
                      .filter(
                        Boolean
                      )
                      .join(
                        ' '
                      )
                  }
                >

                  <div className="catalog-bulk-override-item">

                    <strong>
                      {row.itemName}
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


                  <div className="catalog-bulk-override-file">

                    <strong>
                      {row.currentFileName}
                    </strong>

                    <code>
                      {row.relativePath}
                    </code>

                    <span>
                      {'→ '}
                      {row.targetFileName}
                    </span>


                    {row.alreadyNamed && (

                      <small>
                        Already matches catalog name
                      </small>

                    )}


                    {row.reason && (

                      <small>
                        {row.reason}
                      </small>

                    )}

                  </div>


                  <div
                    className="catalog-bulk-override-toggle"
                    aria-label={
                      `Override ${row.itemName}`
                    }
                  >

                    <button
                      type="button"
                      className={
                        bulkOverrideSelections[
                          row.catalogItemId
                        ]
                          ? 'catalog-toggle-active'
                          : ''
                      }
                      disabled={
                        !row.eligible ||
                        bulkOverrideSaving
                      }
                      onClick={() =>
                        setBulkOverrideChoice(
                          row.catalogItemId,
                          true
                        )
                      }
                    >
                      Yes
                    </button>


                    <button
                      type="button"
                      className={
                        !bulkOverrideSelections[
                          row.catalogItemId
                        ]
                          ? 'catalog-toggle-active'
                          : ''
                      }
                      disabled={
                        !row.eligible ||
                        bulkOverrideSaving
                      }
                      onClick={() =>
                        setBulkOverrideChoice(
                          row.catalogItemId,
                          false
                        )
                      }
                    >
                      No
                    </button>

                  </div>

                </div>

              )
            )}

          </div>


          <div className="catalog-bulk-override-footer">

            <div>

              {bulkOverrideSaving ? (

                <span>
                  Renaming {bulkOverrideProgress.current}
                  {' of '}
                  {bulkOverrideProgress.total}
                  {'...'}
                </span>

              ) : bulkOverrideMessage ? (

                <span>
                  {bulkOverrideMessage}
                </span>

              ) : (

                <span>
                  Only rows set to Yes will be renamed.
                </span>

              )}


              {bulkOverrideError && (

                <small className="settings-status-error">
                  {bulkOverrideError}
                </small>

              )}

            </div>


            <button
              type="button"
              className="catalog-primary-button"
              onClick={() =>
                void runBulkOverride()
              }
              disabled={
                bulkOverrideSaving ||
                bulkOverrideLoading ||
                bulkOverrideRows.filter(
                  (row) =>
                    row.eligible &&
                    bulkOverrideSelections[
                      row.catalogItemId
                    ]
                ).length ===
                  0
              }
            >
              {bulkOverrideSaving
                ? 'Renaming...'
                : 'Override All Yes'}
            </button>

          </div>

        </>

      )}

    </div>

  </details>

</section>

  )

}


export default CatalogBulkOverridePanel
