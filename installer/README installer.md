# Bundled-runtime Windows installer

This version removes the Node.js/npm prerequisite for normal Windows users.

## User experience

1. Download `DeepSpaceArchive-Setup-<version>.exe`.
2. Run the installer.
3. Launch DeepSpace Archive from the Start Menu or desktop.
4. The bundled private Node.js runtime starts the backend and frontend.
5. The browser opens automatically.
6. Complete the normal DeepSpace Archive setup wizard.

Users do not need:
- VS Code
- Git
- Node.js
- npm
- Docker
- PowerShell knowledge

PowerShell itself is used internally by the launcher and is included with supported Windows versions.

## Repository files

Replace/add:

- `Start-DeepSpaceArchive.bat`
- `Start-DeepSpaceArchive.ps1`
- `installer/DeepSpaceArchive.iss`
- `.github/workflows/windows-installer.yml`

## How the build works

GitHub Actions:
- checks out the repository
- installs Node 26
- runs backend typecheck/build
- runs frontend lint/build
- stages backend/frontend including their installed node_modules
- copies the exact Node runtime used on the runner
- excludes databases, media, caches, and `.env`
- compiles a Windows installer with Inno Setup
- attaches the EXE to a published GitHub Release

## Important next polish items

Before calling the Windows installer production-ready:
- add an application icon (`.ico`)
- add installer upgrade testing over an existing install
- decide whether app data should live under `%LOCALAPPDATA%\DeepSpaceArchive\data`
  rather than inside the installation directory
- add Windows version/update display inside the app
- eventually replace Vite dev serving with a production static server for a smaller package
