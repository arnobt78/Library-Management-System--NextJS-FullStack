// Parent: REQ-0026, REQ-0032; TC-0051, TC-0052, TC-0104
import { beforeEach, describe, expect, it, vi } from "vitest";

const probes = vi.hoisted(() => ({ execute: vi.fn(), limit: vi.fn() }));
vi.mock("@/database/drizzle", () => ({ db: { execute: probes.execute } }));
vi.mock("@/lib/ratelimit", () => ({ default: { limit: probes.limit } }));
vi.mock("@/lib/request/clientKey", () => ({ getClientRateLimitKey: vi.fn(async () => "ip:192.0.2.1") }));

describe("status disclosure and response policy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    probes.limit.mockResolvedValue({ success: true });
    probes.execute.mockResolvedValue({ rows: [{ "?column?": 1 }] });
  });

  it("returns only the public liveness envelope in healthy and failed states", async () => {
    const { GET } = await import("@/app/api/status/health/route");
    const healthy = await GET();
    expect(Object.keys(await healthy.json()).sort()).toEqual(["requestId", "status", "timestamp"]);

    probes.execute.mockRejectedValueOnce(new Error("postgres://secret@internal/db"));
    const failed = await GET();
    const body = await failed.text();
    expect(failed.status).toBe(503);
    expect(body).not.toContain("secret");
    expect(Object.keys(JSON.parse(body)).sort()).toEqual(["requestId", "status", "timestamp"]);
  });

  it("configures the enforcing baseline headers for every route", async () => {
    const { default: config } = await import("@/next.config");
    const entries = await config.headers?.();
    const headers = Object.fromEntries((entries?.[0]?.headers ?? []).map((item) => [item.key, item.value]));
    expect(entries?.[0]?.source).toBe("/(.*)");
    expect(headers["Content-Security-Policy"]).toContain("default-src 'self'");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["Permissions-Policy"]).toContain("camera=()");
  });
});
