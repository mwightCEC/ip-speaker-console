import type { SoundFormat } from "@ip-speaker-console/shared";

/** Formats a sample rate in kilohertz, such as "44.1 kHz" or "48 kHz". */
export function formatSampleRate(hertz: number): string {
  return `${Number((hertz / 1000).toFixed(2))} kHz`;
}

/** Names a channel count: "Mono", "Stereo" or, for example, "6 channels". */
export function formatChannels(channels: number): string {
  if (channels === 1) return "Mono";
  if (channels === 2) return "Stereo";
  return `${channels} channels`;
}

/** Formats a file size, such as "512 B", "95 KB" or "3.4 MB". */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Describes how a sound is encoded, such as "22.05 kHz · 16-bit · Mono". */
export function formatSoundFormat({ sampleRate, bitsPerSample, channels }: SoundFormat): string {
  return [formatSampleRate(sampleRate), `${bitsPerSample}-bit`, formatChannels(channels)].join(
    " · ",
  );
}
