import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = (path) => readFileSync(join(root, path), 'utf8')

function walk(path) {
  const full = join(root, path)
  return readdirSync(full).flatMap((name) => {
    const next = join(path, name)
    return statSync(join(root, next)).isDirectory()
      ? walk(next)
      : [next]
  })
}

const backup = read('backend/src/state/archiveBackup.ts')
assert.match(backup, /backupVersion:\s*2/)
assert.match(backup, /mediaTags/)
assert.match(backup, /mediaTagAssignments/)
assert.match(backup, /smartPlaylists/)

const restore = read('backend/src/state/archiveRestore.ts')
assert.match(restore, /mediaTags/)
assert.match(restore, /mediaTagAssignments/)
assert.match(restore, /smartPlaylists/)

const maintenance = read('backend/src/routes/databaseMaintenanceRoutes.ts')
assert.match(maintenance, /DELETE FROM media_tag_assignment/)
assert.match(maintenance, /DELETE FROM media_tag/)
assert.match(maintenance, /DELETE FROM smart_playlist/)
assert.match(maintenance, /personal-data\/export/)
assert.match(maintenance, /personal-data\/import/)

const categories = read('backend/src/services/archiveCategories.ts')
const mainStory = categories.match(/(?:key|slug|label|name):\s*['"]main[^\n]*story[^]*?completeness:\s*(true|false)/i)
if (mainStory) {
  assert.equal(mainStory[1], 'false', 'Main Story completeness must remain disabled')
} else {
  assert.match(categories, /Main Story[^]*?completeness:\s*false/i, 'Main Story completeness must remain disabled')
}

const personalData = read('frontend/src/pages/PersonalDataPage.tsx')
assert.match(personalData, /deepspaceArchiveOfflineMutationQueue:v1/)
assert.match(personalData, /Export JSON/)
assert.match(personalData, /Export CSV/)
assert.match(personalData, /Import JSON/)

const app = read('frontend/src/App.tsx')
assert.match(app, /offlineMutationQueueKey/)
assert.match(app, /\/recently-added/)
assert.match(app, /\/settings\/mobile/)

const quickActions = read('frontend/src/components/ArchiveQuickActions.tsx')
assert.match(quickActions, /Play Next/)
assert.match(quickActions, /Add to Queue/)

const manifest = read('../DeepSpaceArchive-Mobile/android/app/src/main/AndroidManifest.xml')
for (const permission of [
  'android.permission.INTERNET',
  'android.permission.WAKE_LOCK',
  'android.permission.FOREGROUND_SERVICE',
]) {
  const escaped = permission.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const count = (manifest.match(new RegExp(`android:name=[\"']${escaped}[\"']`, 'g')) ?? []).length
  assert.equal(count, 1, `${permission} should only be declared once`)
}

const frontendFiles = walk('frontend/src').filter((path) => /\.(?:ts|tsx|css|html)$/.test(path))
for (const path of frontendFiles) {
  const text = read(path)
  assert.ok(!/[âÂ]/.test(text), `Possible mojibake remains in ${path}`)
}

console.log(`Regression audit passed (${frontendFiles.length} frontend source files checked).`)
