import { NextRequest, NextResponse } from "next/server";
import {
  getDailyFineAmount,
  setDailyFineAmount,
  initializeDefaultConfigs,
} from "@/lib/admin/actions/config";
import { authorizeAdminRoute } from "@/lib/auth/routeAuthorization";
import { logActivity } from "@/lib/admin/activityLog";

export const runtime = "nodejs";

// GET - Retrieve current fine amount
export async function GET() {
  try {
    const authorization = await authorizeAdminRoute();
    if (!authorization.ok) return authorization.response;

    // Initialize default configs if they don't exist
    await initializeDefaultConfigs();

    const fineAmount = await getDailyFineAmount();

    return NextResponse.json({
      success: true,
      fineAmount,
    });
  } catch (error) {
    console.error("Error getting fine amount:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get fine amount",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST - Update fine amount
export async function POST(request: NextRequest) {
  try {
    const authorization = await authorizeAdminRoute();
    if (!authorization.ok) return authorization.response;

    const body = await request.json();
    const { fineAmount } = body;

    if (typeof fineAmount !== "number" || fineAmount < 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid fine amount. Must be a positive number.",
        },
        { status: 400 }
      );
    }

    const result = await setDailyFineAmount(
      fineAmount,
      authorization.actor.email
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to update fine amount",
        },
        { status: 500 }
      );
    }

    await logActivity({
      actorId: authorization.actor.id,
      action: "UPDATE",
      entityType: "borrow",
      entityId: null,
      details: { status: "FINE_CONFIG", amount: fineAmount },
    });

    return NextResponse.json({
      success: true,
      message: `Fine amount updated to $${fineAmount} per day`,
      fineAmount,
    });
  } catch (error) {
    console.error("Error updating fine amount:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update fine amount",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
