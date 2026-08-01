/**
 * Admin Recommendation Refresh API Route
 *
 * POST /api/admin/refresh-recommendation-cache
 *
 * Purpose: Authorize recommendation refresh before browser query invalidation.
 *
 * Returns:
 * - success: boolean
 * - message: string
 * - cacheCleared: boolean
 *
 * IMPORTANT: This route uses Node.js runtime (not Edge) because it needs database access
 */

import { NextRequest, NextResponse } from "next/server";
import { refreshRecommendationCache } from "@/lib/admin/actions/recommendations";
import { authorizeAdminRoute } from "@/lib/auth/routeAuthorization";

export const runtime = "nodejs";

export async function POST(_request: NextRequest) {
  try {
    const authorization = await authorizeAdminRoute();
    if (!authorization.ok) return authorization.response;

    const result = await refreshRecommendationCache();

    return NextResponse.json({
      success: true,
      message: result.message,
      cacheCleared: result.cacheCleared,
    });
  } catch (error) {
    console.error("Error refreshing recommendation cache:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to refresh recommendation cache",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
