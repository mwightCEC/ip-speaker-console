import type { ServerMessage } from "@ip-speaker-console/shared";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { WebSocket } from "ws";
import { buildTestApp } from "../testing/buildTestApp.js";

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
    app = await buildTestApp();
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
      bootId: expect.any(String),
      volume: { percent: 80, muted: false },
      settings: { deviceName: "IP Speaker", timeZone: expect.any(String) },
      sounds: [{ id: "test-tone" }, { id: "chime" }, { id: "alert" }],
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

  it("pushes sound library changes to every connected client", async () => {
    const client = await connect(app);
    await client.next();

    await app.inject({ method: "PATCH", url: "/api/sounds/chime", payload: { pinned: false } });

    expect(await client.next()).toMatchObject({
      type: "activity.created",
      event: { message: "Unpinned Chime from Quick play" },
    });
    const message = await client.next();
    expect(message.type).toBe("sounds.changed");
    expect(
      message.type === "sounds.changed" && message.sounds.find(({ id }) => id === "chime"),
    ).toMatchObject({ pinned: false });
    client.socket.terminate();
  });

  it("tells every client when the device starts rebooting", async () => {
    const client = await connect(app);
    const snapshot = await client.next();

    await app.inject({ method: "POST", url: "/api/device/reboot" });

    const messages = [await client.next(), await client.next()];
    expect(messages).toContainEqual({
      type: "device.rebooting",
      bootId: snapshot.type === "snapshot" ? snapshot.bootId : "",
    });
    client.socket.terminate();
  });

  it("pushes settings changes to every connected client", async () => {
    const client = await connect(app);
    await client.next();

    await app.inject({ method: "PATCH", url: "/api/settings", payload: { deviceName: "Lobby" } });

    const messages = [await client.next(), await client.next()];
    expect(messages).toContainEqual({
      type: "settings.changed",
      settings: expect.objectContaining({ deviceName: "Lobby" }),
    });
    client.socket.terminate();
  });

  it("refuses connections from other websites", async () => {
    await expect(
      app.injectWS("/ws", { headers: { host: "speaker.local", origin: "https://evil.example" } }),
    ).rejects.toThrow(/403/u);
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
