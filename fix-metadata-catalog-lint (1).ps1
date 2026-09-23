$ErrorActionPreference = "Stop"

$path = Join-Path (Get-Location) "frontend\src\pages\MetadataCatalogPage.tsx"

if (-not (Test-Path $path)) {
    throw "Run this from the DeepSpaceArchive repository root. File not found: $path"
}

$content = [System.IO.File]::ReadAllText($path)

$marker = "wikiSyncCharactersLoading"
$markerIndex = $content.IndexOf($marker)

if ($markerIndex -lt 0) {
    throw "Could not find wikiSyncCharactersLoading in MetadataCatalogPage.tsx."
}

$startMarker = "  useEffect("
$start = $content.LastIndexOf($startMarker, $markerIndex)

if ($start -lt 0) {
    throw "Could not locate the useEffect containing wikiSyncCharactersLoading."
}

$dependencyMarker = "      wikiSyncCharactersLoading,"
$dependencyIndex = $content.IndexOf($dependencyMarker, $markerIndex)

if ($dependencyIndex -lt 0) {
    throw "Could not find the wikiSyncCharactersLoading dependency line."
}

$endMarker = "  )"
$end = $content.IndexOf($endMarker, $dependencyIndex)

if ($end -lt 0) {
    throw "Could not locate the end of the wiki character effect."
}

$end += $endMarker.Length

$newBlock = @'
  useEffect(
    () => {

      if (
        wikiSyncCharactersLoading ||
        wikiSyncCharacters.length ===
          0
      ) {

        return

      }


      const timeoutId =
        window.setTimeout(
          () => {

            setWikiCharacter(
              (current) =>
                current ===
                  'All' ||
                wikiSyncCharacters.includes(
                  current
                )
                  ? current
                  : wikiSyncCharacters[0]
            )

          },
          0
        )


      return () => {

        window.clearTimeout(
          timeoutId
        )

      }

    },
    [
      wikiSyncCharacters,
      wikiSyncCharactersLoading,
    ]
  )
'@

$updated =
    $content.Substring(0, $start) +
    $newBlock +
    $content.Substring($end)

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText(
    $path,
    $updated,
    $utf8NoBom
)

Write-Host "Updated MetadataCatalogPage.tsx successfully."
Write-Host ""
Write-Host "Now run:"
Write-Host "  cd frontend"
Write-Host "  npm run lint"
