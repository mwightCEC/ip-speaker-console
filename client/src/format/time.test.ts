import { describe, expect, it } from "vitest";
import { formatDuration, formatEventTime } from "./time";

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
    expect(formatEventTime(today, now, "en-US")).toBe("10:42:05 AM");
  });

  it("adds the date for other days", () => {
    const yesterday = new Date(2026, 10, 17, 10, 42, 5).toISOString();
    expect(formatEventTime(yesterday, now, "en-US")).toBe("Nov 17, 10:42:05 AM");
  });
});
