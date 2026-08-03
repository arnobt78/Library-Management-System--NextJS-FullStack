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
import {
  useCancelMyAdminRequest,
  useCreateAdminRequest,
} from "@/hooks/useMutations";
import { ADMIN_REQUEST_WITHDRAWN_REASON } from "@/lib/admin/adminRequestConstants";
import type { MyAdminRequestStatus } from "@/lib/admin/myAdminRequest";
import { withRippleClick } from "@/lib/ui/ripple";
import {
  CheckCircle2,
  Eraser,
  Hourglass,
  Loader2,
  Shield,
  ShieldOff,
  User,
  XCircle,
} from "lucide-react";

type MakeAdminRequestFormProps = {
  userEmail: string;
  userRole: "USER" | "ADMIN";
  initialStatus: MyAdminRequestStatus | null;
  initialRequestId?: string | null;
  initialRequestReason?: string | null;
  initialRejectionReason?: string | null;
};

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
    status === "REJECTED" &&
    rejectionReason === ADMIN_REQUEST_WITHDRAWN_REASON;

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
}: MakeAdminRequestFormProps) {
  const [reason, setReason] = useState(
    initialStatus === "PENDING" ? (initialRequestReason ?? "") : "",
  );
  const [status, setStatus] = useState<MyAdminRequestStatus | null>(
    initialStatus,
  );
  const [requestId, setRequestId] = useState<string | null>(
    initialRequestId,
  );
  const [rejectionReason, setRejectionReason] = useState<string | null>(
    initialRejectionReason,
  );
  const [cancelOpen, setCancelOpen] = useState(false);

  const createMutation = useCreateAdminRequest();
  const cancelMutation = useCancelMyAdminRequest();
  const isSubmitting = createMutation.isPending;
  const isCancelling = cancelMutation.isPending;
  const isBusy = isSubmitting || isCancelling;

  const isPendingStatus = status === "PENDING";
  const canEdit = !isPendingStatus && status !== "APPROVED";
  const hasText = reason.trim().length > 0;
  const reasonOk = reason.trim().length >= 10;
  const withdrawn =
    status === "REJECTED" &&
    rejectionReason === ADMIN_REQUEST_WITHDRAWN_REASON;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !reasonOk || isBusy) return;

    createMutation.mutate(
      { requestReason: reason.trim(), userEmail },
      {
        onSuccess: (result) => {
          setStatus("PENDING");
          setRequestId(result.data?.id ?? null);
          setRejectionReason(null);
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
        onSuccess: () => {
          setCancelOpen(false);
          setStatus("REJECTED");
          setRejectionReason(ADMIN_REQUEST_WITHDRAWN_REASON);
          setReason("");
          setRequestId(null);
        },
      },
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <p className="text-xs text-light-200 sm:text-sm">
          <span className="text-light-100/70">Current user: </span>
          <span className="text-light-100">{userEmail}</span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <RoleBadge role={userRole} />
          <RequestStatusBadge
            status={status}
            rejectionReason={rejectionReason}
          />
        </div>
      </div>

      {isPendingStatus && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-200 sm:text-sm">
          Your request is awaiting admin review. You can withdraw it below while
          it is still pending.
        </div>
      )}

      {status === "REJECTED" && !withdrawn && (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2.5 text-xs text-red-200 sm:text-sm">
          Your previous request was rejected
          {rejectionReason ? `: ${rejectionReason}` : "."} You may submit a new
          request below.
        </div>
      )}

      {withdrawn && (
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-light-200 sm:text-sm">
          You withdrew your last request. You can submit a new one below.
        </div>
      )}

      {(canEdit || isPendingStatus) && (
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
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
        <ul className="mt-1.5 space-y-0.5 text-xs text-light-200/70 sm:mt-2 sm:space-y-1 sm:text-sm">
          <li>• Admin Dashboard</li>
          <li>• User Management</li>
          <li>• Book Management</li>
          <li>• Borrow Requests</li>
          <li>• Sign-up Requests</li>
        </ul>
      </div>
    </div>
  );
}
