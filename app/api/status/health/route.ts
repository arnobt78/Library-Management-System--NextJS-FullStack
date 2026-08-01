// Parent: REQ-0026, REQ-0032
// Public liveness intentionally exposes no topology, configuration, memory, version, or raw error details.

import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/database/drizzle";
import ratelimit from "@/lib/ratelimit";
import { getClientRateLimitKey } from "@/lib/request/clientKey";
import { recordOperation } from "@/lib/observability/telemetry";

export const runtime = "nodejs";

export async function GET() {
  const startedAt = Date.now();
  const timestamp = new Date().toISOString();
  const requestId = randomUUID();

  try {
    const clientKey = await getClientRateLimitKey();
    const { success } = await ratelimit.limit(clientKey);
    if (!success) {
      await recordOperation("GET /api/status/health", "read", "rate_limited", startedAt);
      return NextResponse.json(
        { status: "DEGRADED", timestamp, requestId },
        { status: 429 },
      );
    }

    await db.execute(sql`SELECT 1`);
    await recordOperation("GET /api/status/health", "read", "success", startedAt);
    return NextResponse.json({ status: "HEALTHY", timestamp, requestId });
  } catch {
    await recordOperation("GET /api/status/health", "read", "failure", startedAt);
    return NextResponse.json(
      { status: "DOWN", timestamp, requestId },
      { status: 503 },
    );
  }
}
