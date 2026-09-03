import fs from 'node:fs'
import path from 'node:path'

import {
  dataDirectory,
  applicationDatabasePath,
  catalogDatabasePath,
} from '../config/appPaths'

import {
  DatabaseSync,
} from 'node:sqlite'


export const applicationDatabaseSchemaVersion =
  2


export const catalogDatabaseSchemaVersion =
  1


export {
  dataDirectory,
  applicationDatabasePath,
  catalogDatabasePath,
} from '../config/appPaths'


export const safetyBackupDirectory =
  path.join(
    dataDirectory,
    'safety-backups'
  )


type DatabaseKind =
  'application' |
  'metadata-catalog'


type MigrationDefinition = {
  version: number
  name: string
  run: (
    database: DatabaseSync
  ) => void
}


type UserVersionRow = {
  user_version: number
}


type CountRow = {
  count: number
}


function ensureDirectories() {

  fs.mkdirSync(
    dataDirectory,
    {
      recursive:
        true,
    }
  )


  fs.mkdirSync(
    safetyBackupDirectory,
    {
      recursive:
        true,
    }
  )

}


function readUserVersion(
  database: DatabaseSync
) {

  const row =
    database
      .prepare(`
        PRAGMA user_version
      `)
      .get() as UserVersionRow


  return Number(
    row.user_version
  )

}


function hasUserTables(
  database: DatabaseSync
) {

  const row =
    database
      .prepare(`
        SELECT
          COUNT(*) AS count
        FROM sqlite_master
        WHERE
          type = 'table'
          AND name NOT LIKE 'sqlite_%'
      `)
      .get() as CountRow


  return (
    row.count >
    0
  )

}


function safeTimestamp() {

  return new Date()
    .toISOString()
    .replace(
      /[:.]/g,
      '-'
    )

}


function sqlStringLiteral(
  value: string
) {

  return `'${value.replace(
    /'/g,
    "''"
  )}'`

}


function createPreMigrationSnapshot(
  database: DatabaseSync,
  kind: DatabaseKind,
  fromVersion: number,
  toVersion: number
) {

  const baseName =
    kind ===
      'application'
      ? 'deepspace-archive'
      : 'metadata-catalog'


  const fileName =
    `pre-migration-${baseName}-v${fromVersion}-to-v${toVersion}-${safeTimestamp()}.db`


  const snapshotPath =
    path.join(
      safetyBackupDirectory,
      fileName
    )


  database.exec(
    `VACUUM INTO ${sqlStringLiteral(
      snapshotPath
    )}`
  )


  return snapshotPath

}


function runNumberedMigrations(
  options: {
    kind: DatabaseKind
    databasePath: string
    latestVersion: number
    migrations: MigrationDefinition[]
  }
) {

  ensureDirectories()


  const databaseExisted =
    fs.existsSync(
      options.databasePath
    )


  const database =
    new DatabaseSync(
      options.databasePath
    )


  try {

    const currentVersion =
      readUserVersion(
        database
      )


    if (
      currentVersion >
      options.latestVersion
    ) {

      throw new Error(
        `${options.kind} database schema version ${currentVersion} is newer than this DeepSpace Archive build supports (${options.latestVersion}). ` +
        'Upgrade the application instead of opening this database with an older build.'
      )

    }


    if (
      currentVersion ===
      options.latestVersion
    ) {

      return

    }


    const pendingMigrations =
      options.migrations
        .filter(
          (migration) =>
            migration.version >
              currentVersion &&
            migration.version <=
              options.latestVersion
        )
        .sort(
          (
            left,
            right
          ) =>
            left.version -
            right.version
        )


    if (
      pendingMigrations.length ===
      0
    ) {

      throw new Error(
        `No migration path is available for the ${options.kind} database from schema version ${currentVersion} to ${options.latestVersion}.`
      )

    }


    let snapshotPath:
      string |
      null =
      null


    if (
      databaseExisted &&
      hasUserTables(
        database
      )
    ) {

      snapshotPath =
        createPreMigrationSnapshot(
          database,
          options.kind,
          currentVersion,
          options.latestVersion
        )


      console.log(
        `[database-migrations] Safety snapshot created: ${snapshotPath}`
      )

    }


    for (
      const migration
      of pendingMigrations
    ) {

      const beforeVersion =
        readUserVersion(
          database
        )


      if (
        migration.version !==
        beforeVersion +
          1
      ) {

        throw new Error(
          `Unexpected ${options.kind} migration sequence: database is at v${beforeVersion}, but the next migration is v${migration.version}.`
        )

      }


      console.log(
        `[database-migrations] Applying ${options.kind} migration v${migration.version}: ${migration.name}`
      )


      migration.run(
        database
      )


      const afterVersion =
        readUserVersion(
          database
        )


      if (
        afterVersion !==
        migration.version
      ) {

        throw new Error(
          `${options.kind} migration v${migration.version} completed without recording the expected schema version.`
        )

      }

    }


    console.log(
      `[database-migrations] ${options.kind} database is now at schema v${options.latestVersion}.`
    )


    if (
      snapshotPath
    ) {

      console.log(
        `[database-migrations] Pre-migration snapshot retained at: ${snapshotPath}`
      )

    }

  } finally {

    database.close()

  }

}


