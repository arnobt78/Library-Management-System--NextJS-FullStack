/**
 * React Query Cache Invalidation Utilities
 * 
 * This module provides centralized functions for invalidating React Query caches
 * when data changes. This ensures all related queries update immediately after mutations.
 * 
 * Usage:
 * ```typescript
 * import { invalidateBooksQueries } from "@/lib/utils/queryInvalidation";
 * 
 * // In mutation onSuccess:
 * invalidateBooksQueries(queryClient);
 * ```
 * 
 * Key Concepts:
 * - `invalidateQueries()` marks queries as stale, triggering refetch
 * - `exact: false` uses prefix matching to catch all query variations
 * - Related queries are invalidated together for consistency
 */

import { QueryClient } from "@tanstack/react-query";

/**
 * Invalidate all book-related queries
 * 
 * Invalidates:
 * - ["books"] - All books list (home page, search results)
 * - ["all-books"] - All books list (admin books page, all-books page)
 * - ["book", bookId] - Individual book details
 * - ["book-recommendations"] - Book recommendations
 * - All queries with filters and search params
 * 
 * Call this when:
 * - Book is created, updated, or deleted
 * - Book availability changes (borrowed/returned)
 * - Book details are modified
 * 
 * @param queryClient - React Query client instance
 * 
 * @example
 * ```typescript
 * // In mutation onSuccess:
 * invalidateBooksQueries(queryClient);
 * ```
 */
export function invalidateBooksQueries(queryClient: QueryClient): void {
  // Invalidate and refetch all queries starting with "books" (list queries for home/search)
  queryClient.invalidateQueries({
    queryKey: ["books"],
    exact: false, // Match all queries starting with ["books"]
    refetchType: "active", // Only refetch active (observed) queries
  });

  // Invalidate and refetch all queries starting with "all-books" (admin/all-books page)
  queryClient.invalidateQueries({
    queryKey: ["all-books"],
    exact: false, // Match all queries starting with ["all-books"]
    refetchType: "active", // Only refetch active (observed) queries
  });

  // Invalidate and refetch all queries starting with "book" (detail queries and recommendations)
  queryClient.invalidateQueries({
    queryKey: ["book"],
    exact: false, // Match all queries starting with ["book"] (includes ["book", id] and ["book-recommendations"])
    refetchType: "active", // Only refetch active (observed) queries
  });

  // Explicitly invalidate and refetch book recommendations
  queryClient.invalidateQueries({
    queryKey: ["book-recommendations"],
    exact: false, // Match all queries starting with ["book-recommendations"]
    refetchType: "active", // Only refetch active (observed) queries
  });

  // Invalidate and refetch all book borrow statistics queries
  queryClient.invalidateQueries({
    queryKey: ["book-borrow-stats"],
    exact: false, // Match all queries starting with ["book-borrow-stats"]
    refetchType: "active", // Only refetch active (observed) queries
  });
}

/**
 * Invalidate all user-related queries
 * 
 * Invalidates:
 * - ["users"] - All users list
 * - ["all-users"] - All users list (admin users page)
 * - ["user", userId] - Individual user details
 * - ["users", filters] - Filtered users lists
 * - ["pending-users"] - Pending users
 * - ["current-user"] - Current authenticated user
 * 
 * Call this when:
 * - User is created, updated, or deleted
 * - User status changes (PENDING/APPROVED/REJECTED)
 * - User role changes (USER/ADMIN)
 * 
 * @param queryClient - React Query client instance
 * 
 * @example
 * ```typescript
 * // In mutation onSuccess:
 * invalidateUsersQueries(queryClient);
 * ```
 */
