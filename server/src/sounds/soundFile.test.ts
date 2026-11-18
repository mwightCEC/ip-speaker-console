import { describe, expect, it } from "vitest";
import { parseRange } from "./soundFile.js";

describe("parseRange", () => {
  it.each([
    [undefined, undefined],
    ["bytes=0-99", { start: 0, end: 99 }],
    ["bytes=900-", { start: 900, end: 999 }],
    ["bytes=-100", { start: 900, end: 999 }],
    ["bytes=990-2000", { start: 990, end: 999 }],
    ["bytes=0-1,5-6", undefined],
    ["items=0-1", undefined],
    ["bytes=1000-", "unsatisfiable"],
    ["bytes=50-10", "unsatisfiable"],
    ["bytes=-0", "unsatisfiable"],
  ])("reads %j for a 1000-byte file", (header, expected) => {
    expect(parseRange(header, 1000)).toEqual(expected);
  });
});
