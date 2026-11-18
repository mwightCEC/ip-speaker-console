import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { IN_MEMORY, openDatabase } from "./database.js";
import { LATEST_SCHEMA_VERSION, readSchemaVersion, runMigrations } from "./migrations.js";

describe("runMigrations", () => {
  it("brings a new database to the latest schema", () => {
    const db = openDatabase(IN_MEMORY);
    expect(readSchemaVersion(db)).toBe(LATEST_SCHEMA_VERSION);
    db.close();
  });

  it("does nothing when run again", () => {
    const db = openDatabase(IN_MEMORY);
    expect(() => runMigrations(db)).not.toThrow();
    expect(readSchemaVersion(db)).toBe(LATEST_SCHEMA_VERSION);
    db.close();
  });

  it("refuses a database written by a newer release", () => {
    const db = new DatabaseSync(IN_MEMORY);
    db.exec(`PRAGMA user_version = ${LATEST_SCHEMA_VERSION + 1}`);
    expect(() => runMigrations(db)).toThrow(/newer release/);
    db.close();
  });
});
