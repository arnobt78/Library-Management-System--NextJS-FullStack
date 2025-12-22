/**
 * React Query Mutation Hooks
 *
 * This module provides centralized mutation hooks for all write operations
 * (create, update, delete) in the application. Each mutation hook:
 * - Integrates with React Query's useMutation
 * - Handles cache invalidation on success
 * - Shows Shadcn toasts for user feedback
 * - Provides proper TypeScript types
 * - Handles errors gracefully
 *
 * Usage:
 * ```tsx
 * const createBookMutation = useCreateBook();
 * createBookMutation.mutate({ title: "New Book", ... });
 * ```
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createBook, updateBook } from "@/lib/admin/actions/book";
import { bulkDeleteBooks } from "@/lib/admin/actions/bulk-operations";
import {
  approveBorrowRequest,
  rejectBorrowRequest,
  returnBook,
} from "@/lib/admin/actions/borrow";
import {
  approveAdminRequest,
  rejectAdminRequest,
  removeAdminPrivileges,
} from "@/lib/admin/actions/admin-requests";
import { updateUserRole, updateUserStatus } from "@/lib/admin/actions/user";
import { borrowBook } from "@/lib/actions/book";
import {
  createReview,
  updateReview,
  deleteReview,
  type CreateReviewInput,
  type UpdateReviewInput,
} from "@/lib/services/reviews";
import {
  updateFineConfig,
  sendDueReminders,
  sendOverdueReminders,
  updateOverdueFines,
  generateAllUserRecommendations,
  updateTrendingBooks,
  refreshRecommendationCache,
} from "@/lib/services/admin";
import { showToast } from "@/lib/toast";
import {
  invalidateAfterBookChange,
  invalidateAfterUserChange,
  invalidateAfterBorrowChange,
  invalidateAfterReviewChange,
  invalidateAfterAdminChange,
  invalidateAfterRecommendationChange,
} from "@/lib/utils/queryInvalidation";
// BookParams is a global type from types.d.ts, no import needed

/**
 * Hook to create a new book.
 * Automatically invalidates related queries and shows success/error toasts.
 *
 * @returns React Query mutation object with mutate function and loading/error states
 *
 * @example
 * ```tsx
 * const createBookMutation = useCreateBook();
 *
 * // In form submit handler:
 * createBookMutation.mutate({
 *   title: "New Book",
 *   author: "Author Name",
 *   genre: "Fiction",
 *   // ... other BookParams fields
 *   updatedBy: userId,
 * });
 * ```
 */
export const useCreateBook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: BookParams & { updatedBy?: string }) => {
      const result = await createBook(params);
      if (!result.success) {
        throw new Error(result.message || "Failed to create book");
      }
      return result.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate all related queries (books, borrows, reviews, analytics, admin)
      invalidateAfterBookChange(queryClient);

      // Show success toast
      showToast.book.createSuccess(variables.title);
    },
    onError: (error: Error, variables) => {
      // Show error toast
      showToast.error(
        "Creation Failed",
        error.message ||
          `Unable to create "${variables.title}". Please check your input and try again.`
      );
    },
  });
};

/**
 * Hook to update an existing book.
 * Automatically invalidates related queries and shows success/error toasts.
 *
 * @returns React Query mutation object with mutate function and loading/error states
 *
 * @example
 * ```tsx
 * const updateBookMutation = useUpdateBook();
 *
 * // In form submit handler:
 * updateBookMutation.mutate({
 *   bookId: "book-123",
 *   title: "Updated Book Title",
 *   author: "Updated Author",
 *   // ... other Partial<BookParams> fields
 *   updatedBy: userId,
 * });
 * ```
 */
export const useUpdateBook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookId,
      ...params
    }: {
      bookId: string;
    } & Partial<BookParams> & { updatedBy?: string }) => {
      const result = await updateBook(bookId, params);
      if (!result.success) {
        throw new Error(result.message || "Failed to update book");
      }
      return result.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate all related queries (books, borrows, reviews, analytics, admin)
      invalidateAfterBookChange(queryClient);

      // Show success toast with updated title (or fallback to bookId)
      const bookTitle = variables.title || data?.title || "Book";
      showToast.success(
        "Book Updated",
        `"${bookTitle}" has been updated successfully.`
      );
    },
    onError: (error: Error, variables) => {
      // Show error toast
      const bookTitle = variables.title || variables.bookId || "Book";
      showToast.error(
        "Update Failed",
        error.message ||
          `Unable to update "${bookTitle}". Please check your input and try again.`
      );
    },
  });
};

