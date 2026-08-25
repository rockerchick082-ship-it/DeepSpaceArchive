import type {
  AutoMatchResult,
  CatalogStats,
} from '../catalogTypes'


type ReviewCandidate =
  AutoMatchResult[
    'needsReview'
  ][number]


type CatalogWorkspaceControlsProps = {
  stats: CatalogStats | null
  matchResult: AutoMatchResult | null
  confirmingPath: string | null
  searchText: string
  selectedCharacter: string
  selectedCategory: string
  selectedRarity: string
  fileFilter: string
  characterCategoryCounts: Record<string, number>
  allCategoriesDisplayCount: number
  effectiveIncludedCategories: string[]
  includedCategorySet: ReadonlySet<string>
  bulkMatchLoading: boolean
  itemCount: number

  onSearchTextChange:
    (value: string) => void

  onCharacterChange:
    (value: string) => void

  onCategoryChange:
    (value: string) => void

  onRarityChange:
    (value: string) => void

  onFileFilterChange:
    (value: string) => void

  onOpenBulkMatch:
    () => void

  onOpenNewRecord:
    () => void

  onToggleIncludedCategory:
    (category: string) => void

  onIncludeAllArchiveCategories:
    () => void

  reviewCandidateKey:
    (candidate: ReviewCandidate) => string

  onAcceptReview:
    (candidate: ReviewCandidate) => void

  onRejectReview:
    (candidate: ReviewCandidate) => void
}


