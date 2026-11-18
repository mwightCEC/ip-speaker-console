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
import { registerSameOriginCheck } from "./http/sameOrigin.js";
import { registerRealtime } from "./realtime/websocketHub.js";
import { registerPlaybackRoutes } from "./playback/playbackRoutes.js";
import { PlaybackService } from "./playback/playbackService.js";
import { registerHealthRoutes } from "./routes/health.js";
import { SoundLibrary } from "./sounds/soundLibrary.js";
import { registerSoundRoutes } from "./sounds/soundRoutes.js";
import { SoundStore } from "./sounds/soundStore.js";
import { registerSettingsRoutes } from "./settings/settingsRoutes.js";
import { SettingsService } from "./settings/settingsService.js";
import { SettingsStore } from "./settings/settingsStore.js";
import { openDatabase } from "./storage/database.js";
import { BootState } from "./system/bootState.js";
import { createSystemDriver } from "./system/createSystemDriver.js";
import { registerDeviceRoutes } from "./system/deviceRoutes.js";
import { RebootService } from "./system/rebootService.js";
import { registerOfflineGate, simulateReboot } from "./system/simulatedReboot.js";
import type { SystemDriver } from "./system/systemDriver.js";
import { APP_VERSION } from "./version.js";
import { registerVolumeRoutes } from "./volume/volumeRoutes.js";
import { VolumeService } from "./volume/volumeService.js";

const DATABASE_FILE_NAME = "console.db";
const SOUNDS_DIR_NAME = "sounds";

export interface AppOptions {
  config: ServerConfig;
  /** Absolute path to the built client. When the folder doesn't exist, only the API is served. */
  clientDistDir: string;
  /** Overrides the database location; tests pass IN_MEMORY. Defaults to <dataDir>/console.db. */
  databaseFile?: string;
  /** Overrides where uploaded sounds are kept. Defaults to <dataDir>/sounds. */
  soundsDir?: string;
  /** Overrides the driver chosen by `config.audioDriver`; tests pass one they control. */
  audioDriver?: AudioDriver;
  /** Overrides the mixer chosen by `config.audioDriver`. */
  audioMixer?: AudioMixer;
  /** Overrides the driver chosen by `config.systemDriver`. */
  systemDriver?: SystemDriver;
  /** How long the mock system driver's simulated reboot takes; tests shorten it. */
  simulatedRebootMs?: number;
  /** Pause between answering a reboot request and rebooting; tests shorten it. */
  rebootDelayMs?: number;
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
  soundsDir = path.join(config.dataDir, SOUNDS_DIR_NAME),
  audioDriver = createAudioDriver(config.audioDriver),
  audioMixer = createAudioMixer(config.audioDriver, config.mixerControl),
  systemDriver,
  simulatedRebootMs,
  rebootDelayMs,
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

  const boot = new BootState();
  // The WebSocket hub is registered further down; the simulated reboot needs to reach it.
  let disconnectAll: (() => void) | undefined;
  const system =
    systemDriver ??
    createSystemDriver(config.systemDriver, {
      simulateReboot: () =>
        simulateReboot({
          boot,
          activity,
          disconnectAll: () => disconnectAll?.(),
          ...(simulatedRebootMs !== undefined && { durationMs: simulatedRebootMs }),
        }),
    });

  const playback = new PlaybackService({ driver: audioDriver, activity, bus });
  const library = new SoundLibrary({
    store: new SoundStore(db),
    uploadsDir: soundsDir,
    player: playback,
    activity,
    bus,
    log: app.log,
  });
  await library.load();
  const settingsStore = new SettingsStore(db);
  const volume = new VolumeService({
    mixer: audioMixer,
    settings: settingsStore,
    activity,
    bus,
    log: app.log,
  });
  await volume.restore();
  const settings = new SettingsService({ store: settingsStore, driver: system, activity, bus });
  await settings.load();
  const reboot = new RebootService({
    driver: system,
    boot,
    activity,
    bus,
    stopPlayback: () => playback.stop(),
    ...(rebootDelayMs !== undefined && { delayMs: rebootDelayMs }),
  });

  // Stop any sound first: it records its ending in the database, and ends an aplay process
  // that would otherwise keep playing after the server exits.
  app.addHook("onClose", async () => {
    await playback.stop();
    db.close();
  });

  registerErrorHandler(app);
  registerSameOriginCheck(app);
  registerOfflineGate(app, boot);
  const realtime = await registerRealtime(app, {
    bus,
    activity,
    playback,
    volume,
    library,
    settings,
    boot,
    serverVersion: APP_VERSION,
    audioDriver: audioDriver.name,
  });
  disconnectAll = realtime.disconnectAll;
  await registerHealthRoutes(app, { config, boot });
  await registerActivityRoutes(app, activity);
  await registerSoundRoutes(app, library);
  await registerPlaybackRoutes(app, { playback, library });
  await registerVolumeRoutes(app, volume);
  await registerSettingsRoutes(app, settings);
  await registerDeviceRoutes(app, { driver: system, reboot, config });
  await registerClientApp(app, clientDistDir);

  return app;
}
