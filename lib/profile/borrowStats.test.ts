import { describe, expect, it } from "vitest";
import {
  computeBorrowStats,
  getOverdueDays,
  getRecordFine,
} from "@/lib/profile/borrowStats";
import { parseProfileTab, profileTabHref } from "@/lib/profile/profileTabs";

describe("parseProfileTab", () => {
  it("maps canonical and alias values", () => {
    expect(parseProfileTab("active-borrows")).toBe("active-borrows");
    expect(parseProfileTab("active")).toBe("active-borrows");
    expect(parseProfileTab("pending-requests")).toBe("pending-requests");
    expect(parseProfileTab("pending")).toBe("pending-requests");
    expect(parseProfileTab("borrow-history")).toBe("borrow-history");
    expect(parseProfileTab("history")).toBe("borrow-history");
    expect(parseProfileTab("holds")).toBe("holds");
    expect(parseProfileTab("reservations")).toBe("holds");
    expect(parseProfileTab(null)).toBe("active-borrows");
    expect(parseProfileTab("unknown")).toBe("active-borrows");
  });

  it("builds profile tab href", () => {
    expect(profileTabHref("pending-requests")).toBe(
      "/my-profile?tab=pending-requests",
    );
  });
});

describe("borrowStats", () => {
  const now = new Date("2026-08-03T12:00:00.000Z");

  it("computes overdue days and live fines", () => {
    expect(getOverdueDays("BORROWED", "2026-08-01", now)).toBe(2);
    expect(getOverdueDays("BORROWED", "2026-08-10", now)).toBe(0);
    expect(getRecordFine({ status: "BORROWED", dueDate: "2026-08-01", fineAmount: 0 }, now)).toBe(
      2,
    );
  });

  it("aggregates KPIs from mixed records", () => {
    const stats = computeBorrowStats(
      [
        {
          id: "1",
          bookId: "b1",
          status: "PENDING",
          dueDate: null,
          borrowDate: "2026-07-30",
          fineAmount: 0,
          renewalCount: 0,
        },
        {
          id: "2",
          bookId: "b2",
          status: "BORROWED",
          dueDate: "2026-08-04",
          fineAmount: 0,
          renewalCount: 1,
        },
        {
          id: "3",
          bookId: "b2",
          status: "BORROWED",
          dueDate: "2026-07-01",
          fineAmount: 0,
          renewalCount: 0,
        },
        {
          id: "4",
          bookId: "b3",
          status: "RETURNED",
          dueDate: "2026-07-20",
          returnDate: "2026-07-18",
          fineAmount: 0,
          renewalCount: 2,
          createdAt: "2026-07-18",
        },
        {
          id: "5",
          bookId: "b4",
          status: "RETURNED",
          dueDate: "2026-07-10",
          returnDate: "2026-07-15",
          fineAmount: "5",
          renewalCount: 0,
          createdAt: "2026-07-15",
        },
        {
          id: "6",
          bookId: "b5",
          status: "CANCELLED",
          dueDate: null,
          fineAmount: 0,
          renewalCount: 0,
        },
      ],
      3,
      now,
    );

    expect(stats.totalBorrows).toBe(6);
    expect(stats.pending).toBe(1);
    expect(stats.active).toBe(2);
    expect(stats.returned).toBe(2);
    expect(stats.cancelled).toBe(1);
    expect(stats.overdueNow).toBe(1);
    expect(stats.dueSoon).toBe(1);
    expect(stats.uniqueBooks).toBe(5);
    expect(stats.totalRenewals).toBe(3);
    expect(stats.onTimeReturns).toBe(1);
    expect(stats.lateReturns).toBe(1);
    expect(stats.totalReviews).toBe(3);
    expect(stats.pendingOldestWaitDays).toBe(4);
    expect(stats.withFines).toBeGreaterThanOrEqual(2);
  });
});
