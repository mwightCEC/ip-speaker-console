import type { DatabaseSync, SQLInputValue, StatementSync } from "node:sqlite";
import type { ActivityCategory, ActivityEvent, ActivityOutcome } from "@ip-speaker-console/shared";

export interface NewActivity {
  category: ActivityCategory;
  outcome: ActivityOutcome;
  message: string;
  detail?: string;
}

export interface ActivityQuery {
  limit: number;
  /** Only events with an ID below this, for paging back through older events. */
  before?: number;
  category?: ActivityCategory;
  outcome?: ActivityOutcome;
}

interface ActivityRow {
  id: number;
  timestamp: string;
  category: ActivityCategory;
  outcome: ActivityOutcome;
  message: string;
  detail: string | null;
}

/** Reads and writes the activity table. Keeps only the newest `retention` events. */
export class ActivityStore {
  readonly #db: DatabaseSync;
  readonly #retention: number;
  readonly #insert: StatementSync;
  readonly #prune: StatementSync;

  constructor(db: DatabaseSync, retention: number) {
    this.#db = db;
    this.#retention = retention;
    this.#insert = db.prepare(
      `INSERT INTO activity (timestamp, category, outcome, message, detail)
       VALUES (?, ?, ?, ?, ?)
       RETURNING id, timestamp, category, outcome, message, detail`,
    );
    this.#prune = db.prepare("DELETE FROM activity WHERE id <= ?");
  }

  insert(input: NewActivity, now: Date = new Date()): ActivityEvent {
    const row = this.#insert.get(
      now.toISOString(),
      input.category,
      input.outcome,
      input.message,
      input.detail ?? null,
    ) as unknown as ActivityRow;

    // IDs are consecutive (AUTOINCREMENT, and only this prune deletes rows), so everything at or
    // below newId - retention is outside the window to keep.
    this.#prune.run(row.id - this.#retention);
    return toEvent(row);
  }

  /** Newest first. */
  list(query: ActivityQuery): ActivityEvent[] {
    const conditions: string[] = [];
    const params: SQLInputValue[] = [];

    if (query.before !== undefined) {
      conditions.push("id < ?");
      params.push(query.before);
    }
    if (query.category !== undefined) {
      conditions.push("category = ?");
      params.push(query.category);
    }
    if (query.outcome !== undefined) {
      conditions.push("outcome = ?");
      params.push(query.outcome);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = this.#db
      .prepare(`SELECT * FROM activity ${where} ORDER BY id DESC LIMIT ?`)
      .all(...params, query.limit) as unknown as ActivityRow[];
    return rows.map(toEvent);
  }
}

function toEvent(row: ActivityRow): ActivityEvent {
  const event: ActivityEvent = {
    id: row.id,
    timestamp: row.timestamp,
    category: row.category,
    outcome: row.outcome,
    message: row.message,
  };
  if (row.detail !== null) {
    event.detail = row.detail;
  }
  return event;
}
