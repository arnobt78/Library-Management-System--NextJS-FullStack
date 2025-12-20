import { NextRequest, NextResponse } from "next/server";
import { exportUsers } from "@/lib/admin/actions/data-export";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const format = (formData.get("format") as "csv" | "json") || "csv";

    const result = await exportUsers(format);

    // Return the file as a download
    return new NextResponse(result.data, {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
      },
    });
  } catch (error) {
    console.error("Users export API error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
