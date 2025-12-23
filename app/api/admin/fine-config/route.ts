import { NextRequest, NextResponse } from "next/server";
import {
  getDailyFineAmount,
  setDailyFineAmount,
  initializeDefaultConfigs,
} from "@/lib/admin/actions/config";
import { auth } from "@/auth";
import { db } from "@/database/drizzle";
import { users } from "@/database/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

// Helper function to check admin access
async function checkAdminAccess(
  session: { user?: { id?: string; role?: string } } | null
) {
  if (!session?.user?.id) {
    return { isAdmin: false, error: "Unauthorized" };
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
    return { isAdmin: false, error: "Forbidden" };
  }

  return { isAdmin: true, error: null };
}

// GET - Retrieve current fine amount
export async function GET() {
  try {
    const session = await auth();

    // Check if user is authenticated and is admin
    const accessCheck = await checkAdminAccess(session);
    if (!accessCheck.isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: accessCheck.error,
          message:
            accessCheck.error === "Unauthorized"
              ? "Authentication required"
              : "Admin access required",
        },
        {
          status: accessCheck.error === "Unauthorized" ? 401 : 403,
        }
      );
    }

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
    const session = await auth();

    // Check if user is authenticated and is admin
    const accessCheck = await checkAdminAccess(session);
    if (!accessCheck.isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: accessCheck.error,
          message:
            accessCheck.error === "Unauthorized"
              ? "Authentication required"
              : "Admin access required",
        },
        {
          status: accessCheck.error === "Unauthorized" ? 401 : 403,
        }
      );
    }

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
