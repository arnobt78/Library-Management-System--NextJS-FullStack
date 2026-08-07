"use client";

/**
 * /make-admin applicant workflow:
 * submit → PENDING (locked textarea, cancel request) → admin approve/reject
 * or self-withdraw → REJECTED/withdrawn → resubmit.
 * Glass CTAs + shared ripple; admin-request.write invalidation via mutations.
 */

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
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
import AdminRequestReviewerAttribution from "@/components/AdminRequestReviewerAttribution";
import {
  useCancelMyAdminRequest,
  useCreateAdminRequest,
} from "@/hooks/useMutations";
import {
  ADMIN_REQUEST_REVOKED_REASON,
  ADMIN_REQUEST_WITHDRAWN_REASON,
} from "@/lib/admin/adminRequestConstants";
import type {
  AdminRequestReviewer,
  SignupApprovalInfo,
} from "@/lib/admin/adminRequestTypes";
import type { MyAdminRequestStatus } from "@/lib/admin/myAdminRequest";
import { formatBorrowDateTime } from "@/lib/profile/formatBorrowDates";
import { withRippleClick } from "@/lib/ui/ripple";
import { isProtectedDemoAccount } from "@/constants";
import {
  BookOpen,
  Bookmark,
  CheckCircle2,
  Eraser,
  Hourglass,
  Info,
  LayoutDashboard,
  Loader2,
  type LucideIcon,
  Shield,
  ShieldOff,
  User,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";

const ACCESS_BENEFITS: { label: string; icon: LucideIcon; glow: string }[] = [
  {
    label: "Admin Dashboard",
    icon: LayoutDashboard,
    glow: "shadow-[0_8px_24px_rgba(59,130,246,0.28)]",
  },
  {
    label: "User Management",
    icon: Users,
    glow: "shadow-[0_8px_24px_rgba(139,92,246,0.28)]",
  },
  {
    label: "Book Management",
    icon: BookOpen,
    glow: "shadow-[0_8px_24px_rgba(245,158,11,0.28)]",
  },
  {
    label: "Borrow Requests",
    icon: Bookmark,
    glow: "shadow-[0_8px_24px_rgba(34,197,94,0.25)]",
  },
  {
    label: "Sign-up Requests",
    icon: UserPlus,
    glow: "shadow-[0_8px_24px_rgba(236,72,153,0.25)]",
  },
];

const QUOTE_MAX = 160;

function truncateQuote(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= QUOTE_MAX) return trimmed;
  return `${trimmed.slice(0, QUOTE_MAX - 1)}…`;
}

type MakeAdminRequestFormProps = {
  userEmail: string;
  userRole: "USER" | "ADMIN";
  initialStatus: MyAdminRequestStatus | null;
  initialRequestId?: string | null;
  initialRequestReason?: string | null;
  initialRejectionReason?: string | null;
  initialReviewer?: AdminRequestReviewer | null;
  /** Request submitted at (createdAt) */
  initialCreatedAt?: Date | string | null;
  /** Approved / rejected / withdrawn at (reviewedAt) */
  initialReviewedAt?: Date | string | null;
  /** Library registration approval strip (who/when) */
  signupApproval?: SignupApprovalInfo | null;
};

function formatRequestWhen(
  value: Date | string | null | undefined,
): string | null {
  if (value == null) return null;
  return formatBorrowDateTime(value) ?? null;
}

function RoleBadge({ role }: { role: "USER" | "ADMIN" }) {
  if (role === "ADMIN") {
    return (
      <Badge variant="glassReturned">
        <Shield className="size-3" />
        Admin
      </Badge>
    );
  }
  return (
    <Badge variant="glassMuted">
      <User className="size-3" />
      User
    </Badge>
  );
}

