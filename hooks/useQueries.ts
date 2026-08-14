"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { queryKeys } from "@/lib/query/keys";
import { seedFromSsrIfEmpty } from "@/lib/utils/queryCacheLists";
import { mergeDensifiedDetail } from "@/lib/utils/mergeDensifiedDetail";
import { useQueryPerformance } from "@/hooks/usePerformance";
import {
  getBooksList,
  getBook,
  getBookRecommendations,
  getRelatedBooks,
  getBookBorrowStats,
  getFeaturedBooks,
  type BookFilters,
  type BooksListResponse,
  type BookBorrowStats,
} from "@/lib/services/books";
import {
  getUsersList,
  getPendingUsers,
  getPendingAdminRequests,
  getRecentAdminRequestDecisions,
  type User,
  type UserFilters,
  type UsersListResponse,
  type AdminRequest,
} from "@/lib/services/users";
import { getAdminRequestDetail } from "@/lib/admin/actions/admin-requests";
import { getAdminUserDetailCache } from "@/lib/admin/actions/user-detail";
import { getAdminUserPrivilegeHistory } from "@/lib/admin/actions/admin-privilege-history";
import { getAdminUserReservations } from "@/lib/admin/actions/admin-user-reservations";
import { getAdminUserActivityHistory } from "@/lib/admin/actions/admin-user-activity";
import type { AdminPrivilegeHistoryEntry } from "@/lib/admin/adminPrivilegeHistory";
import type { AdminUserActivityEntry } from "@/lib/admin/adminUserActivity";
import {
  getRecentSignupStatusDecisions,
  getSignupRequestDetail,
} from "@/lib/admin/signupStatusDecisions";
import type {
  SignupRequestDetail,
  SignupStatusDecision,
} from "@/lib/admin/signupStatusDecisions";
import { RECENT_SIGNUP_DECISIONS_LIMIT } from "@/lib/admin/signupDecisionConstants";
import {
  getBorrowRequests,
  getBorrowRequestDetail,
  getUserBorrows,
  type BorrowStatus,
  type BorrowRecordFull,
  type BorrowRecordWithDetails,
} from "@/lib/services/borrows";
import {
  getMyReservations,
  type UserReservationItem,
} from "@/lib/services/reservations";
import {
  getAdminStats,
  getReminderStats,
  getExportStats,
  type AdminStats,
  type ReminderStats,
  type ExportStats,
} from "@/lib/services/admin";
import {
  getCompleteAnalytics,
  type AnalyticsData,
} from "@/lib/services/analytics";
import {
  fetchSystemMetrics,
  type MetricsData,
} from "@/lib/services/metrics-monitor";
import {
  fetchAllServicesHealth,
  type ServiceStatus,
} from "@/lib/services/health-monitor";
import { getFineConfig, type FineConfig } from "@/lib/services/admin";
import type { AdminNavCounts } from "@/lib/admin/adminNavCountTypes";
import {
  getBookReviews,
  getReviewEligibility,
  getAdminBookReviews,
  getUserBookReviews,
  getAdminReviewDetail,
  getPendingReviewCount,
  type Review,
  type ReviewEligibility,
  type AdminReviewFilters,
} from "@/lib/services/reviews";
import {
  getNotifications,
  getUnreadNotificationCount,
  type NotificationItem,
} from "@/lib/services/notifications";
import {
  getActivityLogs,
  type ActivityLogFilters,
  type ActivityLogItem,
} from "@/lib/services/activityLogs";
import {
  getAdminSupportTickets,
  getOpenTicketCount,
  getSupportTicketDetail,
  getUserSupportTickets,
  type AdminTicketListFilters,
  type UserTicketListFilters,
} from "@/lib/services/supportTickets";
import { useSearchParams } from "next/navigation";

// Books queries
/**
 * Hook to fetch all books with search and filter parameters (for all-books page).
 * Supports URL search params for search, genre, availability, rating, sort, page, and limit.
 * Uses a 30-second freshness window plus explicit invalidation for bounded reconciliation.
 *
 * @param filters - Optional filters object (overrides URL params if provided)
 * @returns React Query result with books list, pagination, and loading/error states
 *
 * @example
 * ```tsx
 * // Use URL params: /all-books?search=react&genre=Technology
 * const { data, isLoading } = useAllBooks();
 *
 * // Override with custom filters
 * const { data } = useAllBooks({ search: "react", genre: "Technology" });
 * ```
 */
export const useAllBooks = (
  filters?: BookFilters,
  initialData?: BooksListResponse,
  options?: {
    /**
     * All-books only: do not keep a 0-book previous page as placeholder when
     * clearing filters (avoids sticky empty until the broader fetch returns).
     */
    skipEmptyPlaceholder?: boolean;
  },
) => {
  const { trackQuery } = useQueryPerformance();
  const searchParams = useSearchParams();

  // Get filters from URL params if not provided
  const urlFilters: BookFilters = filters || {
    search: searchParams.get("search") || undefined,
    genre: searchParams.get("genre") || undefined,
    availability:
      (searchParams.get("availability") as BookFilters["availability"]) ||
      undefined,
    rating: searchParams.get("rating")
      ? Number(searchParams.get("rating"))
      : undefined,
    sort: (searchParams.get("sort") as BookFilters["sort"]) || undefined,
    page: searchParams.get("page")
      ? Number(searchParams.get("page"))
      : undefined,
    limit: searchParams.get("limit")
      ? Number(searchParams.get("limit"))
      : undefined,
  };

  // Build query key from filters for proper caching (different from useBooks)
  const queryKey = queryKeys.books.adminList(urlFilters);

  return useQuery({
    queryKey,
    queryFn: () =>
      trackQuery("all-books", async () => {
        return getBooksList(urlFilters);
      }),
    staleTime: 30 * 1000, // Reconcile after 30 seconds or explicit invalidation
    refetchOnMount: true, // Refetch if stale (after invalidation)
    initialData, // Use SSR data if provided (prevents duplicate fetch)
    // Instant filter UX: show previous results until the new key resolves (no empty flash).
    // skipEmptyPlaceholder: clearing from 0 hits must not keep empty as placeholder.
    placeholderData: options?.skipEmptyPlaceholder
      ? (previousData: BooksListResponse | undefined) =>
          previousData && previousData.books.length > 0
            ? previousData
            : undefined
      : keepPreviousData,
  });
};

/**
 * Hook to fetch a single book by ID.
 * Supports initialData for SSR hydration to prevent duplicate requests.
 * Uses a 30-second freshness window plus explicit invalidation for bounded reconciliation.
 *
 * @param id - Book ID (UUID)
 * @param initialData - Optional initial data from SSR (prevents duplicate fetch)
 * @returns React Query result with book data and loading/error states
 *
 * @example
 * ```tsx
 * // Client-side only
 * const { data, isLoading } = useBook(bookId);
 *
 * // With SSR initial data
 * const { data } = useBook(bookId, serverBookData);
 * ```
 */
