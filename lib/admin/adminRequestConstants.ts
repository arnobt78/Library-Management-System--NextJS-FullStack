/**
 * Shared admin-request constants (client-safe — no DB imports).
 * Keep non-async values here; "use server" action files may only export async functions.
 */

/** Stored when the applicant withdraws their own PENDING request */
export const ADMIN_REQUEST_WITHDRAWN_REASON = "Withdrawn by applicant";

/** Cap for /admin/users Recent decisions list (newest reviewedAt first). */
export const RECENT_ADMIN_REQUEST_DECISIONS_LIMIT = 20;

/**
 * Prefill for admin Decline dialog (editable). Shown to applicant as Reason:.
 * Must satisfy adminRequestReasonSchema (min 10 / max 1000).
 */
export const DEFAULT_ADMIN_REJECTION_REASON =
  "Not approved for admin access right now — often for capacity, role fit, or demo/testing. Nothing personal; you can request again later.";
