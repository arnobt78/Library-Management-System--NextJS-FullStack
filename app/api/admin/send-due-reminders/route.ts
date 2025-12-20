import { NextRequest, NextResponse } from "next/server";
import {
  sendDueSoonReminders,
  sendOverdueReminders,
} from "@/lib/admin/actions/reminders";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.pathname.split("/").pop();

    if (action === "send-due-reminders") {
      const results = await sendDueSoonReminders();

      return NextResponse.json({
        success: true,
        message: `Sent ${results.length} due soon reminders`,
        results,
      });
    }

    if (action === "send-overdue-reminders") {
      const results = await sendOverdueReminders();

      return NextResponse.json({
        success: true,
        message: `Sent ${results.length} overdue reminders`,
        results,
      });
    }

    return NextResponse.json(
      {
        success: false,
        message: "Invalid action",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("Reminder API error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