function RequestStatusBadge({
  status,
  rejectionReason,
}: {
  status: MyAdminRequestStatus | null;
  rejectionReason: string | null;
}) {
  const withdrawn =
    status === "REJECTED" && rejectionReason === ADMIN_REQUEST_WITHDRAWN_REASON;

  if (status === "PENDING") {
    return (
      <Badge variant="glassPending">
        <Hourglass className="size-3" />
        Pending review
      </Badge>
    );
  }
  if (status === "APPROVED") {
    return (
      <Badge variant="glassReturned">
        <CheckCircle2 className="size-3" />
        Approved
      </Badge>
    );
  }
  if (withdrawn) {
    return (
      <Badge variant="glassMuted">
        <ShieldOff className="size-3" />
        Withdrawn
      </Badge>
    );
  }
  if (status === "REJECTED") {
    return (
      <Badge
        variant="glassMuted"
        className="border-red-400/40 from-red-500/25 via-red-500/10 to-red-500/5"
      >
        <XCircle className="size-3" />
        Rejected
      </Badge>
    );
  }
  return (
    <Badge variant="glassMuted">
      <ShieldOff className="size-3" />
      Not requested
    </Badge>
  );
}

export default function MakeAdminRequestForm({
  userEmail,
  userRole,
  initialStatus,
  initialRequestId = null,
  initialRequestReason = null,
  initialRejectionReason = null,
  initialReviewer = null,
  initialCreatedAt = null,
  initialReviewedAt = null,
  signupApproval = null,
}: MakeAdminRequestFormProps) {
  const [reason, setReason] = useState(
    initialStatus === "PENDING" ? (initialRequestReason ?? "") : "",
  );
  const [status, setStatus] = useState<MyAdminRequestStatus | null>(
    initialStatus,
  );
  const [requestId, setRequestId] = useState<string | null>(initialRequestId);
  const [rejectionReason, setRejectionReason] = useState<string | null>(
    initialRejectionReason,
  );
  /** Last submitted reason for admin-reject quote (form field may be cleared). */
  const [lastRequestReason, setLastRequestReason] = useState<string | null>(
    initialRequestReason,
  );
  const [reviewer] = useState<AdminRequestReviewer | null>(initialReviewer);
  const [createdAt, setCreatedAt] = useState<Date | string | null>(
    initialCreatedAt,
  );
  const [reviewedAt, setReviewedAt] = useState<Date | string | null>(
    initialReviewedAt,
  );
  const [cancelOpen, setCancelOpen] = useState(false);

  const createMutation = useCreateAdminRequest();
  const cancelMutation = useCancelMyAdminRequest();
  const isSubmitting = createMutation.isPending;
  const isCancelling = cancelMutation.isPending;
  const isBusy = isSubmitting || isCancelling;

  const isPendingStatus = status === "PENDING";
  // APPROVED banner/lock only while the account still holds ADMIN (demotion unlocks re-apply).
  const privilegesActive = userRole === "ADMIN" && status === "APPROVED";
  const canEdit = !isPendingStatus && !privilegesActive;
  const hasText = reason.trim().length > 0;
  const reasonOk = reason.trim().length >= 10;
  const withdrawn =
    status === "REJECTED" && rejectionReason === ADMIN_REQUEST_WITHDRAWN_REASON;
  const revoked =
    status === "REJECTED" && rejectionReason === ADMIN_REQUEST_REVOKED_REASON;
  const isShowcaseDemo =
    userRole === "USER" && isProtectedDemoAccount({ email: userEmail });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !reasonOk || isBusy) return;

    const submitted = reason.trim();
    createMutation.mutate(
      { requestReason: submitted, userEmail },
      {
        onSuccess: (result) => {
          setStatus("PENDING");
          setRequestId(result.data?.id ?? null);
          setRejectionReason(null);
          setLastRequestReason(submitted);
          setCreatedAt(result.data?.createdAt ?? new Date());
          setReviewedAt(null);
        },
      },
    );
  };

  const handleClear = () => {
    if (isBusy || isPendingStatus) return;
    setReason("");
  };

  const handleCancelRequest = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!requestId || isBusy) return;

    cancelMutation.mutate(
      { requestId },
      {
        onSuccess: (result) => {
          setCancelOpen(false);
          setStatus("REJECTED");
          setRejectionReason(ADMIN_REQUEST_WITHDRAWN_REASON);
          setReason("");
          setRequestId(null);
          setReviewedAt(result.data?.reviewedAt ?? new Date());
          if (result.data?.createdAt) setCreatedAt(result.data.createdAt);
        },
      },
    );
  };

  const rejectedQuote = lastRequestReason?.trim() || "";
  const submittedLabel = formatRequestWhen(createdAt);
  const reviewedLabel = formatRequestWhen(reviewedAt);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Left: email + role · Right: request status (justify-between) */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="text-xs text-light-200 sm:text-sm">
            <span className="text-light-100/70">Current user: </span>
            <span className="break-all text-light-100">{userEmail}</span>
          </p>
          <RoleBadge role={userRole} />
        </div>
        <RequestStatusBadge status={status} rejectionReason={rejectionReason} />
      </div>

      {signupApproval ? (
        <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-light-200 sm:text-sm">
          <p className="font-medium text-light-100">Account registration</p>
          {signupApproval.accountCreatedAt ? (
            <p>
              Created on{" "}
              {formatRequestWhen(signupApproval.accountCreatedAt) ?? "N/A"}
            </p>
          ) : null}
          {(signupApproval.accountDecidedAt ??
          signupApproval.accountApprovedAt) ? (
            <p>
              Approved as library user on{" "}
              {formatRequestWhen(
                signupApproval.accountDecidedAt ??
                  signupApproval.accountApprovedAt,
              ) ?? "N/A"}
            </p>
          ) : null}
          <AdminRequestReviewerAttribution
            reviewer={signupApproval.decisionActor ?? signupApproval.approver}
            prefix="Approved by"
            size={28}
            variant="dark"
            className="text-light-200"
            textClassName="text-xs sm:text-sm text-light-100"
          />
        </div>
      ) : null}

      {isShowcaseDemo ? (
        <p className="flex items-start gap-2 text-xs leading-snug text-light-200 sm:text-sm">
          <Info className="size-3.5 shrink-0 sm:size-4" aria-hidden />
          <span>
            Showcase account: you can submit or cancel requests for demo, but
            admins cannot approve a role change for this account.
          </span>
        </p>
      ) : null}

      {isPendingStatus && (
        <div className="space-y-1 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-200 sm:text-sm">
          <p>
            Your request is awaiting admin review. You can withdraw it below
            while it is still pending.
          </p>
          {submittedLabel ? (
            <p className="text-amber-200/80">Submitted on {submittedLabel}</p>
          ) : null}
        </div>
      )}

      {status === "REJECTED" && !withdrawn && (
        <div className="space-y-2 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2.5 text-xs text-red-200 sm:text-sm">
          {revoked ? (
            <p>Your admin privileges were removed.</p>
          ) : rejectedQuote ? (
            <p>
              Based on your request{" "}
              <span className="font-medium text-red-100" title={rejectedQuote}>
                &ldquo;{truncateQuote(rejectedQuote)}&rdquo;
              </span>
            </p>
          ) : (
            <p>Your previous request was rejected.</p>
          )}
          <AdminRequestReviewerAttribution
            reviewer={reviewer}
            prefix={revoked ? "Removed by" : "Rejected by"}
            size={28}
            variant="dark"
            textClassName="text-xs sm:text-sm text-red-100"
            className="text-red-200/90"
          />
          {rejectionReason ? (
            <p className="text-red-200/90">Reason: {rejectionReason}</p>
          ) : null}
          {(submittedLabel || reviewedLabel) && (
            <p className="text-red-200/80">
              {submittedLabel ? `Submitted on ${submittedLabel}` : null}
              {submittedLabel && reviewedLabel ? " · " : null}
              {reviewedLabel
                ? revoked
                  ? `Removed on ${reviewedLabel}`
                  : `Rejected on ${reviewedLabel}`
                : null}
            </p>
          )}
          <p className="text-red-200/80">You may submit a new request below.</p>
        </div>
      )}

      {withdrawn && (
        <div className="space-y-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-light-200 sm:text-sm">
          <p>You withdrew your last request. You can submit a new one below.</p>
          {(submittedLabel || reviewedLabel) && (
            <p className="text-light-200/80">
              {submittedLabel ? `Submitted on ${submittedLabel}` : null}
              {submittedLabel && reviewedLabel ? " · " : null}
              {reviewedLabel ? `Withdrawn on ${reviewedLabel}` : null}
            </p>
          )}
        </div>
      )}

      {privilegesActive && (
        <div className="space-y-2 rounded-xl border border-green-400/30 bg-green-500/10 px-3 py-2.5 text-xs text-green-200 sm:text-sm">
          <p>Your admin request was approved.</p>
          <AdminRequestReviewerAttribution
            reviewer={reviewer}
            prefix="Approved by"
            size={28}
            variant="dark"
            textClassName="text-xs sm:text-sm text-green-100"
            className="text-green-200/90"
          />
          {(submittedLabel || reviewedLabel) && (
            <p className="text-green-200/80">
              {submittedLabel ? `Submitted on ${submittedLabel}` : null}
              {submittedLabel && reviewedLabel ? " · " : null}
              {reviewedLabel ? `Approved on ${reviewedLabel}` : null}
            </p>
          )}
        </div>
      )}

      {(canEdit || isPendingStatus) && (
        <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-4">
          <div>
            <label
              htmlFor="requestReason"
              className="mb-1.5 block text-xs font-medium text-light-200 sm:mb-2 sm:text-sm"
            >
              Why do you need admin access?
            </label>
            <textarea
              id="requestReason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              disabled={isBusy || isPendingStatus}
              readOnly={isPendingStatus}
              maxLength={1000}
              className="w-full resize-none rounded-md border border-white/10 bg-dark-300/50 px-2.5 py-1.5 text-xs text-light-100 placeholder:text-light-200/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60 sm:px-3 sm:py-2 sm:text-sm"
              placeholder="Please explain why you need admin access and how you plan to use it responsibly..."
              required={canEdit}
              minLength={10}
            />
            {!isPendingStatus && (
              <p className="mt-1 text-[10px] text-light-200/70 sm:text-xs">
                {reason.trim().length}/1000 · minimum 10 characters
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 px-0 sm:px-1">
            {isPendingStatus ? (
              <button
                type="button"
                disabled={isBusy || !requestId}
                onClick={withRippleClick(
                  () => setCancelOpen(true),
                  isBusy || !requestId,
                )}
                className="profile-action-btn profile-action-btn--cancel-request"
              >
                {isCancelling ? (
                  <Loader2 className="size-3.5 animate-spin sm:size-4" />
                ) : (
                  <XCircle className="size-3.5 sm:size-4" />
                )}
                {isCancelling ? "Cancelling…" : "Cancel request"}
              </button>
            ) : (
              <>
                {hasText ? (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={withRippleClick(handleClear, isBusy)}
                    className="profile-action-btn profile-action-btn--clear"
                  >
                    <Eraser className="size-3.5 sm:size-4" />
                    Clear
                  </button>
                ) : null}
                <button
                  type="submit"
                  disabled={isBusy || !reasonOk}
                  onClick={withRippleClick(undefined, isBusy || !reasonOk)}
                  className="profile-action-btn profile-action-btn--submit"
                >
                  {isSubmitting ? (
                    <Loader2 className="size-3.5 animate-spin sm:size-4" />
                  ) : (
                    <Shield className="size-3.5 sm:size-4" />
                  )}
                  {isSubmitting ? "Submitting…" : "Submit request"}
                </button>
              </>
            )}
          </div>
        </form>
      )}

      <AlertDialog
        open={cancelOpen}
        onOpenChange={(open) => {
          if (isCancelling) return;
          setCancelOpen(open);
        }}
      >
        <AlertDialogContent className="border-gray-600 bg-gray-800/95">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-light-100">
              Cancel your admin request?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-light-200">
              This withdraws your pending request. You can submit a new one
              afterward.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isCancelling}
              className="border-gray-500 bg-gray-600 text-white hover:bg-gray-500 hover:text-white"
            >
              Keep pending
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelRequest}
              disabled={isCancelling}
              className="gap-1.5 bg-red-600 text-white hover:bg-red-700"
            >
              {isCancelling ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <XCircle className="size-4" />
              )}
              {isCancelling ? "Cancelling…" : "Withdraw request"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="border-t border-white/10 pt-3 sm:pt-4">
        <p className="text-xs text-light-200/70 sm:text-sm">
          After approval, you&apos;ll be able to access:
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {ACCESS_BENEFITS.map(({ label, icon: Icon, glow }) => (
            <span
              key={label}
              className={`inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-dark-300/60 px-2.5 py-1.5 text-[11px] font-medium text-light-100 backdrop-blur-sm sm:text-xs ${glow}`}
            >
              <Icon
                className="size-3.5 shrink-0 text-primary sm:size-4"
                aria-hidden
              />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
