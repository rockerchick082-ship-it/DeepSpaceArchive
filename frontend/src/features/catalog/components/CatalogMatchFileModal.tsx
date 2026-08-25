import type {
  CatalogItem,
  MatchCandidate,
} from '../catalogTypes'


type Props = {
  item: CatalogItem | null
  candidates: MatchCandidate[]
  loading: boolean
  error: string
  confirmingPath: string | null
  onClose: () => void
  onNext: () => void
  onConfirm: (
    candidate: MatchCandidate
  ) => void
}


function CatalogMatchFileModal({
  item: matchingItem,
  candidates: matchCandidates,
  loading: candidateLoading,
  error: candidateError,
  confirmingPath,
  onClose,
  onNext,
  onConfirm,
}: Props) {

  function closeMatchReview() {
    onClose()
  }


  function goToNextMatchRecord() {
    onNext()
  }


  function confirmFileMatch(
    candidate: MatchCandidate
  ) {
    onConfirm(
      candidate
    )
  }


  return (

    <>

{matchingItem && (

  <div
    className="catalog-modal-backdrop"
    role="presentation"
    onMouseDown={(event) => {

      if (
        event.target ===
        event.currentTarget
      ) {

        closeMatchReview()

      }

    }}
  >

    <section
      className="catalog-editor-modal catalog-match-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Match catalog record to archive file"
    >

      <header className="catalog-editor-header">

        <div>

          <span className="archive-eyebrow">
            FILE MATCHING
          </span>

          <h2>
            {matchingItem.canonicalName}
          </h2>

          <p className="catalog-match-modal-context">
            {[
              matchingItem.character,
              matchingItem.category,
            ]
              .filter(
                Boolean
              )
              .join(
                ' · '
              )}
          </p>


          {matchingItem.rarity ===
            5 && (

            <p className="catalog-match-modal-hint">
              5★ Memories may belong to
              Memoria, Bond, or Myths.
              A Myth video can be linked
              to both cards in its pair.
            </p>

          )}

        </div>


        <div className="catalog-row-actions">

          <button
            type="button"
            onClick={() =>
              void goToNextMatchRecord()
            }
            disabled={
              confirmingPath !==
              null
            }
            title="Skip this item and open the next unmatched item in the current filters"
          >
            Next
          </button>


          <button
            type="button"
            className="catalog-modal-close"
            onClick={
              closeMatchReview
            }
            aria-label="Close"
          >
            ×
          </button>

        </div>

      </header>


      {candidateLoading ? (

        <div className="catalog-empty-state">
          Searching your archive...
        </div>

      ) : candidateError ? (

        <div className="settings-status-message settings-status-error">
          {candidateError}
        </div>

      ) : matchCandidates.length ===
        0 ? (

        <div className="catalog-empty-state">

          <strong>
            No candidate files found.
          </strong>

          <p>
            Check that the catalog category
            and character match the folder
            structure used by your archive.
          </p>

        </div>

      ) : (

        <div className="catalog-candidate-list">

          {matchCandidates.map(
            (candidate) => (

              <div
                key={
                  candidate.relativePath
                }
                className="catalog-candidate-row"
              >

                <div className="catalog-candidate-main">

                  <strong>
                    {candidate.fileTitle}
                  </strong>

                  <span>
                    {candidate.relativePath}
                  </span>


                  {candidate.linkedCatalogItems.length >
                    0 && (

                    <div className="catalog-candidate-existing-links">

                      <span>
                        Already linked:
                      </span>

                      {candidate.linkedCatalogItems.map(
                        (linkedItem) => (

                          <span
                            key={
                              linkedItem.id
                            }
                            className="catalog-linked-memory-chip"
                          >
                            {linkedItem.rarity
                              ? `${linkedItem.rarity}★ `
                              : ''}
                            {linkedItem.canonicalName}
                          </span>

                        )
                      )}

                    </div>

                  )}

                </div>


                <div className="catalog-candidate-actions">

                  <span
                    className={
                      candidate.confidence >=
                        0.9
                        ? 'catalog-confidence catalog-confidence-high'
                        : candidate.confidence >=
                            0.75
                          ? 'catalog-confidence catalog-confidence-medium'
                          : 'catalog-confidence'
                    }
                  >
                    {Math.round(
                      candidate.confidence *
                      100
                    )}
                    %
                  </span>


                  <button
                    type="button"
                    className="catalog-primary-button"
                    disabled={
                      confirmingPath !==
                        null
                    }
                    onClick={() =>
                      void confirmFileMatch(
                        candidate
                      )
                    }
                  >
                    {confirmingPath ===
                      candidate.relativePath
                      ? 'Linking...'
                      : candidate.category ===
                          'Myths' &&
                        candidate.linkedCatalogItems.length >
                          0
                        ? 'Link as Myth Pair'
                        : 'Use This File'}
                  </button>

                </div>

              </div>

            )
          )}

        </div>

      )}

    </section>

  </div>

)}

    </>

  )

}


export default CatalogMatchFileModal
