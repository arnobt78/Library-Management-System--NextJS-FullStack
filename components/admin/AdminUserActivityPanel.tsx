"use client";

/**
 * User 360 Activity table — densify via user-activity-history RQ key.
 */

import { useState } from "react";
import Link from "next/link";
import { Activity } from "lucide-react";
import {
  AdminDetailEmptyState,
  USER_360_TABLE_SCROLL,
  USER_360_TH,
} from "@/components/admin/AdminDetailEmptyState";
import { AdminSurfacePanel } from "@/components/admin/AdminSurfacePanel";
import { TicketSectionHeader } from "@/components/support-tickets/TicketSectionHeader";
import { useAdminUserActivityHistory } from "@/hooks/useQueries";
import type { AdminUserActivityEntry } from "@/lib/admin/adminUserActivity";
import { AuditActionBadge } from "@/lib/ui/semanticBadges";
import { formatMediumDateTime } from "@/lib/ui/formatMediumDate";
import { SKY_LINK_LIGHT } from "@/lib/ui/skyLinkStyles";
import {
  activityEntityHref,
  formatActivityEntityLabel,
  isActivityEntityLinkable,
} from "@/lib/ui/activityLogDisplay";

interface AdminUserActivityPanelProps {
  userId: string;
  initialActivity: AdminUserActivityEntry[];
}

export default function AdminUserActivityPanel({
  userId,
  initialActivity,
}: AdminUserActivityPanelProps) {
  const [ssrUpdatedAt] = useState(() => Date.now());
  const { data: activity = initialActivity } = useAdminUserActivityHistory(
    userId,
    initialActivity,
    ssrUpdatedAt,
  );

  return (
    <AdminSurfacePanel>
      <TicketSectionHeader
        variant="light"
        icon={<Activity className="size-5" aria-hidden />}
        title={`Activity (${activity.length})`}
        subtitle="Recent actions involving this user · FIFO latest 25"
      />
      {activity.length === 0 ? (
        <AdminDetailEmptyState message="No activity recorded for this user yet." />
      ) : (
        <div className={USER_360_TABLE_SCROLL}>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className={USER_360_TH}>When</th>
                <th className={USER_360_TH}>Action</th>
                <th className={USER_360_TH}>Entity</th>
              </tr>
            </thead>
            <tbody>
              {activity.map((log) => {
                const details =
                  log.details && typeof log.details === "object"
                    ? (log.details as Record<string, unknown>)
                    : null;
                const linkable = isActivityEntityLinkable({
                  action: log.action,
                  entityType: log.entityType,
                  entityId: log.entityId,
                  details,
                });
                const href = activityEntityHref(
                  log.entityType,
                  log.entityId,
                  details,
                );
                const entityLabel = formatActivityEntityLabel(log.entityType);

                return (
                  <tr key={log.id} className="border-b last:border-0">
                    <td className="whitespace-nowrap py-2 text-xs text-gray-600">
                      {formatMediumDateTime(log.createdAt)}
                    </td>
                    <td>
                      <AuditActionBadge
                        action={
                          log.action as "CREATE" | "UPDATE" | "DELETE"
                        }
                      />
                    </td>
                    <td className="text-xs text-gray-700">
                      {linkable && href ? (
                        <Link
                          prefetch={false}
                          href={href}
                          className={SKY_LINK_LIGHT}
                        >
                          {entityLabel}
                        </Link>
                      ) : (
                        entityLabel
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminSurfacePanel>
  );
}
