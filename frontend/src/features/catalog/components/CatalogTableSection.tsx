import type {
  CatalogItem,
  CatalogRelationshipView,
} from '../catalogTypes'


type CatalogTableSectionProps = {
  error: string
  relationshipError: string
  overrideMessage: string
  bulkMatchMessage: string
  overrideError: string
  loading: boolean
  items: CatalogItem[]
  relationshipView: CatalogRelationshipView | null
  overrideBusyId: number | null
  relationshipLoadingId: number | null

  onOpenMatchReview:
    (item: CatalogItem) => void

  onOverrideFileName:
    (item: CatalogItem) => void

  onToggleRelationships:
    (item: CatalogItem) => void

  onOpenEditRecord:
    (item: CatalogItem) => void

  onDeleteRecord:
    (item: CatalogItem) => void
}


function CatalogTableSection({
  error,
  relationshipError,
  overrideMessage,
  bulkMatchMessage,
  overrideError,
  loading,
  items,
  relationshipView,
  overrideBusyId,
  relationshipLoadingId,
  onOpenMatchReview,
  onOverrideFileName,
  onToggleRelationships,
  onOpenEditRecord,
  onDeleteRecord,
}: CatalogTableSectionProps) {

  return (
    <>
      {error && (

        <div className="settings-status-message settings-status-error">
          {error}
        </div>

      )}


      {relationshipError && (

        <div className="settings-status-message settings-status-error">
          {relationshipError}
        </div>

      )}


      {overrideMessage && (

        <div className="settings-status-message settings-status-success">
          {overrideMessage}
        </div>

      )}


      {bulkMatchMessage && (

        <div className="settings-status-message settings-status-success">
          {bulkMatchMessage}
        </div>

      )}


      {overrideError && (

        <div className="settings-status-message settings-status-error">
          {overrideError}
        </div>

      )}


      {loading ? (

        <div className="catalog-empty-state">
          Loading metadata catalog...
        </div>

      ) : items.length ===
        0 ? (

        <div className="catalog-empty-state">

          <strong>
            No catalog records found.
          </strong>

          <p>
            Add your first record manually,
            or later use Wiki Sync to
            populate the catalog.
          </p>

        </div>

      ) : (

        <div className="catalog-table-wrap">

          <table className="catalog-table">

            <thead>

              <tr>

                <th>
                  Item
                </th>

                <th>
                  Character
                </th>

                <th>
                  Category
                </th>

                <th>
                  Rarity
                </th>

                <th>
                  Release
                </th>

                <th>
                  Source
                </th>

                <th>
                  Actions
                </th>

              </tr>

            </thead>


            <tbody>

              {items.map(
                (item) => (

                  <tr
                    key={
                      item.id
                    }
                  >

                    <td>

                      <div className="catalog-item-cell">

                        {item.imageUrl && (

                          <img
                            src={
                              item.imageUrl
                            }
                            alt=""
                            className="catalog-item-image"
                          />

                        )}


                        <div>

                          <strong>
                            {item.canonicalName}
                          </strong>

                          {(item.subcategory ||
                            item.position) && (

                            <span>
                              {[
                                item.subcategory,
                                item.position,
                              ]
                                .filter(
                                  Boolean
                                )
                                .join(
                                  ' · '
                                )}
                            </span>

                          )}


                          {relationshipView
                            ?.catalogItemId ===
                            item.id && (

                            <div className="memory-linked-catalog">

                              <span className="memory-catalog-meta">
                                {relationshipView.mode ===
                                  'memories'
                                  ? (
                                      relationshipView.items.length ===
                                        1
                                        ? '1 linked Memory'
                                        : `${relationshipView.items.length} linked Memories`
                                    )
                                  : (
                                      relationshipView.items.length ===
                                        1
                                        ? 'Used by 1 archive item'
                                        : `Used by ${relationshipView.items.length} archive items`
                                    )}
                              </span>


                              {relationshipView.items.length >
                                0 ? (

                                <div className="memory-linked-titles">

                                  {relationshipView.items.map(
                                    (linkedItem) => (

                                      <span
                                        key={
                                          linkedItem.id
                                        }
                                      >
                                        {linkedItem.canonicalName}
                                        {' · '}
                                        {linkedItem.category}
                                      </span>

                                    )
                                  )}

                                </div>

                              ) : (

                                <span className="memory-catalog-meta">
                                  No relationships found.
                                </span>

                              )}

                            </div>

                          )}

                        </div>

                      </div>

                    </td>


                    <td>
                      {item.character ??
                        '—'}
                    </td>


                    <td>
                      {item.category}
                    </td>


                    <td>
                      {item.rarity ??
                        '—'}
                    </td>


                    <td>
                      {item.releaseDate ??
                        '—'}
                    </td>


                    <td>
                      {item.sourceName ??
                        item.source ??
                        'Manual'}
                    </td>


                    <td>

                      <div className="catalog-row-actions">

                        {item.category ===
                          'Memory' && (

                          <span className="memory-catalog-meta">
                            Reference / Myth Short
                          </span>

                        )}


                        <button
                          type="button"
                          onClick={() =>
                            onOpenMatchReview(
                              item
                            )
                          }
                          title={
                            item.category ===
                              'Memory'
                              ? 'Only Myth-linked Memory cards can return Memoria short candidates.'
                              : 'Match this catalog item to an archive file.'
                          }
                        >
                          Match File
                        </button>


                        {item.category !==
                          'Memory' && (

                          <button
                            type="button"
                            onClick={() =>
                              onOverrideFileName(
                                item
                              )
                            }
                            disabled={
                              overrideBusyId ===
                              item.id
                            }
                            title="Rename the matched file on disk to this catalog item's title"
                          >
                            {overrideBusyId ===
                              item.id
                              ? 'Renaming...'
                              : 'Override'}
                          </button>

                        )}


                        <button
                          type="button"
                          onClick={() =>
                            onToggleRelationships(
                              item
                            )
                          }
                          disabled={
                            relationshipLoadingId ===
                            item.id
                          }
                        >
                          {relationshipLoadingId ===
                            item.id
                            ? 'Loading...'
                            : item.category ===
                                'Memory'
                              ? 'Used By'
                              : 'Linked Memories'}
                        </button>


                        <button
                          type="button"
                          onClick={() =>
                            onOpenEditRecord(
                              item
                            )
                          }
                        >
                          Edit
                        </button>


                        <button
                          type="button"
                          className="catalog-danger-button"
                          onClick={() =>
                            onDeleteRecord(
                              item
                            )
                          }
                        >
                          Delete
                        </button>


                        <span
                          className={
                            item.hasFile
                              ? 'catalog-file-status catalog-file-status-yes'
                              : 'catalog-file-status catalog-file-status-no'
                          }
                          title={
                            item.hasFile
                              ? 'Has File'
                              : 'Missing File'
                          }
                          aria-label={
                            item.hasFile
                              ? 'Has File: Yes'
                              : 'Missing File: No'
                          }
                        >
                          {item.hasFile
                            ? 'Y'
                            : 'N'}
                        </span>

                      </div>

                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

        </div>

      )}
    </>
  )

}


export default CatalogTableSection