/**
 * Hook to delete a book (or multiple books).
 * Automatically invalidates related queries and shows success/error toasts.
 * Uses bulkDeleteBooks internally, which checks for active borrows before deletion.
 *
 * @returns React Query mutation object with mutate function and loading/error states
 *
 * @example
 * ```tsx
 * const deleteBookMutation = useDeleteBook();
 *
 * // Delete a single book:
 * deleteBookMutation.mutate({
 *   bookIds: ["book-123"],
 *   bookTitle: "Book Title", // Optional, for toast message
 * });
 *
 * // Delete multiple books:
 * deleteBookMutation.mutate({
 *   bookIds: ["book-123", "book-456"],
 * });
 * ```
 */
export const useDeleteBook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookIds,
    }: {
      bookIds: string[];
      bookTitle?: string; // Optional, for toast message
    }) => {
      const result = await bulkDeleteBooks(bookIds);
      if (!result.success) {
        throw new Error(result.message || "Failed to delete book(s)");
      }
      return { bookIds, message: result.message };
    },
    onSuccess: (data, variables) => {
      // Invalidate all related queries (books, borrows, reviews, analytics, admin)
      invalidateAfterBookChange(queryClient);

      // Show success toast
      const count = data.bookIds.length;
      const bookTitle =
        variables.bookTitle || (count === 1 ? "Book" : `${count} books`);
      showToast.success(
        "Book(s) Deleted",
        `Successfully deleted ${count === 1 ? `"${bookTitle}"` : `${count} books`}.`
      );
    },
    onError: (error: Error, variables) => {
      // Show error toast
      const count = variables.bookIds.length;
      const bookTitle = variables.bookTitle || (count === 1 ? "book" : "books");
      showToast.error(
        "Deletion Failed",
        error.message ||
          `Unable to delete ${count === 1 ? `"${bookTitle}"` : `${count} books`}. ${error.message.includes("active borrows") ? "Books with active borrows cannot be deleted." : "Please try again."}`
      );
    },
  });
};

/**
 * Hook to update a user's role (USER or ADMIN).
 * Automatically invalidates related queries and shows success/error toasts.
 *
 * @returns React Query mutation object with mutate function and loading/error states
 *
 * @example
 * ```tsx
 * const updateUserRoleMutation = useUpdateUserRole();
 *
 * // Make user an admin:
 * updateUserRoleMutation.mutate({
 *   userId: "user-123",
 *   role: "ADMIN",
 *   userName: "John Doe", // Optional, for toast message
 * });
 *
 * // Remove admin privileges:
 * updateUserRoleMutation.mutate({
 *   userId: "user-123",
 *   role: "USER",
 * });
 * ```
 */
export const useUpdateUserRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      role,
    }: {
      userId: string;
      role: "USER" | "ADMIN";
      userName?: string; // Optional, for toast message
    }) => {
      const result = await updateUserRole(userId, role);
      if (!result.success) {
        throw new Error(result.error || "Failed to update user role");
      }
      return { userId, role };
    },
    onSuccess: (data, variables) => {
      // Invalidate all related queries (users, borrows, reviews, analytics, admin)
      invalidateAfterUserChange(queryClient);

      // Show success toast
      const roleText = data.role === "ADMIN" ? "admin" : "regular user";
      const userName = variables.userName || "User";
      showToast.success(
        "Role Updated",
        `${userName} has been ${data.role === "ADMIN" ? "promoted to" : "demoted from"} ${roleText}.`
      );
    },
    onError: (error: Error, variables) => {
      // Show error toast
      const userName = variables.userName || "User";
      showToast.error(
        "Role Update Failed",
        error.message ||
          `Unable to update ${userName}'s role. Please try again.`
      );
    },
  });
};

/**
 * Hook to update a user's status (PENDING, APPROVED, or REJECTED).
 * Automatically invalidates related queries and shows success/error toasts.
 *
 * @returns React Query mutation object with mutate function and loading/error states
 *
 * @example
 * ```tsx
 * const updateUserStatusMutation = useUpdateUserStatus();
 *
 * // Approve a user:
 * updateUserStatusMutation.mutate({
 *   userId: "user-123",
 *   status: "APPROVED",
 *   userName: "John Doe", // Optional, for toast message
 * });
 *
 * // Reject a user:
 * updateUserStatusMutation.mutate({
 *   userId: "user-123",
 *   status: "REJECTED",
 * });
 * ```
 */
