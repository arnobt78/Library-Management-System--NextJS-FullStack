/**
 * Instant densify for book-review list/detail/pendingCount caches.
 *
 * Call AFTER `await invalidateMutation("review.write")`, but always pass
 * `baselines` snapped BEFORE invalidate. Invalidation `removeQueries` wipes
 * inactive lists; upserting into `[]` would leave only the touched row and
 * sibling reviews would flash in late after refetch.
 * Parent: CR-0003 / REQ-0035 polish
 */

import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import type { Review } from "@/lib/services/reviews";

export type ReviewListBaselines = {
  /** Densest cached admin list (any filter key). */
  admin: AdminBookReviewItem[] | undefined;
  /** userId → densest cached My Reviews list */
  users: Record<string, AdminBookReviewItem[]>;
  /** bookId → densest cached public book-reviews list */
  books: Record<string, Review[]>;
};

function bumpPendingCount(queryClient: QueryClient, delta: number): void {
  if (delta === 0) return;
  queryClient.setQueryData<number>(queryKeys.reviews.pendingCount, (old) =>
    Math.max(0, (old ?? 0) + delta),
  );
}

function upsertAdminRow(
  rows: AdminBookReviewItem[],
  row: AdminBookReviewItem,
): AdminBookReviewItem[] {
  const idx = rows.findIndex((r) => r.id === row.id);
  if (idx === -1) return [row, ...rows];
  return rows.map((r, i) => (i === idx ? { ...r, ...row } : r));
}

function upsertPublicRow(rows: Review[], row: Review): Review[] {
  const idx = rows.findIndex((r) => r.id === row.id);
  if (idx === -1) return [row, ...rows];
  return rows.map((r, i) => (i === idx ? { ...r, ...row } : r));
}

function userIdFromUserReviewsKey(key: QueryKey): string | undefined {
  // ["user-reviews", userId]
  if (!Array.isArray(key) || key.length < 2) return undefined;
  return typeof key[1] === "string" ? key[1] : undefined;
}

function bookIdFromBookReviewsKey(key: QueryKey): string | undefined {
  // ["book-reviews", bookId]
  if (!Array.isArray(key) || key.length < 2) return undefined;
  return typeof key[1] === "string" ? key[1] : undefined;
}

/** Pre-invalidate snapshots so sibling rows survive removeQueries. */
export function snapshotReviewListBaselines(
  queryClient: QueryClient,
): ReviewListBaselines {
  let admin: AdminBookReviewItem[] | undefined = queryClient.getQueryData(
    queryKeys.reviews.adminList({}),
  );

  for (const [, rows] of queryClient.getQueriesData<AdminBookReviewItem[]>({
    queryKey: queryKeys.reviews.adminRoot,
  })) {
    if (!rows?.length) continue;
    if (!admin || rows.length > admin.length) admin = rows;
  }

  const users: Record<string, AdminBookReviewItem[]> = {};
  for (const [key, rows] of queryClient.getQueriesData<AdminBookReviewItem[]>({
    queryKey: queryKeys.reviews.userReviewsRoot,
  })) {
    if (!rows?.length) continue;
    const userId = userIdFromUserReviewsKey(key);
    if (!userId) continue;
    if (!users[userId] || rows.length > users[userId].length) {
      users[userId] = rows;
    }
  }

  const books: Record<string, Review[]> = {};
  for (const [key, rows] of queryClient.getQueriesData<Review[]>({
    queryKey: queryKeys.reviews.bookRoot,
  })) {
    if (!rows?.length) continue;
    const bookId = bookIdFromBookReviewsKey(key);
    if (!bookId) continue;
    if (!books[bookId] || rows.length > books[bookId].length) {
      books[bookId] = rows;
    }
  }

  return { admin, users, books };
}

