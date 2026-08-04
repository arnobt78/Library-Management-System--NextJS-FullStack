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