export const useBook = (id: string, initialData?: Book) => {
  const { trackQuery } = useQueryPerformance();

  return useQuery({
    queryKey: queryKeys.books.detail(id),
    queryFn: () =>
      trackQuery(`book-${id}`, async () => {
        return getBook(id);
      }),
    enabled: !!id,
    staleTime: 30 * 1000, // Reconcile after 30 seconds or explicit invalidation
    refetchOnMount: true, // Refetch if stale (after invalidation)
    initialData, // Use SSR data if provided (prevents duplicate fetch)
  });
};

/**
 * Hook to fetch borrow statistics for a specific book.
 * Supports initialData for SSR hydration to prevent duplicate requests.
 * Uses a 30-second freshness window plus explicit invalidation for bounded reconciliation.
 *
 * @param bookId - Book ID (UUID)
 * @param initialData - Optional initial data from SSR (prevents duplicate fetch)
 * @returns React Query result with borrow statistics and loading/error states
 *
 * @example
 * ```tsx
 * // Client-side only
 * const { data, isLoading } = useBookBorrowStats(bookId);
 *
 * // With SSR initial data
 * const { data } = useBookBorrowStats(bookId, serverStats);
 * ```
 */
export const useBookBorrowStats = (
  bookId: string,
  initialData?: BookBorrowStats
) => {
  const { trackQuery } = useQueryPerformance();

  return useQuery({
    queryKey: queryKeys.books.borrowStats(bookId),
    queryFn: () =>
      trackQuery("book-borrow-stats", async () => {
        return getBookBorrowStats(bookId);
      }),
    staleTime: 30 * 1000, // Reconcile after 30 seconds or explicit invalidation
    refetchOnMount: true, // Refetch if stale (after invalidation)
    enabled: !!bookId, // Only fetch if bookId is provided
    initialData, // Use SSR data if provided (prevents duplicate fetch)
  });
};

/**
 * Hook to fetch book recommendations for a user.
 * Supports URL search params for userId and limit.
 * Uses a 30-second freshness window plus explicit invalidation for bounded reconciliation.
 *
 * @param userId - Optional user ID (if not provided, uses current session or URL param)
 * @param limit - Optional limit for number of recommendations (default: 10)
 * @param initialData - Optional initial data from SSR (prevents duplicate fetch)
 * @returns React Query result with recommended books array and loading/error states
 *
 * @example
 * ```tsx
 * // Use URL params: /books?userId=123&limit=5
 * const { data, isLoading } = useBookRecommendations();
 *
 * // With explicit parameters
 * const { data } = useBookRecommendations(userId, 5);
 *
 * // With SSR initial data
 * const { data } = useBookRecommendations(userId, 10, serverRecommendations);
 * ```
 */
export const useBookRecommendations = (
  userId?: string,
  limit: number = 10,
  initialData?: Book[]
) => {
  const queryClient = useQueryClient();
  const { trackQuery } = useQueryPerformance();
  const searchParams = useSearchParams();

  // Get userId and limit from URL params if not provided
  const finalUserId = userId || searchParams.get("userId") || undefined;
  const finalLimit =
    limit !== 10
      ? limit
      : searchParams.get("limit")
        ? Number(searchParams.get("limit"))
        : 10;

  // Build query key from parameters for proper caching
  const queryKey = queryKeys.books.recommendations(finalUserId, finalLimit);
  // Evict densify / densify-empty must win over stale SSR on soft-nav.
  const seed = seedFromSsrIfEmpty(queryClient, queryKey, initialData);

  return useQuery({
    queryKey,
    queryFn: () =>
      trackQuery(
        `book-recommendations-${finalUserId || "anonymous"}`,
        async () => {
          return getBookRecommendations(finalUserId, finalLimit);
        }
      ),
    staleTime: 30 * 1000, // Reconcile after 30 seconds or explicit invalidation
    refetchOnMount: true, // Refetch if stale (after invalidation)
    initialData: seed,
    enabled: true, // Always enabled (userId is optional)
  });
};

/**
 * Hook to fetch genre-related books for a book detail page strip.
 * Key `["book-related", bookId, limit]` invalidates with books/recommendations domains.
 */
export const useRelatedBooks = (
  bookId: string,
  limit: number = 6,
  initialData?: Book[]
) => {
  const queryClient = useQueryClient();
  const { trackQuery } = useQueryPerformance();
  const queryKey = queryKeys.books.related(bookId, limit);
  const seed = seedFromSsrIfEmpty(queryClient, queryKey, initialData);

  return useQuery({
    queryKey,
    queryFn: () =>
      trackQuery(`book-related-${bookId}`, async () => {
        return getRelatedBooks(bookId, limit);
      }),
    staleTime: 30 * 1000,
    refetchOnMount: true,
    initialData: seed,
    enabled: Boolean(bookId),
  });
};

/**
 * Hook to fetch curated featured books (homepage hero source).
 * Key `["featured-books", limit]` is invalidated by invalidateBooksQueries /
 * invalidateAfterBookChange after book create/update/delete.
 *
 * @param limit - Max books (default 10; homepage hero uses 1)
 * @param initialData - Optional SSR data (prevents duplicate fetch)
 */
export const useFeaturedBooks = (limit: number = 10, initialData?: Book[]) => {
  const queryClient = useQueryClient();
  const { trackQuery } = useQueryPerformance();
  const queryKey = queryKeys.books.featured(limit);
  const seed = seedFromSsrIfEmpty(queryClient, queryKey, initialData);

  return useQuery({
    queryKey,
    queryFn: () =>
      trackQuery(`featured-books-${limit}`, async () => {
        return getFeaturedBooks(limit);
      }),
    staleTime: 30 * 1000,
    refetchOnMount: true,
    initialData: seed,
  });
};

// User queries
/**
 * Hook to fetch all users with search and filter parameters (for admin users page).
 * Supports URL search params for search, status, role, sort, page, and limit.
 * Supports initialData for SSR hydration to prevent duplicate requests.
 * Uses a 30-second freshness window plus explicit invalidation for bounded reconciliation.
 *
 * @param filters - Optional filters object (overrides URL params if provided)
 * @param initialData - Optional initial data from SSR (prevents duplicate fetch)
 * @returns React Query result with users list, pagination, and loading/error states
 *
 * @example
 * ```tsx
 * // Use URL params: /admin/users?search=john&status=APPROVED&role=USER
 * const { data, isLoading } = useAllUsers();
 *
 * // Override with custom filters
 * const { data } = useAllUsers({ search: "john", status: "APPROVED", role: "USER" });
 *
 * // With SSR initial data
 * const { data } = useAllUsers(undefined, serverUsersData);
 * ```
 */
