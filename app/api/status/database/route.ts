import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/drizzle";
import { sql } from "drizzle-orm";
import { headers } from "next/headers";
import ratelimit from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function GET(_request: NextRequest) {
  const startTime = Date.now();

  try {
    // Rate limiting to prevent abuse (applies to both authenticated and unauthenticated users)
    // This endpoint returns database health status (public information for monitoring)
    // Rate limiting provides protection against abuse while keeping it accessible for health checks
    const ip = (await headers()).get("x-forwarded-for") || "127.0.0.1";
    const { success } = await ratelimit.limit(ip);

    if (!success) {
      return NextResponse.json(
        {
          status: "DOWN",
          responseTime: `${Date.now() - startTime}ms`,
          endpoint: "PostgreSQL Database",
          performance: "Poor",
          performanceValue: 0,
          error: "Too Many Requests",
          message: "Rate limit exceeded. Please try again later.",
          timestamp: new Date().toISOString(),
        },
        { status: 429 }
      );
    }

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
    // CRITICAL: Fix bug - use startTime instead of Date.now() - Date.now() (which is always 0)
    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        status: "DOWN",
        responseTime: `${responseTime}ms`,
        endpoint: "PostgreSQL Database",
        performance: "Poor",
        performanceValue: 0,
        error:
          error instanceof Error ? error.message : "Database connection failed",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
