import { NextRequest, NextResponse } from "next/server";
import {
  getDailyFineAmount,
  setDailyFineAmount,
  initializeDefaultConfigs,
} from "@/lib/admin/actions/config";

export const runtime = "nodejs";

// GET - Retrieve current fine amount
export async function GET() {
  try {
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
    const body = await request.json();
    const { fineAmount, updatedBy } = body;

    if (typeof fineAmount !== "number" || fineAmount < 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid fine amount. Must be a positive number.",
        },
        { status: 400 }
      );
    }

    const result = await setDailyFineAmount(fineAmount, updatedBy);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to update fine amount",
        },
        { status: 500 }
      );
    }

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
