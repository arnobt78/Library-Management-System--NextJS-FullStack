import { NextRequest, NextResponse } from "next/server";
import { sendOverdueReminders } from "@/lib/admin/actions/reminders";
import { authorizeAdminRoute } from "@/lib/auth/routeAuthorization";
import { logActivity } from "@/lib/admin/activityLog";

export const runtime = "nodejs";

export async function POST(_request: NextRequest) {
  try {
    const authorization = await authorizeAdminRoute();
    if (!authorization.ok) return authorization.response;

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