export const useUpdateUserStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      status,
    }: {
      userId: string;
      status: "PENDING" | "APPROVED" | "REJECTED";
      userName?: string; // Optional, for toast message
    }) => {
      const result = await updateUserStatus(userId, status);
      if (!result.success) {
        throw new Error(result.error || "Failed to update user status");
      }
      return { userId, status };
    },
    onSuccess: (data, variables) => {
      // Invalidate all related queries (users, borrows, reviews, analytics, admin)
      invalidateAfterUserChange(queryClient);

      // Show success toast
      const statusText =
        data.status === "APPROVED"
          ? "approved"
          : data.status === "REJECTED"
            ? "rejected"
            : "pending";
      const userName = variables.userName || "User";
      showToast.success(
        "Status Updated",
        `${userName}'s account has been ${statusText}.`
      );
    },
    onError: (error: Error, variables) => {
      // Show error toast
      const userName = variables.userName || "User";
      showToast.error(
        "Status Update Failed",
        error.message ||
          `Unable to update ${userName}'s status. Please try again.`
      );
    },
  });
};

/**
 * Hook to approve a user account (convenience wrapper around useUpdateUserStatus).
 * Automatically invalidates related queries and shows success/error toasts.
 *
 * @returns React Query mutation object with mutate function and loading/error states
 *
 * @example
 * ```tsx
 * const approveUserMutation = useApproveUser();
 *
 * // Approve a user:
 * approveUserMutation.mutate({
 *   userId: "user-123",
 *   userName: "John Doe", // Optional, for toast message
 * });
 * ```
 */
export const useApproveUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
    }: {
      userId: string;
      userName?: string; // Optional, for toast message
    }) => {
      const result = await updateUserStatus(userId, "APPROVED");
      if (!result.success) {
        throw new Error(result.error || "Failed to approve user");
      }
      return { userId, status: "APPROVED" as const };
    },
    onSuccess: (data, variables) => {
      // Invalidate all related queries (users, borrows, reviews, analytics, admin)
      invalidateAfterUserChange(queryClient);

      // Show success toast
      const userName = variables.userName || "User";
      showToast.success(
        "User Approved",
        `${userName}'s account has been approved successfully.`
      );
    },
    onError: (error: Error, variables) => {
      // Show error toast
      const userName = variables.userName || "User";
      showToast.error(
        "Approval Failed",
        error.message ||
          `Unable to approve ${userName}'s account. Please try again.`
      );
    },
  });
};

/**
 * Hook to reject a user account (convenience wrapper around useUpdateUserStatus).
 * Automatically invalidates related queries and shows success/error toasts.
 *
 * @returns React Query mutation object with mutate function and loading/error states
 *
 * @example
 * ```tsx
 * const rejectUserMutation = useRejectUser();
 *
 * // Reject a user:
 * rejectUserMutation.mutate({
 *   userId: "user-123",
 *   userName: "John Doe", // Optional, for toast message
 * });
 * ```
 */
export const useRejectUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
    }: {
      userId: string;
      userName?: string; // Optional, for toast message
    }) => {
      const result = await updateUserStatus(userId, "REJECTED");
      if (!result.success) {
        throw new Error(result.error || "Failed to reject user");
      }
      return { userId, status: "REJECTED" as const };
    },
    onSuccess: (data, variables) => {
      // Invalidate all related queries (users, borrows, reviews, analytics, admin)
      invalidateAfterUserChange(queryClient);

      // Show success toast
      const userName = variables.userName || "User";
      showToast.success(
        "User Rejected",
        `${userName}'s account has been rejected.`
      );
    },
    onError: (error: Error, variables) => {
      // Show error toast
      const userName = variables.userName || "User";
      showToast.error(
        "Rejection Failed",
        error.message ||
          `Unable to reject ${userName}'s account. Please try again.`
      );
    },
  });
};

/**
 * Hook to request borrowing a book (creates a PENDING borrow request).
 * Automatically invalidates related queries and shows success/error toasts.
 * Note: The request requires admin approval before the book is actually borrowed.
 *
 * @returns React Query mutation object with mutate function and loading/error states
 *
 * @example
 * ```tsx
 * const borrowBookMutation = useBorrowBook();
 *
 * // Request to borrow a book:
 * borrowBookMutation.mutate({
 *   userId: "user-123",
 *   bookId: "book-456",
 *   bookTitle: "Book Title", // Optional, for toast message
 * });
 * ```
 */
export const useBorrowBook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      bookId,
    }: {
      userId: string;
      bookId: string;
      bookTitle?: string; // Optional, for toast message
    }) => {
      const result = await borrowBook({ userId, bookId });
      if (!result.success) {
        throw new Error(result.error || "Failed to request book");
      }
      return result.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate all related queries (borrows, books, reviews, analytics, admin)
      invalidateAfterBorrowChange(queryClient);

      // Show success toast
      const bookTitle = variables.bookTitle || "Book";
      showToast.book.borrowSuccess(bookTitle);
    },
    onError: (error: Error, variables) => {
      // Show error toast
      const bookTitle = variables.bookTitle || "book";
      showToast.book.borrowError(
        error.message || `Unable to request "${bookTitle}". Please try again.`
      );
    },
  });
};

