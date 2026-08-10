/**
 * Unit tests for optimistic signup pending remove + decisions prepend (no network).
 */

import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import {
  applyOptimisticSignupDecision,
  rollbackOptimisticSignupDecision,
} from "@/lib/query/optimisticSignupDecision";
import { queryKeys } from "@/lib/query/keys";
import type { SignupRequestDetail, SignupStatusDecision } from "@/lib/admin/signupStatusDecisions";
import type { User } from "@/lib/services/users";
import {
  isDensifiedEmpty,
  seedFromSsrIfEmpty,
} from "@/lib/utils/queryCacheLists";
import { EMPTY_ADMIN_NAV_COUNTS } from "@/lib/admin/adminNavCountTypes";

const pendingUser: User = {
  id: "u-1",
  fullName: "Ada Lovelace",
  email: "ada@example.com",
  universityId: 42,
  universityCard: "/cards/ada.jpg",
  status: "PENDING",
  role: "USER",
  lastActivityDate: null,
  lastLogin: null,
  createdAt: new Date("2026-08-01T12:00:00Z"),
};

describe("applyOptimisticSignupDecision", () => {
  it("removes pending user and prepends a Recent decision; rollback restores both", async () => {
    const client = new QueryClient();
    const pendingKey = queryKeys.users.pending();
    const decisionsKey = queryKeys.users.signupDecisions(25);
    const priorDecision: SignupStatusDecision = {
      id: "old-1",
      userId: "u-0",
      fullName: "Prior",
      email: "prior@example.com",
      universityId: 1,
      universityCard: null,
      status: "APPROVED",
      createdAt: null,
      decidedAt: new Date("2026-08-01T10:00:00Z"),
      decisionActor: null,
    };

    client.setQueryData(pendingKey, [pendingUser]);
    client.setQueryData(decisionsKey, [priorDecision]);

    const ctx = await applyOptimisticSignupDecision(client, {
      userId: "u-1",
      status: "REJECTED",
      userName: "Ada Lovelace",
      decisionActor: {
        id: "admin-1",
        fullName: "Test Admin",
        email: "test@admin.com",
        universityCard: null,
      },
    });

    expect(client.getQueryData<User[]>(pendingKey)).toEqual([]);
    const decisions = client.getQueryData<SignupStatusDecision[]>(decisionsKey);
    expect(decisions?.[0]?.userId).toBe("u-1");
    expect(decisions?.[0]?.status).toBe("REJECTED");
    expect(decisions?.[0]?.id).toMatch(/^optimistic-u-1-/);
    expect(decisions?.[0]?.decisionActor?.fullName).toBe("Test Admin");
    expect(decisions?.[0]?.decisionActor?.email).toBe("test@admin.com");
    expect(decisions?.[1]?.id).toBe("old-1");

    rollbackOptimisticSignupDecision(client, ctx);
    expect(client.getQueryData(pendingKey)).toEqual([pendingUser]);
    expect(client.getQueryData(decisionsKey)).toEqual([priorDecision]);
  });

  it("marks densify-empty on last pending so SSR cannot reseed", async () => {
    const client = new QueryClient();
    const pendingKey = queryKeys.users.pending();
    client.setQueryData(pendingKey, [pendingUser]);

    await applyOptimisticSignupDecision(client, {
      userId: "u-1",
      status: "APPROVED",
      decisionActor: {
        id: "admin-1",
        fullName: "Test Admin",
        email: "test@admin.com",
        universityCard: null,
      },
    });

    expect(client.getQueryData(pendingKey)).toEqual([]);
    expect(isDensifiedEmpty(pendingKey)).toBe(true);
    expect(
      seedFromSsrIfEmpty(client, pendingKey, [pendingUser]),
    ).toEqual([]);
  });

  it("syncs pendingSignUps nav pill after optimistic remove", async () => {
    const client = new QueryClient();
    const pendingKey = queryKeys.users.pending();
    const sibling: User = { ...pendingUser, id: "u-2", email: "b@example.com" };
    client.setQueryData(pendingKey, [pendingUser, sibling]);
    client.setQueryData(queryKeys.admin.navCounts, {
      ...EMPTY_ADMIN_NAV_COUNTS,
      pendingSignUps: 2,
    });

    await applyOptimisticSignupDecision(client, {
      userId: "u-1",
      status: "APPROVED",
      decisionActor: {
        id: "admin-1",
        fullName: "Test Admin",
        email: "test@admin.com",
        universityCard: null,
      },
    });

    expect(client.getQueryData(queryKeys.admin.navCounts)).toMatchObject({
      pendingSignUps: 1,
    });
  });

  it("paints signup request detail status + timeline; rollback restores detail", async () => {
    const client = new QueryClient();
    const detailKey = queryKeys.users.signupRequestDetail("u-1");
    const priorDetail: SignupRequestDetail = {
      id: "u-1",
      fullName: "Ada Lovelace",
      email: "ada@example.com",
      universityId: 42,
      universityCard: "/cards/ada.jpg",
      status: "PENDING",
      role: "USER",
      createdAt: new Date("2026-08-01T12:00:00Z"),
      decisions: [],
    };
    client.setQueryData(detailKey, priorDetail);
    client.setQueryData(queryKeys.users.pending(), [pendingUser]);

    const ctx = await applyOptimisticSignupDecision(client, {
      userId: "u-1",
      status: "APPROVED",
      decisionActor: {
        id: "admin-1",
        fullName: "Test Admin",
        email: "test@admin.com",
        universityCard: null,
      },
    });

    const painted = client.getQueryData<SignupRequestDetail>(detailKey);
    expect(painted?.status).toBe("APPROVED");
    expect(painted?.decisions[0]?.status).toBe("APPROVED");
    expect(painted?.decisions[0]?.decisionActor?.email).toBe("test@admin.com");

    rollbackOptimisticSignupDecision(client, ctx);
    expect(client.getQueryData(detailKey)).toEqual(priorDetail);
  });
});
