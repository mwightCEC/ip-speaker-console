import path from "node:path";
import Fastify, { type FastifyInstance } from "fastify";
import { registerActivityRoutes } from "./activity/activityRoutes.js";
import { ActivityService } from "./activity/activityService.js";
import { ActivityStore } from "./activity/activityStore.js";
import type { AudioDriver } from "./audio/audioDriver.js";
import { createAudioMixer, type AudioMixer } from "./audio/audioMixer.js";
import { createAudioDriver } from "./audio/createAudioDriver.js";
import { registerClientApp } from "./client-app.js";
import type { ServerConfig } from "./config.js";
import { EventBus } from "./events/eventBus.js";
import { registerErrorHandler } from "./http/errors.js";
import { registerRealtime } from "./realtime/websocketHub.js";
import { registerPlaybackRoutes } from "./playback/playbackRoutes.js";
import { PlaybackService } from "./playback/playbackService.js";
import { registerHealthRoutes } from "./routes/health.js";
import { loadBundledSounds } from "./sounds/soundLibrary.js";
import { registerSoundRoutes } from "./sounds/soundRoutes.js";
import { SettingsStore } from "./settings/settingsStore.js";
import { openDatabase } from "./storage/database.js";
import { APP_VERSION } from "./version.js";
import { registerVolumeRoutes } from "./volume/volumeRoutes.js";
import { VolumeService } from "./volume/volumeService.js";

const DATABASE_FILE_NAME = "console.db";

export interface AppOptions {
  config: ServerConfig;
  /** Absolute path to the built client. When the folder doesn't exist, only the API is served. */
  clientDistDir: string;
  /** Overrides the database location; tests pass IN_MEMORY. Defaults to <dataDir>/console.db. */
  databaseFile?: string;
  /** Overrides the driver chosen by `config.audioDriver`; tests pass one they control. */
  audioDriver?: AudioDriver;
  /** Overrides the mixer chosen by `config.audioDriver`. */
  audioMixer?: AudioMixer;
  /** Set to false in tests to keep output quiet. */
  logger?: boolean;
}

declare module "fastify" {
  interface FastifyInstance {
    /** Records activity and lists the log. Use this for every event worth showing users. */
    activity: ActivityService;
  }
}

/**
 * Builds the Fastify application and its services without starting to listen, so tests can
 * use `inject` and `injectWS`. Closing the app closes the database.
 */
export async function buildApp({
  config,
  clientDistDir,
  databaseFile = path.join(config.dataDir, DATABASE_FILE_NAME),
  audioDriver = createAudioDriver(config.audioDriver),
  audioMixer = createAudioMixer(config.audioDriver, config.mixerControl),
  logger = true,
}: AppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: logger ? { level: config.logLevel } : false,
  });

  const db = openDatabase(databaseFile);

  const bus = new EventBus(app.log);
  const activity = new ActivityService(
    new ActivityStore(db, config.activityRetention),
    bus,
    app.log,
  );
  app.decorate("activity", activity);

  const library = await loadBundledSounds(app.log);
  const playback = new PlaybackService({ driver: audioDriver, activity, bus });
  const volume = new VolumeService({
    mixer: audioMixer,
    settings: new SettingsStore(db),
    activity,
    bus,
    log: app.log,
  });
  await volume.restore();

  // Stop any sound first: it records its ending in the database, and ends an aplay process
  // that would otherwise keep playing after the server exits.
  app.addHook("onClose", async () => {
    await playback.stop();
    db.close();
  });

  registerErrorHandler(app);
  await registerRealtime(app, {
    bus,
    activity,
    playback,
    volume,
    serverVersion: APP_VERSION,
    audioDriver: audioDriver.name,
  });
  await registerHealthRoutes(app, config);
  await registerActivityRoutes(app, activity);
  await registerSoundRoutes(app, library);
  await registerPlaybackRoutes(app, { playback, library });
  await registerVolumeRoutes(app, volume);
  await registerClientApp(app, clientDistDir);

  return app;
}