/**
 * Hook to approve a borrow request (admin action).
 * Automatically invalidates related queries and shows success/error toasts.
 * Sets the book status to BORROWED and decrements available copies.
 *
 * @returns React Query mutation object with mutate function and loading/error states
 *
 * @example
 * ```tsx
 * const approveBorrowMutation = useApproveBorrow();
 *
 * // Approve a borrow request:
 * approveBorrowMutation.mutate({
 *   recordId: "record-123",
 *   bookTitle: "Book Title", // Optional, for toast message
 *   userName: "John Doe", // Optional, for toast message
 * });
 * ```
 */
export const useApproveBorrow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      recordId,
    }: {
      recordId: string;
      bookTitle?: string; // Optional, for toast message
      userName?: string; // Optional, for toast message
    }) => {
      const result = await approveBorrowRequest(recordId);
      if (!result.success) {
        throw new Error(result.error || "Failed to approve borrow request");
      }
      return { recordId };
    },
    onSuccess: (data, variables) => {
      // Invalidate all related queries (borrows, books, reviews, analytics, admin)
      invalidateAfterBorrowChange(queryClient);

      // Show success toast
      const bookTitle = variables.bookTitle || "Book";
      const userName = variables.userName || "User";
      showToast.success(
        "Borrow Request Approved",
        `${userName} can now borrow "${bookTitle}".`
      );
    },
    onError: (error: Error, variables) => {
      // Show error toast
      const bookTitle = variables.bookTitle || "book";
      showToast.error(
        "Approval Failed",
        error.message ||
          `Unable to approve borrow request for "${bookTitle}". ${error.message.includes("no longer available") ? "The book is no longer available." : "Please try again."}`
      );
    },
  });
};

/**
 * Hook to reject a borrow request (admin action).
 * Automatically invalidates related queries and shows success/error toasts.
 * Deletes the pending borrow request.
 *
 * @returns React Query mutation object with mutate function and loading/error states
 *
 * @example
 * ```tsx
 * const rejectBorrowMutation = useRejectBorrow();
 *
 * // Reject a borrow request:
 * rejectBorrowMutation.mutate({
 *   recordId: "record-123",
 *   bookTitle: "Book Title", // Optional, for toast message
 *   userName: "John Doe", // Optional, for toast message
 * });
 * ```
 */
export const useRejectBorrow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      recordId,
    }: {
      recordId: string;
      bookTitle?: string; // Optional, for toast message
      userName?: string; // Optional, for toast message
    }) => {
      const result = await rejectBorrowRequest(recordId);
      if (!result.success) {
        throw new Error(result.error || "Failed to reject borrow request");
      }
      return { recordId };
    },
    onSuccess: (data, variables) => {
      // Invalidate all related queries (borrows, books, reviews, analytics, admin)
      invalidateAfterBorrowChange(queryClient);

      // Show success toast
      const bookTitle = variables.bookTitle || "Book";
      const userName = variables.userName || "User";
      showToast.success(
        "Borrow Request Rejected",
        `Borrow request for "${bookTitle}" by ${userName} has been rejected.`
      );
    },
    onError: (error: Error, variables) => {
      // Show error toast
      const bookTitle = variables.bookTitle || "book";
      showToast.error(
        "Rejection Failed",
        error.message ||
          `Unable to reject borrow request for "${bookTitle}". Please try again.`
      );
    },
  });
};

/**
 * Hook to return a book (marks borrow record as RETURNED).
 * Automatically invalidates related queries and shows success/error toasts.
 * Calculates and applies overdue fines if the book is returned late.
 *
 * @returns React Query mutation object with mutate function and loading/error states
 *
 * @example
 * ```tsx
 * const returnBookMutation = useReturnBook();
 *
 * // Return a book:
 * returnBookMutation.mutate({
 *   recordId: "record-123",
 *   bookTitle: "Book Title", // Optional, for toast message
 * });
 * ```
 */
export const useReturnBook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      recordId,
    }: {
      recordId: string;
      bookTitle?: string; // Optional, for toast message
    }) => {
      const result = await returnBook(recordId);
      if (!result.success) {
        throw new Error(result.error || "Failed to return book");
      }
      return result.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate all related queries (borrows, books, reviews, analytics, admin)
      invalidateAfterBorrowChange(queryClient);

      // Show success toast (with fine info if overdue)
      const bookTitle = variables.bookTitle || "Book";
      if (
        data?.isOverdue &&
        data.daysOverdue !== undefined &&
        data.fineAmount !== undefined
      ) {
        showToast.warning(
          "Book Returned with Fine",
          `"${bookTitle}" was returned ${data.daysOverdue} days overdue. Fine: $${data.fineAmount.toFixed(2)}`
        );
      } else {
        showToast.book.returnSuccess(bookTitle);
      }
    },
    onError: (error: Error, variables) => {
      // Show error toast
      const bookTitle = variables.bookTitle || "book";
      showToast.book.returnError(
        error.message || `Unable to return "${bookTitle}". Please try again.`
      );
    },
  });
};

