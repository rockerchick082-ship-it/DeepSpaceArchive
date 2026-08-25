import {
  DatabaseSync,
} from 'node:sqlite'

import {
  catalogDatabasePath,
  ensureCatalogDatabaseMigrations,
} from '../services/databaseMigrations'


ensureCatalogDatabaseMigrations()


const databasePath =
  catalogDatabasePath


const database =
  new DatabaseSync(
    databasePath
  )


database.exec(`
  PRAGMA foreign_keys = ON
`)


export type CatalogItem = {
  id: number
  canonicalName: string
  character: string | null
  category: string
  subcategory: string | null
  releaseDate: string | null
  rarity: number | null
  position: string | null
  attribute: string | null
  source: string | null
  imageUrl: string | null
  sourceName: string | null
  sourceUrl: string | null
  sourceKey: string | null
  sourceUpdatedAt: string | null
  manualNotes: string | null
  memoryText: string | null
  memoryTextSourceUrl: string | null
  createdAt: string
  updatedAt: string
}


export type CatalogFileMatch = {
  id: number
  catalogItemId: number
  category: string
  relativePath: string
  matchMethod: string
  confidence: number | null
  manuallyConfirmed: boolean
  createdAt: string
  updatedAt: string
}


export type CatalogItemMemoryLink = {
  id: number
  archiveCatalogItemId: number
  memoryCatalogItemId: number
  relationType: string
  createdAt: string
  updatedAt: string
}


export type CatalogLinkedMemory =
  CatalogItemMemoryLink & {
    memory:
      CatalogItem
  }


export type CatalogLinkedArchiveItem =
  CatalogItemMemoryLink & {
    archiveItem:
      CatalogItem
  }


export type CatalogItemWithFiles =
  CatalogItem & {
    files:
      CatalogFileMatch[]
  }


export type CatalogItemInput = {
  canonicalName: string
  character?: string | null
  category: string
  subcategory?: string | null
  releaseDate?: string | null
  rarity?: number | null
  position?: string | null
  attribute?: string | null
  source?: string | null
  imageUrl?: string | null
  sourceName?: string | null
  sourceUrl?: string | null
  sourceKey?: string | null
  sourceUpdatedAt?: string | null
  manualNotes?: string | null
  memoryText?: string | null
  memoryTextSourceUrl?: string | null
}


export type CatalogQuery = {
  query?: string
  character?: string
  category?: string

  /*
   * Used by the Metadata Catalog category checkboxes.
   * `category` remains the exact single-category filter;
   * `categories` is used when "All Categories" is active.
   */
  categories?: string[]

  subcategory?: string
  rarity?: number
  excludeRarity?: number
  hasFile?: boolean
  limit?: number
  offset?: number
}


type CatalogItemRow = {
  id: number
  canonical_name: string
  character: string | null
  category: string
  subcategory: string | null
  release_date: string | null
  rarity: number | null
  position: string | null
  attribute: string | null
  source: string | null
  image_url: string | null
  source_name: string | null
  source_url: string | null
  source_key: string | null
  source_updated_at: string | null
  manual_notes: string | null
  memory_text: string | null
  memory_text_source_url: string | null
  created_at: string
  updated_at: string
}


type CatalogFileMatchRow = {
  id: number
  catalog_item_id: number
  category: string
  relative_path: string
  match_method: string
  confidence: number | null
  manually_confirmed: number
  created_at: string
  updated_at: string
}


type CatalogItemMemoryRow = {
  id: number
  archive_catalog_item_id: number
  memory_catalog_item_id: number
  relation_type: string
  created_at: string
  updated_at: string
}


function normalizeRelativePath(
  value: string
) {

  return value
    .trim()
    .replace(
      /\\/g,
      '/'
    )
    .replace(
      /^\.\/+/,
      ''
    )

}


function nullableText(
  value:
    string | null | undefined
) {

  if (
    value ===
      undefined ||
    value ===
      null
  ) {

    return null

  }


  const trimmed =
    value.trim()


  return (
    trimmed ||
    null
  )

}


