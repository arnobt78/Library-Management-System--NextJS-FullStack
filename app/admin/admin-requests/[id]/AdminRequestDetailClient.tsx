"use client";

/**
 * Admin Request detail — make-admin privilege application review.
 * Route: /admin/admin-requests/[id]
 */

import { useState } from "react";
import PrefetchLink from "@/components/PrefetchLink";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  Eye,
  FileText,
  Loader2,
  Lock,
  Shield,
  User,
  XCircle,
} from "lucide-react";
import { Image as ImageKitImage } from "@imagekit/next";
import PersonAttribution from "@/components/PersonAttribution";
import AdminRequestReviewerAttribution from "@/components/AdminRequestReviewerAttribution";
import AdminRequestDeclineDialog from "@/components/admin/AdminRequestDeclineDialog";
import DateMetaLine from "@/components/DateMetaLine";
import { Button } from "@/components/ui/button";
import { SafeImage } from "@/components/ui/safe-image";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { useAdminRequestDetail } from "@/hooks/useQueries";
import {
  useApproveAdminRequest,
  useRejectAdminRequest,
} from "@/hooks/useMutations";
import type { AdminRequest } from "@/lib/services/users";
import type { AdminRequestReviewer } from "@/lib/admin/adminRequestTypes";
import { ADMIN_REQUEST_WITHDRAWN_REASON } from "@/lib/admin/adminRequestConstants";
import { formatMediumDateTime } from "@/lib/ui/formatMediumDate";
import { LIGHT_GLASS_CTA } from "@/lib/ui/glassActionChrome";
import { SKY_LINK_LIGHT } from "@/lib/ui/skyLinkStyles";
import { resolveUniversityCard } from "@/lib/media/universityCard";
import { isProtectedDemoAccount } from "@/constants";
import config from "@/lib/config";
import { cn } from "@/lib/utils";

function isWithdrawnDecision(request: AdminRequest): boolean {
  return (
    request.status === "REJECTED" &&
    request.rejectionReason === ADMIN_REQUEST_WITHDRAWN_REASON
  );
}

function decisionStatusLabel(request: AdminRequest): string {
  if (request.status === "PENDING") return "Pending";
  if (isWithdrawnDecision(request)) return "Withdrawn";
  if (request.status === "APPROVED") return "Approved";
  return "Rejected";
}

function AdminRequestStatusBadge({ request }: { request: AdminRequest }) {
  const withdrawn = isWithdrawnDecision(request);
  const approved = request.status === "APPROVED";
  const pending = request.status === "PENDING";
  const badgeClass = pending
    ? "bg-amber-100 text-amber-800"
    : withdrawn
      ? "bg-gray-200 text-gray-800"
      : approved
        ? "bg-green-100 text-green-800"
        : "bg-red-100 text-red-800";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium sm:text-sm",
        badgeClass,
      )}
    >
      {pending ? (
        <Clock className="size-3" aria-hidden />
      ) : approved ? (
        <CheckCircle className="size-3" aria-hidden />
      ) : (
        <XCircle className="size-3" aria-hidden />
      )}
      {decisionStatusLabel(request)}
    </span>
  );
}

interface AdminRequestDetailClientProps {
  initialRequest: AdminRequest;
  /** SSR DB actor for approve/reject densify (preferred over useSession). */
  currentAdmin?: AdminRequestReviewer | null;
}

