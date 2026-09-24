$ErrorActionPreference = "Stop"

$repoRoot = Get-Location

$required = @(
  "backend\src\scanner\libraryScanner.ts",
  "backend\src\scanner\mainStoryScanner.ts",
  "backend\src\metadata\memoryMetadata.ts",
  "backend\src\server.ts",
  "frontend\src\pages\LibraryStatusPage.tsx",
  "frontend\src\pages\ArchiveCompletenessPage.tsx",
  "frontend\src\components\VideoArchivePlayer.tsx",
  "frontend\src\App.css"
)

foreach ($relative in $required) {
  if (-not (Test-Path (Join-Path $repoRoot $relative))) {
    throw "Run this from the DeepSpaceArchive repository root. Missing: $relative"
  }
}

function Read-Source([string]$relativePath) {
  $path = Join-Path $repoRoot $relativePath
  $raw = [System.IO.File]::ReadAllText($path)

  [pscustomobject]@{
    Path = $path
    Newline = if ($raw.Contains("`r`n")) { "`r`n" } else { "`n" }
    Text = $raw.Replace("`r`n", "`n")
  }
}

function Write-Source($file) {
  $output =
    if ($file.Newline -eq "`r`n") {
      $file.Text.Replace("`n", "`r`n")
    } else {
      $file.Text
    }

  $utf8NoBom =
    New-Object System.Text.UTF8Encoding($false)

  [System.IO.File]::WriteAllText(
    $file.Path,
    $output,
    $utf8NoBom
  )
}

function Replace-LiteralOnce(
  [string]$text,
  [string]$old,
  [string]$new,
  [string]$label
) {
  $first = $text.IndexOf($old)

  if ($first -lt 0) {
    throw "Could not find target for: $label"
  }

  $second =
    $text.IndexOf(
      $old,
      $first + $old.Length
    )

  if ($second -ge 0) {
    throw "Found target more than once for: $label"
  }

  return (
    $text.Substring(0, $first) +
    $new +
    $text.Substring(
      $first + $old.Length
    )
  )
}

function Replace-RegexOnce(
  [string]$text,
  [string]$pattern,
  [string]$replacement,
  [string]$label
) {
  $regex =
    [regex]::new(
      $pattern,
      [System.Text.RegularExpressions.RegexOptions]::Singleline
    )

  $matches =
    $regex.Matches(
      $text
    )

  if ($matches.Count -ne 1) {
    throw "Expected exactly 1 match for '$label', found $($matches.Count)."
  }

  $match =
    $matches[0]

  return (
    $text.Substring(
      0,
      $match.Index
    ) +
    $replacement +
    $text.Substring(
      $match.Index +
      $match.Length
    )
  )
}

function Insert-BeforeLiteralOnce(
  [string]$text,
  [string]$marker,
  [string]$insert,
  [string]$label
) {
  $first =
    $text.IndexOf(
      $marker
    )

  if ($first -lt 0) {
    throw "Could not find marker for: $label"
  }

  $second =
    $text.IndexOf(
      $marker,
      $first + $marker.Length
    )

  if ($second -ge 0) {
    throw "Found marker more than once for: $label"
  }

  return (
    $text.Substring(
      0,
      $first
    ) +
    $insert +
    $text.Substring(
      $first
    )
  )
}

$files = @{}

foreach ($relative in $required) {
  $files[$relative] =
    Read-Source $relative
}

# ================================================================
# Shared library scan cache
# ================================================================

$cacheRelative =
  "backend\src\services\libraryScanCache.ts"

$cachePath =
  Join-Path $repoRoot $cacheRelative

if (Test-Path $cachePath) {
  throw "libraryScanCache.ts already exists. Stop here rather than applying the optimization twice."
}

$cacheSource = @'
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
'@

# ================================================================
# libraryScanner.ts
# ================================================================

$library =
  $files[
    "backend\src\scanner\libraryScanner.ts"
  ]

if (
  $library.Text.Contains(
    "libraryScanCache"
  )
) {
  throw "libraryScanner.ts already contains libraryScanCache."
}

$library.Text =
  Insert-BeforeLiteralOnce `
    $library.Text `
    "export type LibraryCatalogItem" `
    @'
import {
  cachedLibraryScan,
} from '../services/libraryScanCache'


'@ `
    "libraryScanner cache import"