/**
 * Hook to create a new book review.
 * Automatically invalidates related queries and shows success/error toasts.
 * Note: User must have borrowed and returned the book to be eligible.
 *
 * @returns React Query mutation object with mutate function and loading/error states
 *
 * @example
 * ```tsx
 * const createReviewMutation = useCreateReview();
 *
 * // Create a review:
 * createReviewMutation.mutate({
 *   bookId: "book-123",
 *   rating: 5,
 *   comment: "Great book!",
 *   bookTitle: "Book Title", // Optional, for toast message
 * });
 * ```
 */
export const useCreateReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookId,
      ...reviewData
    }: CreateReviewInput & {
      bookId: string;
      bookTitle?: string; // Optional, for toast message
    }) => {
      const review = await createReview(bookId, reviewData);
      return review;
    },
    onSuccess: (data, variables) => {
      // Invalidate all related queries (reviews, books, analytics)
      invalidateAfterReviewChange(queryClient);

      // Show success toast
      const bookTitle = variables.bookTitle || "Book";
      showToast.success(
        "Review Submitted",
        `Your review for "${bookTitle}" has been submitted successfully.`
      );
    },
    onError: (error: Error, variables) => {
      // Show error toast
      const bookTitle = variables.bookTitle || "book";
      showToast.error(
        "Review Failed",
        error.message ||
          `Unable to submit review for "${bookTitle}". ${error.message.includes("already reviewed") ? "You have already reviewed this book." : error.message.includes("borrowed") ? "You must have borrowed this book to review it." : "Please try again."}`
      );
    },
  });
};

/**
 * Hook to update an existing book review.
 * Automatically invalidates related queries and shows success/error toasts.
 * Note: User must own the review to update it.
 *
 * @returns React Query mutation object with mutate function and loading/error states
 *
 * @example
 * ```tsx
 * const updateReviewMutation = useUpdateReview();
 *
 * // Update a review:
 * updateReviewMutation.mutate({
 *   reviewId: "review-123",
 *   rating: 4,
 *   comment: "Updated my review",
 *   bookTitle: "Book Title", // Optional, for toast message
 * });
 * ```
 */
export const useUpdateReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reviewId,
      ...reviewData
    }: {
      reviewId: string;
    } & UpdateReviewInput & {
        bookTitle?: string; // Optional, for toast message
      }) => {
      const review = await updateReview(reviewId, reviewData);
      return review;
    },
    onSuccess: (data, variables) => {
      // Invalidate all related queries (reviews, books, analytics)
      invalidateAfterReviewChange(queryClient);

      // Show success toast
      const bookTitle = variables.bookTitle || "Book";
      showToast.success(
        "Review Updated",
        `Your review for "${bookTitle}" has been updated successfully.`
      );
    },
    onError: (error: Error, variables) => {
      // Show error toast
      const bookTitle = variables.bookTitle || "book";
      showToast.error(
        "Update Failed",
        error.message ||
          `Unable to update review for "${bookTitle}". ${error.message.includes("not found") || error.message.includes("permission") ? "Review not found or you don't have permission to edit it." : "Please try again."}`
      );
    },
  });
};

/**
 * Hook to delete a book review.
 * Automatically invalidates related queries and shows success/error toasts.
 * Note: User must own the review to delete it.
 *
 * @returns React Query mutation object with mutate function and loading/error states
 *
 * @example
 * ```tsx
 * const deleteReviewMutation = useDeleteReview();
 *
 * // Delete a review:
 * deleteReviewMutation.mutate({
 *   reviewId: "review-123",
 *   bookTitle: "Book Title", // Optional, for toast message
 * });
 * ```
 */
export const useDeleteReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reviewId,
    }: {
      reviewId: string;
      bookTitle?: string; // Optional, for toast message
    }) => {
      const result = await deleteReview(reviewId);
      return result;
    },
    onSuccess: (data, variables) => {
      // Invalidate all related queries (reviews, books, analytics)
      invalidateAfterReviewChange(queryClient);

      // Show success toast
      const bookTitle = variables.bookTitle || "Book";
      showToast.success(
        "Review Deleted",
        `Your review for "${bookTitle}" has been deleted successfully.`
      );
    },
    onError: (error: Error, variables) => {
      // Show error toast
      const bookTitle = variables.bookTitle || "book";
      showToast.error(
        "Deletion Failed",
        error.message ||
          `Unable to delete review for "${bookTitle}". ${error.message.includes("not found") || error.message.includes("permission") ? "Review not found or you don't have permission to delete it." : "Please try again."}`
      );
    },
  });
};

