/**
 * Client-safe signup decision feed constants (no DB / "use server").
 * FIFO retention matches Activity History (latest 50).
 */

/** Cap for Registration Queue Recent decisions (newest decidedAt first). */
export const RECENT_SIGNUP_DECISIONS_LIMIT = 50;
