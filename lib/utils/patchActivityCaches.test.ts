/**
 * Unit tests for activity-log densify helpers (no network).
 */

import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { queryKeys } from "@/lib/query/keys";
import type { ActivityLogItem } from "@/lib/services/activityLogs";
import {
  USER_ACTIVITY_CACHE_RETENTION,
  type AdminUserActivityEntry,
} from "@/lib/admin/adminUserActivity";
import {
  ACTIVITY_LOG_CACHE_RETENTION,
  densifyActivityLog,
  inventActivityLogItem,
  markActivityEntityDeleted,
  patchActivityCachesOnLog,
  resolveActivitySubjectUserId,
} from "@/lib/utils/patchActivityCaches";

function sampleRow(id: string): ActivityLogItem {
  return {
    id,
    actorId: "a1",
    actorName: "Admin",
    actorEmail: "admin@test.com",
    actorUniversityCard: null,
    action: "UPDATE",
    entityType: "borrow",
    entityId: "br1",
    details: { status: "BORROWED" },
    createdAt: new Date().toISOString(),
  };
}

describe("patchActivityCaches", () => {
  it("inventActivityLogItem fills required fields", () => {
    const row = inventActivityLogItem({
      action: "CREATE",
      entityType: "book",
      entityId: "b1",
      details: { title: "Algorithms" },
      actorName: "Ada",
    });
    expect(row.action).toBe("CREATE");
    expect(row.entityType).toBe("book");
    expect(row.entityId).toBe("b1");
    expect(row.actorName).toBe("Ada");
    expect(row.id).toMatch(/^optimistic-activity-/);
  });

  it("prepends to all activity-logs list keys and trims FIFO retention", () => {
    const client = new QueryClient();
    const key7 = queryKeys.activityLog.list({ period: "7days" });
    const keyAll = queryKeys.activityLog.list({ period: "all" });
    const filled = Array.from({ length: ACTIVITY_LOG_CACHE_RETENTION }, (_, i) =>
      sampleRow(`old-${i}`),
    );
    client.setQueryData(key7, filled);
    client.setQueryData(keyAll, [sampleRow("solo")]);

    const fresh = inventActivityLogItem({
      action: "UPDATE",
      entityType: "borrow",
      entityId: "br-new",
      details: { status: "RETURNED" },
    });
    patchActivityCachesOnLog(client, fresh);

    const next7 = client.getQueryData<ActivityLogItem[]>(key7)!;
    expect(next7[0]?.entityId).toBe("br-new");
    expect(next7).toHaveLength(ACTIVITY_LOG_CACHE_RETENTION);

    const nextAll = client.getQueryData<ActivityLogItem[]>(keyAll)!;
    expect(nextAll[0]?.entityId).toBe("br-new");
    expect(nextAll).toHaveLength(2);
  });

  it("densifyActivityLog invents and prepends", () => {
    const client = new QueryClient();
    const key = queryKeys.activityLog.list({ period: "7days" });
    client.setQueryData(key, [] as ActivityLogItem[]);
    densifyActivityLog(client, {
      action: "DELETE",
      entityType: "book",
      entityId: "b9",
      details: { count: 1 },
    });
    const next = client.getQueryData<ActivityLogItem[]>(key)!;
    expect(next[0]?.action).toBe("DELETE");
    expect(next[0]?.entityId).toBe("b9");
  });

  it("seeds default 7days key when no activity query was mounted", () => {
    const client = new QueryClient();
    densifyActivityLog(client, {
      action: "UPDATE",
      entityType: "borrow",
      entityId: "br-cold",
      details: { status: "RETURNED" },
    });
    const key = queryKeys.activityLog.list({ period: "7days" });
    const next = client.getQueryData<ActivityLogItem[]>(key)!;
    expect(next).toHaveLength(1);
    expect(next[0]?.entityId).toBe("br-cold");
  });

  it("resolveActivitySubjectUserId prefers details.userId over entity", () => {
    expect(
      resolveActivitySubjectUserId({
        action: "UPDATE",
        entityType: "admin-request",
        entityId: "req-1",
        details: { userId: "subject-1" },
      }),
    ).toBe("subject-1");
    expect(
      resolveActivitySubjectUserId({
        action: "UPDATE",
        entityType: "user",
        entityId: "u-entity",
      }),
    ).toBe("u-entity");
    expect(
      resolveActivitySubjectUserId({
        action: "UPDATE",
        entityType: "borrow",
        entityId: "br-1",
        actorId: "admin-1",
      }),
    ).toBeNull();
  });

  it("densifyActivityLog prepends User 360 activity when details.userId set", () => {
    const client = new QueryClient();
    const userKey = queryKeys.activityLog.user("subject-1");
    const filled = Array.from(
      { length: USER_ACTIVITY_CACHE_RETENTION },
      (_, i) =>
        ({
          id: `old-${i}`,
          action: "UPDATE",
          entityType: "user",
          entityId: "subject-1",
          details: null,
          createdAt: new Date().toISOString(),
        }) satisfies AdminUserActivityEntry,
    );
    client.setQueryData(userKey, filled);

    densifyActivityLog(client, {
      action: "UPDATE",
      entityType: "admin-request",
      entityId: "req-9",
      details: { userId: "subject-1", status: "APPROVED" },
      actorId: "admin-1",
    });

    const next = client.getQueryData<AdminUserActivityEntry[]>(userKey)!;
    expect(next[0]?.entityId).toBe("req-9");
    expect(next[0]?.details).toMatchObject({ userId: "subject-1" });
    expect(next).toHaveLength(USER_ACTIVITY_CACHE_RETENTION);
  });

  it("densifyActivityLog does not paint user panel without subject", () => {
    const client = new QueryClient();
    densifyActivityLog(client, {
      action: "CREATE",
      entityType: "book",
      entityId: "b1",
    });
    expect(
      client.getQueryData(queryKeys.activityLog.user("anyone")),
    ).toBeUndefined();
  });

  it("markActivityEntityDeleted flags matching book + reservation rows", () => {
    const client = new QueryClient();
    const key7 = queryKeys.activityLog.list({ period: "7days" });
    const userKey = queryKeys.activityLog.user("u1");
    client.setQueryData<ActivityLogItem[]>(key7, [
      {
        ...sampleRow("create-b1"),
        action: "CREATE",
        entityType: "book",
        entityId: "b1",
        details: { title: "Algorithms" },
      },
      {
        ...sampleRow("res-1"),
        action: "CREATE",
        entityType: "reservation",
        entityId: "r1",
        details: { bookId: "b1", status: "WAITING" },
      },
      {
        ...sampleRow("other"),
        entityType: "book",
        entityId: "b2",
        details: { title: "Other" },
      },
    ]);
    client.setQueryData<AdminUserActivityEntry[]>(userKey, [
      {
        id: "ua-1",
        action: "UPDATE",
        entityType: "book",
        entityId: "b1",
        details: { title: "Algorithms" },
        createdAt: new Date().toISOString(),
        actorId: "a1",
      },
    ]);

    markActivityEntityDeleted(client, "book", "b1");

    const next = client.getQueryData<ActivityLogItem[]>(key7)!;
    expect(next[0]?.details).toMatchObject({ entityDeleted: true });
    expect(next[1]?.details).toMatchObject({ entityDeleted: true });
    expect(next[2]?.details).not.toMatchObject({ entityDeleted: true });

    const userNext = client.getQueryData<AdminUserActivityEntry[]>(userKey)!;
    expect(userNext[0]?.details).toMatchObject({ entityDeleted: true });
  });

  it("markActivityEntityDeleted flags review and ticket CREATE/UPDATE rows", () => {
    const client = new QueryClient();
    const key7 = queryKeys.activityLog.list({ period: "7days" });
    client.setQueryData<ActivityLogItem[]>(key7, [
      {
        ...sampleRow("rv-create"),
        action: "CREATE",
        entityType: "review",
        entityId: "rv1",
        details: { bookId: "b1" },
      },
      {
        ...sampleRow("t-update"),
        action: "UPDATE",
        entityType: "ticket",
        entityId: "t1",
        details: { subject: "Help" },
      },
    ]);

    markActivityEntityDeleted(client, "review", "rv1");
    markActivityEntityDeleted(client, "ticket", "t1");

    const next = client.getQueryData<ActivityLogItem[]>(key7)!;
    expect(next[0]?.details).toMatchObject({ entityDeleted: true });
    expect(next[1]?.details).toMatchObject({ entityDeleted: true });
  });
});
