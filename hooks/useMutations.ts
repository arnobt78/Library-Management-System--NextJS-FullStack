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

import {
  useMutation,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { queryKeys } from "@/lib/query/keys";
import { createBook, updateBook } from "@/lib/admin/actions/book";
import { bulkDeleteBooks } from "@/lib/admin/actions/bulk-operations";
import {
  approveBorrowRequest,
  rejectBorrowRequest,
  returnBook,
} from "@/lib/admin/actions/borrow";
import {
  approveAdminRequest,
  cancelMyAdminRequest,
  createAdminRequest,
  rejectAdminRequest,
  removeAdminPrivileges,
} from "@/lib/admin/actions/admin-requests";
import { updateUserRole, updateUserStatus } from "@/lib/admin/actions/user";
import { requestRegistrationReview } from "@/lib/actions/registration";
import { borrowBook } from "@/lib/actions/book";
import {
  createReview,
  updateReview,
  deleteReview,
  moderateReview,
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
import {
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  type NotificationItem,
} from "@/lib/services/notifications";
import {
  createSupportTicket,
  updateSupportTicket,
  deleteSupportTicket,
  createSupportTicketReply,
  type CreateTicketInput,
  type UpdateTicketInput,
} from "@/lib/services/supportTickets";
import { resolveActionBookTitle, showToast } from "@/lib/toast";
import {
  invalidateMutation,
  invalidateNotificationsQueries,
} from "@/lib/utils/queryInvalidation";
import {
  findCachedTicketStatus,
  patchTicketCachesOnCreate,
  patchTicketCachesOnDelete,
  patchTicketCachesOnReply,
  patchTicketCachesOnUpdate,
  snapshotTicketListBaselines,
} from "@/lib/utils/patchTicketCaches";
import {
  applyOptimisticSignupDecision,
  rollbackOptimisticSignupDecision,
} from "@/lib/query/optimisticSignupDecision";
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
 * });
 * ```
 */
export const useCreateBook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: BookParams) => {
      const result = await createBook(params);
      if (!result.success) {
        throw new Error(result.message || "Failed to create book");
      }
      return result.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate all related queries (books, borrows, reviews, analytics, admin)
      invalidateMutation(queryClient, "book.write");

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
    } & Partial<BookParams>) => {
      const result = await updateBook(bookId, params);
      if (!result.success) {
        throw new Error(result.message || "Failed to update book");
      }
      return result.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate all related queries (books, borrows, reviews, analytics, admin)
      invalidateMutation(queryClient, "book.write");

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
      deleteSecret,
    }: {
      bookIds: string[];
      bookTitle?: string; // Optional, for toast message
      /** Required ADMIN_DELETE_SECRET — verified server-side only */
      deleteSecret: string;
    }) => {
      const result = await bulkDeleteBooks(bookIds, deleteSecret);
      if (!result.success) {
        throw new Error(result.message || "Failed to delete book(s)");
      }
      return { bookIds, message: result.message };
    },
    onSuccess: (data, variables) => {
      // Invalidate all related queries (books, borrows, reviews, analytics, admin)
      invalidateMutation(queryClient, "book.write");

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
    onSuccess: async (data, variables) => {
      // Role + admin_requests ledger — same domain as approve/remove admin request
      await invalidateMutation(queryClient, "admin-request.write");

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
    onSuccess: async (data, variables) => {
      // Invalidate all related queries (users, borrows, reviews, analytics, admin)
      await invalidateMutation(queryClient, "user.write");

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
  const { data: session } = useSession();

  return useMutation({
    mutationFn: async ({
      userId,
    }: {
      userId: string;
      userName?: string; // Optional, for toast message
      /** SSR/admin actor — preferred; useSession is often null in admin client trees. */
      decisionActor?: {
        id?: string | null;
        fullName: string;
        email: string;
        universityCard?: string | null;
      } | null;
    }) => {
      const result = await updateUserStatus(userId, "APPROVED");
      if (!result.success) {
        throw new Error(result.error || "Failed to approve user");
      }
      return { userId, status: "APPROVED" as const };
    },
    onMutate: async ({ userId, userName, decisionActor: actorFromCaller }) => {
      const su = session?.user as SessionUser | undefined;
      const fromSession =
        su?.email && (su.name || su.email)
          ? {
              id: su.id ?? null,
              fullName: su.name?.trim() || "Admin",
              email: su.email,
              universityCard: null as string | null,
            }
          : null;
      const decisionActor = actorFromCaller
        ? {
            id: actorFromCaller.id ?? null,
            fullName: actorFromCaller.fullName,
            email: actorFromCaller.email,
            universityCard: actorFromCaller.universityCard ?? null,
          }
        : fromSession;
      return applyOptimisticSignupDecision(queryClient, {
        userId,
        status: "APPROVED",
        userName,
        decisionActor,
      });
    },
    onError: (error: Error, variables, context) => {
      rollbackOptimisticSignupDecision(queryClient, context);
      const userName = variables.userName || "User";
      showToast.error(
        "Approval Failed",
        error.message ||
          `Unable to approve ${userName}'s account. Please try again.`,
      );
    },
    onSuccess: async (_data, variables) => {
      // Server ledger replaces optimistic row; await so spinners hold until sync
      await invalidateMutation(queryClient, "user.write");
      const userName = variables.userName || "User";
      showToast.success(
        "User Approved",
        `${userName}'s account has been approved successfully.`,
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
  const { data: session } = useSession();

  return useMutation({
    mutationFn: async ({
      userId,
    }: {
      userId: string;
      userName?: string; // Optional, for toast message
      /** SSR/admin actor — preferred; useSession is often null in admin client trees. */
      decisionActor?: {
        id?: string | null;
        fullName: string;
        email: string;
        universityCard?: string | null;
      } | null;
    }) => {
      const result = await updateUserStatus(userId, "REJECTED");
      if (!result.success) {
        throw new Error(result.error || "Failed to reject user");
      }
      return { userId, status: "REJECTED" as const };
    },
    onMutate: async ({ userId, userName, decisionActor: actorFromCaller }) => {
      const su = session?.user as SessionUser | undefined;
      const fromSession =
        su?.email && (su.name || su.email)
          ? {
              id: su.id ?? null,
              fullName: su.name?.trim() || "Admin",
              email: su.email,
              universityCard: null as string | null,
            }
          : null;
      const decisionActor = actorFromCaller
        ? {
            id: actorFromCaller.id ?? null,
            fullName: actorFromCaller.fullName,
            email: actorFromCaller.email,
            universityCard: actorFromCaller.universityCard ?? null,
          }
        : fromSession;
      return applyOptimisticSignupDecision(queryClient, {
        userId,
        status: "REJECTED",
        userName,
        decisionActor,
      });
    },
    onError: (error: Error, variables, context) => {
      rollbackOptimisticSignupDecision(queryClient, context);
      const userName = variables.userName || "User";
      showToast.error(
        "Rejection Failed",
        error.message ||
          `Unable to reject ${userName}'s account. Please try again.`,
      );
    },
    onSuccess: async (_data, variables) => {
      await invalidateMutation(queryClient, "user.write");
      const userName = variables.userName || "User";
      showToast.success(
        "User Rejected",
        `${userName}'s account has been rejected.`,
      );
    },
  });
};

/**
 * Rejected student requests librarian review again (REJECTED → PENDING).
 */
export const useRequestRegistrationReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const result = await requestRegistrationReview();
      if (!result.success) {
        throw new Error(result.error || "Failed to request approval again");
      }
      return result;
    },
    onSuccess: async () => {
      await invalidateMutation(queryClient, "user.write");
      showToast.success(
        "Approval requested",
        "Your registration is waiting for librarian review again.",
      );
    },
    onError: (error: Error) => {
      showToast.error(
        "Request failed",
        error.message || "Unable to request approval again. Please try again.",
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
    mutationFn: async ({ bookId }: {
      userId: string;
      bookId: string;
      bookTitle?: string; // Optional, for toast message
    }) => {
      try {
        const result = await borrowBook({ bookId });
        if (!result.success) {
          throw new Error(result.error || "Failed to request book");
        }
        return result.data;
      } catch (error) {
        console.error("[useBorrowBook] Server action error", error);
        throw error;
      }
    },
    // CRITICAL: Optimistic update - add new PENDING record immediately
    // This eliminates flicker by updating UI instantly before server responds
    onMutate: async ({ userId, bookId, bookTitle }) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.borrows.userRoot });

      // Get book details from cache (from book detail query)
      const bookData = queryClient.getQueryData<{
        id: string;
        title: string;
        author: string;
        genre: string;
        rating: number;
        totalCopies: number;
        availableCopies: number;
        description: string;
        coverColor: string;
        coverUrl: string;
        videoUrl: string;
        summary: string;
        isActive: boolean;
        createdAt: Date | null;
        updatedAt: Date | null;
        [key: string]: unknown;
      }>(queryKeys.books.detail(bookId));

      // Get all user-borrows queries for rollback
      const previousQueries: Array<{
        queryKey: QueryKey;
        data: unknown;
      }> = [];

      // Create optimistic PENDING record
      // CRITICAL: Match the exact format that the API returns
      const now = new Date(); // For timestamps and dates
      const optimisticRecord = {
        id: `temp-${Date.now()}`, // Temporary ID until server responds
        userId,
        bookId,
        borrowDate: now, // Date object (API returns timestamp, but React Query handles conversion)
        dueDate: null, // null for pending requests
        returnDate: null,
        status: "PENDING" as const,
        borrowedBy: null,
        returnedBy: null,
        fineAmount: "0", // String format to match API (decimal string)
        notes: null,
        renewalCount: 0,
        lastReminderSent: null,
        updatedAt: now, // Date object
        updatedBy: null,
        createdAt: now, // Date object
        // CRITICAL: Include book field from cache (API returns this in /api/borrow-records)
        book: bookData
          ? {
              id: bookData.id,
              title: bookData.title || bookTitle || "Unknown Book",
              author: bookData.author || "Unknown Author",
              genre: bookData.genre || "",
              rating: bookData.rating || 0,
              totalCopies: bookData.totalCopies || 0,
              availableCopies: bookData.availableCopies || 0,
              description: bookData.description || "",
              coverColor: bookData.coverColor || "",
              coverUrl: bookData.coverUrl || "",
              videoUrl: bookData.videoUrl || "",
              summary: bookData.summary || "",
              isActive: bookData.isActive ?? true,
              createdAt: bookData.createdAt,
              updatedAt: bookData.updatedAt,
            }
          : {
              id: bookId,
              title: bookTitle || "Unknown Book",
              author: "Unknown Author",
              genre: "",
              rating: 0,
              totalCopies: 0,
              availableCopies: 0,
              description: "",
              coverColor: "",
              coverUrl: "",
              videoUrl: "",
              summary: "",
              isActive: true,
              createdAt: null,
              updatedAt: null,
            },
      };

      // CRITICAL: Update ALL user-borrows queries for this user
      // This ensures we catch the query regardless of status filter (undefined, "PENDING", "BORROWED", etc.)
      // MyProfileTabs uses ["user-borrows", userId, undefined] but we update all to be safe
      queryClient
        .getQueryCache()
        .getAll()
        .forEach((query) => {
          const queryKey = query.queryKey;
          if (
            Array.isArray(queryKey) &&
            queryKey[0] === "user-borrows" &&
            queryKey[1] === userId
          ) {
            const existingData = query.state.data as
              | Array<{ id: string; [key: string]: unknown }>
              | undefined;

            if (existingData && Array.isArray(existingData)) {
              // Store previous data for rollback
              previousQueries.push({
                queryKey,
                data: structuredClone(existingData),
              });

              // Check if optimistic record already exists (prevent duplicates)
              const alreadyExists = existingData.some(
                (r) => r.id === optimisticRecord.id
              );
              if (!alreadyExists) {
                // Add optimistic record to the beginning of the array
                const updatedData = [optimisticRecord, ...existingData];
                queryClient.setQueryData(queryKey, updatedData);
              }
            } else {
              // Query exists but has no data yet - create it with optimistic record
              previousQueries.push({
                queryKey,
                data: undefined, // No previous data to rollback to
              });
              queryClient.setQueryData(queryKey, [optimisticRecord]);
            }
          }
        });

      // CRITICAL: Also ensure the main query exists even if it wasn't in the cache
      // This is the query key used by MyProfileTabs: ["user-borrows", userId, undefined]
      const mainQueryKey = queryKeys.borrows.user(userId);
      const mainQueryExists = queryClient.getQueryCache().find({
        queryKey: mainQueryKey,
      });

      if (!mainQueryExists || !mainQueryExists.state.data) {
        // Query doesn't exist or has no data - create/update it with optimistic record
        const existingMainData = queryClient.getQueryData(mainQueryKey) as
          | Array<{ id: string; [key: string]: unknown }>
          | undefined;

        if (!existingMainData || existingMainData.length === 0) {
          // Only add if not already added above
          const alreadyAdded = previousQueries.some(
            (q) => JSON.stringify(q.queryKey) === JSON.stringify(mainQueryKey)
          );
          if (!alreadyAdded) {
            previousQueries.push({
              queryKey: mainQueryKey,
              data: undefined,
            });
            queryClient.setQueryData(mainQueryKey, [optimisticRecord]);
          }
        }
      }

      // Return context for rollback
      return { previousQueries, optimisticRecordId: optimisticRecord.id };
    },
    onSuccess: async (_data, _variables, _context) => {
      await invalidateMutation(queryClient, "borrow.lifecycle");

      // Prefer mutate bookTitle, then book detail cache, else "this book"
      const cached = queryClient.getQueryData<{ title?: string }>(
        queryKeys.books.detail(_variables.bookId),
      );
      showToast.book.borrowSuccess(
        resolveActionBookTitle(_variables.bookTitle, cached?.title),
      );
    },
    // CRITICAL: Rollback optimistic update on error
    onError: (error: Error, variables, context) => {
      // Restore previous cache data
      if (context?.previousQueries) {
        context.previousQueries.forEach(({ queryKey, data }) => {
          queryClient.setQueryData(queryKey, data);
        });
      }

      const cached = queryClient.getQueryData<{ title?: string }>(
        queryKeys.books.detail(variables.bookId),
      );
      const bookTitle = resolveActionBookTitle(
        variables.bookTitle,
        cached?.title,
      );
      showToast.book.borrowError(
        error.message || `Unable to request "${bookTitle}". Please try again.`,
      );
    },
    // CRITICAL: No onSettled needed - we've already updated user-borrows cache optimistically
    // Invalidating it would cause unnecessary refetches and flicker
    // The optimistic update is sufficient, and the cache will sync naturally when queries refetch later
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
    onMutate: async ({ recordId }) => {
      // Instant PENDING → BORROWED so admin + profile lists do not flash empty.
      await queryClient.cancelQueries({
        queryKey: queryKeys.borrows.requestsRoot,
      });
      await queryClient.cancelQueries({ queryKey: queryKeys.borrows.userRoot });
      const previousRequests = queryClient.getQueriesData({
        queryKey: queryKeys.borrows.requestsRoot,
      });
      const previousUserBorrows = queryClient.getQueriesData({
        queryKey: queryKeys.borrows.userRoot,
      });
      const dueDate = (() => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        return d.toISOString().slice(0, 10);
      })();
      const patchStatus = (old: unknown) => {
        if (!Array.isArray(old)) return old;
        return old.map((row: { id?: string; status?: string }) =>
          row?.id === recordId
            ? { ...row, status: "BORROWED", dueDate }
            : row,
        );
      };
      queryClient.setQueriesData(
        { queryKey: queryKeys.borrows.requestsRoot },
        patchStatus,
      );
      queryClient.setQueriesData(
        { queryKey: queryKeys.borrows.userRoot },
        patchStatus,
      );
      return { previousRequests, previousUserBorrows };
    },
    onError: (error: Error, variables, context) => {
      if (context?.previousRequests) {
        for (const [key, data] of context.previousRequests) {
          queryClient.setQueryData(key, data);
        }
      }
      if (context?.previousUserBorrows) {
        for (const [key, data] of context.previousUserBorrows) {
          queryClient.setQueryData(key, data);
        }
      }
      const bookTitle = variables.bookTitle || "book";
      showToast.error(
        "Approval Failed",
        error.message ||
          `Unable to approve borrow request for "${bookTitle}". ${error.message.includes("no longer available") ? "The book is no longer available." : "Please try again."}`
      );
    },
    onSuccess: async (data, variables) => {
      // Await so row spinners stay until lists refetch
      await invalidateMutation(queryClient, "borrow.lifecycle");

      // Show success toast
      const bookTitle = variables.bookTitle || "Book";
      const userName = variables.userName || "User";
      showToast.success(
        "Borrow Request Approved",
        `${userName} can now borrow "${bookTitle}".`
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
    onMutate: async ({ recordId }) => {
      // Soft-cancel in cache immediately (row stays as CANCELLED, not deleted).
      await queryClient.cancelQueries({
        queryKey: queryKeys.borrows.requestsRoot,
      });
      await queryClient.cancelQueries({ queryKey: queryKeys.borrows.userRoot });
      const previousRequests = queryClient.getQueriesData({
        queryKey: queryKeys.borrows.requestsRoot,
      });
      const previousUserBorrows = queryClient.getQueriesData({
        queryKey: queryKeys.borrows.userRoot,
      });
      const patchStatus = (old: unknown) => {
        if (!Array.isArray(old)) return old;
        return old.map((row: { id?: string; status?: string }) =>
          row?.id === recordId ? { ...row, status: "CANCELLED" } : row,
        );
      };
      queryClient.setQueriesData(
        { queryKey: queryKeys.borrows.requestsRoot },
        patchStatus,
      );
      queryClient.setQueriesData(
        { queryKey: queryKeys.borrows.userRoot },
        patchStatus,
      );
      return { previousRequests, previousUserBorrows };
    },
    onError: (error: Error, variables, context) => {
      if (context?.previousRequests) {
        for (const [key, data] of context.previousRequests) {
          queryClient.setQueryData(key, data);
        }
      }
      if (context?.previousUserBorrows) {
        for (const [key, data] of context.previousUserBorrows) {
          queryClient.setQueryData(key, data);
        }
      }
      const bookTitle = variables.bookTitle || "book";
      showToast.error(
        "Rejection Failed",
        error.message ||
          `Unable to reject borrow request for "${bookTitle}". Please try again.`
      );
    },
    onSuccess: async (data, variables) => {
      await invalidateMutation(queryClient, "borrow.lifecycle");

      const bookTitle = variables.bookTitle || "Book";
      const userName = variables.userName || "User";
      showToast.success(
        "Borrow Request Rejected",
        `Borrow request for "${bookTitle}" by ${userName} has been rejected.`
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
    // CRITICAL: No optimistic updates - just invalidate to trigger fresh API fetch
    // This ensures we always have fresh data from server (1 blink is acceptable)
    onSuccess: async (data, variables) => {
      await invalidateMutation(queryClient, "borrow.lifecycle");

      const bookTitle = resolveActionBookTitle(variables.bookTitle);
      if (
        data?.isOverdue &&
        data.daysOverdue !== undefined &&
        data.fineAmount !== undefined
      ) {
        showToast.book.returnWithFine(
          bookTitle,
          data.daysOverdue,
          data.fineAmount,
        );
      } else {
        showToast.book.returnSuccess(bookTitle);
      }
    },
    // CRITICAL: Show error toast on failure
    onError: (error: Error, variables) => {
      const bookTitle = resolveActionBookTitle(variables.bookTitle);
      showToast.book.returnError(
        error.message || `Unable to return "${bookTitle}". Please try again.`,
      );
    },
    // CRITICAL: No onSettled needed - we've already updated user-borrows cache optimistically
    // Invalidating it would cause unnecessary refetches and flicker
    // The optimistic update is sufficient, and the cache will sync naturally when queries refetch later
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
    onSuccess: (_data, variables) => {
      // Invalidate all related queries (reviews, books, analytics)
      invalidateMutation(queryClient, "review.write");

      const cached = queryClient.getQueryData<{ title?: string }>(
        queryKeys.books.detail(variables.bookId),
      );
      showToast.book.reviewSuccess(
        resolveActionBookTitle(variables.bookTitle, cached?.title),
      );
    },
    onError: (error: Error, variables) => {
      const cached = queryClient.getQueryData<{ title?: string }>(
        queryKeys.books.detail(variables.bookId),
      );
      const bookTitle = resolveActionBookTitle(
        variables.bookTitle,
        cached?.title,
      );
      showToast.book.reviewError(
        error.message ||
          `Unable to submit review for "${bookTitle}". ${error.message.includes("already reviewed") ? "You have already reviewed this book." : error.message.includes("borrowed") ? "You must have borrowed this book to review it." : "Please try again."}`,
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
      rating,
      comment,
    }: {
      reviewId: string;
      bookId?: string;
      bookTitle?: string;
    } & UpdateReviewInput) => {
      return updateReview(reviewId, { rating, comment });
    },
    onMutate: async (variables) => {
      if (!variables.bookId) return {};
      const key = queryKeys.reviews.book(variables.bookId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<
        Array<{
          id: string;
          rating: number;
          comment: string;
          updatedAt: Date | null;
        }>
      >(key);
      if (previous) {
        queryClient.setQueryData(
          key,
          previous.map((r) =>
            r.id === variables.reviewId
              ? {
                  ...r,
                  rating: variables.rating,
                  comment: variables.comment,
                  updatedAt: new Date(),
                }
              : r,
          ),
        );
      }
      return { previous, key };
    },
    onSuccess: (_data, variables) => {
      invalidateMutation(queryClient, "review.write");
      const cached = variables.bookId
        ? queryClient.getQueryData<{ title?: string }>(
            queryKeys.books.detail(variables.bookId),
          )
        : undefined;
      showToast.book.reviewUpdated(
        resolveActionBookTitle(variables.bookTitle, cached?.title),
      );
    },
    onError: (error: Error, variables, context) => {
      if (context?.previous && context.key) {
        queryClient.setQueryData(context.key, context.previous);
      }
      const cached = variables.bookId
        ? queryClient.getQueryData<{ title?: string }>(
            queryKeys.books.detail(variables.bookId),
          )
        : undefined;
      const bookTitle = resolveActionBookTitle(
        variables.bookTitle,
        cached?.title,
      );
      showToast.error(
        "Update Failed",
        error.message ||
          `Unable to update review for "${bookTitle}". ${error.message.includes("not found") || error.message.includes("permission") ? "Review not found or you don't have permission to edit it." : "Please try again."}`,
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
      bookId?: string;
      bookTitle?: string;
    }) => {
      return deleteReview(reviewId);
    },
    onMutate: async (variables) => {
      if (!variables.bookId) return {};
      const key = queryKeys.reviews.book(variables.bookId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Array<{ id: string }>>(key);
      if (previous) {
        queryClient.setQueryData(
          key,
          previous.filter((r) => r.id !== variables.reviewId),
        );
      }
      return { previous, key };
    },
    onSuccess: (_data, variables) => {
      invalidateMutation(queryClient, "review.write");
      const cached = variables.bookId
        ? queryClient.getQueryData<{ title?: string }>(
            queryKeys.books.detail(variables.bookId),
          )
        : undefined;
      showToast.book.reviewDeleted(
        resolveActionBookTitle(variables.bookTitle, cached?.title),
      );
    },
    onError: (error: Error, variables, context) => {
      if (context?.previous && context.key) {
        queryClient.setQueryData(context.key, context.previous);
      }
      const cached = variables.bookId
        ? queryClient.getQueryData<{ title?: string }>(
            queryKeys.books.detail(variables.bookId),
          )
        : undefined;
      const bookTitle = resolveActionBookTitle(
        variables.bookTitle,
        cached?.title,
      );
      showToast.error(
        "Deletion Failed",
        error.message ||
          `Unable to delete review for "${bookTitle}". ${error.message.includes("not found") || error.message.includes("permission") ? "Review not found or you don't have permission to delete it." : "Please try again."}`,
      );
    },
  });
};

/**
 * Admin approve/reject decision on a book review. Patches the admin queue
 * list + detail cache instantly, then invalidates review.write so the
 * public book page (viewer's PENDING → hidden/visible) and My Reviews stay
 * in sync across every open tab. Parent: CR-0003 / REQ-0034
 */
export const useModerateReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reviewId,
      status,
    }: {
      reviewId: string;
      status: "APPROVED" | "REJECTED";
      bookTitle?: string;
    }) => moderateReview(reviewId, status),
    onSuccess: (data, variables) => {
      queryClient.setQueriesData<AdminBookReviewItem[]>(
        { queryKey: queryKeys.reviews.adminRoot },
        (previous) =>
          previous?.map((r) =>
            r.id === variables.reviewId
              ? { ...r, status: data.status, reviewedAt: data.reviewedAt }
              : r,
          ),
      );
      queryClient.setQueryData<AdminBookReviewItem>(
        queryKeys.reviews.adminDetail(variables.reviewId),
        (previous) =>
          previous
            ? { ...previous, status: data.status, reviewedAt: data.reviewedAt }
            : previous,
      );
      invalidateMutation(queryClient, "review.write");
      showToast.success(
        variables.status === "APPROVED" ? "Review approved" : "Review rejected",
        `The review for "${resolveActionBookTitle(variables.bookTitle)}" was ${variables.status.toLowerCase()}.`,
      );
    },
    onError: (error: Error) => {
      showToast.error(
        "Moderation failed",
        error.message || "Unable to update review status. Please try again.",
      );
    },
  });
};

