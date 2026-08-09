import { NextRequest, NextResponse } from "next/server";
import { exportBooks } from "@/lib/admin/actions/data-export";
import { logAdminExportActivity } from "@/lib/admin/logAdminExportActivity";
import { authorizeAdminRoute } from "@/lib/auth/routeAuthorization";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const authorization = await authorizeAdminRoute();
    if (!authorization.ok) return authorization.response;

    const formData = await request.formData();
    const format = (formData.get("format") as "csv" | "json") || "csv";

    const result = await exportBooks(format);
    if (!result.data) {
      return NextResponse.json(
        { success: false, message: "Export produced empty payload" },
        { status: 500 },
      );
    }

    await logAdminExportActivity({
      actorId: authorization.actor.id,
      entityType: "book",
      status: "EXPORT_BOOKS",
      format,
    });

    return new NextResponse(result.data, {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
      },
    });
  } catch (error) {
    console.error("Books export API error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
