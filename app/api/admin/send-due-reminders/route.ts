import { NextRequest, NextResponse } from "next/server";
import {
  sendDueSoonReminders,
  sendOverdueReminders,
} from "@/lib/admin/actions/reminders";
import { auth } from "@/auth";
import { db } from "@/database/drizzle";
import { users } from "@/database/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          message: "Authentication required",
        },
        { status: 401 }
      );
    }

    // Check if user is admin
    // CRITICAL: Check role from session first (if available from new JWT)
    // If not available, fallback to database check (for existing sessions)
    let isAdmin = false;
    if ((session.user as { role?: string }).role === "ADMIN") {
      isAdmin = true;
    } else {
      // Fallback: Check database if role not in session (for existing sessions)
      // This handles cases where JWT was created before role was added
      const user = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1);

      isAdmin = user[0]?.role === "ADMIN";
    }

    if (!isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden",
          message: "Admin access required",
        },
        { status: 403 }
      );
    }

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
