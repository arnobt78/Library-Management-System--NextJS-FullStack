/**
 * Shared admin-request constants (client-safe — no DB imports).
 * Keep non-async values here; "use server" action files may only export async functions.
 */

/** Stored when the applicant withdraws their own PENDING request */
export const ADMIN_REQUEST_WITHDRAWN_REASON = "Withdrawn by applicant";

/**
 * Stored when a librarian demotes an admin via All Users → Remove Admin.
 * Make-admin UI treats this like a decline so the applicant can re-apply.
 */
export const ADMIN_REQUEST_REVOKED_REASON =
  "Admin privileges were removed by a librarian. You can request access again if needed.";

/**
 * Stored as request_reason when All Users (or bulk) grants ADMIN without a prior
 * PENDING make-admin application — keeps admin_requests ledger aligned with role.
 * Must satisfy adminRequestReasonSchema (min 10 / max 1000).
 */
export const ADMIN_REQUEST_DIRECT_GRANT_REASON =
  "Admin privileges granted directly by a librarian (All Users / bulk promote).";

/** Cap for Admin Requests Recent decisions table (newest reviewedAt first). */
export const RECENT_ADMIN_REQUEST_DECISIONS_LIMIT = 25;

/**
 * Prefill for admin Decline dialog (editable). Shown to applicant as Reason:.
 * Must satisfy adminRequestReasonSchema (min 10 / max 1000).
 */
export const DEFAULT_ADMIN_REJECTION_REASON =
  "Not approved for admin access right now — often for capacity, role fit, or demo/testing. Nothing personal; you can request again later.";