function CatalogWorkspaceControls({
  stats,
  matchResult,
  confirmingPath,
  searchText,
  selectedCharacter,
  selectedCategory,
  selectedRarity,
  fileFilter,
  characterCategoryCounts,
  allCategoriesDisplayCount,
  effectiveIncludedCategories,
  includedCategorySet,
  bulkMatchLoading,
  itemCount,
  onSearchTextChange,
  onCharacterChange,
  onCategoryChange,
  onRarityChange,
  onFileFilterChange,
  onOpenBulkMatch,
  onOpenNewRecord,
  onToggleIncludedCategory,
  onIncludeAllArchiveCategories,
  reviewCandidateKey,
  onAcceptReview,
  onRejectReview,
}: CatalogWorkspaceControlsProps) {

  return (
    <>
      <div className="catalog-memory-rule-note">

        <strong>
          Archive structure
        </strong>

        <span>
          Falling for You → Bond, Memoria, Myths
          {' · '}
          By Your Side → Secret Times, Tender Moments
          {' · '}
          All Memories → backup card metadata and artwork
          {' · '}
          Phone → separate sync using wiki.gg + LADS Wiki backups
        </span>

      </div>


      <div className="catalog-stat-grid">

        <div className="catalog-stat-card">

          <strong>
            {stats?.totalItems ??
              0}
          </strong>

          <span>
            Catalog Records
          </span>

          <small>
            {stats?.archiveItems ?? 0} archive
            {' · '}
            {stats?.memoryReferenceItems ?? 0} Memory references
            {' · '}
            {stats?.memoryRelationships ?? 0} relationships
          </small>

        </div>


        <div className="catalog-stat-card">

          <strong>
            {stats?.matchedItems ??
              0}
          </strong>

          <span>
            Archive Matched
          </span>

        </div>


        <div className="catalog-stat-card">

          <strong>
            {stats?.unmatchedItems ??
              0}
          </strong>

          <span>
            Archive Missing
          </span>

        </div>


        <div className="catalog-stat-card">

          <strong>
            {stats?.fileMatches ??
              0}
          </strong>

          <span>
            Archive File Links
          </span>

        </div>

      </div>


      {matchResult && (

        <section className="catalog-match-result">

          <div className="catalog-match-summary">

            <strong>
              Auto-Match Complete
            </strong>

            <span>
              {matchResult.matched}
              {' matched · '}
              {matchResult.needsReview.length}
              {' need review · '}
              {matchResult.unmatchedCatalogItems}
              {' unmatched'}
            </span>

          </div>


          {matchResult.needsReview.length >
            0 && (

            <details className="catalog-review-details">

              <summary>
                Review possible matches
              </summary>


              <div className="catalog-review-list">

                {matchResult.needsReview.map(
                  (candidate) => (

                    <div
                      key={
                        `${candidate.catalogItemId}-${candidate.relativePath}`
                      }
                      className="catalog-review-row"
                    >

                      <div>

                        <strong>
                          {candidate.catalogName}
                        </strong>

                        <span>
                          Possible file:
                          {' '}
                          {candidate.fileTitle}
                        </span>

                      </div>


                      <div className="catalog-row-actions">

                        <span>
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
                            onAcceptReview(
                              candidate
                            )
                          }
                        >
                          {confirmingPath ===
                            reviewCandidateKey(
                              candidate
                            )
                            ? 'Matching...'
                            : 'Yes'}
                        </button>


                        <button
                          type="button"
                          disabled={
                            confirmingPath !==
                            null
                          }
                          onClick={() =>
                            onRejectReview(
                              candidate
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

            </details>

          )}

        </section>

      )}


      <section className="catalog-controls">

        <input
          className="catalog-search"
          type="search"
          placeholder="Search names, characters, categories, sources..."
          value={
            searchText
          }
          onChange={(event) =>
            onSearchTextChange(
              event.target.value
            )
          }
        />


        <select
          value={
            selectedCharacter
          }
          onChange={(event) =>
            onCharacterChange(
              event.target.value
            )
          }
        >

          <option value="">
            All Characters
          </option>

          {stats?.characters.map(
            (entry) => (

              <option
                key={
                  entry.character
                }
                value={
                  entry.character
                }
              >
                {entry.character}
                {' ('}
                {entry.count}
                {')'}
              </option>

            )
          )}

        </select>


        <select
          value={
            selectedCategory
          }
          onChange={(event) =>
            onCategoryChange(
              event.target.value
            )
          }
        >

          <option value="">
            {`All Categories (${allCategoriesDisplayCount})`}
          </option>

          {stats?.categories.map(
            (entry) => (

              <option
                key={
                  entry.category
                }
                value={
                  entry.category
                }
              >
                {entry.category}
                {' ('}
                {
                  selectedCharacter
                    ? (
                        characterCategoryCounts[
                          entry.category
                        ] ??
                        0
                      )
                    : entry.count
                }
                {')'}
              </option>

            )
          )}

        </select>


        <select
          value={
            selectedRarity
          }
          onChange={(event) =>
            onRarityChange(
              event.target.value
            )
          }
        >

          <option value="">
            All Rarities
          </option>

          <option value="5">
            5 Star
          </option>

          <option value="4">
            4 Star
          </option>

          <option value="3">
            3 Star
          </option>

        </select>


        <select
          value={
            fileFilter
          }
          onChange={(event) =>
            onFileFilterChange(
              event.target.value
            )
          }
        >

          <option value="">
            Any File Status
          </option>

          <option value="true">
            Has File
          </option>

          <option value="false">
            Missing File
          </option>

        </select>


        <div className="catalog-filter-actions">

          <button
            type="button"
            className="catalog-secondary-button"
            onClick={
              onOpenBulkMatch
            }
            disabled={
              bulkMatchLoading ||
              itemCount ===
                0
            }
          >
            {bulkMatchLoading
              ? 'Loading Matches...'
              : 'View All Filtered Matches'}
          </button>


          <button
            type="button"
            className="catalog-primary-button"
            onClick={
              onOpenNewRecord
            }
          >
            + Add Record
          </button>

        </div>

      </section>


      <details className="catalog-review-details">

        <summary>
          Categories included in searches
          {' ('}
          {effectiveIncludedCategories.length}
          {' selected)'}
        </summary>


        <div className="catalog-review-list">

          <div className="catalog-row-actions">

            {stats?.categories.map(
              (entry) => (

                <label
                  key={
                    entry.category
                  }
                  className="catalog-linked-memory-chip"
                >

                  <input
                    type="checkbox"
                    checked={
                      includedCategorySet.has(
                        entry.category
                      )
                    }
                    onChange={() =>
                      onToggleIncludedCategory(
                        entry.category
                      )
                    }
                  />

                  {' '}
                  {entry.category}

                </label>

              )
            )}


            <button
              type="button"
              onClick={
                onIncludeAllArchiveCategories
              }
            >
              All Except Memory
            </button>

          </div>


          <small className="memory-catalog-meta">
            These checkboxes control All Categories,
            Missing File searches, and Auto-Match.
            Memory is off by default. Turn Memory on
            when matching Myth-linked Memory cards to
            their separate Memoria shorts.
          </small>

        </div>

      </details>
    </>
  )

}


export default CatalogWorkspaceControls
