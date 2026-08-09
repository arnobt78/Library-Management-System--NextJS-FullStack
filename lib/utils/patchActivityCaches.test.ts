/**
 * Unit tests for activity-log densify helpers (no network).
 */

import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { queryKeys } from "@/lib/query/keys";
import type { ActivityLogItem } from "@/lib/services/activityLogs";
import {
  ACTIVITY_LOG_CACHE_RETENTION,
  densifyActivityLog,
  inventActivityLogItem,
  patchActivityCachesOnLog,
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
});
