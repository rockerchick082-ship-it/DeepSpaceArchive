import {
  Link,
  useLocation,
} from 'react-router-dom'

import {
  useArchiveNavigation,
} from '../hooks/useArchiveNavigation'


function pathMatches(
  pathname: string,
  itemPath: string
) {

  if (
    itemPath ===
    '/'
  ) {

    return (
      pathname ===
      '/'
    )

  }


  return (
    pathname ===
      itemPath ||
    pathname.startsWith(
      `${itemPath}/`
    )
  )

}


function ArchiveSequenceNav() {

  const location =
    useLocation()


  const {
    enabledNavigation,
  } =
    useArchiveNavigation()


  const currentIndex =
    enabledNavigation.findIndex(
      (item) =>
        pathMatches(
          location.pathname,
          item.path
        )
    )


  if (
    currentIndex <
    0
  ) {

    return null

  }


  const previous =
    currentIndex >
      0
      ? enabledNavigation[
          currentIndex - 1
        ]
      : null


  const next =
    currentIndex <
      enabledNavigation.length - 1
      ? enabledNavigation[
          currentIndex + 1
        ]
      : null


  if (
    !previous &&
    !next
  ) {

    return null

  }


  return (

    <nav
      className="archive-sequence-nav"
      aria-label="Previous and next archive sections"
    >

      {previous && (

        <Link
          to={
            previous.path
          }
          className="archive-sequence-link"
          rel="prev"
        >
          <span aria-hidden="true">
            ‹
          </span>

          <span>
            {previous.title}
          </span>
        </Link>

      )}


      {next && (

        <Link
          to={
            next.path
          }
          className="archive-sequence-link"
          rel="next"
        >
          <span>
            {next.title}
          </span>

          <span aria-hidden="true">
            ›
          </span>
        </Link>

      )}

    </nav>

  )

}


export default ArchiveSequenceNav
