/**
 * Unique transactional email subjects for approve/reject decisions.
 * Appends ISO timestamp + short random hex so identical templates are less
 * likely to collapse into spam threads (no images — text only).
 */

import { randomBytes } from "crypto";

/**
 * Build a unique BookWise decision subject.
 * Example: `BookWise: Account approved · 2026-08-04T11:33:44.305Z · a1b2c3`
 */
export function buildUniqueDecisionSubject(
  label: string,
  decidedAt: Date | string | null | undefined = new Date(),
): string {
  const date =
    decidedAt instanceof Date
      ? decidedAt
      : decidedAt
        ? new Date(decidedAt)
        : new Date();
  const safe = Number.isNaN(date.getTime()) ? new Date() : date;
  const iso = safe.toISOString();
  const nonce = randomBytes(3).toString("hex");
  return `BookWise: ${label} · ${iso} · ${nonce}`;
}

export type DecisionActorText = {
  fullName: string;
  email: string;
};
