/**
 * Unit tests for borrow densify helpers (no network).
 * Parent: densify audit map — Wave A
 */

import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { queryKeys } from "@/lib/query/keys";
import type {
  BorrowRecordFull,
  BorrowRecordWithDetails,
} from "@/lib/services/borrows";
import type { BookBorrowStats } from "@/lib/services/books";
import {
  findCachedBorrowMeta,
  patchBookInventory,
  patchBorrowCachesOnCreate,
  patchBorrowCachesOnStatusChange,
  snapshotBorrowCacheBaselines,
} from "@/lib/utils/patchBorrowCaches";
import {
  isDensifiedEmpty,
  seedFromSsrIfEmpty,
} from "@/lib/utils/queryCacheLists";

function makeUserBorrow(
  overrides: Partial<BorrowRecordFull> & Pick<BorrowRecordFull, "id">,
): BorrowRecordFull {
  return {
    id: overrides.id,
    userId: overrides.userId ?? "user-1",
    bookId: overrides.bookId ?? "book-1",
    borrowDate: overrides.borrowDate ?? new Date("2026-08-01"),
    dueDate: overrides.dueDate ?? null,
    returnDate: overrides.returnDate ?? null,
    status: overrides.status ?? "PENDING",
    borrowedBy: overrides.borrowedBy ?? null,
    returnedBy: overrides.returnedBy ?? null,
    fineAmount: overrides.fineAmount ?? "0",
    notes: overrides.notes ?? null,
    renewalCount: overrides.renewalCount ?? 0,
    lastReminderSent: overrides.lastReminderSent ?? null,
    updatedAt: overrides.updatedAt ?? new Date("2026-08-01"),
    updatedBy: overrides.updatedBy ?? null,
    createdAt: overrides.createdAt ?? new Date("2026-08-01"),
    book: overrides.book ?? {
      id: overrides.bookId ?? "book-1",
      title: "Algorithms",
      author: "CLRS",
      genre: "CS",
      rating: 5,
      totalCopies: 3,
      availableCopies: 2,
      description: "",
      coverColor: "#000",
      coverUrl: "/a.jpg",
      videoUrl: "",
      summary: "",
      isActive: true,
      createdAt: null,
      updatedAt: null,
    },
  };
}

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
    status: overrides.status ?? "PENDING",
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
  };
}

