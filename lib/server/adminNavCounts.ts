/**
 * Aggregated admin sidebar counters (Stockly-style muted pills).
 * SSR + RQ; densify via patchAdminNavCounts / domain invalidation.
 * Parent: admin shell Stockly chrome
 */

import { count, eq } from "drizzle-orm";
import { db } from "@/database/drizzle";
import { books, borrowRecords, users } from "@/database/schema";
import { getPendingAdminRequests } from "@/lib/admin/actions/admin-requests";
import {
  EMPTY_ADMIN_NAV_COUNTS,
  type AdminNavCounts,
} from "@/lib/admin/adminNavCountTypes";
import { getOpenTicketCount } from "@/lib/server/supportTicketData";
import { getPendingReviewCount } from "@/lib/server/reviewData";

export type { AdminNavCounts };
export { EMPTY_ADMIN_NAV_COUNTS };

/** Server-authoritative counts for sidebar badges (no Redis business cache). */
export async function getAdminNavCounts(): Promise<AdminNavCounts> {
  const [
    bookRow,
    userRow,
    pendingSignUpRow,
    pendingBorrowRow,
    pendingAdminResult,
    openTickets,
    pendingReviews,
  ] = await Promise.all([
    db.select({ value: count() }).from(books).then((r) => r[0]?.value ?? 0),
    db.select({ value: count() }).from(users).then((r) => r[0]?.value ?? 0),
    db
      .select({ value: count() })
      .from(users)
      .where(eq(users.status, "PENDING"))
      .then((r) => r[0]?.value ?? 0),
    db
      .select({ value: count() })
      .from(borrowRecords)
      .where(eq(borrowRecords.status, "PENDING"))
      .then((r) => r[0]?.value ?? 0),
    getPendingAdminRequests(),
    getOpenTicketCount(),
    getPendingReviewCount(),
  ]);

  const pendingAdminRequests = pendingAdminResult.success
    ? (pendingAdminResult.data?.length ?? 0)
    : 0;

  return {
    books: Number(bookRow) || 0,
    users: Number(userRow) || 0,
    pendingAdminRequests,
    pendingSignUps: Number(pendingSignUpRow) || 0,
    pendingBorrows: Number(pendingBorrowRow) || 0,
    openTickets: openTickets || 0,
    pendingReviews: pendingReviews || 0,
  };
}
