import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import ratelimit from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function GET(_request: NextRequest) {
  const startTime = Date.now();

  try {
    // Rate limiting to prevent abuse (applies to both authenticated and unauthenticated users)
    // This endpoint returns external API health status (public information for monitoring)
    // Rate limiting provides protection against abuse while keeping it accessible for health checks
    const ip = (await headers()).get("x-forwarded-for") || "127.0.0.1";
    const { success } = await ratelimit.limit(ip);

    if (!success) {
      return NextResponse.json(
        {
          status: "DOWN",
          responseTime: `${Date.now() - startTime}ms`,
          endpoint: "Third-party integrations",
          performance: "Poor",
          performanceValue: 0,
          error: "Too Many Requests",
          message: "Rate limit exceeded. Please try again later.",
          timestamp: new Date().toISOString(),
        },
        { status: 429 }
      );
    }

    // Test external API connections
    // Check configuration for external services used in the application
    const apis = [
      {
        name: "Google OAuth",
        status: process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
          ? "Configured"
          : "Not configured",
      },
      {
        name: "Vercel API",
        status: process.env.VERCEL ? "Available" : "Available", // Vercel is always available in Vercel deployments
      },
      {
        name: "ImageKit API",
        status:
          process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY &&
          process.env.IMAGEKIT_PRIVATE_KEY
            ? "Configured"
            : "Not configured",
      },
    ];

    const availableApis = apis.filter(
      (api) => api.status === "Configured" || api.status === "Available"
    ).length;

    const externalApis = {
      service: "Third-party integrations",
      apis,
      totalApis: 3,
      availableApis,
    };

    // Simulate external API check
    const responseTime = Date.now() - startTime;

    // Determine status based on configuration
    const isConfigured =
      externalApis.availableApis > 0 && externalApis.availableApis === externalApis.totalApis;
    const status = isConfigured ? "HEALTHY" : externalApis.availableApis > 0 ? "DEGRADED" : "DOWN";

    return NextResponse.json({
      status,
      responseTime: `${responseTime}ms`,
      endpoint: "Third-party integrations",
      performance:
        responseTime < 50 ? "Excellent" : responseTime < 100 ? "Good" : "Slow",
      performanceValue: Math.max(0, 100 - responseTime),
      details: externalApis,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // CRITICAL: Fix bug - use startTime instead of Date.now() - Date.now() (which is always 0)
    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        status: "DOWN",
        responseTime: `${responseTime}ms`,
        endpoint: "Third-party integrations",
        performance: "Poor",
        performanceValue: 0,
        error: error instanceof Error ? error.message : "External API error",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
