/**
 * GET /api/admin/nav-counts — aggregated sidebar counters for densify refetch.
 * Parent: admin shell Stockly chrome
 */

import { NextResponse } from "next/server";
import { authorizeAdminRoute } from "@/lib/auth/routeAuthorization";
import { getAdminNavCounts } from "@/lib/server/adminNavCounts";

export const runtime = "nodejs";

export async function GET() {
  try {
    const authorization = await authorizeAdminRoute();
    if (!authorization.ok) return authorization.response;

    const counts = await getAdminNavCounts();
    return NextResponse.json(counts);
  } catch (error) {
    console.error("Error fetching admin nav counts:", error);
    return NextResponse.json(
      { error: "Failed to fetch admin nav counts" },
      { status: 500 },
    );
  }
}
