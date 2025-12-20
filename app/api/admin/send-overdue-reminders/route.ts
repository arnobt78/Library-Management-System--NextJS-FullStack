import { NextRequest, NextResponse } from "next/server";
import { sendOverdueReminders } from "@/lib/admin/actions/reminders";

export const runtime = "nodejs";

export async function POST(_request: NextRequest) {
  try {
    const results = await sendOverdueReminders();

    return NextResponse.json({
      success: true,
      message: `Sent ${results.length} overdue reminders`,
      results,
    });
  } catch (error) {
    console.error("Overdue reminder API error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