export const useAllUsers = (
  filters?: UserFilters,
  initialData?: UsersListResponse
) => {
  const { trackQuery } = useQueryPerformance();
  const searchParams = useSearchParams();

  // Get filters from URL params if not provided
  const urlFilters: UserFilters = filters || {
    search: searchParams.get("search") || undefined,
    status: (searchParams.get("status") as UserFilters["status"]) || undefined,
    role: (searchParams.get("role") as UserFilters["role"]) || undefined,
    sort: (searchParams.get("sort") as UserFilters["sort"]) || undefined,
    page: searchParams.get("page")
      ? Number(searchParams.get("page"))
      : undefined,
    limit: searchParams.get("limit")
      ? Number(searchParams.get("limit"))
      : undefined,
  };

  // Build query key from filters for proper caching
  const queryKey = queryKeys.users.adminList(urlFilters);

  return useQuery({
    queryKey,
    queryFn: () =>
      trackQuery("all-users", async () => {
        return getUsersList(urlFilters);
      }),
    staleTime: 0, // Always refetch when query key changes (filters change)
    refetchOnMount: true, // Refetch on mount
    initialData, // Use SSR data if provided (prevents duplicate fetch)
    // Instant filter UX: show previous results until the new key resolves (no empty flash)
    placeholderData: keepPreviousData,
  });
};

/**
 * Hook to fetch pending user account requests.
 * Supports initialData for SSR hydration to prevent duplicate requests.
 * Uses a 30-second freshness window plus explicit invalidation for bounded reconciliation.
 *
 * @param initialData - Optional initial data from SSR (prevents duplicate fetch)
 * @returns React Query result with pending users array and loading/error states
 *
 * @example
 * ```tsx
 * // Client-side only
 * const { data, isLoading } = usePendingUsers();
 *
 * // With SSR initial data
 * const { data } = usePendingUsers(serverPendingUsers);
 * ```
 */
export const usePendingUsers = (
  initialData?: User[],
  /**
   * Explicit search override. Pass `""` to force the unfiltered pending key
   * (ignore URL) when the page client-filters locally for instant search UX.
   * Omit to read `?search=` from the URL.
   */
  search?: string
) => {
  const { trackQuery } = useQueryPerformance();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  // `search !== undefined` wins (including "") so callers can pin unfiltered.
  const searchValue =
    search !== undefined
      ? search || undefined
      : searchParams.get("search") || undefined;

  // Build query key from search for proper caching
  const queryKey = queryKeys.users.pending(searchValue);
  const unfiltered = !searchValue;
  const seed = seedFromSsrIfEmpty(
    queryClient,
    queryKey,
    unfiltered || (initialData && initialData.length > 0)
      ? initialData
      : undefined,
  );

  return useQuery({
    queryKey,
    queryFn: () =>
      trackQuery("pending-users", async () => {
        return getPendingUsers(searchValue);
      }),
    staleTime: 30 * 1000, // Badge + PrefetchLink warm; invalidate still forces refetch
    refetchOnMount: true, // Refetch if stale (after invalidation)
    initialData: seed,
  });
};

/**
 * Recent signup status decisions (APPROVED/REJECTED with statusReviewed*).
 * Invalidated via user.write → users.signupDecisionsRoot.
 */
export const useSignupStatusDecisions = (
  initialData?: SignupStatusDecision[],
  limit = RECENT_SIGNUP_DECISIONS_LIMIT,
) => {
  const { trackQuery } = useQueryPerformance();
  const queryClient = useQueryClient();
  const queryKey = queryKeys.users.signupDecisions(limit);
  const seed = seedFromSsrIfEmpty(queryClient, queryKey, initialData);

  return useQuery({
    queryKey,
    queryFn: () =>
      trackQuery("signup-status-decisions", async () => {
        const result = await getRecentSignupStatusDecisions(limit);
        if (!result.success) {
          throw new Error(result.error || "Failed to load signup decisions");
        }
        return result.data ?? [];
      }),
    staleTime: 30 * 1000,
    refetchOnMount: true,
    initialData: seed,
  });
};

/**
 * Single signup applicant detail + decision timeline (Registration Queue detail).
 * Object SSR seed via initialData — list-only seedFromSsrIfEmpty does not apply.
 * Densify/optimistic paint signupRequestDetail so soft-nav never flashes PENDING.
 */
export const useSignupRequestDetail = (
  userId: string,
  initialData?: SignupRequestDetail,
  initialDataUpdatedAt?: number,
) => {
  const { trackQuery } = useQueryPerformance();

  return useQuery<SignupRequestDetail>({
    queryKey: queryKeys.users.signupRequestDetail(userId),
    queryFn: () =>
      trackQuery(`signup-request-detail-${userId}`, async () => {
        const detail = await getSignupRequestDetail(userId);
        if (!detail) {
          throw new Error("Failed to fetch signup request detail");
        }
        return detail;
      }),
    enabled: !!userId,
    staleTime: 30 * 1000,
    refetchOnMount: true,
    initialData,
    initialDataUpdatedAt,
  });
};

/**
 * User 360 make-admin privilege history — SSR seed; densify on admin-request.write.
 */
export const useAdminPrivilegeHistory = (
  userId: string,
  initialData?: AdminPrivilegeHistoryEntry[],
  initialDataUpdatedAt?: number,
) => {
  const queryClient = useQueryClient();
  const { trackQuery } = useQueryPerformance();
  const queryKey = queryKeys.users.adminPrivilegeHistory(userId);
  const seed = seedFromSsrIfEmpty(queryClient, queryKey, initialData);

  return useQuery<AdminPrivilegeHistoryEntry[]>({
    queryKey,
    queryFn: () =>
      trackQuery(`admin-privilege-history-${userId}`, () =>
        getAdminUserPrivilegeHistory(userId),
      ),
    enabled: !!userId,
    staleTime: 30 * 1000,
    refetchOnMount: true,
    initialData: seed,
    initialDataUpdatedAt,
  });
};

/**
 * Admin User 360 header row — status/role densify via users.detail.
 * Object SSR seed; densifyUserWrite patches status/role without remount flash.
 */
export const useAdminUserDetail = (
  userId: string,
  initialData?: User,
  initialDataUpdatedAt?: number,
) => {
  const { trackQuery } = useQueryPerformance();

  return useQuery<User>({
    queryKey: queryKeys.users.detail(userId),
    queryFn: () =>
      trackQuery(`admin-user-detail-${userId}`, async () => {
        const user = await getAdminUserDetailCache(userId);
        if (!user) {
          throw new Error("Failed to fetch user detail");
        }
        return user;
      }),
    enabled: !!userId,
    staleTime: 30 * 1000,
    refetchOnMount: true,
    initialData,
    initialDataUpdatedAt,
  });
};

// Borrow records queries
/**
 * Hook to fetch user-specific borrow records.
 * Supports URL search params for status filter.
 * Uses a 30-second freshness window plus explicit invalidation for bounded reconciliation.
 *
 * @param userId - User ID (required)
 * @param status - Optional status filter (PENDING, BORROWED, RETURNED)
 * @param initialData - Optional initial data from SSR (prevents duplicate fetch)
 * @returns React Query result with user's borrow records array and loading/error states
 *
 * @example
 * ```tsx
 * // Use URL params: /my-profile?status=BORROWED
 * const { data, isLoading } = useUserBorrows(userId);
 *
 * // With explicit status filter
 * const { data } = useUserBorrows(userId, "BORROWED");
 *
 * // With SSR initial data
 * const { data } = useUserBorrows(userId, "BORROWED", serverBorrows);
 *
 * // Gate with SSR status (5th arg) so PENDING never hits APPROVED-only APIs
 * const { data } = useUserBorrows(userId, undefined, initial, updatedAt, userStatus);
 * ```
 */