export function invalidateUsersQueries(queryClient: QueryClient): void {
  // Invalidate and refetch all queries starting with "users" (list queries)
  queryClient.invalidateQueries({
    queryKey: ["users"],
    exact: false, // Match all queries starting with ["users"]
    refetchType: "active", // Only refetch active (observed) queries
  });

  // Invalidate and refetch all queries starting with "all-users" (admin users page)
  queryClient.invalidateQueries({
    queryKey: ["all-users"],
    exact: false, // Match all queries starting with ["all-users"]
    refetchType: "active", // Only refetch active (observed) queries
  });

  // Invalidate and refetch all queries starting with "user" (detail queries)
  queryClient.invalidateQueries({
    queryKey: ["user"],
    exact: false, // Match all queries starting with ["user"]
    refetchType: "active", // Only refetch active (observed) queries
  });

  // Invalidate and refetch pending users query
  queryClient.invalidateQueries({
    queryKey: ["pending-users"],
    refetchType: "active", // Only refetch active (observed) queries
  });

  // Invalidate and refetch current user query
  queryClient.invalidateQueries({
    queryKey: ["current-user"],
    refetchType: "active", // Only refetch active (observed) queries
  });
}

/**
 * Invalidate all borrow record-related queries
 * 
 * Invalidates:
 * - ["borrow-records"] - All borrow records
 * - ["borrow-records", userId] - User's borrow records
 * - ["borrow-records", bookId] - Book's borrow records
 * - ["borrow-requests"] - Admin borrow requests view
 * - ["borrow", borrowId] - Individual borrow record
 * 
 * Call this when:
 * - Borrow request is created, approved, rejected, or returned
 * - Borrow status changes
 * - Due dates are updated
 * - Fines are calculated
 * 
 * @param queryClient - React Query client instance
 * 
 * @example
 * ```typescript
 * // In mutation onSuccess:
 * invalidateBorrowsQueries(queryClient);
 * ```
 */
export function invalidateBorrowsQueries(queryClient: QueryClient): void {
  // Invalidate and refetch all queries starting with "borrow-records"
  queryClient.invalidateQueries({
    queryKey: ["borrow-records"],
    exact: false, // Match all queries starting with ["borrow-records"]
    refetchType: "active", // Only refetch active (observed) queries
  });

  // Invalidate and refetch all queries starting with "borrow-requests"
  queryClient.invalidateQueries({
    queryKey: ["borrow-requests"],
    exact: false, // Match all queries starting with ["borrow-requests"]
    refetchType: "active", // Only refetch active (observed) queries
  });

  // Invalidate and refetch all queries starting with "borrow" (detail queries)
  queryClient.invalidateQueries({
    queryKey: ["borrow"],
    exact: false, // Match all queries starting with ["borrow"]
    refetchType: "active", // Only refetch active (observed) queries
  });

  // Invalidate and refetch user-borrows queries
  queryClient.invalidateQueries({
    queryKey: ["user-borrows"],
    exact: false, // Match all queries starting with ["user-borrows"]
    refetchType: "active", // Only refetch active (observed) queries
  });
}

/**
 * Invalidate all review-related queries
 * 
 * Invalidates:
 * - ["book-reviews", bookId] - Book reviews for a specific book
 * - ["review-eligibility", bookId] - Review eligibility check for a specific book
 * - All queries starting with "reviews" or "review" for backward compatibility
 * 
 * Call this when:
 * - Review is created, updated, or deleted
 * - Book is borrowed/returned (affects eligibility)
 * 
 * @param queryClient - React Query client instance
 * 
 * @example
 * ```typescript
 * // In mutation onSuccess:
 * invalidateReviewsQueries(queryClient);
 * ```
 */
export function invalidateReviewsQueries(queryClient: QueryClient): void {
  // Invalidate and refetch all queries starting with "book-reviews" (book-specific reviews)
  queryClient.invalidateQueries({
    queryKey: ["book-reviews"],
    exact: false, // Match all queries starting with ["book-reviews"]
    refetchType: "active", // Only refetch active (observed) queries
  });

  // Invalidate and refetch all queries starting with "review-eligibility" (eligibility checks)
  queryClient.invalidateQueries({
    queryKey: ["review-eligibility"],
    exact: false, // Match all queries starting with ["review-eligibility"]
    refetchType: "active", // Only refetch active (observed) queries
  });

  // Invalidate and refetch all queries starting with "reviews" (for backward compatibility)
  queryClient.invalidateQueries({
    queryKey: ["reviews"],
    exact: false, // Match all queries starting with ["reviews"]
    refetchType: "active", // Only refetch active (observed) queries
  });

  // Invalidate and refetch all queries starting with "review" (for backward compatibility)
  queryClient.invalidateQueries({
    queryKey: ["review"],
    exact: false, // Match all queries starting with ["review"]
    refetchType: "active", // Only refetch active (observed) queries
  });
}