function rowToCatalogItem(
  row: CatalogItemRow
): CatalogItem {

  return {
    id:
      row.id,

    canonicalName:
      row.canonical_name,

    character:
      row.character,

    category:
      row.category,

    subcategory:
      row.subcategory,

    releaseDate:
      row.release_date,

    rarity:
      row.rarity,

    position:
      row.position,

    attribute:
      row.attribute,

    source:
      row.source,

    imageUrl:
      row.image_url,

    sourceName:
      row.source_name,

    sourceUrl:
      row.source_url,

    sourceKey:
      row.source_key,

    sourceUpdatedAt:
      row.source_updated_at,

    manualNotes:
      row.manual_notes,

    memoryText:
      row.memory_text,

    memoryTextSourceUrl:
      row.memory_text_source_url,

    createdAt:
      row.created_at,

    updatedAt:
      row.updated_at,
  }

}


function rowToCatalogFileMatch(
  row: CatalogFileMatchRow
): CatalogFileMatch {

  return {
    id:
      row.id,

    catalogItemId:
      row.catalog_item_id,

    category:
      row.category,

    relativePath:
      row.relative_path,

    matchMethod:
      row.match_method,

    confidence:
      row.confidence,

    manuallyConfirmed:
      Boolean(
        row.manually_confirmed
      ),

    createdAt:
      row.created_at,

    updatedAt:
      row.updated_at,
  }

}


function normalizeLimit(
  value:
    number | undefined
) {

  if (
    value ===
      undefined ||
    !Number.isInteger(
      value
    )
  ) {

    return 100

  }


  return Math.min(
    500,
    Math.max(
      1,
      value
    )
  )

}


function normalizeOffset(
  value:
    number | undefined
) {

  if (
    value ===
      undefined ||
    !Number.isInteger(
      value
    )
  ) {

    return 0

  }


  return Math.max(
    0,
    value
  )

}



function rowToCatalogItemMemoryLink(
  row:
    CatalogItemMemoryRow
): CatalogItemMemoryLink {

  return {
    id:
      row.id,

    archiveCatalogItemId:
      row.archive_catalog_item_id,

    memoryCatalogItemId:
      row.memory_catalog_item_id,

    relationType:
      row.relation_type,

    createdAt:
      row.created_at,

    updatedAt:
      row.updated_at,
  }

}


export function listCatalogItems(
  filters:
    CatalogQuery = {}
) {

  const where:
    string[] =
    []


  const parameters:
    Array<
      string | number
    > =
    []


  if (
    filters.query?.trim()
  ) {

    const query =
      `%${filters.query.trim()}%`


    where.push(`
      (
        item.canonical_name LIKE ?
        OR item.character LIKE ?
        OR item.category LIKE ?
        OR item.subcategory LIKE ?
        OR item.source LIKE ?
      )
    `)


    parameters.push(
      query,
      query,
      query,
      query,
      query
    )

  }


  if (
    filters.character?.trim()
  ) {

    where.push(
      'item.character = ?'
    )


    parameters.push(
      filters.character.trim()
    )

  }


  if (
    filters.category?.trim()
  ) {

    where.push(
      'item.category = ?'
    )


    parameters.push(
      filters.category.trim()
    )

  }


  if (
    !filters.category?.trim() &&
    filters.categories !==
      undefined
  ) {

    const categories =
      filters.categories
        .map(
          (value) =>
            value.trim()
        )
        .filter(
          Boolean
        )


    if (
      categories.length ===
      0
    ) {

      where.push(
        '1 = 0'
      )

    } else {

      where.push(
        `item.category IN (${categories
          .map(
            () =>
              '?'
          )
          .join(', ')})`
      )


      parameters.push(
        ...categories
      )

    }

  }


  if (
    filters.subcategory?.trim()
  ) {

    where.push(
      'item.subcategory = ?'
    )


    parameters.push(
      filters.subcategory.trim()
    )

  }


  if (
    filters.rarity !==
      undefined
  ) {

    where.push(
      'item.rarity = ?'
    )


    parameters.push(
      filters.rarity
    )

  }


  if (
    filters.excludeRarity !==
      undefined &&
    filters.rarity ===
      undefined
  ) {

    where.push(`
      (
        item.rarity IS NULL
        OR item.rarity <> ?
      )
    `)


    parameters.push(
      filters.excludeRarity
    )

  }


  if (
    filters.hasFile ===
      true
  ) {

    where.push(`
      EXISTS (
        SELECT 1
        FROM catalog_file_match match
        WHERE
          match.catalog_item_id =
          item.id
      )
    `)

  }


  if (
    filters.hasFile ===
      false
  ) {

    where.push(`
      NOT EXISTS (
        SELECT 1
        FROM catalog_file_match match
        WHERE
          match.catalog_item_id =
          item.id
      )
    `)

  }


  const whereClause =
    where.length
      ? `WHERE ${where.join(
          ' AND '
        )}`
      : ''


  const limit =
    normalizeLimit(
      filters.limit
    )


  const offset =
    normalizeOffset(
      filters.offset
    )


  const countRow =
    database
      .prepare(`
        SELECT
          COUNT(*) AS count
        FROM catalog_item item
        ${whereClause}
      `)
      .get(
        ...parameters
      ) as {
        count: number
      }


  const rows =
    database
      .prepare(`
        SELECT
          item.*,

          EXISTS (
            SELECT 1
            FROM catalog_file_match match
            WHERE
              match.catalog_item_id =
              item.id
          ) AS has_file

        FROM catalog_item item
        ${whereClause}
        ORDER BY
          item.release_date DESC,
          item.character ASC,
          item.category ASC,
          item.canonical_name ASC
        LIMIT ?
        OFFSET ?
      `)
      .all(
        ...parameters,
        limit,
        offset
      ) as Array<
        CatalogItemRow & {
          has_file: number
        }
      >


  return {
    count:
      countRow.count,

    limit,

    offset,

    items:
      rows.map(
        (row) => ({
          ...rowToCatalogItem(
            row
          ),

          hasFile:
            Boolean(
              row.has_file
            ),
        })
      ),
  }

}


