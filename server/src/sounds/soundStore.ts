import type { DatabaseSync } from "node:sqlite";
import type { Sound } from "@ip-speaker-console/shared";

interface SoundRow {
  id: string;
  name: string;
  file_name: string;
  built_in: number;
  pinned: number;
  duration_ms: number;
  size_bytes: number;
  sample_rate: number;
  channels: number;
  bits_per_sample: number;
  added_at: string;
}

/** A built-in sound's details, read from its file at startup. */
export type BuiltInSoundDetails = Omit<Sound, "builtIn" | "pinned" | "addedAt">;

/**
 * The sounds table. Built-in sounds come first in the order they were added; uploaded sounds
 * follow in name order.
 */
export class SoundStore {
  readonly #db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.#db = db;
  }

  list(): Sound[] {
    const rows = this.#db
      .prepare(
        `SELECT * FROM sounds
         ORDER BY built_in DESC, CASE WHEN built_in = 1 THEN rowid END, name COLLATE NOCASE, id`,
      )
      .all() as unknown as SoundRow[];
    return rows.map(toSound);
  }

  get(id: string): Sound | undefined {
    const row = this.#db.prepare("SELECT * FROM sounds WHERE id = ?").get(id) as
      | SoundRow
      | undefined;
    return row && toSound(row);
  }

  /** Whether another sound already has this name, ignoring case. */
  hasName(name: string, exceptId?: string): boolean {
    const row = this.#db
      .prepare("SELECT 1 FROM sounds WHERE name = ? COLLATE NOCASE AND id IS NOT ?")
      .get(name, exceptId ?? null);
    return row !== undefined;
  }

  insert(sound: Sound): void {
    this.#db
      .prepare(
        `INSERT INTO sounds (id, name, file_name, built_in, pinned, duration_ms, size_bytes,
           sample_rate, channels, bits_per_sample, added_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        sound.id,
        sound.name,
        sound.fileName,
        sound.builtIn ? 1 : 0,
        sound.pinned ? 1 : 0,
        sound.durationMs,
        sound.sizeBytes,
        sound.format.sampleRate,
        sound.format.channels,
        sound.format.bitsPerSample,
        sound.addedAt,
      );
  }

  /**
   * Adds a built-in sound, pinned, the first time it's seen. Later it refreshes the details in
   * case the file changed in an update, but keeps whether it's pinned.
   */
  saveBuiltIn(sound: BuiltInSoundDetails, now: Date): void {
    this.#db
      .prepare(
        `INSERT INTO sounds (id, name, file_name, built_in, pinned, duration_ms, size_bytes,
           sample_rate, channels, bits_per_sample, added_at)
         VALUES (?, ?, ?, 1, 1, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET
           name = excluded.name,
           file_name = excluded.file_name,
           built_in = 1,
           duration_ms = excluded.duration_ms,
           size_bytes = excluded.size_bytes,
           sample_rate = excluded.sample_rate,
           channels = excluded.channels,
           bits_per_sample = excluded.bits_per_sample`,
      )
      .run(
        sound.id,
        sound.name,
        sound.fileName,
        sound.durationMs,
        sound.sizeBytes,
        sound.format.sampleRate,
        sound.format.channels,
        sound.format.bitsPerSample,
        now.toISOString(),
      );
  }

  rename(id: string, name: string): void {
    this.#db.prepare("UPDATE sounds SET name = ? WHERE id = ?").run(name, id);
  }

  setPinned(id: string, pinned: boolean): void {
    this.#db.prepare("UPDATE sounds SET pinned = ? WHERE id = ?").run(pinned ? 1 : 0, id);
  }

  delete(id: string): void {
    this.#db.prepare("DELETE FROM sounds WHERE id = ?").run(id);
  }
}

function toSound(row: SoundRow): Sound {
  return {
    id: row.id,
    name: row.name,
    durationMs: row.duration_ms,
    fileName: row.file_name,
    sizeBytes: row.size_bytes,
    format: {
      sampleRate: row.sample_rate,
      channels: row.channels,
      bitsPerSample: row.bits_per_sample,
    },
    builtIn: row.built_in === 1,
    pinned: row.pinned === 1,
    addedAt: row.added_at,
  };
}
