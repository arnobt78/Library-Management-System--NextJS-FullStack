"use client";

import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useQueryPerformance } from "@/hooks/usePerformance";
import {
  getBooksList,
  getBook,
  getBookRecommendations,
  getBookBorrowStats,
  type BookFilters,
  type BooksListResponse,
  type BookBorrowStats,
} from "@/lib/services/books";
import {
  getUser,
  getUsersList,
  getPendingUsers,
  getPendingAdminRequests,
  type User,
  type UserFilters,
  type UsersListResponse,
  type AdminRequest,
} from "@/lib/services/users";
import {
  getBorrowsList,
  getBorrowRequests,
  getUserBorrows,
  type BorrowFilters,
  type BorrowStatus,
  type BorrowRecord,
  type BorrowRecordWithDetails,
  type BorrowsListResponse,
} from "@/lib/services/borrows";
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
import {
  getBookReviews,
  getReviewEligibility,
  type Review,
  type ReviewEligibility,
} from "@/lib/services/reviews";
import { useSearchParams } from "next/navigation";

// Books queries
/**
 * Hook to fetch books with optional search and filter parameters.
 * Supports URL search params for search, genre, availability, rating, sort, page, and limit.
 * Supports initialData for SSR hydration to prevent duplicate requests.
 * Uses infinite cache strategy (staleTime: Infinity) for optimal performance.
 *
 * @param filters - Optional filters object (overrides URL params if provided)
 * @param initialData - Optional initial data from SSR (prevents duplicate fetch)
 * @returns React Query result with books list, pagination, and loading/error states
 *
 * @example
 * ```tsx
 * // Use URL params: /books?search=react&genre=Technology
 * const { data, isLoading } = useBooks();
 *
 * // Override with custom filters
 * const { data } = useBooks({ search: "react", genre: "Technology" });
 *
 * // With SSR initial data
 * const { data } = useBooks(undefined, serverBooksData);
 * ```
 */
export const useBooks = (
  filters?: BookFilters,
  initialData?: BooksListResponse
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

  // Build query key from filters for proper caching
  const queryKey = ["books", urlFilters];

  return useQuery({
    queryKey,
    queryFn: () =>
      trackQuery("books", async () => {
        return getBooksList(urlFilters);
      }),
    staleTime: Infinity, // Cache forever until invalidated
    refetchOnMount: true, // Refetch if stale (after invalidation)
    initialData, // Use SSR data if provided (prevents duplicate fetch)
  });
};

/**
 * Hook to fetch all books with search and filter parameters (for all-books page).
 * This is an alias for useBooks() but with a specific query key for the all-books page.
 * Supports URL search params for search, genre, availability, rating, sort, page, and limit.
 * Uses infinite cache strategy (staleTime: Infinity) for optimal performance.
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
  initialData?: BooksListResponse
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
  const queryKey = ["all-books", urlFilters];

  return useQuery({
    queryKey,
    queryFn: () =>
      trackQuery("all-books", async () => {
        return getBooksList(urlFilters);
      }),
    staleTime: Infinity, // Cache forever until invalidated
    refetchOnMount: true, // Refetch if stale (after invalidation)
    initialData, // Use SSR data if provided (prevents duplicate fetch)
  });
};

/**
 * Hook to fetch a single book by ID.
 * Supports initialData for SSR hydration to prevent duplicate requests.
 * Uses infinite cache strategy (staleTime: Infinity) for optimal performance.
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
    queryKey: ["book", id],
    queryFn: () =>
      trackQuery(`book-${id}`, async () => {
        return getBook(id);
      }),
    enabled: !!id,
    staleTime: Infinity, // Cache forever until invalidated
    refetchOnMount: true, // Refetch if stale (after invalidation)
    initialData, // Use SSR data if provided (prevents duplicate fetch)
  });
};

/**
 * Hook to fetch borrow statistics for a specific book.
 * Supports initialData for SSR hydration to prevent duplicate requests.
 * Uses infinite cache strategy (staleTime: Infinity) for optimal performance.
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
    queryKey: ["book-borrow-stats", bookId],
    queryFn: () =>
      trackQuery("book-borrow-stats", async () => {
        return getBookBorrowStats(bookId);
      }),
    staleTime: Infinity, // Cache forever until invalidated
    refetchOnMount: true, // Refetch if stale (after invalidation)
    enabled: !!bookId, // Only fetch if bookId is provided
    initialData, // Use SSR data if provided (prevents duplicate fetch)
  });
};

/**
 * Hook to fetch book recommendations for a user.
 * Supports URL search params for userId and limit.
 * Uses infinite cache strategy (staleTime: Infinity) for optimal performance.
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
  const queryKey = ["book-recommendations", finalUserId, finalLimit];

  return useQuery({
    queryKey,
    queryFn: () =>
      trackQuery(
        `book-recommendations-${finalUserId || "anonymous"}`,
        async () => {
          return getBookRecommendations(finalUserId, finalLimit);
        }
      ),
    staleTime: Infinity, // Cache forever until invalidated
    refetchOnMount: true, // Refetch if stale (after invalidation)
    initialData, // Use SSR data if provided (prevents duplicate fetch)
    enabled: true, // Always enabled (userId is optional)
  });
};

// User queries
/**
 * Hook to fetch a single user profile by ID.
 * Supports initialData for SSR hydration to prevent duplicate requests.
 * Uses infinite cache strategy (staleTime: Infinity) for optimal performance.
 *
 * @param userId - User ID (UUID)
 * @param initialData - Optional initial data from SSR (prevents duplicate fetch)
 * @returns React Query result with user data and loading/error states
 *
 * @example
 * ```tsx
 * // Client-side only
 * const { data, isLoading } = useUserProfile(userId);
 *
 * // With SSR initial data
 * const { data } = useUserProfile(userId, serverUserData);
 * ```
 */
