/**
 * Shared admin-request DTOs (client-safe — no DB imports).
 * Reviewer is resolved via admin_requests.reviewedBy → users.
 */

export type AdminRequestReviewer = {
  fullName: string;
  email: string;
  universityCard: string | null;
};

export type AdminRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

/** Library signup approval strip for /make-admin (approver via users.updatedBy). */
export type SignupApprovalInfo = {
  accountCreatedAt: Date | string | null;
  accountApprovedAt: Date | string | null;
  approver: AdminRequestReviewer | null;
};
