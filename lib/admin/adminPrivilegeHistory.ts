/**
 * User 360 admin privilege request history — shared type + AdminRequest mapper.
 * RQ densify via users.adminPrivilegeHistory (see getAdminUserPrivilegeHistory).
 */

import type { AdminRequestReviewer } from "@/lib/admin/adminRequestTypes";
import type { AdminRequest } from "@/lib/services/users";

export type AdminPrivilegeHistoryEntry = {
  id: string;
  status: string;
  requestReason: string | null;
  rejectionReason: string | null;
  createdAt: Date | string | null;
  reviewedAt: Date | string | null;
  reviewer: AdminRequestReviewer | null;
};

/** Map queue/ledger AdminRequest → User 360 privilege history row. */
export function adminRequestToPrivilegeHistoryEntry(
  request: AdminRequest,
): AdminPrivilegeHistoryEntry {
  return {
    id: request.id,
    status: request.status,
    requestReason: request.requestReason ?? null,
    rejectionReason: request.rejectionReason ?? null,
    createdAt: request.createdAt,
    reviewedAt: request.reviewedAt ?? null,
    reviewer: request.reviewer ?? null,
  };
}
