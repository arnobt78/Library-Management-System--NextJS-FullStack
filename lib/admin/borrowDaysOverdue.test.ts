/**
 * Unit: borrowDaysOverdue KPI helper (no DB).
 * Parent: borrow detail UI polish
 */
import { describe, expect, it } from "vitest";
import { borrowDaysOverdue } from "@/lib/admin/borrowDaysOverdue";

describe("borrowDaysOverdue", () => {
  it("returns 0 when not BORROWED or missing due", () => {
    expect(borrowDaysOverdue("PENDING", "2026-08-01")).toBe(0);
    expect(borrowDaysOverdue("BORROWED", null)).toBe(0);
  });

  it("counts calendar days past due for BORROWED", () => {
    const now = new Date("2026-08-20T12:00:00.000Z");
    expect(borrowDaysOverdue("BORROWED", "2026-08-13", now)).toBe(7);
    expect(borrowDaysOverdue("BORROWED", "2026-08-20", now)).toBe(0);
    expect(borrowDaysOverdue("BORROWED", "2026-08-27", now)).toBe(0);
  });
});
