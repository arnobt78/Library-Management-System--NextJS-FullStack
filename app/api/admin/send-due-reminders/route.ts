import { NextRequest, NextResponse } from "next/server";
import {
  sendDueSoonReminders,
  sendOverdueReminders,
} from "@/lib/admin/actions/reminders";
import { authorizeAdminRoute } from "@/lib/auth/routeAuthorization";
import { logActivity } from "@/lib/admin/activityLog";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const authorization = await authorizeAdminRoute();
    if (!authorization.ok) return authorization.response;

    const url = new URL(request.url);
    const action = url.pathname.split("/").pop();

    if (action === "send-due-reminders") {
      const results = await sendDueSoonReminders();
      const sent = results.filter((r) => r.status === "sent").length;
      await logActivity({
        actorId: authorization.actor.id,
        action: "UPDATE",
        entityType: "borrow",
        entityId: null,
        details: { status: "DUE_SOON_REMINDERS", count: sent },
      });

      return NextResponse.json({
        success: true,
        message: `Sent ${results.length} due soon reminders`,
        results,
      });
    }

    if (action === "send-overdue-reminders") {
      const results = await sendOverdueReminders();
      const sent = results.filter((r) => r.status === "sent").length;
      await logActivity({
        actorId: authorization.actor.id,
        action: "UPDATE",
        entityType: "borrow",
        entityId: null,
        details: { status: "OVERDUE_REMINDERS", count: sent },
      });

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
