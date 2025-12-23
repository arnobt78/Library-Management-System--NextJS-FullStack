import { NextRequest, NextResponse } from "next/server";
import { forceUpdateOverdueFines } from "@/lib/admin/actions/borrow";
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