export const useUserBorrows = (
  userId: string,
  status?: BorrowStatus,
  initialData?: BorrowRecordFull[],
  /**
   * Pass Date.now() when SSR data is provided so React Query treats the
   * initial data as fresh (age < staleTime) and avoids an immediate background
   * refetch that could briefly show stale cache entries without the book JOIN.
   */
  initialDataUpdatedAt?: number,
  /**
   * Prefer SSR/prop status when session JWT omits status (avoids PENDING 403 noise).
   */
  accountStatus?: string | null,
) => {
  const { trackQuery } = useQueryPerformance();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const sessionStatus = (session?.user as SessionUser | undefined)?.status;
  // Privileged borrow APIs require APPROVED — never fetch until status is known APPROVED
  const effectiveStatus = accountStatus ?? sessionStatus;
  const canFetchBorrows = effectiveStatus === "APPROVED";

  // Get status from URL params if not provided
  const finalStatus: BorrowStatus | undefined =
    status || (searchParams.get("status") as BorrowStatus | null) || undefined;

  // Build query key from userId and status for proper caching
  const queryKey = queryKeys.borrows.user(userId, finalStatus);
  const queryClient = useQueryClient();
  const seed = seedFromSsrIfEmpty(queryClient, queryKey, initialData);

  return useQuery({
    queryKey,
    queryFn: () =>
      trackQuery(`user-borrows-${userId}`, async () => {
        return getUserBorrows(userId, finalStatus);
      }),
    // When false, TanStack Query does not fetch (refetchOnMount cannot override)
    enabled: !!userId && canFetchBorrows,
    staleTime: 30 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    // Prefer non-empty cache; overwrite poisoned `[]` with non-empty SSR.
    initialData: seed,
    // Marks the SSR snapshot as "just fetched", keeping it within staleTime so
    // no background refetch fires on mount and overwrites fresh book data.
    initialDataUpdatedAt,
  });
};

/**
 * Profile reservations panel — densify writes `["reservations","user",userId]`.
 * SSR seed + seedFromSsrIfEmpty so soft-nav keeps claim/cancel/create paints.
 */
export const useUserReservations = (
  userId: string | undefined,
  initialData?: UserReservationItem[],
  initialDataUpdatedAt?: number,
) => {
  const queryClient = useQueryClient();
  const { trackQuery } = useQueryPerformance();
  const queryKey = userId
    ? queryKeys.circulation.userReservations(userId)
    : (["reservations", "user", "anon"] as const);
  const seed = seedFromSsrIfEmpty(queryClient, queryKey, initialData);

  return useQuery({
    queryKey,
    queryFn: () =>
      trackQuery("user-reservations", async () => getMyReservations()),
    enabled: Boolean(userId),
    staleTime: 30 * 1000,
    refetchOnMount: true,
    initialData: seed,
    initialDataUpdatedAt,
  });
};

/**
 * Admin User 360 reservations — same densify key as profile; admin-scoped loader.
 */
export const useAdminUserReservations = (
  userId: string,
  initialData?: UserReservationItem[],
  initialDataUpdatedAt?: number,
) => {
  const queryClient = useQueryClient();
  const { trackQuery } = useQueryPerformance();
  const queryKey = queryKeys.circulation.userReservations(userId);
  const seed = seedFromSsrIfEmpty(queryClient, queryKey, initialData);

  return useQuery({
    queryKey,
    queryFn: () =>
      trackQuery(`admin-user-reservations-${userId}`, () =>
        getAdminUserReservations(userId),
      ),
    enabled: Boolean(userId),
    staleTime: 30 * 1000,
    refetchOnMount: true,
    initialData: seed,
    initialDataUpdatedAt,
  });
};

/**
 * Admin User 360 activity — densify via densifyActivityLog → user-activity-history.
 */
export const useAdminUserActivityHistory = (
  userId: string,
  initialData?: AdminUserActivityEntry[],
  initialDataUpdatedAt?: number,
) => {
  const queryClient = useQueryClient();
  const { trackQuery } = useQueryPerformance();
  const queryKey = queryKeys.activityLog.user(userId);
  const seed = seedFromSsrIfEmpty(queryClient, queryKey, initialData);

  return useQuery<AdminUserActivityEntry[]>({
    queryKey,
    queryFn: () =>
      trackQuery(`admin-user-activity-${userId}`, () =>
        getAdminUserActivityHistory(userId),
      ),
    enabled: Boolean(userId),
    staleTime: 30 * 1000,
    refetchOnMount: true,
    initialData: seed,
    initialDataUpdatedAt,
  });
};

// Admin queries
/**
 * Hook to fetch admin dashboard statistics.
 * Supports initialData for SSR hydration to prevent duplicate requests.
 * Uses a 30-second freshness window plus explicit invalidation for bounded reconciliation.
 *
 * @param initialData - Optional initial data from SSR (prevents duplicate fetch)
 * @param initialDataUpdatedAt - SSR stamp so hydration freshness is explicit
 * @returns React Query result with admin statistics and loading/error states
 *
 * @example
 * ```tsx
 * // Client-side only
 * const { data, isLoading } = useAdminStats();
 *
 * // With SSR initial data
 * const { data } = useAdminStats(serverStatsData, Date.now());
 * ```
 */
export const useAdminStats = (
  initialData?: AdminStats,
  initialDataUpdatedAt?: number,
) => {
  const { trackQuery } = useQueryPerformance();

  return useQuery({
    queryKey: queryKeys.admin.stats,
    queryFn: () =>
      trackQuery("admin-stats", async () => {
        return getAdminStats();
      }),
    staleTime: 30 * 1000, // Reconcile after 30 seconds or explicit invalidation
    refetchOnMount: true, // Refetch if stale (after invalidation)
    initialData, // Use SSR data if provided (prevents duplicate fetch)
    initialDataUpdatedAt,
  });
};

/**
 * Aggregated sidebar counters (books/users/queues). SSR seed + densify invalidate.
 * Parent: admin shell Stockly chrome
 */
export const useAdminNavCounts = (
  initialData?: AdminNavCounts,
  initialDataUpdatedAt?: number,
) => {
  return useQuery({
    queryKey: queryKeys.admin.navCounts,
    queryFn: async (): Promise<AdminNavCounts> => {
      const res = await fetch("/api/admin/nav-counts");
      if (!res.ok) {
        throw new Error("Failed to fetch admin nav counts");
      }
      return res.json() as Promise<AdminNavCounts>;
    },
    staleTime: 30 * 1000,
    refetchOnMount: true,
    initialData,
    initialDataUpdatedAt,
  });
};

