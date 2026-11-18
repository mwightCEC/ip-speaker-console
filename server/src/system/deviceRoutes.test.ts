import type {
  ApiErrorBody,
  DeviceInfo,
  DeviceSettings,
  HealthResponse,
} from "@ip-speaker-console/shared";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildTestApp } from "../testing/buildTestApp.js";

const SIMULATED_REBOOT_MS = 150;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("device and settings routes", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildTestApp({ simulatedRebootMs: SIMULATED_REBOOT_MS, rebootDelayMs: 10 });
  });

  afterEach(() => app.close());

  const health = async () =>
    (await app.inject({ method: "GET", url: "/api/health" })).json<HealthResponse>();

  it("reports facts about the device", async () => {
    const response = await app.inject({ method: "GET", url: "/api/device" });

    expect(response.statusCode).toBe(200);
    expect(response.json<DeviceInfo>()).toMatchObject({
      model: "Simulated device",
      softwareVersion: expect.stringMatching(/^\d+\.\d+\.\d+/u),
      audioDriver: "mock",
      systemDriver: "mock",
      mixerControl: "Master",
      uptimeSeconds: expect.any(Number),
      network: { type: expect.any(String), addressing: "dhcp" },
    });
  });

  it("changes the settings", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/api/settings",
      payload: { deviceName: "Lobby speaker", timeZone: "Asia/Tokyo" },
    });

    expect(response.statusCode).toBe(200);
    const current = await app.inject({ method: "GET", url: "/api/settings" });
    expect(current.json<DeviceSettings>()).toEqual({
      deviceName: "Lobby speaker",
      timeZone: "Asia/Tokyo",
    });
  });

  it.each([{}, { deviceName: "x".repeat(41) }, { timeZone: "Mars/Olympus" }, { deviceName: "" }])(
    "rejects the change %j",
    async (payload) => {
      const response = await app.inject({ method: "PATCH", url: "/api/settings", payload });
      expect(response.statusCode).toBe(400);
    },
  );

  it("reboots: goes down, then comes back as a new boot", async () => {
    const before = await health();

    const response = await app.inject({ method: "POST", url: "/api/device/reboot" });
    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({ bootId: before.bootId });

    const again = await app.inject({ method: "POST", url: "/api/device/reboot" });
    expect(again.statusCode).toBe(409);

    await wait(50);
    const down = await app.inject({ method: "GET", url: "/api/health" });
    expect(down.statusCode).toBe(503);
    expect(down.json<ApiErrorBody>().error.code).toBe("restarting");

    await wait(SIMULATED_REBOOT_MS + 50);
    const after = await health();
    expect(after.bootId).not.toBe(before.bootId);
    const messages = app.activity.list({ limit: 2 }).map(({ message }) => message);
    expect(messages[0]).toMatch(/^Console started/u);
    expect(messages[1]).toBe("Reboot requested");
  });
});

describe("same-origin check", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildTestApp();
  });

  afterEach(() => app.close());

  const stop = (headers: Record<string, string>) =>
    app.inject({ method: "POST", url: "/api/playback/stop", headers });

  it("allows changes from the console's own page, and from tools without an Origin", async () => {
    expect(
      (await stop({ host: "speaker.local:3000", origin: "http://speaker.local:3000" })).statusCode,
    ).toBe(200);
    expect((await stop({ host: "speaker.local:3000" })).statusCode).toBe(200);
  });

  it.each(["https://evil.example", "http://speaker.local:9999", "null"])(
    "refuses changes from %s",
    async (origin) => {
      const response = await stop({ host: "speaker.local:3000", origin });

      expect(response.statusCode).toBe(403);
      expect(response.json<ApiErrorBody>().error.code).toBe("cross_origin");
    },
  );

  it("still lets other websites read, which browsers don't let them see", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/health",
      headers: { host: "speaker.local:3000", origin: "https://evil.example" },
    });
    expect(response.statusCode).toBe(200);
  });
});
