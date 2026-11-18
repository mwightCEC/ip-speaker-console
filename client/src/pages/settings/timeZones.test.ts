import { describe, expect, it } from "vitest";
import { timeZoneLabel, timeZoneOptions } from "./timeZones";

describe("time zones", () => {
  const winter = new Date("2026-01-15T12:00:00Z");

  it("labels a zone with its offset", () => {
    expect(timeZoneLabel("America/New_York", winter)).toBe("America/New York (GMT-05:00)");
    expect(timeZoneLabel("UTC", winter)).toBe("UTC (GMT)");
  });

  it("lists every zone, including UTC and the device's own", () => {
    const options = timeZoneOptions("Etc/GMT+12", winter);
    const values = options.map((option) => option.value);

    expect(values).toContain("UTC");
    expect(values).toContain("Europe/London");
    expect(values).toContain("Etc/GMT+12");
    expect(values).toEqual(values.toSorted());
  });
});
