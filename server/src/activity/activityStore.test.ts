import type { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { IN_MEMORY, openDatabase } from "../storage/database.js";
import { ActivityStore } from "./activityStore.js";

describe("ActivityStore", () => {
  let db: DatabaseSync;
  let store: ActivityStore;

  beforeEach(() => {
    db = openDatabase(IN_MEMORY);
    store = new ActivityStore(db, 100);
  });

  afterEach(() => db.close());

  it("stores an event and returns it with an ID and timestamp", () => {
    const event = store.insert(
      { category: "playback", outcome: "success", message: "Played chime.wav" },
      new Date("2026-11-18T10:00:00Z"),
    );

    expect(event).toEqual({
      id: 1,
      timestamp: "2026-11-18T10:00:00.000Z",
      category: "playback",
      outcome: "success",
      message: "Played chime.wav",
    });
    expect(store.list({ limit: 10 })).toEqual([event]);
  });

  it("keeps the detail when there is one", () => {
    const event = store.insert({
      category: "files",
      outcome: "failure",
      message: "Upload rejected",
      detail: "promo.mp3 isn't a WAV file",
    });
    expect(event.detail).toBe("promo.mp3 isn't a WAV file");
  });

  it("lists newest first and pages with `before`", () => {
    for (let index = 1; index <= 5; index += 1) {
      store.insert({ category: "device", outcome: "info", message: `Event ${index}` });
    }

    const firstPage = store.list({ limit: 2 });
    expect(firstPage.map((event) => event.message)).toEqual(["Event 5", "Event 4"]);

    const secondPage = store.list({ limit: 2, before: firstPage[1]?.id ?? 0 });
    expect(secondPage.map((event) => event.message)).toEqual(["Event 3", "Event 2"]);
  });

  it("filters by category and outcome", () => {
    store.insert({ category: "playback", outcome: "success", message: "a" });
    store.insert({ category: "playback", outcome: "failure", message: "b" });
    store.insert({ category: "files", outcome: "failure", message: "c" });

    expect(store.list({ limit: 10, category: "playback" }).map((e) => e.message)).toEqual([
      "b",
      "a",
    ]);
    expect(store.list({ limit: 10, outcome: "failure" }).map((e) => e.message)).toEqual(["c", "b"]);
    expect(
      store.list({ limit: 10, category: "playback", outcome: "failure" }).map((e) => e.message),
    ).toEqual(["b"]);
  });

  it("deletes the oldest events beyond the retention limit", () => {
    for (let index = 1; index <= 130; index += 1) {
      store.insert({ category: "device", outcome: "info", message: `Event ${index}` });
    }

    const kept = store.list({ limit: 200 });
    expect(kept).toHaveLength(100);
    expect(kept[0]?.message).toBe("Event 130");
    expect(kept.at(-1)?.message).toBe("Event 31");
  });
});
