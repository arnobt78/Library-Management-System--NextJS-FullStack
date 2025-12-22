/**
 * Analytics Service - Pure API Functions
 * 
 * This module contains pure API functions for analytics and business insights operations.
 * These functions make fetch calls to API routes and return data.
 * NO React Query logic here - just fetch calls.
 * 
 * These functions are reusable across:
 * - Client Components (via React Query hooks)
 * - Server Components (direct API calls)
 * - Server Actions (if needed)
 * 
 * Note: API routes for analytics need to be created if they don't exist yet.
 * Currently, analytics are fetched via server actions in Server Components.
 * These service functions are ready to use once API routes are available.
 */

import { ApiError } from "./apiError";

/**
 * Borrowing trend data point
 */
export interface BorrowingTrend {
  date: string; // YYYY-MM-DD format
  borrows: number;
  returns: number;
}

/**
 * Popular book data
 */
export interface PopularBook {
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  bookGenre: string;
  totalBorrows: number;
  activeBorrows: number;
  returnedBorrows: number;
}

/**
 * Popular genre data
 */
export interface PopularGenre {
  genre: string;
  totalBorrows: number;
  uniqueBooks: number;
}

/**
 * User activity pattern
 */
export interface UserActivity {
  userId: string;
  userName: string;
  userEmail: string;
  totalBorrows: number;
  activeBorrows: number;
  returnedBorrows: number;
  pendingBorrows: number;
  lastActivity: Date | null;
}

/**
 * Overdue book analysis
 */
export interface OverdueBook {
  recordId: string;
  bookTitle: string;
  bookAuthor: string;
  userName: string;
  userEmail: string;
  borrowDate: Date | null;
  dueDate: string | null;
  daysOverdue: number;
  fineAmount: string | null;
}

/**
 * Overdue statistics
 */
export interface OverdueStats {
  totalOverdue: number;
  avgDaysOverdue: number;
  totalFines: number;
}

/**
 * Monthly statistics
 */
export interface MonthlyStats {
  currentMonth: {
    month: string; // YYYY-MM format
    borrows: number;
  };
  lastMonth: {
    month: string; // YYYY-MM format
    borrows: number;
  };
}

/**
 * System health metrics
 */
export interface SystemHealth {
  totalBooks: number;
  totalUsers: number;
  activeBorrows: number;
  pendingRequests: number;
  overdueBooks: number;
  recentActivity: number;
}

/**
 * Complete analytics data
 */
export interface AnalyticsData {
  borrowingTrends: BorrowingTrend[];
  popularBooks: PopularBook[];
  popularGenres: PopularGenre[];
  userActivity: UserActivity[];
  overdueBooks: OverdueBook[];
  overdueStats: OverdueStats;
  monthlyStats: MonthlyStats;
  systemHealth: SystemHealth;
}

/**
 * Get borrowing trends over time
 * 
 * Returns borrowing and return trends for the last 30 days.
 * 
 * @param days - Number of days to look back (default: 30)
 * @returns Promise with array of borrowing trend data points
 * @throws {ApiError} Error with message and status code
 * 
 * @example
 * ```typescript
 * const trends = await getBorrowingTrends(30);
 * ```
 */
export async function getBorrowingTrends(
  days: number = 30
): Promise<BorrowingTrend[]> {
  const params = new URLSearchParams();
  params.append("days", days.toString());

  const url = `/api/analytics/borrowing-trends?${params.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errorData = await response.json();
      errorMessage =
        errorData.message || errorData.error || response.statusText;
    } catch {
      errorMessage = response.statusText;
    }
    throw new ApiError(errorMessage, response.status);
  }

  const data = await response.json();
  
  // Handle different response formats
  if (data.trends && Array.isArray(data.trends)) {
    return data.trends;
  }
  
  if (data.borrowingTrends && Array.isArray(data.borrowingTrends)) {
    return data.borrowingTrends;
  }
  
  if (Array.isArray(data)) {
    return data;
  }

  throw new ApiError("Invalid response format from borrowing trends API", 500);
}

/**
 * Get most popular books
 * 
 * Returns books ordered by total borrow count.
 * 
 * @param limit - Maximum number of books to return (default: 10)
 * @returns Promise with array of popular books
 * @throws {ApiError} Error with message and status code
 * 
 * @example
 * ```typescript
 * const popular = await getPopularBooks(5);
 * ```
 */
export async function getPopularBooks(
  limit: number = 10
): Promise<PopularBook[]> {
  const params = new URLSearchParams();
  params.append("limit", limit.toString());

  const url = `/api/analytics/popular-books?${params.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errorData = await response.json();
      errorMessage =
        errorData.message || errorData.error || response.statusText;
    } catch {
      errorMessage = response.statusText;
    }
    throw new ApiError(errorMessage, response.status);
  }

  const data = await response.json();
  
  // Handle different response formats
  if (data.books && Array.isArray(data.books)) {
    return data.books;
  }
  
  if (data.popularBooks && Array.isArray(data.popularBooks)) {
    return data.popularBooks;
  }
  
  if (Array.isArray(data)) {
    return data;
  }

  throw new ApiError("Invalid response format from popular books API", 500);
}

