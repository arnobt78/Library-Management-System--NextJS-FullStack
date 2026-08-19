import { describe, expect, it } from "vitest";
import {
  formatBorrowDate,
  formatBorrowDateTime,
} from "@/lib/profile/formatBorrowDates";

describe("formatBorrowDates", () => {
  it("formats SQL date columns as date-only (no midnight clock)", () => {
    expect(formatBorrowDate("2026-03-15")).toBe("Mar 15, 2026");
    expect(formatBorrowDate(new Date("2026-03-15T00:00:00.000Z"))).toBe(
      "Mar 15, 2026",
    );
  });

  it("formats UTC-noon due timestamps as calendar date only", () => {
    expect(formatBorrowDate("2026-03-15T12:00:00.000Z")).toBe("Mar 15, 2026");
  });

  it("formats timestamps with UTC time", () => {
    expect(formatBorrowDateTime("2026-03-15T14:30:00.000Z")).toBe(
      "Mar 15, 2026, 2:30 PM",
    );
  });

  it("returns null for missing or invalid values", () => {
    expect(formatBorrowDate(null)).toBeNull();
    expect(formatBorrowDateTime(undefined)).toBeNull();
    expect(formatBorrowDate("not-a-date")).toBeNull();
  });
});
