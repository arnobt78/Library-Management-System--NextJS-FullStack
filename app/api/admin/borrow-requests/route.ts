/**
 * Admin Borrow Requests API Route
 *
 * GET /api/admin/borrow-requests
 *
 * Purpose: Get all borrow requests with user and book details for admin management.
 * Uses shared loadAllBorrowRequestsRows (approver/returner/canceler joins) so
 * Status & Issuer densify survives invalidate refetch after borrow.lifecycle.
 *
 * Query Parameters:
 * - status (optional): Filter by status (PENDING, BORROWED, RETURNED, CANCELLED)
 * - search (optional): Case-insensitive title/author/name/email/universityId
 *
 * IMPORTANT: This route uses Node.js runtime (not Edge) because it needs database access
 */

import { NextRequest, NextResponse } from "next/server";
import { authorizeAdminRoute } from "@/lib/auth/routeAuthorization";
import { loadAllBorrowRequestsRows } from "@/lib/admin/loadBorrowRequestsList";

export const runtime = "nodejs";

/**
 * Get all borrow requests with user and book details (admin view)
 */
export async function GET(request: NextRequest) {
  try {
    const authorization = await authorizeAdminRoute();
    if (!authorization.ok) return authorization.response;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");

    const requests = await loadAllBorrowRequestsRows({
      status,
      search: search || null,
    });

    return NextResponse.json({
      success: true,
      requests,
    });
  } catch (error) {
    console.error("Error fetching borrow requests:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch borrow requests",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
}