export function getCatalogItem(
  id: number
): CatalogItemWithFiles | null {

  const row =
    database
      .prepare(`
        SELECT *
        FROM catalog_item
        WHERE id = ?
      `)
      .get(
        id
      ) as
        CatalogItemRow |
        undefined


  if (!row) {

    return null

  }


  return {
    ...rowToCatalogItem(
      row
    ),

    files:
      listCatalogFileMatches(
        id
      ),
  }

}


export function createCatalogItem(
  input:
    CatalogItemInput
) {

  const now =
    new Date()
      .toISOString()


  const result =
    database
      .prepare(`
        INSERT INTO catalog_item (

          canonical_name,
          character,
          category,
          subcategory,
          release_date,
          rarity,
          position,
          attribute,
          source,
          image_url,
          source_name,
          source_url,
          source_key,
          source_updated_at,
          manual_notes,
          memory_text,
          memory_text_source_url,
          created_at,
          updated_at

        )
        VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `)
      .run(
        input.canonicalName.trim(),
        nullableText(
          input.character
        ),
        input.category.trim(),
        nullableText(
          input.subcategory
        ),
        nullableText(
          input.releaseDate
        ),
        input.rarity ??
          null,
        nullableText(
          input.position
        ),
        nullableText(
          input.attribute
        ),
        nullableText(
          input.source
        ),
        nullableText(
          input.imageUrl
        ),
        nullableText(
          input.sourceName
        ),
        nullableText(
          input.sourceUrl
        ),
        nullableText(
          input.sourceKey
        ),
        nullableText(
          input.sourceUpdatedAt
        ),
        nullableText(
          input.manualNotes
        ),
        nullableText(
          input.memoryText
        ),
        nullableText(
          input.memoryTextSourceUrl
        ),
        now,
        now
      )


  return getCatalogItem(
    Number(
      result.lastInsertRowid
    )
  )

}


