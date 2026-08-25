# DeepSpace Archive

DeepSpace Archive is a self-hosted personal media archive for organizing, preserving, browsing, and watching **Love and Deepspace** content that you provide from your own local media library.

It is designed for local Windows development as well as Docker/NAS deployments, with a web-based interface for library browsing, metadata management, playlists, watch history, backups, and archive maintenance.

> **Unofficial fan project:** DeepSpace Archive is not affiliated with, endorsed by, sponsored by, or associated with the creators or publishers of Love and Deepspace. The application does not include or distribute Love and Deepspace media. Users provide and manage their own local archive files.

---

## Features

### Archive Library

DeepSpace Archive can organize and browse multiple Love and Deepspace archive categories, including:

- Main Story
- Memoria
- Secret Times
- Tender Moments
- Myths
- Bond
- Phone Calls
- Phone Videos
- Illusio
- Gallery

The application scans your own media library and presents it through a consistent web interface.

### Playback & Personal Library

- Video and audio playback
- Continue Watching
- Watch History
- Favorites
- Half-star ratings
- Completed play tracking
- Lifetime watch time
- Playback progress
- Auto-play next
- Playlists
- Drag-and-drop playlist ordering
- Playlist playback context
- Category and character filtering

### Metadata Catalog

The Metadata Catalog provides a canonical reference layer separate from your local media files.

Features include:

- Character filtering
- Category filtering
- Rarity filtering
- File-status filtering
- Search
- Wiki metadata synchronization
- Automatic file matching
- Manual matching
- Bulk overrides
- Match confidence and review
- Linked Memory relationships
- Catalog artwork
- Release dates
- Memory descriptions
- Metadata health reporting

### Gallery

The Gallery stores local artwork separately from the playable archive.

Gallery features include:

- Character folders
- Memory artwork
- Configurable wiki source pages
- Test Source
- Sync Images
- Sync All
- Restore Default Sources
- Persistent sync history
- Default/custom source labels

### Artwork Priority

When displaying archive artwork, DeepSpace Archive prefers:

1. Custom local thumbnail
2. Metadata Catalog artwork
3. Generated video frame

Phone Calls and Phone Videos can use log-style placeholders when artwork is not available.

### Settings & Maintenance

Settings currently include:

- Library Status
- File Locations
- Metadata Catalog
- Metadata Health
- Gallery Wiki Sources
- Thumbnails & Cache
- Backup & Restore
- Database Maintenance
- About DeepSpace Archive

---

## Requirements

For local development:

- Node.js
- npm
- Git
- FFmpeg for full thumbnail-generation and media-inspection functionality

Exact JavaScript package versions are defined by the `package.json` files in `frontend` and `backend`.

For Docker/NAS use:

- Docker or Docker Compose
- A mounted parent media directory that contains your Love and Deepspace archive

---

## Project Structure

```text
DeepSpaceArchive/
├─ backend/
│  ├─ src/
│  └─ package.json
│
├─ frontend/
│  ├─ src/
│  └─ package.json
│
├─ installer/
├─ .github/
│  └─ workflows/
├─ compose.yaml
├─ LICENSE
└─ README.md
```

Application data is intentionally kept separate from your media library.

Your media files remain in the folder you select.

---

# Windows Installer

Normal Windows users can install DeepSpace Archive from the `.exe` attached to each GitHub Release.

Example:

```text
DeepSpaceArchive-Setup-1.0.0.exe
```

The installer:

- includes its own private Node.js runtime
- uses compiled production backend/frontend builds
- does not require VS Code, npm, Git, or Docker
- opens the application in the default browser
- keeps user databases/settings under `%LOCALAPPDATA%\DeepSpaceArchive`
- supports installing newer versions over the existing installation without replacing user data

After installation, launch **DeepSpace Archive** from the Start Menu or desktop shortcut.

The installed application normally opens:

```text
http://localhost:3001
```

---

# Development from Source

## 1. Clone the Repository

```powershell
git clone https://github.com/rockerchick082-ship-it/DeepSpaceArchive.git
cd DeepSpaceArchive
```

## 2. Install Backend Dependencies

```powershell
cd backend
npm install
```

## 3. Install Frontend Dependencies