/**
 * Hook to fetch all borrow requests (admin view with user and book details).
 * Supports URL search params for status filter and optional filters parameter.
 * Supports initialData for SSR hydration to prevent duplicate requests.
 * Uses a 30-second freshness window plus explicit invalidation for bounded reconciliation.
 *
 * @param filters - Optional filters object (overrides URL params if provided)
 * @param initialData - Optional initial data from SSR (prevents duplicate fetch)
 * @returns React Query result with borrow requests list and loading/error states
 *
 * @example
 * ```tsx
 * // Use URL params: /admin/book-requests?status=PENDING
 * const { data, isLoading } = useBorrowRequests();
 *
 * // Override with custom status filter
 * const { data } = useBorrowRequests({ status: "PENDING" });
 *
 * // With SSR initial data
 * const { data } = useBorrowRequests(undefined, serverRequests);
 * ```
 */
export const useBorrowRequests = (
  filters?: { status?: BorrowStatus; search?: string },
  initialData?: BorrowRecordWithDetails[],
  initialDataUpdatedAt?: number,
) => {
  const { trackQuery } = useQueryPerformance();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  // When `filters` is passed (even empty {}), treat it as authoritative — do not
  // fall back to URL. Needed for unfiltered KPI queries while the table is filtered.
  const status: BorrowStatus | undefined =
    filters !== undefined
      ? filters.status
      : (searchParams.get("status") as BorrowStatus | null) || undefined;
  const search: string | undefined =
    filters !== undefined
      ? filters.search
      : searchParams.get("search") || undefined;

  // Build query key from filters for proper caching
  const queryKey = queryKeys.borrows.requests({ status, search });
  const unfiltered = !status && !search;
  const seed = seedFromSsrIfEmpty(
    queryClient,
    queryKey,
    unfiltered || (initialData && initialData.length > 0)
      ? initialData
      : undefined,
  );

  return useQuery({
    queryKey,
    queryFn: () =>
      trackQuery("borrow-requests", async () => {
        return getBorrowRequests(status, search);
      }),
    staleTime: 30 * 1000, // Badge + PrefetchLink warm; invalidate still forces refetch
    refetchOnMount: true, // Refetch if stale (after invalidation)
    initialData: seed,
    initialDataUpdatedAt,
    // Instant filter UX: show previous results until the new key resolves (no empty flash)
    placeholderData: keepPreviousData,
  });
};

/**
 * Admin Borrow Queue detail — `/admin/book-requests/[id]`.
 * Object SSR seed via initialData — list-only seedFromSsrIfEmpty does not apply.
 * Caller stamps initialDataUpdatedAt once so densify wins over sticky SSR.
 */
export const useBorrowRequestDetail = (
  recordId: string,
  initialData?: BorrowRecordWithDetails,
  initialDataUpdatedAt?: number,
) => {
  const { trackQuery } = useQueryPerformance();
  const queryClient = useQueryClient();

  return useQuery<BorrowRecordWithDetails>({
    queryKey: queryKeys.borrows.requestDetail(recordId),
    queryFn: () =>
      trackQuery("borrow-request-detail", async () => {
        const fresh = await getBorrowRequestDetail(recordId);
        // API/list thin payloads — keep densified actors + Activity across invalidate.
        const prev = queryClient.getQueryData<BorrowRecordWithDetails>(
          queryKeys.borrows.requestDetail(recordId),
        );
        return mergeDensifiedDetail(prev, fresh, [
          "auditEvents",
          "approvedByActor",
          "returnedByActor",
          "cancelledByActor",
        ]);
      }),
    enabled: !!recordId,
    staleTime: 10 * 1000,
    refetchOnMount: true,
    initialData,
    initialDataUpdatedAt,
  });
};

/**
 * Hook to fetch pending admin requests.
 * Supports initialData for SSR hydration to prevent duplicate requests.
 * Uses a 30-second freshness window plus explicit invalidation for bounded reconciliation.
 *
 * @param initialData - Optional initial data from SSR (prevents duplicate fetch)
 * @returns React Query result with pending admin requests array and loading/error states
 *
 * @example
 * ```tsx
 * // Client-side only
 * const { data, isLoading } = usePendingAdminRequests();
 *
 * // With SSR initial data
 * const { data } = usePendingAdminRequests(serverRequests);
 * ```
 */
export const usePendingAdminRequests = (initialData?: AdminRequest[]) => {
  const { trackQuery } = useQueryPerformance();
  const queryClient = useQueryClient();
  const queryKey = queryKeys.admin.pendingRequests;
  const seed = seedFromSsrIfEmpty(queryClient, queryKey, initialData);

  return useQuery({
    queryKey,
    queryFn: () =>
      trackQuery("pending-admin-requests", async () => {
        return getPendingAdminRequests();
      }),
    staleTime: 30 * 1000, // Reconcile after 30 seconds or explicit invalidation
    refetchOnMount: true, // Refetch if stale (after invalidation)
    initialData: seed,
  });
};

/**
 * Recent APPROVED/REJECTED admin requests with reviewer attribution.
 * Invalidated via admin-request.write (admin domain keys).
 */
export const useRecentAdminRequestDecisions = (
  initialData?: AdminRequest[],
) => {
  const { trackQuery } = useQueryPerformance();
  const queryClient = useQueryClient();
  const queryKey = queryKeys.admin.recentRequestDecisions;
  const seed = seedFromSsrIfEmpty(queryClient, queryKey, initialData);

  return useQuery({
    queryKey,
    queryFn: () =>
      trackQuery("admin-request-decisions", async () => {
        return getRecentAdminRequestDecisions();
      }),
    staleTime: 30 * 1000,
    refetchOnMount: true,
    initialData: seed,
  });
};

/** Single make-admin request detail — admin privilege detail page. */
export const useAdminRequestDetail = (
  requestId: string,
  initialData?: AdminRequest,
  initialDataUpdatedAt?: number,
) => {
  const { trackQuery } = useQueryPerformance();

  return useQuery<AdminRequest>({
    queryKey: queryKeys.admin.requestDetail(requestId),
    queryFn: () =>
      trackQuery(`admin-request-detail-${requestId}`, async () => {
        const result = await getAdminRequestDetail(requestId);
        if (!result.success || !result.data) {
          throw new Error(result.error || "Failed to fetch admin request");
        }
        return result.data;
      }),
    enabled: !!requestId,
    staleTime: 30 * 1000,
    refetchOnMount: true,
    initialData,
    initialDataUpdatedAt,
  });
};

/**
 * Hook to fetch all reviews for a specific book.
 * Supports initialData for SSR hydration to prevent duplicate requests.
 * Uses a 30-second freshness window plus explicit invalidation for bounded reconciliation.
 *
 * @param bookId - Book ID (UUID)
 * @param initialData - Optional initial data from SSR (prevents duplicate fetch)
 * @param initialDataUpdatedAt - SSR stamp so hydration freshness is explicit (profile borrows parity)
 * @returns React Query result with reviews array and loading/error states
 *
 * @example
 * ```tsx
 * // Client-side only
 * const { data, isLoading } = useBookReviews(bookId);
 *
 * // With SSR initial data
 * const { data } = useBookReviews(bookId, serverReviews, Date.now());
 * ```
 */