/**
 * Hook for a signed-in user to submit an admin-access request.
 * Invalidates admin-request.write and shows dynamic success/error toasts.
 */
export const useCreateAdminRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestReason,
    }: {
      requestReason: string;
      userEmail?: string;
    }) => {
      const result = await createAdminRequest(requestReason);
      if (!result.success) {
        throw new Error(result.error || "Failed to create admin request");
      }
      return result;
    },
    onSuccess: async (_data, variables) => {
      await invalidateMutation(queryClient, "admin-request.write");
      showToast.admin.requestSubmitted(variables.userEmail);
    },
    onError: (error: Error) => {
      showToast.admin.requestError(
        error.message || "Unable to submit your admin request. Please try again.",
      );
    },
  });
};

/**
 * Applicant withdraws their own PENDING admin request.
 */
export const useCancelMyAdminRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId }: { requestId: string }) => {
      const result = await cancelMyAdminRequest(requestId);
      if (!result.success) {
        throw new Error(result.error || "Failed to cancel admin request");
      }
      return result;
    },
    onSuccess: async () => {
      await invalidateMutation(queryClient, "admin-request.write");
      showToast.admin.requestCancelled();
    },
    onError: (error: Error) => {
      showToast.admin.requestError(
        error.message || "Unable to cancel your admin request. Please try again.",
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
 *   userName: "John Doe", // Optional, for toast message
 * });
 * ```
 */
export const useApproveAdminRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId }: {
      requestId: string;
      userName?: string; // Optional, for toast message
    }) => {
      const result = await approveAdminRequest(requestId);
      if (!result.success) {
        throw new Error(result.error || "Failed to approve admin request");
      }
      return result.data;
    },
    onSuccess: async (data, variables) => {
      // Await so dialogs stay open until pending + recent lists refetch
      await invalidateMutation(queryClient, "admin-request.write");

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
      rejectionReason,
    }: {
      requestId: string;
      rejectionReason?: string; // Optional rejection reason
      userName?: string; // Optional, for toast message
    }) => {
      const result = await rejectAdminRequest(requestId, rejectionReason);
      if (!result.success) {
        throw new Error(result.error || "Failed to reject admin request");
      }
      return result.data;
    },
    onSuccess: async (data, variables) => {
      await invalidateMutation(queryClient, "admin-request.write");

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
 *   userName: "John Doe", // Optional, for toast message
 * });
 * ```
 */
