"use client";

/**
 * User 360 Admin Privilege Requests — pending banner + 2-col history.
 * Decision & Actor matches Admin Requests Recent / Users Status (DecisionActorStack).
 * Pending: AccountStatusBadge + TicketDateMeta Requested (queue parity).
 * Bound to adminPrivilegeHistory RQ so approve/decline densify paints without flash.
 */

import { useState } from "react";
import { Shield } from "lucide-react";
import { DecisionActorStack } from "@/components/admin/DecisionActorStack";
import {
  AdminDetailEmptyState,
  USER_360_TABLE_SCROLL,
  USER_360_TH,
} from "@/components/admin/AdminDetailEmptyState";
import { AdminSurfacePanel } from "@/components/admin/AdminSurfacePanel";
import { TicketDateMeta } from "@/components/support-tickets/TicketDateMeta";
import { TicketSectionHeader } from "@/components/support-tickets/TicketSectionHeader";
import { useAdminPrivilegeHistory } from "@/hooks/useQueries";
import { ADMIN_REQUEST_WITHDRAWN_REASON } from "@/lib/admin/adminRequestConstants";
import type { AdminPrivilegeHistoryEntry } from "@/lib/admin/adminPrivilegeHistory";
import { AccountStatusBadge } from "@/lib/ui/semanticBadges";
import { formatMediumDateTime } from "@/lib/ui/formatMediumDate";

const REASON_SNIPPET_MAX = 80;

function truncateText(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
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
  const approvedCount = history.filter((r) => r.status === "APPROVED").length;
  const rejectedCount = history.filter((r) => r.status === "REJECTED").length;

  return (
    <AdminSurfacePanel>
      <div id="user-360-privilege" className="scroll-mt-24">
        <TicketSectionHeader
          variant="light"
          icon={<Shield className="size-5" aria-hidden />}
          title="Admin Privilege Requests"
          subtitle={`Approved · ${approvedCount} · Rejected · ${rejectedCount} · Admin ledger · Header actions for pending`}
        />
        {pending ? (
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-sm">
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
        {history.length === 0 ? (
          <AdminDetailEmptyState message="No admin privilege requests for this user yet." />
        ) : (
          <div className={USER_360_TABLE_SCROLL}>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className={USER_360_TH}>Decision & Actor</th>
                  <th className={USER_360_TH}>Reason</th>
                </tr>
              </thead>
              <tbody>
                {history.map((req) => {
                  const reason = (req.requestReason ?? "").trim();
                  const decided =
                    req.status === "APPROVED" || req.status === "REJECTED";
                  return (
                    <tr key={req.id} className="border-b last:border-0">
                      <td className="py-3 align-top">
                        {decided ? (
                          <DecisionActorStack
                            status={req.status}
                            actor={req.reviewer}
                            actorHref={
                              req.reviewer?.id
                                ? `/admin/users/${req.reviewer.id}`
                                : null
                            }
                            decidedAt={req.reviewedAt}
                            withdrawn={
                              req.rejectionReason ===
                              ADMIN_REQUEST_WITHDRAWN_REASON
                            }
                          />
                        ) : (
                          <div className="flex min-w-0 flex-col gap-1 leading-none">
                            {/* self-start: avoid flex-col stretch making badge full-width */}
                            <span className="inline-flex self-start">
                              <AccountStatusBadge status="PENDING" />
                            </span>
                            <TicketDateMeta
                              createdAt={req.createdAt}
                              createdLabel="Requested"
                              hideUpdated
                            />
                          </div>
                        )}
                      </td>
                      <td className="max-w-48 py-3 align-top">
                        <span
                          className="text-xs text-gray-600 sm:text-sm"
                          title={reason || undefined}
                        >
                          {reason
                            ? truncateText(reason, REASON_SNIPPET_MAX)
                            : "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminSurfacePanel>
  );
}
