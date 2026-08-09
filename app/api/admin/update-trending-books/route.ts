/**
 * Admin Update Trending Books API Route
 *
 * POST /api/admin/update-trending-books
 *
 * Purpose: Update trending books data based on recent borrowing activity.
 *
 * Returns:
 * - success: boolean
 * - message: string
 * - trendingCount: number
 *
 * IMPORTANT: This route uses Node.js runtime (not Edge) because it needs database access
 */

import { NextRequest, NextResponse } from "next/server";
import { updateTrendingBooks } from "@/lib/admin/actions/recommendations";
import { authorizeAdminRoute } from "@/lib/auth/routeAuthorization";
import { revalidateMutationPaths } from "@/lib/utils/revalidateMutation";
import { logActivity } from "@/lib/admin/activityLog";

export const runtime = "nodejs";

export async function POST(_request: NextRequest) {
  try {
    const authorization = await authorizeAdminRoute();
    if (!authorization.ok) return authorization.response;

    const result = await updateTrendingBooks();
    await logActivity({
      actorId: authorization.actor.id,
      action: "UPDATE",
      entityType: "book",
      entityId: null,
      details: {
        status: "TRENDING_UPDATED",
        count: result.trendingCount,
      },
    });
    revalidateMutationPaths("recommendation.write");

    return NextResponse.json({
      success: true,
      message: result.message,
      trendingCount: result.trendingCount,
    });
  } catch (error) {
    console.error("Error updating trending books:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update trending books",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
