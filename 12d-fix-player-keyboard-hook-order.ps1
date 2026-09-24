$ErrorActionPreference = "Stop"

$root = Get-Location
$relative =
  "frontend\src\components\VideoArchivePlayer.tsx"

$path =
  Join-Path $root $relative

if (
  -not (
    Test-Path $path
  )
) {
  throw "Run this from the DeepSpaceArchive repository root. Missing: $relative"
}

$raw =
  [System.IO.File]::ReadAllText(
    $path
  )

$newline =
  if (
    $raw.Contains(
      "`r`n"
    )
  ) {
    "`r`n"
  } else {
    "`n"
  }

$text =
  $raw.Replace(
    "`r`n",
    "`n"
  )


if (
  $text.Contains(
    "keyboardHookMovedAboveEarlyReturn"
  )
) {
  throw "Keyboard hook-order fix already appears to be applied."
}


# ================================================================
# Locate the existing Layer-12 keyboard hook.
# ================================================================

$handlerIndex =
  $text.IndexOf(
    "function handleKeyboard"
  )

if (
  $handlerIndex -lt
    0
) {
  throw "Could not find function handleKeyboard."
}


$hookStart =
  $text.LastIndexOf(
    "useEffect(",
    $handlerIndex
  )

if (
  $hookStart -lt
    0
) {
  throw "Could not find the useEffect containing handleKeyboard."
}


$mediaQueryIndex =
  $text.IndexOf(
    "  const mediaQuery =",
    $handlerIndex
  )

if (
  $mediaQueryIndex -lt
    0
) {
  throw "Could not find const mediaQuery after the keyboard hook."
}


$hookBlock =
  $text.Substring(
    $hookStart,
    $mediaQueryIndex -
      $hookStart
  )


if (
  -not $hookBlock.Contains(
    "function handleKeyboard"
  )
) {
  throw "Located block did not contain handleKeyboard."
}


if (
  -not $hookBlock.Contains(
    "window.addEventListener("
  )
) {
  throw "Located keyboard block did not contain the keydown listener."
}


# ================================================================
# Add a runtime guard only.
#
# Do NOT alter the existing dependency array. This avoids relying
# on any formatting of that array and preserves the code that
# already built successfully.
# ================================================================

$handlerBodyMarker = @'
      function handleKeyboard(
        event:
          KeyboardEvent
      ) {
'@


$handlerBodyIndex =
  $hookBlock.IndexOf(
    $handlerBodyMarker
  )


if (
  $handlerBodyIndex -lt
    0
) {

  # Fallback for slightly different whitespace.
  $eventMarker =
    "function handleKeyboard"

  $eventIndex =
    $hookBlock.IndexOf(
      $eventMarker
    )

  if (
    $eventIndex -lt
      0
  ) {
    throw "Could not find keyboard handler body."
  }


  $openBraceIndex =
    $hookBlock.IndexOf(
      "{",
      $eventIndex
    )

  if (
    $openBraceIndex -lt
      0
  ) {
    throw "Could not find opening brace for handleKeyboard."
  }


  $insertAt =
    $openBraceIndex +
    1

} else {

  $insertAt =
    $handlerBodyIndex +
    $handlerBodyMarker.Length

}


$guard = @'

        if (
          loading ||
          error ||
          !item ||
          !relativePath
        ) {

          return

        }
'@


$hookBlock =
  $hookBlock.Substring(
    0,
    $insertAt
  ) +
  $guard +
  $hookBlock.Substring(
    $insertAt
  )


# ================================================================
# Remove the hook from below the early returns.
# ================================================================

$text =
  $text.Substring(
    0,
    $hookStart
  ) +
  $text.Substring(
    $mediaQueryIndex
  )


# ================================================================
# Find the first loading early return structurally.
# ================================================================

$loadingRegex =
  [regex]::new(
    '(?m)^[ \t]*if[ \t]*\([ \t]*loading[ \t]*\)[ \t]*\{'
  )


$loadingMatches =
  $loadingRegex.Matches(
    $text
  )


if (
  $loadingMatches.Count -lt
    1
) {
  throw "Could not find the loading early return."
}


$loadingIndex =
  $loadingMatches[0].Index


# ================================================================
# Insert the unchanged hook, plus guard, above the early return.
# ================================================================

$marker = @'
  // keyboardHookMovedAboveEarlyReturn
'@


$text =
  $text.Substring(
    0,
    $loadingIndex
  ) +
  $marker +
  "`n" +
  $hookBlock.Trim() +
  "`n`n`n" +
  $text.Substring(
    $loadingIndex
  )


# ================================================================
# Sanity checks before writing.
# ================================================================

$handlerCount =
  (
    [regex]::Matches(
      $text,
      "function handleKeyboard"
    )
  ).Count


if (
  $handlerCount -ne
    1
) {
  throw "Expected exactly one handleKeyboard after transformation, found $handlerCount."
}


$markerIndex =
  $text.IndexOf(
    "keyboardHookMovedAboveEarlyReturn"
  )


$loadingAfter =
  $loadingRegex.Match(
    $text
  )


if (
  -not $loadingAfter.Success
) {
  throw "Loading early return disappeared during transformation."
}


if (
  $markerIndex -lt
    0 -or
  $markerIndex -gt
    $loadingAfter.Index
) {
  throw "Keyboard hook is still below the loading early return."
}


if (
  -not $text.Contains(
    "loading ||"
  ) -or
  -not $text.Contains(
    "!item ||"
  )
) {
  throw "Keyboard loading guard was not inserted."
}


# ================================================================
# Write only after every check succeeds.
# ================================================================

$output =
  if (
    $newline -eq
      "`r`n"
  ) {
    $text.Replace(
      "`n",
      "`r`n"
    )
  } else {
    $text
  }


$utf8 =
  New-Object System.Text.UTF8Encoding(
    $false
  )


[System.IO.File]::WriteAllText(
  $path,
  $output,
  $utf8
)


Write-Host ""
Write-Host "Keyboard hook-order fix applied." -ForegroundColor Green
Write-Host ""
Write-Host "The existing keyboard effect was moved above the early returns."
Write-Host "Its original dependency array was left untouched."
Write-Host ""
Write-Host "Run:"
Write-Host "  cd frontend"
Write-Host "  npm run lint"
Write-Host "  npm run build"
