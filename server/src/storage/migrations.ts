import type { DatabaseSync } from "node:sqlite";

interface Migration {
  /** Stored in SQLite's user_version after the migration runs. Must increase by one each time. */
  version: number;
  description: string;
  sql: string;
}

/**
 * Schema changes, applied in order. Never edit a migration that has shipped; add a new one.
 * Sounds (M5) and settings (M6) add their tables here when those milestones land.
 */
export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    description: "Create the activity log",
    // AUTOINCREMENT stops IDs from being reused after old rows are pruned, so an ID always
    // identifies one event and "older than ID n" paging stays correct.
    sql: `
      CREATE TABLE activity (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        category TEXT NOT NULL,
        outcome TEXT NOT NULL,
        message TEXT NOT NULL,
        detail TEXT
      );
      CREATE INDEX activity_category ON activity (category, id);
      CREATE INDEX activity_outcome ON activity (outcome, id);
    `,
  },
];

export const LATEST_SCHEMA_VERSION = MIGRATIONS.at(-1)?.version ?? 0;

/**
 * Applies every migration newer than the database's current version, each in its own
 * transaction, so a failure leaves the database at the last good version.
 */
export function runMigrations(db: DatabaseSync): void {
  const current = readSchemaVersion(db);

  if (current > LATEST_SCHEMA_VERSION) {
    throw new Error(
      `The database is at schema version ${current}, but this software only knows up to ` +
        `version ${LATEST_SCHEMA_VERSION}. It was probably written by a newer release; ` +
        "install that release or restore a matching backup.",
    );
  }

  for (const migration of MIGRATIONS) {
    if (migration.version <= current) {
      continue;
    }
    db.exec("BEGIN");
    try {
      db.exec(migration.sql);
      db.exec(`PRAGMA user_version = ${migration.version}`);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Database migration ${migration.version} (${migration.description}) failed: ${reason}`,
        { cause: error },
      );
    }
  }
}

export function readSchemaVersion(db: DatabaseSync): number {
  const row = db.prepare("PRAGMA user_version").get() as { user_version: number } | undefined;
  return row?.user_version ?? 0;
}
