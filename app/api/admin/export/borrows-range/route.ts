import { NextRequest, NextResponse } from "next/server";
import { exportBorrows } from "@/lib/admin/actions/data-export";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const format = (formData.get("format") as "csv" | "json") || "csv";
    const startDate = formData.get("startDate") as string;
    const endDate = formData.get("endDate") as string;

    if (!startDate || !endDate) {
      return NextResponse.json(
        {
          success: false,
          message: "Start date and end date are required",
        },
        { status: 400 }
      );
    }

    const dateRange = {
      start: new Date(startDate),
      end: new Date(endDate),
    };

    const result = await exportBorrows(format, dateRange);

    // Return the file as a download
    return new NextResponse(result.data, {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
      },
    });
  } catch (error) {
    console.error("Borrows range export API error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
