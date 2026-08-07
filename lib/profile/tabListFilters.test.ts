import { describe, expect, it } from "vitest";
import {
  filterActiveBorrows,
  filterBorrowHistory,
  filterPendingRequests,
  filterReviews,
  hasNonDefaultProfileFilters,
  inPeriod,
  isBorrowOverdue,
} from "@/lib/profile/tabListFilters";

const NOW = new Date("2026-08-07T15:00:00.000Z");

describe("inPeriod", () => {
  it("accepts all periods without a date", () => {
    expect(inPeriod(null, "all", NOW)).toBe(true);
  });

  it("rejects missing dates for bounded periods", () => {
    expect(inPeriod(null, "today", NOW)).toBe(false);
    expect(inPeriod(undefined, "7days", NOW)).toBe(false);
  });

  it("matches today from local midnight", () => {
    const todayMorning = new Date(NOW);
    todayMorning.setHours(8, 0, 0, 0);
    const yesterday = new Date(NOW);
    yesterday.setDate(yesterday.getDate() - 1);
    expect(inPeriod(todayMorning, "today", NOW)).toBe(true);
    expect(inPeriod(yesterday, "today", NOW)).toBe(false);
  });

  it("matches last 7 / 30 days windows", () => {
    const sixDaysAgo = new Date(NOW.getTime() - 6 * 24 * 60 * 60 * 1000);
    const eightDaysAgo = new Date(NOW.getTime() - 8 * 24 * 60 * 60 * 1000);
    const twentyDaysAgo = new Date(NOW.getTime() - 20 * 24 * 60 * 60 * 1000);
    const fortyDaysAgo = new Date(NOW.getTime() - 40 * 24 * 60 * 60 * 1000);
    expect(inPeriod(sixDaysAgo, "7days", NOW)).toBe(true);
    expect(inPeriod(eightDaysAgo, "7days", NOW)).toBe(false);
    expect(inPeriod(twentyDaysAgo, "30days", NOW)).toBe(true);
    expect(inPeriod(fortyDaysAgo, "30days", NOW)).toBe(false);
  });
});

describe("isBorrowOverdue", () => {
  it("is overdue when due day is before today", () => {
    expect(isBorrowOverdue("2026-08-01", NOW)).toBe(true);
    expect(isBorrowOverdue("2026-08-07", NOW)).toBe(false);
    expect(isBorrowOverdue(null, NOW)).toBe(false);
  });
});

describe("filterActiveBorrows", () => {
  const rows = [
    {
      id: "a",
      dueDate: "2026-07-20",
      createdAt: "2026-07-01",
      renewalCount: 0,
    },
    {
      id: "b",
      dueDate: "2026-08-20",
      createdAt: "2026-08-05",
      renewalCount: 2,
    },
    {
      id: "c",
      dueDate: null,
      createdAt: "2026-08-06",
      renewalCount: 1,
    },
  ];

  it("filters overdue and extended", () => {
    expect(
      filterActiveBorrows(rows, "all", "due", NOW).map((r) => r.id),
    ).toEqual(["a"]);
    expect(
      filterActiveBorrows(rows, "all", "extended", NOW).map((r) => r.id),
    ).toEqual(["b", "c"]);
  });

  it("uses dueDate for period with createdAt fallback", () => {
    expect(
      filterActiveBorrows(rows, "7days", "all", NOW).map((r) => r.id),
    ).toEqual(["b", "c"]);
  });
});

describe("filterPendingRequests", () => {
  it("filters on createdAt", () => {
    const rows = [
      { id: "1", createdAt: "2026-08-06T12:00:00.000Z" },
      { id: "2", createdAt: "2026-07-01T12:00:00.000Z" },
    ];
    expect(
      filterPendingRequests(rows, "7days", NOW).map((r) => r.id),
    ).toEqual(["1"]);
  });
});

describe("filterBorrowHistory", () => {
  it("filters by return/created date and status", () => {
    const rows = [
      {
        id: "r",
        status: "RETURNED",
        returnDate: "2026-08-05",
        createdAt: "2026-07-01",
      },
      {
        id: "c",
        status: "CANCELLED",
        returnDate: null,
        createdAt: "2026-08-06",
      },
    ];
    expect(
      filterBorrowHistory(rows, "7days", "CANCELLED", NOW).map((r) => r.id),
    ).toEqual(["c"]);
    expect(
      filterBorrowHistory(rows, "all", "RETURNED", NOW).map((r) => r.id),
    ).toEqual(["r"]);
  });
});

describe("filterReviews", () => {
  it("filters by createdAt and moderation status", () => {
    const rows = [
      { id: "1", status: "PENDING", createdAt: "2026-08-06" },
      { id: "2", status: "APPROVED", createdAt: "2026-06-01" },
      { id: "3", status: "REJECTED", createdAt: "2026-08-05" },
    ];
    expect(filterReviews(rows, "7days", "all", NOW).map((r) => r.id)).toEqual([
      "1",
      "3",
    ]);
    expect(
      filterReviews(rows, "all", "APPROVED", NOW).map((r) => r.id),
    ).toEqual(["2"]);
  });
});

describe("hasNonDefaultProfileFilters", () => {
  it("detects non-default period or status", () => {
    expect(hasNonDefaultProfileFilters({ period: "all", status: "all" })).toBe(
      false,
    );
    expect(hasNonDefaultProfileFilters({ period: "7days" })).toBe(true);
    expect(
      hasNonDefaultProfileFilters({ period: "all", status: "due" }),
    ).toBe(true);
  });
});
