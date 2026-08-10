/**
 * Admin privilege display status for User 360 KPI (separate from registration status).
 * Derived from role + pending make-admin id + latest admin_requests row.
 */

export type AdminPrivilegeStatus =
  | "NOT_REQUESTED"
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

export type LatestAdminRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export const ADMIN_PRIVILEGE_STATUS_LABELS: Record<
  AdminPrivilegeStatus,
  string
> = {
  NOT_REQUESTED: "Not requested",
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

/**
 * Prefer live role ADMIN → Approved; else pending id → Pending;
 * else latest ledger status; else Not requested.
 */
export function deriveAdminPrivilegeStatus(args: {
  role?: string | null;
  pendingAdminRequestId?: string | null;
  latestAdminRequestStatus?: LatestAdminRequestStatus | null;
}): AdminPrivilegeStatus {
  if (args.role === "ADMIN") return "APPROVED";
  if (args.pendingAdminRequestId) return "PENDING";
  if (args.latestAdminRequestStatus === "APPROVED") return "APPROVED";
  if (args.latestAdminRequestStatus === "REJECTED") return "REJECTED";
  if (args.latestAdminRequestStatus === "PENDING") return "PENDING";
  return "NOT_REQUESTED";
}