function applicationMigrationV1(
  database: DatabaseSync
) {

  database.exec(`
    PRAGMA foreign_keys = ON;
    BEGIN IMMEDIATE;

    CREATE TABLE IF NOT EXISTS archive_state (

      category TEXT NOT NULL,

      relative_path TEXT NOT NULL,

      favorite INTEGER NOT NULL DEFAULT 0,

      rating REAL,

      play_count INTEGER NOT NULL DEFAULT 0,

      last_watched TEXT,

      progress_seconds REAL NOT NULL DEFAULT 0,

      duration_seconds REAL,

      completed INTEGER NOT NULL DEFAULT 0,

      total_watch_seconds REAL NOT NULL DEFAULT 0,

      PRIMARY KEY (
        category,
        relative_path
      )

    );


    CREATE TABLE IF NOT EXISTS playlists (

      id INTEGER PRIMARY KEY AUTOINCREMENT,

      name TEXT NOT NULL,

      created_at TEXT NOT NULL,

      updated_at TEXT NOT NULL

    );


    CREATE TABLE IF NOT EXISTS playlist_items (

      id INTEGER PRIMARY KEY AUTOINCREMENT,

      playlist_id INTEGER NOT NULL,

      category TEXT NOT NULL,

      relative_path TEXT NOT NULL,

      position INTEGER NOT NULL,

      added_at TEXT NOT NULL,

      FOREIGN KEY (
        playlist_id
      )
      REFERENCES playlists(id)
      ON DELETE CASCADE,

      UNIQUE (
        playlist_id,
        category,
        relative_path
      )

    );

    PRAGMA user_version = 1;
    COMMIT;
  `)

}



function applicationMigrationV2(
  database: DatabaseSync
) {

  database.exec(`
    BEGIN IMMEDIATE;

    CREATE TABLE IF NOT EXISTS archive_offline_event (

      event_id TEXT PRIMARY KEY,

      processed_at TEXT NOT NULL
    );


    CREATE INDEX IF NOT EXISTS
      idx_archive_offline_event_processed_at
    ON archive_offline_event(
      processed_at
    );


    PRAGMA user_version = 2;
    COMMIT;
  `)

}


function getTableSql(
  database: DatabaseSync,
  tableName: string
) {

  const row =
    database
      .prepare(`
        SELECT
          sql
        FROM sqlite_master
        WHERE
          type = 'table'
          AND name = ?
      `)
      .get(
        tableName
      ) as
        {
          sql: string | null
        } |
        undefined


  return (
    row?.sql ??
    ''
  )

}


function getColumnNames(
  database: DatabaseSync,
  tableName: string
) {

  const rows =
    database
      .prepare(
        `PRAGMA table_info(${tableName})`
      )
      .all() as Array<{
        name: string
      }>


  return new Set(
    rows.map(
      (column) =>
        column.name
    )
  )

}


