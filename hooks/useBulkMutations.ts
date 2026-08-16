/**
 * Automation bulk mutations — invalidate densify per domain after server bulk-*.
 * Server already logActivity; client invent skipped to avoid duplicate Activity rows.
 * Parent: Bulk Automation wire-up + Agent Review real fixes
 */
"use client";

import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
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
import {
  densifyBookDelete,
  densifyBookWrite,
} from "@/lib/utils/patchBookCaches";
import { densifyUserWrite } from "@/lib/utils/patchUserCaches";
import {
  densifyAdminRequestRemovePending,
  patchUsersAdminPrivilegeFields,
} from "@/lib/utils/patchAdminRequestCaches";
import {
  findCachedBorrowMeta,
  patchBorrowCachesOnStatusChange,
  snapshotBorrowCacheBaselines,
} from "@/lib/utils/patchBorrowCaches";
import { markActivityEntitiesDeleted } from "@/lib/utils/patchActivityCaches";
import { queryKeys } from "@/lib/query/keys";
import { showToast } from "@/lib/toast";
import type { BorrowStatus } from "@/lib/services/borrows";
import type { AdminRequest } from "@/lib/services/users";

type BulkOk = { success: true; message?: string; count?: number };

function assertOk(
  result: { success: boolean; message?: string; count?: number },
): BulkOk {
  if (!result.success) {
    throw new Error(result.message || "Bulk operation failed");
  }
  return result as BulkOk;
}

function densifyBulkBookActive(
  queryClient: QueryClient,
  bookIds: string[],
  isActive: boolean,
): void {
  for (const id of bookIds) {
    densifyBookWrite(queryClient, { id, isActive });
  }
}

function densifyBulkUserStatus(
  queryClient: QueryClient,
  userIds: string[],
  status: "APPROVED" | "REJECTED",
): void {
  for (const userId of userIds) {
    densifyUserWrite(queryClient, { userId, status });
  }
}

function densifyBulkUserRole(
  queryClient: QueryClient,
  userIds: string[],
  role: "ADMIN" | "USER",
): void {
  for (const userId of userIds) {
    densifyUserWrite(queryClient, { userId, role });
  }
}

/**
 * Bulk promote/demote — role densify + drop warm pending admin-request rows
 * so Automation/All Users badges do not wait on refetch.
 */
function densifyBulkAdminPrivilege(
  queryClient: QueryClient,
  userIds: string[],
  role: "ADMIN" | "USER",
): void {
  densifyBulkUserRole(queryClient, userIds, role);
  const pending = queryClient.getQueryData<AdminRequest[]>(
    queryKeys.admin.pendingRequests,
  );
  if (Array.isArray(pending)) {
    for (const row of pending) {
      if (!userIds.includes(row.userId)) continue;
      densifyAdminRequestRemovePending(queryClient, row.id, {
        userId: row.userId,
        overviewWithdraw: role === "ADMIN",
      });
    }
  }
  for (const userId of userIds) {
    patchUsersAdminPrivilegeFields(queryClient, {
      userId,
      pendingAdminRequestId: null,
      latestAdminRequestStatus: role === "ADMIN" ? "APPROVED" : "REJECTED",
    });
  }
}

