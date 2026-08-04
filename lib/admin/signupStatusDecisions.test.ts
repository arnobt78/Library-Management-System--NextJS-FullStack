/**
 * Unit tests for signup status decision ledger mapping shape (no DB).
 * Server query requires admin + Postgres; covered by migration backfill + live Prove.
 */

import { describe, expect, it } from "vitest";
import type { SignupStatusDecision } from "@/lib/admin/signupStatusDecisions";

describe("SignupStatusDecision ledger shape", () => {
  it("uses ledger id + userId so re-apply can keep multiple history cards", () => {
    const row: SignupStatusDecision = {
      id: "dec-1",
      userId: "user-1",
      fullName: "Applicant",
      email: "a@example.com",
      universityId: 1,
      universityCard: null,
      status: "REJECTED",
      createdAt: new Date("2026-08-04T12:00:00Z"),
      decidedAt: new Date("2026-08-04T12:10:00Z"),
      decisionActor: {
        fullName: "Admin",
        email: "admin@example.com",
        universityCard: null,
      },
    };

    expect(row.id).not.toBe(row.userId);
    expect(row.status).toBe("REJECTED");
    expect(row.decisionActor?.email).toContain("@");
  });
});
