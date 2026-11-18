import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AudioDriverName, SystemDriverName } from "@ip-speaker-console/shared";

const LOG_LEVELS = ["fatal", "error", "warn", "info", "debug", "trace"] as const;
const AUDIO_DRIVERS = ["mock", "aplay"] as const satisfies readonly AudioDriverName[];
const SYSTEM_DRIVERS = ["mock", "linux"] as const satisfies readonly SystemDriverName[];

// server/data, from both src/ (development) and dist/ (production).
const DEFAULT_DATA_DIR = fileURLToPath(new URL("../data", import.meta.url));
const DEFAULT_ACTIVITY_RETENTION = 5000;
const MIN_ACTIVITY_RETENTION = 100;

export type LogLevel = (typeof LOG_LEVELS)[number];

export interface ServerConfig {
  host: string;
  port: number;
  logLevel: LogLevel;
  audioDriver: AudioDriverName;
  systemDriver: SystemDriverName;
  /** Absolute path of the folder holding the database (and, from M5, uploaded sounds). */
  dataDir: string;
  /** How many activity events to keep; older ones are deleted as new ones arrive. */
  activityRetention: number;
}

/** Thrown when an environment variable has a value the server can't use. */
export class ConfigError extends Error {
  override name = "ConfigError";
}

/**
 * Reads the server configuration from environment variables, applying defaults
 * suited to a development machine. Invalid values fail fast with a message that
 * names the variable, rather than starting the server half-configured.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  return {
    host: env.HOST?.trim() || "127.0.0.1",
    port: parsePort(env.PORT),
    logLevel: parseChoice("LOG_LEVEL", env.LOG_LEVEL, LOG_LEVELS, "info"),
    audioDriver: parseChoice("AUDIO_DRIVER", env.AUDIO_DRIVER, AUDIO_DRIVERS, "mock"),
    systemDriver: parseChoice("SYSTEM_DRIVER", env.SYSTEM_DRIVER, SYSTEM_DRIVERS, "mock"),
    dataDir: path.resolve(env.DATA_DIR?.trim() || DEFAULT_DATA_DIR),
    activityRetention: parseRetention(env.ACTIVITY_RETENTION),
  };
}

function parsePort(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === "") {
    return 3000;
  }
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new ConfigError(`PORT must be a whole number from 1 to 65535, but it is "${raw}".`);
  }
  return port;
}

function parseRetention(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === "") {
    return DEFAULT_ACTIVITY_RETENTION;
  }
  const count = Number(raw);
  if (!Number.isInteger(count) || count < MIN_ACTIVITY_RETENTION) {
    throw new ConfigError(
      `ACTIVITY_RETENTION must be a whole number of at least ${MIN_ACTIVITY_RETENTION}, but it is "${raw}".`,
    );
  }
  return count;
}

function parseChoice<T extends string>(
  name: string,
  raw: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  if (raw === undefined || raw.trim() === "") {
    return fallback;
  }
  const value = raw.trim();
  if (!(allowed as readonly string[]).includes(value)) {
    throw new ConfigError(`${name} must be one of ${allowed.join(", ")}, but it is "${raw}".`);
  }
  return value as T;
}
