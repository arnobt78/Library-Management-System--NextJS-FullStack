import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import ratelimit from "@/lib/ratelimit";
import { db } from "@/database/drizzle";
import { sql } from "drizzle-orm";
import { authorizeAdminRoute } from "@/lib/auth/routeAuthorization";
import { calculateSloFromSummary } from "@/lib/observability/slo";

export const runtime = "nodejs";

export async function GET(_request: NextRequest) {
  const startTime = Date.now();

  try {
    const authorization = await authorizeAdminRoute();
    if (!authorization.ok) return authorization.response;
    // Rate limiting to prevent abuse (applies to both authenticated and unauthenticated users)
    // This endpoint returns system metrics (public information for monitoring)
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

    // Calculate all metrics in parallel
    const [databaseMetrics, storageMetrics, userMetrics, telemetryMetrics] =
      await Promise.all([
        getDatabasePerformance(),
        getStorageUsage(),
        getActiveUsers(),
        getTelemetryMetrics(),
      ]);

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      status: "HEALTHY",
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString(),
      metrics: {
        databasePerformance: databaseMetrics,
        apiPerformance: {
          requestsPerMinute: telemetryMetrics.requestsPerMinute,
          status: telemetryMetrics.slo.passes ? "HEALTHY" : "DEGRADED",
        },
        errorRate: telemetryMetrics.errorRate,
        slo: telemetryMetrics.slo,
        storageUsage: storageMetrics,
        activeUsers: userMetrics,
        sslCertificate: await getSSLCertificateStatus(),
      },
    });
  } catch {
    // CRITICAL: Fix bug - use startTime instead of Date.now() - Date.now() (which is always 0)
    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        status: "DOWN",
        responseTime: `${responseTime}ms`,
        error: "METRICS_UNAVAILABLE",
        message: "The metrics diagnostic check failed.",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

async function getDatabasePerformance() {
  try {
    // Get database connection pool info
    const poolInfo = await db.execute(sql`
      SELECT 
        count(*) as active_connections,
        (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections,
        (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_queries
    `);

    const result = poolInfo.rows[0] as Record<string, unknown>;
    const activeConnections = parseInt(
      (result?.active_connections as string) || "0"
    );
    const maxConnections = parseInt(
      (result?.max_connections as string) || "100"
    );
    const activeQueries = parseInt((result?.active_queries as string) || "0");

    return {
      active: activeConnections,
      max: maxConnections,
      activeQueries: activeQueries,
      status: activeConnections < maxConnections * 0.8 ? "good" : "warning",
      description: "Connection Pool Status",
    };
  } catch {
    return {
      active: 0,
      max: 100,
      activeQueries: 0,
      status: "critical",
      description: "Connection Pool Status",
      error: "Database metric unavailable",
    };
  }
}

async function getStorageUsage() {
  try {
    // Get database size and table counts
    const storageInfo = await db.execute(sql`
      SELECT 
        pg_database_size(current_database()) as db_size,
        (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public') as table_count,
        (SELECT count(*) FROM pg_stat_user_tables) as user_tables
    `);

    const result = storageInfo.rows[0] as Record<string, unknown>;
    const dbSizeBytes = parseInt((result?.db_size as string) || "0");
    const dbSizeGB = (dbSizeBytes / (1024 * 1024 * 1024)).toFixed(1);
    const maxSizeGB = 10; // Assume 10GB limit
    const usagePercent = ((parseFloat(dbSizeGB) / maxSizeGB) * 100).toFixed(1);

    return {
      used: `${dbSizeGB} GB`,
      total: `${maxSizeGB} GB`,
      percentage: parseFloat(usagePercent),
      status:
        parseFloat(usagePercent) < 80
          ? "good"
          : parseFloat(usagePercent) < 95
            ? "warning"
            : "critical",
      description: "Database storage",
      tableCount: parseInt((result?.table_count as string) || "0"),
    };
  } catch {
    return {
      used: "0 GB",
      total: "10 GB",
      percentage: 0,
      status: "critical",
      description: "Database storage",
      error: "Storage metric unavailable",
    };
  }
}

async function getActiveUsers() {
  try {
    // Get users who have been active in the last 5 minutes
    const activeUsers = await db.execute(sql`
      SELECT COUNT(*) as active_count
      FROM users 
      WHERE last_login > NOW() - INTERVAL '5 minutes'
    `);

    const count = parseInt(
      (activeUsers.rows[0]?.active_count as string) || "0"
    );

    return {
      count: count,
      status: count > 0 ? "good" : "warning",
      description: "Currently online",
      lastUpdated: new Date().toISOString(),
    };
  } catch {
    return {
      count: 0,
      status: "critical",
      description: "Currently online",
      error: "User activity metric unavailable",
    };
  }
}

async function getTelemetryMetrics() {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 30);
  const result = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE outcome <> 'rate_limited')::int AS eligible_count,
      COUNT(*) FILTER (WHERE outcome = 'success')::int AS success_count,
      COALESCE(percentile_disc(0.95) WITHIN GROUP (ORDER BY duration_ms)
        FILTER (WHERE kind = 'read' AND outcome <> 'rate_limited'), 0)::int AS read_p95_ms,
      COALESCE(percentile_disc(0.95) WITHIN GROUP (ORDER BY duration_ms)
        FILTER (WHERE kind = 'mutation' AND outcome <> 'rate_limited'), 0)::int AS mutation_p95_ms,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 minute')::int AS requests_per_minute
    FROM operation_telemetry
    WHERE created_at >= ${since}
  `);
  const row = result.rows[0] as Record<string, number | string>;
  const eligibleCount = Number(row.eligible_count ?? 0);
  const slo = calculateSloFromSummary({
    eligibleCount,
    successCount: Number(row.success_count ?? 0),
    readP95Ms: Number(row.read_p95_ms ?? 0),
    mutationP95Ms: Number(row.mutation_p95_ms ?? 0),
  });
  const requestsPerMinute = Number(row.requests_per_minute ?? 0);
  return {
    requestsPerMinute,
    slo,
    errorRate: {
      rate: `${slo.serverErrorPercent.toFixed(2)}%`,
      status: eligibleCount === 0 ? "warning" as const : slo.serverErrorPercent < 1 ? "good" as const : "critical" as const,
      description: "Server error rate excluding deliberate rate limits",
      totalRequests: eligibleCount,
      recentRequests: requestsPerMinute,
    },
  };
}

async function getSSLCertificateStatus() {
  return {
    status: process.env.VERCEL ? "Platform-managed" : "Local development",
    expiresAt: null,
    issuer: process.env.VERCEL ? "Deployment platform" : "Not applicable",
  };
}
