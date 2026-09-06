import {
  Link,
} from 'react-router-dom'


function CatalogPageIntro() {

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

      </div>
    </>
  )

}


export default CatalogPageIntro