export const useRemoveAdminPrivileges = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId }: {
      userId: string;
      userName?: string; // Optional, for toast message
    }) => {
      const result = await removeAdminPrivileges(userId);
      if (!result.success) {
        throw new Error(result.error || "Failed to remove admin privileges");
      }
      return { userId };
    },
    onSuccess: async (data, variables) => {
      await invalidateMutation(queryClient, "admin-request.write");

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
 * });
 * ```
 */
export const useUpdateFineConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fineAmount }: {
      fineAmount: number;
    }) => {
      const config = await updateFineConfig(fineAmount);
      return config;
    },
    onSuccess: (data, variables) => {
      // Invalidate all related queries (admin stats, fine config, borrows)
      invalidateMutation(queryClient, "fine.write");

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
      invalidateMutation(queryClient, "operations.write");

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
      invalidateMutation(queryClient, "operations.write");

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
      invalidateMutation(queryClient, "fine.write");

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
      invalidateMutation(queryClient, "recommendation.write");

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
      invalidateMutation(queryClient, "recommendation.write");

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
 * Marks recommendation queries stale so active consumers refetch from the database.
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
      invalidateMutation(queryClient, "recommendation.write");

      showToast.success(
        "Recommendations Refreshed",
        data.message
      );
    },
    onError: (error: Error) => {
      // Show error toast
      showToast.error(
        "Failed to Refresh Cache",
        error.message ||
          "Unable to refresh recommendation cache. Please try again."
      );
    },
  });
};

// Notifications (bell) mutations
/**
 * Marks a single notification as read. Optimistically patches every cached
 * notifications list + decrements the unread badge count immediately.
 */
export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      await markNotificationRead(id);
      return { id };
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.root });
      const previousLists = queryClient.getQueriesData<NotificationItem[]>({
        queryKey: queryKeys.notifications.root,
      });
      const previousCount = queryClient.getQueryData<number>(
        queryKeys.notifications.unreadCount,
      );

      let wasUnread = false;
      queryClient.setQueriesData<NotificationItem[]>(
        { queryKey: queryKeys.notifications.root },
        (old) =>
          old?.map((n) => {
            if (n.id !== id) return n;
            wasUnread = !n.isRead;
            return { ...n, isRead: true, readAt: new Date().toISOString() };
          }),
      );
      if (wasUnread) {
        queryClient.setQueryData<number>(
          queryKeys.notifications.unreadCount,
          (old) => Math.max(0, (old ?? 1) - 1),
        );
      }

      return { previousLists, previousCount };
    },
    onError: (_error, _variables, context) => {
      context?.previousLists?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(
          queryKeys.notifications.unreadCount,
          context.previousCount,
        );
      }
    },
    onSuccess: () => {
      invalidateNotificationsQueries(queryClient);
    },
  });
};

/**
 * Marks every notification for the signed-in user as read ("Mark all read").
 */
export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await markAllNotificationsRead();
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.root });
      const previousLists = queryClient.getQueriesData<NotificationItem[]>({
        queryKey: queryKeys.notifications.root,
      });
      const previousCount = queryClient.getQueryData<number>(
        queryKeys.notifications.unreadCount,
      );

      queryClient.setQueriesData<NotificationItem[]>(
        { queryKey: queryKeys.notifications.root },
        (old) =>
          old?.map((n) =>
            n.isRead ? n : { ...n, isRead: true, readAt: new Date().toISOString() },
          ),
      );
      queryClient.setQueryData<number>(queryKeys.notifications.unreadCount, 0);

      return { previousLists, previousCount };
    },
    onError: (error: Error, _variables, context) => {
      context?.previousLists?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(
          queryKeys.notifications.unreadCount,
          context.previousCount,
        );
      }
      showToast.error(
        "Update Failed",
        error.message || "Unable to mark all notifications as read.",
      );
    },
    onSuccess: () => {
      invalidateNotificationsQueries(queryClient);
    },
  });
};

// Support Ticket mutations
/** Creates a ticket (APPROVED actor only — enforced server-side). */
export const useCreateSupportTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTicketInput) => createSupportTicket(input),
    onSuccess: async (ticket) => {
      // Snapshot BEFORE invalidate — removeQueries would otherwise leave densify
      // with only the new row and sibling tickets flash in after refetch.
      const baselines = snapshotTicketListBaselines(queryClient);
      await invalidateMutation(queryClient, "ticket.write");
      patchTicketCachesOnCreate(queryClient, ticket, baselines);
      showToast.success(
        "Ticket Submitted",
        "Your support ticket has been submitted. We'll get back to you soon.",
      );
    },
    onError: (error: Error) => {
      showToast.error(
        "Submission Failed",
        error.message || "Unable to submit your ticket. Please try again.",
      );
    },
  });
};

/**
 * Updates a ticket (content, status/priority/assignment/notes — server enforces
 * who may change which fields). Densifies detail + list rows before invalidate
 * so badges/KPIs update instantly.
 */
export const useUpdateSupportTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticketId,
      ...input
    }: { ticketId: string } & UpdateTicketInput) =>
      updateSupportTicket(ticketId, input),
    onMutate: async ({ ticketId, ...input }) => {
      const key = queryKeys.tickets.detail(ticketId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<SupportTicketDetail>(key);
      if (previous) {
        queryClient.setQueryData<SupportTicketDetail>(key, {
          ...previous,
          ...input,
        });
      }
      return { previous, key, previousStatus: previous?.status };
    },
    onSuccess: async (data, _variables, context) => {
      const previousStatus =
        context?.previousStatus ?? findCachedTicketStatus(queryClient, data.id);
      const baselines = snapshotTicketListBaselines(queryClient);
      await invalidateMutation(queryClient, "ticket.write");
      patchTicketCachesOnUpdate(queryClient, data, previousStatus, baselines);
      showToast.success("Ticket Updated", "The ticket has been updated.");
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previous && context.key) {
        queryClient.setQueryData(context.key, context.previous);
      }
      showToast.error(
        "Update Failed",
        error.message || "Unable to update the ticket. Please try again.",
      );
    },
  });
};

/** Deletes a ticket (admin any time; creator while OPEN or IN_PROGRESS). */
export const useDeleteSupportTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticketId }: { ticketId: string }) => {
      const previousStatus = findCachedTicketStatus(queryClient, ticketId);
      const detail = queryClient.getQueryData<SupportTicketDetail>(
        queryKeys.tickets.detail(ticketId),
      );
      await deleteSupportTicket(ticketId);
      return { ticketId, previousStatus, userId: detail?.userId ?? null };
    },
    onSuccess: async ({ ticketId, previousStatus, userId }) => {
      const baselines = snapshotTicketListBaselines(queryClient);
      await invalidateMutation(queryClient, "ticket.write");
      patchTicketCachesOnDelete(
        queryClient,
        ticketId,
        previousStatus,
        userId,
        baselines,
      );
      showToast.success("Ticket Deleted", "The ticket has been deleted.");
    },
    onError: (error: Error) => {
      showToast.error(
        "Deletion Failed",
        error.message || "Unable to delete the ticket. Please try again.",
      );
    },
  });
};

/** Posts a reply and densifies the thread + list replyCount after invalidate. */
export const useCreateSupportTicketReply = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticketId, body }: { ticketId: string; body: string }) =>
      createSupportTicketReply(ticketId, body),
    onSuccess: async (replies, variables) => {
      const detail = queryClient.getQueryData<SupportTicketDetail>(
        queryKeys.tickets.detail(variables.ticketId),
      );
      const baselines = snapshotTicketListBaselines(queryClient);
      await invalidateMutation(queryClient, "ticket.write");
      patchTicketCachesOnReply(
        queryClient,
        variables.ticketId,
        replies,
        detail?.userId ?? null,
        baselines,
      );
    },
    onError: (error: Error) => {
      showToast.error(
        "Reply Failed",
        error.message || "Unable to send your reply. Please try again.",
      );
    },
  });
};

/**
 * Removes a notification from the bell list.
 */
export const useDeleteNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      await deleteNotification(id);
      return { id };
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.root });
      const previousLists = queryClient.getQueriesData<NotificationItem[]>({
        queryKey: queryKeys.notifications.root,
      });
      const previousCount = queryClient.getQueryData<number>(
        queryKeys.notifications.unreadCount,
      );

      let wasUnread = false;
      queryClient.setQueriesData<NotificationItem[]>(
        { queryKey: queryKeys.notifications.root },
        (old) => {
          const removed = old?.find((n) => n.id === id);
          if (removed && !removed.isRead) wasUnread = true;
          return old?.filter((n) => n.id !== id);
        },
      );
      if (wasUnread) {
        queryClient.setQueryData<number>(
          queryKeys.notifications.unreadCount,
          (old) => Math.max(0, (old ?? 1) - 1),
        );
      }

      return { previousLists, previousCount };
    },
    onError: (error: Error, _variables, context) => {
      context?.previousLists?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(
          queryKeys.notifications.unreadCount,
          context.previousCount,
        );
      }
      showToast.error(
        "Deletion Failed",
        error.message || "Unable to delete notification.",
      );
    },
    onSuccess: () => {
      invalidateNotificationsQueries(queryClient);
    },
  });
};
