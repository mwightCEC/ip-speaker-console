import type { AudioDriver, PlayOptions } from "./audioDriver.js";

/** Pretends to play each sound for as long as it lasts, without making any noise. */
export class MockAudioDriver implements AudioDriver {
  readonly name = "mock";

  play(_file: string, { durationMs, signal }: PlayOptions): Promise<void> {
    return new Promise((resolve) => {
      if (signal.aborted) {
        resolve();
        return;
      }
      const timer = setTimeout(finish, durationMs);
      signal.addEventListener("abort", finish, { once: true });

      function finish(): void {
        clearTimeout(timer);
        signal.removeEventListener("abort", finish);
        resolve();
      }
    });
  }
}
