/**
 * Borrows Service - Pure API Functions
 *
 * This module contains pure API functions for borrow record operations.
 * These functions make fetch calls to API routes and return data.
 * NO React Query logic here - just fetch calls.
 *
 * These functions are reusable across:
 * - Client Components (via React Query hooks)
 * - Server Components (direct API calls)
 * - Server Actions (if needed)
 *
 * Note: API routes for borrows need to be created if they don't exist yet.
 * These service functions are ready to use once API routes are available.
 */

import { ApiError } from "./apiError";

/**
 * Borrow record status type
 */
export type BorrowStatus = "PENDING" | "BORROWED" | "RETURNED";

/**
 * Borrow record interface matching the database schema
 */
export interface BorrowRecord {
  id: string;
  userId: string;
  bookId: string;
  borrowDate: Date | null;
  dueDate: string | null; // Can be null for pending requests
  returnDate: string | null;
  status: BorrowStatus;
  // Enhanced tracking fields
  borrowedBy: string | null;
  returnedBy: string | null;
  fineAmount: string | null; // Stored as decimal string in DB
  notes: string | null;
  renewalCount: number;
  lastReminderSent: Date | null;
  updatedAt: Date | null;
  updatedBy: string | null;
  createdAt: Date | null;
}

/**
 * Borrow record with user and book details (for admin views)
 */
export interface BorrowRecordWithDetails extends BorrowRecord {
  // User details
  userName: string;
  userEmail: string;
  userUniversityId: number;
  // Book details
  bookTitle: string;
  bookAuthor: string;
  bookGenre: string;
  bookCoverUrl: string | null;
  bookCoverColor: string | null;
}

/**
 * Filters for borrow record list queries
 */
export interface BorrowFilters {
  userId?: string;
  bookId?: string;
  status?: BorrowStatus | "all";
  dateFrom?: string; // YYYY-MM-DD format
  dateTo?: string; // YYYY-MM-DD format
  overdue?: boolean; // Only overdue records
  sort?: "date" | "dueDate" | "status" | "user";
  page?: number;
  limit?: number;
}

/**
 * Response type for borrow record list queries
 */
export interface BorrowsListResponse {
  borrows: BorrowRecord[] | BorrowRecordWithDetails[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

/**
 * Response type for single borrow record queries
 */
export interface BorrowResponse {
  borrow: BorrowRecord | BorrowRecordWithDetails;
}

/**
 * Get all borrow records with optional filters
 *
 * Supports:
 * - Filter by user ID
 * - Filter by book ID
 * - Filter by status (PENDING/BORROWED/RETURNED)
 * - Filter by date range
 * - Filter by overdue status
 * - Sort by date, due date, status, or user
 * - Pagination
 *
 * @param filters - Optional filters object
 * @returns Promise with borrow records list, total count, and pagination info
 * @throws {ApiError} Error with message and status code
 *
 * @example
 * ```typescript
 * const borrows = await getBorrowsList({ status: "BORROWED", overdue: true });
 * ```
 */
export async function getBorrowsList(
  filters: BorrowFilters = {}
): Promise<BorrowsListResponse> {
  // Build query parameters
  const params = new URLSearchParams();

  if (filters.userId) params.append("userId", filters.userId);
  if (filters.bookId) params.append("bookId", filters.bookId);
  if (filters.status && filters.status !== "all") {
    params.append("status", filters.status);
  }
  if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.append("dateTo", filters.dateTo);
  if (filters.overdue !== undefined) {
    params.append("overdue", filters.overdue.toString());
  }
  if (filters.sort) params.append("sort", filters.sort);
  if (filters.page) params.append("page", filters.page.toString());
  if (filters.limit) params.append("limit", filters.limit.toString());

  const queryString = params.toString();
  const url = queryString
    ? `/api/borrow-records?${queryString}`
    : "/api/borrow-records";

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
      // If response is not JSON, use statusText
      errorMessage = response.statusText;
    }
    throw new ApiError(errorMessage, response.status);
  }

  const data = await response.json();

  // Handle different response formats
  if (data.borrows && Array.isArray(data.borrows)) {
    return {
      borrows: data.borrows,
      total: data.total || data.borrows.length,
      page: data.page || 1,
      totalPages: data.totalPages || 1,
      limit: data.limit || data.borrows.length,
    };
  }

  // If response has data array (from server actions)
  if (data.data && Array.isArray(data.data)) {
    return {
      borrows: data.data,
      total: data.data.length,
      page: 1,
      totalPages: 1,
      limit: data.data.length,
    };
  }

  // If response is just an array, wrap it
  if (Array.isArray(data)) {
    return {
      borrows: data,
      total: data.length,
      page: 1,
      totalPages: 1,
      limit: data.length,
    };
  }

  throw new ApiError("Invalid response format from borrow-records API", 500);
}

/**
 * Get borrow records for a specific user
 *
 * Convenience function to get all borrow records for a user.
 *
 * @param userId - User ID (UUID)
 * @param status - Optional status filter
 * @returns Promise with array of user's borrow records
 * @throws {ApiError} Error with message and status code
 *
 * @example
 * ```typescript
 * const userBorrows = await getUserBorrows(userId, "BORROWED");
 * ```
 */
