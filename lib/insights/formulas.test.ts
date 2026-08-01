// Parent: REQ-0031; TC-0095, TC-0096
import { describe, expect, it } from "vitest";
import { safePercentage, safeRatio } from "./formulas";

describe("deterministic insight formulas", () => {
  it("calculates versioned percentage and ratio precision", () => {
    expect(safePercentage(2, 3)).toBe(66.7);
    expect(safeRatio(5, 4)).toBe(1.25);
  });

  it("returns zero for every zero-denominator formula", () => {
    expect(safePercentage(0, 0)).toBe(0);
    expect(safeRatio(10, 0)).toBe(0);
  });
});
