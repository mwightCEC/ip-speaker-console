import { describe, expect, it } from "vitest";
import { formatDuration, formatEventTime, formatUptime } from "./time";

describe("formatDuration", () => {
  it.each([
    [0, "0:00"],
    [999, "0:00"],
    [7_400, "0:07"],
    [750_000, "12:30"],
    [-50, "0:00"],
  ])("formats %d ms as %s", (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });
});

describe("formatEventTime", () => {
  const now = new Date(2026, 10, 18, 15, 0, 0);

  it("shows only the time for today", () => {
    const today = new Date(2026, 10, 18, 10, 42, 5).toISOString();
    expect(formatEventTime(today, { now, locale: "en-US" })).toBe("10:42:05 AM");
  });

  it("adds the date for other days", () => {
    const yesterday = new Date(2026, 10, 17, 10, 42, 5).toISOString();
    expect(formatEventTime(yesterday, { now, locale: "en-US" })).toBe("Nov 17, 10:42:05 AM");
  });
});

describe("formatEventTime in the device's time zone", () => {
  // 2 PM on the 18th in Tokyo; 5 AM on the 18th in UTC.
  const now = new Date("2026-11-18T05:00:00Z");

  it("shows the time where the device is", () => {
    expect(
      formatEventTime("2026-11-18T10:42:05Z", { timeZone: "Asia/Tokyo", now, locale: "en-US" }),
    ).toBe("7:42:05 PM");
  });

  it("decides what's today where the device is", () => {
    // 23:30 UTC on the 17th is already the 18th in Tokyo.
    expect(
      formatEventTime("2026-11-17T23:30:00Z", { timeZone: "Asia/Tokyo", now, locale: "en-US" }),
    ).toBe("8:30:00 AM");
    expect(formatEventTime("2026-11-17T23:30:00Z", { timeZone: "UTC", now, locale: "en-US" })).toBe(
      "Nov 17, 11:30:00 PM",
    );
  });
});

describe("formatUptime", () => {
  it.each([
    [59, "0 min"],
    [12 * 60, "12 min"],
    [3 * 3600 + 5 * 60, "3 h 5 min"],
    [2 * 86_400 + 4 * 3600, "2 d 4 h"],
  ])("formats %d s as %s", (seconds, expected) => {
    expect(formatUptime(seconds)).toBe(expected);
  });
});
