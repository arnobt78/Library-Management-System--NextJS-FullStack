/**
 * Admin Activity History Page (`/admin/activity-history`).
 * Parent: CR-0003 / REQ-0034
 *
 * SSR-fetches the last 7 days of the audit feed (default period) so the
 * table paints instantly; period/search switches refetch via TanStack Query
 * against `/api/activity-logs`.
 */
import React from "react";
import { requireAdminActorOrRedirect } from "@/lib/auth/authorization";
import { getActivityLogs } from "@/lib/server/activityLogData";
import ActivityLogSection from "@/components/admin/ActivityLogSection";

export const runtime = "nodejs";

const Page = async () => {
  await requireAdminActorOrRedirect();
  const initialLogs = await getActivityLogs({ period: "7days" });

  return (
    <ActivityLogSection initialLogs={JSON.parse(JSON.stringify(initialLogs))} />
  );
};

export default Page;
