import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BUNDLED_SOUNDS_DIR, loadBundledSounds } from "./soundLibrary.js";

const silentLog = {
  error: vi.fn<(...args: unknown[]) => void>(),
} as unknown as Parameters<typeof loadBundledSounds>[0];

describe("loadBundledSounds", () => {
  let tempDir: string | undefined;

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("loads every bundled sound with its file details", async () => {
    const library = await loadBundledSounds(silentLog);
    const format = { sampleRate: 22_050, channels: 1, bitsPerSample: 16 };

    expect(library.list()).toEqual([
      {
        id: "test-tone",
        name: "Test tone",
        durationMs: 2000,
        fileName: "test-tone.wav",
        sizeBytes: 88_244,
        format,
      },
      {
        id: "chime",
        name: "Chime",
        durationMs: 2200,
        fileName: "chime.wav",
        sizeBytes: 97_064,
        format,
      },
      {
        id: "alert",
        name: "Alert",
        durationMs: 1100,
        fileName: "alert.wav",
        sizeBytes: 48_554,
        format,
      },
    ]);
    expect(library.find("chime")?.file).toBe(path.join(BUNDLED_SOUNDS_DIR, "chime.wav"));
    expect(BUNDLED_SOUNDS_DIR.split(path.sep).slice(-3)).toEqual(["server", "assets", "sounds"]);
    expect(library.find("missing")).toBeUndefined();
  });

  it("leaves out sounds whose file is missing or broken", async () => {
    tempDir = mkdtempSync(path.join(tmpdir(), "isc-sounds-"));
    writeFileSync(path.join(tempDir, "chime.wav"), "not a wav file");

    const library = await loadBundledSounds(silentLog, tempDir);

    expect(library.list()).toEqual([]);
    expect(silentLog.error).toHaveBeenCalledTimes(3);
  });
});
