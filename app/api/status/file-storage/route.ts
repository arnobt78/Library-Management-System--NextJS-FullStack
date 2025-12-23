import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import ratelimit from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function GET(_request: NextRequest) {
  const startTime = Date.now();

  try {
    // Rate limiting to prevent abuse (applies to both authenticated and unauthenticated users)
    // This endpoint returns file storage health status (public information for monitoring)
    // Rate limiting provides protection against abuse while keeping it accessible for health checks
    const ip = (await headers()).get("x-forwarded-for") || "127.0.0.1";
    const { success } = await ratelimit.limit(ip);

    if (!success) {
      return NextResponse.json(
        {
          status: "DOWN",
          responseTime: `${Date.now() - startTime}ms`,
          endpoint: "ImageKit CDN",
          performance: "Poor",
          performanceValue: 0,
          error: "Too Many Requests",
          message: "Rate limit exceeded. Please try again later.",
          timestamp: new Date().toISOString(),
        },
        { status: 429 }
      );
    }

    // Test file storage by checking ImageKit configuration
    // ImageKit is used for storing book covers, user profile images, and videos
    const hasPublicKey = !!process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
    const hasPrivateKey = !!process.env.IMAGEKIT_PRIVATE_KEY;
    const hasUrlEndpoint = !!process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;
    const isConfigured = hasPublicKey && hasPrivateKey && hasUrlEndpoint;

    const storageTest = {
      service: "ImageKit CDN",
      status: isConfigured ? "Configured" : "Not configured",
      publicKey: hasPublicKey ? "Configured" : "Not configured",
      privateKey: hasPrivateKey ? "Configured" : "Not configured",
      urlEndpoint: hasUrlEndpoint ? "Configured" : "Not configured",
      description: "Image and file storage service for book covers, user images, and videos",
    };

    const responseTime = Date.now() - startTime;

    // Determine status based on configuration
    const status = isConfigured ? "HEALTHY" : "DOWN";

    return NextResponse.json({
      status,
      responseTime: `${responseTime}ms`,
      endpoint: "ImageKit CDN",
      performance:
        responseTime < 30 ? "Excellent" : responseTime < 60 ? "Good" : "Slow",
      performanceValue: Math.max(0, 100 - responseTime),
      details: storageTest,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // CRITICAL: Fix bug - use startTime instead of Date.now() - Date.now() (which is always 0)
    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        status: "DOWN",
        responseTime: `${responseTime}ms`,
        endpoint: "ImageKit CDN",
        performance: "Poor",
        performanceValue: 0,
        error: error instanceof Error ? error.message : "File storage error",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
