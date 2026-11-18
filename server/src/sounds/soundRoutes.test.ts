import type { ApiErrorBody, PlaybackState, Sound, SoundList } from "@ip-speaker-console/shared";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildTestApp } from "../testing/buildTestApp.js";
import { buildTestWav } from "../testing/testWav.js";

describe("sound routes", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildTestApp();
  });

  afterEach(() => app.close());

  const uploadFile = (fileName: string, contents: Buffer | string, field = "file") => {
    const form = new FormData();
    form.append(field, new Blob([contents]), fileName);
    return app.inject({ method: "POST", url: "/api/sounds", payload: form });
  };

  const upload = async (fileName = "door bell.wav") => {
    const response = await uploadFile(fileName, buildTestWav(1000));
    expect(response.statusCode).toBe(201);
    return response.json<Sound>();
  };

  const list = async () =>
    (await app.inject({ method: "GET", url: "/api/sounds" })).json<SoundList>().sounds;

  it("lists the built-in sounds, pinned", async () => {
    const sounds = await list();

    expect(sounds.map(({ id, pinned }) => [id, pinned])).toEqual([
      ["test-tone", true],
      ["chime", true],
      ["alert", true],
    ]);
  });

  it("uploads a WAV file", async () => {
    const sound = await upload();

    expect(sound).toMatchObject({ name: "door bell", durationMs: 1000, builtIn: false });
    expect((await list()).map(({ id }) => id)).toContain(sound.id);
  });

  it("explains why an upload was refused", async () => {
    const response = await uploadFile("song.mp3", "ID3 tagged audio");

    expect(response.statusCode).toBe(400);
    expect(response.json<ApiErrorBody>().error).toMatchObject({
      code: "invalid_wav",
      message: "This is an MP3 file, not a WAV file. Convert it to WAV and try again.",
    });
  });

  it("asks for a file when none was sent", async () => {
    const wrongField = await uploadFile("bell.wav", buildTestWav(), "sound");
    const notAForm = await app.inject({ method: "POST", url: "/api/sounds", payload: {} });

    for (const response of [wrongField, notAForm]) {
      expect(response.statusCode).toBe(400);
      expect(response.json<ApiErrorBody>().error.message).toBe("Choose a WAV file to upload.");
    }
  });

  it("renames and pins a sound", async () => {
    const { id } = await upload();
    const response = await app.inject({
      method: "PATCH",
      url: `/api/sounds/${id}`,
      payload: { name: "Front door", pinned: true },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json<Sound>()).toMatchObject({ name: "Front door", pinned: true });
  });

  it.each([{}, { pinned: "maybe" }, { name: "x".repeat(201) }])(
    "rejects the change %j",
    async (payload) => {
      const response = await app.inject({ method: "PATCH", url: "/api/sounds/chime", payload });
      expect(response.statusCode).toBe(400);
    },
  );

  it("refuses to rename a built-in sound", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/api/sounds/chime",
      payload: { name: "Bell" },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json<ApiErrorBody>().error.code).toBe("built_in_sound");
  });

  it("deletes a sound that's playing, stopping it first", async () => {
    const { id } = await upload();
    await app.inject({ method: "POST", url: "/api/playback", payload: { soundId: id } });

    const response = await app.inject({ method: "DELETE", url: `/api/sounds/${id}` });

    expect(response.statusCode).toBe(204);
    expect((await list()).map((sound) => sound.id)).not.toContain(id);
    const playback = await app.inject({ method: "GET", url: "/api/playback" });
    expect(playback.json<PlaybackState>()).toMatchObject({
      lastResult: { soundId: id, ending: "stopped" },
    });
    const missing = await app.inject({ method: "DELETE", url: `/api/sounds/${id}` });
    expect(missing.statusCode).toBe(404);
  });

  describe("files", () => {
    it("sends the whole file", async () => {
      const response = await app.inject({ method: "GET", url: "/api/sounds/chime/file" });

      expect(response.statusCode).toBe(200);
      expect(response.headers).toMatchObject({
        "content-type": "audio/wav",
        "content-length": "97064",
        "accept-ranges": "bytes",
      });
      expect(response.rawPayload.subarray(0, 4).toString("ascii")).toBe("RIFF");
    });

    it("sends part of a file so the browser can seek", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/sounds/chime/file",
        headers: { range: "bytes=8-11" },
      });

      expect(response.statusCode).toBe(206);
      expect(response.headers["content-range"]).toBe("bytes 8-11/97064");
      expect(response.payload).toBe("WAVE");
    });

    it("refuses a range outside the file", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/sounds/chime/file",
        headers: { range: "bytes=200000-" },
      });

      expect(response.statusCode).toBe(416);
      expect(response.headers["content-range"]).toBe("bytes */97064");
    });

    it("downloads a file under the sound's name", async () => {
      const { id } = await upload("Café bell.wav");
      const response = await app.inject({
        method: "GET",
        url: `/api/sounds/${id}/file?download=true`,
      });

      expect(response.headers["content-disposition"]).toBe(
        `attachment; filename="Caf_ bell.wav"; filename*=UTF-8''Caf%C3%A9%20bell.wav`,
      );
    });

    it("says when the sound doesn't exist", async () => {
      const response = await app.inject({ method: "GET", url: "/api/sounds/nope/file" });
      expect(response.statusCode).toBe(404);
    });
  });
});
