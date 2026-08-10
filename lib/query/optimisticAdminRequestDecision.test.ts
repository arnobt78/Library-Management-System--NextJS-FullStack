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
import {
  isDensifiedEmpty,
  seedFromSsrIfEmpty,
} from "@/lib/utils/queryCacheLists";
import { EMPTY_ADMIN_NAV_COUNTS } from "@/lib/admin/adminNavCountTypes";

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

  it("marks densify-empty on last pending so SSR cannot reseed", async () => {
    const client = new QueryClient();
    const pending = makeRequest({ id: "req-1" });
    client.setQueryData(queryKeys.admin.pendingRequests, [pending]);

    await applyOptimisticAdminRequestDecision(client, {
      requestId: "req-1",
      status: "REJECTED",
      reviewer: {
        id: "admin-1",
        fullName: "Librarian",
        email: "lib@uni.edu",
        universityCard: null,
      },
    });

    const key = queryKeys.admin.pendingRequests;
    expect(client.getQueryData(key)).toEqual([]);
    expect(isDensifiedEmpty(key)).toBe(true);
    expect(seedFromSsrIfEmpty(client, key, [pending])).toEqual([]);
  });

  it("syncs pendingAdminRequests nav pill after optimistic remove", async () => {
    const client = new QueryClient();
    const a = makeRequest({ id: "req-1" });
    const b = makeRequest({ id: "req-2", userId: "user-2" });
    client.setQueryData(queryKeys.admin.pendingRequests, [a, b]);
    client.setQueryData(queryKeys.admin.navCounts, {
      ...EMPTY_ADMIN_NAV_COUNTS,
      pendingAdminRequests: 2,
    });

    await applyOptimisticAdminRequestDecision(client, {
      requestId: "req-1",
      status: "APPROVED",
      reviewer: {
        id: "admin-1",
        fullName: "Librarian",
        email: "lib@uni.edu",
        universityCard: null,
      },
    });

    expect(client.getQueryData(queryKeys.admin.navCounts)).toMatchObject({
      pendingAdminRequests: 1,
    });
  });

  it("clears pendingAdminRequestId and paints latestAdminRequestStatus on users.detail", async () => {
    const client = new QueryClient();
    const pending = makeRequest({ id: "req-1", userId: "user-1" });
    client.setQueryData(queryKeys.admin.pendingRequests, [pending]);
    client.setQueryData(queryKeys.users.detail("user-1"), {
      id: "user-1",
      fullName: "Applicant",
      email: "a@b.com",
      universityId: 1,
      universityCard: "",
      status: "APPROVED" as const,
      role: "USER" as const,
      lastActivityDate: null,
      lastLogin: null,
      createdAt: null,
      pendingAdminRequestId: "req-1",
      latestAdminRequestStatus: "PENDING" as const,
    });
    client.setQueryData(queryKeys.users.adminPrivilegeHistory("user-1"), [
      {
        id: "req-1",
        status: "PENDING",
        requestReason: pending.requestReason,
        rejectionReason: null,
        createdAt: pending.createdAt,
        reviewedAt: null,
        reviewer: null,
      },
    ]);

    await applyOptimisticAdminRequestDecision(client, {
      requestId: "req-1",
      status: "REJECTED",
      reviewer: {
        id: "admin-1",
        fullName: "Librarian",
        email: "lib@uni.edu",
        universityCard: null,
      },
    });

    expect(client.getQueryData(queryKeys.users.detail("user-1"))).toMatchObject({
      pendingAdminRequestId: null,
      latestAdminRequestStatus: "REJECTED",
    });
    expect(
      client.getQueryData(queryKeys.users.adminPrivilegeHistory("user-1")),
    ).toMatchObject([
      {
        id: "req-1",
        status: "REJECTED",
        reviewer: { fullName: "Librarian" },
      },
    ]);
  });
});