describe("patchBorrowCaches", () => {
  it("status change re-seeds siblings after inactive wipe", () => {
    const client = new QueryClient();
    const pending = makeUserBorrow({ id: "b-1", status: "PENDING" });
    const sibling = makeUserBorrow({ id: "b-2", status: "BORROWED" });
    client.setQueryData(queryKeys.borrows.user("user-1"), [pending, sibling]);
    client.setQueryData(queryKeys.borrows.requests({ status: "PENDING" }), [
      makeRequest({ id: "b-1", status: "PENDING" }),
      makeRequest({ id: "b-3", status: "PENDING" }),
    ]);
    client.setQueryData(queryKeys.admin.navCounts, {
      books: 0,
      users: 0,
      pendingAdminRequests: 0,
      pendingSignUps: 0,
      pendingBorrows: 2,
      openTickets: 0,
      pendingReviews: 0,
    });

    const baselines = snapshotBorrowCacheBaselines(client, ["book-1"]);
    client.removeQueries({ queryKey: queryKeys.borrows.userRoot });
    client.removeQueries({ queryKey: queryKeys.borrows.requestsRoot });

    patchBorrowCachesOnStatusChange(
      client,
      {
        recordId: "b-1",
        patch: { status: "BORROWED", dueDate: "2026-08-12" },
        userId: "user-1",
        bookId: "book-1",
        inventory: { availableDelta: -1, activeDelta: 1 },
      },
      baselines,
    );

    const mine = client.getQueryData<BorrowRecordFull[]>(
      queryKeys.borrows.user("user-1"),
    );
    expect(mine?.find((r) => r.id === "b-1")?.status).toBe("BORROWED");
    expect(mine?.some((r) => r.id === "b-2")).toBe(true);

    const pendingList = client.getQueryData<BorrowRecordWithDetails[]>(
      queryKeys.borrows.requests({ status: "PENDING", search: undefined }),
    );
    expect(pendingList?.some((r) => r.id === "b-1")).toBe(false);
    expect(
      client.getQueryData(queryKeys.admin.navCounts),
    ).toMatchObject({ pendingBorrows: 1 });
    expect(pendingList?.some((r) => r.id === "b-3")).toBe(true);
  });

  it("create replaces temp id and keeps book meta from baseline", () => {
    const client = new QueryClient();
    const temp = makeUserBorrow({ id: "temp-1", status: "PENDING" });
    const sibling = makeUserBorrow({ id: "b-old", status: "RETURNED" });
    client.setQueryData(queryKeys.borrows.user("user-1"), [temp, sibling]);

    const baselines = snapshotBorrowCacheBaselines(client);
    client.removeQueries({ queryKey: queryKeys.borrows.userRoot });

    patchBorrowCachesOnCreate(
      client,
      {
        userId: "user-1",
        tempId: "temp-1",
        serverRecord: {
          id: "server-1",
          userId: "user-1",
          bookId: "book-1",
          status: "PENDING",
        },
      },
      baselines,
    );

    const mine = client.getQueryData<BorrowRecordFull[]>(
      queryKeys.borrows.user("user-1"),
    );
    expect(mine?.[0]?.id).toBe("server-1");
    expect(mine?.[0]?.book?.title).toBe("Algorithms");
    expect(mine?.some((r) => r.id === "b-old")).toBe(true);
  });

  it("return bumps availableCopies and borrow stats from inventory baseline", () => {
    const client = new QueryClient();
    client.setQueryData(queryKeys.books.detail("book-1"), {
      id: "book-1",
      availableCopies: 1,
      totalCopies: 3,
    });
    client.setQueryData(queryKeys.books.borrowStats("book-1"), {
      totalBorrows: 5,
      activeBorrows: 2,
      returnedBorrows: 3,
    } satisfies BookBorrowStats);

    // Simulate optimistic +1 already applied, then snapshot for densify restore
    patchBookInventory(client, "book-1", {
      availableDelta: 1,
      activeDelta: -1,
      returnedDelta: 1,
    });
    const baselines = snapshotBorrowCacheBaselines(client, ["book-1"]);
    client.removeQueries({ queryKey: queryKeys.books.detailRoot });
    client.removeQueries({ queryKey: queryKeys.books.borrowStatsRoot });

    patchBorrowCachesOnStatusChange(
      client,
      {
        recordId: "b-ret",
        patch: { status: "RETURNED", returnDate: "2026-08-06" },
        bookId: "book-1",
        restoreInventory: true,
      },
      baselines,
    );

    const detail = client.getQueryData<{ availableCopies: number }>(
      queryKeys.books.detail("book-1"),
    );
    const stats = client.getQueryData<BookBorrowStats>(
      queryKeys.books.borrowStats("book-1"),
    );
    expect(detail?.availableCopies).toBe(2);
    expect(stats?.activeBorrows).toBe(1);
    expect(stats?.returnedBorrows).toBe(4);
  });

  it("patchBookInventory also densifies /all-books list availableCopies", () => {
    const client = new QueryClient();
    client.setQueryData(queryKeys.books.detail("book-1"), {
      id: "book-1",
      availableCopies: 1,
      totalCopies: 3,
    });
    client.setQueryData(queryKeys.books.adminList({}), {
      books: [
        { id: "book-1", title: "A", availableCopies: 1 },
        { id: "book-2", title: "B", availableCopies: 4 },
      ],
      total: 2,
      page: 1,
      totalPages: 1,
      limit: 10,
    });

    patchBookInventory(client, "book-1", { availableDelta: 1 });

    const list = client.getQueryData<{
      books: Array<{ id: string; availableCopies: number }>;
    }>(queryKeys.books.adminList({}));
    expect(list?.books.find((b) => b.id === "book-1")?.availableCopies).toBe(2);
    expect(list?.books.find((b) => b.id === "book-2")?.availableCopies).toBe(4);
  });

  it("findCachedBorrowMeta reads user and request caches", () => {
    const client = new QueryClient();
    client.setQueryData(queryKeys.borrows.user("user-1"), [
      makeUserBorrow({ id: "b-1", bookId: "book-9", status: "BORROWED" }),
    ]);
    expect(findCachedBorrowMeta(client, "b-1")).toEqual({
      userId: "user-1",
      bookId: "book-9",
      status: "BORROWED",
    });
  });

  it("marks densify-empty when PENDING requests list becomes empty", () => {
    const client = new QueryClient();
    const pendingKey = queryKeys.borrows.requests({
      status: "PENDING",
      search: undefined,
    });
    client.setQueryData(pendingKey, [
      makeRequest({ id: "b-only", status: "PENDING" }),
    ]);
    client.setQueryData(
      queryKeys.borrows.requests({ status: undefined, search: undefined }),
      [makeRequest({ id: "b-only", status: "PENDING" })],
    );

    const baselines = snapshotBorrowCacheBaselines(client);
    patchBorrowCachesOnStatusChange(
      client,
      {
        recordId: "b-only",
        patch: { status: "CANCELLED" },
        userId: "user-1",
        bookId: "book-1",
        fromStatus: "PENDING",
      },
      baselines,
    );

    expect(client.getQueryData(pendingKey)).toEqual([]);
    expect(isDensifiedEmpty(pendingKey)).toBe(true);
    expect(
      seedFromSsrIfEmpty(client, pendingKey, [
        makeRequest({ id: "b-only", status: "PENDING" }),
      ]),
    ).toEqual([]);
  });

  it("recounts overview Active Borrows badges from densified universe", () => {
    const client = new QueryClient();
    client.setQueryData(queryKeys.admin.stats, {
      totalUsers: 1,
      approvedUsers: 1,
      pendingUsers: 0,
      rejectedUsers: 0,
      adminUsers: 1,
      totalBooks: 1,
      totalCopies: 1,
      availableCopies: 0,
      borrowedCopies: 1,
      activeBooks: 1,
      inactiveBooks: 0,
      booksWithISBN: 1,
      booksWithPublisher: 1,
      averagePageCount: 100,
      // Stale overview badges (post-optimistic fromStatus bug simulation)
      activeBorrows: 3,
      pendingBorrows: 1,
      returnedBooks: 4,
      cancelledBorrows: 2,
      recentBorrows: [],
      recentUsers: [],
      categoryStats: [],
      booksByYear: [],
      booksByLanguage: [],
      topRatedBooks: [],
      reservationsWaiting: 0,
    });
    const unfilteredKey = queryKeys.borrows.requests({
      status: undefined,
      search: undefined,
    });
    client.setQueryData(unfilteredKey, [
      makeRequest({ id: "a", status: "BORROWED" }),
      makeRequest({ id: "b", status: "BORROWED" }),
      makeRequest({ id: "c", status: "RETURNED" }),
      makeRequest({ id: "d", status: "RETURNED" }),
      makeRequest({ id: "e", status: "RETURNED" }),
      makeRequest({ id: "f", status: "RETURNED" }),
      makeRequest({ id: "g", status: "CANCELLED" }),
      makeRequest({ id: "h", status: "CANCELLED" }),
      makeRequest({ id: "i", status: "CANCELLED" }),
      makeRequest({ id: "j", status: "PENDING" }),
    ]);

    const baselines = snapshotBorrowCacheBaselines(client);
    // Optimistic list already CANCELLED — without fromStatus + sync, badges stay stale.
    client.setQueryData(unfilteredKey, [
      makeRequest({ id: "a", status: "BORROWED" }),
      makeRequest({ id: "b", status: "BORROWED" }),
      makeRequest({ id: "c", status: "RETURNED" }),
      makeRequest({ id: "d", status: "RETURNED" }),
      makeRequest({ id: "e", status: "RETURNED" }),
      makeRequest({ id: "f", status: "RETURNED" }),
      makeRequest({ id: "g", status: "CANCELLED" }),
      makeRequest({ id: "h", status: "CANCELLED" }),
      makeRequest({ id: "i", status: "CANCELLED" }),
      makeRequest({ id: "j", status: "CANCELLED" }),
    ]);

    patchBorrowCachesOnStatusChange(
      client,
      {
        recordId: "j",
        patch: { status: "CANCELLED" },
        userId: "user-1",
        bookId: "book-1",
        fromStatus: "PENDING",
      },
      baselines,
    );

    const stats = client.getQueryData<{
      activeBorrows: number;
      pendingBorrows: number;
      returnedBooks: number;
      cancelledBorrows: number;
    }>(queryKeys.admin.stats);
    expect(stats?.activeBorrows).toBe(2);
    expect(stats?.pendingBorrows).toBe(0);
    expect(stats?.returnedBooks).toBe(4);
    expect(stats?.cancelledBorrows).toBe(4);
  });
});
