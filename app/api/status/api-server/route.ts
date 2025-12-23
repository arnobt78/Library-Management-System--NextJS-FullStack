import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import ratelimit from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function GET(_request: NextRequest) {
  const startTime = Date.now();

  try {
    // Rate limiting to prevent abuse (applies to both authenticated and unauthenticated users)
    // This endpoint returns API server health status (public information for monitoring)
    // Rate limiting provides protection against abuse while keeping it accessible for health checks
    const ip = (await headers()).get("x-forwarded-for") || "127.0.0.1";
    const { success } = await ratelimit.limit(ip);

    if (!success) {
      return NextResponse.json(
        {
          status: "DOWN",
          responseTime: `${Date.now() - startTime}ms`,
          endpoint: "https://university-library-managment.vercel.app/api",
          performance: "Poor",
          performanceValue: 0,
          error: "Too Many Requests",
          message: "Rate limit exceeded. Please try again later.",
          timestamp: new Date().toISOString(),
        },
        { status: 429 }
      );
    }

    // Test API server health with a simple operation
    const testData = {
      message: "API Server is healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
      platform: process.platform,
    };

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      status: "HEALTHY",
      responseTime: `${responseTime}ms`,
      endpoint: "https://university-library-managment.vercel.app/api",
      performance:
        responseTime < 20 ? "Excellent" : responseTime < 50 ? "Good" : "Slow",
      performanceValue: Math.max(0, 100 - responseTime),
      details: testData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // CRITICAL: Fix bug - use startTime instead of Date.now() - Date.now() (which is always 0)
    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        status: "DOWN",
        responseTime: `${responseTime}ms`,
        endpoint: "https://university-library-managment.vercel.app/api",
        performance: "Poor",
        performanceValue: 0,
        error: error instanceof Error ? error.message : "API Server error",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
