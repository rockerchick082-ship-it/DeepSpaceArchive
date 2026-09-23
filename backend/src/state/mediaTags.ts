import {
  DatabaseSync,
} from 'node:sqlite'

import {
  applicationDatabasePath,
  ensureApplicationDatabaseMigrations,
} from '../services/databaseMigrations'


ensureApplicationDatabaseMigrations()


const database =
  new DatabaseSync(
    applicationDatabasePath
  )


database.exec(
  'PRAGMA foreign_keys = ON;'
)


export type MediaTagSummary = {
  name: string
  count: number
}


export type MediaTagAssignment = {
  category: string
  relativePath: string
  tags: string[]
}


type MediaTagRow = {
  id: number
  name: string
  normalized_name: string
}


type MediaTagSummaryRow = {
  name: string
  count: number
}


type MediaTagAssignmentRow = {
  category: string
  relative_path: string
  tag_name: string
}


function normalizeTagName(
  value: string
) {

  return value
    .trim()
    .replace(
      /\s+/g,
      ' '
    )
    .toLocaleLowerCase()

}


function cleanTagName(
  value: string
) {

  const cleaned =
    value
      .trim()
      .replace(
        /\s+/g,
        ' '
      )


  if (
    !cleaned ||
    cleaned.length > 50 ||
    /[\u0000-\u001f\u007f]/.test(
      cleaned
    )
  ) {

    return null

  }


  return cleaned

}


function cleanTagList(
  tags: string[]
) {

  const unique =
    new Map<string, string>()


  for (
    const tag
    of tags
  ) {

    const cleaned =
      cleanTagName(
        tag
      )


    if (!cleaned) {
      continue
    }


    const normalized =
      normalizeTagName(
        cleaned
      )


    if (
      !unique.has(
        normalized
      )
    ) {

      unique.set(
        normalized,
        cleaned
      )

    }

  }


  return [
    ...unique.values(),
  ]
    .slice(
      0,
      30
    )

}


function requireIdentity(
  category: string,
  relativePath: string
) {

  const cleanCategory =
    category.trim()

  const cleanRelativePath =
    relativePath.trim()


  if (
    !cleanCategory ||
    !cleanRelativePath
  ) {

    throw new Error(
      'category and relativePath are required'
    )

  }


  return {
    category:
      cleanCategory,

    relativePath:
      cleanRelativePath,
  }

}


export function listMediaTagSummaries():
  MediaTagSummary[] {

  const rows =
    database
      .prepare(`
        SELECT
          media_tag.name AS name,
          COUNT(*) AS count
        FROM media_tag
        JOIN media_tag_assignment
          ON media_tag_assignment.tag_id = media_tag.id
        GROUP BY
          media_tag.id,
          media_tag.name
        ORDER BY
          media_tag.name COLLATE NOCASE ASC
      `)
      .all() as
        MediaTagSummaryRow[]


  return rows.map(
    (row) => ({
      name:
        row.name,

      count:
        Number(
          row.count
        ),
    })
  )

}


export function listMediaTagAssignments():
  MediaTagAssignment[] {

  const rows =
    database
      .prepare(`
        SELECT
          media_tag_assignment.category AS category,
          media_tag_assignment.relative_path AS relative_path,
          media_tag.name AS tag_name
        FROM media_tag_assignment
        JOIN media_tag
          ON media_tag.id = media_tag_assignment.tag_id
        ORDER BY
          media_tag_assignment.category COLLATE NOCASE ASC,
          media_tag_assignment.relative_path COLLATE NOCASE ASC,
          media_tag.name COLLATE NOCASE ASC
      `)
      .all() as
        MediaTagAssignmentRow[]


  const assignments =
    new Map<string, MediaTagAssignment>()


  for (
    const row
    of rows
  ) {

    const key =
      `${row.category}\u0000${row.relative_path}`


    const existing =
      assignments.get(
        key
      )


    if (existing) {

      existing.tags.push(
        row.tag_name
      )

      continue

    }


    assignments.set(
      key,
      {
        category:
          row.category,

        relativePath:
          row.relative_path,

        tags: [
          row.tag_name,
        ],
      }
    )

  }


  return [
    ...assignments.values(),
  ]

}


