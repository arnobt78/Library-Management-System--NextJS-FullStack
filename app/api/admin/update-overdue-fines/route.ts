import { NextRequest, NextResponse } from "next/server";
import { forceUpdateOverdueFines } from "@/lib/admin/actions/borrow";
import { authorizeAdminRoute } from "@/lib/auth/routeAuthorization";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const authorization = await authorizeAdminRoute();
    if (!authorization.ok) return authorization.response;

    // Parse request body to get custom fine amount if provided
    let customFineAmount: number | undefined;
    try {
      const body = await request.json();
      if (body.fineAmount && typeof body.fineAmount === "number") {
        customFineAmount = body.fineAmount;
      }
    } catch {
      // If no JSON body or parsing fails, continue with default
    }

    const results = await forceUpdateOverdueFines(customFineAmount);

    return NextResponse.json({
      success: true,
      message: `Updated fines for ${results.length} overdue books`,
      results,
    });
  } catch (error) {
    console.error("Failed to update overdue fines", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to update overdue fines",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
