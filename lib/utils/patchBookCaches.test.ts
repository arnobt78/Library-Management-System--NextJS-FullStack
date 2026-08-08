/**
 * Unit tests for book densify helpers (featured/related + admin list availability).
 */

import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { queryKeys } from "@/lib/query/keys";
import type { BooksListResponse } from "@/lib/services/books";
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
        { id: "book-1", title: "A", availableCopies: 2 } as BooksListResponse["books"][number],
        { id: "book-2", title: "B", availableCopies: 1 } as BooksListResponse["books"][number],
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
    expect(next?.books.find((b) => b.id === "book-1")?.availableCopies).toBe(0);
    expect(next?.books.find((b) => b.id === "book-2")?.availableCopies).toBe(1);
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
});