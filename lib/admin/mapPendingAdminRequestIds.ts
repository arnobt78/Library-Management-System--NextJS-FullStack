/**
 * Map userId → PENDING admin_requests.id + latest admin_requests.status.
 * Used by Users list / users.detail densify + Admin privilege KPI.
 */

import { desc, inArray } from "drizzle-orm";
import { db } from "@/database/drizzle";
import { adminRequests } from "@/database/schema";
import type { LatestAdminRequestStatus } from "@/lib/admin/adminPrivilegeStatus";

export type AdminPrivilegeFields = {
  pendingAdminRequestId: string | null;
  latestAdminRequestStatus: LatestAdminRequestStatus | null;
};

/** Map userId → PENDING request id only (list kebab CTAs). */
export async function mapPendingAdminRequestIds(
  userIds: string[],
): Promise<Map<string, string>> {
  const fields = await mapAdminPrivilegeFields(userIds);
  const map = new Map<string, string>();
  for (const [userId, value] of fields) {
    if (value.pendingAdminRequestId) {
      map.set(userId, value.pendingAdminRequestId);
    }
  }
  return map;
}

/** Latest request (any status) + PENDING id when present, one scan per user set. */
export async function mapAdminPrivilegeFields(
  userIds: string[],
): Promise<Map<string, AdminPrivilegeFields>> {
  const map = new Map<string, AdminPrivilegeFields>();
  if (userIds.length === 0) return map;

  for (const id of userIds) {
    map.set(id, {
      pendingAdminRequestId: null,
      latestAdminRequestStatus: null,
    });
  }

  const rows = await db
    .select({
      id: adminRequests.id,
      userId: adminRequests.userId,
      status: adminRequests.status,
    })
    .from(adminRequests)
    .where(inArray(adminRequests.userId, userIds))
    .orderBy(desc(adminRequests.createdAt));

  for (const row of rows) {
    const current = map.get(row.userId);
    if (!current) continue;

    if (current.latestAdminRequestStatus === null) {
      current.latestAdminRequestStatus =
        row.status as LatestAdminRequestStatus;
    }
    if (
      row.status === "PENDING" &&
      current.pendingAdminRequestId === null
    ) {
      current.pendingAdminRequestId = row.id;
    }
  }

  return map;
}

/** Single-user helper for detail cache / 360 seed. */
export async function getAdminPrivilegeFieldsForUser(
  userId: string,
): Promise<AdminPrivilegeFields> {
  const map = await mapAdminPrivilegeFields([userId]);
  return (
    map.get(userId) ?? {
      pendingAdminRequestId: null,
      latestAdminRequestStatus: null,
    }
  );
}
