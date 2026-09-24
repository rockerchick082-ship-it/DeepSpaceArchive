export type StoredArchiveView =
  Record<
    string,
    string
  >


const viewPrefix =
  'deepspace-archive-view:v1:'


const scrollPrefix =
  'deepspace-archive-scroll:v1:'


export function readArchiveViewState<
  T extends StoredArchiveView
>(
  key: string,
  defaults: T
): T {

  try {

    const raw =
      localStorage.getItem(
        viewPrefix +
        key
      )


    if (!raw) {

      return {
        ...defaults,
      }

    }


    const parsed =
      JSON.parse(
        raw
      ) as
        Record<
          string,
          unknown
        >


    const next = {
      ...defaults,
    }


    for (
      const property
      of Object.keys(
        defaults
      )
    ) {

      const value =
        parsed[
          property
        ]


      if (
        typeof value ===
          'string'
      ) {

        ;(next as Record<string, string>)[
          property
        ] =
          value

      }

    }


    return next

  } catch {

    return {
      ...defaults,
    }

  }

}


export function writeArchiveViewState(
  key: string,
  state:
    StoredArchiveView
) {

  try {

    localStorage.setItem(
      viewPrefix +
      key,
      JSON.stringify(
        state
      )
    )

  } catch {
    // View persistence is best-effort.
  }

}


export function saveArchiveScroll(
  key: string
) {

  try {

    sessionStorage.setItem(
      scrollPrefix +
      key,
      String(
        window.scrollY
      )
    )

  } catch {
    // Scroll persistence is best-effort.
  }

}


export function restoreArchiveScroll(
  key: string
) {

  try {

    const value =
      Number(
        sessionStorage.getItem(
          scrollPrefix +
          key
        )
      )


    if (
      Number.isFinite(
        value
      ) &&
      value >
        0
    ) {

      window.scrollTo({
        top:
          value,

        behavior:
          'auto',
      })

    }

  } catch {
    // Scroll persistence is best-effort.
  }

}