/**
 * Hook to approve an admin request (admin action).
 * Automatically invalidates related queries and shows success/error toasts.
 * Updates the user's role to ADMIN upon approval.
 *
 * @returns React Query mutation object with mutate function and loading/error states
 *
 * @example
 * ```tsx
 * const approveAdminRequestMutation = useApproveAdminRequest();
 *
 * // Approve an admin request:
 * approveAdminRequestMutation.mutate({
 *   requestId: "request-123",
 *   reviewedBy: "admin-user-id",
 *   userName: "John Doe", // Optional, for toast message
 * });
 * ```
 */
export const useApproveAdminRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      reviewedBy,
    }: {
      requestId: string;
      reviewedBy: string;
      userName?: string; // Optional, for toast message
    }) => {
      const result = await approveAdminRequest(requestId, reviewedBy);
      if (!result.success) {
        throw new Error(result.error || "Failed to approve admin request");
      }
      return result.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate all related queries (users, admin requests, admin stats)
      invalidateAfterAdminChange(queryClient);
      invalidateAfterUserChange(queryClient); // User role changed

      // Show success toast
      const userName = variables.userName || data?.userFullName || "User";
      showToast.success(
        "Admin Request Approved",
        `${userName} has been granted admin privileges.`
      );
    },
    onError: (error: Error, variables) => {
      // Show error toast
      const userName = variables.userName || "User";
      showToast.error(
        "Approval Failed",
        error.message ||
          `Unable to approve admin request for ${userName}. ${error.message.includes("already been processed") ? "This request has already been processed." : "Please try again."}`
      );
    },
  });
};

/**
 * Hook to reject an admin request (admin action).
 * Automatically invalidates related queries and shows success/error toasts.
 * Marks the request as REJECTED with an optional rejection reason.
 *
 * @returns React Query mutation object with mutate function and loading/error states
 *
 * @example
 * ```tsx
 * const rejectAdminRequestMutation = useRejectAdminRequest();
 *
 * // Reject an admin request:
 * rejectAdminRequestMutation.mutate({
 *   requestId: "request-123",
 *   reviewedBy: "admin-user-id",
 *   rejectionReason: "Insufficient experience", // Optional
 *   userName: "John Doe", // Optional, for toast message
 * });
 * ```
 */
export const useRejectAdminRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      reviewedBy,
      rejectionReason,
    }: {
      requestId: string;
      reviewedBy: string;
      rejectionReason?: string; // Optional rejection reason
      userName?: string; // Optional, for toast message
    }) => {
      const result = await rejectAdminRequest(
        requestId,
        reviewedBy,
        rejectionReason
      );
      if (!result.success) {
        throw new Error(result.error || "Failed to reject admin request");
      }
      return result.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate all related queries (users, admin requests, admin stats)
      invalidateAfterAdminChange(queryClient);
      invalidateAfterUserChange(queryClient); // May affect user queries

      // Show success toast
      const userName = variables.userName || data?.userFullName || "User";
      showToast.success(
        "Admin Request Rejected",
        `Admin request from ${userName} has been rejected.`
      );
    },
    onError: (error: Error, variables) => {
      // Show error toast
      const userName = variables.userName || "User";
      showToast.error(
        "Rejection Failed",
        error.message ||
          `Unable to reject admin request for ${userName}. ${error.message.includes("already been processed") ? "This request has already been processed." : "Please try again."}`
      );
    },
  });
};

/**
 * Hook to remove admin privileges from a user (admin action).
 * Automatically invalidates related queries and shows success/error toasts.
 * Updates the user's role from ADMIN to USER.
 *
 * @returns React Query mutation object with mutate function and loading/error states
 *
 * @example
 * ```tsx
 * const removeAdminPrivilegesMutation = useRemoveAdminPrivileges();
 *
 * // Remove admin privileges:
 * removeAdminPrivilegesMutation.mutate({
 *   userId: "user-123",
 *   removedBy: "admin-user-id",
 *   userName: "John Doe", // Optional, for toast message
 * });
 * ```
 */
