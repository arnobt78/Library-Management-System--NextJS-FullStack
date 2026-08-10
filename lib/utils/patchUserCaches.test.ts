/**
 * Unit tests for user densify helpers (no network).
 * Parent: users nav densify — syncUsersNav + all-users row patch
 */

import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { queryKeys } from "@/lib/query/keys";
import type { User, UsersListResponse } from "@/lib/services/users";
import {
  densifySignupRequestDetail,
  densifyUserRegistrationPending,
  densifyUserWrite,
} from "@/lib/utils/patchUserCaches";
import { EMPTY_ADMIN_NAV_COUNTS } from "@/lib/admin/adminNavCountTypes";
import type { SignupRequestDetail } from "@/lib/admin/signupStatusDecisions";

function makeUser(overrides: Partial<User> & Pick<User, "id">): User {
  return {
    id: overrides.id,
    fullName: overrides.fullName ?? "Test User",
    email: overrides.email ?? "test@user.com",
    universityId: overrides.universityId ?? 1,
    universityCard: overrides.universityCard ?? "/cards/t.jpg",
    status: overrides.status ?? "PENDING",
    role: overrides.role ?? "USER",
    lastActivityDate: overrides.lastActivityDate ?? null,
    lastLogin: overrides.lastLogin ?? null,
    createdAt: overrides.createdAt ?? new Date("2026-08-01"),
  };
}

describe("patchUserCaches", () => {
  it("densifyUserWrite patches all-users row + syncs users nav from total", () => {
    const client = new QueryClient();
    const pending = makeUser({ id: "u-1", status: "PENDING" });
    const sibling = makeUser({ id: "u-2", status: "APPROVED" });
    const listKey = queryKeys.users.adminList({});
    client.setQueryData<UsersListResponse>(listKey, {
      users: [pending, sibling],
      total: 2,
      page: 1,
      totalPages: 1,
      limit: 50,
    });
    client.setQueryData(queryKeys.users.detail("u-1"), pending);
    client.setQueryData(queryKeys.users.pending(), [pending]);
    client.setQueryData(queryKeys.admin.navCounts, {
      ...EMPTY_ADMIN_NAV_COUNTS,
      users: 2,
      pendingSignUps: 1,
    });

    densifyUserWrite(client, {
      userId: "u-1",
      status: "APPROVED",
    });

    const list = client.getQueryData<UsersListResponse>(listKey);
    expect(list?.users.find((u) => u.id === "u-1")?.status).toBe("APPROVED");
    expect(list?.total).toBe(2);
    expect(client.getQueryData(queryKeys.users.pending())).toEqual([]);
    expect(client.getQueryData(queryKeys.admin.navCounts)).toMatchObject({
      users: 2,
      pendingSignUps: 0,
    });
  });

  it("densifyUserWrite patches role on all-users without changing total", () => {
    const client = new QueryClient();
    const user = makeUser({ id: "u-1", status: "APPROVED", role: "USER" });
    const listKey = queryKeys.users.adminList({});
    client.setQueryData<UsersListResponse>(listKey, {
      users: [user],
      total: 5,
      page: 1,
      totalPages: 1,
      limit: 50,
    });
    client.setQueryData(queryKeys.users.detail("u-1"), user);
    client.setQueryData(queryKeys.admin.navCounts, {
      ...EMPTY_ADMIN_NAV_COUNTS,
      users: 5,
    });

    densifyUserWrite(client, { userId: "u-1", role: "ADMIN" });

    const list = client.getQueryData<UsersListResponse>(listKey);
    expect(list?.users[0]?.role).toBe("ADMIN");
    expect(list?.total).toBe(5);
    expect(client.getQueryData(queryKeys.admin.navCounts)).toMatchObject({
      users: 5,
    });
  });

  it("densifyUserRegistrationPending bumps pendingSignUps pill", () => {
    const client = new QueryClient();
    const rejected = makeUser({ id: "u-1", status: "REJECTED" });
    client.setQueryData(queryKeys.users.detail("u-1"), rejected);
    client.setQueryData(queryKeys.users.pending(), []);
    client.setQueryData(queryKeys.admin.navCounts, {
      ...EMPTY_ADMIN_NAV_COUNTS,
      pendingSignUps: 0,
    });

    densifyUserRegistrationPending(client, "u-1");

    const pending = client.getQueryData<User[]>(queryKeys.users.pending());
    expect(pending?.[0]?.id).toBe("u-1");
    expect(pending?.[0]?.status).toBe("PENDING");
    expect(client.getQueryData(queryKeys.admin.navCounts)).toMatchObject({
      pendingSignUps: 1,
    });
  });

  it("densifyUserWrite paints signup request detail status + timeline actor", () => {
    const client = new QueryClient();
    const detailKey = queryKeys.users.signupRequestDetail("u-1");
    const detail: SignupRequestDetail = {
      id: "u-1",
      fullName: "Test User",
      email: "test@user.com",
      universityId: 1,
      universityCard: null,
      status: "PENDING",
      role: "USER",
      createdAt: new Date("2026-08-01"),
      decisions: [],
    };
    client.setQueryData(detailKey, detail);
    client.setQueryData(queryKeys.users.pending(), [
      makeUser({ id: "u-1", status: "PENDING" }),
    ]);

    densifyUserWrite(client, {
      userId: "u-1",
      status: "REJECTED",
      fromStatus: "PENDING",
      reviewer: {
        id: "admin-1",
        fullName: "Test Admin",
        email: "test@admin.com",
        universityCard: null,
      },
      statusReviewedAt: "2026-08-10T12:00:00.000Z",
    });

    const painted = client.getQueryData<SignupRequestDetail>(detailKey);
    expect(painted?.status).toBe("REJECTED");
    expect(painted?.decisions[0]?.status).toBe("REJECTED");
    expect(painted?.decisions[0]?.decisionActor?.email).toBe("test@admin.com");
  });

  it("densifySignupRequestDetail keeps optimistic actor when densify actor is null", () => {
    const client = new QueryClient();
    const detailKey = queryKeys.users.signupRequestDetail("u-1");
    client.setQueryData<SignupRequestDetail>(detailKey, {
      id: "u-1",
      fullName: "Test User",
      email: "test@user.com",
      universityId: 1,
      universityCard: null,
      status: "APPROVED",
      role: "USER",
      createdAt: null,
      decisions: [
        {
          id: "optimistic-u-1-1",
          status: "APPROVED",
          decidedAt: new Date(),
          decisionActor: {
            id: "admin-1",
            fullName: "Test Admin",
            email: "test@admin.com",
            universityCard: null,
          },
        },
      ],
    });

    densifySignupRequestDetail(client, {
      userId: "u-1",
      status: "APPROVED",
      decisionActor: null,
    });

    const painted = client.getQueryData<SignupRequestDetail>(detailKey);
    expect(painted?.decisions[0]?.id).toMatch(/^densify-u-1-/);
    expect(painted?.decisions[0]?.decisionActor?.email).toBe("test@admin.com");
  });
});
