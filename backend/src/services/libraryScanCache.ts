type CacheEntry = {
  expiresAt: number
  promise: Promise<unknown>
}


const scanCache =
  new Map<string, CacheEntry>()


function configuredTtlMs() {

  const configured =
    Number(
      process.env
        .LIBRARY_SCAN_CACHE_TTL_MS
    )


  if (
    Number.isFinite(
      configured
    ) &&
    configured >=
      1000
  ) {

    return Math.round(
      configured
    )

  }


  return 30_000

}


export async function cachedLibraryScan<T>(
  key: string,
  loader: () => Promise<T>
): Promise<T> {

  const now =
    Date.now()


  const existing =
    scanCache.get(
      key
    )


  if (
    existing &&
    existing.expiresAt >
      now
  ) {

    return existing.promise as
      Promise<T>

  }


  if (existing) {

    scanCache.delete(
      key
    )

  }


  const promise =
    loader()


  const entry: CacheEntry = {
    expiresAt:
      now +
      configuredTtlMs(),

    promise,
  }


  scanCache.set(
    key,
    entry
  )


  void promise.catch(
    () => {

      if (
        scanCache.get(
          key
        ) ===
          entry
      ) {

        scanCache.delete(
          key
        )

      }

    }
  )


  return promise

}


export function invalidateLibraryScanCache() {

  const clearedEntries =
    scanCache.size


  scanCache.clear()


  return clearedEntries

}


export function getLibraryScanCacheStatus() {

  const now =
    Date.now()


  let activeEntries =
    0


  for (
    const entry
    of scanCache.values()
  ) {

    if (
      entry.expiresAt >
        now
    ) {

      activeEntries +=
        1

    }

  }


  return {
    ttlMs:
      configuredTtlMs(),

    entries:
      activeEntries,
  }

}