// Parent: CR-0003 / REQ-0034
// GET /api/activity-logs?period=&search= - Admin-only audit feed (client refetch path)
import { NextRequest, NextResponse } from "next/server";
import { authorizeAdminRoute } from "@/lib/auth/routeAuthorization";
import {
  getActivityLogs,
  type ActivityLogPeriod,
} from "@/lib/server/activityLogData";

export const runtime = "nodejs";

const VALID_PERIODS: ActivityLogPeriod[] = ["today", "7days", "30days", "all"];

export async function GET(request: NextRequest) {
  try {
    const authorization = await authorizeAdminRoute();
    if (!authorization.ok) return authorization.response;

    const periodParam = request.nextUrl.searchParams.get("period");
    const period: ActivityLogPeriod = VALID_PERIODS.includes(
      periodParam as ActivityLogPeriod,
    )
      ? (periodParam as ActivityLogPeriod)
      : "7days";
    const search = request.nextUrl.searchParams.get("search") ?? undefined;

    const logs = await getActivityLogs({ period, search });

    return NextResponse.json({ success: true, logs });
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch activity logs",
        message: "Activity history is temporarily unavailable.",
      },
      { status: 500 },
    );
  }
}
