/**
 * Reservation densify — waiting holds sync onto borrow queue rows.
 * Parent: borrow inventory densify closeout
 */

import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { queryKeys } from "@/lib/query/keys";
import type { BorrowRecordWithDetails } from "@/lib/services/borrows";
import {
  densifyReservationCreate,
  densifyReservationStatus,
} from "@/lib/utils/patchReservationCaches";

function makeRequest(
  overrides: Partial<BorrowRecordWithDetails> &
    Pick<BorrowRecordWithDetails, "id">,
): BorrowRecordWithDetails {
  return {
    id: overrides.id,
    userId: overrides.userId ?? "user-1",
    bookId: overrides.bookId ?? "book-1",
    borrowDate: overrides.borrowDate ?? new Date("2026-08-01"),
    dueDate: overrides.dueDate ?? null,
    returnDate: overrides.returnDate ?? null,
    status: overrides.status ?? "BORROWED",
    borrowedBy: overrides.borrowedBy ?? null,
    returnedBy: overrides.returnedBy ?? null,
    fineAmount: overrides.fineAmount ?? "0",
    notes: overrides.notes ?? null,
    renewalCount: overrides.renewalCount ?? 0,
    lastReminderSent: overrides.lastReminderSent ?? null,
    updatedAt: overrides.updatedAt ?? new Date("2026-08-01"),
    updatedBy: overrides.updatedBy ?? null,
    createdAt: overrides.createdAt ?? new Date("2026-08-01"),
    userName: overrides.userName ?? "Test User",
    userEmail: overrides.userEmail ?? "test@user.com",
    userUniversityId: overrides.userUniversityId ?? 1,
    bookTitle: overrides.bookTitle ?? "Algorithms",
    bookAuthor: overrides.bookAuthor ?? "CLRS",
    bookGenre: overrides.bookGenre ?? "CS",
    bookCoverUrl: overrides.bookCoverUrl ?? "/a.jpg",
    bookCoverColor: overrides.bookCoverColor ?? "#000",
    bookWaitingHolds: overrides.bookWaitingHolds ?? 0,
  };
}

describe("patchReservationCaches waiting holds sync", () => {
  it("create bumps bookWaitingHolds on borrow queue rows", () => {
    const client = new QueryClient();
    client.setQueryData(queryKeys.borrows.requests({}), [
      makeRequest({ id: "b-1", bookWaitingHolds: 0 }),
    ]);
    client.setQueryData(queryKeys.admin.stats, {
      reservationsWaiting: 0,
    });

    densifyReservationCreate(client, {
      id: "r-1",
      status: "WAITING",
      bookId: "book-1",
      userId: "user-2",
    });

    expect(
      client.getQueryData<BorrowRecordWithDetails[]>(
        queryKeys.borrows.requests({}),
      )?.[0]?.bookWaitingHolds,
    ).toBe(1);
  });

  it("WAITING→READY decrements bookWaitingHolds", () => {
    const client = new QueryClient();
    client.setQueryData(queryKeys.borrows.requests({}), [
      makeRequest({ id: "b-1", bookWaitingHolds: 1 }),
    ]);
    client.setQueryData(queryKeys.admin.stats, {
      reservationsWaiting: 1,
    });
    client.setQueryData(queryKeys.admin.reservationsWaitingCount, 1);

    densifyReservationStatus(client, {
      id: "r-1",
      bookId: "book-1",
      status: "READY",
      fromStatus: "WAITING",
    });

    expect(
      client.getQueryData<BorrowRecordWithDetails[]>(
        queryKeys.borrows.requests({}),
      )?.[0]?.bookWaitingHolds,
    ).toBe(0);
  });
});
