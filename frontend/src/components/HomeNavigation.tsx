import {
  useState,
} from 'react'

import {
  Link,
} from 'react-router-dom'

import {
  useArchiveNavigation,
} from '../hooks/useArchiveNavigation'


const itemsPerPage =
  6


/*
 * These buttons are visible so we can
 * design the navigation now, but they
 * won't navigate until their pages exist.
 */

const unfinishedSections =
  new Set()


function HomeNavigation() {

  const {
    enabledNavigation,
  } =
    useArchiveNavigation()


  const [
    page,
    setPage,
  ] =
    useState(
      0
    )


  const totalPages =
    Math.max(
      1,
      Math.ceil(
        enabledNavigation.length /
        itemsPerPage
      )
    )


  /*
   * =====================================
   * SAFE CURRENT PAGE
   * =====================================
   *
   * If navigation settings change and the
   * current page no longer exists, render
   * the last valid page instead of using
   * an effect to force page state.
   */

  const safePage =
    Math.min(
      page,
      totalPages - 1
    )


  const startIndex =
    safePage *
    itemsPerPage


  const visibleItems =
    enabledNavigation.slice(
      startIndex,
      startIndex +
      itemsPerPage
    )


  function previousPage() {

    setPage(
      (current) => {

        const safeCurrent =
          Math.min(
            current,
            totalPages - 1
          )


        if (
          safeCurrent ===
          0
        ) {

          return (
            totalPages - 1
          )

        }


        return (
          safeCurrent - 1
        )

      }
    )

  }


  function nextPage() {

    setPage(
      (current) => {

        const safeCurrent =
          Math.min(
            current,
            totalPages - 1
          )


        if (
          safeCurrent >=
          totalPages - 1
        ) {

          return 0

        }


        return (
          safeCurrent + 1
        )

      }
    )

  }


  return (

    <div className="home-navigation-carousel">

      {totalPages > 1 && (

        <button
          type="button"
          className="home-navigation-arrow home-navigation-arrow-left"
          onClick={
            previousPage
          }
          aria-label="Previous archive sections"
        >
          ‹
        </button>

      )}


      <nav className="home-navigation">

        {visibleItems.map(
          (item) => {

            const unfinished =
              unfinishedSections.has(
                item.id
              )


            if (
              unfinished
            ) {

              return (

                <div
                  key={
                    item.id
                  }
                  className="home-navigation-card home-navigation-card-coming"
                  title="Coming soon"
                >

                  <span className="home-navigation-icon">
                    {item.icon}
                  </span>

                  <span className="home-navigation-title">
                    {item.title}
                  </span>

                </div>

              )

            }


            return (

              <Link
                key={
                  item.id
                }
                to={
                  item.path
                }
                className="home-navigation-card"
              >

                <span className="home-navigation-icon">
                  {item.icon}
                </span>

                <span className="home-navigation-title">
                  {item.title}
                </span>

              </Link>

            )

          }
        )}

      </nav>


      {totalPages > 1 && (

        <button
          type="button"
          className="home-navigation-arrow home-navigation-arrow-right"
          onClick={
            nextPage
          }
          aria-label="Next archive sections"
        >
          ›
        </button>

      )}


      {totalPages > 1 && (

        <div className="home-navigation-page-indicator">

          {safePage + 1}

          {' / '}

          {totalPages}

        </div>

      )}

    </div>

  )

}


export default HomeNavigation