/**
 * Invalidate all admin-related queries
 * 
 * Invalidates:
 * - ["admin-stats"] - Admin dashboard statistics
 * - ["pending-admin-requests"] - Pending admin privilege requests
 * - ["admin-analytics"] - Admin analytics data
 * - ["business-insights"] - Business insights analytics
 * - ["admin", ...] - Other admin queries
 * 
 * Call this when:
 * - Admin stats need refresh
 * - Admin requests are approved/rejected
 * - System configuration changes
 * 
 * @param queryClient - React Query client instance
 * 
 * @example
 * ```typescript
 * // In mutation onSuccess:
 * invalidateAdminQueries(queryClient);
 * ```
 */
export function invalidateAdminQueries(queryClient: QueryClient): void {
  // Invalidate and refetch admin stats
  queryClient.invalidateQueries({
    queryKey: ["admin-stats"],
    refetchType: "active", // Only refetch active (observed) queries
  });

  // Invalidate and refetch pending admin requests
  queryClient.invalidateQueries({
    queryKey: ["pending-admin-requests"],
    refetchType: "active", // Only refetch active (observed) queries
  });

  // Invalidate and refetch admin analytics
  queryClient.invalidateQueries({
    queryKey: ["admin-analytics"],
    refetchType: "active", // Only refetch active (observed) queries
  });

  // Invalidate and refetch business insights
  queryClient.invalidateQueries({
    queryKey: ["business-insights"],
    exact: false, // Match all queries starting with ["business-insights"]
    refetchType: "active", // Only refetch active (observed) queries
  });

  // Invalidate and refetch all queries starting with "admin"
  queryClient.invalidateQueries({
    queryKey: ["admin"],
    exact: false, // Match all queries starting with ["admin"]
    refetchType: "active", // Only refetch active (observed) queries
  });

  // Invalidate and refetch admin requests (for backward compatibility)
  queryClient.invalidateQueries({
    queryKey: ["admin-requests"],
    exact: false, // Match all queries starting with ["admin-requests"]
    refetchType: "active", // Only refetch active (observed) queries
  });

  // Invalidate and refetch reminder statistics
  queryClient.invalidateQueries({
    queryKey: ["reminder-stats"],
    exact: false, // Match all queries starting with ["reminder-stats"]
    refetchType: "active", // Only refetch active (observed) queries
  });

  // Invalidate and refetch export statistics
  queryClient.invalidateQueries({
    queryKey: ["export-stats"],
    exact: false, // Match all queries starting with ["export-stats"]
    refetchType: "active", // Only refetch active (observed) queries
  });

  // Invalidate and refetch fine configuration
  queryClient.invalidateQueries({
    queryKey: ["fine-config"],
    refetchType: "active", // Only refetch active (observed) queries
  });
}

/**
 * Invalidate all analytics-related queries
 * 
 * Invalidates:
 * - ["admin-analytics"] - Admin analytics data
 * - ["business-insights"] - Business insights analytics (with filters)
 * - ["analytics"] - All analytics data (for backward compatibility)
 * 
 * Call this when:
 * - Any data that affects analytics changes
 * - Books are borrowed/returned
 * - Users are created/updated
 * - System configuration changes
 * 
 * @param queryClient - React Query client instance
 * 
 * @example
 * ```typescript
 * // In mutation onSuccess:
 * invalidateAnalyticsQueries(queryClient);
 * ```
 */
export function invalidateAnalyticsQueries(queryClient: QueryClient): void {
  // Invalidate and refetch admin analytics
  queryClient.invalidateQueries({
    queryKey: ["admin-analytics"],
    refetchType: "active", // Only refetch active (observed) queries
  });

  // Invalidate and refetch business insights (with all filter variations)
  queryClient.invalidateQueries({
    queryKey: ["business-insights"],
    exact: false, // Match all queries starting with ["business-insights"]
    refetchType: "active", // Only refetch active (observed) queries
  });

  // Invalidate and refetch all queries starting with "analytics" (for backward compatibility)
  queryClient.invalidateQueries({
    queryKey: ["analytics"],
    exact: false, // Match all queries starting with ["analytics"]
    refetchType: "active", // Only refetch active (observed) queries
  });
}

