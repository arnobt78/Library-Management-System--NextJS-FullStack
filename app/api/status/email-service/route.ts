import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import ratelimit from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function GET(_request: NextRequest) {
  const startTime = Date.now();

  try {
    // Rate limiting to prevent abuse (applies to both authenticated and unauthenticated users)
    // This endpoint returns email service health status (public information for monitoring)
    // Rate limiting provides protection against abuse while keeping it accessible for health checks
    const ip = (await headers()).get("x-forwarded-for") || "127.0.0.1";
    const { success } = await ratelimit.limit(ip);

    if (!success) {
      return NextResponse.json(
        {
          status: "DOWN",
          responseTime: `${Date.now() - startTime}ms`,
          endpoint: "Multi-Provider Email Service (Brevo + Resend)",
          performance: "Poor",
          performanceValue: 0,
          error: "Too Many Requests",
          message: "Rate limit exceeded. Please try again later.",
          timestamp: new Date().toISOString(),
        },
        { status: 429 }
      );
    }

    // Test email service configuration (Multi-provider: Brevo primary, Resend fallback)
    const emailConfig = {
      primary: {
        service: "Brevo (Sendinblue)",
        apiKey: process.env.BREVO_API_KEY ? "Configured" : "Not configured",
        senderEmail: process.env.BREVO_SENDER_EMAIL || "Not configured",
        senderName: process.env.BREVO_SENDER_NAME || "Not configured",
        status: process.env.BREVO_API_KEY ? "Configured" : "Not configured",
      },
      fallback: {
        service: "Resend",
        apiKey: process.env.RESEND_TOKEN ? "Configured" : "Not configured",
        status: process.env.RESEND_TOKEN ? "Configured" : "Not configured",
      },
    };

    // Simulate email service check
    const responseTime = Date.now() - startTime;

    // Determine status based on configuration
    const hasBrevo = !!process.env.BREVO_API_KEY;
    const hasResend = !!process.env.RESEND_TOKEN;
    const isConfigured = hasBrevo || hasResend;
    const status = isConfigured ? (hasBrevo ? "HEALTHY" : "DEGRADED") : "DOWN";
    const performance = isConfigured
      ? responseTime < 100
        ? "Good"
        : "Slow"
      : "Poor";
    const performanceValue = isConfigured ? Math.max(0, 100 - responseTime) : 0;

    return NextResponse.json({
      status,
      responseTime: `${responseTime}ms`,
      endpoint: "Multi-Provider Email Service (Brevo + Resend)",
      performance,
      performanceValue,
      details: emailConfig,
      provider: hasBrevo
        ? "Brevo (Primary)"
        : hasResend
          ? "Resend (Fallback)"
          : "None",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // CRITICAL: Fix bug - use startTime instead of Date.now() - Date.now() (which is always 0)
    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        status: "DOWN",
        responseTime: `${responseTime}ms`,
        endpoint: "Multi-Provider Email Service (Brevo + Resend)",
        performance: "Poor",
        performanceValue: 0,
        error: error instanceof Error ? error.message : "Email service error",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
