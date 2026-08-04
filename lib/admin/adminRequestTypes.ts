/**
 * Shared admin-request DTOs (client-safe — no DB imports).
 * Reviewer is resolved via admin_requests.reviewedBy → users.
 */

export type AdminRequestReviewer = {
  /** User id for /admin/users/[id] links when known. */
  id?: string | null;
  fullName: string;
  email: string;
  universityCard: string | null;
};

export type AdminRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

/**
 * Library signup decision strip (make-admin + my-profile).
 * Actor comes from users.statusReviewedBy → users (UUID), not updatedBy email.
 */
export type SignupApprovalInfo = {
  accountCreatedAt: Date | string | null;
  /** When status was last APPROVED or REJECTED (statusReviewedAt). */
  accountDecidedAt: Date | string | null;
  /**
   * @deprecated Prefer accountDecidedAt — kept for APPROVED “approved on” labels.
   */
  accountApprovedAt: Date | string | null;
  /** Admin who approved or rejected registration (null while PENDING). */
  decisionActor: AdminRequestReviewer | null;
  /**
   * @deprecated Prefer decisionActor — alias used by older make-admin strips.
   */
  approver: AdminRequestReviewer | null;
};
