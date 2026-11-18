import { describe, expect, it } from "vitest";
import {
  nameFromFileName,
  soundNameProblem,
  tidyFileName,
  tidySoundName,
  uniqueSoundName,
} from "./soundNames.js";

describe("sound names", () => {
  it("tidies spaces", () => {
    expect(tidySoundName("  Front \t door \n")).toBe("Front door");
  });

  it("explains what's wrong with a name", () => {
    expect(soundNameProblem("Chime")).toBeUndefined();
    expect(soundNameProblem("")).toBe("Give the sound a name.");
    expect(soundNameProblem("x".repeat(61))).toMatch(/60 characters/u);
    expect(soundNameProblem("bell\u0007")).toMatch(/can't be shown/u);
  });

  it("names an upload after its file", () => {
    expect(nameFromFileName("door_bell.wav")).toBe("door bell");
    expect(nameFromFileName("Fire drill.final.WAV")).toBe("Fire drill.final");
    expect(nameFromFileName(".wav")).toBe("Untitled sound");
    expect(nameFromFileName(`${"x".repeat(80)}.wav`)).toHaveLength(60);
  });

  it("keeps only the file's own name", () => {
    expect(tidyFileName(String.raw`C:\Users\me\bell.wav`)).toBe("bell.wav");
    expect(tidyFileName("../../etc/passwd")).toBe("passwd");
    expect(tidyFileName("")).toBe("sound.wav");
  });

  it("numbers a name that's taken", () => {
    const taken = new Set(["Bell", "Bell (2)"]);
    expect(uniqueSoundName("Bell", (name) => taken.has(name))).toBe("Bell (3)");
    expect(uniqueSoundName("Gong", (name) => taken.has(name))).toBe("Gong");
    const long = "x".repeat(60);
    expect(uniqueSoundName(long, (name) => name === long)).toBe(`${"x".repeat(56)} (2)`);
  });
});
