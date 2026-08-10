"use client";

/**
 * Registration panel for unified User 360 — signup KPIs + applicant + signup ledger.
 * Admin privilege KPI densifies via users.detail (separate from signupRequestDetail).
 */

import { useEffect, useState } from "react";
import {
  Calendar,
  CheckCircle,
  Clock,
  Eye,
  GraduationCap,
  Mail,
  Shield,
  User as UserIcon,
  XCircle,
} from "lucide-react";
import { Image as ImageKitImage } from "@imagekit/next";
import AdminRequestReviewerAttribution from "@/components/AdminRequestReviewerAttribution";
import { CopyButton } from "@/components/CopyButton";
import { SafeImage } from "@/components/ui/safe-image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AdminSurfacePanel } from "@/components/admin/AdminSurfacePanel";
import { DetailKpiShell } from "@/components/admin/DetailKpiShell";
import { useAdminUserDetail, useSignupRequestDetail } from "@/hooks/useQueries";
import { deriveAdminPrivilegeStatus } from "@/lib/admin/adminPrivilegeStatus";
import type { SignupRequestDetail } from "@/lib/admin/signupStatusDecisions";
import type { User } from "@/lib/services/users";
import {
  AccountStatusBadge,
  AdminPrivilegeBadge,
} from "@/lib/ui/semanticBadges";
import { formatMediumDateTime } from "@/lib/ui/formatMediumDate";
import { resolveUniversityCard } from "@/lib/media/universityCard";
import config from "@/lib/config";
import { cn } from "@/lib/utils";

export type AdminUser360Entry = "directory" | "registration" | "privilege";

interface AdminUserRegistrationPanelProps {
  initialDetail: SignupRequestDetail;
  /** users.detail seed — Admin privilege KPI densify. */
  initialUser: User;
  /** When entry=registration, scroll registration into view once. */
  entry?: AdminUser360Entry;
}

