/**
 * Unit tests for review densify helpers (no network).
 * Parent: CR-0003 / REQ-0035 polish — create densify harden
 */

import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { queryKeys } from "@/lib/query/keys";
import type { Review } from "@/lib/services/reviews";
import {
  patchReviewCachesOnCreate,
  patchReviewCachesOnDelete,
  patchReviewCachesOnModerate,
  patchReviewCachesOnUpdate,
  snapshotReviewListBaselines,
} from "@/lib/utils/patchReviewCaches";
import { isDensifiedEmpty } from "@/lib/utils/queryCacheLists";

function makeItem(
  overrides: Partial<AdminBookReviewItem> & Pick<AdminBookReviewItem, "id">,
): AdminBookReviewItem {
  return {
    id: overrides.id,
    rating: overrides.rating ?? 5,
    comment: overrides.comment ?? "Nice book",
    status: overrides.status ?? "PENDING",
    bookId: overrides.bookId ?? "book-1",
    bookTitle: overrides.bookTitle ?? "Eloquent JavaScript",
    bookCoverUrl: overrides.bookCoverUrl ?? "/covers/eloquent.jpg",
    bookCoverColor: overrides.bookCoverColor ?? "#112233",
    bookAuthor: overrides.bookAuthor ?? "Marijn Haverbeke",
    bookGenre: overrides.bookGenre ?? "Programming",
    bookRating: overrides.bookRating ?? 5,
    userId: overrides.userId ?? "user-1",
    userName: overrides.userName ?? "Test User",
    userEmail: overrides.userEmail ?? "test@user.com",
    userUniversityCard: overrides.userUniversityCard ?? null,
    userUniversityId: overrides.userUniversityId ?? 900001,
    reviewedBy: overrides.reviewedBy ?? null,
    reviewedByName: overrides.reviewedByName ?? null,
    reviewedByEmail: overrides.reviewedByEmail ?? null,
    reviewedByUniversityCard: overrides.reviewedByUniversityCard ?? null,
    reviewedAt: overrides.reviewedAt ?? null,
    createdAt: overrides.createdAt ?? "2026-08-02T12:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-08-02T12:00:00.000Z",
    borrowedAt: overrides.borrowedAt ?? null,
    dueDate: overrides.dueDate ?? null,
    returnedAt: overrides.returnedAt ?? null,
  };
}

