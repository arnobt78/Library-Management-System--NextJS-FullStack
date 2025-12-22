/**
 * Admin Service - Pure API Functions
 *
 * This module contains pure API functions for admin-related operations.
 * These functions make fetch calls to API routes and return data.
 * NO React Query logic here - just fetch calls.
 *
 * These functions are reusable across:
 * - Client Components (via React Query hooks)
 * - Server Components (direct API calls)
 * - Server Actions (if needed)
 *
 * Note: Some API routes for admin operations already exist and are being used.
 * These service functions wrap those existing routes.
 */

import { ApiError } from "./apiError";

/**
 * Admin statistics interface
 */
export interface AdminStats {
  totalUsers: number;
  approvedUsers: number;
  pendingUsers: number;
  adminUsers: number;
  totalBooks: number;
  totalCopies: number;
  availableCopies: number;
  borrowedCopies: number;
  activeBorrows: number;
  pendingBorrows: number;
  returnedBooks: number;
  [key: string]: unknown; // Allow additional stats
}

/**
 * Fine configuration response
 */
export interface FineConfig {
  success: boolean;
  fineAmount: number;
  message?: string;
}

/**
 * Reminder result
 */
export interface ReminderResult {
  userId: string;
  userEmail: string;
  bookTitle: string;
  message: string;
  sent: boolean;
  error?: string;
}

/**
 * Reminder response
 */
export interface ReminderResponse {
  success: boolean;
  message: string;
  results: ReminderResult[];
}

/**
 * Overdue fine update result
 */
export interface OverdueFineUpdateResult {
  recordId: string;
  daysOverdue: number;
  fineAmount: string;
  updated: boolean;
  previousFineAmount?: string;
  verifiedFineAmount?: string;
}

/**
 * Overdue fines update response
 */
export interface OverdueFinesResponse {
  success: boolean;
  message: string;
  results: OverdueFineUpdateResult[];
}

/**
 * Reminder statistics interface
 */
export interface ReminderStats {
  dueSoon: number;
  overdue: number;
  remindersSentToday: number;
}

/**
 * Export statistics interface
 */
export interface ExportStats {
  totalBooks: number;
  totalUsers: number;
  totalBorrows: number;
  lastExportDate?: string;
}

/**
 * Get admin dashboard statistics
 *
 * Fetches comprehensive statistics for the admin dashboard including:
 * - User statistics (total, approved, pending, admins)
 * - Book statistics (total, copies, availability)
 * - Borrow statistics (active, pending, returned)
 *
 * @returns Promise with admin statistics
 * @throws {ApiError} Error with message and status code
 *
 * @example
 * ```typescript
 * const stats = await getAdminStats();
 * console.log(`Total users: ${stats.totalUsers}`);
 * ```
 */