$library.Text =
  Replace-RegexOnce `
    $library.Text `
    'export\s+async\s+function\s+scanCategory\s*\(' `
    'async function scanCategoryUncached(' `
    "rename scanCategory implementation"

$libraryWrapper = @'


export async function scanCategory(
  libraryPath: string,
  category: string
): Promise<LibraryItem[]> {

  const key =
    [
      'category',
      path.resolve(
        libraryPath
      ),
      category,
    ].join(
      ':'
    )


  return cachedLibraryScan(
    key,
    () =>
      scanCategoryUncached(
        libraryPath,
        category
      )
  )

}
'@

$library.Text =
  $library.Text.TrimEnd() +
  $libraryWrapper +
  "`n"

# ================================================================
# mainStoryScanner.ts
# ================================================================

$story =
  $files[
    "backend\src\scanner\mainStoryScanner.ts"
  ]

if (
  $story.Text.Contains(
    "libraryScanCache"
  )
) {
  throw "mainStoryScanner.ts already contains libraryScanCache."
}

$story.Text =
  Insert-BeforeLiteralOnce `
    $story.Text `
    "const videoExtensions" `
    @'
import {
  cachedLibraryScan,
} from '../services/libraryScanCache'


'@ `
    "Main Story cache import"

$story.Text =
  Replace-RegexOnce `
    $story.Text `
    'async\s+function\s+scanMainStory\s*\(' `
    'async function scanMainStoryUncached(' `
    "rename Main Story scanner"

$story.Text =
  Replace-RegexOnce `
    $story.Text `
    'export\s*\{\s*scanMainStory\s*,?\s*\}\s*$' `
    @'
export async function scanMainStory(
  libraryRoot: string
): Promise<MainStoryBranch[]> {

  const key =
    [
      'main-story',
      path.resolve(
        libraryRoot
      ),
    ].join(
      ':'
    )


  return cachedLibraryScan(
    key,
    () =>
      scanMainStoryUncached(
        libraryRoot
      )
  )

}
'@ `
    "Main Story cached export"

# ================================================================
# memoryMetadata.ts
# Invalidate whenever sidecar metadata changes.
# ================================================================

$metadata =
  $files[
    "backend\src\metadata\memoryMetadata.ts"
  ]

if (
  $metadata.Text.Contains(
    "invalidateLibraryScanCache"
  )
) {
  throw "memoryMetadata.ts already contains cache invalidation."
}

$metadata.Text =
  Insert-BeforeLiteralOnce `
    $metadata.Text `
    "export type ArchiveMetadata" `
    @'
import {
  invalidateLibraryScanCache,
} from '../services/libraryScanCache'


'@ `
    "metadata cache import"

$metadata.Text =
  Replace-LiteralOnce `
    $metadata.Text `
    @'
  return metadataPath
'@ `
    @'
  invalidateLibraryScanCache()


  return metadataPath
'@ `
    "metadata cache invalidation"

# ================================================================
# server.ts
# Add cache controls.
# ================================================================

$server =
  $files[
    "backend\src\server.ts"
  ]

if (
  $server.Text.Contains(
    "/api/library/cache/status"
  )
) {
  throw "server.ts already contains the library cache routes."
}

$server.Text =
  Insert-BeforeLiteralOnce `
    $server.Text `
    "dotenv.config()" `
    @'
import {
  getLibraryScanCacheStatus,
  invalidateLibraryScanCache,
} from './services/libraryScanCache'


'@ `
    "server cache import"

$characterMarker =
  $server.Text.IndexOf(
    "* CHARACTER REGISTRY"
  )

if ($characterMarker -lt 0) {
  throw "Could not find CHARACTER REGISTRY section in server.ts."
}

$commentStart =
  $server.Text.LastIndexOf(
    "/*",
    $characterMarker
  )

if ($commentStart -lt 0) {
  throw "Could not find the Character Registry comment start."
}

$cacheRoutes = @'
app.get(
  '/api/library/cache/status',
  (_request, response) => {

    response.json(
      getLibraryScanCacheStatus()
    )

  }
)


app.post(
  '/api/library/cache/invalidate',
  (_request, response) => {

    const clearedEntries =
      invalidateLibraryScanCache()


    response.json({
      success: true,
      clearedEntries,
      ...getLibraryScanCacheStatus(),
    })

  }
)


'@

$server.Text =
  $server.Text.Substring(
    0,
    $commentStart
  ) +
  $cacheRoutes +
  $server.Text.Substring(
    $commentStart
  )