export default function AdminUserRegistrationPanel({
  initialDetail,
  initialUser,
  entry = "directory",
}: AdminUserRegistrationPanelProps) {
  const [cardOpen, setCardOpen] = useState(false);
  const [ssrUpdatedAt] = useState(() => Date.now());
  const { data: detail = initialDetail } = useSignupRequestDetail(
    initialDetail.id,
    initialDetail,
    ssrUpdatedAt,
  );
  const { data: user = initialUser } = useAdminUserDetail(
    initialUser.id,
    initialUser,
    ssrUpdatedAt,
  );

  useEffect(() => {
    if (entry !== "registration") return;
    const el = document.getElementById("user-360-registration");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [entry]);

  const cardMedia = resolveUniversityCard(detail.universityCard);
  const approvedCount = detail.decisions.filter(
    (d) => d.status === "APPROVED",
  ).length;
  const rejectedCount = detail.decisions.filter(
    (d) => d.status === "REJECTED",
  ).length;
  const privilegeStatus = deriveAdminPrivilegeStatus({
    role: user.role,
    pendingAdminRequestId: user.pendingAdminRequestId,
    latestAdminRequestStatus: user.latestAdminRequestStatus,
  });

  return (
    <div id="user-360-registration" className="scroll-mt-24 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <DetailKpiShell
          variant="light"
          icon={<Clock className="size-4" />}
          label="Registration status"
          hint="Student account approval"
        >
          <AccountStatusBadge status={detail.status ?? "PENDING"} />
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
          icon={<CheckCircle className="size-4 text-emerald-600" />}
          label="Signup approvals"
          hint="Registration ledger"
        >
          <span className="text-2xl font-semibold text-gray-900">
            {approvedCount}
          </span>
        </DetailKpiShell>
        <DetailKpiShell
          variant="light"
          icon={<XCircle className="size-4 text-rose-600" />}
          label="Signup rejections"
          hint="Registration ledger"
        >
          <span className="text-2xl font-semibold text-gray-900">
            {rejectedCount}
          </span>
        </DetailKpiShell>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AdminSurfacePanel>
          <h2 className="mb-3 text-base font-medium text-dark-400 sm:text-lg">
            Applicant details
          </h2>
          <dl className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <dt className="flex items-center gap-1.5 text-gray-500">
                <Mail className="size-3.5" aria-hidden />
                Email
              </dt>
              <dd className="flex flex-1 flex-wrap items-center gap-2 font-medium text-gray-900">
                <span className="break-all">{detail.email}</span>
                <CopyButton text={detail.email} className="h-7 px-2" />
              </dd>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <dt className="flex items-center gap-1.5 text-gray-500">
                <GraduationCap className="size-3.5" aria-hidden />
                University ID
              </dt>
              <dd className="font-medium text-gray-900">{detail.universityId}</dd>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <dt className="flex items-center gap-1.5 text-gray-500">
                <UserIcon className="size-3.5" aria-hidden />
                Role
              </dt>
              <dd className="font-medium text-gray-900">
                {detail.role ?? "USER"}
              </dd>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <dt className="flex items-center gap-1.5 text-gray-500">
                <Calendar className="size-3.5" aria-hidden />
                Registered
              </dt>
              <dd className="font-medium text-gray-900">
                {formatMediumDateTime(detail.createdAt)}
              </dd>
            </div>
          </dl>

          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
              <Shield className="size-4 text-purple-500" aria-hidden />
              University card
            </div>
            {cardMedia.kind !== "empty" ? (
              <Dialog open={cardOpen} onOpenChange={setCardOpen}>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="group relative h-24 w-full max-w-xs cursor-pointer overflow-hidden rounded-lg border border-gray-200 transition-colors hover:border-blue-300"
                  >
                    {cardMedia.kind === "imagekit" ? (
                      <ImageKitImage
                        src={cardMedia.path}
                        urlEndpoint={config.env.imagekit.urlEndpoint}
                        alt="University card"
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <SafeImage
                        src={cardMedia.src}
                        alt="University card"
                        fill
                        className="object-cover"
                        sizes="200px"
                      />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all group-hover:bg-black/20">
                      <div className="rounded-full bg-white/90 p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <Eye className="size-3 text-gray-700" />
                      </div>
                    </div>
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      University card — {detail.fullName}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="relative mt-3 aspect-[4/3] w-full overflow-hidden rounded-lg">
                    {cardMedia.kind === "imagekit" ? (
                      <ImageKitImage
                        src={cardMedia.path}
                        urlEndpoint={config.env.imagekit.urlEndpoint}
                        alt="University card"
                        fill
                        className="object-contain"
                      />
                    ) : (
                      <SafeImage
                        src={cardMedia.src}
                        alt="University card"
                        fill
                        className="object-contain"
                        sizes="(max-width: 768px) 100vw, 672px"
                      />
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            ) : (
              <div className="flex h-24 w-full max-w-xs items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
                <p className="text-xs text-gray-500">No card uploaded</p>
              </div>
            )}
          </div>
        </AdminSurfacePanel>

        <AdminSurfacePanel>
          <h2 className="mb-3 text-base font-medium text-dark-400 sm:text-lg">
            Signup decision timeline ({detail.decisions.length})
          </h2>
          {detail.decisions.length === 0 ? (
            <p className="text-sm text-gray-500">No signup decisions yet.</p>
          ) : (
            <ul className="space-y-3">
              {detail.decisions.map((entry) => {
                const approved = entry.status === "APPROVED";
                return (
                  <li
                    key={entry.id}
                    className={cn(
                      "rounded-lg border p-3 sm:p-4",
                      approved
                        ? "border-emerald-200 bg-emerald-50/50"
                        : "border-rose-200 bg-rose-50/50",
                    )}
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <AccountStatusBadge status={entry.status} />
                      <span className="text-xs text-gray-600">
                        {formatMediumDateTime(entry.decidedAt)}
                      </span>
                    </div>
                    <AdminRequestReviewerAttribution
                      reviewer={entry.decisionActor}
                      prefix={approved ? "Approved by" : "Rejected by"}
                      size={28}
                      href={
                        entry.decisionActor?.id
                          ? `/admin/users/${entry.decisionActor.id}`
                          : null
                      }
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </AdminSurfacePanel>
      </div>
    </div>
  );
}
