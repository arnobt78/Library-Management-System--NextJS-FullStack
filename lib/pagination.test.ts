// Parent: REQ-0022

import { describe, expect, it } from "vitest";
import { parsePagination, parsePositiveInteger } from "./pagination";

describe("bounded pagination", () => {
  it("uses defaults for missing, malformed, and negative values", () => {
    expect(parsePositiveInteger(null, 12, 100)).toBe(12);
    expect(parsePositiveInteger("invalid", 12, 100)).toBe(12);
    expect(parsePositiveInteger("-5", 12, 100)).toBe(12);
  });

  it("caps oversized database reads", () => {
    expect(parsePositiveInteger("5000", 12, 100)).toBe(100);
  });

  it("parses page and limit through one shared contract", () => {
    const params = new URLSearchParams({ page: "3", limit: "25" });
    expect(parsePagination(params, 12)).toEqual({ page: 3, limit: 25 });
  });
});
