# DeepSpace Archive — Windows Source Launcher

## Files
- Start-DeepSpaceArchive.bat
- Start-DeepSpaceArchive.ps1

Put BOTH files in the root of the DeepSpaceArchive repository, beside:
- backend/
- frontend/
- compose.yaml

## Source-install experience

1. Download or clone DeepSpace Archive v1.0.0 (or the branch you want to test).
2. Install Node.js.
3. Double-click Start-DeepSpaceArchive.bat.
4. On first run it installs backend/frontend npm dependencies.
5. It starts both development servers.
6. It waits for the backend and frontend to become available.
7. It opens `http://127.0.0.1:5173` automatically.
8. The user completes the normal DeepSpace Archive frontend setup wizard.
9. Leave the launcher window open while using the source version.
10. Press `Ctrl+C` to stop both processes.

## Notes
- This is intended for Windows source installs.
- The packaged Windows installer or Docker is recommended for normal v1.0.0 use.
- This launcher is specifically for users who want to run DeepSpace Archive from source.
- The launcher does not require VS Code.
- Environment/media configuration should remain in the application's existing setup wizard rather than being hardcoded into this script.