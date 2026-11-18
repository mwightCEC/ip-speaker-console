import type { ApiErrorBody, VolumeState } from "@ip-speaker-console/shared";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../app.js";
import { MockAudioMixer, type AudioMixer } from "../audio/audioMixer.js";
import { loadConfig } from "../config.js";
import { IN_MEMORY } from "../storage/database.js";

describe("volume routes", () => {
  let app: FastifyInstance;

  const start = async (audioMixer: AudioMixer = new MockAudioMixer()) => {
    app = await buildApp({
      config: loadConfig({}),
      clientDistDir: "/nonexistent",
      databaseFile: IN_MEMORY,
      audioMixer,
      logger: false,
    });
  };

  const changeVolume = (payload: Record<string, unknown>) =>
    app.inject({ method: "PUT", url: "/api/volume", payload });

  afterEach(() => app.close());

  it("reports and changes the volume", async () => {
    await start();

    const changed = await changeVolume({ percent: 35 });
    expect(changed.statusCode).toBe(200);
    expect(changed.json<VolumeState>()).toEqual({ percent: 35, muted: false });

    const muted = await changeVolume({ muted: true });
    expect(muted.json<VolumeState>()).toEqual({ percent: 35, muted: true });

    const current = await app.inject({ method: "GET", url: "/api/volume" });
    expect(current.json<VolumeState>()).toEqual({ percent: 35, muted: true });
  });

  it.each([
    { percent: -1 },
    { percent: 101 },
    { percent: 50.5 },
    { percent: "loud" },
    { muted: "maybe" },
    {},
  ])("rejects %j", async (payload) => {
    await start();
    const response = await changeVolume(payload);

    expect(response.statusCode).toBe(400);
    expect(response.json<ApiErrorBody>().error.code).toBe("validation_failed");
  });

  it("explains when the speaker can't change the volume", async () => {
    await start({ setVolume: () => Promise.reject(new Error("amixer isn't installed")) });
    const response = await changeVolume({ percent: 20 });

    expect(response.statusCode).toBe(500);
    expect(response.json<ApiErrorBody>().error).toEqual({
      code: "volume_failed",
      message: "Couldn't change the volume on the speaker.",
      detail: "amixer isn't installed",
    });
  });
});