export const useBookReviews = (
  bookId: string,
  initialData?: Review[],
  initialDataUpdatedAt?: number,
) => {
  const { trackQuery } = useQueryPerformance();
  const queryClient = useQueryClient();
  const queryKey = queryKeys.reviews.book(bookId);
  const seed = seedFromSsrIfEmpty(queryClient, queryKey, initialData);

  return useQuery({
    queryKey,
    queryFn: () =>
      trackQuery(`book-reviews-${bookId}`, async () => {
        return getBookReviews(bookId);
      }),
    enabled: !!bookId,
    staleTime: 30 * 1000, // Reconcile after 30 seconds or explicit invalidation
    refetchOnMount: true, // Refetch if stale (after invalidation)
    initialData: seed,
    initialDataUpdatedAt,
  });
};

/**
 * Hook to check if the current user is eligible to review a specific book.
 * Eligibility Rules:
 * 1. User must be logged in
 * 2. User must have previously borrowed AND returned the book
 * 3. User must NOT have an existing review for the book
 * Uses a 30-second freshness window plus explicit invalidation for bounded reconciliation.
 *
 * @param bookId - Book ID (UUID)
 * @param initialData - Optional initial data from SSR (prevents duplicate fetch)
 * @returns React Query result with eligibility status and loading/error states
 *
 * @example
 * ```tsx
 * // Client-side only
 * const { data, isLoading } = useReviewEligibility(bookId);
 * if (data?.canReview) {
 *   // Show review form
 * }
 *
 * // With SSR initial data
 * const { data } = useReviewEligibility(bookId, serverEligibility);
 * ```
 */
export const useReviewEligibility = (
  bookId: string,
  initialData?: ReviewEligibility
) => {
  const { trackQuery } = useQueryPerformance();

  return useQuery({
    queryKey: queryKeys.reviews.eligibility(bookId),
    queryFn: () =>
      trackQuery(`review-eligibility-${bookId}`, async () => {
        return getReviewEligibility(bookId);
      }),
    enabled: !!bookId,
    staleTime: 30 * 1000, // Reconcile after 30 seconds or explicit invalidation
    refetchOnMount: true, // Refetch if stale (after invalidation)
    initialData, // Use SSR data if provided (prevents duplicate fetch)
  });
};

/**
 * Hook to fetch business insights analytics data (for business-insights page).
 * Supports URL search params for period and metric filters.
 * Fetches all analytics in parallel: borrowing trends, popular books/genres,
 * user activity, overdue analysis, monthly stats, and system health.
 * Uses a 30-second freshness window plus explicit invalidation for bounded reconciliation.
 *
 * @param options - Optional configuration (limits, days, etc.)
 * @param initialData - Optional initial data from SSR (prevents duplicate fetch)
 * @returns React Query result with complete analytics data and loading/error states
 *
 * @example
 * ```tsx
 * // Use URL params: /admin/business-insights?period=30&metric=borrows
 * const { data, isLoading } = useBusinessInsights();
 *
 * // With explicit options
 * const { data } = useBusinessInsights({
 *   borrowingTrendsDays: 30,
 *   popularBooksLimit: 10,
 * });
 *
 * // With SSR initial data
 * const { data } = useBusinessInsights(undefined, serverAnalyticsData);
 * ```
 */
export const useBusinessInsights = (
  options?: {
    popularBooksLimit?: number;
    popularGenresLimit?: number;
    userActivityLimit?: number;
    borrowingTrendsDays?: number;
  },
  initialData?: AnalyticsData
) => {
  const { trackQuery } = useQueryPerformance();
  const searchParams = useSearchParams();

  // Get options from URL params if not provided
  const finalOptions = options || {
    borrowingTrendsDays: searchParams.get("period")
      ? Number(searchParams.get("period"))
      : undefined,
    popularBooksLimit: searchParams.get("limit")
      ? Number(searchParams.get("limit"))
      : undefined,
  };

  // Build query key from options for proper caching (different from admin-analytics)
  const queryKey = queryKeys.admin.businessInsights(finalOptions);

  return useQuery({
    queryKey,
    queryFn: () =>
      trackQuery("business-insights", async () => {
        return getCompleteAnalytics(finalOptions);
      }),
    // Evict + remount refetch (no invent chart densify). initialDataUpdatedAt 0
    // marks SSR seed immediately stale so soft-nav cannot paint a frozen RSC frame.
    staleTime: 0,
    refetchOnMount: "always",
    initialData,
    initialDataUpdatedAt: 0,
  });
};

/**
 * Hook to fetch system metrics (database performance, API performance, error rate, storage, etc.).
 * Supports initialData for SSR hydration to prevent duplicate requests.
 * Uses a 30-second freshness window plus explicit invalidation for bounded reconciliation.
 *
 * @param initialData - Optional initial data from SSR (prevents duplicate fetch)
 * @returns React Query result with system metrics data and loading/error states
 *
 * @example
 * ```tsx
 * // Client-side only
 * const { data, isLoading } = useSystemMetrics();
 *
 * // With SSR initial data
 * const { data } = useSystemMetrics(serverMetricsData);
 * ```
 */
export const useSystemMetrics = (
  initialData?: MetricsData,
  enabled: boolean = true,
) => {
  const { trackQuery } = useQueryPerformance();

  return useQuery({
    queryKey: queryKeys.admin.systemMetrics,
    queryFn: () =>
      trackQuery("system-metrics", async () => {
        return fetchSystemMetrics();
      }),
    staleTime: 30 * 1000, // Reconcile after 30 seconds or explicit invalidation
    refetchOnMount: true, // Refetch if stale (after invalidation)
    initialData, // Use SSR data if provided (prevents duplicate fetch)
    enabled,
  });
};

/**
 * Hook to fetch health status for all services (API server, database, file storage, etc.).
 * Fetches health checks for multiple services in parallel and returns their status.
 * Supports initialData for SSR hydration to prevent duplicate requests.
 * Uses a 30-second freshness window plus explicit invalidation for bounded reconciliation.
 *
 * @param initialData - Optional initial data from SSR (prevents duplicate fetch)
 * @returns React Query result with service health data array and loading/error states
 *
 * @example
 * ```tsx
 * // Client-side only
 * const { data, isLoading } = useServiceHealth();
 *
 * // With SSR initial data
 * const { data } = useServiceHealth(serverServicesData);
 *
 * // Access service status
 * const apiServer = data?.find(service => service.name === "API Server");
 * ```
 */