export function upsertCatalogItemFromSource(
  input:
    CatalogItemInput
) {

  const sourceName =
    nullableText(
      input.sourceName
    )


  const sourceKey =
    nullableText(
      input.sourceKey
    )


  if (
    !sourceName ||
    !sourceKey
  ) {

    throw new Error(
      'Source name and source key are required for imported catalog records.'
    )

  }


  const existingRow =
    database
      .prepare(`
        SELECT *
        FROM catalog_item
        WHERE
          source_name = ?
          AND source_key = ?
      `)
      .get(
        sourceName,
        sourceKey
      ) as
        CatalogItemRow |
        undefined


  if (
    !existingRow
  ) {

    return {
      created:
        true,

      updated:
        false,

      item:
        createCatalogItem(
          input
        ),
    }

  }


  const now =
    new Date()
      .toISOString()


  /*
   * Imported source data owns the fields
   * below. manual_notes is intentionally
   * preserved so a wiki refresh never
   * erases the user's notes.
   */

  database
    .prepare(`
      UPDATE catalog_item
      SET
        canonical_name = ?,
        character = ?,
        category = ?,
        subcategory = ?,
        release_date = ?,
        rarity = ?,
        position = ?,
        attribute = ?,
        source = ?,
        image_url = ?,
        source_url = ?,
        source_updated_at = ?,
        memory_text = ?,
        memory_text_source_url = ?,
        updated_at = ?
      WHERE
        id = ?
    `)
    .run(
      input.canonicalName.trim(),
      nullableText(
        input.character
      ),
      input.category.trim(),
      nullableText(
        input.subcategory
      ),
      nullableText(
        input.releaseDate
      ),
      input.rarity ??
        null,
      nullableText(
        input.position
      ),
      nullableText(
        input.attribute
      ),
      nullableText(
        input.source
      ),
      nullableText(
        input.imageUrl
      ),
      nullableText(
        input.sourceUrl
      ),
      nullableText(
        input.sourceUpdatedAt
      ),
      nullableText(
        input.memoryText
      ),
      nullableText(
        input.memoryTextSourceUrl
      ),
      now,
      existingRow.id
    )


  return {
    created:
      false,

    updated:
      true,

    item:
      getCatalogItem(
        existingRow.id
      ),
  }

}


export function updateCatalogItem(
  id: number,
  input:
    CatalogItemInput
) {

  const existing =
    getCatalogItem(
      id
    )


  if (!existing) {

    return null

  }


  const now =
    new Date()
      .toISOString()


  database
    .prepare(`
      UPDATE catalog_item
      SET
        canonical_name = ?,
        character = ?,
        category = ?,
        subcategory = ?,
        release_date = ?,
        rarity = ?,
        position = ?,
        attribute = ?,
        source = ?,
        image_url = ?,
        source_name = ?,
        source_url = ?,
        source_key = ?,
        source_updated_at = ?,
        manual_notes = ?,
        memory_text = ?,
        memory_text_source_url = ?,
        updated_at = ?
      WHERE
        id = ?
    `)
    .run(
      input.canonicalName.trim(),
      nullableText(
        input.character
      ),
      input.category.trim(),
      nullableText(
        input.subcategory
      ),
      nullableText(
        input.releaseDate
      ),
      input.rarity ??
        null,
      nullableText(
        input.position
      ),
      nullableText(
        input.attribute
      ),
      nullableText(
        input.source
      ),
      nullableText(
        input.imageUrl
      ),
      nullableText(
        input.sourceName
      ),
      nullableText(
        input.sourceUrl
      ),
      nullableText(
        input.sourceKey
      ),
      nullableText(
        input.sourceUpdatedAt
      ),
      nullableText(
        input.manualNotes
      ),
      nullableText(
        input.memoryText
      ),
      nullableText(
        input.memoryTextSourceUrl
      ),
      now,
      id
    )


  return getCatalogItem(
    id
  )

}


export function deleteCatalogItem(
  id: number
) {

  const result =
    database
      .prepare(`
        DELETE FROM catalog_item
        WHERE id = ?
      `)
      .run(
        id
      )


  return (
    result.changes >
    0
  )

}


export function listCatalogFileMatches(
  catalogItemId: number
) {

  const rows =
    database
      .prepare(`
        SELECT *
        FROM catalog_file_match
        WHERE
          catalog_item_id = ?
        ORDER BY
          category,
          relative_path
      `)
      .all(
        catalogItemId
      ) as CatalogFileMatchRow[]


  return rows.map(
    rowToCatalogFileMatch
  )

}


export function linkCatalogFile(
  catalogItemId: number,
  category: string,
  relativePath: string,
  options?: {
    matchMethod?:
      string
    confidence?:
      number | null
    manuallyConfirmed?:
      boolean
  }
) {

  const item =
    getCatalogItem(
      catalogItemId
    )


  if (!item) {

    return null

  }


  const now =
    new Date()
      .toISOString()


  database
    .prepare(`
      INSERT INTO catalog_file_match (

        catalog_item_id,
        category,
        relative_path,
        match_method,
        confidence,
        manually_confirmed,
        created_at,
        updated_at

      )
      VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?
      )
      ON CONFLICT (
        catalog_item_id,
        category,
        relative_path
      )
      DO UPDATE SET
        match_method =
          excluded.match_method,
        confidence =
          excluded.confidence,
        manually_confirmed =
          excluded.manually_confirmed,
        updated_at =
          excluded.updated_at
    `)
    .run(
      catalogItemId,
      category.trim(),
      normalizeRelativePath(
        relativePath
      ),
      options?.matchMethod ??
        'manual',
      options?.confidence ??
        null,
      options?.manuallyConfirmed
        ? 1
        : 0,
      now,
      now
    )


  return getCatalogItem(
    catalogItemId
  )

}


