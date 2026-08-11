"use client";

/**
 * User 360 registration surfaces — Applicant Details + Signup Decision Timeline.
 * Ledger Approved/Rejected counts live in the timeline header (not page KPIs).
 * Section chrome matches ticket/review detail.
 */

import { useEffect, useState } from "react";
import {
  Calendar,
  Eye,
  GraduationCap,
  IdCard,
  ListOrdered,
  Mail,
  Shield,
  User as UserIcon,
} from "lucide-react";
import { Image as ImageKitImage } from "@imagekit/next";
import AdminRequestReviewerAttribution from "@/components/AdminRequestReviewerAttribution";
import { AdminDetailEmptyState } from "@/components/admin/AdminDetailEmptyState";
import { SafeImage } from "@/components/ui/safe-image";
import CopyableText from "@/components/ui/CopyableText";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AdminSurfacePanel } from "@/components/admin/AdminSurfacePanel";
import { TicketSectionHeader } from "@/components/support-tickets/TicketSectionHeader";
import { useSignupRequestDetail } from "@/hooks/useQueries";
import type { SignupRequestDetail } from "@/lib/admin/signupStatusDecisions";
import {
  AccountStatusBadge,
  UserRoleBadge,
} from "@/lib/ui/semanticBadges";
import { formatMediumDateTime } from "@/lib/ui/formatMediumDate";
import { FIELD_LABEL_ROW } from "@/lib/ui/fieldLabelStyles";
import { resolveUniversityCard } from "@/lib/media/universityCard";
import config from "@/lib/config";
import { cn } from "@/lib/utils";

export type AdminUser360Entry = "directory" | "registration" | "privilege";

function useSignupDetail(
  initialDetail: SignupRequestDetail,
): SignupRequestDetail {
  const [ssrUpdatedAt] = useState(() => Date.now());
  const { data: detail = initialDetail } = useSignupRequestDetail(
    initialDetail.id,
    initialDetail,
    ssrUpdatedAt,
  );
  return detail;
}

/** Scroll target when entry=registration. */
export function AdminUserRegistrationScrollAnchor({
  entry = "directory",
}: {
  entry?: AdminUser360Entry;
}) {
  useEffect(() => {
    if (entry !== "registration") return;
    const el = document.getElementById("user-360-registration");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [entry]);
  return (
    <div id="user-360-registration" className="sr-only scroll-mt-24" aria-hidden />
  );
}

/**
 * Applicant Details — fields left, university card preview right.
 */
export function AdminUserApplicantPanel({
  initialDetail,
}: {
  initialDetail: SignupRequestDetail;
}) {
  const [cardOpen, setCardOpen] = useState(false);
  const detail = useSignupDetail(initialDetail);
  const cardMedia = resolveUniversityCard(detail.universityCard);

  return (
    <AdminSurfacePanel>
      <TicketSectionHeader
        variant="light"
        icon={<IdCard className="size-5" aria-hidden />}
        title="Applicant Details"
        subtitle="Identity, role, and registration"
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_minmax(10rem,12rem)]">
        <dl className="space-y-4 text-sm">
          <div className="space-y-1">
            <dt className={FIELD_LABEL_ROW}>
              <UserIcon className="size-3.5 shrink-0" aria-hidden />
              Name
            </dt>
            <dd>
              <CopyableText
                value={detail.fullName}
                label="name"
                className="text-sm text-gray-900"
              />
            </dd>
          </div>
          <div className="space-y-1">
            <dt className={FIELD_LABEL_ROW}>
              <Mail className="size-3.5 shrink-0" aria-hidden />
              Email
            </dt>
            <dd>
              <CopyableText
                value={detail.email}
                label="email"
                className="text-sm text-gray-900"
              />
            </dd>
          </div>
          <div className="space-y-1">
            <dt className={FIELD_LABEL_ROW}>
              <GraduationCap className="size-3.5 shrink-0" aria-hidden />
              University ID
            </dt>
            <dd>
              <CopyableText
                value={String(detail.universityId)}
                label="university ID"
                className="text-sm"
              />
            </dd>
          </div>
          <div className="space-y-1">
            <dt className={FIELD_LABEL_ROW}>
              <Calendar className="size-3.5 shrink-0" aria-hidden />
              Registered
            </dt>
            <dd className="text-sm text-gray-700">
              {formatMediumDateTime(detail.createdAt)}
            </dd>
          </div>
        </dl>

        <div className="space-y-4">
          <div className="space-y-1">
            <p className={FIELD_LABEL_ROW}>
              <UserIcon className="size-3.5 shrink-0" aria-hidden />
              Role
            </p>
            {/* Block wrapper: badge on its own line (not beside label) */}
            <div>
              <UserRoleBadge role={detail.role ?? "USER"} />
            </div>
          </div>
          <div className="space-y-2">
            <p className={FIELD_LABEL_ROW}>
              <Shield className="size-3.5 shrink-0" aria-hidden />
              University card
            </p>
            {cardMedia.kind !== "empty" ? (
              <Dialog open={cardOpen} onOpenChange={setCardOpen}>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="group relative aspect-[4/3] w-full cursor-pointer overflow-hidden rounded-lg border border-gray-200 transition-colors hover:border-blue-300"
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
              <AdminDetailEmptyState
                message="No university card uploaded yet."
                className="min-h-24 rounded-lg border border-gray-200 bg-gray-50"
              />
            )}
          </div>
        </div>
      </div>
    </AdminSurfacePanel>
  );
}

/**
 * Signup Decision Timeline — Approved/Rejected ledger counts in subtitle.
 */
export function AdminUserSignupTimelinePanel({
  initialDetail,
}: {
  initialDetail: SignupRequestDetail;
}) {
  const detail = useSignupDetail(initialDetail);
  const approvedCount = detail.decisions.filter(
    (d) => d.status === "APPROVED",
  ).length;
  const rejectedCount = detail.decisions.filter(
    (d) => d.status === "REJECTED",
  ).length;

  return (
    <AdminSurfacePanel>
      <TicketSectionHeader
        variant="light"
        icon={<ListOrdered className="size-5" aria-hidden />}
        title="Signup Decision Timeline"
        subtitle={`Approved · ${approvedCount} · Rejected · ${rejectedCount} · Registration ledger`}
      />
      {detail.decisions.length === 0 ? (
        <AdminDetailEmptyState message="No signup decisions for this user yet." />
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
  );
}