export async function getUserBorrows(
  userId: string,
  status?: BorrowStatus
): Promise<BorrowRecord[]> {
  if (!userId) {
    throw new ApiError("User ID is required", 400);
  }

  // CRITICAL: Fetch ALL records (no pagination limit)
  // This ensures we get all user's borrow records, not just the first 50
  const filters: BorrowFilters = { userId, limit: 10000 };
  if (status) filters.status = status;

  const response = await getBorrowsList(filters);
  return response.borrows as BorrowRecord[];
}

/**
 * Get all borrow requests (admin view with user and book details)
 *
 * Fetches all borrow records with joined user and book information.
 * Used by admin pages to display borrow requests with full context.
 *
 * @param status - Optional status filter (default: all)
 * @returns Promise with array of borrow records with details
 * @throws {ApiError} Error with message and status code
 *
 * @example
 * ```typescript
 * const requests = await getBorrowRequests("PENDING");
 * ```
 */
export async function getBorrowRequests(
  status?: BorrowStatus,
  search?: string
): Promise<BorrowRecordWithDetails[]> {
  // Build URL with query params
  const params = new URLSearchParams();
  if (status) params.append("status", status);
  if (search) params.append("search", search);

  const queryString = params.toString();
  const url = queryString
    ? `/api/admin/borrow-requests?${queryString}`
    : "/api/admin/borrow-requests";

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
  if (data.requests && Array.isArray(data.requests)) {
    return data.requests;
  }

  if (data.data && Array.isArray(data.data)) {
    return data.data;
  }

  if (Array.isArray(data)) {
    return data;
  }

  throw new ApiError("Invalid response format from borrow-requests API", 500);
}

/**
 * Get a single borrow record by ID
 *
 * @param borrowId - Borrow record ID (UUID)
 * @param includeDetails - Whether to include user and book details (default: false)
 * @returns Promise with borrow record data
 * @throws {ApiError} Error with message and status code (404 if not found)
 *
 * @example
 * ```typescript
 * const borrow = await getBorrow("123e4567-e89b-12d3-a456-426614174000", true);
 * ```
 */
export async function getBorrow(
  borrowId: string,
  includeDetails: boolean = false
): Promise<BorrowRecord | BorrowRecordWithDetails> {
  if (!borrowId) {
    throw new ApiError("Borrow record ID is required", 400);
  }

  const params = new URLSearchParams();
  if (includeDetails) params.append("includeDetails", "true");

  const queryString = params.toString();
  const url = queryString
    ? `/api/borrow-records/${borrowId}?${queryString}`
    : `/api/borrow-records/${borrowId}`;

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
  if (data.borrow) {
    return data.borrow;
  }

  if (data.id) {
    // If response is the borrow record object directly
    return data;
  }

  throw new ApiError("Invalid response format from borrow-record API", 500);
}

/**
 * Get overdue borrow records
 *
 * Convenience function to get all borrow records that are overdue.
 *
 * @param userId - Optional user ID to filter by specific user
 * @returns Promise with array of overdue borrow records
 * @throws {ApiError} Error with message and status code
 *
 * @example
 * ```typescript
 * const overdue = await getOverdueBorrows();
 * ```
 */
export async function getOverdueBorrows(
  userId?: string
): Promise<BorrowRecord[]> {
  const filters: BorrowFilters = {
    status: "BORROWED",
    overdue: true,
  };

  if (userId) filters.userId = userId;

  const response = await getBorrowsList(filters);
  return response.borrows as BorrowRecord[];
}

/**
 * Get borrow records by status
 *
 * Convenience function to get borrow records filtered by status.
 *
 * @param status - Borrow status (PENDING/BORROWED/RETURNED)
 * @param limit - Maximum number of records (optional)
 * @returns Promise with array of borrow records
 * @throws {ApiError} Error with message and status code
 *
 * @example
 * ```typescript
 * const pending = await getBorrowsByStatus("PENDING");
 * ```
 */
export async function getBorrowsByStatus(
  status: BorrowStatus,
  limit?: number
): Promise<BorrowRecord[]> {
  const filters: BorrowFilters = { status };
  if (limit) filters.limit = limit;

  const response = await getBorrowsList(filters);
  return response.borrows as BorrowRecord[];
}

/**
 * Get borrow records within a date range
 *
 * Useful for generating reports and analytics.
 *
 * @param dateFrom - Start date (YYYY-MM-DD format)
 * @param dateTo - End date (YYYY-MM-DD format)
 * @param status - Optional status filter
 * @returns Promise with array of borrow records
 * @throws {ApiError} Error with message and status code
 *
 * @example
 * ```typescript
 * const januaryBorrows = await getBorrowsByDateRange("2024-01-01", "2024-01-31");
 * ```
 */
export async function getBorrowsByDateRange(
  dateFrom: string,
  dateTo: string,
  status?: BorrowStatus
): Promise<BorrowRecord[]> {
  const filters: BorrowFilters = { dateFrom, dateTo };
  if (status) filters.status = status;

  const response = await getBorrowsList(filters);
  return response.borrows as BorrowRecord[];
}
