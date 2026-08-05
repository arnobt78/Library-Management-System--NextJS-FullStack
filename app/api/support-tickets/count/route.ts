/**
 * GET /api/support-tickets/count — admin sidebar badge (OPEN + IN_PROGRESS).
 * Parent: CR-0003 / REQ-0034
 */
import { NextResponse } from "next/server";
import { authorizeAdminRoute } from "@/lib/auth/routeAuthorization";
import { getOpenTicketCount } from "@/lib/server/supportTicketData";

export const runtime = "nodejs";

export async function GET() {
  try {
    const authorization = await authorizeAdminRoute();
    if (!authorization.ok) return authorization.response;

    const count = await getOpenTicketCount();
    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error("Error fetching open ticket count:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch ticket count", count: 0 },
      { status: 500 },
    );
  }
}