export const useUserProfile = (userId: string, initialData?: User) => {
  const { trackQuery } = useQueryPerformance();

  return useQuery({
    queryKey: ["user", userId],
    queryFn: () =>
      trackQuery(`user-${userId}`, async () => {
        return getUser(userId);
      }),
    enabled: !!userId,
    staleTime: Infinity, // Cache forever until invalidated
    refetchOnMount: true, // Refetch if stale (after invalidation)
    initialData, // Use SSR data if provided (prevents duplicate fetch)
  });
};

/**
 * Hook to fetch all users with search and filter parameters (for admin users page).
 * Supports URL search params for search, status, role, sort, page, and limit.
 * Supports initialData for SSR hydration to prevent duplicate requests.
 * Uses infinite cache strategy (staleTime: Infinity) for optimal performance.
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
  const queryKey = ["all-users", urlFilters];

  return useQuery({
    queryKey,
    queryFn: () =>
      trackQuery("all-users", async () => {
        return getUsersList(urlFilters);
      }),
    staleTime: 0, // Always refetch when query key changes (filters change)
    refetchOnMount: true, // Refetch on mount
    initialData, // Use SSR data if provided (prevents duplicate fetch)
  });
};

/**
 * Hook to fetch pending user account requests.
 * Supports initialData for SSR hydration to prevent duplicate requests.
 * Uses infinite cache strategy (staleTime: Infinity) for optimal performance.
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
  search?: string
) => {
  const { trackQuery } = useQueryPerformance();
  const searchParams = useSearchParams();

  // Get search from URL params if not provided
  const searchValue = search || searchParams.get("search") || undefined;

  // Build query key from search for proper caching
  const queryKey = ["pending-users", searchValue];

  return useQuery({
    queryKey,
    queryFn: () =>
      trackQuery("pending-users", async () => {
        return getPendingUsers(searchValue);
      }),
    staleTime: 0, // Always refetch when query key changes (search changes)
    refetchOnMount: true, // Refetch on mount
    initialData, // Use SSR data if provided (prevents duplicate fetch)
  });
};

// Borrow records queries
/**
 * Hook to fetch borrow records with optional filters and query parameters.
 * Supports URL search params for status, date range, overdue, sort, page, and limit.
 * Supports initialData for SSR hydration to prevent duplicate requests.
 * Uses infinite cache strategy (staleTime: Infinity) for optimal performance.
 *
 * @param userId - User ID (required for user-specific borrows)
 * @param filters - Optional filters object (overrides URL params if provided)
 * @param initialData - Optional initial data from SSR (prevents duplicate fetch)
 * @returns React Query result with borrow records list, pagination, and loading/error states
 *
 * @example
 * ```tsx
 * // Use URL params: /borrows?status=BORROWED&overdue=true
 * const { data, isLoading } = useBorrowRecords(userId);
 *
 * // Override with custom filters
 * const { data } = useBorrowRecords(userId, {
 *   status: "BORROWED",
 *   overdue: true,
 *   sort: "dueDate",
 * });
 *
 * // With SSR initial data
 * const { data } = useBorrowRecords(userId, undefined, serverBorrowsData);
 * ```
 */
