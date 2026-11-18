import { describe, expect, it } from "vitest";
import { formatChannels, formatFileSize, formatSampleRate, formatSoundFormat } from "./sound";

describe("sound formatting", () => {
  it.each([
    [22_050, "22.05 kHz"],
    [44_100, "44.1 kHz"],
    [48_000, "48 kHz"],
    [8000, "8 kHz"],
  ])("formats a %d Hz sample rate as %s", (hertz, expected) => {
    expect(formatSampleRate(hertz)).toBe(expected);
  });

  it.each([
    [1, "Mono"],
    [2, "Stereo"],
    [6, "6 channels"],
  ])("names %d channels %s", (channels, expected) => {
    expect(formatChannels(channels)).toBe(expected);
  });

  it.each([
    [512, "512 B"],
    [97_064, "95 KB"],
    [3_565_158, "3.4 MB"],
  ])("formats %d bytes as %s", (bytes, expected) => {
    expect(formatFileSize(bytes)).toBe(expected);
  });

  it("describes a format", () => {
    expect(formatSoundFormat({ sampleRate: 44_100, bitsPerSample: 16, channels: 2 })).toBe(
      "44.1 kHz · 16-bit · Stereo",
    );
  });
});
