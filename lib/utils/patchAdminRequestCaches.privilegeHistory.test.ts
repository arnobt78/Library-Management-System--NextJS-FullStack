/**
 * Unit: densifyAdminPrivilegeHistoryUpsert / Remove.
 */

import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { queryKeys } from "@/lib/query/keys";
import type { AdminPrivilegeHistoryEntry } from "@/lib/admin/adminPrivilegeHistory";
import {
  densifyAdminPrivilegeHistoryRemove,
  densifyAdminPrivilegeHistoryUpsert,
} from "@/lib/utils/patchAdminRequestCaches";

function entry(
  overrides: Partial<AdminPrivilegeHistoryEntry> & { id: string },
): AdminPrivilegeHistoryEntry {
  return {
    id: overrides.id,
    status: overrides.status ?? "PENDING",
    requestReason: overrides.requestReason ?? "reason",
    rejectionReason: overrides.rejectionReason ?? null,
    createdAt: overrides.createdAt ?? new Date("2026-08-01"),
    reviewedAt: overrides.reviewedAt ?? null,
    reviewer: overrides.reviewer ?? null,
  };
}

describe("densifyAdminPrivilegeHistory", () => {
  it("upserts newest-first and replaces same id", () => {
    const client = new QueryClient();
    const key = queryKeys.users.adminPrivilegeHistory("u-1");
    client.setQueryData(key, [entry({ id: "r1", status: "PENDING" })]);

    densifyAdminPrivilegeHistoryUpsert(
      client,
      "u-1",
      entry({
        id: "r1",
        status: "REJECTED",
        reviewedAt: new Date("2026-08-11"),
      }),
    );

    const rows = client.getQueryData<AdminPrivilegeHistoryEntry[]>(key);
    expect(rows).toHaveLength(1);
    expect(rows?.[0]?.status).toBe("REJECTED");
  });

  it("cold-seeds when cache missing", () => {
    const client = new QueryClient();
    densifyAdminPrivilegeHistoryUpsert(
      client,
      "u-2",
      entry({ id: "r2", status: "APPROVED" }),
    );
    expect(
      client.getQueryData(queryKeys.users.adminPrivilegeHistory("u-2")),
    ).toMatchObject([{ id: "r2", status: "APPROVED" }]);
  });

  it("removes pending row on cancel", () => {
    const client = new QueryClient();
    const key = queryKeys.users.adminPrivilegeHistory("u-1");
    client.setQueryData(key, [
      entry({ id: "r1" }),
      entry({ id: "r0", status: "REJECTED" }),
    ]);
    densifyAdminPrivilegeHistoryRemove(client, "u-1", "r1");
    expect(client.getQueryData(key)).toMatchObject([{ id: "r0" }]);
  });
});
