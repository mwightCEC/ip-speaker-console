import { spawn } from "node:child_process";
import type { AudioDriver, PlayOptions } from "./audioDriver.js";

/** Keep the end of aplay's error output; the last lines say what went wrong. */
const MAX_ERROR_OUTPUT_CHARS = 500;

export interface AplayOptions {
  /** The program to run. Tests substitute a stand-in. */
  command?: string;
  /** Builds the program's arguments for a file. */
  args?: (file: string) => string[];
}

/** Plays sounds through ALSA by running `aplay`, one process per sound. */
export class AplayAudioDriver implements AudioDriver {
  readonly name = "aplay";
  readonly #command: string;
  readonly #args: (file: string) => string[];

  constructor({ command = "aplay", args = (file) => ["-q", "--", file] }: AplayOptions = {}) {
    this.#command = command;
    this.#args = args;
  }

  play(file: string, { signal }: PlayOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal.aborted) {
        resolve();
        return;
      }

      const child = spawn(this.#command, this.#args(file), {
        stdio: ["ignore", "ignore", "pipe"],
      });
      let errorOutput = "";
      const stop = (): void => {
        child.kill("SIGTERM");
      };

      signal.addEventListener("abort", stop, { once: true });
      child.stderr.setEncoding("utf8");
      child.stderr.on("data", (chunk: string) => {
        errorOutput = (errorOutput + chunk).slice(-MAX_ERROR_OUTPUT_CHARS);
      });

      child.once("error", (error: NodeJS.ErrnoException) => {
        signal.removeEventListener("abort", stop);
        reject(
          new Error(
            error.code === "ENOENT"
              ? `The ${this.#command} program isn't installed on the device.`
              : `Couldn't start ${this.#command}: ${error.message}`,
          ),
        );
      });

      child.once("close", (code) => {
        signal.removeEventListener("abort", stop);
        if (code === 0 || signal.aborted) {
          resolve();
          return;
        }
        const reason = errorOutput.trim() || `${this.#command} exited with code ${String(code)}.`;
        reject(new Error(reason));
      });
    });
  }
}
