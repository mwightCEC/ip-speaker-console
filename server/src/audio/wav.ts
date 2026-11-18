import { open } from "node:fs/promises";

/** What the console needs to know about a WAV file. */
export interface WavInfo {
  channels: number;
  sampleRate: number;
  bitsPerSample: number;
  durationMs: number;
}

/** Thrown when a file isn't a WAV file the speaker can play. The message is written for people. */
export class WavFormatError extends Error {
  override name = "WavFormatError";
}

// The format and data chunk headers sit near the start of the file. Any metadata chunks before
// them are small, so this is plenty without reading the audio itself.
const HEADER_READ_BYTES = 64 * 1024;

const FORMAT_PCM = 0x0001;
const FORMAT_IEEE_FLOAT = 0x0003;
const FORMAT_EXTENSIBLE = 0xfffe;
const SUPPORTED_FORMATS = new Set([FORMAT_PCM, FORMAT_IEEE_FLOAT, FORMAT_EXTENSIBLE]);

/** Reads and checks the header of a WAV file. Throws WavFormatError if it can't be played. */
export async function readWavFile(file: string): Promise<WavInfo> {
  const handle = await open(file, "r");
  try {
    const { size } = await handle.stat();
    const buffer = Buffer.alloc(Math.min(size, HEADER_READ_BYTES));
    await handle.read(buffer, 0, buffer.length, 0);
    return parseWavHeader(buffer, size);
  } finally {
    await handle.close();
  }
}

/**
 * Parses a WAV header. `fileSize` is the size of the whole file, which may be larger than
 * `buffer`; it caps the audio length when a header claims more data than the file holds.
 */
export function parseWavHeader(buffer: Buffer, fileSize = buffer.length): WavInfo {
  if (
    buffer.length < 12 ||
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WAVE"
  ) {
    throw new WavFormatError(notWavMessage(buffer));
  }

  let format: FormatChunk | undefined;
  let offset = 12;

  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const bodyStart = offset + 8;

    if (chunkId === "fmt ") {
      format = readFormatChunk(buffer, bodyStart, chunkSize);
    } else if (chunkId === "data") {
      if (!format) {
        throw new WavFormatError("The WAV file's audio comes before its format description.");
      }
      const dataBytes = Math.min(chunkSize, fileSize - bodyStart);
      const bytesPerSecond = format.sampleRate * format.blockAlign;
      return {
        channels: format.channels,
        sampleRate: format.sampleRate,
        bitsPerSample: format.bitsPerSample,
        durationMs: Math.round((dataBytes / bytesPerSecond) * 1000),
      };
    }

    // Chunks are padded to an even length.
    offset = bodyStart + chunkSize + (chunkSize % 2);
  }

  throw new WavFormatError("The WAV file has no audio data.");
}

interface FormatChunk {
  channels: number;
  sampleRate: number;
  bitsPerSample: number;
  /** Bytes per sample frame (one sample for every channel). */
  blockAlign: number;
}

function readFormatChunk(buffer: Buffer, start: number, size: number): FormatChunk {
  if (size < 16 || start + 16 > buffer.length) {
    throw new WavFormatError("The WAV file's format description is incomplete.");
  }

  const formatTag = buffer.readUInt16LE(start);
  const channels = buffer.readUInt16LE(start + 2);
  const sampleRate = buffer.readUInt32LE(start + 4);
  const blockAlign = buffer.readUInt16LE(start + 12);
  const bitsPerSample = buffer.readUInt16LE(start + 14);

  if (!SUPPORTED_FORMATS.has(formatTag)) {
    throw new WavFormatError(
      "The WAV file is compressed. Save it as uncompressed PCM audio and try again.",
    );
  }
  if (channels === 0 || sampleRate === 0 || blockAlign === 0 || bitsPerSample === 0) {
    throw new WavFormatError("The WAV file's format description is invalid.");
  }

  return { channels, sampleRate, bitsPerSample, blockAlign };
}

/** Recognises other common audio files by their first bytes, to say what was uploaded instead. */
const OTHER_AUDIO_FORMATS: readonly { name: string; matches: (buffer: Buffer) => boolean }[] = [
  {
    name: "an MP3",
    matches: (buffer) =>
      buffer.toString("ascii", 0, 3) === "ID3" ||
      (buffer.length >= 2 && buffer[0] === 0xff && ((buffer[1] ?? 0) & 0xe0) === 0xe0),
  },
  { name: "an Ogg", matches: (buffer) => buffer.toString("ascii", 0, 4) === "OggS" },
  { name: "a FLAC", matches: (buffer) => buffer.toString("ascii", 0, 4) === "fLaC" },
  { name: "an M4A or MP4", matches: (buffer) => buffer.toString("ascii", 4, 8) === "ftyp" },
  { name: "an AIFF", matches: (buffer) => buffer.toString("ascii", 0, 4) === "FORM" },
];

function notWavMessage(buffer: Buffer): string {
  const other = OTHER_AUDIO_FORMATS.find((format) => format.matches(buffer));
  return other
    ? `This is ${other.name} file, not a WAV file. Convert it to WAV and try again.`
    : "This isn't a WAV file.";
}
