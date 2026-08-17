"use client";

/**
 * User 360 status/action KPI row — Reg + Privilege densify via existing
 * users.detail / signupRequestDetail (same keys as header + panels).
 * Fine / Overdue stay SSR metrics props (no invent densify).
 * Fine is live (today − due) × daily rate from getAdminUserProfile.
 */

import { useState } from "react";
import {
  AlertTriangle,
  Clock,
  DollarSign,
  Shield,
} from "lucide-react";
import { DetailKpiShell } from "@/components/admin/DetailKpiShell";
import {
  useAdminUserDetail,
  useSignupRequestDetail,
} from "@/hooks/useQueries";
import { deriveAdminPrivilegeStatus } from "@/lib/admin/adminPrivilegeStatus";
import type { SignupRequestDetail } from "@/lib/admin/signupStatusDecisions";
import type { User } from "@/lib/services/users";
import {
  AccountStatusBadge,
  AdminPrivilegeBadge,
} from "@/lib/ui/semanticBadges";
import { cn } from "@/lib/utils";

interface AdminUser360StatusKpiRowProps {
  initialUser: User;
  initialSignupDetail: SignupRequestDetail;
  outstandingFine: number;
  overdue: number;
}

export default function AdminUser360StatusKpiRow({
  initialUser,
  initialSignupDetail,
  outstandingFine,
  overdue,
}: AdminUser360StatusKpiRowProps) {
  const [ssrUpdatedAt] = useState(() => Date.now());
  const { data: user = initialUser } = useAdminUserDetail(
    initialUser.id,
    initialUser,
    ssrUpdatedAt,
  );
  const { data: signup = initialSignupDetail } = useSignupRequestDetail(
    initialSignupDetail.id,
    initialSignupDetail,
    ssrUpdatedAt,
  );

  const privilegeStatus = deriveAdminPrivilegeStatus({
    role: user.role,
    pendingAdminRequestId: user.pendingAdminRequestId,
    latestAdminRequestStatus: user.latestAdminRequestStatus,
  });

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <DetailKpiShell
        variant="light"
        icon={<Clock className="size-4" />}
        label="Registration status"
        hint="Student account approval"
      >
        <AccountStatusBadge status={signup.status ?? "PENDING"} />
      </DetailKpiShell>
      <DetailKpiShell
        variant="light"
        icon={<Shield className="size-4" />}
        label="Admin privilege"
        hint="Make-admin request status"
      >
        <AdminPrivilegeBadge status={privilegeStatus} />
      </DetailKpiShell>
      <DetailKpiShell
        variant="light"
        icon={<DollarSign className="size-4" />}
        label="Outstanding fine"
        hint="This user only · live accrual"
      >
        <span
          className={cn(
            "text-2xl font-semibold tabular-nums",
            outstandingFine > 0 ? "text-rose-700" : "text-gray-900",
          )}
        >
          ${outstandingFine.toFixed(2)}
        </span>
      </DetailKpiShell>
      <DetailKpiShell
        variant="light"
        icon={<AlertTriangle className="size-4" />}
        label="Overdue"
        hint="Past due loans"
      >
        <span
          className={cn(
            "text-2xl font-semibold tabular-nums",
            overdue > 0 ? "text-rose-700" : "text-gray-900",
          )}
        >
          {overdue}
        </span>
      </DetailKpiShell>
    </div>
  );
}
