import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { runMigrations } from "./migrations.js";

/** Pass as the file to keep the database in memory, for tests. */
export const IN_MEMORY = ":memory:";

/**
 * Opens (creating if needed) the console's SQLite database and brings its schema up to date.
 *
 * WAL journaling keeps the file consistent if power is cut mid-write: at worst the last few
 * writes are lost, but the database is never left corrupt. The busy timeout covers the brief
 * moments when a checkpoint holds a lock.
 */
export function openDatabase(file: string): DatabaseSync {
  if (file !== IN_MEMORY) {
    mkdirSync(path.dirname(file), { recursive: true });
  }

  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
  `);
  runMigrations(db);
  return db;
}
