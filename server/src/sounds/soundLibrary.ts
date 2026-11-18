import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, readdir, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import type { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { SOUND_UPLOAD_MAX_BYTES, type Sound, type SoundChange } from "@ip-speaker-console/shared";
import type { FastifyBaseLogger } from "fastify";
import type { ActivityService } from "../activity/activityService.js";
import { readWavFile, WavFormatError } from "../audio/wav.js";
import type { EventBus } from "../events/eventBus.js";
import { ApiError } from "../http/errors.js";
import { BUILT_IN_SOUNDS, BUILT_IN_SOUNDS_DIR } from "./builtInSounds.js";
import {
  nameFromFileName,
  soundNameProblem,
  tidyFileName,
  tidySoundName,
  uniqueSoundName,
} from "./soundNames.js";
import type { SoundStore } from "./soundStore.js";

/** A sound plus where its file is on disk. The path stays on the server. */
export interface LibrarySound extends Sound {
  file: string;
}

/** What the library needs from playback: deleting a sound that's playing stops it first. */
export interface SoundPlayer {
  stopSound(soundId: string): Promise<unknown>;
}

interface SoundLibraryOptions {
  store: SoundStore;
  /** Where uploaded sounds are kept, as <id>.wav. Created if missing. */
  uploadsDir: string;
  builtInDir?: string;
  player: SoundPlayer;
  activity: ActivityService;
  bus: EventBus;
  log: FastifyBaseLogger;
  now?: () => Date;
}

/** An upload as it arrives: the file's contents and the name it had on the computer. */
export interface SoundUpload {
  stream: Readable & { truncated?: boolean };
  fileName: string;
}

const UPLOAD_FILE = /^[0-9a-f-]{36}\.wav$/u;
const TEMP_SUFFIX = ".uploading";

/**
 * The sounds the speaker can play: the built-in ones shipped with the console and the ones
 * people upload. Names, pins and file details live in the database; uploaded files are stored
 * under generated IDs. Every change is recorded as activity and announced on the event bus.
 */
export class SoundLibrary {
  readonly #store: SoundStore;
  readonly #uploadsDir: string;
  readonly #builtInDir: string;
  readonly #player: SoundPlayer;
  readonly #activity: ActivityService;
  readonly #bus: EventBus;
  readonly #log: FastifyBaseLogger;
  readonly #now: () => Date;

  constructor(options: SoundLibraryOptions) {
    this.#store = options.store;
    this.#uploadsDir = options.uploadsDir;
    this.#builtInDir = options.builtInDir ?? BUILT_IN_SOUNDS_DIR;
    this.#player = options.player;
    this.#activity = options.activity;
    this.#bus = options.bus;
    this.#log = options.log;
    this.#now = options.now ?? (() => new Date());
  }

  /**
   * Gets the library ready at startup: reads the built-in sounds, drops sounds whose file has
   * gone, and deletes files left behind by an interrupted upload or delete.
   */
  async load(): Promise<void> {
    await mkdir(this.#uploadsDir, { recursive: true });
    await this.#loadBuiltIns();
    await this.#checkUploads();
  }

  list(): Sound[] {
    return this.#store.list();
  }

  find(id: string): LibrarySound | undefined {
    const sound = this.#store.get(id);
    return sound && { ...sound, file: this.#fileOf(sound) };
  }

  /**
   * Saves an uploaded WAV file as a new sound, named after the file. Rejects with an ApiError
   * saying why if the file is too big or isn't a WAV file the speaker can play.
   */
  async add({ stream, fileName: rawFileName }: SoundUpload): Promise<Sound> {
    const fileName = tidyFileName(rawFileName);
    const id = randomUUID();
    const tempFile = path.join(this.#uploadsDir, `${id}${TEMP_SUFFIX}`);

    try {
      await pipeline(stream, createWriteStream(tempFile));
      if (stream.truncated) {
        throw new ApiError(
          413,
          "file_too_large",
          `The file is over the ${SOUND_UPLOAD_MAX_BYTES / 1024 / 1024} MB limit.`,
        );
      }
      const wav = await readWavFile(tempFile).catch((error: unknown) => {
        throw error instanceof WavFormatError
          ? new ApiError(400, "invalid_wav", error.message)
          : error;
      });
      if (wav.durationMs === 0) {
        throw new ApiError(400, "invalid_wav", "The WAV file has no audio in it.");
      }
      const { size } = await stat(tempFile);

      const sound: Sound = {
        id,
        name: uniqueSoundName(nameFromFileName(fileName), (name) => this.#store.hasName(name)),
        durationMs: wav.durationMs,
        fileName,
        sizeBytes: size,
        format: {
          sampleRate: wav.sampleRate,
          channels: wav.channels,
          bitsPerSample: wav.bitsPerSample,
        },
        builtIn: false,
        pinned: false,
        addedAt: this.#now().toISOString(),
      };
      await rename(tempFile, this.#fileOf(sound));
      this.#store.insert(sound);

      this.#activity.record({
        category: "files",
        outcome: "success",
        message: `Uploaded ${sound.name}`,
        detail: `From ${fileName}, ${formatSeconds(sound.durationMs)} long.`,
      });
      this.#announce();
      return sound;
    } catch (error) {
      await rm(tempFile, { force: true });
      this.#activity.record({
        category: "files",
        outcome: "failure",
        message: `Couldn't upload ${fileName}`,
        detail: error instanceof ApiError ? error.message : "The file couldn't be saved.",
      });
      throw error;
    }
  }

  /** Renames, pins or unpins a sound. Built-in sounds can be pinned but not renamed. */
  update(id: string, change: SoundChange): Sound {
    const sound = this.#require(id);
    const name = change.name === undefined ? sound.name : tidySoundName(change.name);
    const pinned = change.pinned ?? sound.pinned;
    if (name === sound.name && pinned === sound.pinned) {
      return sound;
    }

    if (name !== sound.name) {
      this.#rename(sound, name);
    }

    if (pinned !== sound.pinned) {
      this.#store.setPinned(id, pinned);
      this.#activity.record({
        category: "files",
        outcome: "success",
        message: pinned ? `Pinned ${name} to Quick play` : `Unpinned ${name} from Quick play`,
      });
    }

    this.#announce();
    return this.#require(id);
  }

  /** Deletes an uploaded sound and its file, stopping it first if it's playing. */
  async remove(id: string): Promise<void> {
    const sound = this.#require(id);
    if (sound.builtIn) {
      throw new ApiError(403, "built_in_sound", "Built-in sounds can't be deleted.");
    }

    // Take it out of the library first, so nobody can start it while it's being deleted.
    this.#store.delete(id);
    this.#announce();
    await this.#player.stopSound(id);

    const file = this.#fileOf(sound);
    await rm(file, { force: true }).catch((error: unknown) => {
      // The sound is gone from the library either way; the file is removed at next startup.
      this.#log.warn({ err: error, file }, "Couldn't delete a sound's file");
    });

    this.#activity.record({
      category: "files",
      outcome: "success",
      message: `Deleted ${sound.name}`,
    });
  }

  #rename(sound: Sound, name: string): void {
    if (sound.builtIn) {
      throw new ApiError(403, "built_in_sound", "Built-in sounds can't be renamed.");
    }
    const problem = soundNameProblem(name);
    if (problem) {
      throw new ApiError(400, "invalid_name", problem);
    }
    if (this.#store.hasName(name, sound.id)) {
      throw new ApiError(409, "name_taken", `There's already a sound called ${name}.`);
    }

    this.#store.rename(sound.id, name);
    this.#activity.record({
      category: "files",
      outcome: "success",
      message: `Renamed ${sound.name} to ${name}`,
    });
  }

  #require(id: string): Sound {
    const sound = this.#store.get(id);
    if (!sound) {
      throw new ApiError(
        404,
        "sound_not_found",
        "That sound isn't on the device. Refresh the page to see the current sounds.",
      );
    }
    return sound;
  }

  #fileOf(sound: Sound): string {
    return sound.builtIn
      ? path.join(this.#builtInDir, sound.fileName)
      : path.join(this.#uploadsDir, `${sound.id}.wav`);
  }

  #announce(): void {
    this.#bus.emit("sounds.changed", this.list());
  }

  async #loadBuiltIns(): Promise<void> {
    for (const { id, name, fileName } of BUILT_IN_SOUNDS) {
      const file = path.join(this.#builtInDir, fileName);
      try {
        const wav = await readWavFile(file);
        const { size } = await stat(file);
        this.#store.saveBuiltIn(
          {
            id,
            name,
            fileName,
            durationMs: wav.durationMs,
            sizeBytes: size,
            format: {
              sampleRate: wav.sampleRate,
              channels: wav.channels,
              bitsPerSample: wav.bitsPerSample,
            },
          },
          this.#now(),
        );
      } catch (error) {
        this.#log.error({ err: error, file }, `Couldn't load the built-in sound "${name}"`);
        this.#store.delete(id);
      }
    }
  }

  async #checkUploads(): Promise<void> {
    const uploads = this.#store.list().filter((sound) => !sound.builtIn);
    const expectedFiles = new Set(uploads.map((sound) => `${sound.id}.wav`));
    const files = new Set(await readdir(this.#uploadsDir));

    for (const sound of uploads) {
      if (!files.has(`${sound.id}.wav`)) {
        this.#store.delete(sound.id);
        this.#activity.record({
          category: "files",
          outcome: "warning",
          message: `Removed ${sound.name} from the library`,
          detail: "Its file was missing from the device.",
        });
      }
    }

    // Only files the console made: anything else someone put in the folder is left alone.
    for (const file of files) {
      const leftOver =
        file.endsWith(TEMP_SUFFIX) || (UPLOAD_FILE.test(file) && !expectedFiles.has(file));
      if (leftOver) {
        await rm(path.join(this.#uploadsDir, file), { force: true });
        this.#log.info({ file }, "Deleted a sound file that isn't in the library");
      }
    }
  }
}

function formatSeconds(durationMs: number): string {
  const seconds = durationMs / 1000;
  return seconds < 60
    ? `${seconds.toFixed(1)} s`
    : `${Math.floor(seconds / 60)} min ${Math.round(seconds % 60)} s`;
}
