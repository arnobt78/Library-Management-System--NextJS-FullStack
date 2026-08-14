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
import { borrowBook, cancelPendingBorrowRequest } from "@/lib/actions/book";
import {
  createReview,
  updateReview,
  deleteReview,
  moderateReview,
  type CreateReviewInput,
  type UpdateReviewInput,
  type ReviewEligibility,
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
import type { AdminRequest } from "@/lib/services/users";
import {
  densifyNotificationDelete,
  densifyNotificationMarkAllRead,
  densifyNotificationMarkRead,
} from "@/lib/utils/patchNotificationCaches";
import {
  createSupportTicket,
  updateSupportTicket,
  deleteSupportTicket,
  createSupportTicketReply,
  type CreateTicketInput,
  type UpdateTicketInput,
} from "@/lib/services/supportTickets";
import { resolveActionBookTitle, showToast } from "@/lib/toast";
import { commitMutationCache } from "@/lib/query/mutationGateway";
import {
  densifyBookDelete,
  densifyBookWrite,
  prependBookAuditEvent,
} from "@/lib/utils/patchBookCaches";
import { densifyUserWrite, densifyUserRegistrationPending } from "@/lib/utils/patchUserCaches";
import {
  densifyAdminDirectGrant,
  densifyAdminPrivilegeRevoke,
  densifyAdminRequestCreate,
  densifyAdminRequestDecision,
  densifyAdminRequestRemovePending,
} from "@/lib/utils/patchAdminRequestCaches";
import {
  ADMIN_REQUEST_DIRECT_GRANT_REASON,
  ADMIN_REQUEST_REVOKED_REASON,
} from "@/lib/admin/adminRequestConstants";
import {
  densifyFineConfig,
  densifyOverdueFines,
} from "@/lib/utils/patchFineCaches";
import { densifyReminderStats } from "@/lib/utils/patchOpsCaches";
import { densifyRecommendationWrite } from "@/lib/utils/patchRecommendationCaches";
import {
  densifyTicketDetailAudit,
  findCachedTicketStatus,
  patchTicketCachesOnCreate,
  patchTicketCachesOnDelete,
  patchTicketCachesOnReply,
  patchTicketCachesOnUpdate,
  snapshotTicketListBaselines,
} from "@/lib/utils/patchTicketCaches";
import {
  findCachedAdminReview,
  patchReviewCachesOnCreate,
  patchReviewCachesOnDelete,
  patchReviewCachesOnModerate,
  patchReviewCachesOnUpdate,
  prependReviewAuditEvent,
  snapshotReviewListBaselines,
} from "@/lib/utils/patchReviewCaches";
import { resolveReviewModeratorForDensify } from "@/lib/utils/resolveReviewModerator";
import {
  clearDensifiedEmpty,
  markDensifiedEmpty,
} from "@/lib/utils/queryCacheLists";
import {
  applyOptimisticSignupDecision,
  rollbackOptimisticSignupDecision,
} from "@/lib/query/optimisticSignupDecision";
import {
  applyOptimisticAdminRequestDecision,
  rollbackOptimisticAdminRequestDecision,
} from "@/lib/query/optimisticAdminRequestDecision";
import {
  findCachedBorrowMeta,
  patchBookInventory,
  patchBorrowCachesOnCreate,
  patchBorrowCachesOnStatusChange,
  prependBorrowAuditEvent,
  snapshotBorrowCacheBaselines,
  snapshotBorrowListBaselines,
} from "@/lib/utils/patchBorrowCaches";
import { applyReturnInventoryDensify } from "@/lib/utils/applyReturnInventoryDensify";
import { densifyActivityLog } from "@/lib/utils/patchActivityCaches";
import {
  resolveActivityActor,
  type ActivityActorFields,
} from "@/lib/admin/resolveDecisionActor";
import type { AdminRequestReviewer } from "@/lib/admin/adminRequestTypes";
// BookParams is a global type from types.d.ts, no import needed

/**
 * Activity densify actor — SSR decisionActor card preferred (JWT has no card).
 * Parent: Activity avatar densify fix
 */
function activityActorFromSession(
  session: { user?: SessionUser } | null | undefined,
  decisionActor?: {
    id?: string | null;
    fullName?: string | null;
    email?: string | null;
    universityCard?: string | null;
  } | null,
): ActivityActorFields | Record<string, never> {
  const normalized: AdminRequestReviewer | null =
    decisionActor?.email && (decisionActor.fullName || decisionActor.email)
      ? {
          id: decisionActor.id ?? null,
          fullName: decisionActor.fullName?.trim() || "Admin",
          email: decisionActor.email,
          universityCard: decisionActor.universityCard ?? null,
        }
      : null;
  return resolveActivityActor(session?.user, normalized);
}

/** Session/SSR actor for borrow approve/return densify (email fields + PersonAttribution). */
type BorrowLifecycleActor = {
  id: string;
  fullName: string;
  email: string;
  universityCard: string | null;
};

function resolveBorrowLifecycleActor(
  decisionActor:
    | {
        id?: string | null;
        fullName?: string | null;
        email?: string | null;
        universityCard?: string | null;
      }
    | null
    | undefined,
  session: { user?: SessionUser } | null | undefined,
): BorrowLifecycleActor | null {
  if (decisionActor?.email && decisionActor.id) {
    return {
      id: decisionActor.id,
      fullName: decisionActor.fullName?.trim() || "Admin",
      email: decisionActor.email,
      universityCard: decisionActor.universityCard ?? null,
    };
  }
  const su = session?.user;
  if (!su?.id || !su.email) return null;
  return {
    id: su.id,
    fullName: su.name?.trim() || "Admin",
    email: su.email,
    universityCard: null,
  };
}

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
  const { data: session } = useSession();

  return useMutation({
    mutationFn: async (params: BookParams) => {
      const result = await createBook(params);
      if (!result.success) {
        throw new Error(result.message || "Failed to create book");
      }
      return result.data;
    },
    onSuccess: async (data, variables) => {
      // Gateway: invalidate domains then densify detail/admin list.
      await commitMutationCache(queryClient, "book.write", {
        snapshot: () => undefined,
        densify: () => {
          const actorFields = activityActorFromSession(session);
          const fromAction =
            data &&
            typeof data === "object" &&
            "updatedByActor" in data &&
            data.updatedByActor &&
            typeof data.updatedByActor === "object" &&
            "email" in data.updatedByActor &&
            typeof (data.updatedByActor as { email?: unknown }).email ===
              "string"
              ? (data.updatedByActor as {
                  id: string;
                  fullName: string;
                  email: string;
                  universityCard: string | null;
                })
              : null;
          // Prefer DB actor from action; session email fallback (JWT has no card).
          const sessionActor =
            !fromAction &&
            "actorEmail" in actorFields &&
            actorFields.actorEmail
              ? {
                  id: actorFields.actorId ?? "",
                  fullName: actorFields.actorName?.trim() || "Admin",
                  email: actorFields.actorEmail,
                  universityCard: actorFields.actorUniversityCard ?? null,
                }
              : null;
          const catalogActor = fromAction ?? sessionActor ?? undefined;
          // Create stamps both Added-by and Updated-by to the same admin DNA.
          densifyBookWrite(queryClient, {
            ...(data && typeof data === "object" ? data : {}),
            ...(catalogActor
              ? {
                  createdByActor: catalogActor,
                  updatedByActor: catalogActor,
                }
              : {}),
          });
          if (data?.id) {
            prependBookAuditEvent(queryClient, {
              bookId: data.id,
              action: "CREATE",
              details: {
                title: variables.title,
                ...(variables.author ? { author: variables.author } : {}),
              },
              ...actorFields,
            });
          }
          densifyActivityLog(queryClient, {
            ...actorFields,
            action: "CREATE",
            entityType: "book",
            entityId: data?.id ?? null,
            details: {
              title: variables.title,
              ...(variables.author ? { author: variables.author } : {}),
            },
          });
        },
      });

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
  const { data: session } = useSession();

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
    onSuccess: async (data, variables) => {
      const bookTitle = variables.title || data?.title || "Book";
      await commitMutationCache(queryClient, "book.write", {
        snapshot: () => undefined,
        densify: () => {
          const actorFields = activityActorFromSession(session);
          const fromAction =
            data &&
            typeof data === "object" &&
            "updatedByActor" in data &&
            data.updatedByActor &&
            typeof data.updatedByActor === "object" &&
            "email" in data.updatedByActor &&
            typeof (data.updatedByActor as { email?: unknown }).email ===
              "string"
              ? (data.updatedByActor as {
                  id: string;
                  fullName: string;
                  email: string;
                  universityCard: string | null;
                })
              : null;
          // Prefer DB actor from action; session email fallback (JWT has no card).
          const sessionActor =
            !fromAction &&
            "actorEmail" in actorFields &&
            actorFields.actorEmail
              ? {
                  id: actorFields.actorId ?? "",
                  fullName: actorFields.actorName?.trim() || "Admin",
                  email: actorFields.actorEmail,
                  universityCard: actorFields.actorUniversityCard ?? null,
                }
              : null;
          const updatedByActor = fromAction ?? sessionActor ?? undefined;
          densifyBookWrite(queryClient, {
            id: variables.bookId,
            ...(data && typeof data === "object" ? data : {}),
            ...(variables.title ? { title: variables.title } : {}),
            ...(updatedByActor ? { updatedByActor } : {}),
          });
          prependBookAuditEvent(queryClient, {
            bookId: variables.bookId,
            action: "UPDATE",
            details: { title: bookTitle },
            ...actorFields,
          });
          densifyActivityLog(queryClient, {
            ...actorFields,
            action: "UPDATE",
            entityType: "book",
            entityId: variables.bookId,
            details: { title: bookTitle },
          });
        },
      });

      // Show success toast with updated title (or fallback to bookId)
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
  const { data: session } = useSession();

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
    onSuccess: async (data, variables) => {
      const count = data.bookIds.length;
      await commitMutationCache(queryClient, "book.write", {
        snapshot: () => undefined,
        densify: () => {
          densifyBookDelete(queryClient, data.bookIds);
          densifyActivityLog(queryClient, {
            ...activityActorFromSession(session),
            action: "DELETE",
            entityType: "book",
            entityId: count === 1 ? data.bookIds[0] : null,
            details: {
              count,
              ...(variables.bookTitle ? { title: variables.bookTitle } : {}),
            },
          });
        },
      });

      // Show success toast
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
  const { data: session } = useSession();

  return useMutation({
    mutationFn: async ({
      userId,
      role,
    }: {
      userId: string;
      role: "USER" | "ADMIN";
      userName?: string; // Optional, for toast message
      userEmail?: string;
      userUniversityCard?: string | null;
      /** SSR currentAdmin — merge card when ledger reviewer lacks universityCard. */
      decisionActor?: {
        id?: string | null;
        fullName: string;
        email: string;
        universityCard?: string | null;
      } | null;
    }) => {
      const result = await updateUserRole(userId, role);
      if (!result.success) {
        throw new Error(
          ("error" in result && result.error) || "Failed to update user role",
        );
      }
      return {
        userId,
        role,
        ledger: "data" in result ? result.data : undefined,
      };
    },
    onSuccess: async (data, variables) => {
      // Role + admin_requests ledger — densify role + Recent decisions on promote.
      await commitMutationCache(queryClient, "admin-request.write", {
        snapshot: () => undefined,
        densify: () => {
          densifyUserWrite(queryClient, {
            userId: data.userId,
            role: data.role,
          });
          densifyActivityLog(queryClient, {
            ...activityActorFromSession(session),
            action: "UPDATE",
            entityType: "admin-request",
            entityId: data.ledger?.requestId ?? null,
            details: {
              role: data.role,
              status: data.role === "ADMIN" ? "APPROVED" : "REVOKED",
              userId: data.userId,
            },
          });
          if (!data.ledger) return;
          const ledgerCard =
            "userUniversityCard" in data.ledger &&
            typeof data.ledger.userUniversityCard === "string"
              ? data.ledger.userUniversityCard
              : null;
          const reviewer = data.ledger.reviewer
            ? {
                ...data.ledger.reviewer,
                universityCard:
                  data.ledger.reviewer.universityCard ??
                  variables.decisionActor?.universityCard ??
                  null,
              }
            : null;
          // Promote returns direct-grant ledger; demote via updateUserRole(USER)
          // delegates to removeAdminPrivileges and returns revoke ledger.
          if (data.role === "ADMIN") {
            densifyAdminDirectGrant(queryClient, {
              id: data.ledger.requestId,
              userId: data.ledger.userId,
              userEmail: data.ledger.userEmail,
              userFullName: data.ledger.userFullName,
              userUniversityCard:
                ledgerCard ?? variables.userUniversityCard ?? null,
              requestReason: ADMIN_REQUEST_DIRECT_GRANT_REASON,
              status: "APPROVED",
              reviewedBy: data.ledger.reviewedBy,
              reviewedAt: new Date(data.ledger.decidedAt),
              rejectionReason: null,
              createdAt: new Date(data.ledger.decidedAt),
              updatedAt: new Date(data.ledger.decidedAt),
              reviewer,
            });
            return;
          }
          densifyAdminPrivilegeRevoke(queryClient, {
            id: data.ledger.requestId,
            userId: data.ledger.userId,
            userEmail: data.ledger.userEmail,
            userFullName: data.ledger.userFullName,
            userUniversityCard: ledgerCard ?? variables.userUniversityCard ?? null,
            requestReason: ADMIN_REQUEST_DIRECT_GRANT_REASON,
            status: "REJECTED",
            reviewedBy: data.ledger.reviewedBy,
            reviewedAt: new Date(data.ledger.decidedAt),
            rejectionReason: ADMIN_REQUEST_REVOKED_REASON,
            createdAt: new Date(data.ledger.decidedAt),
            updatedAt: new Date(data.ledger.decidedAt),
            reviewer,
          });
        },
      });

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
  const { data: session } = useSession();

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
      await commitMutationCache(queryClient, "user.write", {
        snapshot: () => undefined,
        densify: () => {
          densifyUserWrite(queryClient, {
            userId: data.userId,
            status: data.status,
          });
          densifyActivityLog(queryClient, {
            ...activityActorFromSession(session),
            action: "UPDATE",
            entityType: "user",
            entityId: data.userId,
            details: { status: data.status },
          });
        },
      });

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
      // Optimistic already removed pending row — pass explicit fromStatus for overview KPIs.
      await commitMutationCache(queryClient, "user.write", {
        snapshot: () => undefined,
        densify: () => {
          densifyUserWrite(queryClient, {
            userId: variables.userId,
            status: "APPROVED",
            fromStatus: "PENDING",
            reviewer: variables.decisionActor
              ? {
                  id: variables.decisionActor.id ?? "",
                  fullName: variables.decisionActor.fullName,
                  email: variables.decisionActor.email,
                  universityCard:
                    variables.decisionActor.universityCard ?? null,
                }
              : null,
            statusReviewedAt: new Date().toISOString(),
          });
          densifyActivityLog(queryClient, {
            ...activityActorFromSession(session),
            action: "UPDATE",
            entityType: "user",
            entityId: variables.userId,
            details: { status: "APPROVED" },
          });
        },
      });
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
      await commitMutationCache(queryClient, "user.write", {
        snapshot: () => undefined,
        densify: () => {
          densifyUserWrite(queryClient, {
            userId: variables.userId,
            status: "REJECTED",
            fromStatus: "PENDING",
            reviewer: variables.decisionActor
              ? {
                  id: variables.decisionActor.id ?? "",
                  fullName: variables.decisionActor.fullName,
                  email: variables.decisionActor.email,
                  universityCard:
                    variables.decisionActor.universityCard ?? null,
                }
              : null,
            statusReviewedAt: new Date().toISOString(),
          });
          densifyActivityLog(queryClient, {
            ...activityActorFromSession(session),
            action: "UPDATE",
            entityType: "user",
            entityId: variables.userId,
            details: { status: "REJECTED" },
          });
        },
      });
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
  const { data: session } = useSession();

  return useMutation({
    mutationFn: async () => {
      const result = await requestRegistrationReview();
      if (!result.success) {
        throw new Error(result.error || "Failed to request approval again");
      }
      return result;
    },
    onSuccess: async () => {
      const userId = (session?.user as SessionUser | undefined)?.id;
      await commitMutationCache(queryClient, "user.write", {
        snapshot: () => undefined,
        densify: () => {
          if (userId) densifyUserRegistrationPending(queryClient, userId);
          densifyActivityLog(queryClient, {
            ...activityActorFromSession(session),
            action: "UPDATE",
            entityType: "user",
            entityId: userId ?? null,
            details: { status: "PENDING" },
          });
        },
      });
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
  const { data: session } = useSession();

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
    onSuccess: async (data, variables, context) => {
      const tempId = context?.optimisticRecordId as string | undefined;
      const serverRecord = Array.isArray(data) ? data[0] : data;
      const su = session?.user as SessionUser | undefined;
      const bookCached = queryClient.getQueryData<{
        title?: string;
        author?: string;
        genre?: string;
        coverUrl?: string | null;
        coverColor?: string | null;
      }>(queryKeys.books.detail(variables.bookId));
      await commitMutationCache(queryClient, "borrow.lifecycle", {
        snapshot: snapshotBorrowListBaselines,
        densify: (baselines) => {
          if (
            tempId &&
            serverRecord &&
            typeof serverRecord === "object" &&
            "id" in serverRecord
          ) {
            // Enrich thin server.returning() so admin Borrow Queue paints book/user.
            patchBorrowCachesOnCreate(
              queryClient,
              {
                userId: variables.userId,
                tempId,
                serverRecord: {
                  ...(serverRecord as { id: string }),
                  bookId:
                    (serverRecord as { bookId?: string }).bookId ??
                    variables.bookId,
                  userId:
                    (serverRecord as { userId?: string }).userId ??
                    variables.userId,
                },
                requestMeta: {
                  userName: su?.name?.trim() || "User",
                  userEmail: su?.email ?? "",
                  userUniversityId:
                    typeof (su as { universityId?: unknown } | undefined)
                      ?.universityId === "number"
                      ? (su as { universityId: number }).universityId
                      : 0,
                  bookTitle: variables.bookTitle ?? bookCached?.title,
                  bookAuthor: bookCached?.author,
                  bookGenre: bookCached?.genre,
                  bookCoverUrl: bookCached?.coverUrl ?? null,
                  bookCoverColor: bookCached?.coverColor ?? null,
                },
              },
              baselines,
            );
          }
          densifyActivityLog(queryClient, {
            ...activityActorFromSession(session),
            action: "CREATE",
            entityType: "borrow",
            entityId:
              serverRecord &&
              typeof serverRecord === "object" &&
              "id" in serverRecord &&
              typeof (serverRecord as { id?: unknown }).id === "string"
                ? (serverRecord as { id: string }).id
                : null,
            details: {
              status: "PENDING",
              userId: variables.userId,
              ...(variables.bookTitle || bookCached?.title
                ? { title: variables.bookTitle ?? bookCached?.title }
                : {}),
            },
          });
          if (
            serverRecord &&
            typeof serverRecord === "object" &&
            "id" in serverRecord &&
            typeof (serverRecord as { id?: unknown }).id === "string"
          ) {
            prependBorrowAuditEvent(queryClient, {
              recordId: (serverRecord as { id: string }).id,
              action: "CREATE",
              details: {
                status: "PENDING",
                ...(variables.bookTitle || bookCached?.title
                  ? { title: variables.bookTitle ?? bookCached?.title }
                  : {}),
              },
              ...activityActorFromSession(session),
            });
          }
        },
      });

      // Prefer mutate bookTitle, then book detail cache, else "this book"
      showToast.book.borrowSuccess(
        resolveActionBookTitle(variables.bookTitle, bookCached?.title),
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
  const { data: session } = useSession();

  return useMutation({
    mutationFn: async ({
      recordId,
    }: {
      recordId: string;
      bookTitle?: string; // Optional, for toast message
      userName?: string; // Optional, for toast message
      /** SSR/currentAdmin preferred; session fallback name/email only. */
      decisionActor?: {
        id?: string | null;
        fullName?: string | null;
        email?: string | null;
        universityCard?: string | null;
      } | null;
    }) => {
      const result = await approveBorrowRequest(recordId);
      if (!result.success) {
        throw new Error(result.error || "Failed to approve borrow request");
      }
      return { recordId };
    },
    onMutate: async ({ recordId, decisionActor, bookTitle }) => {
      const pending = showToast.pending(
        "Approving borrow…",
        `Approving request for "${resolveActionBookTitle(bookTitle)}". Please wait…`,
      );
      // Instant PENDING → BORROWED so admin + profile lists do not flash empty.
      await queryClient.cancelQueries({
        queryKey: queryKeys.borrows.requestsRoot,
      });
      await queryClient.cancelQueries({ queryKey: queryKeys.borrows.userRoot });
      await queryClient.cancelQueries({
        queryKey: queryKeys.borrows.requestDetail(recordId),
      });
      const previousRequests = queryClient.getQueriesData({
        queryKey: queryKeys.borrows.requestsRoot,
      });
      const previousUserBorrows = queryClient.getQueriesData({
        queryKey: queryKeys.borrows.userRoot,
      });
      const previousDetail = queryClient.getQueryData(
        queryKeys.borrows.requestDetail(recordId),
      );
      const meta = findCachedBorrowMeta(queryClient, recordId);
      const dueDate = (() => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        return d.toISOString().slice(0, 10);
      })();
      const actor = resolveBorrowLifecycleActor(decisionActor, session);
      const detailPatch = {
        status: "BORROWED" as const,
        dueDate,
        ...(actor
          ? {
              borrowedBy: actor.email,
              approvedByActor: actor,
              updatedBy: actor.email,
              updatedAt: new Date(),
            }
          : {}),
      };
      const patchStatus = (old: unknown) => {
        if (!Array.isArray(old)) return old;
        return old.map((row: { id?: string; status?: string }) =>
          row?.id === recordId ? { ...row, ...detailPatch } : row,
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
      // Instant detail densify on `/admin/book-requests/[id]` while pending.
      queryClient.setQueryData(
        queryKeys.borrows.requestDetail(recordId),
        (old: unknown) =>
          old && typeof old === "object" ? { ...old, ...detailPatch } : old,
      );
      if (meta?.bookId) {
        patchBookInventory(queryClient, meta.bookId, {
          availableDelta: -1,
          activeDelta: 1,
        });
      }
      // Capture pre-mutate status before optimistic list rewrite for overview KPI densify.
      return {
        pending,
        previousRequests,
        previousUserBorrows,
        previousDetail,
        meta,
        fromStatus: meta?.status ?? null,
        dueDate,
        actor,
      };
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
      if (context && "previousDetail" in context) {
        queryClient.setQueryData(
          queryKeys.borrows.requestDetail(variables.recordId),
          context.previousDetail,
        );
      }
      if (context?.meta?.bookId) {
        patchBookInventory(queryClient, context.meta.bookId, {
          availableDelta: 1,
          activeDelta: -1,
        });
      }
      const bookTitle = resolveActionBookTitle(variables.bookTitle);
      context?.pending?.error(
        "Approval Failed",
        error.message ||
          `Unable to approve borrow request for "${bookTitle}". ${error.message.includes("no longer available") ? "The book is no longer available." : "Please try again."}`,
      );
    },
    onSuccess: async (_data, variables, context) => {
      const meta =
        context?.meta ?? findCachedBorrowMeta(queryClient, variables.recordId);
      // Prefer onMutate-captured status — findCachedBorrowMeta now sees optimistic BORROWED.
      const fromStatus = context?.fromStatus ?? null;
      const dueDate =
        context?.dueDate ??
        (() => {
          const d = new Date();
          d.setDate(d.getDate() + 7);
          return d.toISOString().slice(0, 10);
        })();
      const actor =
        context?.actor ??
        resolveBorrowLifecycleActor(variables.decisionActor, session);
      await commitMutationCache(queryClient, "borrow.lifecycle", {
        snapshot: (qc) =>
          snapshotBorrowCacheBaselines(
            qc,
            meta?.bookId ? [meta.bookId] : [],
          ),
        densify: (baselines) => {
          patchBorrowCachesOnStatusChange(
            queryClient,
            {
              recordId: variables.recordId,
              patch: {
                status: "BORROWED",
                dueDate,
                ...(actor
                  ? {
                      borrowedBy: actor.email,
                      approvedByActor: actor,
                      updatedBy: actor.email,
                      updatedAt: new Date(),
                    }
                  : {}),
              },
              userId: meta?.userId,
              bookId: meta?.bookId,
              fromStatus,
              restoreInventory: Boolean(meta?.bookId),
            },
            baselines,
          );
          densifyActivityLog(queryClient, {
            ...activityActorFromSession(session, variables.decisionActor),
            action: "UPDATE",
            entityType: "borrow",
            entityId: variables.recordId,
            details: {
              status: "BORROWED",
              ...(meta?.userId ? { userId: meta.userId } : {}),
              ...(variables.bookTitle ? { title: variables.bookTitle } : {}),
            },
          });
          prependBorrowAuditEvent(queryClient, {
            recordId: variables.recordId,
            action: "UPDATE",
            details: {
              status: "BORROWED",
              ...(variables.bookTitle ? { title: variables.bookTitle } : {}),
            },
            ...activityActorFromSession(session, variables.decisionActor),
          });
        },
      });

      const bookTitle = resolveActionBookTitle(variables.bookTitle);
      const userName = variables.userName || "User";
      context?.pending?.success(
        "Borrow Request Approved",
        `${userName} can now borrow "${bookTitle}".`,
      );
    },
  });
};

/**
 * Hook to reject a borrow request (admin action).
 * Automatically invalidates related queries and shows success/error toasts.
 * Soft-cancels the pending row (status → CANCELLED; history kept).
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
  const { data: session } = useSession();

  return useMutation({
    mutationFn: async ({
      recordId,
    }: {
      recordId: string;
      bookTitle?: string; // Optional, for toast message
      userName?: string; // Optional, for toast message
      /** SSR/currentAdmin preferred; session fallback name/email only. */
      decisionActor?: {
        id?: string | null;
        fullName?: string | null;
        email?: string | null;
        universityCard?: string | null;
      } | null;
    }) => {
      const result = await rejectBorrowRequest(recordId);
      if (!result.success) {
        throw new Error(result.error || "Failed to reject borrow request");
      }
      return { recordId };
    },
    onMutate: async ({ recordId, decisionActor, bookTitle }) => {
      const pending = showToast.pending(
        "Rejecting borrow…",
        `Rejecting request for "${resolveActionBookTitle(bookTitle)}". Please wait…`,
      );
      // Soft-cancel in cache immediately (row stays as CANCELLED, not deleted).
      await queryClient.cancelQueries({
        queryKey: queryKeys.borrows.requestsRoot,
      });
      await queryClient.cancelQueries({ queryKey: queryKeys.borrows.userRoot });
      await queryClient.cancelQueries({
        queryKey: queryKeys.borrows.requestDetail(recordId),
      });
      const previousRequests = queryClient.getQueriesData({
        queryKey: queryKeys.borrows.requestsRoot,
      });
      const previousUserBorrows = queryClient.getQueriesData({
        queryKey: queryKeys.borrows.userRoot,
      });
      const previousDetail = queryClient.getQueryData(
        queryKeys.borrows.requestDetail(recordId),
      );
      const meta = findCachedBorrowMeta(queryClient, recordId);
      const fromStatus = meta?.status ?? null;
      const actor = resolveBorrowLifecycleActor(decisionActor, session);
      const detailPatch = {
        status: "CANCELLED" as const,
        ...(actor
          ? {
              updatedBy: actor.email,
              updatedAt: new Date(),
              cancelledByActor: actor,
            }
          : {}),
      };
      const patchStatus = (old: unknown) => {
        if (!Array.isArray(old)) return old;
        return old.map((row: { id?: string; status?: string }) =>
          row?.id === recordId ? { ...row, ...detailPatch } : row,
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
      queryClient.setQueryData(
        queryKeys.borrows.requestDetail(recordId),
        (old: unknown) =>
          old && typeof old === "object" ? { ...old, ...detailPatch } : old,
      );
      return {
        pending,
        previousRequests,
        previousUserBorrows,
        previousDetail,
        meta,
        fromStatus,
        actor,
      };
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
      if (context && "previousDetail" in context) {
        queryClient.setQueryData(
          queryKeys.borrows.requestDetail(variables.recordId),
          context.previousDetail,
        );
      }
      const bookTitle = resolveActionBookTitle(variables.bookTitle);
      context?.pending?.error(
        "Rejection Failed",
        error.message ||
          `Unable to reject borrow request for "${bookTitle}". Please try again.`,
      );
    },
    onSuccess: async (_data, variables, context) => {
      const meta =
        context?.meta ?? findCachedBorrowMeta(queryClient, variables.recordId);
      const fromStatus = context?.fromStatus ?? null;
      const actor =
        context?.actor ??
        resolveBorrowLifecycleActor(variables.decisionActor, session);
      await commitMutationCache(queryClient, "borrow.lifecycle", {
        snapshot: (qc) =>
          snapshotBorrowCacheBaselines(
            qc,
            meta?.bookId ? [meta.bookId] : [],
          ),
        densify: (baselines) => {
          patchBorrowCachesOnStatusChange(
            queryClient,
            {
              recordId: variables.recordId,
              patch: {
                status: "CANCELLED",
                ...(actor
                  ? {
                      updatedBy: actor.email,
                      updatedAt: new Date(),
                      cancelledByActor: actor,
                    }
                  : {}),
              },
              userId: meta?.userId,
              bookId: meta?.bookId,
              fromStatus,
            },
            baselines,
          );
          densifyActivityLog(queryClient, {
            ...activityActorFromSession(session, variables.decisionActor),
            action: "UPDATE",
            entityType: "borrow",
            entityId: variables.recordId,
            details: {
              status: "CANCELLED",
              ...(meta?.userId ? { userId: meta.userId } : {}),
              ...(variables.bookTitle ? { title: variables.bookTitle } : {}),
            },
          });
          prependBorrowAuditEvent(queryClient, {
            recordId: variables.recordId,
            action: "UPDATE",
            details: {
              status: "CANCELLED",
              ...(variables.bookTitle ? { title: variables.bookTitle } : {}),
            },
            ...activityActorFromSession(session, variables.decisionActor),
          });
        },
      });

      const bookTitle = resolveActionBookTitle(variables.bookTitle);
      const userName = variables.userName || "User";
      context?.pending?.success(
        "Borrow Request Rejected",
        `Borrow request for "${bookTitle}" by ${userName} has been rejected.`,
      );
    },
  });
};

/**
 * Owner soft-cancels a PENDING borrow request from My Profile.
 * Densify parity with useRejectBorrow (CANCELLED stays in history / KPIs).
 */
export const useCancelPendingBorrow = () => {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  return useMutation({
    mutationFn: async ({
      recordId,
    }: {
      recordId: string;
      bookTitle?: string;
    }) => {
      const result = await cancelPendingBorrowRequest(recordId);
      if (!result.success) {
        throw new Error(result.error || "Failed to cancel borrow request");
      }
      return { recordId };
    },
    onMutate: async ({ recordId }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.borrows.requestsRoot,
      });
      await queryClient.cancelQueries({ queryKey: queryKeys.borrows.userRoot });
      await queryClient.cancelQueries({
        queryKey: queryKeys.borrows.requestDetail(recordId),
      });
      const previousRequests = queryClient.getQueriesData({
        queryKey: queryKeys.borrows.requestsRoot,
      });
      const previousUserBorrows = queryClient.getQueriesData({
        queryKey: queryKeys.borrows.userRoot,
      });
      const previousDetail = queryClient.getQueryData(
        queryKeys.borrows.requestDetail(recordId),
      );
      const meta = findCachedBorrowMeta(queryClient, recordId);
      const fromStatus = meta?.status ?? null;
      const actor = resolveBorrowLifecycleActor(undefined, session);
      const detailPatch = {
        status: "CANCELLED" as const,
        ...(actor
          ? {
              updatedBy: actor.email,
              updatedAt: new Date(),
              cancelledByActor: actor,
            }
          : {}),
      };
      const patchStatus = (old: unknown) => {
        if (!Array.isArray(old)) return old;
        return old.map((row: { id?: string; status?: string }) =>
          row?.id === recordId ? { ...row, ...detailPatch } : row,
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
      queryClient.setQueryData(
        queryKeys.borrows.requestDetail(recordId),
        (old: unknown) =>
          old && typeof old === "object" ? { ...old, ...detailPatch } : old,
      );
      return {
        previousRequests,
        previousUserBorrows,
        previousDetail,
        meta,
        fromStatus,
        actor,
      };
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
      if (context && "previousDetail" in context) {
        queryClient.setQueryData(
          queryKeys.borrows.requestDetail(variables.recordId),
          context.previousDetail,
        );
      }
      const bookTitle = variables.bookTitle || "book";
      showToast.error(
        "Cancel Failed",
        error.message ||
          `Unable to cancel your request for "${bookTitle}". Please try again.`,
      );
    },
    onSuccess: async (_data, variables, context) => {
      const meta =
        context?.meta ?? findCachedBorrowMeta(queryClient, variables.recordId);
      const fromStatus = context?.fromStatus ?? null;
      const actor =
        context?.actor ?? resolveBorrowLifecycleActor(undefined, session);
      await commitMutationCache(queryClient, "borrow.lifecycle", {
        snapshot: (qc) =>
          snapshotBorrowCacheBaselines(
            qc,
            meta?.bookId ? [meta.bookId] : [],
          ),
        densify: (baselines) => {
          patchBorrowCachesOnStatusChange(
            queryClient,
            {
              recordId: variables.recordId,
              patch: {
                status: "CANCELLED",
                ...(actor
                  ? {
                      updatedBy: actor.email,
                      updatedAt: new Date(),
                      cancelledByActor: actor,
                    }
                  : {}),
              },
              userId: meta?.userId,
              bookId: meta?.bookId,
              fromStatus,
            },
            baselines,
          );
          const activityActor = activityActorFromSession(session);
          densifyActivityLog(queryClient, {
            ...activityActor,
            action: "UPDATE",
            entityType: "borrow",
            entityId: variables.recordId,
            details: {
              status: "CANCELLED",
              ...(meta?.userId ? { userId: meta.userId } : {}),
              ...(variables.bookTitle ? { title: variables.bookTitle } : {}),
            },
          });
          prependBorrowAuditEvent(queryClient, {
            recordId: variables.recordId,
            action: "UPDATE",
            details: {
              status: "CANCELLED",
              ...(variables.bookTitle ? { title: variables.bookTitle } : {}),
            },
            ...activityActor,
          });
        },
      });

      const bookTitle = variables.bookTitle || "this book";
      showToast.success(
        "Request Cancelled",
        `Your borrow request for "${bookTitle}" was cancelled.`,
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
  const { data: session } = useSession();

  return useMutation({
    mutationFn: async ({
      recordId,
    }: {
      recordId: string;
      bookTitle?: string; // Optional, for toast message
      /** SSR/currentAdmin preferred; session fallback name/email only. */
      decisionActor?: {
        id?: string | null;
        fullName?: string | null;
        email?: string | null;
        universityCard?: string | null;
      } | null;
    }) => {
      const result = await returnBook(recordId);
      if (!result.success) {
        throw new Error(result.error || "Failed to return book");
      }
      return result.data;
    },
    onMutate: async ({ recordId, decisionActor, bookTitle }) => {
      const pending = showToast.pending(
        "Marking returned…",
        `Marking "${resolveActionBookTitle(bookTitle)}" as returned. Please wait…`,
      );
      await queryClient.cancelQueries({ queryKey: queryKeys.borrows.userRoot });
      await queryClient.cancelQueries({
        queryKey: queryKeys.borrows.requestsRoot,
      });
      await queryClient.cancelQueries({
        queryKey: queryKeys.borrows.requestDetail(recordId),
      });
      const previousRequests = queryClient.getQueriesData({
        queryKey: queryKeys.borrows.requestsRoot,
      });
      const previousUserBorrows = queryClient.getQueriesData({
        queryKey: queryKeys.borrows.userRoot,
      });
      const previousDetail = queryClient.getQueryData(
        queryKeys.borrows.requestDetail(recordId),
      );
      const meta = findCachedBorrowMeta(queryClient, recordId);
      const fromStatus = meta?.status ?? null;
      const returnDate = new Date().toISOString().slice(0, 10);
      const actor = resolveBorrowLifecycleActor(decisionActor, session);
      const detailPatch = {
        status: "RETURNED" as const,
        returnDate,
        ...(actor
          ? {
              returnedBy: actor.email,
              returnedByActor: actor,
              updatedBy: actor.email,
              updatedAt: new Date(),
            }
          : {}),
      };
      const patchStatus = (old: unknown) => {
        if (!Array.isArray(old)) return old;
        return old.map((row: { id?: string; status?: string }) =>
          row?.id === recordId ? { ...row, ...detailPatch } : row,
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
      queryClient.setQueryData(
        queryKeys.borrows.requestDetail(recordId),
        (old: unknown) =>
          old && typeof old === "object" ? { ...old, ...detailPatch } : old,
      );
      if (meta?.bookId) {
        // Never optimistic Available — settle applies absolute after return+offer.
        patchBookInventory(queryClient, meta.bookId, {
          activeDelta: -1,
          returnedDelta: 1,
        });
      }
      return {
        pending,
        previousRequests,
        previousUserBorrows,
        previousDetail,
        meta,
        fromStatus,
        returnDate,
        actor,
      };
    },
    onSuccess: async (data, variables, context) => {
      const meta =
        context?.meta ?? findCachedBorrowMeta(queryClient, variables.recordId);
      const fromStatus = context?.fromStatus ?? null;
      const returnDate =
        context?.returnDate ?? new Date().toISOString().slice(0, 10);
      const fineAmount =
        data?.fineAmount !== undefined
          ? Number(data.fineAmount).toFixed(2)
          : undefined;
      const actor =
        context?.actor ??
        resolveBorrowLifecycleActor(variables.decisionActor, session);
      await commitMutationCache(queryClient, "borrow.lifecycle", {
        snapshot: (qc) =>
          snapshotBorrowCacheBaselines(
            qc,
            meta?.bookId ? [meta.bookId] : [],
          ),
        densify: (baselines) => {
          const hasAbsoluteCopies =
            typeof data?.availableCopies === "number" &&
            Number.isFinite(data.availableCopies);
          patchBorrowCachesOnStatusChange(
            queryClient,
            {
              recordId: variables.recordId,
              patch: {
                status: "RETURNED",
                returnDate,
                ...(fineAmount !== undefined ? { fineAmount } : {}),
                ...(actor
                  ? {
                      returnedBy: actor.email,
                      returnedByActor: actor,
                      updatedBy: actor.email,
                      updatedAt: new Date(),
                    }
                  : {}),
              },
              userId: meta?.userId,
              bookId: meta?.bookId,
              fromStatus,
              // Absolute path preferred; restore only if server omitted copies.
              restoreInventory:
                !hasAbsoluteCopies && Boolean(meta?.bookId),
            },
            baselines,
          );
          applyReturnInventoryDensify(queryClient, {
            bookId: meta?.bookId,
            availableCopies: data?.availableCopies,
            offeredReservationId: data?.offeredReservationId,
          });
          densifyActivityLog(queryClient, {
            ...activityActorFromSession(session, variables.decisionActor),
            action: "UPDATE",
            entityType: "borrow",
            entityId: variables.recordId,
            details: {
              status: "RETURNED",
              ...(meta?.userId ? { userId: meta.userId } : {}),
              ...(variables.bookTitle ? { title: variables.bookTitle } : {}),
            },
          });
          prependBorrowAuditEvent(queryClient, {
            recordId: variables.recordId,
            action: "UPDATE",
            details: {
              status: "RETURNED",
              ...(variables.bookTitle ? { title: variables.bookTitle } : {}),
            },
            ...activityActorFromSession(session, variables.decisionActor),
          });
        },
      });

      const bookTitle = resolveActionBookTitle(variables.bookTitle);
      if (
        data?.isOverdue &&
        data.daysOverdue !== undefined &&
        data.fineAmount !== undefined
      ) {
        const days = data.daysOverdue;
        context?.pending?.success(
          `Returned with fine: ${bookTitle}`,
          `"${bookTitle}" was ${days} day${days === 1 ? "" : "s"} overdue. Fine: $${Number(data.fineAmount).toFixed(2)}.`,
        );
      } else {
        context?.pending?.success(
          `Returned: ${bookTitle}`,
          `"${bookTitle}" is back on the shelf. Thanks for returning it!`,
        );
      }
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
      if (context && "previousDetail" in context) {
        queryClient.setQueryData(
          queryKeys.borrows.requestDetail(variables.recordId),
          context.previousDetail,
        );
      }
      // Roll back borrowStats only — Available was never optimistic-bumped.
      if (context?.meta?.bookId) {
        patchBookInventory(queryClient, context.meta.bookId, {
          activeDelta: 1,
          returnedDelta: -1,
        });
      }
      const bookTitle = resolveActionBookTitle(variables.bookTitle);
      context?.pending?.error(
        "Cannot return",
        error.message || `Unable to return "${bookTitle}". Please try again.`,
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
  const { data: session } = useSession();

  return useMutation({
    mutationFn: async ({
      bookId,
      ...reviewData
    }: CreateReviewInput & {
      bookId: string;
      bookTitle?: string; // Optional, for toast message
      /** Optional densify fallback when server row is thin. */
      bookMeta?: {
        bookAuthor?: string;
        bookGenre?: string;
        bookRating?: number;
        bookCoverUrl?: string | null;
        bookCoverColor?: string | null;
      };
    }) => {
      const review = await createReview(bookId, reviewData);
      return review;
    },
    onSuccess: async (data, variables) => {
      // Snapshot → await invalidate → re-patch (ticket densify order).
      const nowIso = new Date().toISOString();
      const bookCache = queryClient.getQueryData<{
        title?: string;
        author?: string;
        genre?: string;
        rating?: number;
        coverUrl?: string | null;
        coverColor?: string | null;
      }>(queryKeys.books.detail(variables.bookId));

      // Prefer server-authoritative AdminBookReviewItem from POST;
      // fill gaps from book detail cache / session / bookMeta only.
      const densifyItem: AdminBookReviewItem = {
        id: data.id,
        rating: data.rating,
        comment: data.comment,
        status: data.status ?? "PENDING",
        bookId: data.bookId || variables.bookId,
        bookTitle:
          data.bookTitle ||
          variables.bookTitle ||
          bookCache?.title ||
          "Unknown Book",
        bookCoverUrl:
          data.bookCoverUrl ??
          variables.bookMeta?.bookCoverUrl ??
          bookCache?.coverUrl ??
          null,
        bookCoverColor:
          data.bookCoverColor ??
          variables.bookMeta?.bookCoverColor ??
          bookCache?.coverColor ??
          null,
        bookAuthor:
          data.bookAuthor ||
          variables.bookMeta?.bookAuthor ||
          bookCache?.author ||
          "",
        bookGenre:
          data.bookGenre ||
          variables.bookMeta?.bookGenre ||
          bookCache?.genre ||
          "",
        bookRating:
          data.bookRating ||
          variables.bookMeta?.bookRating ||
          bookCache?.rating ||
          0,
        userId: data.userId || session?.user?.id || "",
        userName:
          data.userName ||
          session?.user?.name ||
          "You",
        userEmail: data.userEmail || session?.user?.email || "",
        userUniversityCard:
          data.userUniversityCard ??
          (session?.user as { universityCard?: string | null } | undefined)
            ?.universityCard ??
          null,
        userUniversityId: data.userUniversityId ?? 0,
        reviewedBy: data.reviewedBy ?? null,
        reviewedByName: data.reviewedByName ?? null,
        reviewedByEmail: data.reviewedByEmail ?? null,
        reviewedByUniversityCard: data.reviewedByUniversityCard ?? null,
        reviewedAt: data.reviewedAt ?? null,
        createdAt: data.createdAt ?? nowIso,
        updatedAt: data.updatedAt ?? nowIso,
        borrowedAt: data.borrowedAt ?? null,
        dueDate: data.dueDate ?? null,
        returnedAt: data.returnedAt ?? null,
      };

      await commitMutationCache(queryClient, "review.write", {
        snapshot: snapshotReviewListBaselines,
        densify: (baselines) => {
          patchReviewCachesOnCreate(queryClient, densifyItem, baselines);
          densifyActivityLog(queryClient, {
            ...activityActorFromSession(session),
            action: "CREATE",
            entityType: "review",
            entityId: densifyItem.id,
            details: {
              title: densifyItem.bookTitle,
              status: densifyItem.status,
            },
          });
          prependReviewAuditEvent(queryClient, {
            reviewId: densifyItem.id,
            action: "CREATE",
            details: {
              title: densifyItem.bookTitle,
              status: densifyItem.status,
            },
            ...activityActorFromSession(session),
          });
          // Eligibility densify — ReviewButton flips without eligibility refetch flash.
          queryClient.setQueryData(
            queryKeys.reviews.eligibility(variables.bookId),
            (prev: ReviewEligibility | undefined) => ({
              success: true,
              canReview: false,
              hasExistingReview: true,
              isCurrentlyBorrowed: prev?.isCurrentlyBorrowed ?? false,
              reason: "You have already reviewed this book",
            }),
          );
        },
      });

      showToast.book.reviewSuccess(
        resolveActionBookTitle(variables.bookTitle, bookCache?.title),
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
  const { data: session } = useSession();

  return useMutation({
    mutationFn: async ({
      reviewId,
      rating,
      comment,
    }: {
      reviewId: string;
      bookId?: string;
      bookTitle?: string;
      userId?: string;
    } & UpdateReviewInput) => {
      return updateReview(reviewId, { rating, comment });
    },
    onMutate: async (variables) => {
      // Optimistic densify only (no pending-count bump — that runs once in onSuccess).
      const baselines = snapshotReviewListBaselines(queryClient);
      const cachedBefore = findCachedAdminReview(
        queryClient,
        variables.reviewId,
      );
      const previousStatus = cachedBefore?.status ?? null;
      const nowIso = new Date().toISOString();
      if (variables.bookId) {
        const key = queryKeys.reviews.book(variables.bookId);
        await queryClient.cancelQueries({ queryKey: key });
        const previous = queryClient.getQueryData(key);
        queryClient.setQueryData(
          key,
          (
            old:
              | Array<{
                  id: string;
                  rating: number;
                  comment: string;
                  updatedAt: Date | null;
                  status?: ReviewStatusValue;
                }>
              | undefined,
          ) =>
            old?.map((r) =>
              r.id === variables.reviewId
                ? {
                    ...r,
                    rating: variables.rating,
                    comment: variables.comment,
                    updatedAt: new Date(),
                    // Match server re-queue rule for moderated rows.
                    status:
                      r.status && r.status !== "PENDING"
                        ? "PENDING"
                        : r.status,
                  }
                : r,
            ),
        );
        // My Reviews / admin lists — field patch only; pending bump deferred.
        queryClient.setQueriesData<AdminBookReviewItem[]>(
          { queryKey: queryKeys.reviews.userReviewsRoot },
          (old) =>
            old?.map((r) =>
              r.id === variables.reviewId
                ? {
                    ...r,
                    rating: variables.rating,
                    comment: variables.comment,
                    updatedAt: nowIso,
                    status:
                      r.status !== "PENDING" ? "PENDING" : r.status,
                    reviewedBy:
                      r.status !== "PENDING" ? null : r.reviewedBy,
                    reviewedByName:
                      r.status !== "PENDING" ? null : r.reviewedByName,
                    reviewedByEmail:
                      r.status !== "PENDING" ? null : r.reviewedByEmail,
                    reviewedByUniversityCard:
                      r.status !== "PENDING"
                        ? null
                        : r.reviewedByUniversityCard,
                    reviewedAt:
                      r.status !== "PENDING" ? null : r.reviewedAt,
                  }
                : r,
            ),
        );
        queryClient.setQueriesData<AdminBookReviewItem[]>(
          { queryKey: queryKeys.reviews.adminRoot },
          (old) =>
            old?.map((r) =>
              r.id === variables.reviewId
                ? {
                    ...r,
                    rating: variables.rating,
                    comment: variables.comment,
                    updatedAt: nowIso,
                    status:
                      r.status !== "PENDING" ? "PENDING" : r.status,
                    reviewedBy:
                      r.status !== "PENDING" ? null : r.reviewedBy,
                    reviewedByName:
                      r.status !== "PENDING" ? null : r.reviewedByName,
                    reviewedByEmail:
                      r.status !== "PENDING" ? null : r.reviewedByEmail,
                    reviewedByUniversityCard:
                      r.status !== "PENDING"
                        ? null
                        : r.reviewedByUniversityCard,
                    reviewedAt:
                      r.status !== "PENDING" ? null : r.reviewedAt,
                  }
                : r,
            ),
        );
        return { previous, key, baselines, previousStatus };
      }
      return { baselines, previousStatus };
    },
    onSuccess: async (data, variables, context) => {
      const previousStatus = context?.previousStatus ?? null;
      const nextStatus = data.status ?? previousStatus ?? undefined;
      await commitMutationCache(queryClient, "review.write", {
        snapshot: () =>
          context?.baselines ?? snapshotReviewListBaselines(queryClient),
        densify: (baselines) => {
          patchReviewCachesOnUpdate(
            queryClient,
            {
              id: variables.reviewId,
              rating: data.rating ?? variables.rating,
              comment: data.comment ?? variables.comment,
              updatedAt: new Date().toISOString(),
              status: nextStatus,
              // Re-queue clears moderator attribution server-side.
              ...(nextStatus === "PENDING" && previousStatus !== "PENDING"
                ? {
                    reviewedBy: null,
                    reviewedByName: null,
                    reviewedByEmail: null,
                    reviewedByUniversityCard: null,
                    reviewedAt: null,
                  }
                : {}),
              bookId: variables.bookId,
              userId: variables.userId ?? data.userId,
            },
            baselines,
            previousStatus,
          );
          densifyActivityLog(queryClient, {
            ...activityActorFromSession(session),
            action: "UPDATE",
            entityType: "review",
            entityId: variables.reviewId,
            details: {
              status: nextStatus ?? "PENDING",
              ...(variables.bookId ? { bookId: variables.bookId } : {}),
            },
          });
          prependReviewAuditEvent(queryClient, {
            reviewId: variables.reviewId,
            action: "UPDATE",
            details: {
              status: nextStatus ?? "PENDING",
              ...(variables.bookId ? { bookId: variables.bookId } : {}),
            },
            ...activityActorFromSession(session),
          });
        },
      });
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
  const { data: session } = useSession();

  return useMutation({
    mutationFn: async ({
      reviewId,
    }: {
      reviewId: string;
      bookId?: string;
      bookTitle?: string;
      userId?: string;
    }) => {
      return deleteReview(reviewId);
    },
    onMutate: async (variables) => {
      // Optimistic list remove only — pending-count bump runs once in onSuccess
      // (ticket densify pattern; avoids double-decrement of sidebar badge).
      const cached = findCachedAdminReview(queryClient, variables.reviewId);
      const previousMeta = {
        status: cached?.status,
        userId: variables.userId ?? cached?.userId,
        bookId: variables.bookId ?? cached?.bookId,
      };
      const baselines = snapshotReviewListBaselines(queryClient);
      let previousBookList: unknown;
      let bookKey: ReturnType<typeof queryKeys.reviews.book> | undefined;

      if (previousMeta.bookId) {
        bookKey = queryKeys.reviews.book(previousMeta.bookId);
        await queryClient.cancelQueries({ queryKey: bookKey });
        previousBookList = queryClient.getQueryData(bookKey);
        queryClient.setQueryData(
          bookKey,
          (old: Array<{ id: string }> | undefined) =>
            old?.filter((r) => r.id !== variables.reviewId),
        );
        // Mark intentional empty so soft-nav before onSuccess cannot SSR-reseed.
        const nextBook = queryClient.getQueryData<unknown[]>(bookKey);
        if (Array.isArray(nextBook) && nextBook.length === 0) {
          markDensifiedEmpty(bookKey);
        }
      }
      queryClient.setQueriesData<AdminBookReviewItem[]>(
        { queryKey: queryKeys.reviews.userReviewsRoot },
        (old) => old?.filter((r) => r.id !== variables.reviewId),
      );
      queryClient.setQueriesData<AdminBookReviewItem[]>(
        { queryKey: queryKeys.reviews.adminRoot },
        (old) => old?.filter((r) => r.id !== variables.reviewId),
      );
      return {
        previous: previousBookList,
        key: bookKey,
        previousMeta,
        baselines,
      };
    },
    onSuccess: async (_data, variables, context) => {
      const previousMeta = context?.previousMeta;
      const densifyMeta = {
        status: previousMeta?.status ?? null,
        userId: previousMeta?.userId ?? variables.userId ?? null,
        bookId: previousMeta?.bookId ?? variables.bookId ?? null,
      };
      await commitMutationCache(queryClient, "review.write", {
        snapshot: () =>
          context?.baselines ?? snapshotReviewListBaselines(queryClient),
        densify: (baselines) => {
          // Always pass bookId/userId — do not gate on status (status may be
          // unknown when deleting from a surface that never cached admin rows).
          patchReviewCachesOnDelete(
            queryClient,
            variables.reviewId,
            densifyMeta,
            baselines,
          );
          densifyActivityLog(queryClient, {
            ...activityActorFromSession(session),
            action: "DELETE",
            entityType: "review",
            entityId: variables.reviewId,
            details: densifyMeta.bookId
              ? { bookId: densifyMeta.bookId }
              : null,
          });
          // Eligibility densify — ReviewButton can submit again without flash.
          if (densifyMeta.bookId) {
            queryClient.setQueryData(
              queryKeys.reviews.eligibility(densifyMeta.bookId),
              (prev: ReviewEligibility | undefined) => ({
                success: true,
                canReview: true,
                hasExistingReview: false,
                isCurrentlyBorrowed: prev?.isCurrentlyBorrowed ?? false,
                reason: "You can review this book",
              }),
            );
          }
        },
      });
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
        clearDensifiedEmpty(context.key);
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
 * Admin approve/reject decision on a book review. Densifies admin queue,
 * detail, My Reviews, and public book lists via patchReviewCaches (await
 * invalidate then re-patch). Parent: CR-0003 / REQ-0035 polish
 */
export const useModerateReview = () => {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  return useMutation({
    mutationFn: async ({
      reviewId,
      status,
    }: {
      reviewId: string;
      status: "APPROVED" | "REJECTED";
      bookTitle?: string;
      /** Preferred SSR/session actor — avoids “unknown moderator” flash. */
      decisionActor?: {
        id?: string | null;
        fullName: string;
        email: string;
        universityCard: string | null;
      };
    }) => moderateReview(reviewId, status),
    onMutate: async (variables) => {
      const bookTitle = resolveActionBookTitle(variables.bookTitle);
      const pending = showToast.pending(
        variables.status === "APPROVED"
          ? "Approving review…"
          : "Rejecting review…",
        `Updating moderation for "${bookTitle}". Please wait…`,
      );
      return { pending };
    },
    onSuccess: async (data, variables, context) => {
      const cached = findCachedAdminReview(queryClient, variables.reviewId);
      const previousStatus = cached?.status;
      const actor = variables.decisionActor;
      const sessionUser = session?.user;

      await commitMutationCache(queryClient, "review.write", {
        snapshot: snapshotReviewListBaselines,
        densify: (baselines) => {
          const postInvalidate = findCachedAdminReview(
            queryClient,
            variables.reviewId,
          );
          // Prefer mutation/API + post-invalidate join over weak session —
          // never densify "an admin" into cache (stomps Test Admin + card).
          const moderator = resolveReviewModeratorForDensify({
            decisionActor: actor,
            sessionUser: sessionUser
              ? {
                  id: sessionUser.id,
                  name: sessionUser.name,
                  email: sessionUser.email,
                  universityCard:
                    (
                      sessionUser as {
                        universityCard?: string | null;
                      }
                    ).universityCard ?? null,
                }
              : null,
            fromMutation: {
              reviewedBy: data.reviewedBy ?? null,
              reviewedByName: data.reviewedByName ?? null,
              reviewedByEmail: data.reviewedByEmail ?? null,
              reviewedByUniversityCard:
                data.reviewedByUniversityCard ?? null,
            },
            postInvalidate,
            preInvalidate: cached,
          });

          patchReviewCachesOnModerate(
            queryClient,
            {
              id: variables.reviewId,
              status: data.status,
              reviewedAt:
                (typeof data.reviewedAt === "string"
                  ? data.reviewedAt
                  : data.reviewedAt
                    ? new Date(data.reviewedAt).toISOString()
                    : null) ?? new Date().toISOString(),
              ...moderator,
              bookId: cached?.bookId ?? postInvalidate?.bookId,
              userId: cached?.userId ?? postInvalidate?.userId,
            },
            previousStatus,
            baselines,
            // Prefer post-invalidate row (has join) for public book upsert.
            postInvalidate ?? cached,
          );
          densifyActivityLog(queryClient, {
            ...activityActorFromSession(session, variables.decisionActor),
            action: "UPDATE",
            entityType: "review",
            entityId: variables.reviewId,
            details: { status: data.status },
          });
          prependReviewAuditEvent(queryClient, {
            reviewId: variables.reviewId,
            action: "UPDATE",
            details: { status: data.status },
            ...activityActorFromSession(session, variables.decisionActor),
          });
        },
      });
      const bookTitle = resolveActionBookTitle(variables.bookTitle);
      context?.pending?.success(
        variables.status === "APPROVED" ? "Review approved" : "Review rejected",
        `The review for "${bookTitle}" was ${variables.status.toLowerCase()}.`,
      );
    },
    onError: (error: Error, variables, context) => {
      context?.pending?.error(
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
  const { data: session } = useSession();

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
      await commitMutationCache(queryClient, "admin-request.write", {
        snapshot: () => undefined,
        densify: () => {
          // Server returns full AdminRequest on create — upsert pending queue.
          if (_data?.data) {
            densifyAdminRequestCreate(queryClient, _data.data as AdminRequest);
          }
          densifyActivityLog(queryClient, {
            ...activityActorFromSession(session),
            action: "CREATE",
            entityType: "admin-request",
            entityId: _data?.data?.id ?? null,
            details: {
              status: "PENDING",
              userId: _data?.data?.userId ?? session?.user?.id ?? null,
            },
          });
        },
      });
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
  const { data: session } = useSession();

  return useMutation({
    mutationFn: async ({ requestId }: { requestId: string }) => {
      const result = await cancelMyAdminRequest(requestId);
      if (!result.success) {
        throw new Error(result.error || "Failed to cancel admin request");
      }
      return result;
    },
    onSuccess: async (_data, variables) => {
      await commitMutationCache(queryClient, "admin-request.write", {
        snapshot: () => undefined,
        densify: () => {
          densifyAdminRequestRemovePending(queryClient, variables.requestId, {
            overviewWithdraw: true,
            clearLatestStatus: true,
          });
          densifyActivityLog(queryClient, {
            ...activityActorFromSession(session),
            action: "UPDATE",
            entityType: "admin-request",
            entityId: variables.requestId,
            details: {
              status: "CANCELLED",
              userId: session?.user?.id ?? null,
            },
          });
        },
      });
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
  const { data: session } = useSession();

  return useMutation({
    mutationFn: async ({ requestId }: {
      requestId: string;
      userName?: string; // Optional, for toast message
      /** SSR/admin actor — preferred; useSession is often null in admin client trees. */
      decisionActor?: {
        id?: string | null;
        fullName: string;
        email: string;
        universityCard?: string | null;
      } | null;
    }) => {
      const result = await approveAdminRequest(requestId);
      if (!result.success) {
        throw new Error(result.error || "Failed to approve admin request");
      }
      return result.data;
    },
    onMutate: async ({ requestId, userName, decisionActor: actorFromCaller }) => {
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
      const reviewer = actorFromCaller
        ? {
            id: actorFromCaller.id ?? null,
            fullName: actorFromCaller.fullName,
            email: actorFromCaller.email,
            universityCard: actorFromCaller.universityCard ?? null,
          }
        : fromSession;
      return applyOptimisticAdminRequestDecision(queryClient, {
        requestId,
        status: "APPROVED",
        userName,
        reviewer,
      });
    },
    onError: (error: Error, variables, context) => {
      rollbackOptimisticAdminRequestDecision(queryClient, context);
      const userName = variables.userName || "User";
      showToast.error(
        "Approval Failed",
        error.message ||
          `Unable to approve admin request for ${userName}. ${error.message.includes("already been processed") ? "This request has already been processed." : "Please try again."}`
      );
    },
    onSuccess: async (data, variables) => {
      const promotedUserId =
        (data as { userId?: string } | null | undefined)?.userId ??
        (data as { user?: { id?: string } } | null | undefined)?.user?.id;
      await commitMutationCache(queryClient, "admin-request.write", {
        snapshot: () => undefined,
        densify: () => {
          if (data) densifyAdminRequestDecision(queryClient, data);
          densifyActivityLog(queryClient, {
            ...activityActorFromSession(session),
            action: "UPDATE",
            entityType: "admin-request",
            entityId: variables.requestId,
            details: {
              status: "APPROVED",
              ...(promotedUserId ? { userId: promotedUserId } : {}),
            },
          });
          if (!promotedUserId) return;
          densifyUserWrite(queryClient, {
            userId: promotedUserId,
            role: "ADMIN",
          });
        },
      });

      // Show success toast
      const userName = variables.userName || data?.userFullName || "User";
      showToast.success(
        "Admin Request Approved",
        `${userName} has been granted admin privileges.`
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
  const { data: session } = useSession();

  return useMutation({
    mutationFn: async ({
      requestId,
      rejectionReason,
    }: {
      requestId: string;
      rejectionReason?: string; // Optional rejection reason
      userName?: string; // Optional, for toast message
      /** SSR/admin actor — preferred; useSession is often null in admin client trees. */
      decisionActor?: {
        id?: string | null;
        fullName: string;
        email: string;
        universityCard?: string | null;
      } | null;
    }) => {
      const result = await rejectAdminRequest(requestId, rejectionReason);
      if (!result.success) {
        throw new Error(result.error || "Failed to reject admin request");
      }
      return result.data;
    },
    onMutate: async ({
      requestId,
      userName,
      rejectionReason,
      decisionActor: actorFromCaller,
    }) => {
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
      const reviewer = actorFromCaller
        ? {
            id: actorFromCaller.id ?? null,
            fullName: actorFromCaller.fullName,
            email: actorFromCaller.email,
            universityCard: actorFromCaller.universityCard ?? null,
          }
        : fromSession;
      return applyOptimisticAdminRequestDecision(queryClient, {
        requestId,
        status: "REJECTED",
        userName,
        rejectionReason,
        reviewer,
      });
    },
    onError: (error: Error, variables, context) => {
      rollbackOptimisticAdminRequestDecision(queryClient, context);
      const userName = variables.userName || "User";
      showToast.error(
        "Rejection Failed",
        error.message ||
          `Unable to reject admin request for ${userName}. ${error.message.includes("already been processed") ? "This request has already been processed." : "Please try again."}`
      );
    },
    onSuccess: async (data, variables) => {
      await commitMutationCache(queryClient, "admin-request.write", {
        snapshot: () => undefined,
        densify: () => {
          if (data) densifyAdminRequestDecision(queryClient, data);
          densifyActivityLog(queryClient, {
            ...activityActorFromSession(session),
            action: "UPDATE",
            entityType: "admin-request",
            entityId: variables.requestId,
            details: {
              status: "REJECTED",
              ...(data?.userId ? { userId: data.userId } : {}),
            },
          });
        },
      });

      // Show success toast
      const userName = variables.userName || data?.userFullName || "User";
      showToast.success(
        "Admin Request Rejected",
        `Admin request from ${userName} has been rejected.`
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
  const { data: session } = useSession();

  return useMutation({
    mutationFn: async ({ userId }: {
      userId: string;
      userName?: string; // Optional, for toast message
      userEmail?: string;
      userUniversityCard?: string | null;
      /** SSR currentAdmin — merge card when ledger reviewer lacks universityCard. */
      decisionActor?: {
        id?: string | null;
        fullName: string;
        email: string;
        universityCard?: string | null;
      } | null;
    }) => {
      const result = await removeAdminPrivileges(userId);
      if (!result.success) {
        throw new Error(result.error || "Failed to remove admin privileges");
      }
      return { userId, ledger: result.data ?? null };
    },
    onSuccess: async (data, variables) => {
      await commitMutationCache(queryClient, "admin-request.write", {
        snapshot: () => undefined,
        densify: () => {
          densifyUserWrite(queryClient, {
            userId: data.userId,
            role: "USER",
          });
          densifyActivityLog(queryClient, {
            ...activityActorFromSession(session),
            action: "UPDATE",
            entityType: "admin-request",
            entityId: data.ledger?.requestId ?? null,
            details: {
              role: "USER",
              status: "REVOKED",
              userId: data.userId,
            },
          });
          if (!data.ledger) return;
          const reviewer = data.ledger.reviewer
            ? {
                ...data.ledger.reviewer,
                universityCard:
                  data.ledger.reviewer.universityCard ??
                  variables.decisionActor?.universityCard ??
                  null,
              }
            : null;
          densifyAdminPrivilegeRevoke(queryClient, {
            id: data.ledger.requestId,
            userId: data.ledger.userId,
            userEmail: data.ledger.userEmail,
            userFullName: data.ledger.userFullName,
            userUniversityCard:
              data.ledger.userUniversityCard ??
              variables.userUniversityCard ??
              null,
            requestReason: ADMIN_REQUEST_DIRECT_GRANT_REASON,
            status: "REJECTED",
            reviewedBy: data.ledger.reviewedBy,
            reviewedAt: new Date(data.ledger.decidedAt),
            rejectionReason: ADMIN_REQUEST_REVOKED_REASON,
            createdAt: new Date(data.ledger.decidedAt),
            updatedAt: new Date(data.ledger.decidedAt),
            reviewer,
          });
        },
      });

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
  const { data: session } = useSession();

  return useMutation({
    mutationFn: async ({ fineAmount }: {
      fineAmount: number;
    }) => {
      const config = await updateFineConfig(fineAmount);
      return config;
    },
    onSuccess: async (data, variables) => {
      await commitMutationCache(queryClient, "fine.write", {
        snapshot: () => undefined,
        densify: () => {
          densifyFineConfig(queryClient, data);
          densifyActivityLog(queryClient, {
            ...activityActorFromSession(session),
            action: "UPDATE",
            entityType: "borrow",
            entityId: null,
            details: {
              status: "FINE_CONFIG",
              amount: variables.fineAmount,
            },
          });
        },
      });

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
  const { data: session } = useSession();

  return useMutation({
    mutationFn: async () => {
      const result = await sendDueReminders();
      return result;
    },
    onSuccess: async (data) => {
      const count = data.results?.length || 0;
      await commitMutationCache(queryClient, "operations.write", {
        snapshot: () => undefined,
        densify: () => {
          densifyReminderStats(queryClient, { sentCount: count });
          densifyActivityLog(queryClient, {
            ...activityActorFromSession(session),
            action: "UPDATE",
            entityType: "borrow",
            entityId: null,
            details: { status: "DUE_SOON_REMINDERS", count },
          });
        },
      });

      // Show success toast
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
  const { data: session } = useSession();

  return useMutation({
    mutationFn: async () => {
      const result = await sendOverdueReminders();
      return result;
    },
    onSuccess: async (data) => {
      const count = data.results?.length || 0;
      await commitMutationCache(queryClient, "operations.write", {
        snapshot: () => undefined,
        densify: () => {
          densifyReminderStats(queryClient, { sentCount: count });
          densifyActivityLog(queryClient, {
            ...activityActorFromSession(session),
            action: "UPDATE",
            entityType: "borrow",
            entityId: null,
            details: { status: "OVERDUE_REMINDERS", count },
          });
        },
      });

      // Show success toast
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
  const { data: session } = useSession();

  return useMutation({
    mutationFn: async ({
      customFineAmount,
    }: {
      customFineAmount?: number; // Optional custom fine amount
    } = {}) => {
      const result = await updateOverdueFines(customFineAmount);
      return result;
    },
    onSuccess: async (data) => {
      const count = data.results?.length || 0;
      await commitMutationCache(queryClient, "fine.write", {
        snapshot: () => undefined,
        densify: () => {
          densifyOverdueFines(queryClient, data.results);
          densifyActivityLog(queryClient, {
            ...activityActorFromSession(session),
            action: "UPDATE",
            entityType: "borrow",
            entityId: null,
            // API uses forceUpdateOverdueFines — match server audit status label.
            details: { status: "FINE_FORCE_UPDATE", count },
          });
        },
      });

      // Show success toast
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
  const { data: session } = useSession();

  return useMutation({
    mutationFn: async () => {
      const result = await generateAllUserRecommendations();
      return result;
    },
    onSuccess: async (data) => {
      await commitMutationCache(queryClient, "recommendation.write", {
        snapshot: () => undefined,
        densify: () => {
          densifyRecommendationWrite(queryClient);
          densifyActivityLog(queryClient, {
            ...activityActorFromSession(session),
            action: "UPDATE",
            entityType: "book",
            entityId: null,
            details: {
              status: "RECOMMENDATIONS_GENERATED",
              count: data.totalRecommendations,
              users: data.totalUsers,
            },
          });
        },
      });

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
  const { data: session } = useSession();

  return useMutation({
    mutationFn: async () => {
      const result = await updateTrendingBooks();
      return result;
    },
    onSuccess: async (data) => {
      await commitMutationCache(queryClient, "recommendation.write", {
        snapshot: () => undefined,
        densify: () => {
          densifyRecommendationWrite(queryClient);
          densifyActivityLog(queryClient, {
            ...activityActorFromSession(session),
            action: "UPDATE",
            entityType: "book",
            entityId: null,
            details: {
              status: "TRENDING_UPDATED",
              count: data.trendingCount,
            },
          });
        },
      });

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
  const { data: session } = useSession();

  return useMutation({
    mutationFn: async () => {
      const result = await refreshRecommendationCache();
      return result;
    },
    onSuccess: async (data) => {
      await commitMutationCache(queryClient, "recommendation.write", {
        snapshot: () => undefined,
        densify: () => {
          densifyRecommendationWrite(queryClient);
          densifyActivityLog(queryClient, {
            ...activityActorFromSession(session),
            action: "UPDATE",
            entityType: "book",
            entityId: null,
            details: { status: "RECOMMENDATIONS_REFRESHED" },
          });
        },
      });

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
    onSuccess: async (_data, variables) => {
      await commitMutationCache(queryClient, "notification.write", {
        snapshot: () => undefined,
        densify: () => densifyNotificationMarkRead(queryClient, variables.id),
      });
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
    onSuccess: async () => {
      await commitMutationCache(queryClient, "notification.write", {
        snapshot: () => undefined,
        densify: () => densifyNotificationMarkAllRead(queryClient),
      });
    },
  });
};

// Support Ticket mutations
/** Creates a ticket (APPROVED actor only — enforced server-side). */
export const useCreateSupportTicket = () => {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  return useMutation({
    mutationFn: async (input: CreateTicketInput) => createSupportTicket(input),
    onSuccess: async (ticket) => {
      // Snapshot BEFORE invalidate — removeQueries would otherwise leave densify
      // with only the new row and sibling tickets flash in after refetch.
      await commitMutationCache(queryClient, "ticket.write", {
        snapshot: snapshotTicketListBaselines,
        densify: (baselines) => {
          patchTicketCachesOnCreate(queryClient, ticket, baselines);
          const actor = activityActorFromSession(session);
          densifyActivityLog(queryClient, {
            ...actor,
            action: "CREATE",
            entityType: "ticket",
            entityId: ticket.id,
            details: { subject: ticket.subject },
          });
          densifyTicketDetailAudit(queryClient, {
            ticketId: ticket.id,
            action: "CREATE",
            ...activityActorFromSession(session),
            details: { subject: ticket.subject },
          });
        },
      });
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
  const { data: session } = useSession();

  return useMutation({
    mutationFn: async ({
      ticketId,
      decisionActor: _decisionActor,
      ...input
    }: {
      ticketId: string;
      decisionActor?: AdminRequestReviewer | null;
    } & UpdateTicketInput) => updateSupportTicket(ticketId, input),
    onMutate: async ({ ticketId, decisionActor: _da, ...input }) => {
      const key = queryKeys.tickets.detail(ticketId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<SupportTicketDetail>(key);
      if (previous) {
        queryClient.setQueryData<SupportTicketDetail>(key, {
          ...previous,
          ...input,
        });
      }
      return {
        previous,
        key,
        previousStatus: previous?.status,
        previousPriority: previous?.priority ?? null,
      };
    },
    onSuccess: async (data, variables, context) => {
      const previousStatus =
        context?.previousStatus ?? findCachedTicketStatus(queryClient, data.id);
      const previousPriority = context?.previousPriority ?? null;
      await commitMutationCache(queryClient, "ticket.write", {
        snapshot: snapshotTicketListBaselines,
        densify: (baselines) => {
          patchTicketCachesOnUpdate(
            queryClient,
            data,
            previousStatus,
            baselines,
            previousPriority,
          );
          const actor = activityActorFromSession(
            session,
            variables.decisionActor,
          );
          const details = {
            subject: data.subject,
            ...(data.status ? { status: data.status } : {}),
            ...(data.priority ? { priority: data.priority } : {}),
          };
          densifyActivityLog(queryClient, {
            ...actor,
            action: "UPDATE",
            entityType: "ticket",
            entityId: data.id,
            details,
          });
          densifyTicketDetailAudit(queryClient, {
            ticketId: data.id,
            action: "UPDATE",
            ...actor,
            details,
          });
        },
      });
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
  const { data: session } = useSession();

  return useMutation({
    mutationFn: async ({
      ticketId,
      decisionActor: _decisionActor,
    }: {
      ticketId: string;
      decisionActor?: AdminRequestReviewer | null;
    }) => {
      const previousStatus = findCachedTicketStatus(queryClient, ticketId);
      const detail = queryClient.getQueryData<SupportTicketDetail>(
        queryKeys.tickets.detail(ticketId),
      );
      await deleteSupportTicket(ticketId);
      return {
        ticketId,
        previousStatus,
        previousPriority: detail?.priority ?? null,
        userId: detail?.userId ?? null,
        subject: detail?.subject ?? null,
      };
    },
    onSuccess: async (
      { ticketId, previousStatus, previousPriority, userId, subject },
      variables,
    ) => {
      await commitMutationCache(queryClient, "ticket.write", {
        snapshot: snapshotTicketListBaselines,
        densify: (baselines) => {
          patchTicketCachesOnDelete(
            queryClient,
            ticketId,
            previousStatus,
            userId,
            baselines,
            previousPriority,
          );
          densifyActivityLog(queryClient, {
            ...activityActorFromSession(session, variables.decisionActor),
            action: "DELETE",
            entityType: "ticket",
            entityId: ticketId,
            details: subject ? { subject } : null,
          });
        },
      });
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
  const { data: session } = useSession();

  return useMutation({
    mutationFn: async ({
      ticketId,
      body,
      decisionActor: _decisionActor,
    }: {
      ticketId: string;
      body: string;
      decisionActor?: AdminRequestReviewer | null;
    }) => createSupportTicketReply(ticketId, body),
    onSuccess: async (replies, variables) => {
      const detail = queryClient.getQueryData<SupportTicketDetail>(
        queryKeys.tickets.detail(variables.ticketId),
      );
      await commitMutationCache(queryClient, "ticket.write", {
        snapshot: snapshotTicketListBaselines,
        densify: (baselines) => {
          patchTicketCachesOnReply(
            queryClient,
            variables.ticketId,
            replies,
            detail?.userId ?? null,
            baselines,
          );
          const actor = activityActorFromSession(
            session,
            variables.decisionActor,
          );
          const details = {
            ...(detail?.subject ? { subject: detail.subject } : {}),
            reply: true,
          };
          densifyActivityLog(queryClient, {
            ...actor,
            action: "UPDATE",
            entityType: "ticket",
            entityId: variables.ticketId,
            details,
          });
          densifyTicketDetailAudit(queryClient, {
            ticketId: variables.ticketId,
            action: "UPDATE",
            ...actor,
            details,
          });
        },
      });
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
    onSuccess: async (_data, variables) => {
      await commitMutationCache(queryClient, "notification.write", {
        snapshot: () => undefined,
        densify: () => densifyNotificationDelete(queryClient, variables.id),
      });
    },
  });
};