/**
 * Get most popular genres
 * 
 * Returns genres ordered by total borrow count.
 * 
 * @param limit - Maximum number of genres to return (default: 10)
 * @returns Promise with array of popular genres
 * @throws {ApiError} Error with message and status code
 * 
 * @example
 * ```typescript
 * const genres = await getPopularGenres(5);
 * ```
 */
export async function getPopularGenres(
  limit: number = 10
): Promise<PopularGenre[]> {
  const params = new URLSearchParams();
  params.append("limit", limit.toString());

  const url = `/api/analytics/popular-genres?${params.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errorData = await response.json();
      errorMessage =
        errorData.message || errorData.error || response.statusText;
    } catch {
      errorMessage = response.statusText;
    }
    throw new ApiError(errorMessage, response.status);
  }

  const data = await response.json();
  
  // Handle different response formats
  if (data.genres && Array.isArray(data.genres)) {
    return data.genres;
  }
  
  if (data.popularGenres && Array.isArray(data.popularGenres)) {
    return data.popularGenres;
  }
  
  if (Array.isArray(data)) {
    return data;
  }

  throw new ApiError("Invalid response format from popular genres API", 500);
}

/**
 * Get user activity patterns
 * 
 * Returns user activity data showing borrowing patterns.
 * 
 * @param limit - Maximum number of users to return (default: 20)
 * @returns Promise with array of user activity data
 * @throws {ApiError} Error with message and status code
 * 
 * @example
 * ```typescript
 * const activity = await getUserActivityPatterns(10);
 * ```
 */
export async function getUserActivityPatterns(
  limit: number = 20
): Promise<UserActivity[]> {
  const params = new URLSearchParams();
  params.append("limit", limit.toString());

  const url = `/api/analytics/user-activity?${params.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errorData = await response.json();
      errorMessage =
        errorData.message || errorData.error || response.statusText;
    } catch {
      errorMessage = response.statusText;
    }
    throw new ApiError(errorMessage, response.status);
  }

  const data = await response.json();
  
  // Handle different response formats
  if (data.activity && Array.isArray(data.activity)) {
    return data.activity;
  }
  
  if (data.userActivity && Array.isArray(data.userActivity)) {
    return data.userActivity;
  }
  
  if (Array.isArray(data)) {
    return data;
  }

  throw new ApiError("Invalid response format from user activity API", 500);
}

/**
 * Get overdue book analysis
 * 
 * Returns detailed information about all overdue books.
 * 
 * @returns Promise with array of overdue book data
 * @throws {ApiError} Error with message and status code
 * 
 * @example
 * ```typescript
 * const overdue = await getOverdueAnalysis();
 * ```
 */
export async function getOverdueAnalysis(): Promise<OverdueBook[]> {
  const response = await fetch("/api/analytics/overdue-analysis", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errorData = await response.json();
      errorMessage =
        errorData.message || errorData.error || response.statusText;
    } catch {
      errorMessage = response.statusText;
    }
    throw new ApiError(errorMessage, response.status);
  }

  const data = await response.json();
  
  // Handle different response formats
  if (data.overdueBooks && Array.isArray(data.overdueBooks)) {
    return data.overdueBooks;
  }
  
  if (data.overdue && Array.isArray(data.overdue)) {
    return data.overdue;
  }
  
  if (Array.isArray(data)) {
    return data;
  }

  throw new ApiError("Invalid response format from overdue analysis API", 500);
}

