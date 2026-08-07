/**
 * Admin Dashboard Page
 *
 * Server Component that fetches admin statistics server-side for SSR.
 * Passes initial data to Client Component for React Query integration.
 * Stats shape shared with GET /api/admin/stats via buildAdminDashboardStats.
 */

import React from "react";
import { eq } from "drizzle-orm";
import { getAllUsers } from "@/lib/admin/actions/user";
import { getAllBorrowRequests } from "@/lib/admin/actions/borrow";
import { buildAdminDashboardStats } from "@/lib/admin/buildAdminDashboardStats";
import { db } from "@/database/drizzle";
import { books, reservations } from "@/database/schema";
import { getSupportTicketOverviewCounts } from "@/lib/server/supportTicketData";
import { getBookReviewOverviewCounts } from "@/lib/server/reviewData";
import { getAdminRequestOverviewCounts } from "@/lib/server/adminRequestCounts";
import AdminDashboardContent from "@/components/AdminDashboardContent";

export const runtime = "nodejs";

const Page = async ({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) => {
  const params = await searchParams;
  // Fetch all data for dashboard, including cross-domain KPI counts (Wave 4 rollout)
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

  const initialStats = buildAdminDashboardStats({
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

  return (
    <AdminDashboardContent
      initialStats={initialStats}
      successMessage={params.success}
    />
  );
};

export default Page;
