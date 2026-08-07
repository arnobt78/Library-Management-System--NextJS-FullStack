/**
 * Admin Stats API Route
 *
 * GET /api/admin/stats
 *
 * Same enriched payload as app/admin/page.tsx via buildAdminDashboardStats
 * so RQ refetch cannot wipe overview Recent rows / KPI badges.
 *
 * IMPORTANT: Node.js runtime (not Edge) — needs database access.
 * Parent: REQ-0033 Wave B — stats parity
 */

import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getAllUsers } from "@/lib/admin/actions/user";
import { getAllBorrowRequests } from "@/lib/admin/actions/borrow";
import { buildAdminDashboardStats } from "@/lib/admin/buildAdminDashboardStats";
import { db } from "@/database/drizzle";
import { books, reservations } from "@/database/schema";
import { getSupportTicketOverviewCounts } from "@/lib/server/supportTicketData";
import { getBookReviewOverviewCounts } from "@/lib/server/reviewData";
import { getAdminRequestOverviewCounts } from "@/lib/server/adminRequestCounts";
import { authorizeAdminRoute } from "@/lib/auth/routeAuthorization";

export const runtime = "nodejs";

export async function GET(_request: NextRequest) {
  try {
    const authorization = await authorizeAdminRoute();
    if (!authorization.ok) return authorization.response;

    const [
      usersResult,
      borrowResult,
      booksResult,
      reservationsWaitingRows,
      ticketCounts,
      reviewCounts,
      adminRequestCounts,
    ] = await Promise.all([
      getAllUsers(),
      getAllBorrowRequests(),
      db.select().from(books),
      db
        .select({ id: reservations.id })
        .from(reservations)
        .where(eq(reservations.status, "WAITING")),
      getSupportTicketOverviewCounts(),
      getBookReviewOverviewCounts(),
      getAdminRequestOverviewCounts(),
    ]);

    const stats = buildAdminDashboardStats({
      users: (usersResult.success ? usersResult.data : null) ?? [],
      borrowRequests: (borrowResult.success ? borrowResult.data : null) ?? [],
      books: booksResult,
      reservationsWaiting: reservationsWaitingRows.length,
      openTicketCount: ticketCounts.openTicketCount,
      ticketsOpen: ticketCounts.ticketsOpen,
      ticketsInProgress: ticketCounts.ticketsInProgress,
      ticketsResolved: ticketCounts.ticketsResolved,
      ticketsUrgentOpen: ticketCounts.ticketsUrgentOpen,
      pendingReviewCount: reviewCounts.pendingReviewCount,
      reviewsApproved: reviewCounts.reviewsApproved,
      reviewsRejected: reviewCounts.reviewsRejected,
      pendingAdminRequests: adminRequestCounts.pendingAdminRequests,
      rejectedAdminRequests: adminRequestCounts.rejectedAdminRequests,
      approvedAdminRequests: adminRequestCounts.approvedAdminRequests,
    });

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch admin statistics",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
}
