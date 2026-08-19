import { describe, expect, it } from "vitest";
import {
  computeLiveFineForRow,
  computeLiveOutstandingFine,
  computeProRataFine,
  getCalendarDaysUntilDue,
  getDueCalendarEndUtc,
  getOverdueDaysForBorrow,
  parseStoredFine,
  resolveReturnFine,
} from "./liveFine";

describe("liveFine", () => {
  const now = new Date("2026-08-03T12:00:00.000Z");

  it("computes overdue days for active borrows only", () => {
    expect(getOverdueDaysForBorrow("BORROWED", "2026-08-01", now)).toBe(2);
    expect(getOverdueDaysForBorrow("BORROWED", "2026-08-10", now)).toBe(0);
    expect(getOverdueDaysForBorrow("RETURNED", "2026-08-01", now)).toBe(0);
  });

  it("uses live accrual for open overdue at dailyRate", () => {
    expect(
      computeLiveFineForRow({
        status: "BORROWED",
        dueDate: "2026-08-01",
        storedFine: "0.00",
        dailyRate: 0.5,
        now,
      }),
    ).toBe(1);
  });

  it("freezes stored fine for returned loans", () => {
    expect(
      computeLiveFineForRow({
        status: "RETURNED",
        dueDate: "2026-07-01",
        storedFine: "12.50",
        dailyRate: 1,
        now,
      }),
    ).toBe(12.5);
  });

  it("respects WAIVED fine_status", () => {
    expect(
      computeLiveFineForRow({
        status: "BORROWED",
        dueDate: "2026-08-01",
        storedFine: "5.00",
        dailyRate: 0.5,
        fineStatus: "WAIVED",
        now,
      }),
    ).toBe(0);
  });

  it("pro-rata splits days across rate changes", () => {
    const due = new Date("2026-08-01T00:00:00.000Z");
    const asOf = new Date("2026-08-05T00:00:00.000Z");
    const total = computeProRataFine(due, asOf, [
      { rate: 0.5, effectiveFrom: "2026-08-01", createdBy: "admin" },
      { rate: 1, effectiveFrom: "2026-08-04", createdBy: "admin" },
    ], 0.5);
    // Aug 2-3 @ 0.50 = 1.00; Aug 4-5 @ 1.00 = 2.00
    expect(total).toBe(3);
  });

  it("aggregates live outstanding from day counts", () => {
    expect(computeLiveOutstandingFine([2, 5], 0.5)).toBe(3.5);
  });

  it("parses stored fines safely", () => {
    expect(parseStoredFine("12.34")).toBe(12.34);
    expect(parseStoredFine(null)).toBe(0);
  });

  it("treats the due calendar day as not overdue", () => {
    expect(getOverdueDaysForBorrow("BORROWED", "2026-08-03", now)).toBe(0);
    expect(getCalendarDaysUntilDue("2026-08-03", now)).toBe(0);
    expect(getCalendarDaysUntilDue("2026-08-04", now)).toBe(1);
    expect(getCalendarDaysUntilDue("2026-08-01", now)).toBe(-2);
  });

  it("counts Remaining to the end of the due UTC day", () => {
    const end = getDueCalendarEndUtc("2026-08-03");
    expect(end).toBe(Date.UTC(2026, 7, 3, 23, 59, 59, 999));
    expect(end).toBeGreaterThan(now.getTime());
  });

  it("keeps stored amount for PAID open loans", () => {
    expect(
      computeLiveFineForRow({
        status: "BORROWED",
        dueDate: "2026-08-01",
        storedFine: "8.00",
        dailyRate: 0.5,
        fineStatus: "PAID",
        now,
      }),
    ).toBe(8);
  });

  it("uses live accrual for open STAMPED overdue (stored snapshot is not display)", () => {
    expect(
      computeLiveFineForRow({
        status: "BORROWED",
        dueDate: "2026-08-01",
        storedFine: "0.00",
        dailyRate: 1,
        fineStatus: "STAMPED",
        now,
      }),
    ).toBe(2);
  });

  it("preserves WAIVED and PAID on return; otherwise stamps live", () => {
    expect(
      resolveReturnFine({
        fineStatus: "WAIVED",
        storedFine: "0.00",
        dueDate: "2026-08-01",
        dailyRate: 1,
        now,
      }),
    ).toEqual({ fineAmount: "0.00", fineStatus: "WAIVED" });

    expect(
      resolveReturnFine({
        fineStatus: "PAID",
        storedFine: "5.00",
        dueDate: "2026-08-01",
        dailyRate: 1,
        now,
      }),
    ).toEqual({ fineAmount: "5.00", fineStatus: "PAID" });

    expect(
      resolveReturnFine({
        fineStatus: "ACCRUING",
        storedFine: "0.00",
        dueDate: "2026-08-01",
        dailyRate: 1,
        now,
      }),
    ).toEqual({ fineAmount: "2.00", fineStatus: "STAMPED" });
  });
});