# ================================================================
# LibraryStatusPage.tsx
# A user-requested Rescan bypasses the cache.
# ================================================================

$status =
  $files[
    "frontend\src\pages\LibraryStatusPage.tsx"
  ]

if (
  $status.Text.Contains(
    "Unable to clear the library scan cache."
  )
) {
  throw "LibraryStatusPage.tsx already contains cache invalidation."
}

$status.Text =
  Replace-RegexOnce `
    $status.Text `
    '(\s*)const\s+data\s*=\s*await\s+fetchLibraryStatus\(\)' `
    @'
          if (
            refresh
          ) {

            const invalidateResponse =
              await fetch(
                '/api/library/cache/invalidate',
                {
                  method:
                    'POST',
                }
              )


            if (
              !invalidateResponse.ok
            ) {

              throw new Error(
                'Unable to clear the library scan cache.'
              )

            }

          }


          const data =
            await fetchLibraryStatus()
'@ `
    "Library Status cache invalidation"

# ================================================================
# ArchiveCompletenessPage.tsx
# A user-requested Rescan bypasses the cache.
# ================================================================

$complete =
  $files[
    "frontend\src\pages\ArchiveCompletenessPage.tsx"
  ]

if (
  $complete.Text.Contains(
    "Unable to clear the archive scan cache."
  )
) {
  throw "ArchiveCompletenessPage.tsx already contains cache invalidation."
}

$complete.Text =
  Replace-RegexOnce `
    $complete.Text `
    '(\s*)const\s+response\s*=\s*await\s+fetch\(\s*''/api/catalog/completeness''\s*\)' `
    @'
          if (
            refresh
          ) {
            const invalidateResponse =
              await fetch(
                '/api/library/cache/invalidate',
                {
                  method:
                    'POST',
                }
              )

            if (
              !invalidateResponse.ok
            ) {
              throw new Error(
                'Unable to clear the archive scan cache.'
              )
            }
          }


          const response =
            await fetch(
              '/api/catalog/completeness'
            )
'@ `
    "Archive Completeness cache invalidation"

# ================================================================
# VideoArchivePlayer.tsx
# Remember speed and reapply it to each new media resource.
# ================================================================

$player =
  $files[
    "frontend\src\components\VideoArchivePlayer.tsx"
  ]

if (
  $player.Text.Contains(
    "deepspace-archive-playback-speed"
  )
) {
  throw "VideoArchivePlayer.tsx already contains the playback-speed persistence fix."
}

$player.Text =
  Insert-BeforeLiteralOnce `
    $player.Text `
    "const mobileProgressStoragePrefix" `
    @'
const playbackSpeedStorageKey =
  'deepspace-archive-playback-speed'


'@ `
    "playback speed storage key"

$player.Text =
  Insert-BeforeLiteralOnce `
    $player.Text `
    "function VideoArchivePlayer({" `
    @'
function getInitialPlaybackSpeed() {

  try {

    const stored =
      Number(
        localStorage.getItem(
          playbackSpeedStorageKey
        )
      )


    if (
      [
        0.5,
        0.75,
        1,
        1.25,
        1.5,
        1.75,
        2,
      ].includes(
        stored
      )
    ) {

      return stored

    }

  } catch (error) {

    console.error(
      'Unable to read playback speed preference:',
      error
    )

  }


  return 1

}


'@ `
    "playback speed helper"

$player.Text =
  Replace-RegexOnce `
    $player.Text `
    'const\s+\[playbackSpeed,\s*setPlaybackSpeed\]\s*=\s*useState\(\s*1\s*\)' `
    @'
const [playbackSpeed, setPlaybackSpeed] =
    useState(
      getInitialPlaybackSpeed
    )
'@ `
    "playback speed initial state"

$trackingIndex =
  $player.Text.IndexOf(
    "lastProgressSaveRef.current"
  )

if ($trackingIndex -lt 0) {
  throw "Could not find playback tracking effect."
}

$trackingEffectStart =
  $player.Text.LastIndexOf(
    "useEffect",
    $trackingIndex
  )

if ($trackingEffectStart -lt 0) {
  throw "Could not find the playback tracking effect start."
}