/**
 * Get overdue statistics
 * 
 * Returns aggregated statistics about overdue books.
 * 
 * @returns Promise with overdue statistics
 * @throws {ApiError} Error with message and status code
 * 
 * @example
 * ```typescript
 * const stats = await getOverdueStats();
 * console.log(`Total overdue: ${stats.totalOverdue}`);
 * ```
 */
export async function getOverdueStats(): Promise<OverdueStats> {
  const response = await fetch("/api/analytics/overdue-stats", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errorData = await response.json();
      errorMessage =
        errorData.message || errorData.error || response.statusText;
    } catch {
      errorMessage = response.statusText;
    }
    throw new ApiError(errorMessage, response.status);
  }

  const data = await response.json();
  
  // Handle different response formats
  if (data.stats) {
    return data.stats;
  }
  
  if (data.overdueStats) {
    return data.overdueStats;
  }
  
  if (data.totalOverdue !== undefined) {
    // If response is the stats object directly
    return data;
  }

  throw new ApiError("Invalid response format from overdue stats API", 500);
}

/**
 * Get monthly borrowing statistics
 * 
 * Returns borrowing statistics for current and last month.
 * 
 * @returns Promise with monthly statistics
 * @throws {ApiError} Error with message and status code
 * 
 * @example
 * ```typescript
 * const monthly = await getMonthlyStats();
 * console.log(`This month: ${monthly.currentMonth.borrows}`);
 * ```
 */
export async function getMonthlyStats(): Promise<MonthlyStats> {
  const response = await fetch("/api/analytics/monthly-stats", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errorData = await response.json();
      errorMessage =
        errorData.message || errorData.error || response.statusText;
    } catch {
      errorMessage = response.statusText;
    }
    throw new ApiError(errorMessage, response.status);
  }

  const data = await response.json();
  
  // Handle different response formats
  if (data.stats) {
    return data.stats;
  }
  
  if (data.monthlyStats) {
    return data.monthlyStats;
  }
  
  if (data.currentMonth !== undefined) {
    // If response is the stats object directly
    return data;
  }

  throw new ApiError("Invalid response format from monthly stats API", 500);
}

/**
 * Get system health metrics
 * 
 * Returns overall system health and activity metrics.
 * 
 * @returns Promise with system health data
 * @throws {ApiError} Error with message and status code
 * 
 * @example
 * ```typescript
 * const health = await getSystemHealth();
 * console.log(`Total books: ${health.totalBooks}`);
 * ```
 */
export async function getSystemHealth(): Promise<SystemHealth> {
  const response = await fetch("/api/analytics/system-health", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errorData = await response.json();
      errorMessage =
        errorData.message || errorData.error || response.statusText;
    } catch {
      errorMessage = response.statusText;
    }
    throw new ApiError(errorMessage, response.status);
  }

  const data = await response.json();
  
  // Handle different response formats
  if (data.health) {
    return data.health;
  }
  
  if (data.systemHealth) {
    return data.systemHealth;
  }
  
  if (data.totalBooks !== undefined) {
    // If response is the health object directly
    return data;
  }

  throw new ApiError("Invalid response format from system health API", 500);
}

/**
 * Get complete analytics data
 * 
 * Fetches all analytics data in parallel for the business insights page.
 * 
 * @param options - Optional configuration (limits, etc.)
 * @returns Promise with complete analytics data
 * @throws {ApiError} Error with message and status code
 * 
 * @example
 * ```typescript
 * const analytics = await getCompleteAnalytics();
 * ```
 */
export async function getCompleteAnalytics(options?: {
  popularBooksLimit?: number;
  popularGenresLimit?: number;
  userActivityLimit?: number;
  borrowingTrendsDays?: number;
}): Promise<AnalyticsData> {
  const [
    borrowingTrends,
    popularBooks,
    popularGenres,
    userActivity,
    overdueBooks,
    overdueStats,
    monthlyStats,
    systemHealth,
  ] = await Promise.all([
    getBorrowingTrends(options?.borrowingTrendsDays || 30),
    getPopularBooks(options?.popularBooksLimit || 10),
    getPopularGenres(options?.popularGenresLimit || 10),
    getUserActivityPatterns(options?.userActivityLimit || 20),
    getOverdueAnalysis(),
    getOverdueStats(),
    getMonthlyStats(),
    getSystemHealth(),
  ]);

  return {
    borrowingTrends,
    popularBooks,
    popularGenres,
    userActivity,
    overdueBooks,
    overdueStats,
    monthlyStats,
    systemHealth,
  };
}

