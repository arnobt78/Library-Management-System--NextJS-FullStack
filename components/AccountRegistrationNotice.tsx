/**
 * Glass registration-pending / rejected notice — make-admin locked UX + my-profile shell.
 * REJECTED includes prior decision actor + “Request approval again” CTA (→ PENDING).
 * Spinner stays until mutation + invalidate + router.refresh finish (no stale REJECTED flash).
 */

"use client";

import AdminRequestReviewerAttribution from "@/components/AdminRequestReviewerAttribution";
import { Badge } from "@/components/ui/badge";
import type { AdminRequestReviewer } from "@/lib/admin/adminRequestTypes";
import { formatBorrowDateTime } from "@/lib/profile/formatBorrowDates";
import { useRequestRegistrationReview } from "@/hooks/useMutations";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Clock, Loader2, RotateCcw, User, XCircle } from "lucide-react";

export type RegistrationNoticeStatus = "PENDING" | "REJECTED";
export type RegistrationNoticeContext =
  | "make-admin"
  | "profile"
  | "support-tickets";

const COPY: Record<
  RegistrationNoticeContext,
  Record<RegistrationNoticeStatus, { title: string; body: string }>
> = {
  "make-admin": {
    PENDING: {
      title: "You cannot request admin access yet",
      body: "An admin must approve your registration as a library user first. After approval you can submit a make-admin request here.",
    },
    REJECTED: {
      title: "Admin requests are unavailable",
      body: "Your registration was not approved. You can request student approval again below; make-admin stays locked until you are approved as a library user.",
    },
  },
  profile: {
    PENDING: {
      title: "Borrowing is unavailable until approval",
      body: "An admin must approve your registration before you can borrow books or view borrow history. Your profile stays ready — check back after approval.",
    },
    REJECTED: {
      title: "Borrowing is unavailable",
      body: "Your registration was not approved. You may request approval again so a librarian can review your account.",
    },
  },
  "support-tickets": {
    PENDING: {
      title: "Support tickets are unavailable until approval",
      body: "An admin must approve your registration before you can open a support ticket. Check back after approval.",
    },
    REJECTED: {
      title: "Support tickets are unavailable",
      body: "Your registration was not approved. You may request approval again so a librarian can review your account.",
    },
  },
};

interface AccountRegistrationNoticeProps {
  accountStatus: RegistrationNoticeStatus;
  context: RegistrationNoticeContext;
  email?: string | null;
  createdAt?: Date | string | null;
  /** When status was APPROVED/REJECTED (statusReviewedAt). */
  decidedAt?: Date | string | null;
  /** Admin who decided (statusReviewedBy join). */
  decisionActor?: AdminRequestReviewer | null;
  className?: string;
}

export default function AccountRegistrationNotice({
  accountStatus,
  context,
  email,
  createdAt,
  decidedAt,
  decisionActor = null,
  className,
}: AccountRegistrationNoticeProps) {
  const copy = COPY[context][accountStatus];
  const created = formatBorrowDateTime(createdAt);
  const decided = formatBorrowDateTime(decidedAt);
  const isPending = accountStatus === "PENDING";
  const router = useRouter();
  const reapplyMutation = useRequestRegistrationReview();
  // Stay busy until parent RSC re-renders with PENDING (avoids REJECTED flash)
  const [awaitingPendingShell, setAwaitingPendingShell] = useState(false);
  const busy =
    reapplyMutation.isPending ||
    (awaitingPendingShell && accountStatus === "REJECTED");

  const handleReapply = () => {
    setAwaitingPendingShell(true);
    reapplyMutation.mutate(undefined, {
      onSuccess: () => {
        // Hook already awaited user.write; refresh SSR shells next
        router.refresh();
      },
      onError: () => {
        setAwaitingPendingShell(false);
      },
    });
  };

  return (
    <div className={className ? `space-y-4 ${className}` : "space-y-4"}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {email ? (
            <p className="text-xs text-light-200 sm:text-sm">
              <span className="text-light-100/70">Current user: </span>
              <span className="break-all text-light-100">{email}</span>
            </p>
          ) : null}
          <Badge variant="glassMuted">
            <User className="size-3" />
            User
          </Badge>
        </div>
        {isPending ? (
          <Badge variant="glassPending">
            <Clock className="size-3" />
            Registration pending
          </Badge>
        ) : (
          <Badge
            variant="glassMuted"
            className="border-red-400/40 from-red-500/25 via-red-500/10 to-red-500/5"
          >
            <XCircle className="size-3" />
            Registration rejected
          </Badge>
        )}
      </div>

      <div
        className={
          isPending
            ? "space-y-1 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-200 sm:text-sm"
            : "space-y-1 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2.5 text-xs text-red-200 sm:text-sm"
        }
        role="status"
      >
        <p className="font-medium">{copy.title}</p>
        <p>{copy.body}</p>
      </div>

      <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-light-200 sm:text-sm">
        <p className="font-medium text-light-100">Account registration</p>
        {created ? (
          <p className="flex items-center gap-1.5">
            <Clock className="size-3.5 shrink-0" aria-hidden />
            Created on {created}
          </p>
        ) : null}
        {isPending ? (
          <p>Status: awaiting admin approval as a library user.</p>
        ) : (
          <>
            <p>
              Status: registration was not approved. You can request review
              again.
            </p>
            {decided ? <p>Rejected on {decided}</p> : null}
            <AdminRequestReviewerAttribution
              reviewer={decisionActor}
              prefix="Rejected by"
              size={28}
              className="text-light-200"
              textClassName="text-light-100"
            />
            <div className="pt-2">
              <button
                type="button"
                onClick={handleReapply}
                disabled={busy}
                className="profile-action-btn profile-action-btn--submit inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="size-3.5 animate-spin sm:size-4" />
                ) : (
                  <RotateCcw className="size-3.5 sm:size-4" />
                )}
                {busy ? "Requesting…" : "Request approval again"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
