/**
 * Unit tests for admin-request optimistic decision paint (no network).
 * Parent: densify audit map — Wave B
 */

import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { queryKeys } from "@/lib/query/keys";
import type { AdminRequest } from "@/lib/services/users";
import {
  applyOptimisticAdminRequestDecision,
  rollbackOptimisticAdminRequestDecision,
} from "@/lib/query/optimisticAdminRequestDecision";

function makeRequest(
  overrides: Partial<AdminRequest> & Pick<AdminRequest, "id">,
): AdminRequest {
  return {
    id: overrides.id,
    userId: overrides.userId ?? "user-1",
    userEmail: overrides.userEmail ?? "a@b.com",
    userFullName: overrides.userFullName ?? "Applicant",
    userUniversityCard: overrides.userUniversityCard ?? null,
    requestReason: overrides.requestReason ?? "I want to help manage the library.",
    status: overrides.status ?? "PENDING",
    reviewedBy: overrides.reviewedBy ?? null,
    reviewedAt: overrides.reviewedAt ?? null,
    rejectionReason: overrides.rejectionReason ?? null,
    createdAt: overrides.createdAt ?? new Date("2026-08-01"),
    updatedAt: overrides.updatedAt ?? new Date("2026-08-01"),
    reviewer: overrides.reviewer ?? null,
  };
}

describe("optimisticAdminRequestDecision", () => {
  it("removes pending and prepends recent with reviewer", async () => {
    const client = new QueryClient();
    const pending = makeRequest({ id: "req-1" });
    const older = makeRequest({
      id: "req-0",
      status: "APPROVED",
      userFullName: "Older",
    });
    client.setQueryData(queryKeys.admin.pendingRequests, [pending]);
    client.setQueryData(queryKeys.admin.recentRequestDecisions, [older]);

    const ctx = await applyOptimisticAdminRequestDecision(client, {
      requestId: "req-1",
      status: "APPROVED",
      reviewer: {
        id: "admin-1",
        fullName: "Librarian",
        email: "lib@uni.edu",
        universityCard: null,
      },
    });

    const nextPending = client.getQueryData<AdminRequest[]>(
      queryKeys.admin.pendingRequests,
    );
    const recent = client.getQueryData<AdminRequest[]>(
      queryKeys.admin.recentRequestDecisions,
    );

    expect(nextPending?.some((r) => r.id === "req-1")).toBe(false);
    expect(recent?.[0]?.id).toBe("req-1");
    expect(recent?.[0]?.status).toBe("APPROVED");
    expect(recent?.[0]?.reviewer?.fullName).toBe("Librarian");
    expect(recent?.some((r) => r.id === "req-0")).toBe(true);

    rollbackOptimisticAdminRequestDecision(client, ctx);
    expect(
      client.getQueryData<AdminRequest[]>(queryKeys.admin.pendingRequests)?.[0]
        ?.id,
    ).toBe("req-1");
  });
});
