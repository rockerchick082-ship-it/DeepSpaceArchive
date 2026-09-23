import {
  randomUUID,
} from 'node:crypto'

import {
  DatabaseSync,
} from 'node:sqlite'

import {
  applicationDatabasePath,
  ensureApplicationDatabaseMigrations,
} from '../services/databaseMigrations'

import type {
  ArchiveInventoryFile,
} from '../services/archiveFileInventory'


ensureApplicationDatabaseMigrations()


const database =
  new DatabaseSync(
    applicationDatabasePath
  )


database.exec(
  'PRAGMA foreign_keys = ON;'
)


export type IntegrityMode =
  | 'quick'
  | 'verify'


type ManifestRow = {
  relative_path: string
  media_type: string
  first_seen_at: string
  last_seen_at: string
  last_seen_scan: string | null
  pending_scan: string | null
  size_bytes: number
  mtime_ms: number
  sha256: string | null
  observed_size_bytes: number
  observed_mtime_ms: number
  observed_sha256: string | null
  verified_at: string | null
  accepted_at: string | null
}


type RunRow = {
  id: number
  scan_token: string
  mode: string
  started_at: string
  completed_at: string | null
  file_count: number
  error: string | null
}


function runFromRow(
  row: RunRow | undefined
) {
  if (!row) {
    return null
  }

  return {
    id: row.id,
    scanToken:
      row.scan_token,
    mode:
      row.mode as IntegrityMode,
    startedAt:
      row.started_at,
    completedAt:
      row.completed_at,
    fileCount:
      Number(row.file_count),
    error:
      row.error,
  }
}


export function beginIntegrityRun(
  mode: IntegrityMode
) {
  const scanToken =
    randomUUID()

  const startedAt =
    new Date().toISOString()

  const result =
    database
      .prepare(`
        INSERT INTO archive_integrity_run (
          scan_token,
          mode,
          started_at,
          file_count
        )
        VALUES (?, ?, ?, 0)
      `)
      .run(
        scanToken,
        mode,
        startedAt
      )

  return {
    id:
      Number(
        result.lastInsertRowid
      ),
    scanToken,
    mode,
    startedAt,
  }
}


export function observeIntegrityFile(
  file: ArchiveInventoryFile,
  scanToken: string
) {
  const now =
    new Date().toISOString()

  database
    .prepare(`
      INSERT INTO archive_file_manifest (
        relative_path,
        media_type,
        first_seen_at,
        last_seen_at,
        pending_scan,
        size_bytes,
        mtime_ms,
        observed_size_bytes,
        observed_mtime_ms
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(relative_path)
      DO UPDATE SET
        media_type = excluded.media_type,
        last_seen_at = excluded.last_seen_at,
        pending_scan = excluded.pending_scan,
        observed_size_bytes = excluded.observed_size_bytes,
        observed_mtime_ms = excluded.observed_mtime_ms,
        observed_sha256 = NULL
    `)
    .run(
      file.relativePath,
      file.mediaType,
      now,
      now,
      scanToken,
      file.sizeBytes,
      file.mtimeMs,
      file.sizeBytes,
      file.mtimeMs
    )
}


