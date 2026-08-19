import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import {
  computeUserFineMetrics,
  densifyUserFineMetrics,
  type BorrowRowForFine,
} from "@/lib/fines/userFineMetrics";

describe("computeUserFineMetrics", () => {
  const dailyRate = 1;

  it("sums live fine for overdue BORROWED rows only", () => {
    const rows: BorrowRowForFine[] = [
      {
        status: "BORROWED",
        dueDate: "2020-01-01T12:00:00.000Z",
        fineAmount: "0.00",
        fineStatus: "ACCRUING",
      },
      {
        status: "BORROWED",
        dueDate: "2099-12-31T12:00:00.000Z",
        fineAmount: "0.00",
        fineStatus: "NONE",
      },
      {
        status: "RETURNED",
        dueDate: "2020-01-01T12:00:00.000Z",
        fineAmount: "5.00",
        fineStatus: "PAID",
      },
    ];

    const metrics = computeUserFineMetrics(
      rows,
      dailyRate,
      undefined,
      new Date("2026-08-19T12:00:00.000Z"),
    );

    expect(metrics.overdueCount).toBe(1);
    expect(metrics.outstandingFine).toBeGreaterThan(0);
  });

  it("treats WAIVED overdue rows as zero outstanding", () => {
    const rows: BorrowRowForFine[] = [
      {
        status: "BORROWED",
        dueDate: "2020-01-01T12:00:00.000Z",
        fineAmount: "12.00",
        fineStatus: "WAIVED",
      },
    ];

    const metrics = computeUserFineMetrics(
      rows,
      dailyRate,
      undefined,
      new Date("2026-08-19T12:00:00.000Z"),
    );

    expect(metrics.overdueCount).toBe(1);
    expect(metrics.outstandingFine).toBe(0);
  });
});

describe("densifyUserFineMetrics", () => {
  it("patches users.fineMetrics from warmed user-borrows cache", () => {
    const client = new QueryClient();
    const userId = "user-1";
    client.setQueryData(queryKeys.borrows.user(userId), [
      {
        id: "b-1",
        userId,
        bookId: "book-1",
        status: "BORROWED",
        dueDate: "2020-01-01T12:00:00.000Z",
        fineAmount: "0.00",
        fineStatus: "ACCRUING",
      },
    ]);
    client.setQueryData(queryKeys.admin.fineConfig, { fineAmount: 2 });

    densifyUserFineMetrics(client, userId);

    const metrics = client.getQueryData<{ outstandingFine: number; overdueCount: number }>(
      queryKeys.users.fineMetrics(userId),
    );
    expect(metrics?.overdueCount).toBe(1);
    expect(metrics?.outstandingFine).toBeGreaterThan(0);
  });
});
