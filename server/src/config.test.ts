import path from "node:path";
import { describe, expect, it } from "vitest";
import { ConfigError, loadConfig } from "./config.js";

describe("loadConfig", () => {
  it("uses development defaults when nothing is set", () => {
    const config = loadConfig({});
    expect(config).toEqual({
      host: "127.0.0.1",
      port: 3000,
      logLevel: "info",
      audioDriver: "mock",
      systemDriver: "mock",
      dataDir: expect.stringMatching(/server[\\/]data$/),
      activityRetention: 5000,
    });
    expect(path.isAbsolute(config.dataDir)).toBe(true);
  });

  it("reads every supported variable", () => {
    const config = loadConfig({
      HOST: "0.0.0.0",
      PORT: "8080",
      LOG_LEVEL: "debug",
      AUDIO_DRIVER: "aplay",
      SYSTEM_DRIVER: "linux",
      DATA_DIR: "/var/lib/ip-speaker-console",
      ACTIVITY_RETENTION: "2000",
    });
    expect(config).toEqual({
      host: "0.0.0.0",
      port: 8080,
      logLevel: "debug",
      audioDriver: "aplay",
      systemDriver: "linux",
      dataDir: path.resolve("/var/lib/ip-speaker-console"),
      activityRetention: 2000,
    });
  });

  it.each(["0", "70000", "80.5", "eighty"])("rejects PORT=%s", (port) => {
    expect(() => loadConfig({ PORT: port })).toThrow(ConfigError);
  });

  it.each(["99", "1000.5", "lots"])("rejects ACTIVITY_RETENTION=%s", (retention) => {
    expect(() => loadConfig({ ACTIVITY_RETENTION: retention })).toThrow(ConfigError);
  });

  it("names the variable and the allowed values when a driver is unknown", () => {
    expect(() => loadConfig({ AUDIO_DRIVER: "alsa" })).toThrow(
      'AUDIO_DRIVER must be one of mock, aplay, but it is "alsa".',
    );
  });
});
