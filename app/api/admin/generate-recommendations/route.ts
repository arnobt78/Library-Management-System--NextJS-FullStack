/**
 * Admin Generate Recommendations API Route
 *
 * POST /api/admin/generate-recommendations
 *
 * Purpose: Generate personalized recommendations for all users.
 *
 * Returns:
 * - success: boolean
 * - results: Array of { userId, recommendations }
 * - totalUsers: number
 * - totalRecommendations: number
 *
 * IMPORTANT: This route uses Node.js runtime (not Edge) because it needs database access
 */

import { NextRequest, NextResponse } from "next/server";
import { generateAllUserRecommendations } from "@/lib/admin/actions/recommendations";
import { authorizeAdminRoute } from "@/lib/auth/routeAuthorization";
import { revalidateMutationPaths } from "@/lib/utils/revalidateMutation";

export const runtime = "nodejs";

export async function POST(_request: NextRequest) {
  try {
    const authorization = await authorizeAdminRoute();
    if (!authorization.ok) return authorization.response;

    const results = await generateAllUserRecommendations();
    revalidateMutationPaths("recommendation.write");
    const totalUsers = results.length;
    const totalRecommendations = results.reduce(
      (sum, user) => sum + user.recommendations.length,
      0
    );

    return NextResponse.json({
      success: true,
      results,
      totalUsers,
      totalRecommendations,
      message: `Generated ${totalRecommendations} recommendations for ${totalUsers} users`,
    });
  } catch (error) {
    console.error("Error generating recommendations:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate recommendations",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
