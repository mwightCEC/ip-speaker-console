import fastifyWebsocket from "@fastify/websocket";
import {
  SNAPSHOT_ACTIVITY_LIMIT,
  type AudioDriverName,
  WS_PATH,
  type ServerMessage,
  type SnapshotMessage,
} from "@ip-speaker-console/shared";
import type { FastifyInstance } from "fastify";
import type { WebSocket } from "ws";
import type { ActivityService } from "../activity/activityService.js";
import type { EventBus } from "../events/eventBus.js";
import type { PlaybackService } from "../playback/playbackService.js";
import type { SettingsService } from "../settings/settingsService.js";
import type { SoundLibrary } from "../sounds/soundLibrary.js";
import type { BootState } from "../system/bootState.js";
import type { VolumeService } from "../volume/volumeService.js";

/** How often to ping clients; one that hasn't answered by the next ping is disconnected. */
const HEARTBEAT_INTERVAL_MS = 30_000;
/** The console only receives small control messages from browsers. */
const MAX_INCOMING_MESSAGE_BYTES = 16 * 1024;

interface RealtimeOptions {
  bus: EventBus;
  activity: ActivityService;
  playback: PlaybackService;
  volume: VolumeService;
  library: SoundLibrary;
  settings: SettingsService;
  boot: BootState;
  serverVersion: string;
  audioDriver: AudioDriverName;
  heartbeatIntervalMs?: number;
}

/**
 * Pushes device events to browsers. Every connection first receives a full snapshot, so a
 * client that reconnects after an outage is immediately up to date, then receives each change
 * as it happens. A heartbeat drops connections that died without closing (a laptop going to
 * sleep, a pulled network cable) so they don't pile up on the device.
 */
export async function registerRealtime(
  app: FastifyInstance,
  {
    bus,
    activity,
    playback,
    volume,
    library,
    settings,
    boot,
    serverVersion,
    audioDriver,
    heartbeatIntervalMs = HEARTBEAT_INTERVAL_MS,
  }: RealtimeOptions,
): Promise<{ disconnectAll: () => void }> {
  await app.register(fastifyWebsocket, {
    options: { maxPayload: MAX_INCOMING_MESSAGE_BYTES },
  });

  const clients = new Set<WebSocket>();
  const awaitingPong = new WeakSet<WebSocket>();

  const snapshot = (): SnapshotMessage => ({
    type: "snapshot",
    serverVersion,
    bootId: boot.id,
    audioDriver,
    playback: playback.state,
    volume: volume.state,
    settings: settings.state,
    sounds: library.list(),
    recentActivity: activity.list({ limit: SNAPSHOT_ACTIVITY_LIMIT }),
  });

  app.get(WS_PATH, { websocket: true }, (socket, request) => {
    clients.add(socket);
    request.log.debug({ clients: clients.size }, "WebSocket client connected");

    socket.on("pong", () => awaitingPong.delete(socket));
    socket.on("close", () => {
      clients.delete(socket);
      request.log.debug({ clients: clients.size }, "WebSocket client disconnected");
    });
    socket.on("error", (error) => request.log.warn({ err: error }, "WebSocket client error"));

    send(socket, snapshot());
  });

  const unsubscribers = [
    bus.on("activity.created", (event) => {
      broadcast(clients, { type: "activity.created", event });
    }),
    bus.on("playback.changed", (state) => {
      broadcast(clients, { type: "playback.changed", playback: state });
    }),
    bus.on("volume.changed", (state) => {
      broadcast(clients, { type: "volume.changed", volume: state });
    }),
    bus.on("sounds.changed", (sounds) => {
      broadcast(clients, { type: "sounds.changed", sounds });
    }),
    bus.on("settings.changed", (state) => {
      broadcast(clients, { type: "settings.changed", settings: state });
    }),
    bus.on("device.rebooting", ({ bootId }) => {
      broadcast(clients, { type: "device.rebooting", bootId });
    }),
  ];

  const heartbeat = setInterval(() => {
    for (const socket of clients) {
      if (awaitingPong.has(socket)) {
        socket.terminate();
        continue;
      }
      awaitingPong.add(socket);
      socket.ping();
    }
  }, heartbeatIntervalMs);
  heartbeat.unref();

  app.addHook("onClose", async () => {
    clearInterval(heartbeat);
    for (const unsubscribe of unsubscribers) {
      unsubscribe();
    }
  });

  return {
    disconnectAll: () => {
      for (const socket of clients) {
        socket.close(1012, "The speaker is restarting");
      }
    },
  };
}

function send(socket: WebSocket, message: ServerMessage): void {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

function broadcast(clients: Iterable<WebSocket>, message: ServerMessage): void {
  const payload = JSON.stringify(message);
  for (const socket of clients) {
    if (socket.readyState === socket.OPEN) {
      socket.send(payload);
    }
  }
}
