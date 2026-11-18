import type {
  NowPlaying,
  PlaybackEnding,
  PlaybackResult,
  PlaybackState,
} from "@ip-speaker-console/shared";
import type { ActivityService } from "../activity/activityService.js";
import type { NewActivity } from "../activity/activityStore.js";
import type { AudioDriver } from "../audio/audioDriver.js";
import type { EventBus } from "../events/eventBus.js";
import type { LibrarySound } from "../sounds/soundLibrary.js";

interface PlaybackServiceOptions {
  driver: AudioDriver;
  activity: ActivityService;
  bus: EventBus;
  /** Tests replace the clock. */
  now?: () => number;
}

/** A sound that's playing, plus how to stop it and why it was stopped. */
interface ActivePlayback {
  sound: LibrarySound;
  startedAtMs: number;
  controller: AbortController;
  /** Set before aborting, so the ending is reported correctly. */
  stopReason?: { ending: "stopped" } | { ending: "replaced"; by: string };
  /** Settles (never rejects) once the sound has ended and the result is recorded. */
  done: Promise<void>;
}

/**
 * Plays one sound at a time. Playing a sound while another is playing stops the current one
 * first, so an urgent announcement never waits. Every start and ending is recorded as activity
 * and announced on the event bus.
 */
export class PlaybackService {
  readonly #driver: AudioDriver;
  readonly #activity: ActivityService;
  readonly #bus: EventBus;
  readonly #now: () => number;
  #current: ActivePlayback | undefined;
  #lastResult: PlaybackResult | undefined;

  constructor({ driver, activity, bus, now = Date.now }: PlaybackServiceOptions) {
    this.#driver = driver;
    this.#activity = activity;
    this.#bus = bus;
    this.#now = now;
  }

  get state(): PlaybackState {
    const current = this.#current;
    return {
      ...(current && { nowPlaying: this.#nowPlaying(current) }),
      ...(this.#lastResult && { lastResult: this.#lastResult }),
    };
  }

  /** Starts playing a sound, first stopping whatever is playing. Resolves once it has started. */
  async play(sound: LibrarySound): Promise<PlaybackState> {
    // Loop because another request may start a sound while this one waits for the speaker.
    while (this.#current) {
      const current = this.#current;
      current.stopReason ??= { ending: "replaced", by: sound.name };
      current.controller.abort();
      await current.done;
    }

    this.#start(sound);
    return this.state;
  }

  /** Stops the sound that's playing, if any. Resolves once it has stopped. */
  async stop(): Promise<PlaybackState> {
    const current = this.#current;
    if (current) {
      current.stopReason ??= { ending: "stopped" };
      current.controller.abort();
      await current.done;
    }
    return this.state;
  }

  #start(sound: LibrarySound): void {
    const controller = new AbortController();
    const active: ActivePlayback = {
      sound,
      startedAtMs: this.#now(),
      controller,
      done: Promise.resolve(),
    };

    active.done = this.#driver
      .play(sound.file, { durationMs: sound.durationMs, signal: controller.signal })
      .then(
        () => this.#finish(active, active.stopReason?.ending ?? "finished"),
        (error: unknown) =>
          this.#finish(active, "failed", error instanceof Error ? error.message : String(error)),
      );

    this.#current = active;
    this.#activity.record({
      category: "playback",
      outcome: "info",
      message: `Started playing ${sound.name}`,
    });
    this.#bus.emit("playback.changed", this.state);
  }

  #finish(active: ActivePlayback, ending: PlaybackEnding, error?: string): void {
    const { sound } = active;
    this.#current = undefined;
    this.#lastResult = {
      soundId: sound.id,
      soundName: sound.name,
      ending,
      endedAt: new Date(this.#now()).toISOString(),
      ...(error !== undefined && { error }),
    };

    this.#activity.record(describeEnding(sound.name, active, ending, error));
    this.#bus.emit("playback.changed", this.state);
  }

  #nowPlaying({ sound, startedAtMs }: ActivePlayback): NowPlaying {
    return {
      soundId: sound.id,
      soundName: sound.name,
      startedAt: new Date(startedAtMs).toISOString(),
      durationMs: sound.durationMs,
      elapsedMs: Math.min(Math.max(this.#now() - startedAtMs, 0), sound.durationMs),
    };
  }
}

function describeEnding(
  name: string,
  { stopReason }: ActivePlayback,
  ending: PlaybackEnding,
  error: string | undefined,
): NewActivity {
  switch (ending) {
    case "finished":
      return { category: "playback", outcome: "success", message: `Finished playing ${name}` };
    case "stopped":
      return { category: "playback", outcome: "info", message: `Stopped ${name}` };
    case "replaced":
      return {
        category: "playback",
        outcome: "info",
        message: `Stopped ${name}`,
        detail: `Replaced by ${stopReason?.ending === "replaced" ? stopReason.by : "another sound"}.`,
      };
    case "failed":
      return {
        category: "playback",
        outcome: "failure",
        message: `Couldn't play ${name}`,
        ...(error !== undefined && { detail: error }),
      };
  }
}
