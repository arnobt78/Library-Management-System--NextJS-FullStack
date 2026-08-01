// Parent: REQ-0027, REQ-0031
import { NextRequest, NextResponse } from "next/server";
import { getCompleteAnalyticsSnapshot } from "@/lib/admin/actions/analytics";
import { authorizeAdminRoute } from "@/lib/auth/routeAuthorization";
import { recordOperation } from "@/lib/observability/telemetry";

function numericParam(request: NextRequest, key: string): number | undefined {
  const value = request.nextUrl.searchParams.get(key);
  if (value === null) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const authorization = await authorizeAdminRoute();
  if (!authorization.ok) {
    await recordOperation("GET /api/admin/analytics", "read", "failure", startedAt);
    return authorization.response;
  }
  try {
    const data = await getCompleteAnalyticsSnapshot({
      borrowingTrendsDays: numericParam(request, "days"),
      popularBooksLimit: numericParam(request, "books"),
      popularGenresLimit: numericParam(request, "genres"),
      userActivityLimit: numericParam(request, "users"),
    });
    await recordOperation("GET /api/admin/analytics", "read", "success", startedAt);
    return NextResponse.json(data);
  } catch {
    await recordOperation("GET /api/admin/analytics", "read", "failure", startedAt);
    return NextResponse.json({ success: false, error: "Analytics unavailable" }, { status: 503 });
  }
}