/**
 * Invalidate all related queries after a book operation
 * 
 * This is a convenience function that invalidates:
 * - Books queries (book list and details)
 * - Borrows queries (borrow records may reference the book)
 * - Reviews queries (reviews are for books)
 * - Analytics queries (book operations affect analytics)
 * - Admin queries (admin stats may include book counts)
 * 
 * Call this when:
 * - Book is created, updated, or deleted
 * - Book availability changes significantly
 * 
 * @param queryClient - React Query client instance
 * 
 * @example
 * ```typescript
 * // In mutation onSuccess:
 * invalidateAfterBookChange(queryClient);
 * ```
 */
export function invalidateAfterBookChange(queryClient: QueryClient): void {
  invalidateBooksQueries(queryClient);
  invalidateBorrowsQueries(queryClient);
  invalidateReviewsQueries(queryClient);
  invalidateAnalyticsQueries(queryClient);
  invalidateAdminQueries(queryClient);
}

/**
 * Invalidate all related queries after a borrow operation
 * 
 * This is a convenience function that invalidates:
 * - Borrows queries (borrow records)
 * - Books queries (book availability changes)
 * - Reviews queries (borrowing affects review eligibility)
 * - Analytics queries (borrow operations affect analytics)
 * - Admin queries (admin stats include borrow counts)
 * 
 * Call this when:
 * - Borrow request is created, approved, rejected, or returned
 * - Borrow status changes
 * - Due dates are updated
 * - Fines are calculated
 * 
 * @param queryClient - React Query client instance
 * 
 * @example
 * ```typescript
 * // In mutation onSuccess:
 * invalidateAfterBorrowChange(queryClient);
 * ```
 */
export function invalidateAfterBorrowChange(queryClient: QueryClient): void {
  invalidateBorrowsQueries(queryClient);
  invalidateBooksQueries(queryClient); // Book availability changes
  invalidateReviewsQueries(queryClient); // Eligibility may change
  invalidateAnalyticsQueries(queryClient);
  invalidateAdminQueries(queryClient);
}

/**
 * Invalidate all related queries after a user operation
 * 
 * This is a convenience function that invalidates:
 * - Users queries (user list and details)
 * - Borrows queries (user's borrow records)
 * - Reviews queries (user's reviews)
 * - Analytics queries (user operations affect analytics)
 * - Admin queries (admin stats include user counts)
 * 
 * Call this when:
 * - User is created, updated, or deleted
 * - User status changes (PENDING/APPROVED/REJECTED)
 * - User role changes (USER/ADMIN)
 * 
 * @param queryClient - React Query client instance
 * 
 * @example
 * ```typescript
 * // In mutation onSuccess:
 * invalidateAfterUserChange(queryClient);
 * ```
 */
export function invalidateAfterUserChange(queryClient: QueryClient): void {
  invalidateUsersQueries(queryClient);
  invalidateBorrowsQueries(queryClient); // User's borrow records
  invalidateReviewsQueries(queryClient); // User's reviews
  invalidateAnalyticsQueries(queryClient);
  invalidateAdminQueries(queryClient);
}

/**
 * Invalidate all related queries after a review operation
 * 
 * This is a convenience function that invalidates:
 * - Reviews queries (review list and details)
 * - Books queries (book rating may change)
 * - Analytics queries (review operations affect analytics)
 * 
 * Call this when:
 * - Review is created, updated, or deleted
 * 
 * @param queryClient - React Query client instance
 * 
 * @example
 * ```typescript
 * // In mutation onSuccess:
 * invalidateAfterReviewChange(queryClient);
 * ```
 */
export function invalidateAfterReviewChange(queryClient: QueryClient): void {
  invalidateReviewsQueries(queryClient);
  invalidateBooksQueries(queryClient); // Book ratings may change
  invalidateAnalyticsQueries(queryClient);
}

