import { NextRequest, NextResponse } from "next/server";
import { authorizeAdminRoute } from "@/lib/auth/routeAuthorization";
import { getReminderPreview } from "@/lib/admin/actions/fines";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const authorization = await authorizeAdminRoute();
  if (!authorization.ok) return authorization.response;

  const type = request.nextUrl.searchParams.get("type");
  if (type !== "due" && type !== "overdue") {
    return NextResponse.json(
      { success: false, error: "type must be due or overdue" },
      { status: 400 },
    );
  }

  const rows = await getReminderPreview(type);
  return NextResponse.json({ success: true, rows });
}
