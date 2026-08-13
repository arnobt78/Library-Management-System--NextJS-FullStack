/**
 * GET /api/admin/borrow-requests/[id]
 *
 * Admin Borrow Queue detail — borrower + book + optional approver/returner
 * person joins (email fields on borrow_records).
 */

import { NextRequest, NextResponse } from "next/server";
import { authorizeAdminRoute } from "@/lib/auth/routeAuthorization";
import { loadBorrowRequestById } from "@/lib/admin/actions/borrow";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authorization = await authorizeAdminRoute();
    if (!authorization.ok) return authorization.response;

    const { id } = await params;
    const result = await loadBorrowRequestById(id);
    if (!result.success || !result.data) {
      const notFound =
        result.error === "Borrow request not found" ||
        result.error?.toLowerCase().includes("not found");
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Borrow request not found",
        },
        { status: notFound ? 404 : 500 },
      );
    }

    return NextResponse.json({
      success: true,
      request: result.data,
    });
  } catch (error) {
    console.error("Error fetching borrow request detail:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch borrow request",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
}
