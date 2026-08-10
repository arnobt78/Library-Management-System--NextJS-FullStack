"use client";

/**
 * User 360 Activity table — densify via user-activity-history RQ key.
 */

import { useState } from "react";
import Link from "next/link";
import { AdminSurfacePanel } from "@/components/admin/AdminSurfacePanel";
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
      <h2 className="font-medium">Activity</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-2">When</th>
              <th>Action</th>
              <th>Entity</th>
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
            {activity.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-6 text-center text-gray-500">
                  No activity recorded
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </AdminSurfacePanel>
  );
}
