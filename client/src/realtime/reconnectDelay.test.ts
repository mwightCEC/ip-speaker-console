import { describe, expect, it } from "vitest";
import { reconnectDelay } from "./reconnectDelay";

const noJitter = () => 0.5;

describe("reconnectDelay", () => {
  it("doubles from one second", () => {
    expect([1, 2, 3, 4, 5].map((attempt) => reconnectDelay(attempt, noJitter))).toEqual([
      1000, 2000, 4000, 8000, 16_000,
    ]);
  });

  it("caps at 30 seconds", () => {
    expect(reconnectDelay(6, noJitter)).toBe(30_000);
    expect(reconnectDelay(50, noJitter)).toBe(30_000);
  });

  it("adds up to 20% jitter either way", () => {
    expect(reconnectDelay(3, () => 0)).toBe(3200);
    expect(reconnectDelay(3, () => 1)).toBe(4800);
  });
});