Open another terminal:

```powershell
cd frontend
npm install
```

## 4. Start the Backend

```powershell
cd backend
npm run dev
```

The backend normally runs on:

```text
http://localhost:3001
```

## 5. Start the Frontend

In another terminal:

```powershell
cd frontend
npm run dev
```

Open the local URL shown by Vite in your browser.

---

# First Library Setup

DeepSpace Archive is designed so that normal users do **not** need to edit environment files just to select their media archive.

After starting the application:

1. Open **Settings**
2. Open **File Locations**
3. Select **Browse Folders**
4. Choose the root of your Love and Deepspace archive
5. Select **Use This Folder**
6. Select **Save, Activate & Verify**
7. Open **Library Status** to confirm the archive is detected

Example Windows library location:

```text
Z:\All LADS Content Archive
```

Example Docker library location:

```text
/media/All LADS Content Archive
```

Changing to another folder that is already accessible to the backend does not require rebuilding the application.

---

# Suggested Media Library Layout

Your exact archive can vary, but a typical structure may look similar to:

```text
All LADS Content Archive/
├─ home/
│  ├─ Xavier/
│  ├─ Zayne/
│  ├─ Rafayel/
│  ├─ Sylus/
│  └─ Caleb/
├─ Main Story/
├─ Memoria/
│  ├─ 1. Xavier/
│  ├─ 2. Zayne/
│  ├─ 3. Rafayel/
│  ├─ 4. Sylus/
│  └─ 5. Caleb/
├─ Secret Times/
├─ Tender Moments/
├─ Myths/
├─ Bond/
├─ Phone Call/
├─ Phone Video/
├─ Illusio Kindle/
└─ Gallery/
```

DeepSpace Archive uses relative media paths internally wherever possible so archive data can remain portable when the underlying Windows, Docker, or NAS mount path changes.

## Home Screen Media

The Home screen reads its character artwork and video backgrounds directly from the media library:

```text
All LADS Content Archive/
└─ home/
   ├─ Xavier/
   ├─ Zayne/
   ├─ Rafayel/
   ├─ Sylus/
   └─ Caleb/
```

Each character folder may contain any number of supported images or browser-playable videos. Files are discovered dynamically, so Home media can be added or removed without rebuilding the application.

Home media is displayed in natural filename order. Prefix filenames with numbers such as `01`, `02`, and `03` when you want to control the sequence explicitly.

---

# Docker / NAS Deployment

For normal Docker/NAS users, DeepSpace Archive uses the published Docker Hub images:

```text
music8704/deepspace-archive-backend
music8704/deepspace-archive-frontend
```

GitHub Container Registry mirrors are also published, but Docker Hub is the default installation path in the public Compose file.

## Quick Start

Download these two files from the repository:

```text
compose.release.yaml
.env.release.example
```

Place them together in an empty folder.

Copy the example environment file to `.env`:

### Linux / NAS

```bash
cp .env.release.example .env
```

### Windows PowerShell

```powershell
Copy-Item .env.release.example .env
```

Open `.env` and change:

```text
DSA_MEDIA_PATH=/path/to/All LADS Content Archive
```

to the real host path containing your archive.

For the current beta release, keep:

```text
DSA_VERSION=1.0.0
```

Start DeepSpace Archive:

```bash
docker compose -f compose.release.yaml pull
docker compose -f compose.release.yaml up -d
```

Then open:

```text
http://<server-ip>:8081
```

For a local Docker Desktop installation, this is normally:

```text
http://localhost:8081
```

The backend healthcheck may take several seconds before the frontend starts.

## Synology NAS Example

Create a folder such as:

```text
/volume1/docker/deepspace-archive
```

Place these files inside it:

```text
compose.release.yaml
.env
```

Example `.env`:

```text
DSA_MEDIA_PATH=/volume1/Media Files/All LADS Content Archive
DSA_DATA_PATH=./docker-data
DSA_CACHE_PATH=./docker-cache
DSA_WEB_PORT=8081
DSA_BACKEND_PORT=3001
DSA_VERSION=1.0.0
```

From an SSH session:

```bash
cd "/volume1/docker/deepspace-archive"
sudo docker compose -f compose.release.yaml pull
sudo docker compose -f compose.release.yaml up -d
sudo docker compose -f compose.release.yaml ps
```

When both services are running, open:

```text
http://<NAS-IP>:8081
```

### Synology Container Manager

The same `compose.release.yaml` can be used as a Container Manager project.

Create/import a project using the folder that contains:

```text
compose.release.yaml
.env
```

The project creates two containers:

```text
deepspace-archive-backend
deepspace-archive-frontend
```

Application databases/settings are stored under the configured `DSA_DATA_PATH`.
Generated cache is stored under `DSA_CACHE_PATH`.
Your media remains in the folder configured by `DSA_MEDIA_PATH`.

## Updating Docker

DeepSpace Archive Docker releases are immutable version tags.

For example:

```text
1.0.0
```

To move to a newer version:

1. Change `DSA_VERSION` in `.env`.
2. Pull the new images.
3. Recreate the containers.

```bash
docker compose -f compose.release.yaml pull
docker compose -f compose.release.yaml up -d
```

Your application databases/settings and media are mounted outside the image and remain in place during updates.

Users who want the normal stable update channel can set:

```text
DSA_VERSION=latest
```

The `latest` tag tracks stable releases. The normal update command is:

```bash
docker compose -f compose.release.yaml pull
docker compose -f compose.release.yaml up -d
```

## Stopping

```bash
docker compose -f compose.release.yaml down
```

This removes the containers/network but does not delete the bind-mounted data/cache/media folders.

## Checking Status

```bash
docker compose -f compose.release.yaml ps
```

Backend health endpoint:

```text
http://<server-ip>:3001/api/health
```

## Published Images

Docker Hub:

```text
music8704/deepspace-archive-backend
music8704/deepspace-archive-frontend
```

GitHub Container Registry mirrors:

```text
ghcr.io/rockerchick082-ship-it/deepspace-archive-backend
ghcr.io/rockerchick082-ship-it/deepspace-archive-frontend
```

Manual CI builds use the `edge` tag. `edge` is intended for testing and should not be the default for normal users.

Stable releases, including v1.0.0, update `latest`. Pre-releases receive version-specific tags without changing `latest`.

## Media Path Behavior

Docker mounts the host archive at:

```text
/media
```

The public Docker deployment intentionally locks that container-side path.

To point DeepSpace Archive at another host folder, change:

```text
DSA_MEDIA_PATH
```

in `.env`, then recreate the containers.

## Optional Browse Restriction

Deployments may explicitly restrict the web folder browser to approved roots with:

```text
MEDIA_LIBRARY_BROWSE_ROOTS=/media
```

This variable is optional and is not required by the standard Compose file.

---

# Metadata & Wiki Synchronization

DeepSpace Archive can synchronize reference metadata and artwork from configured wiki sources.

The Metadata Catalog is separate from your actual media files.

This allows the application to:

- know that a Memory exists even when you do not currently have its media file
- connect local files to canonical records
- show catalog artwork
- store release information
- identify missing content
- link related archive records
- improve browsing and matching

Wiki synchronization is rate-limited and designed to avoid unnecessarily aggressive requests.

Gallery wiki sources can be customized from:

```text
Settings → Gallery Wiki Sources
```

---

# Sidecar Metadata

DeepSpace Archive supports optional metadata sidecar files stored beside media.

Example:

```text
Before Sunrise.mp4
Before Sunrise.json
Before Sunrise.thumbnail.jpg
```

Sidecars and custom thumbnails remain part of your media archive.

Missing sidecars or custom artwork are treated as optional coverage gaps rather than automatically being considered broken media.

---

# Backups

Open:

```text
Settings → Backup & Restore
```

## Full Portable Backup

The recommended backup is the **Full Portable Backup**.

Full Backup Format V2 protects:

- Favorites
- Ratings
- Playback progress
- Watch history
- Lifetime play totals
- Playlists
- Playlist order
- Metadata Catalog records
- Catalog file matches
- Archive-to-Memory relationships
- Sidecar metadata
- Custom thumbnails
- Emergency SQLite copies

Your actual media files are **not** copied into the backup.

## Lightweight State Backup

A smaller JSON export is also available for:

- Watch state
- Favorites
- Ratings
- Watch history
- Playback totals
- Playlists

This lightweight export does not include the full Metadata Catalog, sidecars, or custom artwork.

## Restore

Full backups can be analyzed before restoration.

Restore currently uses a conservative **merge** strategy designed to preserve current data where possible.

Before database changes, DeepSpace Archive creates SQLite safety snapshots.

---

# Database Maintenance

Open:

```text
Settings → Database Maintenance
```

Available tools include:

- SQLite integrity check
- Database status
- State record counts
- Orphaned-state reporting
- Safety snapshots
- Snapshot download
- SQLite optimization
- Database compaction

Optimization automatically creates a safety snapshot first.

DeepSpace Archive does not automatically delete orphaned state records.

---

# Thumbnails & Cache

Generated video thumbnails are disposable cache files.

Custom artwork is part of your archive and is not removed when the generated cache is cleared.

Open:

```text
Settings → Thumbnails & Cache
```

to inspect or clear generated thumbnails.

---

# Application Data

DeepSpace Archive currently uses SQLite databases for application state and metadata.

Depending on the installation method, application state is stored outside your media library.

Typical source/development paths:

```text
backend/data/deepspace-archive.db
backend/data/metadata-catalog.db
backend/data/safety-backups/
backend/cache/thumbnails/
```

Packaged Windows installation:

```text
%LOCALAPPDATA%\DeepSpaceArchive\data
%LOCALAPPDATA%\DeepSpaceArchive\cache
```

Docker:

```text
/app/data
/app/cache
```

The Docker paths are bind-mounted to the host paths configured by `DSA_DATA_PATH` and `DSA_CACHE_PATH`.

Do not treat these paths as your media library.

Your media archive remains in the library folder configured through **File Locations**.

---

# Privacy

DeepSpace Archive is designed as a self-hosted application.

The **Download Diagnostics** option on the About page intentionally excludes sensitive local information such as:

- Media-library path
- Hostname
- Working directory
- Storage paths
- Media filenames
- Media titles

The resulting diagnostic JSON can be used when reporting bugs without intentionally exposing the structure of your personal media archive.

---

# Development

## Backend

```powershell
cd backend
npm run dev
```

Type check:

```powershell
npm run typecheck
```

Production build:

```powershell
npm run build
```

## Frontend

```powershell
cd frontend
npm run dev
```

Lint:

```powershell
npm run lint
```

Production build:

```powershell
npm run build
```

Before committing a development batch, it is recommended to run:

```powershell
cd backend
npm run build

cd ../frontend
npm run lint
npm run build
```

---

# Reporting Issues

Issues can be reported through the GitHub repository:

https://github.com/rockerchick082-ship-it/DeepSpaceArchive/issues

When useful, attach the privacy-safe diagnostic report available from:

```text
Settings → About DeepSpace Archive → Download Diagnostics
```

Please do not upload copyrighted Love and Deepspace media files as part of a bug report.

---

# Project Status

DeepSpace Archive v1.0.0 is the first public stable release.

Windows and Docker/NAS installation are supported. Development continues, and future releases may add features or migrations while preserving user-managed media and application data wherever possible.

---

# License

DeepSpace Archive is licensed under the **GNU General Public License v3.0 only (GPL-3.0-only)**.

See the [`LICENSE`](LICENSE) file for the complete license text.

In general, GPL-3.0 allows the DeepSpace Archive software to be used, studied, modified, and redistributed under the terms of the license.

The GPL license applies to the **DeepSpace Archive software itself**.

It does **not** grant rights to Love and Deepspace artwork, video, audio, characters, trademarks, names, or other third-party intellectual property.

---

# Third-Party Content

DeepSpace Archive does not include or distribute Love and Deepspace game media.

Users are responsible for the media they add to their own archive and for complying with applicable laws, licenses, platform terms, and intellectual-property rights.

Names and trademarks belonging to third parties remain the property of their respective owners.

---

# Credits

DeepSpace Archive was created as a personal archival and self-hosting project for managing a Love and Deepspace media collection.

The project uses open-source technologies including React, TypeScript, Node.js, Express, SQLite, FFmpeg, and related community packages.
