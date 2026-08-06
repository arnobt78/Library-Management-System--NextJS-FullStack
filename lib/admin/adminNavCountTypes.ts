/**
 * Admin sidebar nav count shape (client-safe — no DB import).
 * Server fetch: `lib/server/adminNavCounts.ts`. Densify: `patchAdminNavCounts`.
 */

export type AdminNavCounts = {
  books: number;
  users: number;
  pendingAdminRequests: number;
  pendingSignUps: number;
  pendingBorrows: number;
  openTickets: number;
  pendingReviews: number;
};

export const EMPTY_ADMIN_NAV_COUNTS: AdminNavCounts = {
  books: 0,
  users: 0,
  pendingAdminRequests: 0,
  pendingSignUps: 0,
  pendingBorrows: 0,
  openTickets: 0,
  pendingReviews: 0,
};