/** List/KPI densify for bulk borrow approve/reject (no activity invent). */
function densifyBulkBorrowStatus(
  queryClient: QueryClient,
  recordIds: string[],
  status: "BORROWED" | "CANCELLED",
): void {
  const bookIds = [
    ...new Set(
      recordIds
        .map((id) => findCachedBorrowMeta(queryClient, id)?.bookId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const baselines =
    status === "BORROWED"
      ? snapshotBorrowCacheBaselines(queryClient, bookIds)
      : undefined;
  const dueDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  })();

  for (const recordId of recordIds) {
    const meta = findCachedBorrowMeta(queryClient, recordId);
    const fromStatus = (meta?.status ?? "PENDING") as BorrowStatus;
    const applyInventory =
      status === "BORROWED" &&
      fromStatus === "PENDING" &&
      Boolean(meta?.bookId);

    patchBorrowCachesOnStatusChange(
      queryClient,
      {
        recordId,
        patch:
          status === "BORROWED"
            ? { status: "BORROWED", dueDate }
            : { status: "CANCELLED" },
        userId: meta?.userId,
        bookId: meta?.bookId,
        fromStatus,
        ...(applyInventory
          ? { inventory: { availableDelta: -1, activeDelta: 1 } }
          : {}),
      },
      baselines,
    );
  }
}

export function useBulkActivateBooks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bookIds: string[]) => {
      const result = assertOk(await bulkActivateBooks(bookIds));
      return { ...result, bookIds };
    },
    onSuccess: async (data) => {
      await commitMutationCache(queryClient, "book.write", {
        snapshot: () => undefined,
        densify: () => densifyBulkBookActive(queryClient, data.bookIds, true),
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
  return useMutation({
    mutationFn: async (bookIds: string[]) => {
      const result = assertOk(await bulkDeactivateBooks(bookIds));
      return { ...result, bookIds };
    },
    onSuccess: async (data) => {
      await commitMutationCache(queryClient, "book.write", {
        snapshot: () => undefined,
        densify: () => densifyBulkBookActive(queryClient, data.bookIds, false),
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
          markActivityEntitiesDeleted(queryClient, "book", data.bookIds);
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
    mutationFn: async (userIds: string[]) => {
      const result = assertOk(await bulkApproveUsers(userIds));
      return { ...result, userIds };
    },
    onSuccess: async (data) => {
      await commitMutationCache(queryClient, "user.write", {
        snapshot: () => undefined,
        densify: () =>
          densifyBulkUserStatus(queryClient, data.userIds, "APPROVED"),
      });
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
    mutationFn: async (userIds: string[]) => {
      const result = assertOk(await bulkRejectUsers(userIds));
      return { ...result, userIds };
    },
    onSuccess: async (data) => {
      await commitMutationCache(queryClient, "user.write", {
        snapshot: () => undefined,
        densify: () =>
          densifyBulkUserStatus(queryClient, data.userIds, "REJECTED"),
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
  return useMutation({
    mutationFn: async (userIds: string[]) => {
      const result = assertOk(await bulkMakeAdminUsers(userIds));
      return { ...result, userIds };
    },
    onSuccess: async (data) => {
      await commitMutationCache(queryClient, "admin-request.write", {
        snapshot: () => undefined,
        densify: () =>
          densifyBulkAdminPrivilege(queryClient, data.userIds, "ADMIN"),
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
  return useMutation({
    mutationFn: async (userIds: string[]) => {
      const result = assertOk(await bulkRemoveAdminUsers(userIds));
      return { ...result, userIds };
    },
    onSuccess: async (data) => {
      await commitMutationCache(queryClient, "admin-request.write", {
        snapshot: () => undefined,
        densify: () =>
          densifyBulkAdminPrivilege(queryClient, data.userIds, "USER"),
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
  return useMutation({
    mutationFn: async (recordIds: string[]) => {
      const result = assertOk(await bulkApproveBorrowRequests(recordIds));
      return { ...result, recordIds };
    },
    onSuccess: async (data) => {
      await commitMutationCache(queryClient, "borrow.lifecycle", {
        snapshot: () => undefined,
        densify: () =>
          densifyBulkBorrowStatus(queryClient, data.recordIds, "BORROWED"),
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
  return useMutation({
    mutationFn: async (recordIds: string[]) => {
      const result = assertOk(await bulkRejectBorrowRequests(recordIds));
      return { ...result, recordIds };
    },
    onSuccess: async (data) => {
      await commitMutationCache(queryClient, "borrow.lifecycle", {
        snapshot: () => undefined,
        densify: () =>
          densifyBulkBorrowStatus(queryClient, data.recordIds, "CANCELLED"),
      });
      showToast.success("Requests Rejected", data.message || "Done.");
    },
    onError: (error: Error) => {
      showToast.error("Reject Failed", error.message);
    },
  });
}

export { listPendingSignupUserIds, listPendingBorrowRecordIds };
