// Parent: REQ-0032; TC-0106
import { describe, expect, it } from "vitest";
import { calculateSlo, type SloSample } from "./slo";

describe("SLO calculation", () => {
  it("uses nearest-rank p95 and excludes deliberate rate limits", () => {
    const samples: SloSample[] = [
      ...Array.from({ length: 99 }, () => ({ kind: "read", outcome: "success", durationMs: 900 }) as const),
      { kind: "mutation", outcome: "success", durationMs: 1_400 },
      { kind: "read", outcome: "rate_limited", durationMs: 9_999 },
    ];
    expect(calculateSlo(samples)).toMatchObject({
      availabilityPercent: 100,
      readP95Ms: 900,
      mutationP95Ms: 1_400,
      serverErrorPercent: 0,
      passes: true,
    });
  });

  it("fails strict error-rate and latency thresholds", () => {
    const result = calculateSlo([
      { kind: "read", outcome: "failure", durationMs: 1_001 },
      { kind: "mutation", outcome: "success", durationMs: 1_501 },
    ]);
    expect(result.passes).toBe(false);
  });

  it("fails closed when the measurement window has no evidence", () => {
    expect(calculateSlo([])).toMatchObject({ availabilityPercent: 0, passes: false });
  });
});