export const useRemoveAdminPrivileges = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      removedBy,
    }: {
      userId: string;
      removedBy: string;
      userName?: string; // Optional, for toast message
    }) => {
      const result = await removeAdminPrivileges(userId, removedBy);
      if (!result.success) {
        throw new Error(result.error || "Failed to remove admin privileges");
      }
      return { userId };
    },
    onSuccess: (data, variables) => {
      // Invalidate all related queries (users, admin requests, admin stats)
      invalidateAfterAdminChange(queryClient);
      invalidateAfterUserChange(queryClient); // User role changed

      // Show success toast
      const userName = variables.userName || "User";
      showToast.success(
        "Admin Privileges Removed",
        `${userName}'s admin privileges have been removed.`
      );
    },
    onError: (error: Error, variables) => {
      // Show error toast
      const userName = variables.userName || "User";
      showToast.error(
        "Removal Failed",
        error.message ||
          `Unable to remove admin privileges from ${userName}. ${error.message.includes("not an admin") ? "User is not an admin." : error.message.includes("not found") ? "User not found." : "Please try again."}`
      );
    },
  });
};

/**
 * Hook to update the fine configuration (daily fine amount for overdue books).
 * Automatically invalidates related queries and shows success/error toasts.
 *
 * @returns React Query mutation object with mutate function and loading/error states
 *
 * @example
 * ```tsx
 * const updateFineConfigMutation = useUpdateFineConfig();
 *
 * // Update fine amount:
 * updateFineConfigMutation.mutate({
 *   fineAmount: 1.50,
 *   updatedBy: "admin@example.com", // Optional
 * });
 * ```
 */
export const useUpdateFineConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      fineAmount,
      updatedBy,
    }: {
      fineAmount: number;
      updatedBy?: string; // Optional, admin email
    }) => {
      const config = await updateFineConfig(fineAmount, updatedBy);
      return config;
    },
    onSuccess: (data, variables) => {
      // Invalidate all related queries (admin stats, fine config, borrows)
      invalidateAfterAdminChange(queryClient);
      invalidateAfterBorrowChange(queryClient); // Fine changes affect borrow records

      // Show success toast
      showToast.success(
        "Fine Configuration Updated",
        `Daily fine amount has been updated to $${variables.fineAmount.toFixed(2)} per day.`
      );
    },
    onError: (error: Error) => {
      // Show error toast
      showToast.error(
        "Update Failed",
        error.message ||
          `Unable to update fine configuration. ${error.message.includes("positive number") ? "Fine amount must be a positive number." : "Please try again."}`
      );
    },
  });
};

/**
 * Hook to send due soon reminders to users (admin action).
 * Automatically invalidates related queries and shows success/error toasts.
 * Sends email reminders to users whose books are due soon.
 *
 * @returns React Query mutation object with mutate function and loading/error states
 *
 * @example
 * ```tsx
 * const sendDueRemindersMutation = useSendDueReminders();
 *
 * // Send due reminders:
 * sendDueRemindersMutation.mutate({});
 * ```
 */
export const useSendDueReminders = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const result = await sendDueReminders();
      return result;
    },
    onSuccess: (data) => {
      // Invalidate all related queries (admin stats, borrows)
      invalidateAfterAdminChange(queryClient);
      invalidateAfterBorrowChange(queryClient);

      // Show success toast
      const count = data.results?.length || 0;
      showToast.success(
        "Reminders Sent",
        `Successfully sent ${count} due soon reminder${count !== 1 ? "s" : ""}.`
      );
    },
    onError: (error: Error) => {
      // Show error toast
      showToast.error(
        "Reminder Failed",
        error.message || "Unable to send due soon reminders. Please try again."
      );
    },
  });
};

/**
 * Hook to send overdue reminders to users (admin action).
 * Automatically invalidates related queries and shows success/error toasts.
 * Sends email reminders to users whose books are overdue.
 *
 * @returns React Query mutation object with mutate function and loading/error states
 *
 * @example
 * ```tsx
 * const sendOverdueRemindersMutation = useSendOverdueReminders();
 *
 * // Send overdue reminders:
 * sendOverdueRemindersMutation.mutate({});
 * ```
 */
export const useSendOverdueReminders = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const result = await sendOverdueReminders();
      return result;
    },
    onSuccess: (data) => {
      // Invalidate all related queries (admin stats, borrows)
      invalidateAfterAdminChange(queryClient);
      invalidateAfterBorrowChange(queryClient);

      // Show success toast
      const count = data.results?.length || 0;
      showToast.success(
        "Overdue Reminders Sent",
        `Successfully sent ${count} overdue reminder${count !== 1 ? "s" : ""}.`
      );
    },
    onError: (error: Error) => {
      // Show error toast
      showToast.error(
        "Reminder Failed",
        error.message || "Unable to send overdue reminders. Please try again."
      );
    },
  });
};

