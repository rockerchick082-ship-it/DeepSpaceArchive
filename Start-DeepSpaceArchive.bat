@echo off
setlocal
cd /d "%~dp0"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start-DeepSpaceArchive.ps1"

if errorlevel 1 (
    echo.
    echo DeepSpace Archive failed to start.
    echo.
    pause
)

endlocal
