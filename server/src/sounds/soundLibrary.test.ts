import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { Readable } from "node:stream";
import type { Sound } from "@ip-speaker-console/shared";
import Fastify from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ActivityService } from "../activity/activityService.js";
import { ActivityStore } from "../activity/activityStore.js";
import { EventBus } from "../events/eventBus.js";
import { IN_MEMORY, openDatabase } from "../storage/database.js";
import { buildTestWav } from "../testing/testWav.js";
import { BUILT_IN_SOUNDS_DIR } from "./builtInSounds.js";
import { SoundLibrary, type SoundUpload } from "./soundLibrary.js";
import { SoundStore } from "./soundStore.js";

const FORMAT = { sampleRate: 22_050, channels: 1, bitsPerSample: 16 };
const NOW = new Date("2026-11-18T10:00:00.000Z");

function upload(fileName: string, contents: Buffer | string, truncated = false): SoundUpload {
  const stream = Object.assign(Readable.from([contents]), { truncated });
  return { stream, fileName };
}

describe("SoundLibrary", () => {
  let db: DatabaseSync;
  let uploadsDir: string;
  let activity: ActivityService;
  let bus: EventBus;
  let stopped: string[];
  let announced: Sound[][];

  const createLibrary = async (builtInDir = BUILT_IN_SOUNDS_DIR) => {
    const log = Fastify({ logger: false }).log;
    const library = new SoundLibrary({
      store: new SoundStore(db),
      uploadsDir,
      builtInDir,
      player: { stopSound: async (id) => stopped.push(id) },
      activity,
      bus,
      log,
      now: () => NOW,
    });
    await library.load();
    return library;
  };

  /** Activity messages, newest first, with any detail in brackets. */
  const messages = () =>
    activity
      .list({ limit: 20 })
      .map(({ message, detail }) => (detail ? `${message} (${detail})` : message));

  beforeEach(() => {
    const log = Fastify({ logger: false }).log;
    db = openDatabase(IN_MEMORY);
    uploadsDir = mkdtempSync(path.join(tmpdir(), "isc-uploads-"));
    bus = new EventBus(log);
    activity = new ActivityService(new ActivityStore(db, 100), bus, log);
    stopped = [];
    announced = [];
    bus.on("sounds.changed", (sounds) => announced.push(sounds));
  });

  afterEach(() => {
    db.close();
    rmSync(uploadsDir, { recursive: true, force: true });
  });

  describe("built-in sounds", () => {
    it("loads them pinned, with their file details, in order", async () => {
      const library = await createLibrary();

      expect(library.list()).toEqual([
        {
          id: "test-tone",
          name: "Test tone",
          durationMs: 2000,
          fileName: "test-tone.wav",
          sizeBytes: 88_244,
          format: FORMAT,
          builtIn: true,
          pinned: true,
          addedAt: NOW.toISOString(),
        },
        expect.objectContaining({ id: "chime", durationMs: 2200, sizeBytes: 97_064 }),
        expect.objectContaining({ id: "alert", durationMs: 1100, sizeBytes: 48_554 }),
      ]);
      expect(library.find("chime")?.file).toBe(path.join(BUILT_IN_SOUNDS_DIR, "chime.wav"));
      expect(BUILT_IN_SOUNDS_DIR.split(path.sep).slice(-3)).toEqual(["server", "assets", "sounds"]);
    });

    it("remembers that one was unpinned after a restart", async () => {
      (await createLibrary()).update("chime", { pinned: false });
      const library = await createLibrary();

      expect(library.find("chime")?.pinned).toBe(false);
      expect(library.find("alert")?.pinned).toBe(true);
    });

    it("can't be renamed or deleted", async () => {
      const library = await createLibrary();

      expect(() => library.update("chime", { name: "Bell" })).toThrow(
        "Built-in sounds can't be renamed.",
      );
      await expect(library.remove("chime")).rejects.toMatchObject({
        statusCode: 403,
        message: "Built-in sounds can't be deleted.",
      });
      expect(library.find("chime")?.name).toBe("Chime");
    });

    it("leaves out ones whose file is missing or broken", async () => {
      const brokenDir = mkdtempSync(path.join(tmpdir(), "isc-built-in-"));
      writeFileSync(path.join(brokenDir, "chime.wav"), "not a wav file");
      try {
        expect((await createLibrary(brokenDir)).list()).toEqual([]);
      } finally {
        rmSync(brokenDir, { recursive: true, force: true });
      }
    });
  });

  describe("uploads", () => {
    it("adds a WAV file named after the file, unpinned, and records it", async () => {
      const library = await createLibrary();
      const sound = await library.add(upload("door_bell.wav", buildTestWav(1500)));

      expect(sound).toMatchObject({
        name: "door bell",
        fileName: "door_bell.wav",
        durationMs: 1500,
        builtIn: false,
        pinned: false,
      });
      expect(readdirSync(uploadsDir)).toEqual([`${sound.id}.wav`]);
      expect(library.find(sound.id)?.file).toBe(path.join(uploadsDir, `${sound.id}.wav`));
      expect(messages()[0]).toBe("Uploaded door bell (From door_bell.wav, 1.5 s long.)");
      expect(announced.at(-1)?.map(({ name }) => name)).toContain("door bell");
    });

    it("lists uploads after the built-in sounds, by name", async () => {
      const library = await createLibrary();
      await library.add(upload("zebra.wav", buildTestWav()));
      await library.add(upload("Apple.wav", buildTestWav()));

      expect(library.list().map(({ name }) => name)).toEqual([
        "Test tone",
        "Chime",
        "Alert",
        "Apple",
        "zebra",
      ]);
    });

    it("gives a copy a name of its own", async () => {
      const library = await createLibrary();
      const copy = await library.add(upload("chime.wav", buildTestWav()));

      expect(copy.name).toBe("chime (2)");
    });

    it("rejects a file that isn't a WAV, says why and keeps nothing", async () => {
      const library = await createLibrary();

      await expect(library.add(upload("song.mp3", "ID3 tagged audio"))).rejects.toMatchObject({
        statusCode: 400,
        message: "This is an MP3 file, not a WAV file. Convert it to WAV and try again.",
      });
      expect(readdirSync(uploadsDir)).toEqual([]);
      expect(messages()[0]).toMatch(/^Couldn't upload song.mp3 \(This is an MP3 file/u);
    });

    it("rejects a file that's over the size limit", async () => {
      const library = await createLibrary();

      await expect(library.add(upload("long.wav", buildTestWav(), true))).rejects.toMatchObject({
        statusCode: 413,
        message: "The file is over the 10 MB limit.",
      });
      expect(readdirSync(uploadsDir)).toEqual([]);
    });

    it("rejects a WAV file with no audio", async () => {
      const library = await createLibrary();

      await expect(library.add(upload("empty.wav", buildTestWav(0)))).rejects.toMatchObject({
        statusCode: 400,
        message: "The WAV file has no audio in it.",
      });
    });
  });

  describe("changes", () => {
    it("renames and pins a sound, recording each change", async () => {
      const library = await createLibrary();
      const { id } = await library.add(upload("bell.wav", buildTestWav()));

      expect(library.update(id, { name: "  Front   door  ", pinned: true })).toMatchObject({
        name: "Front door",
        pinned: true,
      });
      expect(messages().slice(0, 2)).toEqual([
        "Pinned Front door to Quick play",
        "Renamed bell to Front door",
      ]);
    });

    it("does nothing when nothing changes", async () => {
      const library = await createLibrary();
      const { id } = await library.add(upload("bell.wav", buildTestWav()));
      const before = announced.length;

      library.update(id, { name: "bell", pinned: false });
      expect(announced).toHaveLength(before);
      expect(messages()[0]).toMatch(/^Uploaded bell/u);
    });

    it("refuses a name that's taken, empty or too long", async () => {
      const library = await createLibrary();
      const { id } = await library.add(upload("bell.wav", buildTestWav()));

      expect(() => library.update(id, { name: "CHIME" })).toThrow(
        "There's already a sound called CHIME.",
      );
      expect(() => library.update(id, { name: "   " })).toThrow("Give the sound a name.");
      expect(() => library.update(id, { name: "x".repeat(61) })).toThrow(/60 characters/u);
      expect(library.find(id)?.name).toBe("bell");
    });

    it("deletes an upload and its file, stopping it first", async () => {
      const library = await createLibrary();
      const { id } = await library.add(upload("bell.wav", buildTestWav()));

      await library.remove(id);

      expect(library.find(id)).toBeUndefined();
      expect(stopped).toEqual([id]);
      expect(readdirSync(uploadsDir)).toEqual([]);
      expect(messages()[0]).toBe("Deleted bell");
    });

    it("says when a sound no longer exists", async () => {
      const library = await createLibrary();

      expect(() => library.update("gone", { pinned: true })).toThrow(/isn't on the device/u);
      await expect(library.remove("gone")).rejects.toMatchObject({
        statusCode: 404,
        message: "That sound isn't on the device. Refresh the page to see the current sounds.",
      });
    });
  });

  describe("startup", () => {
    it("drops sounds whose file is gone and deletes files left behind", async () => {
      const first = await createLibrary();
      const kept = await first.add(upload("kept.wav", buildTestWav()));
      const lost = await first.add(upload("lost.wav", buildTestWav()));
      rmSync(path.join(uploadsDir, `${lost.id}.wav`));
      const orphan = "0b8e3a52-6a0d-4a8e-9a37-1f1f1f1f1f1f.wav";
      writeFileSync(path.join(uploadsDir, orphan), "left behind");
      writeFileSync(path.join(uploadsDir, "half.uploading"), "interrupted");
      writeFileSync(path.join(uploadsDir, "notes.txt"), "someone else's file");

      const library = await createLibrary();

      expect(library.find(kept.id)).toBeDefined();
      expect(library.find(lost.id)).toBeUndefined();
      expect(messages()).toContain(
        "Removed lost from the library (Its file was missing from the device.)",
      );
      expect(readdirSync(uploadsDir).toSorted()).toEqual([`${kept.id}.wav`, "notes.txt"]);
      expect(existsSync(path.join(uploadsDir, orphan))).toBe(false);
    });
  });
});