/**
 * Hook to update overdue fines for all currently borrowed and overdue books (admin action).
 * Automatically invalidates related queries and shows success/error toasts.
 * Calculates and applies fines based on days overdue.
 *
 * @returns React Query mutation object with mutate function and loading/error states
 *
 * @example
 * ```tsx
 * const updateOverdueFinesMutation = useUpdateOverdueFines();
 *
 * // Update overdue fines with default fine amount:
 * updateOverdueFinesMutation.mutate({});
 *
 * // Update overdue fines with custom fine amount:
 * updateOverdueFinesMutation.mutate({
 *   customFineAmount: 2.0,
 * });
 * ```
 */
export const useUpdateOverdueFines = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      customFineAmount,
    }: {
      customFineAmount?: number; // Optional custom fine amount
    } = {}) => {
      const result = await updateOverdueFines(customFineAmount);
      return result;
    },
    onSuccess: (data) => {
      // Invalidate all related queries (admin stats, borrows, analytics)
      invalidateAfterAdminChange(queryClient);
      invalidateAfterBorrowChange(queryClient);

      // Show success toast
      const count = data.results?.length || 0;
      showToast.success(
        "Overdue Fines Updated",
        `Successfully updated fines for ${count} overdue book${count !== 1 ? "s" : ""}.`
      );
    },
    onError: (error: Error) => {
      // Show error toast
      showToast.error(
        "Update Failed",
        error.message || "Unable to update overdue fines. Please try again."
      );
    },
  });
};

/**
 * Hook to generate all user recommendations (admin action).
 * Automatically invalidates related queries and shows success/error toasts.
 * Generates personalized book recommendations for all approved users.
 *
 * @returns React Query mutation object with mutate function and loading/error states
 *
 * @example
 * ```tsx
 * const generateRecommendationsMutation = useGenerateAllUserRecommendations();
 *
 * // Generate recommendations:
 * generateRecommendationsMutation.mutate();
 * ```
 */
export const useGenerateAllUserRecommendations = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const result = await generateAllUserRecommendations();
      return result;
    },
    onSuccess: (data) => {
      // Invalidate only recommendation-related queries (optimized - doesn't invalidate reminder-stats, export-stats, fine-config)
      invalidateAfterRecommendationChange(queryClient);

      // Show success toast
      showToast.success(
        "Recommendations Generated",
        `Successfully generated ${data.totalRecommendations} personalized recommendations for ${data.totalUsers} users using AI-powered algorithms.`
      );
    },
    onError: (error: Error) => {
      // Show error toast
      showToast.error(
        "Failed to Generate Recommendations",
        error.message || "Unable to generate recommendations. Please try again."
      );
    },
  });
};

/**
 * Hook to update trending books (admin action).
 * Automatically invalidates related queries and shows success/error toasts.
 * Updates trending books data based on recent borrowing activity.
 *
 * @returns React Query mutation object with mutate function and loading/error states
 *
 * @example
 * ```tsx
 * const updateTrendingMutation = useUpdateTrendingBooks();
 *
 * // Update trending books:
 * updateTrendingMutation.mutate();
 * ```
 */
export const useUpdateTrendingBooks = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const result = await updateTrendingBooks();
      return result;
    },
    onSuccess: (data) => {
      // Invalidate only recommendation-related queries (optimized - doesn't invalidate reminder-stats, export-stats, fine-config)
      invalidateAfterRecommendationChange(queryClient);

      // Show success toast
      showToast.success(
        "Trending Books Updated",
        `Successfully updated trending books. Found ${data.trendingCount} trending book${data.trendingCount !== 1 ? "s" : ""} based on recent borrowing activity.`
      );
    },
    onError: (error: Error) => {
      // Show error toast
      showToast.error(
        "Failed to Update Trending Books",
        error.message || "Unable to update trending books. Please try again."
      );
    },
  });
};

/**
 * Hook to refresh recommendation cache (admin action).
 * Automatically invalidates related queries and shows success/error toasts.
 * Refreshes the recommendation cache by clearing and regenerating cached recommendations.
 *
 * @returns React Query mutation object with mutate function and loading/error states
 *
 * @example
 * ```tsx
 * const refreshCacheMutation = useRefreshRecommendationCache();
 *
 * // Refresh cache:
 * refreshCacheMutation.mutate();
 * ```
 */
export const useRefreshRecommendationCache = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const result = await refreshRecommendationCache();
      return result;
    },
    onSuccess: (data) => {
      // Invalidate only recommendation-related queries (optimized - doesn't invalidate reminder-stats, export-stats, fine-config)
      invalidateAfterRecommendationChange(queryClient);

      // Show success toast
      showToast.success(
        "Recommendation Cache Refreshed",
        "Recommendation cache has been cleared and refreshed. All cached recommendations will be regenerated on next request."
      );
    },
    onError: (error: Error) => {
      // Show error toast
      showToast.error(
        "Failed to Refresh Cache",
        error.message || "Unable to refresh recommendation cache. Please try again."
      );
    },
  });
};
