import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/drizzle";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(_request: NextRequest) {
  try {
    const startTime = Date.now();

    // Test database connection with a more comprehensive query
    const result = await db.execute(sql`
      SELECT 
        COUNT(*) as table_count,
        pg_database_size(current_database()) as db_size,
        version() as version
    `);

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      status: "HEALTHY",
      responseTime: `${responseTime}ms`,
      endpoint: "PostgreSQL Database",
      performance:
        responseTime < 50 ? "Excellent" : responseTime < 100 ? "Good" : "Slow",
      performanceValue: Math.max(0, 100 - responseTime),
      details: {
        tableCount: result.rows[0]?.table_count || 0,
        databaseSize: result.rows[0]?.db_size || 0,
        version: result.rows[0]?.version || "Unknown",
        connectionPool: "Active",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const responseTime = Date.now() - Date.now();

    return NextResponse.json(
      {
        status: "DOWN",
        responseTime: `${responseTime}ms`,
        endpoint: "PostgreSQL Database",
        performance: "Poor",
        performanceValue: 0,
        error:
          error instanceof Error ? error.message : "Database connection failed",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
