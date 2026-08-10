"use client";

/**
 * User 360 Admin privilege requests — pending banner + history table.
 * Bound to adminPrivilegeHistory RQ so approve/decline densify paints without flash.
 */

import { useState } from "react";
import AdminRequestReviewerAttribution from "@/components/AdminRequestReviewerAttribution";
import { AdminSurfacePanel } from "@/components/admin/AdminSurfacePanel";
import { useAdminPrivilegeHistory } from "@/hooks/useQueries";
import type { AdminPrivilegeHistoryEntry } from "@/lib/admin/adminPrivilegeHistory";
import { formatMediumDateTime } from "@/lib/ui/formatMediumDate";
import { cn } from "@/lib/utils";

const REASON_SNIPPET_MAX = 80;

function truncateText(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function adminRequestStatusClass(status: string): string {
  if (status === "APPROVED") {
    return "border-emerald-200 bg-emerald-50/90 text-emerald-700";
  }
  if (status === "REJECTED") {
    return "border-rose-200 bg-rose-50/90 text-rose-700";
  }
  return "border-amber-200 bg-amber-50/90 text-amber-700";
}

interface AdminUserPrivilegePanelProps {
  userId: string;
  initialHistory: AdminPrivilegeHistoryEntry[];
}

export default function AdminUserPrivilegePanel({
  userId,
  initialHistory,
}: AdminUserPrivilegePanelProps) {
  const [ssrUpdatedAt] = useState(() => Date.now());
  const { data: history = initialHistory } = useAdminPrivilegeHistory(
    userId,
    initialHistory,
    ssrUpdatedAt,
  );

  const pending = history.find((r) => r.status === "PENDING");

  return (
    <AdminSurfacePanel>
      <div id="user-360-privilege" className="scroll-mt-24 space-y-3">
        <div>
          <h2 className="font-medium">Admin privilege requests</h2>
          <p className="mt-1 text-xs text-gray-500">
            Header actions handle pending Approve Admin / Decline.
          </p>
        </div>
        {pending ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-sm">
            <p className="font-medium text-amber-900">
              Pending make-admin request
            </p>
            <p className="mt-1 text-xs text-amber-800/90">
              Requested {formatMediumDateTime(pending.createdAt)}
            </p>
            {pending.requestReason ? (
              <p className="mt-2 text-sm text-amber-950/90">
                {pending.requestReason}
              </p>
            ) : null}
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2">Status</th>
                <th>Reason</th>
                <th>Reviewer</th>
                <th>Dates</th>
              </tr>
            </thead>
            <tbody>
              {history.map((req) => (
                <tr key={req.id} className="border-b last:border-0">
                  <td className="py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-md border px-2 py-0.5 text-xs font-medium",
                        adminRequestStatusClass(req.status),
                      )}
                    >
                      {req.status}
                    </span>
                  </td>
                  <td className="max-w-40 text-xs text-gray-600">
                    {truncateText(
                      req.rejectionReason || req.requestReason || "—",
                      REASON_SNIPPET_MAX,
                    )}
                  </td>
                  <td>
                    {(req.status === "APPROVED" ||
                      req.status === "REJECTED") && (
                      <AdminRequestReviewerAttribution
                        reviewer={req.reviewer}
                        prefix=""
                        size={24}
                        className="text-xs text-gray-600"
                        textClassName="text-gray-900"
                      />
                    )}
                  </td>
                  <td className="whitespace-nowrap text-xs text-gray-500">
                    <div>{formatMediumDateTime(req.createdAt)}</div>
                    {req.reviewedAt ? (
                      <div>{formatMediumDateTime(req.reviewedAt)}</div>
                    ) : null}
                  </td>
                </tr>
              ))}
              {history.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="py-6 text-center text-gray-500"
                  >
                    No admin privilege requests
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </AdminSurfacePanel>
  );
}
