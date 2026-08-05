/**
 * Reviews Service - Pure API Functions
 *
 * This module contains pure API functions for book review operations.
 * These functions make fetch calls to API routes and return data.
 * NO React Query logic here - just fetch calls.
 *
 * These functions are reusable across:
 * - Client Components (via React Query hooks)
 * - Server Components (direct API calls)
 * - Server Actions (if needed)
 *
 * Note: API routes for reviews already exist and are being used.
 * These service functions wrap those existing routes.
 */

import { ApiError } from "./apiError";

/**
 * Review interface matching the API response
 */
export interface Review {
  id: string;
  rating: number; // 1-5 stars
  comment: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  userFullName: string;
  /**
   * Not returned by the public book-reviews endpoint (would leak other
   * users' emails to anonymous visitors) — only present on admin-scoped
   * review payloads (`AdminBookReviewItem`).
   */
  userEmail?: string;
  /** Student ID / seed / ImageKit path for UserAvatar */
  universityCard?: string | null;
  /** Opaque, non-PII — used for ownership checks + avatar seed on public payloads. */
  userId: string;
  bookId?: string;
  /** PENDING = awaiting moderation (only ever included for the review's own author) */
  status?: ReviewStatusValue;
}

/**
 * Review eligibility response
 */
export interface ReviewEligibility {
  success: boolean;
  canReview: boolean;
  hasExistingReview: boolean;
  isCurrentlyBorrowed: boolean;
  reason: string;
}

/**
 * Create review input
 */
export interface CreateReviewInput {
  rating: number; // 1-5
  comment: string;
}

/**
 * Update review input
 */
export interface UpdateReviewInput {
  rating: number; // 1-5
  comment: string;
}

/**
 * Get all reviews for a specific book
 *
 * Returns reviews ordered by creation date (newest first).
 * Includes user information (name, email) for display.
 *
 * @param bookId - Book ID (UUID)
 * @returns Promise with array of reviews
 * @throws {ApiError} Error with message and status code
 *
 * @example
 * ```typescript
 * const reviews = await getBookReviews("123e4567-e89b-12d3-a456-426614174000");
 * ```
 */