export function getMediaTags(
  category: string,
  relativePath: string
) {

  const identity =
    requireIdentity(
      category,
      relativePath
    )


  const rows =
    database
      .prepare(`
        SELECT
          media_tag.name AS name
        FROM media_tag_assignment
        JOIN media_tag
          ON media_tag.id = media_tag_assignment.tag_id
        WHERE
          media_tag_assignment.category = ?
          AND media_tag_assignment.relative_path = ?
        ORDER BY
          media_tag.name COLLATE NOCASE ASC
      `)
      .all(
        identity.category,
        identity.relativePath
      ) as
        Array<{
          name: string
        }>


  return rows.map(
    (row) =>
      row.name
  )

}


function getOrCreateTag(
  tagName: string,
  now: string
) {

  const normalized =
    normalizeTagName(
      tagName
    )


  const existing =
    database
      .prepare(`
        SELECT
          id,
          name,
          normalized_name
        FROM media_tag
        WHERE
          normalized_name = ?
      `)
      .get(
        normalized
      ) as
        MediaTagRow |
        undefined


  if (existing) {
    return existing
  }


  const result =
    database
      .prepare(`
        INSERT INTO media_tag (
          name,
          normalized_name,
          created_at
        )
        VALUES (?, ?, ?)
      `)
      .run(
        tagName,
        normalized,
        now
      )


  return {
    id:
      Number(
        result.lastInsertRowid
      ),

    name:
      tagName,

    normalized_name:
      normalized,
  }

}


function removeOrphanTags() {

  database
    .prepare(`
      DELETE FROM media_tag
      WHERE NOT EXISTS (
        SELECT 1
        FROM media_tag_assignment
        WHERE
          media_tag_assignment.tag_id = media_tag.id
      )
    `)
    .run()

}


export function setMediaTags(
  category: string,
  relativePath: string,
  tags: string[]
) {

  const identity =
    requireIdentity(
      category,
      relativePath
    )


  const cleanedTags =
    cleanTagList(
      tags
    )


  const now =
    new Date()
      .toISOString()


  database.exec(
    'BEGIN IMMEDIATE'
  )


  try {

    database
      .prepare(`
        DELETE FROM media_tag_assignment
        WHERE
          category = ?
          AND relative_path = ?
      `)
      .run(
        identity.category,
        identity.relativePath
      )


    const insertAssignment =
      database
        .prepare(`
          INSERT OR IGNORE INTO media_tag_assignment (
            tag_id,
            category,
            relative_path,
            created_at
          )
          VALUES (?, ?, ?, ?)
        `)


    for (
      const tagName
      of cleanedTags
    ) {

      const tag =
        getOrCreateTag(
          tagName,
          now
        )


      insertAssignment.run(
        tag.id,
        identity.category,
        identity.relativePath,
        now
      )

    }


    removeOrphanTags()


    database.exec(
      'COMMIT'
    )

  } catch (error) {

    database.exec(
      'ROLLBACK'
    )


    throw error

  }


  return {
    ...identity,
    tags:
      getMediaTags(
        identity.category,
        identity.relativePath
      ),
  }

}


export function renameMediaTagPath(
  category: string,
  oldRelativePath: string,
  newRelativePath: string
) {

  if (
    oldRelativePath ===
    newRelativePath
  ) {

    return 0

  }


  const cleanCategory =
    category.trim()


  if (!cleanCategory) {
    return 0
  }


  database.exec(
    'BEGIN IMMEDIATE'
  )


  try {

    database
      .prepare(`
        DELETE FROM media_tag_assignment
        WHERE
          category = ?
          AND relative_path = ?
      `)
      .run(
        cleanCategory,
        newRelativePath
      )


    const result =
      database
        .prepare(`
          UPDATE media_tag_assignment
          SET
            relative_path = ?
          WHERE
            category = ?
            AND relative_path = ?
        `)
        .run(
          newRelativePath,
          cleanCategory,
          oldRelativePath
        )


    removeOrphanTags()


    database.exec(
      'COMMIT'
    )


    return Number(
      result.changes
    )

  } catch (error) {

    database.exec(
      'ROLLBACK'
    )


    throw error

  }

}
