// Parent: REQ-0032

export interface SloSample {
  kind: "read" | "mutation";
  outcome: "success" | "failure" | "rate_limited";
  durationMs: number;
}

export interface SloResult {
  availabilityPercent: number;
  readP95Ms: number;
  mutationP95Ms: number;
  serverErrorPercent: number;
  passes: boolean;
}

export interface SloSummary {
  eligibleCount: number;
  successCount: number;
  readP95Ms: number;
  mutationP95Ms: number;
}

function percentile95(values: number[]): number {
  if (values.length === 0) return 0;
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.ceil(ordered.length * 0.95) - 1];
}

export function calculateSlo(samples: readonly SloSample[]): SloResult {
  const eligible = samples.filter((sample) => sample.outcome !== "rate_limited");
  const successes = eligible.filter((sample) => sample.outcome === "success").length;
  return calculateSloFromSummary({
    eligibleCount: eligible.length,
    successCount: successes,
    readP95Ms: percentile95(eligible.filter((sample) => sample.kind === "read").map((sample) => sample.durationMs)),
    mutationP95Ms: percentile95(eligible.filter((sample) => sample.kind === "mutation").map((sample) => sample.durationMs)),
  });
}

export function calculateSloFromSummary(summary: SloSummary): SloResult {
  const hasEvidence = summary.eligibleCount > 0;
  const availabilityPercent = hasEvidence ? (summary.successCount / summary.eligibleCount) * 100 : 0;
  const failures = summary.eligibleCount - summary.successCount;
  const serverErrorPercent = hasEvidence ? (failures / summary.eligibleCount) * 100 : 0;
  return {
    availabilityPercent,
    readP95Ms: summary.readP95Ms,
    mutationP95Ms: summary.mutationP95Ms,
    serverErrorPercent,
    passes: hasEvidence && availabilityPercent >= 99.5 && summary.readP95Ms <= 1_000 && summary.mutationP95Ms <= 1_500 && serverErrorPercent < 1,
  };
}
