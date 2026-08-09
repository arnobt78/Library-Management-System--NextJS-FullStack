/**
 * Unit tests for lendable (active-only) copy sums.
 * Parent: REQ-0033 — Overview / Book Catalog KPI parity
 */

import { describe, expect, it } from "vitest";
import {
  isBookActive,
  sumLendableCopies,
} from "@/lib/admin/lendableBookCopies";

describe("lendableBookCopies", () => {
  it("treats null isActive as active", () => {
    expect(isBookActive({ isActive: null })).toBe(true);
    expect(isBookActive({ isActive: undefined })).toBe(true);
    expect(isBookActive({ isActive: false })).toBe(false);
  });

  it("sums copies from active titles only", () => {
    const sums = sumLendableCopies([
      { totalCopies: 10, availableCopies: 7, isActive: true },
      { totalCopies: 5, availableCopies: 5, isActive: false },
      { totalCopies: 2, availableCopies: 1, isActive: null },
    ]);
    expect(sums).toEqual({
      totalCopies: 12,
      availableCopies: 8,
      borrowedCopies: 4,
    });
  });
});