export const useBorrowRecords = (
  userId: string,
  filters?: Omit<BorrowFilters, "userId">,
  initialData?: BorrowsListResponse
) => {
  const { trackQuery } = useQueryPerformance();
  const searchParams = useSearchParams();

  // Get filters from URL params if not provided
  const urlFilters: BorrowFilters = {
    userId, // Always include userId
    ...(filters || {
      status:
        (searchParams.get("status") as BorrowFilters["status"]) || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
      overdue: searchParams.get("overdue")
        ? searchParams.get("overdue") === "true"
        : undefined,
      sort: (searchParams.get("sort") as BorrowFilters["sort"]) || undefined,
      page: searchParams.get("page")
        ? Number(searchParams.get("page"))
        : undefined,
      limit: searchParams.get("limit")
        ? Number(searchParams.get("limit"))
        : undefined,
    }),
  };

  // Build query key from filters for proper caching
  const queryKey = ["borrow-records", urlFilters];

  return useQuery({
    queryKey,
    queryFn: () =>
      trackQuery(`borrow-records-${userId}`, async () => {
        return getBorrowsList(urlFilters);
      }),
    enabled: !!userId,
    staleTime: Infinity, // Cache forever until invalidated
    refetchOnMount: true, // Refetch if stale (after invalidation)
    initialData, // Use SSR data if provided (prevents duplicate fetch)
  });
};

/**
 * Hook to fetch user-specific borrow records.
 * Supports URL search params for status filter.
 * Uses infinite cache strategy (staleTime: Infinity) for optimal performance.
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
 * ```
 */
export const useUserBorrows = (
  userId: string,
  status?: BorrowStatus,
  initialData?: BorrowRecord[]
) => {
  const { trackQuery } = useQueryPerformance();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  // Get status from URL params if not provided
  const finalStatus: BorrowStatus | undefined =
    status || (searchParams.get("status") as BorrowStatus | null) || undefined;

  // Build query key from userId and status for proper caching
  const queryKey = ["user-borrows", userId, finalStatus];

  // CRITICAL: Use ref to track if we've already used initialData
  // This ensures initialData is only used on first render (SSR), never on client-side navigation
  const hasUsedInitialDataRef = React.useRef(false);

  // CRITICAL: Check cache state more thoroughly
  // Check the data to determine if cache exists
  const cachedData = queryClient.getQueryData<BorrowRecord[]>(queryKey);
  const hasCache = cachedData !== undefined && cachedData !== null;

  // Only use initialData if:
  // 1. We haven't used it before (first render only)
  // 2. No cache exists
  // 3. initialData is provided
  const shouldUseInitialData =
    !hasUsedInitialDataRef.current && !hasCache && !!initialData;

  // Mark that we've used initialData if we're going to use it
  if (shouldUseInitialData) {
    hasUsedInitialDataRef.current = true;
  }

  // CRITICAL: No cache checking - always fetch fresh data
  // Removed debug logging since we're not using cache anymore

  return useQuery({
    queryKey,
    queryFn: () =>
      trackQuery(`user-borrows-${userId}`, async () => {
        return getUserBorrows(userId, finalStatus);
      }),
    enabled: !!userId,
    staleTime: 0, // Always consider data stale - refetch on every mount
    refetchOnMount: true, // Always refetch on mount - no cache
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on reconnect
    initialData: shouldUseInitialData ? initialData : undefined, // Only use SSR data on first render
    // CRITICAL: No placeholderData - always fetch fresh data
    gcTime: 0, // Don't cache - always fetch fresh data
  });
};

// Admin queries
/**
 * Hook to fetch admin dashboard statistics.
 * Supports initialData for SSR hydration to prevent duplicate requests.
 * Uses infinite cache strategy (staleTime: Infinity) for optimal performance.
 *
 * @param initialData - Optional initial data from SSR (prevents duplicate fetch)
 * @returns React Query result with admin statistics and loading/error states
 *
 * @example
 * ```tsx
 * // Client-side only
 * const { data, isLoading } = useAdminStats();
 *
 * // With SSR initial data
 * const { data } = useAdminStats(serverStatsData);
 * ```
 */
export const useAdminStats = (initialData?: AdminStats) => {
  const { trackQuery } = useQueryPerformance();

  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: () =>
      trackQuery("admin-stats", async () => {
        return getAdminStats();
      }),
    staleTime: Infinity, // Cache forever until invalidated
    refetchOnMount: true, // Refetch if stale (after invalidation)
    initialData, // Use SSR data if provided (prevents duplicate fetch)
  });
};

