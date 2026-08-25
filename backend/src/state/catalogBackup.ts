import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import path from 'node:path'

import {
  dataDirectory,
  catalogDatabasePath,
} from '../config/appPaths'

import {
  DatabaseSync,
} from 'node:sqlite'





const safetyBackupDirectory =
  path.join(
    dataDirectory,
    'safety-backups'
  )


export type CatalogBackupItem = {
  backupId: number
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


export type CatalogBackupFileMatch = {
  backupId: number
  catalogItemBackupId: number
  category: string
  relativePath: string
  matchMethod: string
  confidence: number | null
  manuallyConfirmed: boolean
  createdAt: string
  updatedAt: string
}


export type CatalogBackupMemoryLink = {
  backupId: number
  archiveCatalogItemBackupId: number
  memoryCatalogItemBackupId: number
  relationType: string
  createdAt: string
  updatedAt: string
}


export type CatalogBackupState = {
  backupFormat:
    'deepspace-archive-catalog'

  schemaVersion:
    1

  createdAt:
    string

  items:
    CatalogBackupItem[]

  fileMatches:
    CatalogBackupFileMatch[]

  memoryLinks:
    CatalogBackupMemoryLink[]
}


export type CatalogRestoreResult = {
  safetyBackup:
    string | null

  items: {
    created: number
    existing: number
  }

  fileMatches: {
    added: number
    existing: number
  }

  memoryLinks: {
    added: number
    existing: number
  }
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


type CatalogMemoryLinkRow = {
  id: number
  archive_catalog_item_id: number
  memory_catalog_item_id: number
  relation_type: string
  created_at: string
  updated_at: string
}


function tableExists(
  database:
    DatabaseSync,
  tableName:
    string
) {

  return Boolean(
    database
      .prepare(`
        SELECT name
        FROM sqlite_master
        WHERE
          type = 'table'
          AND name = ?
      `)
      .get(
        tableName
      )
  )

}


function escapeSqlString(
  value:
    string
) {

  return value.replace(
    /'/g,
    "''"
  )

}


function normalizeRelativePath(
  value:
    string
) {

  return value
    .replace(
      /\\/g,
      '/'
    )
    .replace(
      /^\.\/+/,
      ''
    )

}


export function createCatalogBackup():
  CatalogBackupState {

  if (
    !fs.existsSync(
      catalogDatabasePath
    )
  ) {

    return {
      backupFormat:
        'deepspace-archive-catalog',

      schemaVersion:
        1,

      createdAt:
        new Date()
          .toISOString(),

      items:
        [],

      fileMatches:
        [],

      memoryLinks:
        [],
    }

  }


  const database =
    new DatabaseSync(
      catalogDatabasePath,
      {
        readOnly:
          true,
      }
    )


  try {

    if (
      !tableExists(
        database,
        'catalog_item'
      ) ||
      !tableExists(
        database,
        'catalog_file_match'
      )
    ) {

      throw new Error(
        'Metadata Catalog database schema is incomplete.'
      )

    }


    const items =
      database
        .prepare(`
          SELECT *
          FROM catalog_item
          ORDER BY id
        `)
        .all() as
          unknown as
          CatalogItemRow[]


    const fileMatches =
      database
        .prepare(`
          SELECT *
          FROM catalog_file_match
          ORDER BY id
        `)
        .all() as
          unknown as
          CatalogFileMatchRow[]


    const memoryLinks =
      tableExists(
        database,
        'catalog_item_memory'
      )
        ? database
            .prepare(`
              SELECT *
              FROM catalog_item_memory
              ORDER BY id
            `)
            .all() as
              unknown as
              CatalogMemoryLinkRow[]
        : []


    return {
      backupFormat:
        'deepspace-archive-catalog',

      schemaVersion:
        1,

      createdAt:
        new Date()
          .toISOString(),

      items:
        items.map(
          (row) => ({
            backupId:
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
          })
        ),

      fileMatches:
        fileMatches.map(
          (row) => ({
            backupId:
              row.id,

            catalogItemBackupId:
              row.catalog_item_id,

            category:
              row.category,

            relativePath:
              normalizeRelativePath(
                row.relative_path
              ),

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
          })
        ),

      memoryLinks:
        memoryLinks.map(
          (row) => ({
            backupId:
              row.id,

            archiveCatalogItemBackupId:
              row.archive_catalog_item_id,

            memoryCatalogItemBackupId:
              row.memory_catalog_item_id,

            relationType:
              row.relation_type,

            createdAt:
              row.created_at,

            updatedAt:
              row.updated_at,
          })
        ),
    }

  } finally {

    database.close()

  }

}


export function validateCatalogBackup(
  value:
    unknown
): CatalogBackupState {

  if (
    !value ||
    typeof value !==
      'object'
  ) {

    throw new Error(
      'Catalog backup data is invalid.'
    )

  }


  const backup =
    value as
      Partial<CatalogBackupState>


  if (
    backup.backupFormat !==
      'deepspace-archive-catalog'
  ) {

    throw new Error(
      'Catalog backup format is invalid.'
    )

  }


  if (
    backup.schemaVersion !==
      1
  ) {

    throw new Error(
      `Unsupported catalog backup schema version: ${String(
        backup.schemaVersion
      )}`
    )

  }


  if (
    !Array.isArray(
      backup.items
    ) ||
    !Array.isArray(
      backup.fileMatches
    ) ||
    !Array.isArray(
      backup.memoryLinks
    )
  ) {

    throw new Error(
      'Catalog backup is missing required arrays.'
    )

  }


  const itemIds =
    new Set<number>()


  for (
    const item
    of backup.items
  ) {

    if (
      !Number.isInteger(
        item.backupId
      ) ||
      typeof item.canonicalName !==
        'string' ||
      !item.canonicalName.trim() ||
      typeof item.category !==
        'string' ||
      !item.category.trim()
    ) {

      throw new Error(
        'Catalog backup contains an invalid catalog item.'
      )

    }


    if (
      itemIds.has(
        item.backupId
      )
    ) {

      throw new Error(
        'Catalog backup contains duplicate catalog item IDs.'
      )

    }


    itemIds.add(
      item.backupId
    )

  }


  for (
    const match
    of backup.fileMatches
  ) {

    if (
      !itemIds.has(
        match.catalogItemBackupId
      )
    ) {

      throw new Error(
        'Catalog backup contains a file match for an unknown catalog item.'
      )

    }

  }


  for (
    const link
    of backup.memoryLinks
  ) {

    if (
      !itemIds.has(
        link.archiveCatalogItemBackupId
      ) ||
      !itemIds.has(
        link.memoryCatalogItemBackupId
      )
    ) {

      throw new Error(
        'Catalog backup contains a Memory relationship for an unknown catalog item.'
      )

    }

  }


  return backup as
    CatalogBackupState

}


async function createSafetySnapshot(
  database:
    DatabaseSync
) {

  await fsPromises.mkdir(
    safetyBackupDirectory,
    {
      recursive:
        true,
    }
  )


  const timestamp =
    new Date()
      .toISOString()
      .replace(
        /[:.]/g,
        '-'
      )


  const outputPath =
    path.join(
      safetyBackupDirectory,
      `pre-restore-metadata-catalog-${timestamp}.db`
    )


  database.exec(
    `VACUUM INTO '${escapeSqlString(
      outputPath
    )}'`
  )


  return outputPath

}


export async function restoreCatalogBackupMerge(
  backup:
    CatalogBackupState
): Promise<CatalogRestoreResult> {

  validateCatalogBackup(
    backup
  )


  if (
    !fs.existsSync(
      catalogDatabasePath
    )
  ) {

    throw new Error(
      'Metadata Catalog database does not exist in this installation.'
    )

  }


  const database =
    new DatabaseSync(
      catalogDatabasePath
    )


  database.exec(
    'PRAGMA foreign_keys = ON'
  )


  try {

    if (
      !tableExists(
        database,
        'catalog_item'
      ) ||
      !tableExists(
        database,
        'catalog_file_match'
      )
    ) {

      throw new Error(
        'Metadata Catalog schema is not initialized.'
      )

    }


    const supportsMemoryLinks =
      tableExists(
        database,
        'catalog_item_memory'
      )


    if (
      backup.memoryLinks.length >
        0 &&
      !supportsMemoryLinks
    ) {

      throw new Error(
        'This installation is too old to restore Metadata Catalog Memory relationships.'
      )

    }


    const safetyBackup =
      await createSafetySnapshot(
        database
      )


    const idMap =
      new Map<
        number,
        number
      >()


    let itemsCreated =
      0

    let itemsExisting =
      0

    let matchesAdded =
      0

    let matchesExisting =
      0

    let linksAdded =
      0

    let linksExisting =
      0


    database.exec(
      'BEGIN IMMEDIATE'
    )


    try {

      const findSourceItem =
        database.prepare(`
          SELECT id
          FROM catalog_item
          WHERE
            source_name = ?
            AND source_key = ?
          LIMIT 1
        `)


      const findManualItem =
        database.prepare(`
          SELECT id
          FROM catalog_item
          WHERE
            canonical_name = ?
            AND category = ?
            AND COALESCE(character, '') =
                COALESCE(?, '')
            AND COALESCE(subcategory, '') =
                COALESCE(?, '')
            AND COALESCE(position, '') =
                COALESCE(?, '')
            AND COALESCE(rarity, -1) =
                COALESCE(?, -1)
          ORDER BY id
          LIMIT 1
        `)


      const insertItem =
        database.prepare(`
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
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?, ?
          )
        `)


      for (
        const item
        of backup.items
      ) {

        let existing:
          {
            id: number
          } |
          undefined


        if (
          item.sourceName &&
          item.sourceKey
        ) {

          existing =
            findSourceItem.get(
              item.sourceName,
              item.sourceKey
            ) as
              {
                id: number
              } |
              undefined

        } else {

          existing =
            findManualItem.get(
              item.canonicalName,
              item.category,
              item.character,
              item.subcategory,
              item.position,
              item.rarity
            ) as
              {
                id: number
              } |
              undefined

        }


        if (
          existing
        ) {

          idMap.set(
            item.backupId,
            existing.id
          )


          itemsExisting +=
            1


          continue

        }


        const result =
          insertItem.run(
            item.canonicalName,
            item.character,
            item.category,
            item.subcategory,
            item.releaseDate,
            item.rarity,
            item.position,
            item.attribute,
            item.source,
            item.imageUrl,
            item.sourceName,
            item.sourceUrl,
            item.sourceKey,
            item.sourceUpdatedAt,
            item.manualNotes,
            item.memoryText,
            item.memoryTextSourceUrl,
            item.createdAt,
            item.updatedAt
          )


        const targetId =
          Number(
            result.lastInsertRowid
          )


        idMap.set(
          item.backupId,
          targetId
        )


        itemsCreated +=
          1

      }


      const insertFileMatch =
        database.prepare(`
          INSERT OR IGNORE INTO catalog_file_match (
            catalog_item_id,
            category,
            relative_path,
            match_method,
            confidence,
            manually_confirmed,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `)


      for (
        const match
        of backup.fileMatches
      ) {

        const catalogItemId =
          idMap.get(
            match.catalogItemBackupId
          )


        if (
          catalogItemId ===
            undefined
        ) {

          throw new Error(
            'Unable to map a Metadata Catalog file match during restore.'
          )

        }


        const result =
          insertFileMatch.run(
            catalogItemId,
            match.category,
            normalizeRelativePath(
              match.relativePath
            ),
            match.matchMethod,
            match.confidence,
            match.manuallyConfirmed
              ? 1
              : 0,
            match.createdAt,
            match.updatedAt
          )


        if (
          result.changes >
          0
        ) {

          matchesAdded +=
            1

        } else {

          matchesExisting +=
            1

        }

      }


      if (
        supportsMemoryLinks
      ) {

        const insertMemoryLink =
          database.prepare(`
            INSERT OR IGNORE INTO catalog_item_memory (
              archive_catalog_item_id,
              memory_catalog_item_id,
              relation_type,
              created_at,
              updated_at
            )
            VALUES (?, ?, ?, ?, ?)
          `)


        for (
          const link
          of backup.memoryLinks
        ) {

          const archiveId =
            idMap.get(
              link.archiveCatalogItemBackupId
            )


          const memoryId =
            idMap.get(
              link.memoryCatalogItemBackupId
            )


          if (
            archiveId ===
              undefined ||
            memoryId ===
              undefined
          ) {

            throw new Error(
              'Unable to map a Metadata Catalog Memory relationship during restore.'
            )

          }


          const result =
            insertMemoryLink.run(
              archiveId,
              memoryId,
              link.relationType,
              link.createdAt,
              link.updatedAt
            )


          if (
            result.changes >
            0
          ) {

            linksAdded +=
              1

          } else {

            linksExisting +=
              1

          }

        }

      }


      database.exec(
        'COMMIT'
      )

    } catch (
      error
    ) {

      try {

        database.exec(
          'ROLLBACK'
        )

      } catch {
        // Ignore rollback errors.
      }


      throw error

    }


    return {
      safetyBackup,

      items: {
        created:
          itemsCreated,

        existing:
          itemsExisting,
      },

      fileMatches: {
        added:
          matchesAdded,

        existing:
          matchesExisting,
      },

      memoryLinks: {
        added:
          linksAdded,

        existing:
          linksExisting,
      },
    }

  } finally {

    database.close()

  }

}


export function getCatalogDatabasePath() {

  return catalogDatabasePath

}