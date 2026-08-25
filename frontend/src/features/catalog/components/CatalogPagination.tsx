type CatalogPaginationProps = {
  page: number
  pageCount: number
  totalCount: number
  rangeStart: number
  rangeEnd: number
  loading: boolean
  onPageChange:
    (
      page: number
    ) => void
}


function CatalogPagination({
  page,
  pageCount,
  totalCount,
  rangeStart,
  rangeEnd,
  loading,
  onPageChange,
}: CatalogPaginationProps) {

  return (

    <nav
      className="catalog-pagination"
      aria-label="Metadata catalog pages"
    >

      <div className="catalog-pagination-summary">

        {totalCount ===
          0
          ? 'No records in the current filters'
          : `Showing ${rangeStart.toLocaleString()}–${rangeEnd.toLocaleString()} of ${totalCount.toLocaleString()}`}

      </div>


      <div className="catalog-pagination-actions">

        <button
          type="button"
          className="catalog-secondary-button"
          disabled={
            loading ||
            page <=
              1
          }
          onClick={() =>
            onPageChange(
              page -
              1
            )
          }
        >
          ‹ Previous
        </button>


        <span className="catalog-pagination-page">
          Page {page.toLocaleString()} of {pageCount.toLocaleString()}
        </span>


        <button
          type="button"
          className="catalog-secondary-button"
          disabled={
            loading ||
            page >=
              pageCount ||
            totalCount ===
              0
          }
          onClick={() =>
            onPageChange(
              page +
              1
            )
          }
        >
          Next ›
        </button>

      </div>

    </nav>

  )

}


export default CatalogPagination