function mapAdminLists(
  queryClient: QueryClient,
  mapper: (rows: AdminBookReviewItem[]) => AdminBookReviewItem[],
  baselines?: ReviewListBaselines,
): void {
  queryClient.setQueriesData<AdminBookReviewItem[]>(
    { queryKey: queryKeys.reviews.adminRoot },
    (old) => (old ? mapper(old) : old),
  );

  const adminKey = queryKeys.reviews.adminList({});
  const prevAdmin =
    queryClient.getQueryData<AdminBookReviewItem[]>(adminKey) ??
    baselines?.admin ??
    [];
  queryClient.setQueryData(adminKey, mapper(prevAdmin));
}

function mapUserLists(
  queryClient: QueryClient,
  userId: string | null | undefined,
  mapper: (rows: AdminBookReviewItem[]) => AdminBookReviewItem[],
  baselines?: ReviewListBaselines,
): void {
  if (!userId) return;

  queryClient.setQueriesData<AdminBookReviewItem[]>(
    { queryKey: queryKeys.reviews.userReviews(userId) },
    (old) => (old ? mapper(old) : old),
  );

  const userKey = queryKeys.reviews.userReviews(userId);
  const prevUser =
    queryClient.getQueryData<AdminBookReviewItem[]>(userKey) ??
    baselines?.users[userId] ??
    [];
  queryClient.setQueryData(userKey, mapper(prevUser));
}

function mapBookLists(
  queryClient: QueryClient,
  bookId: string | null | undefined,
  mapper: (rows: Review[]) => Review[],
  baselines?: ReviewListBaselines,
): void {
  if (!bookId) return;

  const bookKey = queryKeys.reviews.book(bookId);
  const prevBook =
    queryClient.getQueryData<Review[]>(bookKey) ??
    baselines?.books[bookId] ??
    [];
  queryClient.setQueryData(bookKey, mapper(prevBook));
}

/** Build a minimal public Review row from an AdminBookReviewItem (densify create). */
export function adminItemToPublicReview(item: AdminBookReviewItem): Review {
  return {
    id: item.id,
    rating: item.rating,
    comment: item.comment,
    createdAt: item.createdAt ? new Date(item.createdAt) : null,
    updatedAt: item.updatedAt ? new Date(item.updatedAt) : null,
    userFullName: item.userName,
    universityCard: item.userUniversityCard,
    userId: item.userId,
    bookId: item.bookId,
    status: item.status,
    reviewedBy: item.reviewedBy,
    reviewedByName: item.reviewedByName,
    reviewedByEmail: item.reviewedByEmail,
    reviewedByUniversityCard: item.reviewedByUniversityCard,
    reviewedAt: item.reviewedAt,
  };
}

/** Locate a cached admin/my-reviews row by id (for delete pendingCount). */
export function findCachedAdminReview(
  queryClient: QueryClient,
  reviewId: string,
): AdminBookReviewItem | undefined {
  const detail = queryClient.getQueryData<AdminBookReviewItem>(
    queryKeys.reviews.adminDetail(reviewId),
  );
  if (detail) return detail;

  for (const root of [
    queryKeys.reviews.adminRoot,
    queryKeys.reviews.userReviewsRoot,
  ] as const) {
    for (const [, rows] of queryClient.getQueriesData<AdminBookReviewItem[]>({
      queryKey: root,
    })) {
      const hit = rows?.find((r) => r.id === reviewId);
      if (hit) return hit;
    }
  }
  return undefined;
}

/** After create — seed admin/my/book lists + bump pending. */
export function patchReviewCachesOnCreate(
  queryClient: QueryClient,
  item: AdminBookReviewItem,
  baselines?: ReviewListBaselines,
): void {
  queryClient.setQueryData(queryKeys.reviews.adminDetail(item.id), item);
  mapAdminLists(
    queryClient,
    (rows) => upsertAdminRow(rows, item),
    baselines,
  );
  mapUserLists(
    queryClient,
    item.userId,
    (rows) => upsertAdminRow(rows, item),
    baselines,
  );
  // Public book list: only show PENDING to the author (visibility rule).
  mapBookLists(
    queryClient,
    item.bookId,
    (rows) => upsertPublicRow(rows, adminItemToPublicReview(item)),
    baselines,
  );
  if (item.status === "PENDING") bumpPendingCount(queryClient, 1);
}

