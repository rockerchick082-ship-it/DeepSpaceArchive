$ErrorActionPreference = "Stop"

$path = Join-Path (Get-Location) "frontend\src\pages\MetadataCatalogPage.tsx"

if (-not (Test-Path $path)) {
    throw "Run this from the DeepSpaceArchive repository root. File not found: $path"
}

$content = [System.IO.File]::ReadAllText($path)

$pattern = '(?s)useEffect\s*\(\s*\(\)\s*=>\s*\{\s*if\s*\(\s*wikiSyncCharactersLoading\s*\|\|\s*wikiSyncCharacters\.length\s*===\s*0\s*\)\s*\{\s*return\s*\}\s*setWikiCharacter\s*\(\s*\(current\)\s*=>.*?\)\s*\}\s*,\s*\[\s*wikiSyncCharacters\s*,\s*wikiSyncCharactersLoading\s*,?\s*\]\s*\)'

$matches = [regex]::Matches($content, $pattern)

if ($matches.Count -ne 1) {
    Write-Host ""
    Write-Host "Expected exactly 1 matching effect, but found $($matches.Count)." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Context around wikiSyncCharactersLoading:" -ForegroundColor Cyan
    Write-Host ""

    $marker = "wikiSyncCharactersLoading"
    $idx = $content.IndexOf($marker)

    if ($idx -ge 0) {
        $start = [Math]::Max(0, $idx - 900)
        $length = [Math]::Min(2200, $content.Length - $start)
        Write-Host $content.Substring($start, $length)
    }

    throw "Could not safely identify the wiki character fallback effect."
}

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

$updated = [regex]::Replace(
    $content,
    $pattern,
    $newBlock,
    1
)

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText(
    $path,
    $updated,
    $utf8NoBom
)

Write-Host ""
Write-Host "Updated MetadataCatalogPage.tsx successfully." -ForegroundColor Green
Write-Host ""
Write-Host "Run:"
Write-Host "  cd frontend"
Write-Host "  npm run lint"