export default function AdminRequestDetailClient({
  initialRequest,
  currentAdmin = null,
}: AdminRequestDetailClientProps) {
  const { data: session } = useSession();
  const handleBack = useBackWithRefresh(
    "admin-request.write",
    "/admin/admin-requests",
  );
  // Stable SSR stamp — avoids impure Date.now() during render; densify still
  // wins via setQueryData on queryKeys.admin.requestDetail after decisions.
  const [ssrUpdatedAt] = useState(() => Date.now());
  const { data: request = initialRequest } = useAdminRequestDetail(
    initialRequest.id,
    initialRequest,
    ssrUpdatedAt,
  );

  const [approveOpen, setApproveOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);

  const approveMutation = useApproveAdminRequest();
  const rejectMutation = useRejectAdminRequest();

  const isPending = request.status === "PENDING";
  const demoLocked = isProtectedDemoAccount({ email: request.userEmail });
  const actionsBusy = approveMutation.isPending || rejectMutation.isPending;
  const cardMedia = resolveUniversityCard(request.userUniversityCard);

  const decisionActor: AdminRequestReviewer | undefined = currentAdmin
    ? {
        id: currentAdmin.id,
        fullName: currentAdmin.fullName,
        email: currentAdmin.email,
        universityCard: currentAdmin.universityCard,
      }
    : session?.user
      ? {
          id: session.user.id,
          fullName: session.user.name || "Admin",
          email: session.user.email || "",
          universityCard:
            (session.user as { universityCard?: string | null })
              .universityCard ?? null,
        }
      : undefined;

  const handleConfirmApprove = () => {
    approveMutation.mutate(
      {
        requestId: request.id,
        userName: request.userFullName,
        decisionActor,
      },
      { onSuccess: () => setApproveOpen(false) },
    );
  };

  const handleConfirmDecline = (rejectionReason: string) => {
    rejectMutation.mutate(
      {
        requestId: request.id,
        rejectionReason,
        userName: request.userFullName,
        decisionActor,
      },
      { onSuccess: () => setDeclineOpen(false) },
    );
  };

  const reviewerPrefix = isWithdrawnDecision(request)
    ? "Withdrawn by"
    : request.status === "APPROVED"
      ? "Approved by"
      : "Rejected by";

  return (
    <>
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
                Back to Admin Requests
              </Button>
              <PrefetchLink
                prefetch={false}
                href={`/admin/users/${request.userId}`}
                className={cn("text-sm font-medium", SKY_LINK_LIGHT)}
              >
                Open User 360 →
              </PrefetchLink>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <AdminPageHeader
                title={request.userFullName}
                description="Make-admin privilege request"
                icon={Shield}
                className="mb-0 flex-1"
              />
              <AdminRequestStatusBadge request={request} />
            </div>
          </div>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <DetailKpiShell
            variant="light"
            icon={<Clock className="size-4" />}
            label="Status"
            hint="Current request state"
          >
            <AdminRequestStatusBadge request={request} />
          </DetailKpiShell>
          <DetailKpiShell
            variant="light"
            icon={<Calendar className="size-4" />}
            label="Requested"
            hint="When the application was submitted"
          >
            <span className="text-sm font-medium text-gray-900">
              {formatMediumDateTime(request.createdAt)}
            </span>
          </DetailKpiShell>
          <DetailKpiShell
            variant="light"
            icon={<User className="size-4" />}
            label="Applicant"
            hint="Profile link opens User 360"
          >
            <PersonAttribution
              person={{
                id: request.userId,
                fullName: request.userFullName,
                email: request.userEmail,
                universityCard: request.userUniversityCard ?? null,
              }}
              href={`/admin/users/${request.userId}`}
              size={32}
              layout="stack"
              variant="light"
            />
          </DetailKpiShell>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <AdminSurfacePanel>
            <h2 className="mb-3 text-base font-medium text-dark-400 sm:text-lg">
              Request details
            </h2>
            <div className="space-y-4 text-sm">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Request reason
                </p>
                <p className="whitespace-pre-wrap leading-relaxed text-gray-800">
                  {request.requestReason}
                </p>
              </div>

              {request.status === "REJECTED" && request.rejectionReason ? (
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    {isWithdrawnDecision(request)
                      ? "Withdrawal note"
                      : "Rejection reason"}
                  </p>
                  <p className="whitespace-pre-wrap leading-relaxed text-rose-800">
                    {request.rejectionReason}
                  </p>
                </div>
              ) : null}

              <div className="space-y-2 border-t border-gray-100 pt-3">
                <DateMetaLine icon={Calendar} className="text-gray-600">
                  Requested {formatMediumDateTime(request.createdAt)}
                </DateMetaLine>
                {request.reviewedAt ? (
                  <DateMetaLine icon={Clock} className="text-gray-600">
                    Reviewed {formatMediumDateTime(request.reviewedAt)}
                  </DateMetaLine>
                ) : null}
              </div>

              {request.reviewer && request.status !== "PENDING" ? (
                <div className="space-y-1 border-t border-gray-100 pt-3">
                  <AdminRequestReviewerAttribution
                    reviewer={request.reviewer}
                    prefix={reviewerPrefix}
                    size={32}
                    href={
                      request.reviewer.id
                        ? `/admin/users/${request.reviewer.id}`
                        : null
                    }
                  />
                </div>
              ) : null}
            </div>
          </AdminSurfacePanel>

          <AdminSurfacePanel>
            <h2 className="mb-3 flex items-center gap-2 text-base font-medium text-dark-400 sm:text-lg">
              <FileText className="size-4" aria-hidden />
              University card
            </h2>
            {cardMedia.kind !== "empty" ? (
              <Dialog open={cardOpen} onOpenChange={setCardOpen}>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="group relative h-40 w-full max-w-sm cursor-pointer overflow-hidden rounded-lg border border-gray-200 transition-colors hover:border-blue-300"
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
                        sizes="320px"
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
                      University card — {request.userFullName}
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
              <div className="flex h-40 w-full max-w-sm items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
                <p className="text-xs text-gray-500">No card uploaded</p>
              </div>
            )}
          </AdminSurfacePanel>
        </div>

        {isPending ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className={cn(
                LIGHT_GLASS_CTA.host,
                "gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700",
              )}
              onClick={() => setApproveOpen(true)}
              disabled={actionsBusy || demoLocked}
              title={demoLocked ? "Demo account — role locked" : undefined}
            >
              {demoLocked ? (
                <Lock className="size-4" aria-hidden />
              ) : approveMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle className="size-4" />
              )}
              {approveMutation.isPending ? "Promoting…" : "Approve"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="gap-1.5"
              onClick={() => setDeclineOpen(true)}
              disabled={actionsBusy}
            >
              {rejectMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <XCircle className="size-4" />
              )}
              {rejectMutation.isPending ? "Declining…" : "Decline"}
            </Button>
          </div>
        ) : null}
      </AdminPageShell>

      <AlertDialog
        open={approveOpen}
        onOpenChange={(open) => {
          if (approveMutation.isPending) return;
          setApproveOpen(open);
        }}
      >
        <AlertDialogContent className="border-gray-600 bg-gray-800/95">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-light-100">
              Promote to admin?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-light-200">
              Grant administrator privileges to{" "}
              <span className="font-medium text-light-100">
                {request.userFullName}
              </span>
              {request.userEmail ? ` (${request.userEmail})` : ""}? They will
              be able to manage users, books, and borrow requests.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={approveMutation.isPending}
              className="border-gray-500 bg-gray-600 text-white hover:bg-gray-500 hover:text-white"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmApprove();
              }}
              disabled={approveMutation.isPending || demoLocked}
              className="gap-1.5 bg-green-600 text-white hover:bg-green-700"
            >
              {approveMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle className="size-4" />
              )}
              {approveMutation.isPending ? "Promoting…" : "Promote to admin"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AdminRequestDeclineDialog
        key={request.id}
        open={declineOpen}
        applicantName={request.userFullName}
        applicantEmail={request.userEmail}
        isPending={rejectMutation.isPending}
        onOpenChange={setDeclineOpen}
        onConfirm={handleConfirmDecline}
      />
    </>
  );
}
