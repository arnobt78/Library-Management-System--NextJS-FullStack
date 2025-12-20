import { NextRequest, NextResponse } from "next/server";
import { forceUpdateOverdueFines } from "@/lib/admin/actions/borrow";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    console.log("=== UPDATE OVERDUE FINES API CALLED ===");
    console.log(
      "Request headers:",
      Object.fromEntries(request.headers.entries())
    );

    // Parse request body to get custom fine amount if provided
    let customFineAmount: number | undefined;
    try {
      const body = await request.json();
      console.log("Request body:", body);
      if (body.fineAmount && typeof body.fineAmount === "number") {
        customFineAmount = body.fineAmount;
        console.log(`Using custom fine amount: $${customFineAmount} per day`);
      }
    } catch {
      // If no JSON body or parsing fails, continue with default
      console.log("No custom fine amount provided, using default");
    }

    console.log("Calling forceUpdateOverdueFines...");
    const results = await forceUpdateOverdueFines(customFineAmount);

    console.log(
      `API completed. Updated ${results.length} overdue books:`,
      results
    );

    return NextResponse.json({
      success: true,
      message: `Updated fines for ${results.length} overdue books`,
      results,
    });
  } catch (error) {
    console.error("=== ERROR IN UPDATE OVERDUE FINES API ===");
    console.error("Error details:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );

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
