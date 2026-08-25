param(
    [string]$DestinationName = "DeepSpaceArchive-ReleaseTest"
)

$ErrorActionPreference = "Stop"

$sourceRoot = (Get-Location).Path

if (
    -not (Test-Path (Join-Path $sourceRoot "backend\package.json")) -or
    -not (Test-Path (Join-Path $sourceRoot "frontend\package.json"))
) {
    throw "Run this script from the DeepSpaceArchive project root."
}

$parent = Split-Path $sourceRoot -Parent
$destination = Join-Path $parent $DestinationName

if (Test-Path $destination) {
    $existingItems = @(Get-ChildItem -LiteralPath $destination -Force -ErrorAction SilentlyContinue)

    if ($existingItems.Count -eq 0) {
        Write-Host "Removing empty partial test directory from the failed run:" -ForegroundColor Yellow
        Write-Host "  $destination"
        Remove-Item -LiteralPath $destination -Force
    }
    else {
        throw "Destination already exists and is not empty: $destination`nDelete only the disposable test folder manually, or run this script with a different -DestinationName."
    }
}

Write-Host ""
Write-Host "Creating disposable fresh-install copy..." -ForegroundColor Cyan
Write-Host "Source:      $sourceRoot"
Write-Host "Destination: $destination"
Write-Host ""

$excludeDirectories = @(
    (Join-Path $sourceRoot ".git"),
    (Join-Path $sourceRoot ".vscode"),
    (Join-Path $sourceRoot "node_modules"),
    (Join-Path $sourceRoot "backend\node_modules"),
    (Join-Path $sourceRoot "frontend\node_modules"),
    (Join-Path $sourceRoot "backend\dist"),
    (Join-Path $sourceRoot "frontend\dist"),
    (Join-Path $sourceRoot "backend\data"),
    (Join-Path $sourceRoot "backend\cache"),
    (Join-Path $sourceRoot "docker-data"),
    (Join-Path $sourceRoot "docker-cache")
)

$robocopyArguments = @(
    $sourceRoot,
    $destination,
    "/E",
    "/COPY:DAT",
    "/DCOPY:T",
    "/R:1",
    "/W:1",
    "/NFL",
    "/NDL",
    "/NJH",
    "/NJS",
    "/NP",
    "/XD"
)

$robocopyArguments += $excludeDirectories

$robocopyArguments += @(
    "/XF",
    ".env",
    ".env.docker",
    "*.log"
)

& robocopy @robocopyArguments

$robocopyExitCode = $LASTEXITCODE

if ($robocopyExitCode -ge 8) {
    throw "Robocopy failed with exit code $robocopyExitCode."
}

$marker = Join-Path $destination ".deepspace-release-test"

@"
DeepSpace Archive disposable release-test copy.
Created: $(Get-Date -Format o)
Source: $sourceRoot
"@ | Set-Content -LiteralPath $marker -Encoding UTF8

Write-Host ""
Write-Host "Disposable test copy created successfully." -ForegroundColor Green
Write-Host ""
Write-Host "Intentionally NOT copied:" -ForegroundColor Yellow
Write-Host "  .git / .vscode"
Write-Host "  node_modules"
Write-Host "  dist"
Write-Host "  backend/data"
Write-Host "  backend/cache"
Write-Host "  backend/.env"
Write-Host "  root/frontend .env files"
Write-Host "  .env.docker"
Write-Host "  docker-data / docker-cache"
Write-Host "  *.log"
Write-Host ""
Write-Host "Fresh-install test location:" -ForegroundColor Cyan
Write-Host "  $destination"
Write-Host ""
Write-Host "Next:"
Write-Host "  cd `"$destination\backend`""
Write-Host "  npm ci"
Write-Host "  npm run build"