/**
 * Hook to fetch all borrow requests (admin view with user and book details).
 * Supports URL search params for status filter and optional filters parameter.
 * Supports initialData for SSR hydration to prevent duplicate requests.
 * Uses infinite cache strategy (staleTime: Infinity) for optimal performance.
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
  initialData?: BorrowRecordWithDetails[]
) => {
  const { trackQuery } = useQueryPerformance();
  const searchParams = useSearchParams();

  // Get filters from URL params if not provided
  const status: BorrowStatus | undefined =
    filters?.status ||
    (searchParams.get("status") as BorrowStatus | null) ||
    undefined;
  const search: string | undefined =
    filters?.search || searchParams.get("search") || undefined;

  // Build query key from filters for proper caching
  const queryKey = ["borrow-requests", { status, search }];

  return useQuery({
    queryKey,
    queryFn: () =>
      trackQuery("borrow-requests", async () => {
        return getBorrowRequests(status, search);
      }),
    staleTime: 0, // Always refetch when query key changes (filters change)
    refetchOnMount: true, // Refetch on mount
    initialData, // Use SSR data if provided (prevents duplicate fetch)
  });
};

/**
 * Hook to fetch pending admin requests.
 * Supports initialData for SSR hydration to prevent duplicate requests.
 * Uses infinite cache strategy (staleTime: Infinity) for optimal performance.
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

  return useQuery({
    queryKey: ["pending-admin-requests"],
    queryFn: () =>
      trackQuery("pending-admin-requests", async () => {
        return getPendingAdminRequests();
      }),
    staleTime: Infinity, // Cache forever until invalidated
    refetchOnMount: true, // Refetch if stale (after invalidation)
    initialData, // Use SSR data if provided (prevents duplicate fetch)
  });
};

/**
 * Hook to fetch all reviews for a specific book.
 * Supports initialData for SSR hydration to prevent duplicate requests.
 * Uses infinite cache strategy (staleTime: Infinity) for optimal performance.
 *
 * @param bookId - Book ID (UUID)
 * @param initialData - Optional initial data from SSR (prevents duplicate fetch)
 * @returns React Query result with reviews array and loading/error states
 *
 * @example
 * ```tsx
 * // Client-side only
 * const { data, isLoading } = useBookReviews(bookId);
 *
 * // With SSR initial data
 * const { data } = useBookReviews(bookId, serverReviews);
 * ```
 */
export const useBookReviews = (bookId: string, initialData?: Review[]) => {
  const { trackQuery } = useQueryPerformance();

  return useQuery({
    queryKey: ["book-reviews", bookId],
    queryFn: () =>
      trackQuery(`book-reviews-${bookId}`, async () => {
        return getBookReviews(bookId);
      }),
    enabled: !!bookId,
    staleTime: Infinity, // Cache forever until invalidated
    refetchOnMount: true, // Refetch if stale (after invalidation)
    initialData, // Use SSR data if provided (prevents duplicate fetch)
  });
};

/**
 * Hook to check if the current user is eligible to review a specific book.
 * Eligibility Rules:
 * 1. User must be logged in
 * 2. User must have previously borrowed AND returned the book
 * 3. User must NOT have an existing review for the book
 * Uses infinite cache strategy (staleTime: Infinity) for optimal performance.
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
    queryKey: ["review-eligibility", bookId],
    queryFn: () =>
      trackQuery(`review-eligibility-${bookId}`, async () => {
        return getReviewEligibility(bookId);
      }),
    enabled: !!bookId,
    staleTime: Infinity, // Cache forever until invalidated
    refetchOnMount: true, // Refetch if stale (after invalidation)
    initialData, // Use SSR data if provided (prevents duplicate fetch)
  });
};

/**
 * Hook to fetch complete admin analytics data.
 * Fetches all analytics in parallel: borrowing trends, popular books/genres,
 * user activity, overdue analysis, monthly stats, and system health.
 * Supports initialData for SSR hydration to prevent duplicate requests.
 * Uses infinite cache strategy (staleTime: Infinity) for optimal performance.
 *
 * @param initialData - Optional initial data from SSR (prevents duplicate fetch)
 * @returns React Query result with complete analytics data and loading/error states
 *
 * @example
 * ```tsx
 * // Client-side only
 * const { data, isLoading } = useAdminAnalytics();
 *
 * // With SSR initial data
 * const { data } = useAdminAnalytics(serverAnalyticsData);
 * ```
 */