/** After content edit — patch rating/comment/updatedAt (+ optional status reset). */
export function patchReviewCachesOnUpdate(
  queryClient: QueryClient,
  patch: Partial<AdminBookReviewItem> & {
    id: string;
    bookId?: string | null;
    userId?: string | null;
  },
  baselines?: ReviewListBaselines,
  previousStatus?: ReviewStatusValue | null,
): void {
  const applyAdmin = (row: AdminBookReviewItem): AdminBookReviewItem =>
    row.id === patch.id ? { ...row, ...patch } : row;

  queryClient.setQueryData<AdminBookReviewItem | undefined>(
    queryKeys.reviews.adminDetail(patch.id),
    (prev) => (prev ? { ...prev, ...patch } : prev),
  );

  mapAdminLists(
    queryClient,
    (rows) => rows.map(applyAdmin),
    baselines,
  );

  const userId =
    patch.userId ??
    findCachedAdminReview(queryClient, patch.id)?.userId ??
    undefined;
  mapUserLists(
    queryClient,
    userId,
    (rows) => rows.map(applyAdmin),
    baselines,
  );

  const bookId =
    patch.bookId ??
    findCachedAdminReview(queryClient, patch.id)?.bookId ??
    undefined;
  mapBookLists(
    queryClient,
    bookId,
    (rows) =>
      rows.map((r) =>
        r.id === patch.id
          ? {
              ...r,
              rating: patch.rating ?? r.rating,
              comment: patch.comment ?? r.comment,
              updatedAt: patch.updatedAt
                ? new Date(patch.updatedAt)
                : new Date(),
              status: patch.status ?? r.status,
              reviewedBy:
                patch.reviewedBy !== undefined
                  ? patch.reviewedBy
                  : r.reviewedBy,
              reviewedByName:
                patch.reviewedByName !== undefined
                  ? patch.reviewedByName
                  : r.reviewedByName,
              reviewedByEmail:
                patch.reviewedByEmail !== undefined
                  ? patch.reviewedByEmail
                  : r.reviewedByEmail,
              reviewedByUniversityCard:
                patch.reviewedByUniversityCard !== undefined
                  ? patch.reviewedByUniversityCard
                  : r.reviewedByUniversityCard,
              reviewedAt:
                patch.reviewedAt !== undefined
                  ? patch.reviewedAt
                  : r.reviewedAt,
            }
          : r,
      ),
    baselines,
  );

  // Content-edit re-queue APPROVED/REJECTED → PENDING must bump sidebar badge.
  if (patch.status && previousStatus && patch.status !== previousStatus) {
    const wasPending = previousStatus === "PENDING";
    const isPending = patch.status === "PENDING";
    if (wasPending && !isPending) bumpPendingCount(queryClient, -1);
    else if (!wasPending && isPending) bumpPendingCount(queryClient, 1);
  }
}

/** After delete — drop detail + list rows; adjust pending count. */
export function patchReviewCachesOnDelete(
  queryClient: QueryClient,
  reviewId: string,
  previous?: {
    status: ReviewStatusValue;
    userId?: string | null;
    bookId?: string | null;
  } | null,
  baselines?: ReviewListBaselines,
): void {
  queryClient.removeQueries({
    queryKey: queryKeys.reviews.adminDetail(reviewId),
  });

  mapAdminLists(
    queryClient,
    (rows) => rows.filter((r) => r.id !== reviewId),
    baselines,
  );
  mapUserLists(
    queryClient,
    previous?.userId,
    (rows) => rows.filter((r) => r.id !== reviewId),
    baselines,
  );
  mapBookLists(
    queryClient,
    previous?.bookId,
    (rows) => rows.filter((r) => r.id !== reviewId),
    baselines,
  );

  if (previous?.status === "PENDING") bumpPendingCount(queryClient, -1);
}

