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
  userEmail: string;
  // Optional fields that may be included
  userId?: string;
  bookId?: string;
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
 * Response type for review list queries
 */
export interface ReviewsListResponse {
  success: boolean;
  reviews: Review[];
}

/**
 * Response type for single review operations
 */
export interface ReviewResponse {
  success: boolean;
  review: Review;
  message?: string;
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

/**
 * Get average rating for a book
 *
 * Calculates the average rating from all reviews for a book.
 *
 * @param bookId - Book ID (UUID)
 * @returns Promise with average rating (0-5) and total review count
 * @throws {ApiError} Error with message and status code
 *
 * @example
 * ```typescript
 * const stats = await getBookRatingStats(bookId);
 * console.log(`Average: ${stats.average}, Total: ${stats.count}`);
 * ```
 */
export async function getBookRatingStats(bookId: string): Promise<{
  average: number;
  count: number;
}> {
  const reviews = await getBookReviews(bookId);

  if (reviews.length === 0) {
    return { average: 0, count: 0 };
  }

  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  const average = totalRating / reviews.length;

  return {
    average: Math.round(average * 10) / 10, // Round to 1 decimal place
    count: reviews.length,
  };
}
