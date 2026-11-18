import type { ApiErrorBody, PlaybackState, SoundList } from "@ip-speaker-console/shared";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../app.js";
import { loadConfig } from "../config.js";
import { IN_MEMORY } from "../storage/database.js";

describe("sound and playback routes", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildApp({
      config: loadConfig({}),
      clientDistDir: "/nonexistent",
      databaseFile: IN_MEMORY,
      logger: false,
    });
  });

  afterEach(() => app.close());

  const play = (soundId: unknown) =>
    app.inject({ method: "POST", url: "/api/playback", payload: { soundId } });

  it("lists the bundled sounds", async () => {
    const response = await app.inject({ method: "GET", url: "/api/sounds" });

    expect(response.statusCode).toBe(200);
    expect(response.json<SoundList>().sounds.map(({ id }) => id)).toEqual([
      "test-tone",
      "chime",
      "alert",
    ]);
  });

  it("plays a sound, reports it and stops it", async () => {
    const started = await play("chime");
    expect(started.statusCode).toBe(200);
    expect(started.json<PlaybackState>().nowPlaying).toMatchObject({
      soundId: "chime",
      soundName: "Chime",
      durationMs: 2200,
    });

    const current = await app.inject({ method: "GET", url: "/api/playback" });
    expect(current.json<PlaybackState>().nowPlaying?.soundId).toBe("chime");

    const stopped = await app.inject({ method: "POST", url: "/api/playback/stop" });
    expect(stopped.json<PlaybackState>()).toEqual({
      lastResult: expect.objectContaining({ soundId: "chime", ending: "stopped" }),
    });
  });

  it("answers 404 for a sound that isn't on the device", async () => {
    const response = await play("fire-drill");

    expect(response.statusCode).toBe(404);
    expect(response.json<ApiErrorBody>().error.code).toBe("sound_not_found");
  });

  it.each([[""], [undefined], [{ id: "chime" }]])("rejects the sound ID %j", async (soundId) => {
    const response = await play(soundId);

    expect(response.statusCode).toBe(400);
    expect(response.json<ApiErrorBody>().error.code).toBe("validation_failed");
  });

  it("stops the sound and records it when the server shuts down", async () => {
    await play("test-tone");
    const record = vi.spyOn(app.activity, "record");

    await app.close();

    expect(record).toHaveBeenCalledWith(expect.objectContaining({ message: "Stopped Test tone" }));
  });
});
