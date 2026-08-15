/**
 * Unit tests for book densify helpers (featured/related + admin list availability).
 */

import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { EMPTY_ADMIN_NAV_COUNTS } from "@/lib/admin/adminNavCountTypes";
import { queryKeys } from "@/lib/query/keys";
import type { BooksListResponse } from "@/lib/services/books";
import { ADMIN_BOOKS_UNFILTERED } from "@/lib/ui/adminListUniverse";
import {
  densifyBookDelete,
  densifyBookWrite,
  patchAdminListAvailability,
  prependBookAuditEvent,
} from "@/lib/utils/patchBookCaches";
import { isDensifiedEmpty } from "@/lib/utils/queryCacheLists";

describe("patchBookCaches", () => {
  it("patchAdminListAvailability updates matching catalog rows", () => {
    const client = new QueryClient();
    const list: BooksListResponse = {
      books: [
        {
          id: "book-1",
          title: "A",
          availableCopies: 2,
        } as BooksListResponse["books"][number],
        {
          id: "book-2",
          title: "B",
          availableCopies: 1,
        } as BooksListResponse["books"][number],
      ],
      total: 2,
      page: 1,
      totalPages: 1,
      limit: 10,
    };
    client.setQueryData(queryKeys.books.adminList({}), list);
    patchAdminListAvailability(client, "book-1", 0);
    const next = client.getQueryData<BooksListResponse>(
      queryKeys.books.adminList({}),
    );
    expect(next?.books.find((b) => b.id === "book-1")?.availableCopies).toBe(
      0,
    );
    expect(next?.books.find((b) => b.id === "book-2")?.availableCopies).toBe(
      1,
    );
  });

  it("densifyBookWrite patches featured and related strips", () => {
    const client = new QueryClient();
    client.setQueryData(queryKeys.books.featured(1), [
      { id: "book-1", title: "Old", availableCopies: 1 },
    ]);
    client.setQueryData(queryKeys.books.related("other", 6), [
      { id: "book-1", title: "Old", availableCopies: 1 },
      { id: "book-9", title: "Keep", availableCopies: 2 },
    ]);

    densifyBookWrite(client, {
      id: "book-1",
      title: "New Title",
      availableCopies: 5,
    });

    expect(client.getQueryData(queryKeys.books.featured(1))).toEqual([
      { id: "book-1", title: "New Title", availableCopies: 5 },
    ]);
    const related = client.getQueryData<Array<{ id: string; title: string }>>(
      queryKeys.books.related("other", 6),
    );
    expect(related?.find((b) => b.id === "book-1")?.title).toBe("New Title");
    expect(related?.some((b) => b.id === "book-9")).toBe(true);
  });

  it("densifyBookDelete removes from featured and marks empty", () => {
    const client = new QueryClient();
    const key = queryKeys.books.featured(1);
    client.setQueryData(key, [{ id: "book-1", title: "Gone" }]);
    densifyBookDelete(client, ["book-1"]);
    expect(client.getQueryData(key)).toEqual([]);
    expect(isDensifiedEmpty(key)).toBe(true);
  });

  it("densifyBookDelete strips recommendations and borrowStats", () => {
    const client = new QueryClient();
    const recKey = queryKeys.books.recommendations(undefined, 10);
    client.setQueryData(recKey, [
      { id: "book-1", title: "Gone" },
      { id: "book-2", title: "Keep" },
    ]);
    client.setQueryData(queryKeys.books.borrowStats("book-1"), {
      totalBorrows: 3,
      activeBorrows: 1,
      returnedBorrows: 2,
    });
    densifyBookDelete(client, ["book-1"]);
    const recs = client.getQueryData<Array<{ id: string }>>(recKey);
    expect(recs?.some((b) => b.id === "book-1")).toBe(false);
    expect(recs?.some((b) => b.id === "book-2")).toBe(true);
    expect(client.getQueryData(queryKeys.books.borrowStats("book-1"))).toBe(
      undefined,
    );
  });

  it("update densify does not invent into filtered lists or inflate nav", () => {
    const client = new QueryClient();
    const unfilteredKey = queryKeys.books.adminList(ADMIN_BOOKS_UNFILTERED);
    const filteredKey = queryKeys.books.adminList({
      ...ADMIN_BOOKS_UNFILTERED,
      genre: "Fiction",
    });
    const book = {
      id: "book-1",
      title: "Algorithms",
      genre: "CS",
      availableCopies: 1,
    } as BooksListResponse["books"][number];

    client.setQueryData(unfilteredKey, {
      books: [book],
      total: 17,
      page: 1,
      totalPages: 1,
      limit: 1000,
    });
    client.setQueryData(filteredKey, {
      books: [
        {
          id: "other",
          title: "Other",
          genre: "Fiction",
        } as BooksListResponse["books"][number],
      ],
      total: 19,
      page: 1,
      totalPages: 1,
      limit: 1000,
    });
    client.setQueryData(queryKeys.admin.navCounts, {
      ...EMPTY_ADMIN_NAV_COUNTS,
      books: 19,
    });

    densifyBookWrite(client, {
      ...book,
      title: "Algorithms",
      isActive: false,
      language: "English",
    });

    const filtered = client.getQueryData<BooksListResponse>(filteredKey);
    expect(filtered?.total).toBe(19);
    expect(filtered?.books.some((b) => b.id === "book-1")).toBe(false);
    const unfiltered = client.getQueryData<BooksListResponse>(unfilteredKey);
    expect(unfiltered?.total).toBe(17);
    expect(
      client.getQueryData<{ books: number }>(queryKeys.admin.navCounts)?.books,
    ).toBe(17);
  });

  it("create densify bumps unfiltered total and nav sorted A-Z", () => {
    const client = new QueryClient();
    const unfilteredKey = queryKeys.books.adminList(ADMIN_BOOKS_UNFILTERED);
    client.setQueryData(unfilteredKey, {
      books: [
        {
          id: "book-1",
          title: "Zebra",
        } as BooksListResponse["books"][number],
      ],
      total: 1,
      page: 1,
      totalPages: 1,
      limit: 1000,
    });

    densifyBookWrite(client, {
      id: "book-2",
      title: "Alpha",
      availableCopies: 1,
    });

    const next = client.getQueryData<BooksListResponse>(unfilteredKey);
    expect(next?.total).toBe(2);
    expect(next?.books.map((b) => b.title)).toEqual(["Alpha", "Zebra"]);
    expect(
      client.getQueryData<{ books: number }>(queryKeys.admin.navCounts)?.books,
    ).toBe(2);
  });

  it("featuring book B replaces featured strip A and clears sibling badges", () => {
    const client = new QueryClient();
    const unfilteredKey = queryKeys.books.adminList(ADMIN_BOOKS_UNFILTERED);
    const bookA = {
      id: "book-a",
      title: "Algorithms",
      isFeatured: true,
      isActive: true,
    } as BooksListResponse["books"][number];
    const bookB = {
      id: "book-b",
      title: "Cracking",
      isFeatured: false,
      isActive: true,
    } as BooksListResponse["books"][number];

    client.setQueryData(queryKeys.books.featured(1), [
      { id: "book-a", title: "Algorithms", isFeatured: true, isActive: true },
    ]);
    client.setQueryData(unfilteredKey, {
      books: [bookA, bookB],
      total: 2,
      page: 1,
      totalPages: 1,
      limit: 1000,
    });

    densifyBookWrite(client, {
      id: "book-b",
      title: "Cracking",
      isFeatured: true,
      isActive: true,
    });

    expect(client.getQueryData(queryKeys.books.featured(1))).toEqual([
      {
        id: "book-b",
        title: "Cracking",
        isFeatured: true,
        isActive: true,
      },
    ]);
    const list = client.getQueryData<BooksListResponse>(unfilteredKey);
    expect(list?.books.find((b) => b.id === "book-a")?.isFeatured).toBe(false);
    expect(list?.books.find((b) => b.id === "book-b")?.isFeatured).toBe(true);
  });

  it("deactivating featured hero seeds fallback from unfiltered catalog", () => {
    const client = new QueryClient();
    const unfilteredKey = queryKeys.books.adminList(ADMIN_BOOKS_UNFILTERED);
    const hero = {
      id: "book-a",
      title: "Algorithms",
      isFeatured: true,
      isActive: true,
      createdAt: "2026-01-01T00:00:00.000Z",
    } as unknown as BooksListResponse["books"][number];
    const fallback = {
      id: "book-b",
      title: "Cracking",
      isFeatured: false,
      isActive: true,
      createdAt: "2026-08-09T00:00:00.000Z",
    } as unknown as BooksListResponse["books"][number];

    client.setQueryData(queryKeys.books.featured(1), [
      {
        id: "book-a",
        title: "Algorithms",
        isFeatured: true,
        isActive: true,
      },
    ]);
    client.setQueryData(queryKeys.books.detail("book-a"), hero);
    client.setQueryData(unfilteredKey, {
      books: [hero, fallback],
      total: 2,
      page: 1,
      totalPages: 1,
      limit: 1000,
    });

    densifyBookWrite(client, {
      id: "book-a",
      title: "Algorithms",
      isFeatured: false,
      isActive: false,
    });

    const strip = client.getQueryData<Array<{ id: string }>>(
      queryKeys.books.featured(1),
    );
    expect(strip?.[0]?.id).toBe("book-b");
  });

  it("unfeaturing hero without catalog fallback evicts featured strip", () => {
    const client = new QueryClient();
    client.setQueryData(queryKeys.books.featured(1), [
      { id: "book-a", title: "Only", isFeatured: true, isActive: true },
    ]);
    client.setQueryData(queryKeys.books.detail("book-a"), {
      id: "book-a",
      isFeatured: true,
      isActive: true,
    });

    densifyBookWrite(client, {
      id: "book-a",
      title: "Only",
      isFeatured: false,
      isActive: true,
    });

    expect(client.getQueryData(queryKeys.books.featured(1))).toBeUndefined();
  });

  it("densifyBookWrite preserves updatedByActor when thin patch omits it", () => {
    const client = new QueryClient();
    const actor = {
      id: "admin-1",
      fullName: "Test Admin",
      email: "test@admin.com",
      universityCard: null,
    };
    client.setQueryData(queryKeys.books.detail("book-1"), {
      id: "book-1",
      title: "Algorithms",
      isActive: true,
      isFeatured: false,
      totalCopies: 10,
      availableCopies: 9,
      updatedByActor: actor,
    });

    densifyBookWrite(client, {
      id: "book-1",
      title: "Algorithms",
      availableCopies: 8,
    });

    const detail = client.getQueryData<{
      availableCopies?: number;
      updatedByActor?: typeof actor;
    }>(queryKeys.books.detail("book-1"));
    expect(detail?.availableCopies).toBe(8);
    expect(detail?.updatedByActor).toEqual(actor);
  });

  it("densifyBookWrite prefers incoming updatedByActor over previous", () => {
    const client = new QueryClient();
    client.setQueryData(queryKeys.books.detail("book-1"), {
      id: "book-1",
      title: "Algorithms",
      updatedByActor: {
        id: "old",
        fullName: "Old Admin",
        email: "old@admin.com",
        universityCard: null,
      },
    });

    const next = {
      id: "next",
      fullName: "Test Admin",
      email: "test@admin.com",
      universityCard: "/images/profile-img.png",
    };
    densifyBookWrite(client, {
      id: "book-1",
      title: "Algorithms",
      updatedByActor: next,
    });

    const detail = client.getQueryData<{ updatedByActor?: typeof next }>(
      queryKeys.books.detail("book-1"),
    );
    expect(detail?.updatedByActor).toEqual(next);
  });

  it("densifyBookWrite preserves createdByActor when thin update omits it", () => {
    const client = new QueryClient();
    const creator = {
      id: "admin-1",
      fullName: "Test Admin",
      email: "test@admin.com",
      universityCard: "/images/profile-img.png",
    };
    client.setQueryData(queryKeys.books.detail("book-1"), {
      id: "book-1",
      title: "Algorithms",
      createdByActor: creator,
      updatedByActor: creator,
    });

    densifyBookWrite(client, {
      id: "book-1",
      title: "Algorithms",
      availableCopies: 7,
      updatedByActor: {
        id: "admin-2",
        fullName: "Other Admin",
        email: "other@admin.com",
        universityCard: null,
      },
    });

    const detail = client.getQueryData<{
      createdByActor?: typeof creator;
      updatedByActor?: { email: string };
      availableCopies?: number;
    }>(queryKeys.books.detail("book-1"));
    expect(detail?.availableCopies).toBe(7);
    expect(detail?.createdByActor).toEqual(creator);
    expect(detail?.updatedByActor?.email).toBe("other@admin.com");
  });

  it("densifyBookWrite preserves auditEvents when thin patch omits it", () => {
    const client = new QueryClient();
    const auditEvents: TicketActivityEvent[] = [
      {
        id: "evt-1",
        kind: "audit",
        at: "2026-08-14T00:00:00.000Z",
        label: "Book created",
        actorId: "admin-1",
        actorName: "Test Admin",
        actorEmail: "test@admin.com",
        actorUniversityCard: "/images/profile-img.png",
        detail: "Algorithms",
      },
    ];
    client.setQueryData(queryKeys.books.detail("book-1"), {
      id: "book-1",
      title: "Algorithms",
      auditEvents,
    });

    densifyBookWrite(client, {
      id: "book-1",
      title: "Algorithms",
      availableCopies: 5,
    });

    const detail = client.getQueryData<{
      availableCopies?: number;
      auditEvents?: TicketActivityEvent[];
    }>(queryKeys.books.detail("book-1"));
    expect(detail?.availableCopies).toBe(5);
    expect(detail?.auditEvents).toEqual(auditEvents);
  });

  it("prependBookAuditEvent FIFO-25 and enriches card from updatedByActor", () => {
    const client = new QueryClient();
    client.setQueryData(queryKeys.books.detail("book-1"), {
      id: "book-1",
      title: "Algorithms",
      auditEvents: [],
      updatedByActor: {
        id: "admin-1",
        fullName: "Test Admin",
        email: "test@admin.com",
        universityCard: "/images/profile-img.png",
      },
    });

    prependBookAuditEvent(client, {
      bookId: "book-1",
      action: "UPDATE",
      details: { title: "Algorithms" },
      actorId: "admin-1",
      actorName: "Test Admin",
      actorEmail: "test@admin.com",
      actorUniversityCard: null,
    });

    const detail = client.getQueryData<{
      auditEvents?: TicketActivityEvent[];
    }>(queryKeys.books.detail("book-1"));
    expect(detail?.auditEvents).toHaveLength(1);
    expect(detail?.auditEvents?.[0]?.label).toBe("Book updated");
    expect(detail?.auditEvents?.[0]?.detail).toBe("Algorithms");
    expect(detail?.auditEvents?.[0]?.actorUniversityCard).toBe(
      "/images/profile-img.png",
    );
  });

  it("densifyBookWrite create clears updatedByActor while keeping creator", () => {
    const client = new QueryClient();
    const creator = {
      id: "admin-1",
      fullName: "Test Admin",
      email: "test@admin.com",
      universityCard: null as string | null,
    };

    densifyBookWrite(client, {
      id: "book-new",
      title: "Jelly",
      createdByActor: creator,
      updatedByActor: null,
      updatedBy: null,
    });

    const detail = client.getQueryData<{
      createdByActor?: typeof creator;
      updatedByActor?: typeof creator | null;
      updatedBy?: string | null;
    }>(queryKeys.books.detail("book-new"));
    expect(detail?.createdByActor).toEqual(creator);
    expect(detail?.updatedByActor).toBeNull();
    expect(detail?.updatedBy).toBeNull();
  });

  it("prependBookAuditEvent stores action actor for Activity PersonAttribution", () => {
    const client = new QueryClient();
    client.setQueryData(queryKeys.books.detail("book-1"), {
      id: "book-1",
      title: "Jelly",
      auditEvents: [],
    });

    prependBookAuditEvent(client, {
      bookId: "book-1",
      action: "CREATE",
      details: { title: "Jelly" },
      actorId: "admin-1",
      actorName: "Test Admin",
      actorEmail: "test@admin.com",
      actorUniversityCard: "/images/profile-img.png",
    });

    const detail = client.getQueryData<{
      auditEvents?: TicketActivityEvent[];
    }>(queryKeys.books.detail("book-1"));
    expect(detail?.auditEvents?.[0]?.actorId).toBe("admin-1");
    expect(detail?.auditEvents?.[0]?.actorName).toBe("Test Admin");
    expect(detail?.auditEvents?.[0]?.actorEmail).toBe("test@admin.com");
  });

  it("densifyBookDelete backfills page-12 hole from next warm page", () => {
    const client = new QueryClient();
    const page1Filters = { page: 1, limit: 12, sort: "title" as const };
    const page2Filters = { page: 2, limit: 12, sort: "title" as const };
    const page1Books = Array.from({ length: 12 }, (_, i) => ({
      id: `book-${i + 1}`,
      title: `Title ${String(i + 1).padStart(2, "0")}`,
    })) as BooksListResponse["books"];
    const page2Books = [
      {
        id: "book-13",
        title: "Title 13",
      },
      {
        id: "book-14",
        title: "Title 14",
      },
    ] as BooksListResponse["books"];

    client.setQueryData(queryKeys.books.adminList(page1Filters), {
      books: page1Books,
      total: 18,
      page: 1,
      totalPages: 2,
      limit: 12,
    });
    client.setQueryData(queryKeys.books.adminList(page2Filters), {
      books: page2Books,
      total: 18,
      page: 2,
      totalPages: 2,
      limit: 12,
    });

    densifyBookDelete(client, ["book-1"]);

    const page1 = client.getQueryData<BooksListResponse>(
      queryKeys.books.adminList(page1Filters),
    );
    const page2 = client.getQueryData<BooksListResponse>(
      queryKeys.books.adminList(page2Filters),
    );
    expect(page1?.total).toBe(17);
    expect(page1?.books).toHaveLength(12);
    expect(page1?.books.some((b) => b.id === "book-1")).toBe(false);
    expect(page1?.books.some((b) => b.id === "book-13")).toBe(true);
    expect(page2?.books).toHaveLength(1);
    expect(page2?.books[0]?.id).toBe("book-14");
    expect(page2?.total).toBe(17);
  });

  it("densifyBookDelete decrements limit:1 universe total without the deleted row", () => {
    const client = new QueryClient();
    const universeKey = queryKeys.books.adminList({ page: 1, limit: 1 });
    client.setQueryData(universeKey, {
      books: [],
      total: 18,
      page: 1,
      totalPages: 1,
      limit: 1,
    });

    densifyBookDelete(client, ["book-gone"]);

    const universe = client.getQueryData<BooksListResponse>(universeKey);
    expect(universe?.total).toBe(17);
    expect(universe?.books).toEqual([]);
  });

  it("densifyBookDelete leaves filtered totals alone when deleted id not in list", () => {
    const client = new QueryClient();
    const filteredKey = queryKeys.books.adminList({
      page: 1,
      limit: 12,
      genre: "Fiction",
    });
    client.setQueryData(filteredKey, {
      books: [
        {
          id: "fic-1",
          title: "Novel",
          genre: "Fiction",
        } as BooksListResponse["books"][number],
      ],
      total: 5,
      page: 1,
      totalPages: 1,
      limit: 12,
    });

    densifyBookDelete(client, ["cs-book"]);

    const filtered = client.getQueryData<BooksListResponse>(filteredKey);
    expect(filtered?.total).toBe(5);
    expect(filtered?.books).toHaveLength(1);
  });

  it("densifyBookDelete rebuilds genres from remaining catalog titles", () => {
    const client = new QueryClient();
    const unfilteredKey = queryKeys.books.adminList(ADMIN_BOOKS_UNFILTERED);
    client.setQueryData(unfilteredKey, {
      books: [
        {
          id: "a",
          title: "A",
          genre: "Fiction",
        } as BooksListResponse["books"][number],
        {
          id: "b",
          title: "B",
          genre: "Fiction",
        } as BooksListResponse["books"][number],
        {
          id: "c",
          title: "C",
          genre: "Science",
        } as BooksListResponse["books"][number],
      ],
      total: 3,
      page: 1,
      totalPages: 1,
      limit: 1000,
    });
    client.setQueryData(queryKeys.books.genres, ["Fiction", "Science"]);

    densifyBookDelete(client, ["c"]);

    expect(client.getQueryData<string[]>(queryKeys.books.genres)).toEqual([
      "Fiction",
    ]);
  });

  it("densifyBookDelete uses fallback snapshot when cache misses", () => {
    const client = new QueryClient();
    client.setQueryData(queryKeys.admin.stats, {
      totalUsers: 2,
      approvedUsers: 2,
      pendingUsers: 0,
      rejectedUsers: 0,
      adminUsers: 1,
      totalBooks: 10,
      totalCopies: 50,
      availableCopies: 40,
      borrowedCopies: 10,
      activeBooks: 9,
      inactiveBooks: 1,
      booksWithISBN: 8,
      booksWithPublisher: 7,
      averagePageCount: 200,
      activeBorrows: 0,
      pendingBorrows: 0,
      returnedBooks: 0,
      cancelledBorrows: 0,
      recentBorrows: [],
      recentUsers: [],
      categoryStats: [
        {
          genre: "Solo",
          count: 1,
          totalCopies: 2,
          availableCopies: 2,
          avgRating: 4,
          totalRating: 4,
          ratingCount: 1,
        },
        {
          genre: "Keep",
          count: 2,
          totalCopies: 4,
          availableCopies: 4,
          avgRating: 5,
          totalRating: 10,
          ratingCount: 2,
        },
      ],
      booksByYear: [
        ["2011", 1],
        ["2020", 2],
      ],
      booksByLanguage: [
        ["English", 1],
        ["Bengali", 2],
      ],
      topRatedBooks: [],
      inactiveTitles: [],
      reservationsWaiting: 0,
    });

    densifyBookDelete(client, ["orphan-1"], [
      {
        id: "orphan-1",
        isActive: true,
        totalCopies: 2,
        availableCopies: 2,
        genre: "Solo",
        language: "English",
        publicationYear: 2011,
        rating: 4,
        pageCount: 100,
        isbn: "978",
        publisher: "Press",
      },
    ]);

    const stats = client.getQueryData<{
      totalBooks: number;
      categoryStats: Array<{ genre: string; count: number }>;
      booksByLanguage: Array<[string, number]>;
      booksByYear: Array<[string, number]>;
    }>(queryKeys.admin.stats);
    expect(stats?.totalBooks).toBe(9);
    expect(stats?.categoryStats.some((c) => c.genre === "Solo")).toBe(false);
    expect(stats?.categoryStats.some((c) => c.genre === "Keep")).toBe(true);
    expect(stats?.booksByLanguage.some(([l]) => l === "English")).toBe(false);
    expect(stats?.booksByLanguage.some(([l]) => l === "Bengali")).toBe(true);
    expect(stats?.booksByYear.some(([y]) => y === "2011")).toBe(false);
    expect(stats?.booksByYear.some(([y]) => y === "2020")).toBe(true);
  });
});
