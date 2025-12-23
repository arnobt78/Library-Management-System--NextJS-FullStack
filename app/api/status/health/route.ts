import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import ratelimit from "@/lib/ratelimit";
import { db } from "@/database/drizzle";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(_request: NextRequest) {
  const startTime = Date.now();

  try {
    // Rate limiting to prevent abuse (applies to both authenticated and unauthenticated users)
    // This endpoint returns overall system health status (public information for monitoring)
    // Rate limiting provides protection against abuse while keeping it accessible for health checks
    const ip = (await headers()).get("x-forwarded-for") || "127.0.0.1";
    const { success } = await ratelimit.limit(ip);

    if (!success) {
      return NextResponse.json(
        {
          status: "DOWN",
          responseTime: `${Date.now() - startTime}ms`,
          error: "Too Many Requests",
          message: "Rate limit exceeded. Please try again later.",
          timestamp: new Date().toISOString(),
        },
        { status: 429 }
      );
    }

    // Test database connection
    const dbResult = await testDatabaseConnection();

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      status: "HEALTHY",
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString(),
      services: {
        database: dbResult,
        api: {
          status: "HEALTHY",
          responseTime: `${responseTime}ms`,
          uptime: process.uptime(),
          memory: process.memoryUsage(),
        },
      },
    });
  } catch (error) {
    // CRITICAL: Fix bug - use startTime instead of Date.now() - Date.now() (which is always 0)
    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        status: "DOWN",
        responseTime: `${responseTime}ms`,
        error: error instanceof Error ? error.message : "Unknown error",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

async function testDatabaseConnection() {
  const startTime = Date.now();

  try {
    // Test database connection with a simple query
    await db.execute(sql`SELECT 1 as test`);
    const responseTime = Date.now() - startTime;

    return {
      status: "HEALTHY",
      responseTime: `${responseTime}ms`,
      connection: "PostgreSQL",
      test: "Connection successful",
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    return {
      status: "DOWN",
      responseTime: `${responseTime}ms`,
      connection: "PostgreSQL",
      error:
        error instanceof Error ? error.message : "Database connection failed",
    };
  }
}