/**
 * After moderate — set status + reviewedAt + moderator attribution;
 * adjust pending count when leaving/entering PENDING.
 *
 * APPROVED must **upsert** into public book-reviews: admins never had the
 * author's PENDING row in that cache, so map-only left `[]` and soft-nav to
 * `/books/[id]` flashed empty until a later refetch.
 */
export function patchReviewCachesOnModerate(
  queryClient: QueryClient,
  patch: {
    id: string;
    status: ReviewStatusValue;
    reviewedAt: string | null;
    reviewedBy?: string | null;
    reviewedByName?: string | null;
    reviewedByEmail?: string | null;
    reviewedByUniversityCard?: string | null;
    bookId?: string | null;
    userId?: string | null;
  },
  previousStatus?: ReviewStatusValue | null,
  baselines?: ReviewListBaselines,
  /** Pre-invalidate admin row — required to upsert public list on approve. */
  sourceItem?: AdminBookReviewItem | null,
): void {
  const fields: Partial<AdminBookReviewItem> = {
    status: patch.status,
    reviewedAt: patch.reviewedAt,
    reviewedBy: patch.reviewedBy ?? null,
    reviewedByName: patch.reviewedByName ?? null,
    reviewedByEmail: patch.reviewedByEmail ?? null,
    reviewedByUniversityCard: patch.reviewedByUniversityCard ?? null,
  };

  const mergedSource: AdminBookReviewItem | undefined = sourceItem
    ? { ...sourceItem, ...fields }
    : (() => {
        const cached = findCachedAdminReview(queryClient, patch.id);
        return cached ? { ...cached, ...fields } : undefined;
      })();

  queryClient.setQueryData<AdminBookReviewItem | undefined>(
    queryKeys.reviews.adminDetail(patch.id),
    (prev) =>
      prev
        ? { ...prev, ...fields }
        : mergedSource
          ? mergedSource
          : prev,
  );

  mapAdminLists(
    queryClient,
    (rows) =>
      rows.map((r) => (r.id === patch.id ? { ...r, ...fields } : r)),
    baselines,
  );

  const userId =
    patch.userId ??
    mergedSource?.userId ??
    findCachedAdminReview(queryClient, patch.id)?.userId ??
    undefined;
  mapUserLists(
    queryClient,
    userId,
    (rows) =>
      rows.map((r) => (r.id === patch.id ? { ...r, ...fields } : r)),
    baselines,
  );

  const bookId =
    patch.bookId ??
    mergedSource?.bookId ??
    findCachedAdminReview(queryClient, patch.id)?.bookId ??
    undefined;

  // APPROVED upserts onto public book list; REJECTED must leave it.
  if (patch.status === "REJECTED") {
    mapBookLists(
      queryClient,
      bookId,
      (rows) => rows.filter((r) => r.id !== patch.id),
      baselines,
    );
  } else {
    mapBookLists(
      queryClient,
      bookId,
      (rows) => {
        const publicFields: Partial<Review> = {
          status: patch.status,
          reviewedAt: patch.reviewedAt,
          reviewedBy: patch.reviewedBy,
          reviewedByName: patch.reviewedByName,
          reviewedByEmail: patch.reviewedByEmail,
          reviewedByUniversityCard: patch.reviewedByUniversityCard,
        };
        const idx = rows.findIndex((r) => r.id === patch.id);
        if (idx !== -1) {
          return rows.map((r, i) =>
            i === idx ? { ...r, ...publicFields } : r,
          );
        }
        // Empty / missing — seed from admin source (admin soft-nav after approve).
        if (mergedSource) {
          return [adminItemToPublicReview(mergedSource), ...rows];
        }
        return rows;
      },
      baselines,
    );
  }

  const wasPending = previousStatus === "PENDING";
  const isPending = patch.status === "PENDING";
  if (wasPending && !isPending) bumpPendingCount(queryClient, -1);
  else if (!wasPending && isPending) bumpPendingCount(queryClient, 1);
}
