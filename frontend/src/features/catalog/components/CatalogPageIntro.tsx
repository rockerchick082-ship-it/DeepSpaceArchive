import {
  Link,
} from 'react-router-dom'

import type {
  CatalogStats,
} from '../catalogTypes'


type CatalogPageIntroProps = {
  matching: boolean
  stats: CatalogStats | null
  onAutoMatch: () => void
}


function CatalogPageIntro({
  matching,
  stats,
  onAutoMatch,
}: CatalogPageIntroProps) {

  return (
    <>
      <header className="archive-page-header">

        <Link
          to="/settings"
          className="back-button"
        >
          ‹
        </Link>


        <div>

          <span className="archive-eyebrow">
            SETTINGS
          </span>

          <h1>
            Metadata Catalog
          </h1>

        </div>

      </header>


      <div className="catalog-page-intro">

        <div>

          <span className="archive-eyebrow">
            ARCHIVE KNOWLEDGE BASE
          </span>

          <h2>
            Queryable Game Metadata
          </h2>

          <p>
            Maintain canonical names,
            characters, categories,
            release information, artwork,
            and source data independently
            from the files in your library.
          </p>

        </div>


        <div className="catalog-heading-actions">

          <button
            type="button"
            className="catalog-secondary-button"
            onClick={
              onAutoMatch
            }
            disabled={
              matching ||
              (stats?.totalItems ?? 0) ===
                0
            }
          >
            {matching
              ? 'Matching...'
              : 'Auto-Match Files'}
          </button>

        </div>

      </div>
    </>
  )

}


export default CatalogPageIntro