export const useServiceHealth = (
  initialData?: ServiceStatus[],
  operatorMode: boolean = true,
) => {
  const { trackQuery } = useQueryPerformance();

  return useQuery<ServiceStatus[], Error>({
    queryKey: queryKeys.admin.serviceHealth,
    queryFn: () =>
      trackQuery("service-health", async () => {
        if (operatorMode) return fetchAllServicesHealth();

        const response = await fetch("/api/status/health", {
          cache: "no-store",
          signal: AbortSignal.timeout(10_000),
        });
        const result = (await response.json()) as {
          status: "HEALTHY" | "DEGRADED" | "DOWN";
          timestamp: string;
        };
        return [{
          name: "Application",
          status: result.status,
          responseTime: 0,
          endpoint: "/api/status/health",
          description: "Public application liveness",
          icon: null,
          performance: result.status === "HEALTHY" ? "Excellent" : "Poor",
          performanceValue: result.status === "HEALTHY" ? 100 : 0,
          lastChecked: result.timestamp,
        }];
      }),
    staleTime: 30 * 1000, // Reconcile after 30 seconds or explicit invalidation
    refetchOnMount: true, // Refetch if stale (after invalidation)
    initialData, // Use SSR data if provided (prevents duplicate fetch)
  });
};

/**
 * Hook to fetch fine configuration (daily fine amount for overdue books).
 * Supports initialData for SSR hydration to prevent duplicate requests.
 * Uses a 30-second freshness window plus explicit invalidation for bounded reconciliation.
 *
 * @param initialData - Optional initial data from SSR (prevents duplicate fetch)
 * @returns React Query result with fine configuration and loading/error states
 *
 * @example
 * ```tsx
 * // Client-side only
 * const { data, isLoading } = useFineConfig();
 * const fineAmount = data?.fineAmount || 1.0;
 *
 * // With SSR initial data
 * const { data } = useFineConfig(serverFineConfig);
 * ```
 */
export const useFineConfig = (initialData?: FineConfig) => {
  const { trackQuery } = useQueryPerformance();

  return useQuery<FineConfig, Error>({
    queryKey: queryKeys.admin.fineConfig,
    queryFn: () =>
      trackQuery("fine-config", async () => {
        return getFineConfig();
      }),
    // Densify writes fineConfig on save; keep short stale so remount reconciles.
    staleTime: 0,
    refetchOnMount: true,
    initialData,
  });
};

/**
 * Hook to fetch reminder statistics.
 * Supports initialData for SSR hydration to prevent duplicate requests.
 * Uses a 30-second freshness window plus explicit invalidation for bounded reconciliation.
 *
 * @param initialData - Optional initial data from SSR (prevents duplicate fetch)
 * @returns React Query result with reminder statistics and loading/error states
 *
 * @example
 * ```tsx
 * // Client-side only
 * const { data, isLoading } = useReminderStats();
 *
 * // With SSR initial data
 * const { data } = useReminderStats(serverReminderStats);
 * ```
 */
export const useReminderStats = (initialData?: ReminderStats) => {
  const { trackQuery } = useQueryPerformance();

  return useQuery({
    queryKey: queryKeys.admin.reminderStats,
    queryFn: () =>
      trackQuery("reminder-stats", async () => {
        return getReminderStats();
      }),
    // densifyReminderStats bumps sentToday; staleTime 0 avoids soft-nav freeze.
    staleTime: 0,
    refetchOnMount: true,
    initialData,
  });
};

/**
 * Hook to fetch export statistics.
 * Supports initialData for SSR hydration to prevent duplicate requests.
 * Uses a 30-second freshness window plus explicit invalidation for bounded reconciliation.
 *
 * @param initialData - Optional initial data from SSR (prevents duplicate fetch)
 * @returns React Query result with export statistics and loading/error states
 *
 * @example
 * ```tsx
 * // Client-side only
 * const { data, isLoading } = useExportStats();
 *
 * // With SSR initial data
 * const { data } = useExportStats(serverExportStats);
 * ```
 */
export const useExportStats = (initialData?: ExportStats) => {
  const { trackQuery } = useQueryPerformance();

  return useQuery({
    queryKey: queryKeys.admin.exportStats,
    queryFn: () =>
      trackQuery("export-stats", async () => {
        return getExportStats();
      }),
    staleTime: 30 * 1000, // Reconcile after 30 seconds or explicit invalidation
    refetchOnMount: true, // Refetch if stale (after invalidation)
    initialData, // Use SSR data if provided (prevents duplicate fetch)
  });
};

// Notifications (bell) queries
/**
 * Hook to fetch the signed-in user's most recent in-app notifications.
 * Polls every 60s so the bell stays fresh across tabs even without an
 * explicit mutation on this device (e.g. an admin action from another tab
 * still reaches this one via the mutation's own invalidation broadcast;
 * polling is a belt-and-suspenders fallback for long-idle tabs).
 *
 * @param enabled - Only fetch while the signed-in session is known (avoid 401 churn)
 * @param limit - Max notifications to fetch (default 20)
 */
export const useNotifications = (enabled: boolean = true, limit = 20) => {
  const { trackQuery } = useQueryPerformance();

  return useQuery<NotificationItem[]>({
    queryKey: queryKeys.notifications.list(limit),
    queryFn: () =>
      trackQuery("notifications", async () => getNotifications(limit)),
    enabled,
    staleTime: 30 * 1000,
    refetchOnMount: true,
    refetchInterval: 60 * 1000,
  });
};

/**
 * Hook to fetch the unread notification count (bell badge).
 * Polls every 30s; also refreshed by invalidateNotificationsQueries after
 * any mutation that creates a notification for this user.
 */
export const useUnreadNotificationCount = (
  enabled: boolean = true,
  initialData?: number,
) => {
  const { trackQuery } = useQueryPerformance();

  return useQuery<number>({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: () =>
      trackQuery("notifications-unread-count", async () =>
        getUnreadNotificationCount(),
      ),
    enabled,
    initialData,
    staleTime: 15 * 1000,
    refetchOnMount: true,
    refetchInterval: 30 * 1000,
  });
};

/**
 * Hook to fetch the admin Activity History feed (period + client search).
 * Invalidated by every mutation family that logs an activity row.
 */
export const useActivityLogs = (
  filters: ActivityLogFilters,
  initialData?: ActivityLogItem[],
) => {
  const { trackQuery } = useQueryPerformance();
  const queryClient = useQueryClient();
  const queryKey = queryKeys.activityLog.list(filters);
  // Only seed the default SSR period (7days, no search). Never seed today/30/all
  // with 7days SSR rows — that made every period show the same table (staleTime).
  const unfiltered = filters.period === "7days" && !filters.search;
  const seedCandidate = unfiltered ? initialData : undefined;
  const seed = seedFromSsrIfEmpty(queryClient, queryKey, seedCandidate);

  return useQuery<ActivityLogItem[]>({
    queryKey,
    queryFn: () =>
      trackQuery("activity-logs", async () => getActivityLogs(filters)),
    initialData: seed,
    // No keepPreviousData: period switches must not flash yesterday's rows as "today".
    staleTime: 30 * 1000,
    refetchOnMount: true,
  });
};

// Support Tickets queries
/**
 * Admin moderation queue — every ticket, filterable by status/priority/search.
 * Supports URL search params so the toolbar filters drive the query key.
 */