$speedEffect = @'
  useEffect(
    () => {

      try {

        localStorage.setItem(
          playbackSpeedStorageKey,
          String(
            playbackSpeed
          )
        )

      } catch (error) {

        console.error(
          'Unable to save playback speed preference:',
          error
        )

      }


      const video =
        videoRef.current


      if (
        video
      ) {

        video.defaultPlaybackRate =
          playbackSpeed

        video.playbackRate =
          playbackSpeed

      }

    },
    [
      playbackSpeed,
    ]
  )


'@

$player.Text =
  $player.Text.Substring(
    0,
    $trackingEffectStart
  ) +
  $speedEffect +
  $player.Text.Substring(
    $trackingEffectStart
  )

$player.Text =
  Replace-RegexOnce `
    $player.Text `
    'onLoadedMetadata\s*=\s*\{\s*restoreProgress\s*\}' `
    @'
onLoadedMetadata={() => {

            const video =
              videoRef.current


            if (
              video
            ) {

              video.defaultPlaybackRate =
                playbackSpeed

              video.playbackRate =
                playbackSpeed

            }


            restoreProgress()

          }}
'@ `
    "reapply speed on newly loaded media"

$player.Text =
  Replace-RegexOnce `
    $player.Text `
    'videoRef\.current\.playbackRate\s*=\s*speed' `
    @'
videoRef.current.defaultPlaybackRate =
                  speed

                videoRef.current.playbackRate =
                  speed
'@ `
    "speed selector default playback rate"

# ================================================================
# App.css
# Replace the Tags text pill with an icon-sized control matching Favorite.
# ================================================================

$css =
  $files[
    "frontend\src\App.css"
  ]

if (
  $css.Text.Contains(
    "CARD TAG ICON CONSISTENCY"
  )
) {
  throw "App.css already contains the card tag icon fix."
}

$tagCss = @'

/* ========================================
   CARD TAG ICON CONSISTENCY
======================================== */

.memory-card-actions .media-tag-edit-button {
  width:
    34px;

  min-width:
    34px;

  height:
    32px;

  min-height:
    32px;

  padding:
    0;

  display:
    inline-grid;

  place-items:
    center;

  border-color:
    rgba(255, 255, 255, 0.3);

  border-radius:
    999px;

  background:
    rgba(15, 16, 24, 0.72);

  backdrop-filter:
    blur(12px);

  font-size:
    0;

  line-height:
    1;
}


.memory-card-actions .media-tag-edit-button::before {
  content:
    '#';

  font-size:
    1rem;

  font-weight:
    500;

  line-height:
    1;
}


.memory-card-actions .media-tag-edit-button:hover {
  background:
    rgba(255, 255, 255, 0.18);
}


@media (hover: none) {

  .memory-card-actions .media-tag-edit-button {
    opacity:
      1;

    transform:
      none;
  }

}
'@

$css.Text =
  $css.Text.TrimEnd() +
  $tagCss +
  "`n"

# ================================================================
# Write ONLY after every transformation above has succeeded.
# ================================================================

$files[
  "backend\src\scanner\libraryScanner.ts"
] = $library

$files[
  "backend\src\scanner\mainStoryScanner.ts"
] = $story

$files[
  "backend\src\metadata\memoryMetadata.ts"
] = $metadata

$files[
  "backend\src\server.ts"
] = $server

$files[
  "frontend\src\pages\LibraryStatusPage.tsx"
] = $status

$files[
  "frontend\src\pages\ArchiveCompletenessPage.tsx"
] = $complete

$files[
  "frontend\src\components\VideoArchivePlayer.tsx"
] = $player

$files[
  "frontend\src\App.css"
] = $css

foreach ($relative in $required) {
  Write-Source $files[$relative]
}

$cacheDir =
  Split-Path -Parent $cachePath

if (
  -not (
    Test-Path $cacheDir
  )
) {
  New-Item `
    -ItemType Directory `
    -Path $cacheDir `
    -Force |
    Out-Null
}

$utf8NoBom =
  New-Object System.Text.UTF8Encoding($false)

[System.IO.File]::WriteAllText(
  $cachePath,
  $cacheSource.Replace(
    "`r`n",
    "`n"
  ),
  $utf8NoBom
)

Write-Host ""
Write-Host "Performance + playback + tag UI changes applied successfully." -ForegroundColor Green
Write-Host ""
Write-Host "Now run:"
Write-Host "  cd backend"
Write-Host "  npm run typecheck"
Write-Host ""
Write-Host "  cd ..\frontend"
Write-Host "  npm run lint"
Write-Host "  npm run build"
