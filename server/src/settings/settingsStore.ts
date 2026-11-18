import type { DatabaseSync, StatementSync } from "node:sqlite";

/**
 * Device settings, stored one per row as JSON so each setting can have its own shape. Callers
 * own validation: a value read back is whatever was last written under that key.
 */
export class SettingsStore {
  readonly #select: StatementSync;
  readonly #upsert: StatementSync;

  constructor(db: DatabaseSync) {
    this.#select = db.prepare("SELECT value FROM settings WHERE key = ?");
    this.#upsert = db.prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
      ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `);
  }

  /** Returns the stored value, or undefined if the setting has never been saved. */
  get(key: string): unknown {
    const row = this.#select.get(key) as { value: string } | undefined;
    return row === undefined ? undefined : JSON.parse(row.value);
  }

  set(key: string, value: unknown, now: Date = new Date()): void {
    this.#upsert.run(key, JSON.stringify(value), now.toISOString());
  }
}