/**
 * Invalidate all related queries after an admin operation
 * 
 * This is a convenience function that invalidates:
 * - Admin queries (admin stats and requests)
 * - Users queries (admin operations may affect users)
 * - Analytics queries (admin operations may affect analytics)
 * 
 * Call this when:
 * - Admin request is approved/rejected
 * - System configuration changes
 * - Fine configuration changes
 * - Reminders are sent
 * - Overdue fines are updated
 * 
 * @param queryClient - React Query client instance
 * 
 * @example
 * ```typescript
 * // In mutation onSuccess:
 * invalidateAfterAdminChange(queryClient);
 * ```
 */
export function invalidateAfterAdminChange(queryClient: QueryClient): void {
  invalidateAdminQueries(queryClient);
  invalidateUsersQueries(queryClient); // Admin operations may affect users
  invalidateAnalyticsQueries(queryClient);
  invalidateBorrowsQueries(queryClient); // Fine updates affect borrows
}

/**
 * Invalidate all dashboard and overview queries
 * 
 * This invalidates queries used in dashboard/overview pages:
 * - Admin stats
 * - Analytics
 * - Recent activity
 * 
 * Call this when:
 * - Any significant data change occurs
 * - System-wide updates happen
 * 
 * @param queryClient - React Query client instance
 * 
 * @example
 * ```typescript
 * // In mutation onSuccess:
 * invalidateDashboardQueries(queryClient);
 * ```
 */
export function invalidateDashboardQueries(queryClient: QueryClient): void {
  invalidateAdminQueries(queryClient);
  invalidateAnalyticsQueries(queryClient);
}

/**
 * Invalidate queries after recommendation operations
 * 
 * This invalidates queries related to recommendations:
 * - ["book-recommendations"] - Book recommendations cache
 * - ["admin-stats"] - Admin stats (may include recommendation counts)
 * - ["admin-analytics"] - Admin analytics (may include recommendation data)
 * 
 * Does NOT invalidate:
 * - reminder-stats (not affected by recommendations)
 * - export-stats (not affected by recommendations)
 * - fine-config (not affected by recommendations)
 * 
 * Call this when:
 * - Recommendations are generated
 * - Trending books are updated
 * - Recommendation cache is refreshed
 * 
 * @param queryClient - React Query client instance
 * 
 * @example
 * ```typescript
 * // In mutation onSuccess:
 * invalidateAfterRecommendationChange(queryClient);
 * ```
 */
export function invalidateAfterRecommendationChange(
  queryClient: QueryClient
): void {
  // Invalidate book recommendations (main query affected)
  queryClient.invalidateQueries({
    queryKey: ["book-recommendations"],
    exact: false, // Match all queries starting with ["book-recommendations"]
    refetchType: "active", // Only refetch active (observed) queries
  });

  // Invalidate admin stats (may include recommendation-related stats)
  queryClient.invalidateQueries({
    queryKey: ["admin-stats"],
    refetchType: "active", // Only refetch active (observed) queries
  });

  // Invalidate admin analytics (may include recommendation analytics)
  queryClient.invalidateQueries({
    queryKey: ["admin-analytics"],
    refetchType: "active", // Only refetch active (observed) queries
  });

  // Invalidate business insights (may include trending books)
  queryClient.invalidateQueries({
    queryKey: ["business-insights"],
    exact: false, // Match all queries starting with ["business-insights"]
    refetchType: "active", // Only refetch active (observed) queries
  });
}

/**
 * Invalidate all queries (use with caution)
 * 
 * This invalidates ALL queries in the cache.
 * Use only when:
 * - Major system-wide changes occur
 * - User logs out (to clear all cached data)
 * - Data migration or bulk updates happen
 * 
 * WARNING: This will cause all queries to refetch, which may impact performance.
 * Prefer specific invalidation functions when possible.
 * 
 * @param queryClient - React Query client instance
 * 
 * @example
 * ```typescript
 * // On logout:
 * invalidateAllQueries(queryClient);
 * ```
 */
export function invalidateAllQueries(queryClient: QueryClient): void {
  queryClient.invalidateQueries();
}