describe("patchReviewCaches", () => {
  it("create prepends lists and bumps pending count once", () => {
    const client = new QueryClient();
    const existing = makeItem({ id: "r-old", status: "APPROVED" });
    client.setQueryData(queryKeys.reviews.adminList({}), [existing]);
    client.setQueryData(queryKeys.reviews.userReviews("user-1"), [existing]);
    client.setQueryData(queryKeys.reviews.book("book-1"), [] as Review[]);
    client.setQueryData(queryKeys.reviews.pendingCount, 2);

    const baselines = snapshotReviewListBaselines(client);
    // Simulate invalidate wipe of inactive lists
    client.removeQueries({ queryKey: queryKeys.reviews.adminRoot });
    client.removeQueries({ queryKey: queryKeys.reviews.userReviewsRoot });

    const created = makeItem({ id: "r-new", status: "PENDING" });
    patchReviewCachesOnCreate(client, created, baselines);

    const admin = client.getQueryData<AdminBookReviewItem[]>(
      queryKeys.reviews.adminList({}),
    );
    const mine = client.getQueryData<AdminBookReviewItem[]>(
      queryKeys.reviews.userReviews("user-1"),
    );
    const book = client.getQueryData<Review[]>(
      queryKeys.reviews.book("book-1"),
    );

    expect(admin?.[0]?.id).toBe("r-new");
    expect(admin?.some((r) => r.id === "r-old")).toBe(true);
    expect(mine?.[0]?.id).toBe("r-new");
    expect(book?.[0]?.id).toBe("r-new");
    expect(book?.[0]?.status).toBe("PENDING");
    expect(client.getQueryData(queryKeys.reviews.pendingCount)).toBe(3);
    expect(
      client.getQueryData(queryKeys.reviews.adminDetail("r-new")),
    ).toMatchObject({ id: "r-new", bookAuthor: "Marijn Haverbeke" });
  });

  it("update re-queue APPROVED→PENDING bumps pending and clears moderator", () => {
    const client = new QueryClient();
    const approved = makeItem({
      id: "r-1",
      status: "APPROVED",
      reviewedBy: "admin-1",
      reviewedByName: "Admin",
      reviewedByEmail: "test@admin.com",
      reviewedAt: "2026-08-03T12:00:00.000Z",
    });
    client.setQueryData(queryKeys.reviews.adminList({}), [approved]);
    client.setQueryData(queryKeys.reviews.userReviews("user-1"), [approved]);
    client.setQueryData(queryKeys.reviews.pendingCount, 0);

    const baselines = snapshotReviewListBaselines(client);
    patchReviewCachesOnUpdate(
      client,
      {
        id: "r-1",
        rating: 4,
        comment: "Updated",
        status: "PENDING",
        reviewedBy: null,
        reviewedByName: null,
        reviewedByEmail: null,
        reviewedByUniversityCard: null,
        reviewedAt: null,
        bookId: "book-1",
        userId: "user-1",
      },
      baselines,
      "APPROVED",
    );

    const mine = client.getQueryData<AdminBookReviewItem[]>(
      queryKeys.reviews.userReviews("user-1"),
    )?.[0];
    expect(mine?.status).toBe("PENDING");
    expect(mine?.comment).toBe("Updated");
    expect(mine?.reviewedBy).toBeNull();
    expect(mine?.reviewedByName).toBeNull();
    expect(client.getQueryData(queryKeys.reviews.pendingCount)).toBe(1);
  });

  it("delete decrements pending once for PENDING rows", () => {
    const client = new QueryClient();
    const pending = makeItem({ id: "r-del", status: "PENDING" });
    const other = makeItem({ id: "r-keep", status: "APPROVED" });
    client.setQueryData(queryKeys.reviews.adminList({}), [pending, other]);
    client.setQueryData(queryKeys.reviews.userReviews("user-1"), [
      pending,
      other,
    ]);
    client.setQueryData(queryKeys.reviews.book("book-1"), [
      { id: "r-del", rating: 5, comment: "x", createdAt: null, updatedAt: null, userFullName: "T", userId: "user-1", status: "PENDING" },
    ] as Review[]);
    client.setQueryData(queryKeys.reviews.pendingCount, 1);

    const baselines = snapshotReviewListBaselines(client);
    client.removeQueries({ queryKey: queryKeys.reviews.adminRoot });

    patchReviewCachesOnDelete(
      client,
      "r-del",
      { status: "PENDING", userId: "user-1", bookId: "book-1" },
      baselines,
    );

    const admin = client.getQueryData<AdminBookReviewItem[]>(
      queryKeys.reviews.adminList({}),
    );
    expect(admin?.map((r) => r.id)).toEqual(["r-keep"]);
    expect(client.getQueryData(queryKeys.reviews.pendingCount)).toBe(0);
    expect(
      client.getQueryData(queryKeys.reviews.book("book-1")),
    ).toEqual([]);
  });

  it("moderate APPROVED decrements pending; REJECTED removes from public book list", () => {
    const client = new QueryClient();
    const pending = makeItem({ id: "r-mod", status: "PENDING" });
    client.setQueryData(queryKeys.reviews.adminList({}), [pending]);
    client.setQueryData(queryKeys.reviews.userReviews("user-1"), [pending]);
    client.setQueryData(queryKeys.reviews.book("book-1"), [
      {
        id: "r-mod",
        rating: 5,
        comment: "x",
        createdAt: null,
        updatedAt: null,
        userFullName: "T",
        userId: "user-1",
        status: "PENDING",
      },
    ] as Review[]);
    client.setQueryData(queryKeys.reviews.pendingCount, 1);
    client.setQueryData(queryKeys.admin.navCounts, {
      books: 0,
      users: 0,
      pendingAdminRequests: 0,
      pendingSignUps: 0,
      pendingBorrows: 0,
      openTickets: 0,
      pendingReviews: 1,
    });

    const baselines = snapshotReviewListBaselines(client);

    patchReviewCachesOnModerate(
      client,
      {
        id: "r-mod",
        status: "APPROVED",
        reviewedAt: "2026-08-05T12:00:00.000Z",
        reviewedBy: "admin-1",
        reviewedByName: "Admin",
        reviewedByEmail: "test@admin.com",
        bookId: "book-1",
        userId: "user-1",
      },
      "PENDING",
      baselines,
    );

    expect(client.getQueryData(queryKeys.reviews.pendingCount)).toBe(0);
    expect(
      client.getQueryData(queryKeys.admin.navCounts),
    ).toMatchObject({ pendingReviews: 0 });
    expect(
      client.getQueryData<AdminBookReviewItem[]>(
        queryKeys.reviews.adminList({}),
      )?.[0]?.status,
    ).toBe("APPROVED");
    expect(
      client.getQueryData<Review[]>(queryKeys.reviews.book("book-1"))?.[0]
        ?.status,
    ).toBe("APPROVED");

    // Reject path — leaves public list
    const approved = makeItem({ id: "r-rej", status: "APPROVED" });
    client.setQueryData(queryKeys.reviews.adminList({}), [approved]);
    client.setQueryData(queryKeys.reviews.book("book-1"), [
      {
        id: "r-rej",
        rating: 5,
        comment: "x",
        createdAt: null,
        updatedAt: null,
        userFullName: "T",
        userId: "user-1",
        status: "APPROVED",
      },
    ] as Review[]);
    const baselines2 = snapshotReviewListBaselines(client);

    patchReviewCachesOnModerate(
      client,
      {
        id: "r-rej",
        status: "REJECTED",
        reviewedAt: "2026-08-05T13:00:00.000Z",
        reviewedBy: "admin-1",
        reviewedByName: "Admin",
        bookId: "book-1",
        userId: "user-1",
      },
      "APPROVED",
      baselines2,
    );

    expect(
      client.getQueryData(queryKeys.reviews.book("book-1")),
    ).toEqual([]);
    expect(
      client.getQueryData<AdminBookReviewItem[]>(
        queryKeys.reviews.adminList({}),
      )?.[0]?.status,
    ).toBe("REJECTED");
  });

  it("moderate APPROVED upserts into empty public book list (admin soft-nav)", () => {
    const client = new QueryClient();
    // Admin queue has PENDING; public book-reviews never had it (other author's review).
    const pending = makeItem({ id: "r-upsert", status: "PENDING" });
    client.setQueryData(queryKeys.reviews.adminList({}), [pending]);
    client.setQueryData(queryKeys.reviews.adminDetail("r-upsert"), pending);
    client.setQueryData(queryKeys.reviews.book("book-1"), [] as Review[]);
    client.setQueryData(queryKeys.reviews.pendingCount, 1);

    const baselines = snapshotReviewListBaselines(client);
    client.removeQueries({ queryKey: queryKeys.reviews.bookRoot });
    client.removeQueries({ queryKey: queryKeys.reviews.adminRoot });

    patchReviewCachesOnModerate(
      client,
      {
        id: "r-upsert",
        status: "APPROVED",
        reviewedAt: "2026-08-06T01:00:00.000Z",
        reviewedBy: "admin-1",
        reviewedByName: "Admin",
        reviewedByEmail: "test@admin.com",
        bookId: "book-1",
        userId: "user-1",
      },
      "PENDING",
      baselines,
      pending,
    );

    const book = client.getQueryData<Review[]>(
      queryKeys.reviews.book("book-1"),
    );
    expect(book?.length).toBe(1);
    expect(book?.[0]?.id).toBe("r-upsert");
    expect(book?.[0]?.status).toBe("APPROVED");
    expect(book?.[0]?.userFullName).toBe("Test User");
    // Showcase attribution must densify into public book-reviews (soft-nav).
    expect(book?.[0]?.reviewedAt).toBe("2026-08-06T01:00:00.000Z");
    expect(book?.[0]?.reviewedBy).toBe("admin-1");
    expect(book?.[0]?.reviewedByName).toBe("Admin");
    expect(book?.[0]?.reviewedByEmail).toBe("test@admin.com");
    expect(client.getQueryData(queryKeys.reviews.pendingCount)).toBe(0);

    // Admin list densify keeps moderator attribution for Approver column.
    const adminList = client.getQueryData<AdminBookReviewItem[]>(
      queryKeys.reviews.adminList({}),
    );
    expect(adminList?.[0]?.status).toBe("APPROVED");
    expect(adminList?.[0]?.reviewedByName).toBe("Admin");
    expect(adminList?.[0]?.reviewedByEmail).toBe("test@admin.com");
    expect(adminList?.[0]?.reviewedAt).toBe("2026-08-06T01:00:00.000Z");
  });

  it("update upserts My Reviews from admin baseline without seeding empty []", () => {
    const client = new QueryClient();
    const pending = makeItem({ id: "r-profile", status: "PENDING" });
    client.setQueryData(queryKeys.reviews.adminList({}), [pending]);
    // Intentionally no userReviews cache (never opened My Reviews).
    const baselines = snapshotReviewListBaselines(client);
    client.removeQueries({ queryKey: queryKeys.reviews.adminRoot });
    client.removeQueries({ queryKey: queryKeys.reviews.userReviewsRoot });

    patchReviewCachesOnUpdate(
      client,
      {
        id: "r-profile",
        rating: 3,
        comment: "Edited from book detail",
        status: "PENDING",
        bookId: "book-1",
        userId: "user-1",
        updatedAt: "2026-08-06T12:00:00.000Z",
      },
      baselines,
      "PENDING",
    );

    const mine = client.getQueryData<AdminBookReviewItem[]>(
      queryKeys.reviews.userReviews("user-1"),
    );
    expect(mine?.length).toBe(1);
    expect(mine?.[0]?.id).toBe("r-profile");
    expect(mine?.[0]?.rating).toBe(3);
    expect(mine?.[0]?.comment).toBe("Edited from book detail");
  });

  it("update upserts public book list from admin baseline (admin→detail soft-nav)", () => {
    const client = new QueryClient();
    const pending = makeItem({ id: "r-book", status: "PENDING" });
    client.setQueryData(queryKeys.reviews.adminList({}), [pending]);
    // No book-reviews cache yet (detail never mounted).
    const baselines = snapshotReviewListBaselines(client);
    client.removeQueries({ queryKey: queryKeys.reviews.adminRoot });
    client.removeQueries({ queryKey: queryKeys.reviews.bookRoot });

    patchReviewCachesOnUpdate(
      client,
      {
        id: "r-book",
        rating: 4,
        comment: "Edited on admin",
        status: "PENDING",
        bookId: "book-1",
        userId: "user-1",
      },
      baselines,
      "PENDING",
    );

    const book = client.getQueryData<Review[]>(
      queryKeys.reviews.book("book-1"),
    );
    expect(book?.length).toBe(1);
    expect(book?.[0]?.id).toBe("r-book");
    expect(book?.[0]?.rating).toBe(4);
    expect(book?.[0]?.comment).toBe("Edited on admin");
  });

  it("update without any source does not invent empty userReviews cache", () => {
    const client = new QueryClient();
    patchReviewCachesOnUpdate(
      client,
      {
        id: "r-orphan",
        rating: 2,
        comment: "no baselines",
        userId: "user-9",
        bookId: "book-9",
      },
      undefined,
      null,
    );
    expect(
      client.getQueryData(queryKeys.reviews.userReviews("user-9")),
    ).toBeUndefined();
    expect(
      client.getQueryData(queryKeys.reviews.book("book-9")),
    ).toBeUndefined();
  });

  it("delete with bookId and no prior book cache forces densify-empty []", () => {
    const client = new QueryClient();
    client.setQueryData(queryKeys.reviews.userReviews("user-1"), [
      makeItem({ id: "r-gone", status: "PENDING" }),
    ]);
    const baselines = snapshotReviewListBaselines(client);

    patchReviewCachesOnDelete(
      client,
      "r-gone",
      { status: "PENDING", userId: "user-1", bookId: "book-1" },
      baselines,
    );

    expect(client.getQueryData(queryKeys.reviews.book("book-1"))).toEqual([]);
    expect(isDensifiedEmpty(queryKeys.reviews.book("book-1"))).toBe(true);
    expect(
      client.getQueryData(queryKeys.reviews.userReviews("user-1")),
    ).toEqual([]);
  });

  it("delete without status still densifies book list when bookId known", () => {
    const client = new QueryClient();
    client.setQueryData(queryKeys.reviews.book("book-1"), [
      {
        id: "r-nostatus",
        rating: 4,
        comment: "x",
        createdAt: null,
        updatedAt: null,
        userFullName: "T",
        userId: "user-1",
        status: "PENDING",
      },
    ] as Review[]);

    patchReviewCachesOnDelete(
      client,
      "r-nostatus",
      { bookId: "book-1", userId: "user-1" },
      snapshotReviewListBaselines(client),
    );

    expect(client.getQueryData(queryKeys.reviews.book("book-1"))).toEqual([]);
    expect(isDensifiedEmpty(queryKeys.reviews.book("book-1"))).toBe(true);
  });

  it("update from public-only cache seeds admin queue (soft-nav after edit)", () => {
    const client = new QueryClient();
    client.setQueryData(queryKeys.reviews.book("book-1"), [
      {
        id: "r-edit",
        rating: 3,
        comment: "old",
        createdAt: null,
        updatedAt: null,
        userFullName: "Test User",
        userId: "user-1",
        bookId: "book-1",
        status: "APPROVED",
      },
    ] as Review[]);
    client.setQueryData(queryKeys.books.detail("book-1"), {
      title: "Algorithms",
      author: "Sedgewick",
      genre: "CS",
      rating: 5,
      coverUrl: "/c.png",
      coverColor: "#000",
    });
    const baselines = snapshotReviewListBaselines(client);

    patchReviewCachesOnUpdate(
      client,
      {
        id: "r-edit",
        rating: 5,
        comment: "new text",
        status: "PENDING",
        bookId: "book-1",
        userId: "user-1",
        reviewedBy: null,
        reviewedByName: null,
        reviewedAt: null,
      },
      baselines,
      "APPROVED",
    );

    const admin = client.getQueryData<AdminBookReviewItem[]>(
      queryKeys.reviews.adminList({}),
    );
    expect(admin?.[0]?.comment).toBe("new text");
    expect(admin?.[0]?.status).toBe("PENDING");
    expect(admin?.[0]?.bookTitle).toBe("Algorithms");
  });
});
