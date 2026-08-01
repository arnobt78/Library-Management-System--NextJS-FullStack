// Parent: REQ-0032; TC-0105, TC-0106
import { afterEach, describe, expect, it, vi } from "vitest";
import { measureMutation, recordOperation } from "./telemetry";

describe("bounded operation telemetry", () => {
  afterEach(() => vi.restoreAllMocks());

  it("emits only bounded labels and excludes payload values", async () => {
    const output = vi.spyOn(console, "info").mockImplementation(() => undefined);
    await recordOperation("GET /api/status/health", "read", "success", Date.now());
    const event = JSON.parse(String(output.mock.calls[0][0]));
    expect(Object.keys(event).sort()).toEqual(["durationMs", "kind", "operation", "outcome", "timestamp", "type", "version"]);
    expect(JSON.stringify(event)).not.toContain("reader@example.test");
  });

  it("records rejected business mutations as failures without retrying", async () => {
    const output = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const mutation = vi.fn(async () => ({ success: false as const, error: "Denied" }));
    await expect(measureMutation("circulation.renew", mutation)).resolves.toMatchObject({ success: false });
    expect(mutation).toHaveBeenCalledOnce();
    expect(JSON.parse(String(output.mock.calls[0][0])).outcome).toBe("failure");
  });
});
