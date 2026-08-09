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
});
