/**
 * Automation bulk mutations — invalidate densify per domain after server bulk-*.
 * Parent: Bulk Automation wire-up
 */
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
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
import { densifyActivityLog } from "@/lib/utils/patchActivityCaches";
import { showToast } from "@/lib/toast";
import type { MutationDomainName } from "@/lib/utils/queryInvalidation";

function activityActorFromSession(session: ReturnType<typeof useSession>["data"]) {
  const su = session?.user;
  return {
    actorId: su?.id ?? null,
    actorName: su?.name?.trim() || null,
    actorEmail: su?.email ?? null,
    actorUniversityCard: null as string | null,
  };
}

async function commitBulk(
  queryClient: ReturnType<typeof useQueryClient>,
  domain: MutationDomainName,
  session: ReturnType<typeof useSession>["data"],
  details: {
    action: "UPDATE" | "DELETE";
    entityType: string;
    status: string;
    count: number;
  },
) {
  await commitMutationCache(queryClient, domain, {
    snapshot: () => undefined,
    densify: () => {
      densifyActivityLog(queryClient, {
        ...activityActorFromSession(session),
        action: details.action,
        entityType: details.entityType,
        entityId: null,
        details: { status: details.status, count: details.count },
      });
    },
  });
}

function assertOk(result: { success: boolean; message?: string }) {
  if (!result.success) {
    throw new Error(result.message || "Bulk operation failed");
  }
  return result;
}

export function useBulkActivateBooks() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  return useMutation({
    mutationFn: async (bookIds: string[]) =>
      assertOk(await bulkActivateBooks(bookIds)),
    onSuccess: async (data, bookIds) => {
      await commitBulk(queryClient, "book.write", session, {
        action: "UPDATE",
        entityType: "book",
        status: "ACTIVE",
        count: bookIds.length,
      });
      showToast.success("Books Activated", data.message || "Done.");
    },
    onError: (error: Error) => {
      showToast.error("Activate Failed", error.message);
    },
  });
}

export function useBulkDeactivateBooks() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  return useMutation({
    mutationFn: async (bookIds: string[]) =>
      assertOk(await bulkDeactivateBooks(bookIds)),
    onSuccess: async (data, bookIds) => {
      await commitBulk(queryClient, "book.write", session, {
        action: "UPDATE",
        entityType: "book",
        status: "INACTIVE",
        count: bookIds.length,
      });
      showToast.success("Books Deactivated", data.message || "Done.");
    },
    onError: (error: Error) => {
      showToast.error("Deactivate Failed", error.message);
    },
  });
}

export function useBulkDeleteBooksAutomation() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  return useMutation({
    mutationFn: async (args: { bookIds: string[]; deleteSecret: string }) =>
      assertOk(await bulkDeleteBooks(args.bookIds, args.deleteSecret)),
    onSuccess: async (data, args) => {
      await commitBulk(queryClient, "book.write", session, {
        action: "DELETE",
        entityType: "book",
        status: "DELETED",
        count: args.bookIds.length,
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
  const { data: session } = useSession();
  return useMutation({
    mutationFn: async (userIds: string[]) =>
      assertOk(await bulkApproveUsers(userIds)),
    onSuccess: async (data, userIds) => {
      await commitBulk(queryClient, "user.write", session, {
        action: "UPDATE",
        entityType: "user",
        status: "APPROVED",
        count: userIds.length,
      });
      showToast.success("Users Approved", data.message || "Done.");
    },
    onError: (error: Error) => {
      showToast.error("Approve Failed", error.message);
    },
  });
}

export function useBulkRejectUsers() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  return useMutation({
    mutationFn: async (userIds: string[]) =>
      assertOk(await bulkRejectUsers(userIds)),
    onSuccess: async (data, userIds) => {
      await commitBulk(queryClient, "user.write", session, {
        action: "UPDATE",
        entityType: "user",
        status: "REJECTED",
        count: userIds.length,
      });
      showToast.success("Users Rejected", data.message || "Done.");
    },
    onError: (error: Error) => {
      showToast.error("Reject Failed", error.message);
    },
  });
}

export function useBulkMakeAdminUsers() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  return useMutation({
    mutationFn: async (userIds: string[]) =>
      assertOk(await bulkMakeAdminUsers(userIds)),
    onSuccess: async (data, userIds) => {
      await commitBulk(queryClient, "admin-request.write", session, {
        action: "UPDATE",
        entityType: "admin-request",
        status: "APPROVED",
        count: userIds.length,
      });
      showToast.success("Admins Promoted", data.message || "Done.");
    },
    onError: (error: Error) => {
      showToast.error("Promote Failed", error.message);
    },
  });
}

export function useBulkRemoveAdminUsers() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  return useMutation({
    mutationFn: async (userIds: string[]) =>
      assertOk(await bulkRemoveAdminUsers(userIds)),
    onSuccess: async (data, userIds) => {
      await commitBulk(queryClient, "admin-request.write", session, {
        action: "UPDATE",
        entityType: "admin-request",
        status: "REVOKED",
        count: userIds.length,
      });
      showToast.success("Admins Demoted", data.message || "Done.");
    },
    onError: (error: Error) => {
      showToast.error("Demote Failed", error.message);
    },
  });
}

export function useBulkApproveBorrowRequests() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  return useMutation({
    mutationFn: async (recordIds: string[]) =>
      assertOk(await bulkApproveBorrowRequests(recordIds)),
    onSuccess: async (data, recordIds) => {
      await commitBulk(queryClient, "borrow.lifecycle", session, {
        action: "UPDATE",
        entityType: "borrow",
        status: "BORROWED",
        count: recordIds.length,
      });
      showToast.success("Requests Approved", data.message || "Done.");
    },
    onError: (error: Error) => {
      showToast.error("Approve Failed", error.message);
    },
  });
}

export function useBulkRejectBorrowRequests() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  return useMutation({
    mutationFn: async (recordIds: string[]) =>
      assertOk(await bulkRejectBorrowRequests(recordIds)),
    onSuccess: async (data, recordIds) => {
      await commitBulk(queryClient, "borrow.lifecycle", session, {
        action: "UPDATE",
        entityType: "borrow",
        status: "CANCELLED",
        count: recordIds.length,
      });
      showToast.success("Requests Rejected", data.message || "Done.");
    },
    onError: (error: Error) => {
      showToast.error("Reject Failed", error.message);
    },
  });
}

export { listPendingSignupUserIds, listPendingBorrowRecordIds };
