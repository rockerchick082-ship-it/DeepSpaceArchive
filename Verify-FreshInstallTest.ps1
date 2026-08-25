param(
  [string]$TestRoot = ""
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($TestRoot)) {
  $current = (Get-Location).Path

  if (Test-Path (Join-Path $current ".deepspace-release-test")) {
    $TestRoot = $current
  }
  else {
    $TestRoot = Join-Path (Split-Path $current -Parent) "DeepSpaceArchive-ReleaseTest"
  }
}

$TestRoot = [IO.Path]::GetFullPath($TestRoot)

$marker = Join-Path $TestRoot ".deepspace-release-test"

if (-not (Test-Path $marker)) {
  throw "This does not look like the disposable DeepSpace Archive release-test copy: $TestRoot"
}

$backend = Join-Path $TestRoot "backend"
$dataDir = Join-Path $backend "data"

Write-Host ""
Write-Host "DeepSpace Archive fresh-install verification" -ForegroundColor Cyan
Write-Host "Test root: $TestRoot"
Write-Host ""

$checks = @()

function Add-Check {
  param(
    [string]$Name,
    [bool]$Passed,
    [string]$Detail
  )

  $script:checks += [pscustomobject]@{
    Check = $Name
    Result = if ($Passed) { "PASS" } else { "FAIL" }
    Detail = $Detail
  }
}

$setupFile = Join-Path $dataDir "setup-state.json"

Add-Check `
  -Name "Setup marker" `
  -Passed (Test-Path $setupFile) `
  -Detail $setupFile

$appDb = Join-Path $dataDir "deepspace-archive.db"
$catalogDb = Join-Path $dataDir "metadata-catalog.db"

Add-Check `
  -Name "Application database exists" `
  -Passed (Test-Path $appDb) `
  -Detail $appDb

Add-Check `
  -Name "Metadata Catalog database exists" `
  -Passed (Test-Path $catalogDb) `
  -Detail $catalogDb

if ((Test-Path $appDb) -and (Test-Path $catalogDb)) {
  Push-Location $backend

  try {
    # Pipe JavaScript to Node over stdin instead of passing it through
    # `node -e`. This avoids PowerShell/native-command quote mangling.
    $nodeScript = @'
const { DatabaseSync } = require("node:sqlite");

const files = [
  "data/deepspace-archive.db",
  "data/metadata-catalog.db",
];

const result = {};

for (const file of files) {
  const db = new DatabaseSync(file);

  try {
    result[file] =
      db.prepare("PRAGMA user_version")
        .get()
        .user_version;
  }
  finally {
    db.close();
  }
}

console.log(JSON.stringify(result));
'@

    $versionsJson = (
      $nodeScript |
        node - |
        Out-String
    ).Trim()

    if ($LASTEXITCODE -ne 0) {
      throw "Node database schema inspection failed with exit code $LASTEXITCODE."
    }

    if ([string]::IsNullOrWhiteSpace($versionsJson)) {
      throw "Node database schema inspection returned no output."
    }

    $versions =
      $versionsJson |
      ConvertFrom-Json

    $appVersion =
      $versions.'data/deepspace-archive.db'

    $catalogVersion =
      $versions.'data/metadata-catalog.db'

    Add-Check `
      -Name "Application schema version" `
      -Passed ($appVersion -eq 1) `
      -Detail "user_version=$appVersion"

    Add-Check `
      -Name "Catalog schema version" `
      -Passed ($catalogVersion -eq 1) `
      -Detail "user_version=$catalogVersion"
  }
  catch {
    Add-Check `
      -Name "Application schema version" `
      -Passed $false `
      -Detail "Unable to inspect schema: $($_.Exception.Message)"

    Add-Check `
      -Name "Catalog schema version" `
      -Passed $false `
      -Detail "Unable to inspect schema: $($_.Exception.Message)"
  }
  finally {
    Pop-Location
  }
}

$safetyDir = Join-Path $dataDir "safety-backups"
$preMigrationSnapshots = @()

if (Test-Path $safetyDir) {
  $preMigrationSnapshots = @(
    Get-ChildItem `
      -LiteralPath $safetyDir `
      -File `
      -Filter "pre-migration-*.db" `
      -ErrorAction SilentlyContinue
  )
}

Add-Check `
  -Name "No fresh-install migration snapshots" `
  -Passed ($preMigrationSnapshots.Count -eq 0) `
  -Detail "$($preMigrationSnapshots.Count) pre-migration snapshot(s)"

$checks |
  Format-Table -AutoSize

$failed = @(
  $checks |
    Where-Object Result -eq "FAIL"
)

Write-Host ""

if ($failed.Count -eq 0) {
  Write-Host "Fresh-install filesystem/database checks PASSED." -ForegroundColor Green
  exit 0
}

Write-Host "$($failed.Count) check(s) FAILED." -ForegroundColor Red
exit 1