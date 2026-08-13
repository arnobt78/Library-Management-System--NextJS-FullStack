/**
 * Unit tests for Book Details view-model + return waiting-holds helper.
 * Parent: Book Details DNA densify
 */

import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { queryKeys } from "@/lib/query/keys";
import type { BorrowRecordWithDetails } from "@/lib/services/borrows";
import {
  buildBookDetailsViewModel,
  bookDetailsSourceFromBorrowRequest,
  getBookAvailabilityStatus,
} from "@/lib/books/bookDetailsViewModel";
import { getCachedBookWaitingHolds } from "@/lib/utils/syncBorrowRequestBookFields";

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
    bookWaitingHolds: overrides.bookWaitingHolds,
    bookIsbn: overrides.bookIsbn,
    bookAvailableCopies: overrides.bookAvailableCopies,
    bookTotalCopies: overrides.bookTotalCopies,
  };
}

describe("bookDetailsViewModel", () => {
  it("maps catalog ISBN and availability status", () => {
    const vm = buildBookDetailsViewModel(
      {
        id: "b1",
        title: "Algorithms",
        isbn: "9780321573513",
        publicationYear: 2011,
        totalCopies: 321,
        availableCopies: 320,
        isActive: true,
      },
      { totalBorrows: 2, activeBorrows: 1, returnedBorrows: 1 },
    );
    expect(vm.catalog.find((f) => f.key === "isbn")?.value).toBe(
      "9780321573513",
    );
    expect(vm.availability.label).toBe("Available");
    expect(vm.status.label).toBe("Active");
    expect(vm.borrowStats.find((f) => f.key === "totalBorrows")?.value).toBe(
      "2",
    );
  });

  it("seeds from borrow request row", () => {
    const source = bookDetailsSourceFromBorrowRequest(
      makeRequest({
        id: "r1",
        bookIsbn: "9780",
        bookAvailableCopies: 3,
        bookTotalCopies: 5,
      }),
    );
    expect(source.isbn).toBe("9780");
    expect(source.availableCopies).toBe(3);
  });

  it("marks low availability", () => {
    expect(getBookAvailabilityStatus(1, 20).label).toBe("Low");
    expect(getBookAvailabilityStatus(0, 5).label).toBe("Unavailable");
  });
});

describe("getCachedBookWaitingHolds", () => {
  it("returns max waiting holds for a book from queue cache", () => {
    const client = new QueryClient();
    client.setQueryData(queryKeys.borrows.requests({}), [
      makeRequest({ id: "a", bookWaitingHolds: 2 }),
      makeRequest({ id: "b", bookId: "book-2", bookWaitingHolds: 9 }),
    ]);
    expect(getCachedBookWaitingHolds(client, "book-1")).toBe(2);
    expect(getCachedBookWaitingHolds(client, "book-2")).toBe(9);
    expect(getCachedBookWaitingHolds(client, "missing")).toBe(0);
  });
});
