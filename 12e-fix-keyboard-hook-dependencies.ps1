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


$markerIndex =
  $text.IndexOf(
    "keyboardHookMovedAboveEarlyReturn"
  )

if (
  $markerIndex -lt
    0
) {
  throw "Could not find the moved keyboard hook marker."
}


$handlerIndex =
  $text.IndexOf(
    "function handleKeyboard",
    $markerIndex
  )

if (
  $handlerIndex -lt
    0
) {
  throw "Could not find function handleKeyboard after the marker."
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
  throw "Could not find the end boundary of the keyboard hook."
}


$hookBlock =
  $text.Substring(
    $markerIndex,
    $mediaQueryIndex -
      $markerIndex
  )


if (
  $hookBlock.Contains(
    "      error,`n      item,`n      loading,"
  )
) {
  throw "Keyboard hook dependencies already appear to be fixed."
}


$dependencyPattern =
  '(?ms)(\],\s*\n\s*\[\s*)(playbackSpeed,\s*\n\s*relativePath,\s*\n\s*upNext\.length,\s*)(\]\s*\n\s*\))'


$regex =
  [regex]::new(
    $dependencyPattern,
    [System.Text.RegularExpressions.RegexOptions]::Singleline -bor
    [System.Text.RegularExpressions.RegexOptions]::Multiline
  )


$matches =
  $regex.Matches(
    $hookBlock
  )


if (
  $matches.Count -ne
    1
) {
  throw "Expected exactly one keyboard dependency array, found $($matches.Count)."
}


$replacement = @'
],
    [
      error,
      item,
      loading,
      playbackSpeed,
      relativePath,
      upNext.length,
    ]
  )
'@


$hookBlock =
  $regex.Replace(
    $hookBlock,
    $replacement
  )


$text =
  $text.Substring(
    0,
    $markerIndex
  ) +
  $hookBlock +
  $text.Substring(
    $mediaQueryIndex
  )


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
Write-Host "Keyboard hook dependency warning fixed." -ForegroundColor Green
Write-Host ""
Write-Host "Run:"
Write-Host "  cd frontend"
Write-Host "  npm run lint"
