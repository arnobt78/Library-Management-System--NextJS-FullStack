/**
 * Users Service - Pure API Functions
 *
 * This module contains pure API functions for user-related operations.
 * These functions make fetch calls to API routes and return data.
 * NO React Query logic here - just fetch calls.
 *
 * These functions are reusable across:
 * - Client Components (via React Query hooks)
 * - Server Components (direct API calls)
 * - Server Actions (if needed)
 *
 * Note: API routes for users need to be created if they don't exist yet.
 * These service functions are ready to use once API routes are available.
 */

import { ApiError } from "./apiError";

/**
 * User status type
 */
export type UserStatus = "PENDING" | "APPROVED" | "REJECTED";

/**
 * User role type
 */
export type UserRole = "USER" | "ADMIN";

/**
 * User interface matching the database schema
 */
export interface User {
  id: string;
  fullName: string;
  email: string;
  universityId: number;
  universityCard: string;
  status: UserStatus | null;
  role: UserRole | null;
  lastActivityDate: string | null;
  lastLogin: Date | null;
  createdAt: Date | null;
  // Note: password is excluded from API responses for security
}

/**
 * Filters for user list queries
 */
export interface UserFilters {
  search?: string;
  status?: UserStatus | "all";
  role?: UserRole | "all";
  sort?: "name" | "email" | "created" | "status";
  page?: number;
  limit?: number;
}

/**
 * Response type for user list queries
 */
export interface UsersListResponse {
  users: User[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

/**
 * Response type for single user queries
 */
export interface UserResponse {
  user: User;
}

/**
 * Get all users with optional search and filters
 *
 * Supports:
 * - Search by name/email/university ID
 * - Filter by status (PENDING/APPROVED/REJECTED)
 * - Filter by role (USER/ADMIN)
 * - Sort by name, email, created date, or status
 * - Pagination
 *
 * @param filters - Optional filters object
 * @returns Promise with users list, total count, and pagination info
 * @throws {ApiError} Error with message and status code
 *
 * @example
 * ```typescript
 * const users = await getUsersList({ status: "APPROVED", role: "USER" });
 * ```
 */
export async function getUsersList(
  filters: UserFilters = {}
): Promise<UsersListResponse> {
  // Build query parameters
  const params = new URLSearchParams();

  if (filters.search) params.append("search", filters.search);
  if (filters.status && filters.status !== "all") {
    params.append("status", filters.status);
  }
  if (filters.role && filters.role !== "all") {
    params.append("role", filters.role);
  }
  if (filters.sort) params.append("sort", filters.sort);
  if (filters.page) params.append("page", filters.page.toString());
  if (filters.limit) params.append("limit", filters.limit.toString());

  const queryString = params.toString();
  const url = queryString ? `/api/users?${queryString}` : "/api/users";

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
  if (data.users && Array.isArray(data.users)) {
    return {
      users: data.users,
      total: data.total || data.users.length,
      page: data.page || 1,
      totalPages: data.totalPages || 1,
      limit: data.limit || data.users.length,
    };
  }

  // If response has data array (from server actions)
  if (data.data && Array.isArray(data.data)) {
    return {
      users: data.data,
      total: data.data.length,
      page: 1,
      totalPages: 1,
      limit: data.data.length,
    };
  }

  // If response is just an array, wrap it
  if (Array.isArray(data)) {
    return {
      users: data,
      total: data.length,
      page: 1,
      totalPages: 1,
      limit: data.length,
    };
  }

  throw new ApiError("Invalid response format from users API", 500);
}

/**
 * Get a single user by ID
 *
 * @param userId - User ID (UUID)
 * @returns Promise with user data
 * @throws {ApiError} Error with message and status code (404 if not found)
 *
 * @example
 * ```typescript
 * const user = await getUser("123e4567-e89b-12d3-a456-426614174000");
 * ```
 */
export async function getUser(userId: string): Promise<User> {
  if (!userId) {
    throw new ApiError("User ID is required", 400);
  }

  const response = await fetch(`/api/users/${userId}`, {
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
  if (data.user) {
    return data.user;
  }

  if (data.id) {
    // If response is the user object directly
    return data;
  }

  throw new ApiError("Invalid response format from user API", 500);
}

/**
 * Get current authenticated user profile
 *
 * Fetches the profile of the currently authenticated user from the session.
 *
 * @returns Promise with current user data
 * @throws {ApiError} Error with message and status code (401 if not authenticated)
 *
 * @example
 * ```typescript
 * const currentUser = await getCurrentUser();
 * ```
 */
export async function getCurrentUser(): Promise<User> {
  const response = await fetch("/api/users/me", {
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
  if (data.user) {
    return data.user;
  }

  if (data.id) {
    // If response is the user object directly
    return data;
  }

  throw new ApiError("Invalid response format from current user API", 500);
}

/**
 * Get users by status
 *
 * Convenience function to get users filtered by approval status.
 *
 * @param status - User status (PENDING/APPROVED/REJECTED)
 * @param limit - Maximum number of users (optional)
 * @returns Promise with array of users
 * @throws {ApiError} Error with message and status code
 *
 * @example
 * ```typescript
 * const pendingUsers = await getUsersByStatus("PENDING");
 * ```
 */
export async function getUsersByStatus(
  status: UserStatus,
  limit?: number
): Promise<User[]> {
  const filters: UserFilters = { status };
  if (limit) filters.limit = limit;

  const response = await getUsersList(filters);
  return response.users;
}

/**
 * Get users by role
 *
 * Convenience function to get users filtered by role.
 *
 * @param role - User role (USER/ADMIN)
 * @param limit - Maximum number of users (optional)
 * @returns Promise with array of users
 * @throws {ApiError} Error with message and status code
 *
 * @example
 * ```typescript
 * const admins = await getUsersByRole("ADMIN");
 * ```
 */
export async function getUsersByRole(
  role: UserRole,
  limit?: number
): Promise<User[]> {
  const filters: UserFilters = { role };
  if (limit) filters.limit = limit;

  const response = await getUsersList(filters);
  return response.users;
}

/**
 * Get pending user account requests
 *
 * Convenience function to get all users with PENDING status.
 * Useful for admin approval workflows.
 *
 * @returns Promise with array of pending users
 * @throws {ApiError} Error with message and status code
 *
 * @example
 * ```typescript
 * const pendingRequests = await getPendingUsers();
 * ```
 */
export async function getPendingUsers(search?: string): Promise<User[]> {
  const filters: UserFilters = { status: "PENDING" };
  if (search) filters.search = search;

  const response = await getUsersList(filters);
  return response.users;
}

/**
 * Admin request interface
 */
/**
 * Admin request interface matching the database schema
 * Note: Database fields can be null, but we convert them to undefined for consistency
 */
export interface AdminRequest {
  id: string;
  userId: string;
  userEmail: string;
  userFullName: string;
  requestReason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewedBy: string | null | undefined;
  reviewedAt: Date | null | undefined;
  rejectionReason: string | null | undefined;
  createdAt: Date | null;
  updatedAt: Date | null;
}

/**
 * Get pending admin requests
 *
 * Fetches all pending admin requests for admin review.
 *
 * @returns Promise with array of pending admin requests
 * @throws {ApiError} Error with message and status code
 *
 * @example
 * ```typescript
 * const requests = await getPendingAdminRequests();
 * ```
 */
export async function getPendingAdminRequests(): Promise<AdminRequest[]> {
  const response = await fetch("/api/admin/admin-requests", {
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

  throw new ApiError("Invalid response format from admin-requests API", 500);
}
