import type {
  SupplementalSyncResult,
  WikiCacheFreshnessResult,
  WikiPhoneSyncResult,
  WikiPreviewResponse,
  WikiSyncProgress,
  WikiSyncResult,
} from '../catalogTypes'


type Props = {
  wikiCharacter: string
  wikiLoading: boolean
  phoneLoading: boolean
  wikiPreview: WikiPreviewResponse | null
  wikiSyncProgress: WikiSyncProgress | null
  wikiError: string
  wikiSyncResult: WikiSyncResult | null
  supplementalSyncResult: SupplementalSyncResult | null
  phonePipelineResult: WikiPhoneSyncResult | null
  phonePipelineError: string | null
  wikiCacheFreshness: WikiCacheFreshnessResult | null
  wikiCacheLoading: boolean
  wikiCacheError: string
  setWikiCharacter: (value: string) => void
  setWikiPreview: (value: WikiPreviewResponse | null) => void
  setWikiSyncResult: (value: WikiSyncResult | null) => void
  setWikiSyncProgress: (value: WikiSyncProgress | null) => void
  onPreview: () => void
  onSync: () => void
  onPhoneSync: () => void
  onRefreshCache: () => void
}


function CatalogWikiSyncPanel({
  wikiCharacter,
  wikiLoading,
  phoneLoading,
  wikiPreview,
  wikiSyncProgress,
  wikiError,
  wikiSyncResult,
  supplementalSyncResult,
  phonePipelineResult,
  phonePipelineError,
  wikiCacheFreshness,
  wikiCacheLoading,
  wikiCacheError,
  setWikiCharacter,
  setWikiPreview,
  setWikiSyncResult,
  setWikiSyncProgress,
  onPreview,
  onSync,
  onPhoneSync,
  onRefreshCache,
}: Props) {

  return (

<section className="catalog-wiki-panel">

  <div className="catalog-wiki-heading">

    <div>

      <span className="archive-eyebrow">
        WIKI SYNC
      </span>

      <h3>
        Love and Deepspace Wiki
      </h3>

      <p>
        Preview the All Memories backup,
        then run the complete character sync.
        All Memories supplies card metadata
        and artwork; Falling for You and By
        Your Side define the archive structure.
        Phone Calls and Phone Videos sync
        separately from wiki.gg Phone / All only.
      </p>

    </div>


    <div className="catalog-wiki-actions">

      <select
        value={
          wikiCharacter
        }
        onChange={(event) => {

          setWikiCharacter(
            event.target.value
          )

          setWikiPreview(
            null
          )

          setWikiSyncResult(
            null
          )

          setWikiSyncProgress(
            null
          )

        }}
      >
        <option value="All">
          All Characters
        </option>

        <option value="Xavier">
          Xavier
        </option>

        <option value="Zayne">
          Zayne
        </option>

        <option value="Rafayel">
          Rafayel
        </option>

        <option value="Sylus">
          Sylus
        </option>

        <option value="Caleb">
          Caleb
        </option>
      </select>


      <button
        type="button"
        className="catalog-secondary-button"
        disabled={
          wikiLoading
        }
        onClick={() =>
          onPreview()
        }
      >
        {wikiLoading
          ? 'Loading...'
          : 'Preview Wiki'}
      </button>


      <button
        type="button"
        className="catalog-primary-button"
        disabled={
          wikiLoading ||
          !wikiPreview ||
          wikiPreview.count ===
            0
        }
        onClick={() =>
          onSync()
        }
      >
        Sync {wikiCharacter}
      </button>


      <button
        type="button"
        className="catalog-secondary-button"
        disabled={
          wikiLoading ||
          phoneLoading
        }
        onClick={() =>
          onPhoneSync()
        }
      >
        {phoneLoading
          ? 'Syncing Phone...'
          : `Sync ${wikiCharacter} Phone`}
      </button>

    </div>

  </div>


  <div className="catalog-wiki-cache-status">

    <div className="catalog-wiki-cache-status-heading">

      <div>

        <strong>
          Wiki Page Cache
        </strong>

        <span>
          Source pages should be generated within the last 24 hours.
          Stale pages are automatically purged when possible.
        </span>

      </div>


      <button
        type="button"
        className="catalog-secondary-button"
        disabled={
          wikiCacheLoading
        }
        onClick={() =>
          onRefreshCache()
        }
      >
        {wikiCacheLoading
          ? 'Checking...'
          : 'Check Page Cache'}
      </button>

    </div>


    {wikiCacheError && (

      <div className="settings-status-message settings-status-error">
        {wikiCacheError}
      </div>

    )}


    {wikiCacheFreshness &&
    !wikiCacheFreshness.needsAttention && (

      <div className="catalog-wiki-cache-fresh">
        All timestamped wiki.gg source pages are within the
        24-hour freshness window.
      </div>

    )}


    {wikiCacheFreshness?.needsAttention && (

      <div className="catalog-wiki-cache-stale">

        <strong>
          Page cache needs attention
        </strong>

        <p>
          These pages were still more than 24 hours old after
          DeepSpace Archive attempted an automatic purge. Open the
          purge link for each page, purge it on the wiki, then use
          Check Page Cache again.
        </p>

        <div className="catalog-wiki-cache-links">

          {wikiCacheFreshness.pages
            .filter(
              (page) =>
                page.fresh !==
                  true ||
                page.error !==
                  null ||
                (
                  page.autoPurgeAttempted &&
                  page.autoPurgeSucceeded ===
                    false
                )
            )
            .map(
              (page) => (

                <div
                  key={
                    page.id
                  }
                  className="catalog-wiki-cache-link-row"
                >

                  <div>

                    <strong>
                      {page.label}
                    </strong>

                    <span>
                      {page.ageHours !==
                        null
                        ? `${page.ageHours} hours old`
                        : 'Freshness could not be confirmed'}
                    </span>

                  </div>


                  <div>

                    <a
                      href={
                        page.sourceUrl
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open Page
                    </a>

                    <a
                      href={
                        page.purgeUrl
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      Purge Page
                    </a>

                  </div>

                </div>

              )
            )}

        </div>

      </div>

    )}

  </div>


  {wikiSyncProgress && (

    <div className="catalog-wiki-progress">

      <div className="catalog-wiki-progress-header">

        <strong>
          {wikiSyncProgress.phase ===
            'resolving-artwork'
            ? 'Resolving artwork'
            : wikiSyncProgress.phase ===
                'importing'
              ? 'Updating catalog'
              : wikiSyncProgress.phase ===
                  'complete'
                ? 'Sync complete'
                : 'Loading wiki data'}
        </strong>

        <span>
          {wikiSyncProgress.percent}
          %
        </span>

      </div>


      <div
        className="catalog-wiki-progress-track"
        role="progressbar"
        aria-valuemin={
          0
        }
        aria-valuemax={
          100
        }
        aria-valuenow={
          wikiSyncProgress.percent
        }
      >

        <div
          className="catalog-wiki-progress-fill"
          style={{
            width:
              `${wikiSyncProgress.percent}%`,
          }}
        />

      </div>


      <div className="catalog-wiki-progress-message">
        {wikiSyncProgress.message}
      </div>

    </div>

  )}


  {wikiError && (

    <div className="settings-status-message settings-status-error">
      {wikiError}
    </div>

  )}


  {wikiPreview && (

    <div className="catalog-wiki-preview">

      <div className="catalog-wiki-preview-summary">

        <strong>
          {wikiPreview.count}
          {' '}
          {wikiPreview.character}
          {' Memory backup records found'}
        </strong>

        <span>
          Preview only — nothing has
          been written yet.
        </span>

      </div>


      <div className="catalog-wiki-preview-list">

        {wikiPreview.items
          .slice(
            0,
            8
          )
          .map(
            (item) => (

              <div
                key={
                  item.sourceKey
                }
                className="catalog-wiki-preview-row"
              >

                <div>

                  <strong>
                    {item.canonicalName}
                  </strong>

                  <span>
                    {[
                      item.rarity
                        ? `${item.rarity}★`
                        : null,
                      item.position,
                      item.attribute,
                    ]
                      .filter(
                        Boolean
                      )
                      .join(
                        ' · '
                      )}
                  </span>

                </div>


                {item.imageUrl && (

                  <img
                    src={
                      item.imageUrl
                    }
                    alt=""
                  />

                )}

              </div>

            )
          )}

      </div>


      {wikiPreview.count >
        8 && (

        <div className="catalog-wiki-more">
          +{' '}
          {wikiPreview.count -
            8}
          {' more records'}
        </div>

      )}

    </div>

  )}


  {wikiSyncResult && (

    <div className="catalog-wiki-sync-result">

      <strong>
        Wiki Sync Complete
      </strong>

      <span>
        {
          wikiSyncResult.created +
          (
            supplementalSyncResult
              ?.totalCreated ??
            0
          )
        }
        {' created · '}
        {
          wikiSyncResult.updated +
          (
            supplementalSyncResult
              ?.totalEnriched ??
            0
          )
        }
        {' refreshed · '}
        {
          wikiSyncResult.skipped +
          (
            supplementalSyncResult
              ? (
                  supplementalSyncResult
                    .fallingForYou
                    .skipped +
                  supplementalSyncResult
                    .byYourSide
                    .skipped
                )
              : 0
          )
        }
        {' skipped'}
      </span>

      {supplementalSyncResult && (

        <small>
          Memory backup: {wikiSyncResult.created} created / {wikiSyncResult.updated} updated
          {' · '}
          Falling for You: {supplementalSyncResult.fallingForYou.created} created / {supplementalSyncResult.fallingForYou.enriched} refreshed
          {' · '}
          By Your Side: {supplementalSyncResult.byYourSide.created} created / {supplementalSyncResult.byYourSide.existingSupplemental} refreshed
          {' · '}
          Relationships: {supplementalSyncResult.totalLinkedMemories} new
        </small>

      )}


    </div>

  )}


  {phonePipelineResult && (

    <div className="catalog-wiki-sync-result">

      <strong>
        Phone Sync Complete
      </strong>

      <span>
        {phonePipelineResult.voiceCalls}
        {' voice · '}
        {phonePipelineResult.videoCalls}
        {' video · '}
        {phonePipelineResult.created}
        {' created · '}
        {phonePipelineResult.updated}
        {' refreshed · '}
        {phonePipelineResult.skipped}
        {' skipped'}
        {phonePipelineResult.duplicateSkipped > 0 && (
          <>
            {' · '}
            {phonePipelineResult.duplicateSkipped}
            {' duplicate source '}
            {phonePipelineResult.duplicateSkipped === 1
              ? 'row'
              : 'rows'}
          </>
        )}
      </span>


      <small>
        Phone source: wiki.gg Phone / All
        {' · '}
        {Number.isFinite(phonePipelineResult.sources?.wikiGG)
          ? phonePipelineResult.sources.wikiGG
          : Number.isFinite(phonePipelineResult.discovered)
            ? phonePipelineResult.discovered
            : 0}
        {' records'}
      </small>

    </div>

  )}


  {phonePipelineError && (

    <div className="settings-status-message settings-status-error">
      {phonePipelineResult
        ? 'Phone sync completed with source errors: '
        : 'Phone sync: '}
      {phonePipelineError}
    </div>

  )}

</section>

  )

}


export default CatalogWikiSyncPanel