function catalogMigrationV1(
  database: DatabaseSync
) {

  database.exec(`
    PRAGMA foreign_keys = OFF;
    BEGIN IMMEDIATE;

    CREATE TABLE IF NOT EXISTS catalog_item (

      id INTEGER PRIMARY KEY AUTOINCREMENT,

      canonical_name TEXT NOT NULL,

      character TEXT,

      category TEXT NOT NULL,

      subcategory TEXT,

      release_date TEXT,

      rarity INTEGER,

      position TEXT,

      attribute TEXT,

      source TEXT,

      image_url TEXT,

      source_name TEXT,

      source_url TEXT,

      source_key TEXT,

      source_updated_at TEXT,

      manual_notes TEXT,

      memory_text TEXT,

      memory_text_source_url TEXT,

      created_at TEXT NOT NULL,

      updated_at TEXT NOT NULL

    );
  `)


  try {

    const catalogColumns =
      getColumnNames(
        database,
        'catalog_item'
      )


    if (
      !catalogColumns.has(
        'memory_text'
      )
    ) {

      database.exec(`
        ALTER TABLE catalog_item
        ADD COLUMN memory_text TEXT;
      `)

    }


    if (
      !catalogColumns.has(
        'memory_text_source_url'
      )
    ) {

      database.exec(`
        ALTER TABLE catalog_item
        ADD COLUMN memory_text_source_url TEXT;
      `)

    }


    const matchTableSql =
      getTableSql(
        database,
        'catalog_file_match'
      )


    if (
      !matchTableSql
    ) {

      database.exec(`
        CREATE TABLE catalog_file_match (

          id INTEGER PRIMARY KEY AUTOINCREMENT,

          catalog_item_id INTEGER NOT NULL,

          category TEXT NOT NULL,

          relative_path TEXT NOT NULL,

          match_method TEXT NOT NULL DEFAULT 'manual',

          confidence REAL,

          manually_confirmed INTEGER NOT NULL DEFAULT 0,

          created_at TEXT NOT NULL,

          updated_at TEXT NOT NULL,

          FOREIGN KEY (
            catalog_item_id
          )
          REFERENCES catalog_item (
            id
          )
          ON DELETE CASCADE,

          UNIQUE (
            catalog_item_id,
            category,
            relative_path
          )

        );
      `)

    } else {

      const hasOldConstraint =
        /UNIQUE\s*\(\s*category\s*,\s*relative_path\s*\)/i
          .test(
            matchTableSql
          )


      if (
        hasOldConstraint
      ) {

        database.exec(`
          CREATE TABLE catalog_file_match_new (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            catalog_item_id INTEGER NOT NULL,

            category TEXT NOT NULL,

            relative_path TEXT NOT NULL,

            match_method TEXT NOT NULL DEFAULT 'manual',

            confidence REAL,

            manually_confirmed INTEGER NOT NULL DEFAULT 0,

            created_at TEXT NOT NULL,

            updated_at TEXT NOT NULL,

            FOREIGN KEY (
              catalog_item_id
            )
            REFERENCES catalog_item (
              id
            )
            ON DELETE CASCADE,

            UNIQUE (
              catalog_item_id,
              category,
              relative_path
            )

          );

          INSERT OR IGNORE INTO catalog_file_match_new (
            id,
            catalog_item_id,
            category,
            relative_path,
            match_method,
            confidence,
            manually_confirmed,
            created_at,
            updated_at
          )
          SELECT
            id,
            catalog_item_id,
            category,
            relative_path,
            match_method,
            confidence,
            manually_confirmed,
            created_at,
            updated_at
          FROM catalog_file_match;

          DROP TABLE catalog_file_match;

          ALTER TABLE
            catalog_file_match_new
          RENAME TO
            catalog_file_match;
        `)

      }

    }


    database.exec(`
      CREATE INDEX IF NOT EXISTS
        catalog_item_category_index
      ON catalog_item (
        category
      );

      CREATE INDEX IF NOT EXISTS
        catalog_item_character_index
      ON catalog_item (
        character
      );

      CREATE INDEX IF NOT EXISTS
        catalog_item_name_index
      ON catalog_item (
        canonical_name
      );

      CREATE UNIQUE INDEX IF NOT EXISTS
        catalog_item_source_identity_index
      ON catalog_item (
        source_name,
        source_key
      )
      WHERE
        source_name IS NOT NULL
        AND source_key IS NOT NULL;

      CREATE INDEX IF NOT EXISTS
        catalog_file_match_item_index
      ON catalog_file_match (
        catalog_item_id
      );

      CREATE INDEX IF NOT EXISTS
        catalog_file_match_file_index
      ON catalog_file_match (
        category,
        relative_path
      );

      CREATE TABLE IF NOT EXISTS catalog_item_memory (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        archive_catalog_item_id INTEGER NOT NULL,

        memory_catalog_item_id INTEGER NOT NULL,

        relation_type TEXT NOT NULL DEFAULT 'unlock',

        created_at TEXT NOT NULL,

        updated_at TEXT NOT NULL,

        FOREIGN KEY (
          archive_catalog_item_id
        )
        REFERENCES catalog_item (
          id
        )
        ON DELETE CASCADE,

        FOREIGN KEY (
          memory_catalog_item_id
        )
        REFERENCES catalog_item (
          id
        )
        ON DELETE CASCADE,

        UNIQUE (
          archive_catalog_item_id,
          memory_catalog_item_id
        )

      );

      CREATE INDEX IF NOT EXISTS
        catalog_item_memory_archive_index
      ON catalog_item_memory (
        archive_catalog_item_id
      );

      CREATE INDEX IF NOT EXISTS
        catalog_item_memory_memory_index
      ON catalog_item_memory (
        memory_catalog_item_id
      );

      DELETE FROM catalog_file_match
      WHERE
        relative_path LIKE
          '%' || char(92) || '%'
        AND EXISTS (
          SELECT 1
          FROM catalog_file_match AS normalized
          WHERE
            normalized.id !=
              catalog_file_match.id
            AND normalized.catalog_item_id =
              catalog_file_match.catalog_item_id
            AND normalized.category =
              catalog_file_match.category
            AND normalized.relative_path =
              REPLACE(
                catalog_file_match.relative_path,
                char(92),
                '/'
              )
        );

      UPDATE catalog_file_match
      SET
        relative_path =
          REPLACE(
            relative_path,
            char(92),
            '/'
          )
      WHERE
        relative_path LIKE
          '%' || char(92) || '%';

      PRAGMA user_version = 1;
      COMMIT;
    `)

  } catch (error) {

    database.exec(`
      ROLLBACK;
    `)


    throw error

  } finally {

    database.exec(`
      PRAGMA foreign_keys = ON;
    `)

  }

}


