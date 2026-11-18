import type { ServerMessage } from "@ip-speaker-console/shared";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { WebSocket } from "ws";
import { buildApp } from "../app.js";
import { loadConfig } from "../config.js";
import { IN_MEMORY } from "../storage/database.js";

interface TestClient {
  socket: WebSocket;
  /** Resolves with the next message, including ones that arrived before this was called. */
  next(): Promise<ServerMessage>;
}

/** Opens a WebSocket to the app, recording messages from before the connection opens. */
async function connect(app: FastifyInstance): Promise<TestClient> {
  const queued: ServerMessage[] = [];
  const waiters: Array<(message: ServerMessage) => void> = [];

  const socket = await app.injectWS(
    "/ws",
    {},
    {
      onInit(ws) {
        ws.on("message", (data) => {
          const message = JSON.parse(String(data)) as ServerMessage;
          const waiter = waiters.shift();
          if (waiter) {
            waiter(message);
          } else {
            queued.push(message);
          }
        });
      },
    },
  );

  return {
    socket,
    next() {
      const message = queued.shift();
      return message ? Promise.resolve(message) : new Promise((resolve) => waiters.push(resolve));
    },
  };
}

describe("WebSocket hub", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildApp({
      config: loadConfig({}),
      clientDistDir: "/nonexistent",
      databaseFile: IN_MEMORY,
      logger: false,
    });
    await app.ready();
  });

  afterEach(() => app.close());

  it("sends a snapshot of the device state as the first message", async () => {
    app.activity.record({ category: "device", outcome: "info", message: "Console started" });

    const client = await connect(app);
    const first = await client.next();

    expect(first).toMatchObject({
      type: "snapshot",
      serverVersion: expect.stringMatching(/^\d+\.\d+\.\d+/),
      audioDriver: "mock",
      playback: {},
      recentActivity: [{ message: "Console started" }],
    });
    client.socket.terminate();
  });

  it("pushes playback changes to every connected client", async () => {
    const client = await connect(app);
    await client.next();

    await app.inject({ method: "POST", url: "/api/playback", payload: { soundId: "chime" } });

    expect(await client.next()).toMatchObject({
      type: "activity.created",
      event: { message: "Started playing Chime" },
    });
    expect(await client.next()).toMatchObject({
      type: "playback.changed",
      playback: { nowPlaying: { soundId: "chime", durationMs: 2200 } },
    });
    client.socket.terminate();
  });

  it("pushes new activity to every connected client", async () => {
    const clientA = await connect(app);
    const clientB = await connect(app);
    await clientA.next();
    await clientB.next();

    const event = app.activity.record({
      category: "playback",
      outcome: "success",
      message: "Played chime.wav",
    });

    expect(await clientA.next()).toEqual({ type: "activity.created", event });
    expect(await clientB.next()).toEqual({ type: "activity.created", event });
    clientA.socket.terminate();
    clientB.socket.terminate();
  });

  it("gives a reconnecting client the events it missed in its snapshot", async () => {
    const first = await connect(app);
    first.socket.terminate();

    app.activity.record({ category: "files", outcome: "failure", message: "Upload rejected" });

    const second = await connect(app);
    const snapshot = await second.next();
    expect(snapshot.type === "snapshot" && snapshot.recentActivity[0]?.message).toBe(
      "Upload rejected",
    );
    second.socket.terminate();
  });
});
