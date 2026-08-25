import {
  useArchiveNavigation,
} from '../hooks/useArchiveNavigation'


function ArchiveNavigationSettings() {

  const {
    navigation,
    toggleNavigation,
    moveNavigation,
    resetNavigation,
  } =
    useArchiveNavigation()


  return (

    <section className="settings-navigation-panel">

      <div className="settings-navigation-heading">

        <div>

          <span className="archive-eyebrow">
            HOME PAGE
          </span>

          <h2>
            Archive Navigation
          </h2>

          <p>
            Choose which archive sections
            appear on the home page and
            change their display order.
          </p>

        </div>


        <button
          className="library-rescan-button"
          type="button"
          onClick={
            resetNavigation
          }
        >
          Restore Defaults
        </button>

      </div>


      <div className="settings-navigation-list">

        {navigation.map(
          (
            item,
            index
          ) => (

            <div
              className="settings-navigation-row"
              key={
                item.id
              }
            >

              <div className="settings-navigation-item">

                <span className="settings-navigation-icon">
                  {item.icon}
                </span>


                <div>

                  <strong>
                    {item.title}
                  </strong>

                  <span>
                    {item.path}
                  </span>

                </div>

              </div>


              <div className="settings-navigation-actions">

                <button
                  type="button"
                  className="settings-order-button"
                  disabled={
                    index === 0
                  }
                  onClick={() =>
                    moveNavigation(
                      item.id,
                      'up'
                    )
                  }
                  aria-label={
                    `Move ${item.title} earlier`
                  }
                >
                  ↑
                </button>


                <button
                  type="button"
                  className="settings-order-button"
                  disabled={
                    index ===
                    navigation.length - 1
                  }
                  onClick={() =>
                    moveNavigation(
                      item.id,
                      'down'
                    )
                  }
                  aria-label={
                    `Move ${item.title} later`
                  }
                >
                  ↓
                </button>


                <label className="settings-navigation-toggle">

                  <input
                    type="checkbox"
                    checked={
                      item.enabled
                    }
                    onChange={() =>
                      toggleNavigation(
                        item.id
                      )
                    }
                  />

                  <span>
                    {item.enabled
                      ? 'Shown'
                      : 'Hidden'}
                  </span>

                </label>

              </div>

            </div>

          )
        )}

      </div>

    </section>

  )

}


export default ArchiveNavigationSettings