export const useAdminSupportTickets = (
  filters?: AdminTicketListFilters,
  initialData?: SupportTicketListItem[],
) => {
  const { trackQuery } = useQueryPerformance();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const resolvedFilters: AdminTicketListFilters = filters || {
    status: (searchParams.get("status") as TicketStatusValue | null) || undefined,
    priority: (searchParams.get("priority") as TicketPriorityValue | null) || undefined,
    search: searchParams.get("search") || undefined,
  };

  const queryKey = queryKeys.tickets.adminList(resolvedFilters);
  const unfiltered =
    !resolvedFilters.status &&
    !resolvedFilters.priority &&
    !resolvedFilters.search;
  const seed = seedFromSsrIfEmpty(
    queryClient,
    queryKey,
    unfiltered || (initialData && initialData.length > 0)
      ? initialData
      : undefined,
  );

  return useQuery<SupportTicketListItem[]>({
    queryKey,
    queryFn: () =>
      trackQuery("admin-support-tickets", async () =>
        getAdminSupportTickets(resolvedFilters),
      ),
    staleTime: 0,
    refetchOnMount: true,
    placeholderData: keepPreviousData,
    initialData: seed,
  });
};

/** Signed-in user's own tickets — used on `/support-tickets` (admin-as-user too). */
export const useUserSupportTickets = (
  userId: string,
  filters?: UserTicketListFilters,
  initialData?: SupportTicketListItem[],
) => {
  const { trackQuery } = useQueryPerformance();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const resolvedFilters: UserTicketListFilters = filters || {
    status: (searchParams.get("status") as TicketStatusValue | null) || undefined,
    search: searchParams.get("search") || undefined,
  };

  const queryKey = queryKeys.tickets.userList(userId, resolvedFilters);
  const unfiltered =
    !resolvedFilters.status && !resolvedFilters.search;
  const seed = seedFromSsrIfEmpty(
    queryClient,
    queryKey,
    unfiltered || (initialData && initialData.length > 0)
      ? initialData
      : undefined,
  );

  return useQuery<SupportTicketListItem[]>({
    queryKey,
    queryFn: () =>
      trackQuery("user-support-tickets", async () =>
        getUserSupportTickets(resolvedFilters),
      ),
    enabled: !!userId,
    staleTime: 0,
    refetchOnMount: true,
    placeholderData: keepPreviousData,
    initialData: seed,
  });
};

export const useSupportTicket = (
  ticketId: string,
  initialData?: SupportTicketDetail,
  initialDataUpdatedAt?: number,
) => {
  const { trackQuery } = useQueryPerformance();
  const queryClient = useQueryClient();

  return useQuery<SupportTicketDetail>({
    queryKey: queryKeys.tickets.detail(ticketId),
    queryFn: () =>
      trackQuery(`support-ticket-${ticketId}`, async () => {
        const fresh = await getSupportTicketDetail(ticketId);
        const prev = queryClient.getQueryData<SupportTicketDetail>(
          queryKeys.tickets.detail(ticketId),
        );
        // API omits auditEvents; list seed omits replies — keep densified detail.
        return mergeDensifiedDetail(prev, fresh, [
          "auditEvents",
          "replies",
          "notes",
          "updatedById",
          "updatedByName",
          "updatedByEmail",
          "updatedByUniversityCard",
        ]);
      }),
    enabled: !!ticketId,
    staleTime: 15 * 1000,
    refetchOnMount: true,
    initialData,
    initialDataUpdatedAt,
  });
};

/** Admin sidebar badge — OPEN + IN_PROGRESS ticket count. */
export const useOpenTicketCount = (initialData?: number) => {
  const { trackQuery } = useQueryPerformance();

  return useQuery<number>({
    queryKey: queryKeys.tickets.openCount,
    queryFn: () =>
      trackQuery("support-ticket-open-count", async () => getOpenTicketCount()),
    staleTime: 30 * 1000,
    refetchOnMount: true,
    initialData,
  });
};

// Book review moderation — admin queue + "My Reviews" tab.
// Parent: CR-0003 / REQ-0034

/** Admin moderation queue — every review, all statuses. */
export const useAdminBookReviews = (
  filters: AdminReviewFilters = {},
  initialData?: AdminBookReviewItem[],
) => {
  const { trackQuery } = useQueryPerformance();
  const queryClient = useQueryClient();

  const queryKey = queryKeys.reviews.adminList(filters);
  const unfiltered = !filters.status && !filters.search;
  const seed = seedFromSsrIfEmpty(
    queryClient,
    queryKey,
    unfiltered || (initialData && initialData.length > 0)
      ? initialData
      : undefined,
  );

  return useQuery<AdminBookReviewItem[]>({
    queryKey,
    queryFn: () =>
      trackQuery("admin-book-reviews", async () => getAdminBookReviews(filters)),
    staleTime: 0,
    refetchOnMount: true,
    placeholderData: keepPreviousData,
    initialData: seed,
  });
};

/** Signed-in user's own reviews (any status) — My Reviews tab. */
export const useUserBookReviews = (
  userId: string,
  initialData?: AdminBookReviewItem[],
) => {
  const { trackQuery } = useQueryPerformance();
  const queryClient = useQueryClient();
  const queryKey = queryKeys.reviews.userReviews(userId);
  const seed = seedFromSsrIfEmpty(queryClient, queryKey, initialData);

  return useQuery<AdminBookReviewItem[]>({
    queryKey,
    queryFn: () =>
      trackQuery("user-book-reviews", async () => getUserBookReviews()),
    enabled: !!userId,
    staleTime: 10 * 1000,
    refetchOnMount: true,
    initialData: seed,
  });
};

/** Single review detail — admin moderation detail page. */
export const useAdminReviewDetail = (
  reviewId: string,
  initialData?: AdminBookReviewItem,
  initialDataUpdatedAt?: number,
) => {
  const { trackQuery } = useQueryPerformance();
  const queryClient = useQueryClient();

  return useQuery<AdminBookReviewItem>({
    queryKey: queryKeys.reviews.adminDetail(reviewId),
    queryFn: () =>
      trackQuery("admin-review-detail", async () => {
        const fresh = await getAdminReviewDetail(reviewId);
        const prev = queryClient.getQueryData<AdminBookReviewItem>(
          queryKeys.reviews.adminDetail(reviewId),
        );
        // Keep densified Approver stack across invalidate when API is thin.
        return mergeDensifiedDetail(prev, fresh, [
          "reviewedBy",
          "reviewedByName",
          "reviewedByEmail",
          "reviewedByUniversityCard",
          "reviewedAt",
          "auditEvents",
        ]);
      }),
    enabled: !!reviewId,
    staleTime: 10 * 1000,
    refetchOnMount: true,
    initialData,
    initialDataUpdatedAt,
  });
};

/** Admin sidebar badge — reviews awaiting moderation. */
export const usePendingReviewCount = (initialData?: number) => {
  const { trackQuery } = useQueryPerformance();

  return useQuery<number>({
    queryKey: queryKeys.reviews.pendingCount,
    queryFn: () =>
      trackQuery("book-review-pending-count", async () => getPendingReviewCount()),
    staleTime: 30 * 1000,
    refetchOnMount: true,
    initialData,
  });
};
