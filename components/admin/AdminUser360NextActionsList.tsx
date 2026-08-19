"use client";

/**
 * User 360 advisory next actions — Fine/Overdue from users.fineMetrics densify
 * (same query key as AdminUser360StatusKpiRow; no duplicate network).
 */

import { useState } from "react";
import { useUserFineMetrics } from "@/hooks/useQueries";
import { buildUserNextActions } from "@/lib/insights/userNextActions";
import type { UserFineMetrics } from "@/lib/fines/userFineMetrics";

interface AdminUser360NextActionsListProps {
  userId: string;
  initialFineMetrics: UserFineMetrics;
  pending: number;
  waitingHolds: number;
  readyHolds: number;
}

export default function AdminUser360NextActionsList({
  userId,
  initialFineMetrics,
  pending,
  waitingHolds,
  readyHolds,
}: AdminUser360NextActionsListProps) {
  const [ssrUpdatedAt] = useState(() => Date.now());
  const { data: fineMetrics = initialFineMetrics } = useUserFineMetrics(
    userId,
    initialFineMetrics,
    ssrUpdatedAt,
  );

  const nextActions = buildUserNextActions({
    overdue: fineMetrics.overdueCount,
    outstandingFine: fineMetrics.outstandingFine,
    pending,
    waitingHolds,
    readyHolds,
  });

  return (
    <ul className="mt-2 space-y-2">
      {nextActions.map((action) => (
        <li
          key={action.id}
          className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700"
        >
          <span className="font-medium text-gray-900">{action.label}</span>
          <span className="mt-0.5 block text-xs text-gray-500">
            {action.reason}
          </span>
        </li>
      ))}
    </ul>
  );
}
