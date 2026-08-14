/**
 * Instant densify for book-review list/detail/pendingCount caches.
 *
 * Call AFTER `await invalidateMutation("review.write")`, but always pass
 * `baselines` snapped BEFORE invalidate. Invalidate marks inactive lists stale
 * (no wipe); still pass baselines so densify can re-seed when cache is thin.
 * Parent: CR-0003 / REQ-0035 polish
 */

import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { reviewAuditLabel } from "@/lib/admin/reviewAuditLabel";
import type { Review } from "@/lib/services/reviews";
import {
  writeDensifiedEmpty,
  writeMappedList,
} from "@/lib/utils/queryCacheLists";
import { patchAdminNavCounts } from "@/lib/utils/patchAdminNavCounts";
import { patchAdminStatsOnReviewStatusChange } from "@/lib/utils/patchAdminStatsCaches";

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
  // Absolute sync — overwrites active sidebar refetch (no double-delta).
  const absolute =
    queryClient.getQueryData<number>(queryKeys.reviews.pendingCount) ?? 0;
  patchAdminNavCounts(queryClient, { pendingReviews: absolute });
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

/** Pre-invalidate snapshots so sibling rows survive a thin cache after invalidate. */
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
  writeMappedList(
    queryClient,
    adminKey,
    queryClient.getQueryData<AdminBookReviewItem[]>(adminKey),
    baselines?.admin,
    mapper,
  );
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
  writeMappedList(
    queryClient,
    userKey,
    queryClient.getQueryData<AdminBookReviewItem[]>(userKey),
    baselines?.users[userId],
    mapper,
  );
}

function mapBookLists(
  queryClient: QueryClient,
  bookId: string | null | undefined,
  mapper: (rows: Review[]) => Review[],
  baselines?: ReviewListBaselines,
): void {
  if (!bookId) return;

  const bookKey = queryKeys.reviews.book(bookId);
  writeMappedList(
    queryClient,
    bookKey,
    queryClient.getQueryData<Review[]>(bookKey),
    baselines?.books[bookId],
    mapper,
  );
}

/** Prefer live cache, then pre-invalidate baselines (sibling rows survive thin cache). */
function findBaselineAdminReview(
  baselines: ReviewListBaselines | undefined,
  reviewId: string,
  userId?: string | null,
): AdminBookReviewItem | undefined {
  if (!baselines) return undefined;
  const fromAdmin = baselines.admin?.find((r) => r.id === reviewId);
  if (fromAdmin) return fromAdmin;
  if (userId) {
    const fromUser = baselines.users[userId]?.find((r) => r.id === reviewId);
    if (fromUser) return fromUser;
  }
  for (const rows of Object.values(baselines.users)) {
    const hit = rows.find((r) => r.id === reviewId);
    if (hit) return hit;
  }
  return undefined;
}