export const useAdminAnalytics = (initialData?: AnalyticsData) => {
  const { trackQuery } = useQueryPerformance();

  return useQuery({
    queryKey: ["admin-analytics"],
    queryFn: () =>
      trackQuery("admin-analytics", async () => {
        return getCompleteAnalytics();
      }),
    staleTime: Infinity, // Cache forever until invalidated
    refetchOnMount: true, // Refetch if stale (after invalidation)
    initialData, // Use SSR data if provided (prevents duplicate fetch)
  });
};

/**
 * Hook to fetch business insights analytics data (for business-insights page).
 * Supports URL search params for period and metric filters.
 * Fetches all analytics in parallel: borrowing trends, popular books/genres,
 * user activity, overdue analysis, monthly stats, and system health.
 * Uses infinite cache strategy (staleTime: Infinity) for optimal performance.
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
  const queryKey = ["business-insights", finalOptions];

  return useQuery({
    queryKey,
    queryFn: () =>
      trackQuery("business-insights", async () => {
        return getCompleteAnalytics(finalOptions);
      }),
    staleTime: Infinity, // Cache forever until invalidated
    refetchOnMount: true, // Refetch if stale (after invalidation)
    initialData, // Use SSR data if provided (prevents duplicate fetch)
  });
};

/**
 * Hook to fetch system metrics (database performance, API performance, error rate, storage, etc.).
 * Supports initialData for SSR hydration to prevent duplicate requests.
 * Uses infinite cache strategy (staleTime: Infinity) for optimal performance.
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
export const useSystemMetrics = (initialData?: MetricsData) => {
  const { trackQuery } = useQueryPerformance();

  return useQuery({
    queryKey: ["system-metrics"],
    queryFn: () =>
      trackQuery("system-metrics", async () => {
        return fetchSystemMetrics();
      }),
    staleTime: Infinity, // Cache forever until invalidated
    refetchOnMount: true, // Refetch if stale (after invalidation)
    initialData, // Use SSR data if provided (prevents duplicate fetch)
  });
};

/**
 * Hook to fetch health status for all services (API server, database, file storage, etc.).
 * Fetches health checks for multiple services in parallel and returns their status.
 * Supports initialData for SSR hydration to prevent duplicate requests.
 * Uses infinite cache strategy (staleTime: Infinity) for optimal performance.
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
export const useServiceHealth = (initialData?: ServiceStatus[]) => {
  const { trackQuery } = useQueryPerformance();

  return useQuery<ServiceStatus[], Error>({
    queryKey: ["service-health"],
    queryFn: () =>
      trackQuery("service-health", async () => {
        return fetchAllServicesHealth();
      }),
    staleTime: Infinity, // Cache forever until invalidated
    refetchOnMount: true, // Refetch if stale (after invalidation)
    initialData, // Use SSR data if provided (prevents duplicate fetch)
  });
};

/**
 * Hook to fetch fine configuration (daily fine amount for overdue books).
 * Supports initialData for SSR hydration to prevent duplicate requests.
 * Uses infinite cache strategy (staleTime: Infinity) for optimal performance.
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
    queryKey: ["fine-config"],
    queryFn: () =>
      trackQuery("fine-config", async () => {
        return getFineConfig();
      }),
    staleTime: Infinity, // Cache forever until invalidated
    refetchOnMount: true, // Refetch if stale (after invalidation)
    initialData, // Use SSR data if provided (prevents duplicate fetch)
  });
};

/**
 * Hook to fetch reminder statistics.
 * Supports initialData for SSR hydration to prevent duplicate requests.
 * Uses infinite cache strategy (staleTime: Infinity) for optimal performance.
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
    queryKey: ["reminder-stats"],
    queryFn: () =>
      trackQuery("reminder-stats", async () => {
        return getReminderStats();
      }),
    staleTime: Infinity, // Cache forever until invalidated
    refetchOnMount: true, // Refetch if stale (after invalidation)
    initialData, // Use SSR data if provided (prevents duplicate fetch)
  });
};

/**
 * Hook to fetch export statistics.
 * Supports initialData for SSR hydration to prevent duplicate requests.
 * Uses infinite cache strategy (staleTime: Infinity) for optimal performance.
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
    queryKey: ["export-stats"],
    queryFn: () =>
      trackQuery("export-stats", async () => {
        return getExportStats();
      }),
    staleTime: Infinity, // Cache forever until invalidated
    refetchOnMount: true, // Refetch if stale (after invalidation)
    initialData, // Use SSR data if provided (prevents duplicate fetch)
  });
};