export async function getBookReviews(bookId: string): Promise<Review[]> {
  if (!bookId) {
    throw new ApiError("Book ID is required", 400);
  }

  const response = await fetch(`/api/reviews/${bookId}`, {
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
  if (data.success && data.reviews && Array.isArray(data.reviews)) {
    return data.reviews;
  }

  // Fallback: if response is just an array
  if (Array.isArray(data)) {
    return data;
  }

  throw new ApiError("Invalid response format from reviews API", 500);
}

/**
 * Check if the current user is eligible to review a book
 *
 * Eligibility Rules:
 * 1. User must be logged in
 * 2. User must have previously borrowed AND returned the book
 * 3. User must NOT have an existing review for the book
 *
 * @param bookId - Book ID (UUID)
 * @returns Promise with eligibility status and reason
 * @throws {ApiError} Error with message and status code
 *
 * @example
 * ```typescript
 * const eligibility = await getReviewEligibility(bookId);
 * if (eligibility.canReview) {
 *   // Show review form
 * }
 * ```
 */
export async function getReviewEligibility(
  bookId: string
): Promise<ReviewEligibility> {
  if (!bookId) {
    throw new ApiError("Book ID is required", 400);
  }

  const response = await fetch(`/api/reviews/eligibility/${bookId}`, {
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
  if (data.success !== undefined) {
    return {
      success: data.success,
      canReview: data.canReview || false,
      hasExistingReview: data.hasExistingReview || false,
      isCurrentlyBorrowed: data.isCurrentlyBorrowed || false,
      reason: data.reason || "Unknown reason",
    };
  }

  throw new ApiError(
    "Invalid response format from review eligibility API",
    500
  );
}

/**
 * Create a new review for a book
 *
 * Business Rules:
 * - User must be authenticated
 * - User must have borrowed and returned the book
 * - User cannot have an existing review for the book
 * - Rating must be between 1 and 5
 * - Comment is required
 *
 * @param bookId - Book ID (UUID)
 * @param reviewData - Review data (rating and comment)
 * @returns Promise with created review
 * @throws {ApiError} Error with message and status code
 *
 * @example
 * ```typescript
 * const review = await createReview(bookId, {
 *   rating: 5,
 *   comment: "Great book! Highly recommend."
 * });
 * ```
 */
export async function createReview(
  bookId: string,
  reviewData: CreateReviewInput
): Promise<Review> {
  if (!bookId) {
    throw new ApiError("Book ID is required", 400);
  }

  if (!reviewData.rating || reviewData.rating < 1 || reviewData.rating > 5) {
    throw new ApiError("Rating must be between 1 and 5", 400);
  }

  if (!reviewData.comment || reviewData.comment.trim().length === 0) {
    throw new ApiError("Comment is required", 400);
  }

  const response = await fetch(`/api/reviews/${bookId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      rating: reviewData.rating,
      comment: reviewData.comment.trim(),
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
  if (data.success && data.review) {
    return data.review;
  }

  throw new ApiError("Invalid response format from create review API", 500);
}

/**
 * Update an existing review
 *
 * Business Rules:
 * - User must be authenticated
 * - User must own the review
 * - Rating must be between 1 and 5
 * - Comment is required
 *
 * @param reviewId - Review ID (UUID)
 * @param reviewData - Updated review data (rating and comment)
 * @returns Promise with updated review
 * @throws {ApiError} Error with message and status code (404 if not found or not owned)
 *
 * @example
 * ```typescript
 * const updated = await updateReview(reviewId, {
 *   rating: 4,
 *   comment: "Updated my review - still great!"
 * });
 * ```
 */
export async function updateReview(
  reviewId: string,
  reviewData: UpdateReviewInput
): Promise<Review> {
  if (!reviewId) {
    throw new ApiError("Review ID is required", 400);
  }

  if (!reviewData.rating || reviewData.rating < 1 || reviewData.rating > 5) {
    throw new ApiError("Rating must be between 1 and 5", 400);
  }

  if (!reviewData.comment || reviewData.comment.trim().length === 0) {
    throw new ApiError("Comment is required", 400);
  }

  const response = await fetch(`/api/reviews/edit/${reviewId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      rating: reviewData.rating,
      comment: reviewData.comment.trim(),
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
  if (data.success && data.review) {
    return data.review;
  }

  throw new ApiError("Invalid response format from update review API", 500);
}

/**
 * Delete a review
 *
 * Business Rules:
 * - User must be authenticated
 * - User must own the review
 *
 * @param reviewId - Review ID (UUID)
 * @returns Promise with success message
 * @throws {ApiError} Error with message and status code (404 if not found or not owned)
 *
 * @example
 * ```typescript
 * await deleteReview(reviewId);
 * ```
 */
export async function deleteReview(reviewId: string): Promise<void> {
  if (!reviewId) {
    throw new ApiError("Review ID is required", 400);
  }

  const response = await fetch(`/api/reviews/delete/${reviewId}`, {
    method: "DELETE",
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

  // Verify success
  if (!data.success) {
    throw new ApiError(
      data.message || "Failed to delete review",
      response.status
    );
  }
}

// ---------------------------------------------------------------------------
// Book Review moderation — admin queue + "My Reviews" tab.
// Parent: CR-0003 / REQ-0034
// ---------------------------------------------------------------------------

export interface AdminReviewFilters {
  status?: ReviewStatusValue;
  search?: string;
}

async function parseReviewsResponse(
  response: Response,
  fallbackMessage: string,
): Promise<AdminBookReviewItem[]> {
  if (!response.ok) {
    let message = fallbackMessage;
    try {
      const data = await response.json();
      message = data.error || data.message || fallbackMessage;
    } catch {
      // Non-JSON error body — keep the fallback message.
    }
    throw new ApiError(message, response.status);
  }
  const data = await response.json();
  if (data.success && Array.isArray(data.reviews)) return data.reviews;
  throw new ApiError(fallbackMessage, 500);
}

/** Admin moderation queue — every review, all statuses. */
export async function getAdminBookReviews(
  filters: AdminReviewFilters = {},
): Promise<AdminBookReviewItem[]> {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  const query = params.toString();

  const response = await fetch(`/api/reviews/admin${query ? `?${query}` : ""}`, {
    method: "GET",
  });
  return parseReviewsResponse(response, "Failed to fetch reviews");
}

/** Signed-in user's own reviews (any status) — My Reviews tab. */
export async function getUserBookReviews(): Promise<AdminBookReviewItem[]> {
  const response = await fetch("/api/reviews/mine", { method: "GET" });
  return parseReviewsResponse(response, "Failed to fetch your reviews");
}

/** Single review detail — admin moderation detail page refetch. */
export async function getAdminReviewDetail(
  reviewId: string,
): Promise<AdminBookReviewItem> {
  const response = await fetch(`/api/reviews/admin/${reviewId}`, {
    method: "GET",
  });
  if (!response.ok) {
    let message = "Failed to fetch review";
    try {
      const data = await response.json();
      message = data.error || data.message || message;
    } catch {
      // Non-JSON error body — keep the fallback message.
    }
    throw new ApiError(message, response.status);
  }
  const data = await response.json();
  if (data.success && data.review) return data.review;
  throw new ApiError("Invalid response format from review detail API", 500);
}

/** Admin approve/reject decision. */
export async function moderateReview(
  reviewId: string,
  status: "APPROVED" | "REJECTED",
): Promise<{ id: string; status: ReviewStatusValue; reviewedAt: string | null }> {
  const response = await fetch(`/api/reviews/edit/${reviewId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    let message = "Failed to moderate review";
    try {
      const data = await response.json();
      message = data.error || data.message || message;
    } catch {
      // Non-JSON error body — keep the fallback message.
    }
    throw new ApiError(message, response.status);
  }

  const data = await response.json();
  if (data.success && data.review) return data.review;
  throw new ApiError("Invalid response format from moderate review API", 500);
}

/** Admin sidebar badge — reviews awaiting moderation. */
export async function getPendingReviewCount(): Promise<number> {
  const response = await fetch("/api/reviews/pending-count", { method: "GET" });
  if (!response.ok) {
    let message = "Failed to fetch pending review count";
    try {
      const data = await response.json();
      message = data.error || data.message || message;
    } catch {
      // Non-JSON error body — keep the fallback message.
    }
    throw new ApiError(message, response.status);
  }
  const data = await response.json();
  return data.count ?? 0;
}
