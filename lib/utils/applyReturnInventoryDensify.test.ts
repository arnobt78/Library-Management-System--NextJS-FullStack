/**
 * Unit tests for applyReturnInventoryDensify settle adapter.
 * Parent: Book panel DNA closeout
 */

import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { queryKeys } from "@/lib/query/keys";
import type { BorrowRecordWithDetails } from "@/lib/services/borrows";
import { applyReturnInventoryDensify } from "@/lib/utils/applyReturnInventoryDensify";

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
    bookAvailableCopies: overrides.bookAvailableCopies ?? 0,
    bookTotalCopies: overrides.bookTotalCopies ?? 1,
    bookWaitingHolds: overrides.bookWaitingHolds ?? 0,
  };
}

describe("applyReturnInventoryDensify", () => {
  it("sets absolute availableCopies on books.detail and borrow rows", () => {
    const client = new QueryClient();
    client.setQueryData(queryKeys.books.detail("book-1"), {
      id: "book-1",
      availableCopies: 0,
      totalCopies: 1,
    });
    client.setQueryData(queryKeys.borrows.requests({}), [
      makeRequest({ id: "b-1", bookAvailableCopies: 0, bookWaitingHolds: 0 }),
    ]);

    applyReturnInventoryDensify(client, {
      bookId: "book-1",
      availableCopies: 1,
    });

    expect(
      client.getQueryData<{ availableCopies: number }>(
        queryKeys.books.detail("book-1"),
      )?.availableCopies,
    ).toBe(1);
    expect(
      client.getQueryData<BorrowRecordWithDetails[]>(
        queryKeys.borrows.requests({}),
      )?.[0]?.bookAvailableCopies,
    ).toBe(1);
  });

  it("READY offer decrements bookWaitingHolds on queue rows", () => {
    const client = new QueryClient();
    client.setQueryData(queryKeys.books.detail("book-1"), {
      id: "book-1",
      availableCopies: 0,
      totalCopies: 1,
    });
    client.setQueryData(queryKeys.borrows.requests({}), [
      makeRequest({ id: "b-1", bookAvailableCopies: 0, bookWaitingHolds: 1 }),
    ]);
    client.setQueryData(queryKeys.admin.reservationsWaitingCount, 1);
    client.setQueryData(queryKeys.circulation.userReservations("user-2"), [
      { id: "r-1", status: "WAITING", bookId: "book-1", userId: "user-2" },
    ]);

    applyReturnInventoryDensify(client, {
      bookId: "book-1",
      availableCopies: 0,
      offeredReservationId: "r-1",
    });

    expect(
      client.getQueryData<{ availableCopies: number }>(
        queryKeys.books.detail("book-1"),
      )?.availableCopies,
    ).toBe(0);
    expect(
      client.getQueryData<BorrowRecordWithDetails[]>(
        queryKeys.borrows.requests({}),
      )?.[0]?.bookWaitingHolds,
    ).toBe(0);
    expect(
      client.getQueryData<Array<{ status: string }>>(
        queryKeys.circulation.userReservations("user-2"),
      )?.[0]?.status,
    ).toBe("READY");
  });
});