export function verifyIntegrityFile(
  file: ArchiveInventoryFile,
  sha256: string,
  scanToken: string
) {
  const now =
    new Date().toISOString()

  const existing =
    database
      .prepare(`
        SELECT *
        FROM archive_file_manifest
        WHERE relative_path = ?
      `)
      .get(
        file.relativePath
      ) as ManifestRow | undefined


  if (!existing) {
    database
      .prepare(`
        INSERT INTO archive_file_manifest (
          relative_path,
          media_type,
          first_seen_at,
          last_seen_at,
          pending_scan,
          size_bytes,
          mtime_ms,
          sha256,
          observed_size_bytes,
          observed_mtime_ms,
          observed_sha256,
          verified_at,
          accepted_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        file.relativePath,
        file.mediaType,
        now,
        now,
        scanToken,
        file.sizeBytes,
        file.mtimeMs,
        sha256,
        file.sizeBytes,
        file.mtimeMs,
        sha256,
        now,
        now
      )
    return
  }


  if (
    !existing.sha256 ||
    existing.sha256 === sha256
  ) {
    database
      .prepare(`
        UPDATE archive_file_manifest
        SET
          media_type = ?,
          last_seen_at = ?,
          pending_scan = ?,
          size_bytes = ?,
          mtime_ms = ?,
          sha256 = ?,
          observed_size_bytes = ?,
          observed_mtime_ms = ?,
          observed_sha256 = ?,
          verified_at = ?,
          accepted_at =
            COALESCE(
              accepted_at,
              ?
            )
        WHERE relative_path = ?
      `)
      .run(
        file.mediaType,
        now,
        scanToken,
        file.sizeBytes,
        file.mtimeMs,
        sha256,
        file.sizeBytes,
        file.mtimeMs,
        sha256,
        now,
        now,
        file.relativePath
      )
    return
  }


  database
    .prepare(`
      UPDATE archive_file_manifest
      SET
        media_type = ?,
        last_seen_at = ?,
        pending_scan = ?,
        observed_size_bytes = ?,
        observed_mtime_ms = ?,
        observed_sha256 = ?,
        verified_at = ?
      WHERE relative_path = ?
    `)
    .run(
      file.mediaType,
      now,
      scanToken,
      file.sizeBytes,
      file.mtimeMs,
      sha256,
      now,
      file.relativePath
    )
}


export function finishIntegrityRun(
  runId: number,
  scanToken: string,
  fileCount: number
) {
  const completedAt =
    new Date().toISOString()

  database.exec(
    'BEGIN IMMEDIATE'
  )

  try {
    database
      .prepare(`
        UPDATE archive_file_manifest
        SET
          last_seen_scan = ?,
          pending_scan = NULL
        WHERE pending_scan = ?
      `)
      .run(
        scanToken,
        scanToken
      )

    database
      .prepare(`
        UPDATE archive_integrity_run
        SET
          completed_at = ?,
          file_count = ?,
          error = NULL
        WHERE id = ?
      `)
      .run(
        completedAt,
        fileCount,
        runId
      )

    database.exec(
      'COMMIT'
    )
  } catch (error) {
    database.exec(
      'ROLLBACK'
    )
    throw error
  }
}


export function failIntegrityRun(
  runId: number,
  scanToken: string,
  errorMessage: string
) {
  database
    .prepare(`
      UPDATE archive_file_manifest
      SET pending_scan = NULL
      WHERE pending_scan = ?
    `)
    .run(
      scanToken
    )

  database
    .prepare(`
      UPDATE archive_integrity_run
      SET error = ?
      WHERE id = ?
    `)
    .run(
      errorMessage,
      runId
    )
}


function latestCompletedRun() {
  const row =
    database
      .prepare(`
        SELECT *
        FROM archive_integrity_run
        WHERE completed_at IS NOT NULL
        ORDER BY id DESC
        LIMIT 1
      `)
      .get() as RunRow | undefined

  return runFromRow(
    row
  )
}


function latestRun() {
  const row =
    database
      .prepare(`
        SELECT *
        FROM archive_integrity_run
        ORDER BY id DESC
        LIMIT 1
      `)
      .get() as RunRow | undefined

  return runFromRow(
    row
  )
}


function rowStatus(
  row: ManifestRow,
  scanToken: string | null
) {
  if (
    !scanToken ||
    row.last_seen_scan !== scanToken
  ) {
    return 'missing' as const
  }

  if (
    row.sha256 &&
    row.observed_sha256 &&
    row.sha256 !==
      row.observed_sha256
  ) {
    return 'hash-changed' as const
  }

  if (!row.sha256) {
    return 'unverified' as const
  }

  if (
    Number(row.size_bytes) !==
      Number(row.observed_size_bytes) ||
    Math.round(
      Number(row.mtime_ms)
    ) !==
      Math.round(
        Number(row.observed_mtime_ms)
      )
  ) {
    return 'modified' as const
  }

  return 'verified' as const
}


export function getArchiveIntegrityReport() {
  const completedRun =
    latestCompletedRun()

  const rows =
    database
      .prepare(`
        SELECT *
        FROM archive_file_manifest
        ORDER BY relative_path COLLATE NOCASE ASC
      `)
      .all() as ManifestRow[]

  const scanToken =
    completedRun?.scanToken ??
    null

  const items =
    rows.map(
      (row) => ({
        relativePath:
          row.relative_path,
        mediaType:
          row.media_type,
        status:
          rowStatus(
            row,
            scanToken
          ),
        sizeBytes:
          Number(
            row.observed_size_bytes
          ),
        baselineSizeBytes:
          Number(
            row.size_bytes
          ),
        mtimeMs:
          Number(
            row.observed_mtime_ms
          ),
        baselineMtimeMs:
          Number(
            row.mtime_ms
          ),
        sha256:
          row.sha256,
        observedSha256:
          row.observed_sha256,
        verifiedAt:
          row.verified_at,
        firstSeenAt:
          row.first_seen_at,
        lastSeenAt:
          row.last_seen_at,
      })
    )

  const currentItems =
    items.filter(
      (item) =>
        item.status !==
          'missing'
    )

  const hashGroups =
    new Map<
      string,
      typeof items
    >()

  for (
    const item
    of currentItems
  ) {
    const effectiveHash =
      item.observedSha256 ??
      (
        item.status === 'verified'
          ? item.sha256
          : null
      )

    if (!effectiveHash) {
      continue
    }

    const group =
      hashGroups.get(
        effectiveHash
      ) ?? []

    group.push(item)
    hashGroups.set(
      effectiveHash,
      group
    )
  }

  const duplicates =
    [...hashGroups.entries()]
      .filter(
        ([, group]) =>
          group.length > 1
      )
      .map(
        ([sha256, group]) => ({
          sha256,
          count:
            group.length,
          sizeBytes:
            group[0]?.sizeBytes ?? 0,
          items:
            group.map(
              (item) =>
                item.relativePath
            ),
        })
      )
      .sort(
        (
          left,
          right
        ) =>
          right.count -
            left.count ||
          right.sizeBytes -
            left.sizeBytes
      )

  const summary = {
    tracked:
      items.length,
    current:
      currentItems.length,
    verified:
      items.filter(
        (item) =>
          item.status === 'verified'
      ).length,
    unverified:
      items.filter(
        (item) =>
          item.status === 'unverified'
      ).length,
    modified:
      items.filter(
        (item) =>
          item.status === 'modified'
      ).length,
    hashChanged:
      items.filter(
        (item) =>
          item.status === 'hash-changed'
      ).length,
    missing:
      items.filter(
        (item) =>
          item.status === 'missing'
      ).length,
    duplicateGroups:
      duplicates.length,
    duplicateFiles:
      duplicates.reduce(
        (
          total,
          group
        ) =>
          total +
          group.count,
        0
      ),
  }

  return {
    latestCompletedRun:
      completedRun,
    latestRun:
      latestRun(),
    summary,
    items,
    duplicates,
  }
}


export function acceptVerifiedIntegrityChanges(
  relativePaths?: string[]
) {
  const completedRun =
    latestCompletedRun()

  if (!completedRun) {
    return 0
  }

  const wanted =
    relativePaths &&
    relativePaths.length > 0
      ? new Set(
          relativePaths
        )
      : null

  const rows =
    database
      .prepare(`
        SELECT *
        FROM archive_file_manifest
        WHERE
          last_seen_scan = ?
          AND observed_sha256 IS NOT NULL
          AND sha256 IS NOT NULL
          AND observed_sha256 != sha256
      `)
      .all(
        completedRun.scanToken
      ) as ManifestRow[]

  const now =
    new Date().toISOString()

  let updated = 0

  const statement =
    database.prepare(`
      UPDATE archive_file_manifest
      SET
        size_bytes = observed_size_bytes,
        mtime_ms = observed_mtime_ms,
        sha256 = observed_sha256,
        accepted_at = ?,
        verified_at = ?
      WHERE relative_path = ?
    `)

  database.exec(
    'BEGIN IMMEDIATE'
  )

  try {
    for (
      const row
      of rows
    ) {
      if (
        wanted &&
        !wanted.has(
          row.relative_path
        )
      ) {
        continue
      }

      statement.run(
        now,
        now,
        row.relative_path
      )
      updated += 1
    }

    database.exec(
      'COMMIT'
    )
  } catch (error) {
    database.exec(
      'ROLLBACK'
    )
    throw error
  }

  return updated
}
