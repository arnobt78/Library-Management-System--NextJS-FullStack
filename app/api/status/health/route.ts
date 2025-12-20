import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/drizzle";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(_request: NextRequest) {
  try {
    const startTime = Date.now();

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
    return NextResponse.json(
      {
        status: "DOWN",
        error: error instanceof Error ? error.message : "Unknown error",
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