const applicationMigrations:
  MigrationDefinition[] = [

  {
    version:
      1,

    name:
      'Register current application-state schema',

    run:
      applicationMigrationV1,
  },

  {
    version:
      2,

    name:
      'Add idempotent offline playback event ledger',

    run:
      applicationMigrationV2,
  },

]


const catalogMigrations:
  MigrationDefinition[] = [

  {
    version:
      1,

    name:
      'Register current metadata-catalog schema',

    run:
      catalogMigrationV1,
  },

]


let applicationReady =
  false


let catalogReady =
  false


export function ensureApplicationDatabaseMigrations() {

  if (
    applicationReady
  ) {

    return

  }


  runNumberedMigrations({
    kind:
      'application',

    databasePath:
      applicationDatabasePath,

    latestVersion:
      applicationDatabaseSchemaVersion,

    migrations:
      applicationMigrations,
  })


  applicationReady =
    true

}


export function ensureCatalogDatabaseMigrations() {

  if (
    catalogReady
  ) {

    return

  }


  runNumberedMigrations({
    kind:
      'metadata-catalog',

    databasePath:
      catalogDatabasePath,

    latestVersion:
      catalogDatabaseSchemaVersion,

    migrations:
      catalogMigrations,
  })


  catalogReady =
    true

}


export function getDatabaseMigrationStatus() {

  ensureDirectories()


  function readStatus(
    filePath: string,
    latestVersion: number
  ) {

    if (
      !fs.existsSync(
        filePath
      )
    ) {

      return {
        exists:
          false,

        currentVersion:
          0,

        latestVersion,

        upToDate:
          false,
      }

    }


    const database =
      new DatabaseSync(
        filePath
      )


    try {

      const currentVersion =
        readUserVersion(
          database
        )


      return {
        exists:
          true,

        currentVersion,

        latestVersion,

        upToDate:
          currentVersion ===
            latestVersion,
      }

    } finally {

      database.close()

    }

  }


  return {
    application:
      readStatus(
        applicationDatabasePath,
        applicationDatabaseSchemaVersion
      ),

    catalog:
      readStatus(
        catalogDatabasePath,
        catalogDatabaseSchemaVersion
      ),
  }

}
