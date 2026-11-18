import { describe, expect, it } from "vitest";
import { parseWavHeader, WavFormatError } from "./wav.js";

interface TestWav {
  formatTag?: number;
  channels?: number;
  sampleRate?: number;
  bitsPerSample?: number;
  dataBytes?: number;
  /** Chunks placed between the format and data chunks, such as metadata. */
  extraChunks?: Array<{ id: string; size: number }>;
}

function buildWav({
  formatTag = 1,
  channels = 1,
  sampleRate = 8000,
  bitsPerSample = 16,
  dataBytes = 16_000,
  extraChunks = [],
}: TestWav = {}): Buffer {
  const blockAlign = (channels * bitsPerSample) / 8;
  const fmt = Buffer.alloc(24);
  fmt.write("fmt ", 0);
  fmt.writeUInt32LE(16, 4);
  fmt.writeUInt16LE(formatTag, 8);
  fmt.writeUInt16LE(channels, 10);
  fmt.writeUInt32LE(sampleRate, 12);
  fmt.writeUInt32LE(sampleRate * blockAlign, 16);
  fmt.writeUInt16LE(blockAlign, 20);
  fmt.writeUInt16LE(bitsPerSample, 22);

  const extras = extraChunks.map(({ id, size }) => {
    const chunk = Buffer.alloc(8 + size + (size % 2));
    chunk.write(id, 0);
    chunk.writeUInt32LE(size, 4);
    return chunk;
  });

  const data = Buffer.alloc(8 + dataBytes);
  data.write("data", 0);
  data.writeUInt32LE(dataBytes, 4);

  const body = Buffer.concat([fmt, ...extras, data]);
  const riff = Buffer.alloc(12);
  riff.write("RIFF", 0);
  riff.writeUInt32LE(4 + body.length, 4);
  riff.write("WAVE", 8);
  return Buffer.concat([riff, body]);
}

describe("parseWavHeader", () => {
  it("reads the format and works out the length", () => {
    expect(parseWavHeader(buildWav())).toEqual({
      channels: 1,
      sampleRate: 8000,
      bitsPerSample: 16,
      durationMs: 1000,
    });
  });

  it("skips metadata chunks, including odd-sized ones", () => {
    const wav = buildWav({ extraChunks: [{ id: "LIST", size: 7 }], dataBytes: 8000 });
    expect(parseWavHeader(wav).durationMs).toBe(500);
  });

  it("handles stereo audio", () => {
    const wav = buildWav({ channels: 2, sampleRate: 44_100, dataBytes: 44_100 * 4 * 3 });
    expect(parseWavHeader(wav)).toMatchObject({ channels: 2, durationMs: 3000 });
  });

  it("caps the length at the data the file holds", () => {
    const wav = buildWav({ dataBytes: 16_000 });
    wav.writeUInt32LE(0xffff_ffff, wav.length - 16_000 - 4);
    expect(parseWavHeader(wav).durationMs).toBe(1000);
  });

  it("rejects files that aren't WAV", () => {
    expect(() => parseWavHeader(Buffer.from("ID3 not a wav file"))).toThrow(WavFormatError);
  });

  it("rejects compressed audio with a message saying what to do", () => {
    expect(() => parseWavHeader(buildWav({ formatTag: 0x55 }))).toThrow(/uncompressed PCM/);
  });

  it("rejects a file with no audio data", () => {
    const wav = buildWav().subarray(0, 36);
    expect(() => parseWavHeader(wav)).toThrow("The WAV file has no audio data.");
  });
});
