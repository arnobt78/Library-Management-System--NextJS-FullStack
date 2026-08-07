/**
 * Admin-request status aggregates for Library Overview KPI badges.
 * Plain SQL counts (no join) — safe for SSR + /api/admin/stats after authorizeAdminRoute.
 * Parent: REQ-0033 overview KPI glass badges
 */
import "server-only";

import { cache } from "react";
import { db } from "@/database/drizzle";
import { adminRequests } from "@/database/schema";
import { sql } from "drizzle-orm";

export type AdminRequestOverviewCounts = {
  pendingAdminRequests: number;
  rejectedAdminRequests: number;
  approvedAdminRequests: number;
};

export const getAdminRequestOverviewCounts = cache(
  async (): Promise<AdminRequestOverviewCounts> => {
    const rows = await db
      .select({
        pendingAdminRequests: sql<number>`count(*) filter (where ${adminRequests.status} = 'PENDING')`,
        rejectedAdminRequests: sql<number>`count(*) filter (where ${adminRequests.status} = 'REJECTED')`,
        approvedAdminRequests: sql<number>`count(*) filter (where ${adminRequests.status} = 'APPROVED')`,
      })
      .from(adminRequests);

    return {
      pendingAdminRequests: Number(rows[0]?.pendingAdminRequests ?? 0),
      rejectedAdminRequests: Number(rows[0]?.rejectedAdminRequests ?? 0),
      approvedAdminRequests: Number(rows[0]?.approvedAdminRequests ?? 0),
    };
  },
);