export function unlinkCatalogFile(
  catalogItemId: number,
  matchId: number
) {

  const result =
    database
      .prepare(`
        DELETE FROM catalog_file_match
        WHERE
          id = ?
          AND catalog_item_id = ?
      `)
      .run(
        matchId,
        catalogItemId
      )


  return (
    result.changes >
    0
  )

}


export function getCatalogItemsForFile(
  category: string,
  relativePath: string
): CatalogItem[] {

  const rows =
    database
      .prepare(`
        SELECT
          item.*
        FROM catalog_file_match match
        INNER JOIN catalog_item item
          ON item.id =
             match.catalog_item_id
        WHERE
          match.category = ?
          AND match.relative_path = ?
        ORDER BY
          item.character,
          item.canonical_name
      `)
      .all(
        category,
        normalizeRelativePath(
          relativePath
        )
      ) as CatalogItemRow[]


  return rows.map(
    rowToCatalogItem
  )

}




export function renameCatalogFilePath(
  category: string,
  oldRelativePath: string,
  newRelativePath: string
) {

  const normalizedOld =
    normalizeRelativePath(
      oldRelativePath
    )


  const normalizedNew =
    normalizeRelativePath(
      newRelativePath
    )


  if (
    normalizedOld ===
    normalizedNew
  ) {

    return 0

  }


  const rows =
    database
      .prepare(`
        SELECT *
        FROM catalog_file_match
        WHERE
          category = ?
          AND relative_path = ?
      `)
      .all(
        category.trim(),
        normalizedOld
      ) as CatalogFileMatchRow[]


  if (
    rows.length ===
    0
  ) {

    return 0

  }


  const now =
    new Date()
      .toISOString()


  database.exec(
    'BEGIN IMMEDIATE'
  )


  try {

    for (
      const row
      of rows
    ) {

      database
        .prepare(`
          INSERT INTO catalog_file_match (

            catalog_item_id,
            category,
            relative_path,
            match_method,
            confidence,
            manually_confirmed,
            created_at,
            updated_at

          )
          VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?
          )
          ON CONFLICT (
            catalog_item_id,
            category,
            relative_path
          )
          DO UPDATE SET
            match_method =
              excluded.match_method,
            confidence =
              excluded.confidence,
            manually_confirmed =
              excluded.manually_confirmed,
            updated_at =
              excluded.updated_at
        `)
        .run(
          row.catalog_item_id,
          row.category,
          normalizedNew,
          row.match_method,
          row.confidence,
          row.manually_confirmed,
          row.created_at,
          now
        )

    }


    database
      .prepare(`
        DELETE FROM catalog_file_match
        WHERE
          category = ?
          AND relative_path = ?
      `)
      .run(
        category.trim(),
        normalizedOld
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


  return rows.length

}


export function linkCatalogMemory(
  archiveCatalogItemId:
    number,
  memoryCatalogItemId:
    number,
  relationType =
    'unlock'
) {

  if (
    archiveCatalogItemId ===
    memoryCatalogItemId
  ) {

    throw new Error(
      'An archive catalog item cannot link to itself as a Memory.'
    )

  }


  const archiveItem =
    database
      .prepare(`
        SELECT *
        FROM catalog_item
        WHERE id = ?
      `)
      .get(
        archiveCatalogItemId
      ) as
        CatalogItemRow |
        undefined


  const memoryItem =
    database
      .prepare(`
        SELECT *
        FROM catalog_item
        WHERE id = ?
      `)
      .get(
        memoryCatalogItemId
      ) as
        CatalogItemRow |
        undefined


  if (
    !archiveItem ||
    !memoryItem
  ) {

    return null

  }


  if (
    memoryItem.category !==
    'Memory'
  ) {

    throw new Error(
      'The linked Memory record must have category "Memory".'
    )

  }


  const now =
    new Date()
      .toISOString()


  database
    .prepare(`
      INSERT INTO catalog_item_memory (

        archive_catalog_item_id,
        memory_catalog_item_id,
        relation_type,
        created_at,
        updated_at

      )
      VALUES (
        ?, ?, ?, ?, ?
      )
      ON CONFLICT (
        archive_catalog_item_id,
        memory_catalog_item_id
      )
      DO UPDATE SET
        relation_type =
          excluded.relation_type,
        updated_at =
          excluded.updated_at
    `)
    .run(
      archiveCatalogItemId,
      memoryCatalogItemId,
      relationType.trim() ||
        'unlock',
      now,
      now
    )


  return getCatalogMemoryLink(
    archiveCatalogItemId,
    memoryCatalogItemId
  )

}


export function getCatalogMemoryLink(
  archiveCatalogItemId:
    number,
  memoryCatalogItemId:
    number
) {

  const row =
    database
      .prepare(`
        SELECT *
        FROM catalog_item_memory
        WHERE
          archive_catalog_item_id = ?
          AND memory_catalog_item_id = ?
      `)
      .get(
        archiveCatalogItemId,
        memoryCatalogItemId
      ) as
        CatalogItemMemoryRow |
        undefined


  return row
    ? rowToCatalogItemMemoryLink(
        row
      )
    : null

}


export function unlinkCatalogMemory(
  archiveCatalogItemId:
    number,
  memoryCatalogItemId:
    number
) {

  const result =
    database
      .prepare(`
        DELETE FROM catalog_item_memory
        WHERE
          archive_catalog_item_id = ?
          AND memory_catalog_item_id = ?
      `)
      .run(
        archiveCatalogItemId,
        memoryCatalogItemId
      )


  return (
    result.changes >
    0
  )

}


export function listCatalogMemoryLinks(
  archiveCatalogItemId:
    number
): CatalogLinkedMemory[] {

  const rows =
    database
      .prepare(`
        SELECT
          link.id,
          link.archive_catalog_item_id,
          link.memory_catalog_item_id,
          link.relation_type,
          link.created_at,
          link.updated_at,

          memory.id AS memory_id,
          memory.canonical_name AS memory_canonical_name,
          memory.character AS memory_character,
          memory.category AS memory_category,
          memory.subcategory AS memory_subcategory,
          memory.release_date AS memory_release_date,
          memory.rarity AS memory_rarity,
          memory.position AS memory_position,
          memory.attribute AS memory_attribute,
          memory.source AS memory_source,
          memory.image_url AS memory_image_url,
          memory.source_name AS memory_source_name,
          memory.source_url AS memory_source_url,
          memory.source_key AS memory_source_key,
          memory.source_updated_at AS memory_source_updated_at,
          memory.manual_notes AS memory_manual_notes,
          memory.memory_text AS memory_memory_text,
          memory.memory_text_source_url AS memory_memory_text_source_url,
          memory.created_at AS memory_created_at,
          memory.updated_at AS memory_updated_at

        FROM catalog_item_memory link

        INNER JOIN catalog_item memory
          ON memory.id =
             link.memory_catalog_item_id

        WHERE
          link.archive_catalog_item_id = ?

        ORDER BY
          memory.canonical_name
      `)
      .all(
        archiveCatalogItemId
      ) as Array<
        CatalogItemMemoryRow & {
          memory_id: number
          memory_canonical_name: string
          memory_character: string | null
          memory_category: string
          memory_subcategory: string | null
          memory_release_date: string | null
          memory_rarity: number | null
          memory_position: string | null
          memory_attribute: string | null
          memory_source: string | null
          memory_image_url: string | null
          memory_source_name: string | null
          memory_source_url: string | null
          memory_source_key: string | null
          memory_source_updated_at: string | null
          memory_manual_notes: string | null
          memory_memory_text: string | null
          memory_memory_text_source_url: string | null
          memory_created_at: string
          memory_updated_at: string
        }
      >


  return rows.map(
    (row) => ({
      ...rowToCatalogItemMemoryLink(
        row
      ),

      memory:
        rowToCatalogItem({
          id:
            row.memory_id,

          canonical_name:
            row.memory_canonical_name,

          character:
            row.memory_character,

          category:
            row.memory_category,

          subcategory:
            row.memory_subcategory,

          release_date:
            row.memory_release_date,

          rarity:
            row.memory_rarity,

          position:
            row.memory_position,

          attribute:
            row.memory_attribute,

          source:
            row.memory_source,

          image_url:
            row.memory_image_url,

          source_name:
            row.memory_source_name,

          source_url:
            row.memory_source_url,

          source_key:
            row.memory_source_key,

          source_updated_at:
            row.memory_source_updated_at,

          manual_notes:
            row.memory_manual_notes,

          memory_text:
            row.memory_memory_text,

          memory_text_source_url:
            row.memory_memory_text_source_url,

          created_at:
            row.memory_created_at,

          updated_at:
            row.memory_updated_at,
        }),
    })
  )

}


export function listCatalogArchiveLinks(
  memoryCatalogItemId:
    number
): CatalogLinkedArchiveItem[] {

  const rows =
    database
      .prepare(`
        SELECT
          link.id,
          link.archive_catalog_item_id,
          link.memory_catalog_item_id,
          link.relation_type,
          link.created_at,
          link.updated_at,

          archive.id AS archive_id,
          archive.canonical_name AS archive_canonical_name,
          archive.character AS archive_character,
          archive.category AS archive_category,
          archive.subcategory AS archive_subcategory,
          archive.release_date AS archive_release_date,
          archive.rarity AS archive_rarity,
          archive.position AS archive_position,
          archive.attribute AS archive_attribute,
          archive.source AS archive_source,
          archive.image_url AS archive_image_url,
          archive.source_name AS archive_source_name,
          archive.source_url AS archive_source_url,
          archive.source_key AS archive_source_key,
          archive.source_updated_at AS archive_source_updated_at,
          archive.manual_notes AS archive_manual_notes,
          archive.memory_text AS archive_memory_text,
          archive.memory_text_source_url AS archive_memory_text_source_url,
          archive.created_at AS archive_created_at,
          archive.updated_at AS archive_updated_at

        FROM catalog_item_memory link

        INNER JOIN catalog_item archive
          ON archive.id =
             link.archive_catalog_item_id

        WHERE
          link.memory_catalog_item_id = ?

        ORDER BY
          archive.category,
          archive.canonical_name
      `)
      .all(
        memoryCatalogItemId
      ) as Array<
        CatalogItemMemoryRow & {
          archive_id: number
          archive_canonical_name: string
          archive_character: string | null
          archive_category: string
          archive_subcategory: string | null
          archive_release_date: string | null
          archive_rarity: number | null
          archive_position: string | null
          archive_attribute: string | null
          archive_source: string | null
          archive_image_url: string | null
          archive_source_name: string | null
          archive_source_url: string | null
          archive_source_key: string | null
          archive_source_updated_at: string | null
          archive_manual_notes: string | null
          archive_memory_text: string | null
          archive_memory_text_source_url: string | null
          archive_created_at: string
          archive_updated_at: string
        }
      >


  return rows.map(
    (row) => ({
      ...rowToCatalogItemMemoryLink(
        row
      ),

      archiveItem:
        rowToCatalogItem({
          id:
            row.archive_id,

          canonical_name:
            row.archive_canonical_name,

          character:
            row.archive_character,

          category:
            row.archive_category,

          subcategory:
            row.archive_subcategory,

          release_date:
            row.archive_release_date,

          rarity:
            row.archive_rarity,

          position:
            row.archive_position,

          attribute:
            row.archive_attribute,

          source:
            row.archive_source,

          image_url:
            row.archive_image_url,

          source_name:
            row.archive_source_name,

          source_url:
            row.archive_source_url,

          source_key:
            row.archive_source_key,

          source_updated_at:
            row.archive_source_updated_at,

          manual_notes:
            row.archive_manual_notes,

          memory_text:
            row.archive_memory_text,

          memory_text_source_url:
            row.archive_memory_text_source_url,

          created_at:
            row.archive_created_at,

          updated_at:
            row.archive_updated_at,
        }),
    })
  )

}


export function findCatalogItemByCharacterAndName(
  character:
    string,
  canonicalName:
    string,
  category?:
    string
) {

  const normalizedCharacter =
    character
      .trim()
      .toLowerCase()


  const normalizedName =
    canonicalName
      .trim()
      .toLowerCase()


  const rows =
    database
      .prepare(`
        SELECT *
        FROM catalog_item
        WHERE
          lower(
            trim(
              character
            )
          ) = ?
          ${
            category
              ? 'AND lower(trim(category)) = ?'
              : ''
          }
        ORDER BY
          id
      `)
      .all(
        ...(
          category
            ? [
                normalizedCharacter,
                category
                  .trim()
                  .toLowerCase(),
              ]
            : [
                normalizedCharacter,
              ]
        )
      ) as CatalogItemRow[]


  const withoutCharacterPrefix =
    (
      value:
        string
    ) => {

      const trimmed =
        value
          .trim()
          .toLowerCase()


      const prefix =
        `${normalizedCharacter}:`


      return trimmed.startsWith(
        prefix
      )
        ? trimmed
            .slice(
              prefix.length
            )
            .trim()
        : trimmed

    }


  const wanted =
    withoutCharacterPrefix(
      normalizedName
    )


  const row =
    rows.find(
      (candidate) =>
        withoutCharacterPrefix(
          candidate.canonical_name
        ) ===
        wanted
    )


  return row
    ? rowToCatalogItem(
        row
      )
    : null

}


export function getCatalogStats() {

  const totalRow =
    database
      .prepare(`
        SELECT
          COUNT(*) AS count
        FROM catalog_item
      `)
      .get() as {
        count: number
      }


  const memoryReferenceRow =
    database
      .prepare(`
        SELECT
          COUNT(*) AS count
        FROM catalog_item
        WHERE
          lower(
            trim(
              category
            )
          ) = 'memory'
      `)
      .get() as {
        count: number
      }


  const archiveRow =
    database
      .prepare(`
        SELECT
          COUNT(*) AS count
        FROM catalog_item
        WHERE
          lower(
            trim(
              category
            )
          ) <> 'memory'
      `)
      .get() as {
        count: number
      }


  const matchedRow =
    database
      .prepare(`
        SELECT
          COUNT(
            DISTINCT match.catalog_item_id
          ) AS count

        FROM catalog_file_match match

        INNER JOIN catalog_item item
          ON item.id =
             match.catalog_item_id

        WHERE
          lower(
            trim(
              item.category
            )
          ) <> 'memory'
      `)
      .get() as {
        count: number
      }


  const fileMatchRow =
    database
      .prepare(`
        SELECT
          COUNT(*) AS count

        FROM catalog_file_match match

        INNER JOIN catalog_item item
          ON item.id =
             match.catalog_item_id

        WHERE
          lower(
            trim(
              item.category
            )
          ) <> 'memory'
      `)
      .get() as {
        count: number
      }


  const relationshipRow =
    database
      .prepare(`
        SELECT
          COUNT(*) AS count
        FROM catalog_item_memory
      `)
      .get() as {
        count: number
      }


  const categories =
    database
      .prepare(`
        SELECT
          category,
          COUNT(*) AS count
        FROM catalog_item
        WHERE
          rarity IS NULL
          OR rarity <> 3
        GROUP BY
          category
        ORDER BY
          category
      `)
      .all() as Array<{
        category: string
        count: number
      }>


  const characters =
    database
      .prepare(`
        SELECT
          character,
          COUNT(*) AS count
        FROM catalog_item
        WHERE
          character IS NOT NULL
          AND lower(
            trim(
              category
            )
          ) <> 'memory'
          AND (
            rarity IS NULL
            OR rarity <> 3
          )
        GROUP BY
          character
        ORDER BY
          character
      `)
      .all() as Array<{
        character: string
        count: number
      }>


  return {
    /*
     * All records, including the generic Memory
     * reference/card layer.
     */
    totalItems:
      totalRow.count,

    /*
     * Archive-facing records only. These are the
     * records expected to have files.
     */
    archiveItems:
      archiveRow.count,

    memoryReferenceItems:
      memoryReferenceRow.count,

    matchedItems:
      matchedRow.count,

    unmatchedItems:
      Math.max(
        0,
        archiveRow.count -
        matchedRow.count
      ),

    fileMatches:
      fileMatchRow.count,

    memoryRelationships:
      relationshipRow.count,

    categories,

    characters,
  }

}


export function getCatalogDatabasePath() {

  return databasePath

}