import { execFile } from "node:child_process";
import type { AudioDriverName } from "@ip-speaker-console/shared";

/** Sets the speaker's output volume. */
export interface AudioMixer {
  /** Sets the volume from 0 to 100 percent. Rejects with a message written for people. */
  setVolume(percent: number): Promise<void>;
}

/** Keeps the volume in memory only; used with the mock audio driver. */
export class MockAudioMixer implements AudioMixer {
  volume: number | undefined;

  setVolume(percent: number): Promise<void> {
    this.volume = percent;
    return Promise.resolve();
  }
}

export interface AmixerOptions {
  /** The ALSA mixer control to change, such as "Master" or "PCM". */
  control: string;
  /** The program to run. Tests substitute a stand-in. */
  command?: string;
  /** Builds the program's arguments. */
  args?: (control: string, percent: number) => string[];
}

const AMIXER_TIMEOUT_MS = 5000;

/** Sets the volume of one ALSA mixer control by running `amixer`. */
export class AmixerAudioMixer implements AudioMixer {
  readonly #control: string;
  readonly #command: string;
  readonly #args: (control: string, percent: number) => string[];

  constructor({
    control,
    command = "amixer",
    args = (name, percent) => ["-q", "sset", name, `${percent}%`],
  }: AmixerOptions) {
    this.#control = control;
    this.#command = command;
    this.#args = args;
  }

  setVolume(percent: number): Promise<void> {
    return new Promise((resolve, reject) => {
      execFile(
        this.#command,
        this.#args(this.#control, percent),
        { timeout: AMIXER_TIMEOUT_MS },
        (error, _stdout, stderr) => {
          if (!error) {
            resolve();
            return;
          }
          const code = (error as NodeJS.ErrnoException).code;
          const reason =
            code === "ENOENT"
              ? `The ${this.#command} program isn't installed on the device.`
              : stderr.trim() || error.message;
          reject(new Error(reason));
        },
      );
    });
  }
}

export function createAudioMixer(driver: AudioDriverName, control: string): AudioMixer {
  return driver === "aplay" ? new AmixerAudioMixer({ control }) : new MockAudioMixer();
}
