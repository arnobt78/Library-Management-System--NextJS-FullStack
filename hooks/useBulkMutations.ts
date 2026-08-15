/**
 * Automation bulk mutations — invalidate densify per domain after server bulk-*.
 * Server already logActivity; client invent skipped to avoid duplicate Activity rows.
 * Parent: Bulk Automation wire-up + Agent Review real fixes
 */
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  bulkActivateBooks,
  bulkApproveBorrowRequests,
  bulkApproveUsers,
  bulkDeactivateBooks,
  bulkDeleteBooks,
  bulkMakeAdminUsers,
  bulkRejectBorrowRequests,
  bulkRejectUsers,
  bulkRemoveAdminUsers,
  listPendingBorrowRecordIds,
  listPendingSignupUserIds,
} from "@/lib/admin/actions/bulk-operations";
import { commitMutationCache } from "@/lib/query/mutationGateway";
import { densifyBookDelete } from "@/lib/utils/patchBookCaches";
import { showToast } from "@/lib/toast";
import type { MutationDomainName } from "@/lib/utils/queryInvalidation";

type BulkOk = { success: true; message?: string; count?: number };

function assertOk(
  result: { success: boolean; message?: string; count?: number },
): BulkOk {
  if (!result.success) {
    throw new Error(result.message || "Bulk operation failed");
  }
  return result as BulkOk;
}

/** Invalidate-only — server already appended activity; no invent row. */
async function commitBulkInvalidate(
  queryClient: ReturnType<typeof useQueryClient>,
  domain: MutationDomainName,
) {
  await commitMutationCache(queryClient, domain, {
    snapshot: () => undefined,
    densify: () => undefined,
  });
}

export function useBulkActivateBooks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bookIds: string[]) =>
      assertOk(await bulkActivateBooks(bookIds)),
    onSuccess: async (data) => {
      await commitBulkInvalidate(queryClient, "book.write");
      showToast.success("Books Activated", data.message || "Done.");
    },
    onError: (error: Error) => {
      showToast.error("Activate Failed", error.message);
    },
  });
}

export function useBulkDeactivateBooks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bookIds: string[]) =>
      assertOk(await bulkDeactivateBooks(bookIds)),
    onSuccess: async (data) => {
      await commitBulkInvalidate(queryClient, "book.write");
      showToast.success("Books Deactivated", data.message || "Done.");
    },
    onError: (error: Error) => {
      showToast.error("Deactivate Failed", error.message);
    },
  });
}

export function useBulkDeleteBooksAutomation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: { bookIds: string[]; deleteSecret: string }) => {
      const result = assertOk(
        await bulkDeleteBooks(args.bookIds, args.deleteSecret),
      );
      return { ...result, bookIds: args.bookIds };
    },
    onSuccess: async (data) => {
      // Catalog densify parity with useDeleteBook (lists/KPIs); no activity invent.
      await commitMutationCache(queryClient, "book.write", {
        snapshot: () => undefined,
        densify: () => {
          densifyBookDelete(queryClient, data.bookIds);
        },
      });
      showToast.success("Books Deleted", data.message || "Done.");
    },
    onError: (error: Error) => {
      showToast.error("Delete Failed", error.message);
    },
  });
}

export function useBulkApproveUsers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userIds: string[]) =>
      assertOk(await bulkApproveUsers(userIds)),
    onSuccess: async (data) => {
      await commitBulkInvalidate(queryClient, "user.write");
      showToast.success(
        "Users Approved",
        data.message ||
          (typeof data.count === "number"
            ? `Approved ${data.count} user(s).`
            : "Done."),
      );
    },
    onError: (error: Error) => {
      showToast.error("Approve Failed", error.message);
    },
  });
}

export function useBulkRejectUsers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userIds: string[]) =>
      assertOk(await bulkRejectUsers(userIds)),
    onSuccess: async (data) => {
      await commitBulkInvalidate(queryClient, "user.write");
      showToast.success("Users Rejected", data.message || "Done.");
    },
    onError: (error: Error) => {
      showToast.error("Reject Failed", error.message);
    },
  });
}

export function useBulkMakeAdminUsers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userIds: string[]) =>
      assertOk(await bulkMakeAdminUsers(userIds)),
    onSuccess: async (data) => {
      await commitBulkInvalidate(queryClient, "admin-request.write");
      showToast.success("Admins Promoted", data.message || "Done.");
    },
    onError: (error: Error) => {
      showToast.error("Promote Failed", error.message);
    },
  });
}

export function useBulkRemoveAdminUsers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userIds: string[]) =>
      assertOk(await bulkRemoveAdminUsers(userIds)),
    onSuccess: async (data) => {
      await commitBulkInvalidate(queryClient, "admin-request.write");
      showToast.success("Admins Demoted", data.message || "Done.");
    },
    onError: (error: Error) => {
      showToast.error("Demote Failed", error.message);
    },
  });
}

export function useBulkApproveBorrowRequests() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (recordIds: string[]) =>
      assertOk(await bulkApproveBorrowRequests(recordIds)),
    onSuccess: async (data) => {
      await commitBulkInvalidate(queryClient, "borrow.lifecycle");
      showToast.success("Requests Approved", data.message || "Done.");
    },
    onError: (error: Error) => {
      showToast.error("Approve Failed", error.message);
    },
  });
}

export function useBulkRejectBorrowRequests() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (recordIds: string[]) =>
      assertOk(await bulkRejectBorrowRequests(recordIds)),
    onSuccess: async (data) => {
      await commitBulkInvalidate(queryClient, "borrow.lifecycle");
      showToast.success("Requests Rejected", data.message || "Done.");
    },
    onError: (error: Error) => {
      showToast.error("Reject Failed", error.message);
    },
  });
}

export { listPendingSignupUserIds, listPendingBorrowRecordIds };
