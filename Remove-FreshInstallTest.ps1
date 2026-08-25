param(
  [string]$TestRoot = ""
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($TestRoot)) {

  $current =
    (Get-Location).Path

  if (
    Test-Path -LiteralPath (
      Join-Path $current ".deepspace-release-test"
    )
  ) {

    $TestRoot =
      $current

  }
  else {

    $TestRoot =
      Join-Path `
        (Split-Path $current -Parent) `
        "DeepSpaceArchive-ReleaseTest"

  }

}

$TestRoot =
  [IO.Path]::GetFullPath(
    $TestRoot
  )

$marker =
  Join-Path `
    $TestRoot `
    ".deepspace-release-test"


Write-Host ""
Write-Host "DeepSpace Archive release-test cleanup" -ForegroundColor Cyan
Write-Host "Test root: $TestRoot"
Write-Host "Safety marker: $marker"
Write-Host ""


if (
  -not (
    Test-Path -LiteralPath $TestRoot
  )
) {

  Write-Host "Nothing to remove." -ForegroundColor Green
  Write-Host "Release-test folder does not exist."

  exit 0

}


# ---------------------------------------------------------
# HARD FOLDER-NAME SAFETY CHECK
# ---------------------------------------------------------

$folderName =
  Split-Path `
    $TestRoot `
    -Leaf


if (
  $folderName -ne
    "DeepSpaceArchive-ReleaseTest"
) {

  throw "Refusing to delete '$TestRoot'. Expected the folder name to be exactly 'DeepSpaceArchive-ReleaseTest'."

}


# ---------------------------------------------------------
# INSPECT CONTENTS
# ---------------------------------------------------------

$contents = @(
  Get-ChildItem `
    -LiteralPath $TestRoot `
    -Force `
    -ErrorAction SilentlyContinue
)


$markerExists =
  Test-Path `
    -LiteralPath $marker `
    -PathType Leaf


$folderIsEmpty =
  $contents.Count -eq 0


# ---------------------------------------------------------
# SAFETY DECISION
# ---------------------------------------------------------

if (
  -not $markerExists -and
  -not $folderIsEmpty
) {

  Write-Host "REFUSING TO DELETE." -ForegroundColor Red
  Write-Host ""
  Write-Host "The release-test marker is missing and the folder is not empty."
  Write-Host ""
  Write-Host "Expected marker:"
  Write-Host "  $marker"
  Write-Host ""
  Write-Host "Contents currently present:" -ForegroundColor Yellow

  $contents |
    Select-Object `
      Mode,
      LastWriteTime,
      Length,
      Name |
    Format-Table -AutoSize

  throw "Refusing to delete $TestRoot because it is non-empty and the release-test marker is missing."

}


if ($markerExists) {

  Write-Host "Safety marker found." -ForegroundColor Green

}
elseif ($folderIsEmpty) {

  Write-Host "Safety marker is missing, but the release-test folder is empty." -ForegroundColor Yellow
  Write-Host "Empty disposable folder is safe to remove." -ForegroundColor Green

}


Write-Host ""
Write-Host "Deleting ONLY:" -ForegroundColor Yellow
Write-Host "  $TestRoot"
Write-Host ""


Remove-Item `
  -LiteralPath $TestRoot `
  -Recurse `
  -Force


if (
  Test-Path -LiteralPath $TestRoot
) {

  throw "Cleanup finished, but the release-test folder still exists: $TestRoot"

}


Write-Host "Disposable release-test copy removed." -ForegroundColor Green

exit 0