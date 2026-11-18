import { describe, expect, it } from "vitest";
import { AplayAudioDriver } from "./aplayAudioDriver.js";

/** Runs a Node one-liner in place of aplay, so the tests work on any machine. */
function driverRunning(script: string): AplayAudioDriver {
  return new AplayAudioDriver({ command: process.execPath, args: () => ["-e", script] });
}

const play = (driver: AplayAudioDriver, signal = new AbortController().signal) =>
  driver.play("sound.wav", { durationMs: 1000, signal });

describe("AplayAudioDriver", () => {
  it("resolves when the player exits successfully", async () => {
    await expect(play(driverRunning("process.exit(0)"))).resolves.toBeUndefined();
  });

  it("rejects with the player's error output when it fails", async () => {
    const driver = driverRunning(
      "process.stderr.write('aplay: main:831: audio open error: Device or resource busy\n'); process.exit(1)",
    );
    await expect(play(driver)).rejects.toThrow("audio open error: Device or resource busy");
  });

  it("stops the player and resolves when aborted", async () => {
    const controller = new AbortController();
    const playing = play(driverRunning("setTimeout(() => {}, 60_000)"), controller.signal);

    setTimeout(() => controller.abort(), 100);
    await expect(playing).resolves.toBeUndefined();
  });

  it("explains when the player isn't installed", async () => {
    const driver = new AplayAudioDriver({ command: "isc-no-such-player" });
    await expect(play(driver)).rejects.toThrow(
      "The isc-no-such-player program isn't installed on the device.",
    );
  });
});
