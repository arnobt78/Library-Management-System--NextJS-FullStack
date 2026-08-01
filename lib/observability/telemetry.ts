// Parent: REQ-0032
// Bounded structured events contain no route parameters, request payloads, actor IDs, or credentials.

export type OperationName =
  | "GET /api/status/health"
  | "GET /api/admin/analytics"
  | "circulation.reserve"
  | "circulation.cancel"
  | "circulation.renew"
  | "circulation.fulfill";

export interface OperationTelemetry {
  version: 1;
  type: "operation";
  operation: OperationName;
  kind: "read" | "mutation";
  outcome: "success" | "failure" | "rate_limited";
  durationMs: number;
  timestamp: string;
}

export async function recordOperation(
  operation: OperationName,
  kind: OperationTelemetry["kind"],
  outcome: OperationTelemetry["outcome"],
  startedAt: number,
): Promise<void> {
  const event: OperationTelemetry = {
    version: 1,
    type: "operation",
    operation,
    kind,
    outcome,
    durationMs: Math.max(0, Date.now() - startedAt),
    timestamp: new Date().toISOString(),
  };
  console.info(JSON.stringify(event));
  try {
    const [{ db }, { operationTelemetry }] = await Promise.all([
      import("@/database/drizzle"),
      import("@/database/schema"),
    ]);
    await db.insert(operationTelemetry).values({
      operation: event.operation,
      kind: event.kind,
      outcome: event.outcome,
      durationMs: event.durationMs,
      createdAt: new Date(event.timestamp),
    });
  } catch {
    // Application outcomes never depend on the optional telemetry sink.
  }
}

export async function measureMutation<T extends { success: boolean }>(
  operation: OperationName,
  mutation: () => Promise<T>,
): Promise<T> {
  const startedAt = Date.now();
  try {
    const result = await mutation();
    await recordOperation(operation, "mutation", result.success ? "success" : "failure", startedAt);
    return result;
  } catch (error) {
    await recordOperation(operation, "mutation", "failure", startedAt);
    throw error;
  }
}
