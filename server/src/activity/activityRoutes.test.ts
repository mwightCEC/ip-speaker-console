import type { ActivityPage, ApiErrorBody } from "@ip-speaker-console/shared";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildTestApp } from "../testing/buildTestApp.js";

describe("GET /api/activity", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildTestApp();
  });

  afterEach(() => app.close());

  it("returns events newest first with a cursor for the next page", async () => {
    for (let index = 1; index <= 3; index += 1) {
      app.activity.record({ category: "device", outcome: "info", message: `Event ${index}` });
    }

    const first = await app.inject({ method: "GET", url: "/api/activity?limit=2" });
    const firstPage = first.json<ActivityPage>();
    expect(first.statusCode).toBe(200);
    expect(firstPage.events.map((event) => event.message)).toEqual(["Event 3", "Event 2"]);
    expect(firstPage.nextBefore).toBe(firstPage.events[1]?.id);

    const second = await app.inject({
      method: "GET",
      url: `/api/activity?limit=2&before=${firstPage.nextBefore}`,
    });
    const secondPage = second.json<ActivityPage>();
    expect(secondPage.events.map((event) => event.message)).toEqual(["Event 1"]);
    expect(secondPage.nextBefore).toBeUndefined();
  });

  it("filters by category", async () => {
    app.activity.record({ category: "playback", outcome: "success", message: "Played" });
    app.activity.record({ category: "files", outcome: "success", message: "Uploaded" });

    const response = await app.inject({ method: "GET", url: "/api/activity?category=files" });
    expect(response.json<ActivityPage>().events.map((event) => event.message)).toEqual([
      "Uploaded",
    ]);
  });

  // Unknown parameters such as ?colour=blue are dropped by Fastify rather than rejected.
  it.each(["limit=0", "limit=500", "category=network", "outcome=great", "before=abc"])(
    "rejects %s with a validation error",
    async (query) => {
      const response = await app.inject({ method: "GET", url: `/api/activity?${query}` });
      expect(response.statusCode).toBe(400);
      expect(response.json<ApiErrorBody>().error.code).toBe("validation_failed");
    },
  );
});
