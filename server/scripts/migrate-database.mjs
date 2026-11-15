import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const TARGET_SCHEMA_VERSION = 2;
const databasePath = path.resolve(
  process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'kids_media.db')
);
const backupDirectory = path.resolve(
  process.env.DATABASE_BACKUP_DIR || path.join(path.dirname(databasePath), 'backups')
);
const expectedRows = process.env.EXPECTED_MEDIA_ROWS
  ? Number(process.env.EXPECTED_MEDIA_ROWS)
  : null;

if (!fs.existsSync(databasePath)) {
  throw new Error(`Database not found: ${databasePath}`);
}

const createBackup = async (db) => {
  fs.mkdirSync(backupDirectory, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(
    backupDirectory,
    `kids_media-before-schema-v${TARGET_SCHEMA_VERSION}-${stamp}.db`
  );
  if (typeof db.backup !== 'function') {
    throw new Error('better-sqlite3 backup API is unavailable');
  }
  await db.backup(backupPath);
  return backupPath;
};

// Every browse index has the stable score/id suffix used by the API. The
// partial predicate keeps episodes out of browse indexes while matching the
// API's explicit media_type != episode predicate.
const phase2Indexes = [
  `CREATE INDEX IF NOT EXISTS idx_browse_stimulation_order
     ON kids_media(COALESCE(stimulation_score, 2147483647), id)
     WHERE media_type != 'episode'`,
  `CREATE INDEX IF NOT EXISTS idx_browse_type_order
     ON kids_media(media_type, COALESCE(stimulation_score, 2147483647), id)
     WHERE media_type != 'episode'`,
  `CREATE INDEX IF NOT EXISTS idx_browse_age_order
     ON kids_media(target_age_group, COALESCE(stimulation_score, 2147483647), id)
     WHERE media_type != 'episode'`,
  `CREATE INDEX IF NOT EXISTS idx_browse_language_order
     ON kids_media(LOWER(language), COALESCE(stimulation_score, 2147483647), id)
     WHERE media_type != 'episode'`,
  `CREATE INDEX IF NOT EXISTS idx_episode_parent_order
     ON kids_media(
       parent_show_id,
       media_type,
       COALESCE(CAST(json_extract(metadata_json, '$.season') AS INTEGER), 1),
       COALESCE(CAST(json_extract(metadata_json, '$.number') AS INTEGER), 0),
       id
     )
     WHERE media_type = 'episode'`,
];

const verify = (db) => {
  const foreignKeyErrors = db.prepare('PRAGMA foreign_key_check').all();
  const integrity = {
    kidsMedia: db.pragma('integrity_check(kids_media)', { simple: true }),
    qualityIssues: db.pragma('integrity_check(media_quality_issues)', { simple: true }),
  };
  const totalRows = db.prepare('SELECT COUNT(*) AS count FROM kids_media').get().count;
  const result = {
    schemaVersion: db.pragma('user_version', { simple: true }),
    totalRows,
    highRows: db.prepare("SELECT COUNT(*) AS count FROM kids_media WHERE stimulation_label = 'high'").get().count,
    browsableRows: db.prepare('SELECT COUNT(*) AS count FROM browsable_media').get().count,
    boundaryRows: db.prepare('SELECT COUNT(*) AS count FROM high_stim_boundary').get().count,
    ftsRows: db.prepare('SELECT COUNT(*) AS count FROM kids_media_fts').get().count,
    qualityIssues: db.prepare('SELECT issue_code, COUNT(*) AS count FROM media_quality_issues GROUP BY issue_code ORDER BY issue_code').all(),
    indexNames: db.pragma('index_list(kids_media)').map((index) => index.name),
    integrity,
    foreignKeyErrors,
  };

  if (expectedRows !== null && totalRows !== expectedRows) {
    throw new Error(`Row count mismatch: expected ${expectedRows}, found ${totalRows}`);
  }
  if (Object.values(result.integrity).some((value) => value !== 'ok')) {
    throw new Error(`SQLite integrity check failed: ${JSON.stringify(result.integrity)}`);
  }
  if (result.foreignKeyErrors.length > 0) {
    throw new Error(`Foreign-key check failed: ${JSON.stringify(result.foreignKeyErrors)}`);
  }
  if (result.totalRows !== result.ftsRows) {
    throw new Error(`FTS row count mismatch: ${result.totalRows} vs ${result.ftsRows}`);
  }
  if (result.highRows !== 0 || result.boundaryRows !== 0) {
    throw new Error(`High-stimulation content is still present: ${result.highRows}`);
  }
  for (const statement of phase2Indexes) {
    const indexName = statement.match(/CREATE INDEX IF NOT EXISTS (\w+)/)?.[1];
    if (indexName && !result.indexNames.includes(indexName)) {
      throw new Error(`Missing Phase 2 index: ${indexName}`);
    }
  }
  return result;
};

const db = new Database(databasePath);
db.pragma('busy_timeout = 60000');
db.pragma('foreign_keys = ON');

try {
  const currentVersion = db.pragma('user_version', { simple: true });
  if (currentVersion > TARGET_SCHEMA_VERSION) {
    throw new Error(`Database version ${currentVersion} is newer than supported version ${TARGET_SCHEMA_VERSION}`);
  }

  if (currentVersion === TARGET_SCHEMA_VERSION) {
    console.log(JSON.stringify({
      status: 'already_applied',
      databasePath,
      verification: verify(db),
    }, null, 2));
    db.close();
  } else if (currentVersion !== 1) {
    throw new Error(`Database version ${currentVersion} requires Phase 1 schema version 1 before Phase 2`);
  } else {
    const preflightForeignKeyErrors = db.prepare('PRAGMA foreign_key_check').all();
    if (preflightForeignKeyErrors.length > 0) {
      throw new Error(`Pre-migration foreign-key check failed: ${JSON.stringify(preflightForeignKeyErrors)}`);
    }

    const backupPath = await createBackup(db);
    db.exec('BEGIN IMMEDIATE');
    try {
      for (const statement of phase2Indexes) db.exec(statement);
      db.pragma('user_version = 2');
      db.exec('COMMIT');

      const verification = verify(db);
      console.log(JSON.stringify({
        status: 'migrated',
        databasePath,
        backupPath,
        verification,
      }, null, 2));
      db.close();
    } catch (error) {
      try {
        db.exec('ROLLBACK');
      } catch {
        // Preserve the original migration error.
      }
      throw error;
    }
  }
} catch (error) {
  try {
    db.close();
  } catch {
    // Preserve the original migration error.
  }
  throw error;
}
