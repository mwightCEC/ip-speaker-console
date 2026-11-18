import { describe, expect, it } from "vitest";
import { AmixerAudioMixer } from "./audioMixer.js";

/** Runs a Node one-liner in place of amixer, so the tests work on any machine. */
const mixerRunning = (script: string) =>
  new AmixerAudioMixer({
    control: "Master",
    command: process.execPath,
    args: () => ["-e", script],
  });

describe("AmixerAudioMixer", () => {
  it("passes the control and volume to amixer", () => {
    const calls: string[][] = [];
    const mixer = new AmixerAudioMixer({
      control: "PCM",
      command: process.execPath,
      args: (control, percent) => {
        calls.push(["-q", "sset", control, `${percent}%`]);
        return ["-e", "process.exit(0)"];
      },
    });

    return mixer.setVolume(65).then(() => {
      expect(calls).toEqual([["-q", "sset", "PCM", "65%"]]);
    });
  });

  it("rejects with amixer's error output when it fails", async () => {
    const mixer = mixerRunning(
      "process.stderr.write(\"amixer: Unable to find simple control 'Master',0\"); process.exit(1)",
    );
    await expect(mixer.setVolume(50)).rejects.toThrow("Unable to find simple control 'Master',0");
  });

  it("explains when amixer isn't installed", async () => {
    const mixer = new AmixerAudioMixer({ control: "Master", command: "isc-no-such-mixer" });
    await expect(mixer.setVolume(50)).rejects.toThrow(
      "The isc-no-such-mixer program isn't installed on the device.",
    );
  });
});