function findBaselinePublicReview(
  baselines: ReviewListBaselines | undefined,
  bookId: string | null | undefined,
  reviewId: string,
): Review | undefined {
  if (!baselines || !bookId) return undefined;
  return baselines.books[bookId]?.find((r) => r.id === reviewId);
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

/**
 * Promote a public book-reviews row (+ optional book detail) into an admin
 * queue item so content-edit densify can upsert `/admin/book-reviews` when
 * the admin list was never mounted (soft-nav used to wait on refetch).
 */
export function publicReviewToAdminItem(
  review: Review,
  book?: {
    title?: string | null;
    coverUrl?: string | null;
    coverColor?: string | null;
    author?: string | null;
    genre?: string | null;
    rating?: number | null;
  } | null,
): AdminBookReviewItem {
  const reviewedAt =
    typeof review.reviewedAt === "string"
      ? review.reviewedAt
      : review.reviewedAt
        ? new Date(review.reviewedAt).toISOString()
        : null;
  return {
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    status: review.status ?? "PENDING",
    bookId: review.bookId ?? "",
    bookTitle: book?.title?.trim() || "Unknown Book",
    bookCoverUrl: book?.coverUrl ?? null,
    bookCoverColor: book?.coverColor ?? null,
    bookAuthor: book?.author?.trim() || "Unknown Author",
    bookGenre: book?.genre?.trim() || "General",
    bookRating: book?.rating ?? 0,
    userId: review.userId,
    userName: review.userFullName || "Reader",
    userEmail: review.userEmail ?? "",
    userUniversityCard: review.universityCard ?? null,
    // Public Review has no universityId — 0 until SSR/detail merge fills it.
    userUniversityId: 0,
    reviewedBy: review.reviewedBy ?? null,
    reviewedByName: review.reviewedByName ?? null,
    reviewedByEmail: review.reviewedByEmail ?? null,
    reviewedByUniversityCard: review.reviewedByUniversityCard ?? null,
    reviewedAt,
    createdAt: review.createdAt
      ? new Date(review.createdAt).toISOString()
      : null,
    updatedAt: review.updatedAt
      ? new Date(review.updatedAt).toISOString()
      : null,
    borrowedAt: null,
    dueDate: null,
    returnedAt: null,
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
  if (item.status === "PENDING") {
    bumpPendingCount(queryClient, 1);
    patchAdminStatsOnReviewStatusChange(queryClient, {
      fromStatus: null,
      toStatus: "PENDING",
    });
  }
}

/** After content edit — patch rating/comment/updatedAt (+ optional status reset).
 *
 * Prefer upsert over map-only for user/book lists: inactive My Reviews / book
 * detail caches may be thin after invalidate, and map-only into missing lists
 * used to seed `[]` (badge 0 / Reviews empty until remount).
 */
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

  const userId =
    patch.userId ??
    findCachedAdminReview(queryClient, patch.id)?.userId ??
    findBaselineAdminReview(baselines, patch.id)?.userId ??
    undefined;
  const bookId =
    patch.bookId ??
    findCachedAdminReview(queryClient, patch.id)?.bookId ??
    findBaselineAdminReview(baselines, patch.id, userId)?.bookId ??
    undefined;

  const sourceItem =
    findCachedAdminReview(queryClient, patch.id) ??
    findBaselineAdminReview(baselines, patch.id, userId) ??
    (() => {
      // Soft-nav from book detail: only public ["book-reviews", bookId] may exist.
      const publicHit =
        findBaselinePublicReview(baselines, bookId, patch.id) ??
        (bookId
          ? queryClient
              .getQueryData<Review[]>(queryKeys.reviews.book(bookId))
              ?.find((r) => r.id === patch.id)
          : undefined);
      if (!publicHit) return undefined;
      const bookMeta = bookId
        ? queryClient.getQueryData<{
            title?: string;
            coverUrl?: string;
            coverColor?: string;
            author?: string;
            genre?: string;
            rating?: number;
          }>(queryKeys.books.detail(bookId))
        : undefined;
      return publicReviewToAdminItem(publicHit, bookMeta);
    })();

  const mergedAdmin: AdminBookReviewItem | undefined = sourceItem
    ? { ...sourceItem, ...patch, id: patch.id }
    : undefined;

  queryClient.setQueryData<AdminBookReviewItem | undefined>(
    queryKeys.reviews.adminDetail(patch.id),
    (prev) =>
      prev ? { ...prev, ...patch } : mergedAdmin ? mergedAdmin : prev,
  );

  mapAdminLists(
    queryClient,
    (rows) => {
      if (rows.some((r) => r.id === patch.id)) return rows.map(applyAdmin);
      // Upsert into existing sibling lists; also seed canonical empty key from
      // mergedAdmin so soft-nav to /admin/book-reviews paints instantly.
      return mergedAdmin ? upsertAdminRow(rows, mergedAdmin) : rows;
    },
    baselines,
  );

  mapUserLists(
    queryClient,
    userId,
    (rows) => {
      if (rows.some((r) => r.id === patch.id)) return rows.map(applyAdmin);
      return mergedAdmin ? upsertAdminRow(rows, mergedAdmin) : rows;
    },
    baselines,
  );

  const baselinePublic = findBaselinePublicReview(
    baselines,
    bookId,
    patch.id,
  );
  const publicSource: Review | undefined = mergedAdmin
    ? adminItemToPublicReview(mergedAdmin)
    : baselinePublic
      ? {
          ...baselinePublic,
          rating: patch.rating ?? baselinePublic.rating,
          comment: patch.comment ?? baselinePublic.comment,
          updatedAt: patch.updatedAt
            ? new Date(patch.updatedAt)
            : new Date(),
          status: patch.status ?? baselinePublic.status,
          reviewedBy:
            patch.reviewedBy !== undefined
              ? patch.reviewedBy
              : baselinePublic.reviewedBy,
          reviewedByName:
            patch.reviewedByName !== undefined
              ? patch.reviewedByName
              : baselinePublic.reviewedByName,
          reviewedByEmail:
            patch.reviewedByEmail !== undefined
              ? patch.reviewedByEmail
              : baselinePublic.reviewedByEmail,
          reviewedByUniversityCard:
            patch.reviewedByUniversityCard !== undefined
              ? patch.reviewedByUniversityCard
              : baselinePublic.reviewedByUniversityCard,
          reviewedAt:
            patch.reviewedAt !== undefined
              ? patch.reviewedAt
              : baselinePublic.reviewedAt,
        }
      : undefined;

  mapBookLists(
    queryClient,
    bookId,
    (rows) => {
      const idx = rows.findIndex((r) => r.id === patch.id);
      if (idx !== -1) {
        return rows.map((r) =>
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
        );
      }
      return publicSource ? upsertPublicRow(rows, publicSource) : rows;
    },
    baselines,
  );

  // Content-edit re-queue APPROVED/REJECTED → PENDING must bump sidebar badge.
  if (patch.status && previousStatus && patch.status !== previousStatus) {
    const wasPending = previousStatus === "PENDING";
    const isPending = patch.status === "PENDING";
    if (wasPending && !isPending) bumpPendingCount(queryClient, -1);
    else if (!wasPending && isPending) bumpPendingCount(queryClient, 1);
    patchAdminStatsOnReviewStatusChange(queryClient, {
      fromStatus: previousStatus,
      toStatus: patch.status,
    });
  }
}

/** After delete — drop detail + list rows; adjust pending count. */
export function patchReviewCachesOnDelete(
  queryClient: QueryClient,
  reviewId: string,
  previous?: {
    status?: ReviewStatusValue | null;
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

  // Delete before book/profile lists ever mounted: force densify-empty so
  // soft-nav cannot reseed stale RSC rows via seedFromSsrIfEmpty.
  if (previous?.bookId) {
    const bookKey = queryKeys.reviews.book(previous.bookId);
    if (queryClient.getQueryData(bookKey) === undefined) {
      writeDensifiedEmpty(queryClient, bookKey);
    }
  }
  if (previous?.userId) {
    const userKey = queryKeys.reviews.userReviews(previous.userId);
    if (queryClient.getQueryData(userKey) === undefined) {
      writeDensifiedEmpty(queryClient, userKey);
    }
  }

  if (previous?.status === "PENDING") bumpPendingCount(queryClient, -1);
  if (previous?.status) {
    patchAdminStatsOnReviewStatusChange(queryClient, {
      fromStatus: previous.status,
      toStatus: null,
    });
  }
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

  // Overview Pending Reviews badges (approved / rejected lifetime counts).
  if (previousStatus && previousStatus !== patch.status) {
    patchAdminStatsOnReviewStatusChange(queryClient, {
      fromStatus: previousStatus,
      toStatus: patch.status,
    });
  }
}

const REVIEW_AUDIT_FIFO = 25;

/**
 * Prepend densified audit row onto review detail Activity (FIFO-25).
 * Call alongside densifyActivityLog after review.write mutations.
 */
export function prependReviewAuditEvent(
  queryClient: QueryClient,
  args: {
    reviewId: string;
    action: string;
    details?: Record<string, unknown> | null;
    actorId?: string | null;
    actorName?: string | null;
    actorEmail?: string | null;
    actorUniversityCard?: string | null;
  },
): void {
  const key = queryKeys.reviews.adminDetail(args.reviewId);
  const prev =
    queryClient.getQueryData<AdminBookReviewItem>(key) ??
    findCachedAdminReview(queryClient, args.reviewId);
  if (!prev) return;

  let actorUniversityCard = args.actorUniversityCard ?? null;
  if (!actorUniversityCard && args.actorId) {
    for (const e of prev.auditEvents ?? []) {
      if (e.actorId === args.actorId && e.actorUniversityCard) {
        actorUniversityCard = e.actorUniversityCard;
        break;
      }
    }
  }

  const event: TicketActivityEvent = {
    id: `densify-review-${args.reviewId}-${Date.now()}`,
    kind: "audit",
    at: new Date().toISOString(),
    label: reviewAuditLabel(args.action, args.details),
    actorId: args.actorId ?? null,
    actorName: args.actorName ?? null,
    actorEmail: args.actorEmail ?? null,
    actorUniversityCard,
    detail:
      typeof args.details?.title === "string" ? args.details.title : null,
  };

  const existing = prev.auditEvents ?? [];
  queryClient.setQueryData<AdminBookReviewItem>(key, {
    ...prev,
    auditEvents: [event, ...existing].slice(0, REVIEW_AUDIT_FIFO),
  });
}