export async function getAdminStats(): Promise<AdminStats> {
  const response = await fetch("/api/admin/stats", {
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

  if (data.totalUsers !== undefined) {
    // If response is the stats object directly
    return data;
  }

  throw new ApiError("Invalid response format from admin stats API", 500);
}

/**
 * Get current fine configuration
 *
 * Retrieves the current daily fine amount for overdue books.
 *
 * @returns Promise with fine configuration
 * @throws {ApiError} Error with message and status code
 *
 * @example
 * ```typescript
 * const config = await getFineConfig();
 * console.log(`Daily fine: $${config.fineAmount}`);
 * ```
 */
export async function getFineConfig(): Promise<FineConfig> {
  const response = await fetch("/api/admin/fine-config", {
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

  // Handle API response format
  if (data.success !== undefined && data.fineAmount !== undefined) {
    return {
      success: data.success,
      fineAmount: data.fineAmount,
      message: data.message,
    };
  }

  throw new ApiError("Invalid response format from fine config API", 500);
}

/**
 * Update fine configuration
 *
 * Updates the daily fine amount for overdue books.
 *
 * @param fineAmount - New daily fine amount (must be >= 0)
 * @param updatedBy - Email of admin making the change (optional)
 * @returns Promise with updated fine configuration
 * @throws {ApiError} Error with message and status code
 *
 * @example
 * ```typescript
 * const config = await updateFineConfig(1.50, "admin@example.com");
 * ```
 */
export async function updateFineConfig(
  fineAmount: number,
  updatedBy?: string
): Promise<FineConfig> {
  if (typeof fineAmount !== "number" || fineAmount < 0) {
    throw new ApiError("Fine amount must be a positive number", 400);
  }

  const response = await fetch("/api/admin/fine-config", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fineAmount,
      updatedBy,
    }),
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

  // Handle API response format
  if (data.success !== undefined && data.fineAmount !== undefined) {
    return {
      success: data.success,
      fineAmount: data.fineAmount,
      message: data.message,
    };
  }

  throw new ApiError(
    "Invalid response format from update fine config API",
    500
  );
}

/**
 * Send due soon reminders
 *
 * Sends email reminders to users whose books are due soon.
 *
 * @returns Promise with reminder results
 * @throws {ApiError} Error with message and status code
 *
 * @example
 * ```typescript
 * const result = await sendDueReminders();
 * console.log(`Sent ${result.results.length} reminders`);
 * ```
 */
export async function sendDueReminders(): Promise<ReminderResponse> {
  const response = await fetch("/api/admin/send-due-reminders", {
    method: "POST",
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

  // Handle API response format
  if (data.success !== undefined) {
    return {
      success: data.success,
      message: data.message || "Reminders sent",
      results: data.results || [],
    };
  }

  throw new ApiError(
    "Invalid response format from send due reminders API",
    500
  );
}

/**
 * Send overdue reminders
 *
 * Sends email reminders to users whose books are overdue.
 *
 * @returns Promise with reminder results
 * @throws {ApiError} Error with message and status code
 *
 * @example
 * ```typescript
 * const result = await sendOverdueReminders();
 * console.log(`Sent ${result.results.length} overdue reminders`);
 * ```
 */
export async function sendOverdueReminders(): Promise<ReminderResponse> {
  const response = await fetch("/api/admin/send-overdue-reminders", {
    method: "POST",
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

  // Handle API response format
  if (data.success !== undefined) {
    return {
      success: data.success,
      message: data.message || "Overdue reminders sent",
      results: data.results || [],
    };
  }

  throw new ApiError(
    "Invalid response format from send overdue reminders API",
    500
  );
}

/**
 * Update overdue fines
 *
 * Calculates and updates fines for all overdue books.
 * Only updates books that don't already have fines calculated.
 *
 * @param customFineAmount - Optional custom daily fine amount (for testing/admin override)
 * @returns Promise with update results
 * @throws {ApiError} Error with message and status code
 *
 * @example
 * ```typescript
 * const result = await updateOverdueFines();
 * console.log(`Updated ${result.results.length} overdue fines`);
 * ```
 */
export async function updateOverdueFines(
  customFineAmount?: number
): Promise<OverdueFinesResponse> {
  const body: { fineAmount?: number } = {};
  if (customFineAmount !== undefined) {
    body.fineAmount = customFineAmount;
  }

  const response = await fetch("/api/admin/update-overdue-fines", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
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

  // Handle API response format
  if (data.success !== undefined) {
    return {
      success: data.success,
      message: data.message || "Overdue fines updated",
      results: data.results || [],
    };
  }

  throw new ApiError(
    "Invalid response format from update overdue fines API",
    500
  );
}

/**
 * Export data (books, users, borrows, analytics)
 *
 * Exports data in the specified format (CSV or JSON).
 *
 * @param type - Type of data to export (books, users, borrows, analytics, borrows-range)
 * @param format - Export format (csv or json, default: csv)
 * @param dateFrom - Optional start date for date range exports (YYYY-MM-DD)
 * @param dateTo - Optional end date for date range exports (YYYY-MM-DD)
 * @returns Promise with exported data as Blob
 * @throws {ApiError} Error with message and status code
 *
 * @example
 * ```typescript
 * const blob = await exportData("books", "csv");
 * // Download the blob
 * ```
 */
export async function exportData(
  type: "books" | "users" | "borrows" | "analytics" | "borrows-range",
  format: "csv" | "json" = "csv",
  dateFrom?: string,
  dateTo?: string
): Promise<Blob> {
  const formData = new FormData();
  formData.append("format", format);

  if (type === "borrows-range" && dateFrom && dateTo) {
    formData.append("dateFrom", dateFrom);
    formData.append("dateTo", dateTo);
  }

  const response = await fetch(`/api/admin/export/${type}`, {
    method: "POST",
    body: formData,
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

  // Return the blob (file data)
  return await response.blob();
}

/**
 * Get reminder statistics
 *
 * Fetches statistics about books due soon, overdue books, and reminders sent today.
 *
 * @returns Promise with reminder statistics
 * @throws {ApiError} Error with message and status code
 *
 * @example
 * ```typescript
 * const stats = await getReminderStats();
 * console.log(`Due soon: ${stats.dueSoon}`);
 * ```
 */
export async function getReminderStats(): Promise<ReminderStats> {
  const response = await fetch("/api/admin/reminder-stats", {
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

  if (data.dueSoon !== undefined) {
    // If response is the stats object directly
    return {
      dueSoon: data.dueSoon || 0,
      overdue: data.overdue || 0,
      remindersSentToday: data.remindersSentToday || 0,
    };
  }

  throw new ApiError("Invalid response format from reminder stats API", 500);
}

/**
 * Get export statistics
 *
 * Fetches statistics about total books, users, and borrows available for export.
 *
 * @returns Promise with export statistics
 * @throws {ApiError} Error with message and status code
 *
 * @example
 * ```typescript
 * const stats = await getExportStats();
 * console.log(`Total books: ${stats.totalBooks}`);
 * ```
 */
export async function getExportStats(): Promise<ExportStats> {
  const response = await fetch("/api/admin/export-stats", {
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

  if (data.totalBooks !== undefined) {
    // If response is the stats object directly
    return {
      totalBooks: data.totalBooks || 0,
      totalUsers: data.totalUsers || 0,
      totalBorrows: data.totalBorrows || 0,
      lastExportDate: data.lastExportDate,
    };
  }

  throw new ApiError("Invalid response format from export stats API", 500);
}

/**
 * Generate recommendations response
 */
export interface GenerateRecommendationsResponse {
  success: boolean;
  results: Array<{ userId: string; recommendations: unknown[] }>;
  totalUsers: number;
  totalRecommendations: number;
  message: string;
}

/**
 * Update trending books response
 */
export interface UpdateTrendingBooksResponse {
  success: boolean;
  message: string;
  trendingCount: number;
}

/**
 * Refresh recommendation cache response
 */
export interface RefreshRecommendationCacheResponse {
  success: boolean;
  message: string;
  cacheCleared: boolean;
}

/**
 * Generate all user recommendations
 *
 * Generates personalized book recommendations for all approved users.
 *
 * @returns Promise with recommendation results
 * @throws {ApiError} Error with message and status code
 *
 * @example
 * ```typescript
 * const result = await generateAllUserRecommendations();
 * console.log(`Generated ${result.totalRecommendations} recommendations for ${result.totalUsers} users`);
 * ```
 */
export async function generateAllUserRecommendations(): Promise<GenerateRecommendationsResponse> {
  const response = await fetch("/api/admin/generate-recommendations", {
    method: "POST",
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

  if (data.success !== undefined) {
    return {
      success: data.success,
      results: data.results || [],
      totalUsers: data.totalUsers || 0,
      totalRecommendations: data.totalRecommendations || 0,
      message: data.message || "Recommendations generated",
    };
  }

  throw new ApiError(
    "Invalid response format from generate recommendations API",
    500
  );
}

/**
 * Update trending books
 *
 * Updates trending books data based on recent borrowing activity.
 *
 * @returns Promise with update results
 * @throws {ApiError} Error with message and status code
 *
 * @example
 * ```typescript
 * const result = await updateTrendingBooks();
 * console.log(`Updated ${result.trendingCount} trending books`);
 * ```
 */
export async function updateTrendingBooks(): Promise<UpdateTrendingBooksResponse> {
  const response = await fetch("/api/admin/update-trending-books", {
    method: "POST",
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

  if (data.success !== undefined) {
    return {
      success: data.success,
      message: data.message || "Trending books updated",
      trendingCount: data.trendingCount || 0,
    };
  }

  throw new ApiError(
    "Invalid response format from update trending books API",
    500
  );
}

/**
 * Refresh recommendation cache
 *
 * Refreshes the recommendation cache by clearing and regenerating cached recommendations.
 *
 * @returns Promise with refresh results
 * @throws {ApiError} Error with message and status code
 *
 * @example
 * ```typescript
 * const result = await refreshRecommendationCache();
 * console.log(`Cache refreshed: ${result.cacheCleared}`);
 * ```
 */
export async function refreshRecommendationCache(): Promise<RefreshRecommendationCacheResponse> {
  const response = await fetch("/api/admin/refresh-recommendation-cache", {
    method: "POST",
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

  if (data.success !== undefined) {
    return {
      success: data.success,
      message: data.message || "Recommendation cache refreshed",
      cacheCleared: data.cacheCleared || false,
    };
  }

  throw new ApiError(
    "Invalid response format from refresh recommendation cache API",
    500
  );
}
