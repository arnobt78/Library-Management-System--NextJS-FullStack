"use client";

/**
 * Sign-up request detail — applicant profile, decision timeline, approve/reject.
 * Route: /admin/account-requests/[userId]
 */

import { useState } from "react";
import PrefetchLink from "@/components/PrefetchLink";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  ClipboardList,
  Eye,
  GraduationCap,
  Loader2,
  Mail,
  Shield,
  User,
  XCircle,
} from "lucide-react";
import { Image as ImageKitImage } from "@imagekit/next";
import PersonAttribution from "@/components/PersonAttribution";
import AdminRequestReviewerAttribution from "@/components/AdminRequestReviewerAttribution";
import { CopyButton } from "@/components/CopyButton";
import { Button } from "@/components/ui/button";
import { SafeImage } from "@/components/ui/safe-image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { AdminSurfacePanel } from "@/components/admin/AdminSurfacePanel";
import { DetailKpiShell } from "@/components/admin/DetailKpiShell";
import { useBackWithRefresh } from "@/hooks/useBackWithRefresh";
import { useSignupRequestDetail } from "@/hooks/useQueries";
import { useApproveUser, useRejectUser } from "@/hooks/useMutations";
import type { SignupRequestDetail } from "@/lib/admin/signupStatusDecisions";
import type { AdminRequestReviewer } from "@/lib/admin/adminRequestTypes";
import { AccountStatusBadge } from "@/lib/ui/semanticBadges";
import { formatMediumDateTime } from "@/lib/ui/formatMediumDate";
import { LIGHT_GLASS_CTA } from "@/lib/ui/glassActionChrome";
import { SKY_LINK_LIGHT } from "@/lib/ui/skyLinkStyles";
import { resolveUniversityCard } from "@/lib/media/universityCard";
import config from "@/lib/config";
import { cn } from "@/lib/utils";

interface SignupRequestDetailClientProps {
  initialDetail: SignupRequestDetail;
  currentAdmin: AdminRequestReviewer;
}

export default function SignupRequestDetailClient({
  initialDetail,
  currentAdmin,
}: SignupRequestDetailClientProps) {
  const { data: session } = useSession();
  const handleBack = useBackWithRefresh("user.write", "/admin/account-requests");
  const [cardOpen, setCardOpen] = useState(false);
  // Stable SSR stamp — densify still wins via setQueryData on signupRequestDetail.
  const [ssrUpdatedAt] = useState(() => Date.now());
  const { data: detail = initialDetail } = useSignupRequestDetail(
    initialDetail.id,
    initialDetail,
    ssrUpdatedAt,
  );

  const approveMutation = useApproveUser();
  const rejectMutation = useRejectUser();

  const cardMedia = resolveUniversityCard(detail.universityCard);
  const isPending = detail.status === "PENDING";
  const actionsBusy = approveMutation.isPending || rejectMutation.isPending;

  const decisionActor: AdminRequestReviewer | null =
    currentAdmin?.email
      ? {
          id: currentAdmin.id,
          fullName: currentAdmin.fullName,
          email: currentAdmin.email,
          universityCard: currentAdmin.universityCard,
        }
      : (() => {
          const su = session?.user as
            | { id?: string; name?: string | null; email?: string | null }
            | undefined;
          if (!su?.email || !(su.name || su.email)) return null;
          return {
            id: su.id ?? null,
            fullName: su.name?.trim() || "Admin",
            email: su.email,
            universityCard: null,
          };
        })();

  const handleApprove = () => {
    approveMutation.mutate({
      userId: detail.id,
      userName: detail.fullName,
      decisionActor,
    });
  };

  const handleReject = () => {
    rejectMutation.mutate({
      userId: detail.id,
      userName: detail.fullName,
      decisionActor,
    });
  };

  const approvedCount = detail.decisions.filter(
    (d) => d.status === "APPROVED",
  ).length;
  const rejectedCount = detail.decisions.filter(
    (d) => d.status === "REJECTED",
  ).length;

  return (
    <AdminPageShell
      header={
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              className="gap-1.5 px-2 text-gray-600 hover:text-gray-900"
              onClick={handleBack}
            >
              <ArrowLeft className="size-4" />
              Back to queue
            </Button>
            <PrefetchLink
              prefetch={false}
              href={`/admin/users/${detail.id}`}
              className={cn("text-sm font-medium", SKY_LINK_LIGHT)}
            >
              Open User 360 →
            </PrefetchLink>
          </div>
          <div className="space-y-2">
            <AdminPageHeader
              title="Sign-up request"
              description="Registration queue applicant review"
              icon={ClipboardList}
              className="mb-0"
            />
            <PersonAttribution
              person={{
                id: detail.id,
                fullName: detail.fullName,
                email: detail.email,
                universityCard: detail.universityCard,
              }}
              size={36}
            />
          </div>
        </div>
      }
      kpis={
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DetailKpiShell
            variant="light"
            icon={<Clock className="size-4" />}
            label="Status"
            hint="Current registration status"
          >
            <AccountStatusBadge status={detail.status ?? "PENDING"} />
          </DetailKpiShell>
          <DetailKpiShell
            variant="light"
            icon={<Calendar className="size-4" />}
            label="Registered"
            hint="Account created"
          >
            <span className="text-sm font-medium text-gray-900">
              {formatMediumDateTime(detail.createdAt)}
            </span>
          </DetailKpiShell>
          <DetailKpiShell
            variant="light"
            icon={<CheckCircle className="size-4 text-emerald-600" />}
            label="Approvals"
            hint="Ledger entries"
          >
            <span className="text-2xl font-semibold text-gray-900">
              {approvedCount}
            </span>
          </DetailKpiShell>
          <DetailKpiShell
            variant="light"
            icon={<XCircle className="size-4 text-rose-600" />}
            label="Rejections"
            hint="Ledger entries"
          >
            <span className="text-2xl font-semibold text-gray-900">
              {rejectedCount}
            </span>
          </DetailKpiShell>
        </div>
      }
    >
      <div className="space-y-4 sm:space-y-6">
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
                <dd className="font-medium text-gray-900">
                  {detail.universityId}
                </dd>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <dt className="flex items-center gap-1.5 text-gray-500">
                  <User className="size-3.5" aria-hidden />
                  Role
                </dt>
                <dd className="font-medium text-gray-900">
                  {detail.role ?? "USER"}
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
              Decision timeline ({detail.decisions.length})
            </h2>
            {detail.decisions.length === 0 ? (
              <p className="text-sm text-gray-500">
                No decisions recorded yet.
              </p>
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
                        prefix={
                          approved ? "Approved by" : "Rejected by"
                        }
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

        {isPending ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className={cn(LIGHT_GLASS_CTA, "gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700")}
              onClick={handleApprove}
              disabled={actionsBusy}
            >
              {approveMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle className="size-4" />
              )}
              {approveMutation.isPending ? "Approving…" : "Approve Student"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="gap-1.5"
              onClick={handleReject}
              disabled={actionsBusy}
            >
              {rejectMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <XCircle className="size-4" />
              )}
              {rejectMutation.isPending ? "Rejecting…" : "Reject"}
            </Button>
          </div>
        ) : null}
      </div>
    </AdminPageShell>
  );
}
