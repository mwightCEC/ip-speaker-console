import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ApiErrorBody, HealthResponse } from "@ip-speaker-console/shared";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { IN_MEMORY } from "./storage/database.js";

const INDEX_HTML = "<!doctype html><title>console</title>";

describe("buildApp", () => {
  let app: FastifyInstance;
  let distDir: string;

  beforeEach(() => {
    distDir = mkdtempSync(path.join(tmpdir(), "isc-client-"));
  });

  afterEach(async () => {
    await app.close();
    rmSync(distDir, { recursive: true, force: true });
  });

  async function start(withClientBuild: boolean): Promise<void> {
    if (withClientBuild) {
      writeFileSync(path.join(distDir, "index.html"), INDEX_HTML);
    }
    app = await buildApp({
      config: loadConfig({}),
      clientDistDir: distDir,
      databaseFile: IN_MEMORY,
      logger: false,
    });
  }

  it("reports health with the configured drivers", async () => {
    await start(false);
    const response = await app.inject({ method: "GET", url: "/api/health" });

    expect(response.statusCode).toBe(200);
    const body = response.json<HealthResponse>();
    expect(body.status).toBe("ok");
    expect(body.drivers).toEqual({ audio: "mock", system: "mock" });
    expect(body.version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("serves index.html for client-side routes", async () => {
    await start(true);
    const response = await app.inject({ method: "GET", url: "/sounds" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.body).toBe(INDEX_HTML);
  });

  it("returns 404 rather than the app for unknown API routes and missing files", async () => {
    await start(true);

    const api = await app.inject({ method: "GET", url: "/api/nope" });
    const asset = await app.inject({ method: "GET", url: "/assets/missing.js" });

    expect(api.statusCode).toBe(404);
    expect(api.json<ApiErrorBody>().error.code).toBe("not_found");
    expect(asset.statusCode).toBe(404);
  });

  it("still serves the API when the client hasn't been built", async () => {
    await start(false);
    const page = await app.inject({ method: "GET", url: "/" });
    const health = await app.inject({ method: "GET", url: "/api/health" });

    expect(page.statusCode).toBe(404);
    expect(health.statusCode).toBe(200);
  });
});
