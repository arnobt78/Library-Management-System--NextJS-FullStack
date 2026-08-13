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
  patchBorrowCachesOnRenewal,
  patchBorrowCachesOnStatusChange,
  prependBorrowAuditEvent,
  setBookAvailableCopiesAbsolute,
  snapshotBorrowCacheBaselines,
  syncBorrowRequestBookFields,
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
    bookAvailableCopies: overrides.bookAvailableCopies,
    bookTotalCopies: overrides.bookTotalCopies,
    bookWaitingHolds: overrides.bookWaitingHolds,
    approvedByActor: overrides.approvedByActor,
    returnedByActor: overrides.returnedByActor,
    cancelledByActor: overrides.cancelledByActor,
    auditEvents: overrides.auditEvents,
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

  it("create upserts PENDING into admin borrow-requests universe + nav", () => {
    const client = new QueryClient();
    const stale = makeRequest({ id: "b-old", status: "PENDING" });
    const unfilteredKey = queryKeys.borrows.requests({
      status: undefined,
      search: undefined,
    });
    const pendingKey = queryKeys.borrows.requests({
      status: "PENDING",
      search: undefined,
    });
    client.setQueryData(unfilteredKey, [stale]);
    client.setQueryData(pendingKey, [stale]);
    client.setQueryData(queryKeys.admin.navCounts, {
      books: 0,
      users: 0,
      pendingAdminRequests: 0,
      pendingSignUps: 0,
      pendingBorrows: 1,
      openTickets: 0,
      pendingReviews: 0,
    });
    client.setQueryData(queryKeys.books.detail("book-2"), {
      id: "book-2",
      title: "React in Action",
      author: "Thomas",
      genre: "JS",
      coverUrl: "/r.jpg",
      coverColor: "#111",
    });
    const temp = makeUserBorrow({
      id: "temp-new",
      bookId: "book-2",
      status: "PENDING",
      book: {
        id: "book-2",
        title: "React in Action",
        author: "Thomas",
        genre: "JS",
        rating: 4,
        totalCopies: 2,
        availableCopies: 1,
        description: "",
        coverColor: "#111",
        coverUrl: "/r.jpg",
        videoUrl: "",
        summary: "",
        isActive: true,
        createdAt: null,
        updatedAt: null,
      },
    });
    client.setQueryData(queryKeys.borrows.user("user-1"), [temp]);

    const baselines = snapshotBorrowCacheBaselines(client);
    // Soft-nav poison: densify must upsert even when invalidate left stale lists.
    patchBorrowCachesOnCreate(
      client,
      {
        userId: "user-1",
        tempId: "temp-new",
        serverRecord: {
          id: "server-new",
          userId: "user-1",
          bookId: "book-2",
          status: "PENDING",
        },
        requestMeta: {
          userName: "Test Admin",
          userEmail: "test@admin.com",
          userUniversityId: 900002,
        },
      },
      baselines,
    );

    const universe = client.getQueryData<BorrowRecordWithDetails[]>(unfilteredKey);
    expect(universe?.some((r) => r.id === "server-new")).toBe(true);
    expect(universe?.find((r) => r.id === "server-new")?.bookTitle).toBe(
      "React in Action",
    );
    const pending = client.getQueryData<BorrowRecordWithDetails[]>(pendingKey);
    expect(pending?.some((r) => r.id === "server-new")).toBe(true);
    expect(pending?.length).toBe(2);
    expect(client.getQueryData(queryKeys.admin.navCounts)).toMatchObject({
      pendingBorrows: 2,
    });
    // seedFromSsrIfEmpty must keep densified universe over older SSR.
    const seeded = seedFromSsrIfEmpty(client, unfilteredKey, [stale]);
    expect(seeded?.some((r) => r.id === "server-new")).toBe(true);
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
      inactiveTitles: [],
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

  it("status change upserts borrows.requestDetail with actor fields", () => {
    const client = new QueryClient();
    const detail = makeRequest({ id: "b-1", status: "PENDING" });
    client.setQueryData(queryKeys.borrows.requestDetail("b-1"), detail);
    client.setQueryData(queryKeys.borrows.requests({}), [detail]);

    const actor = {
      id: "admin-1",
      fullName: "Admin One",
      email: "admin@lib.test",
      universityCard: "card-1",
    };
    patchBorrowCachesOnStatusChange(client, {
      recordId: "b-1",
      patch: {
        status: "BORROWED",
        dueDate: "2026-08-20",
        borrowedBy: actor.email,
        approvedByActor: actor,
      },
      userId: "user-1",
      bookId: "book-1",
      fromStatus: "PENDING",
    });

    const next = client.getQueryData<BorrowRecordWithDetails>(
      queryKeys.borrows.requestDetail("b-1"),
    );
    expect(next?.status).toBe("BORROWED");
    expect(next?.dueDate).toBe("2026-08-20");
    expect(next?.borrowedBy).toBe("admin@lib.test");
    expect(next?.approvedByActor).toEqual(actor);
  });

  it("CANCELLED densify retains cancelledByActor on requestDetail", () => {
    const client = new QueryClient();
    const detail = makeRequest({ id: "c-1", status: "PENDING" });
    client.setQueryData(queryKeys.borrows.requestDetail("c-1"), detail);
    client.setQueryData(queryKeys.borrows.requests({}), [detail]);

    const actor = {
      id: "admin-1",
      fullName: "Admin One",
      email: "admin@lib.test",
      universityCard: "card-1",
    };
    patchBorrowCachesOnStatusChange(client, {
      recordId: "c-1",
      patch: {
        status: "CANCELLED",
        updatedBy: actor.email,
        cancelledByActor: actor,
      },
      userId: "user-1",
      bookId: "book-1",
      fromStatus: "PENDING",
    });

    const next = client.getQueryData<BorrowRecordWithDetails>(
      queryKeys.borrows.requestDetail("c-1"),
    );
    expect(next?.status).toBe("CANCELLED");
    expect(next?.updatedBy).toBe("admin@lib.test");
    expect(next?.cancelledByActor).toEqual(actor);
  });

  it("prependBorrowAuditEvent enriches null card from approvedByActor", () => {
    const client = new QueryClient();
    client.setQueryData(
      queryKeys.borrows.requestDetail("c-3"),
      makeRequest({
        id: "c-3",
        status: "BORROWED",
        approvedByActor: {
          id: "admin-1",
          fullName: "Test Admin",
          email: "test@admin.com",
          universityCard: "/cards/admin.jpg",
        },
        auditEvents: [],
      }),
    );

    prependBorrowAuditEvent(client, {
      recordId: "c-3",
      action: "UPDATE",
      details: { status: "RETURNED", title: "Demo Book" },
      actorId: "admin-1",
      actorName: "Test Admin",
      actorEmail: "test@admin.com",
      actorUniversityCard: null,
    });

    const next = client.getQueryData<BorrowRecordWithDetails>(
      queryKeys.borrows.requestDetail("c-3"),
    );
    expect(next?.auditEvents?.[0]?.actorUniversityCard).toBe(
      "/cards/admin.jpg",
    );
  });

  it("renewal densify updates requestDetail dueDate and renewalCount", () => {
    const client = new QueryClient();
    client.setQueryData(
      queryKeys.borrows.requestDetail("b-1"),
      makeRequest({
        id: "b-1",
        status: "BORROWED",
        dueDate: "2026-08-10",
        renewalCount: 0,
      }),
    );
    client.setQueryData(queryKeys.borrows.user("user-1"), [
      makeUserBorrow({
        id: "b-1",
        status: "BORROWED",
        dueDate: "2026-08-10",
        renewalCount: 0,
      }),
    ]);
    client.setQueryData(queryKeys.borrows.requests({}), [
      makeRequest({
        id: "b-1",
        status: "BORROWED",
        dueDate: "2026-08-10",
        renewalCount: 0,
      }),
    ]);

    patchBorrowCachesOnRenewal(client, {
      recordId: "b-1",
      userId: "user-1",
      dueDate: "2026-08-17",
      renewalCount: 1,
    });

    const detail = client.getQueryData<BorrowRecordWithDetails>(
      queryKeys.borrows.requestDetail("b-1"),
    );
    expect(detail?.dueDate).toBe("2026-08-17");
    expect(detail?.renewalCount).toBe(1);
  });

  it("patchBookInventory syncs bookAvailableCopies onto queue and detail rows", () => {
    const client = new QueryClient();
    client.setQueryData(queryKeys.books.detail("book-1"), {
      id: "book-1",
      availableCopies: 2,
      totalCopies: 3,
    });
    client.setQueryData(queryKeys.borrows.requests({}), [
      makeRequest({
        id: "b-1",
        bookId: "book-1",
        bookAvailableCopies: 2,
        bookWaitingHolds: 1,
      }),
      makeRequest({
        id: "b-other",
        bookId: "book-2",
        bookAvailableCopies: 5,
        bookWaitingHolds: 0,
      }),
    ]);
    client.setQueryData(
      queryKeys.borrows.requestDetail("b-1"),
      makeRequest({
        id: "b-1",
        bookId: "book-1",
        bookAvailableCopies: 2,
        bookWaitingHolds: 1,
      }),
    );

    patchBookInventory(client, "book-1", { availableDelta: -1 });

    const list = client.getQueryData<BorrowRecordWithDetails[]>(
      queryKeys.borrows.requests({}),
    );
    expect(list?.find((r) => r.id === "b-1")?.bookAvailableCopies).toBe(1);
    expect(list?.find((r) => r.id === "b-other")?.bookAvailableCopies).toBe(5);
    const detail = client.getQueryData<BorrowRecordWithDetails>(
      queryKeys.borrows.requestDetail("b-1"),
    );
    expect(detail?.bookAvailableCopies).toBe(1);
  });

  it("setBookAvailableCopiesAbsolute overrides optimistic +1 after return+offer", () => {
    const client = new QueryClient();
    client.setQueryData(queryKeys.books.detail("book-1"), {
      id: "book-1",
      availableCopies: 0,
      totalCopies: 1,
    });
    client.setQueryData(queryKeys.borrows.requests({}), [
      makeRequest({
        id: "b-1",
        bookId: "book-1",
        bookAvailableCopies: 0,
        bookWaitingHolds: 1,
      }),
    ]);

    // Optimistic return densify would paint +1; offer net leaves 0.
    patchBookInventory(client, "book-1", { availableDelta: 1 });
    expect(
      client.getQueryData<{ availableCopies: number }>(
        queryKeys.books.detail("book-1"),
      )?.availableCopies,
    ).toBe(1);

    setBookAvailableCopiesAbsolute(client, "book-1", 0);

    expect(
      client.getQueryData<{ availableCopies: number }>(
        queryKeys.books.detail("book-1"),
      )?.availableCopies,
    ).toBe(0);
    expect(
      client.getQueryData<BorrowRecordWithDetails[]>(
        queryKeys.borrows.requests({}),
      )?.[0]?.bookAvailableCopies,
    ).toBe(0);
  });

  it("syncBorrowRequestBookFields applies waitingHoldsDelta", () => {
    const client = new QueryClient();
    client.setQueryData(queryKeys.borrows.requests({}), [
      makeRequest({
        id: "b-1",
        bookId: "book-1",
        bookWaitingHolds: 2,
      }),
    ]);

    syncBorrowRequestBookFields(client, "book-1", { waitingHoldsDelta: -1 });

    expect(
      client.getQueryData<BorrowRecordWithDetails[]>(
        queryKeys.borrows.requests({}),
      )?.[0]?.bookWaitingHolds,
    ).toBe(1);
  });
});
