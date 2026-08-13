"use client";

/**
 * Admin Borrow Queue detail — ticket/review shell:
 * Back+confirm CTAs → title+dates → KPI row → Book | Borrower →
 * Lifecycle actors → Record → Activity timeline.
 * Densify via useApproveBorrow / useRejectBorrow / useReturnBook.
 * Parent: borrow detail gaps + record/history DNA
 */

import { useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle,
  CircleDollarSign,
  CircleDot,
  ClipboardList,
  Loader2,
  Undo2,
  UserRound,
  XCircle,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useBackWithRefresh } from "@/hooks/useBackWithRefresh";
import { useBorrowRequestDetail } from "@/hooks/useQueries";
import {
  useApproveBorrow,
  useRejectBorrow,
  useReturnBook,
} from "@/hooks/useMutations";
import { LIGHT_GLASS_CTA } from "@/lib/ui/glassActionChrome";
import { FIELD_LABEL_TEXT } from "@/lib/ui/fieldLabelStyles";
import { formatMediumDate } from "@/lib/ui/formatMediumDate";
import { cn } from "@/lib/utils";
import PersonAttribution from "@/components/PersonAttribution";
import { AdminBookDetailsPanel } from "@/components/admin/AdminBookDetailsPanel";
import { BorrowQueueStatusActorCell } from "@/components/admin/BorrowQueueStatusActorCell";
import {
  BorrowLifecycleAlertDialog,
  type BorrowLifecycleConfirmKind,
} from "@/components/admin/BorrowLifecycleAlertDialog";
import { DetailKpiShell } from "@/components/admin/DetailKpiShell";
import { TicketActivityTimeline } from "@/components/support-tickets/TicketActivityTimeline";
import { TicketDateMeta } from "@/components/support-tickets/TicketDateMeta";
import { TicketSectionHeader } from "@/components/support-tickets/TicketSectionHeader";
import CopyableText from "@/components/ui/CopyableText";
import type { BorrowRecordWithDetails } from "@/lib/services/borrows";
import type { BookBorrowStats } from "@/lib/services/books";
import type { AdminRequestReviewer } from "@/lib/admin/adminRequestTypes";
import { resolveDecisionActor } from "@/lib/admin/resolveDecisionActor";

function RecordField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className={FIELD_LABEL_TEXT}>{label}</p>
      {mono ? (
        <CopyableText value={value} className="text-sm text-gray-700" />
      ) : (
        <p className="break-words text-sm text-gray-700">{value}</p>
      )}
    </div>
  );
}

export default function AdminBorrowRequestDetailContent({
  initialRequest,
  initialBookStats = null,
  currentAdmin = null,
}: {
  initialRequest: BorrowRecordWithDetails;
  /** SSR book borrow stats — seeds AdminBookDetailsPanel / useBookBorrowStats. */
  initialBookStats?: BookBorrowStats | null;
  /** SSR DB actor — preferred over useSession for lifecycle densify card. */
  currentAdmin?: AdminRequestReviewer | null;
}) {
  const { data: session } = useSession();
  const decisionActor =
    resolveDecisionActor(currentAdmin, session?.user) ?? undefined;
  const handleBack = useBackWithRefresh(
    "borrow.lifecycle",
    "/admin/book-requests",
  );
  const [ssrTimestamp] = useState(() => Date.now());
  const { data: request = initialRequest } = useBorrowRequestDetail(
    initialRequest.id,
    initialRequest,
    ssrTimestamp,
  );
  const approveMutation = useApproveBorrow();
  const rejectMutation = useRejectBorrow();
  const returnMutation = useReturnBook();
  const [confirmKind, setConfirmKind] =
    useState<BorrowLifecycleConfirmKind | null>(null);
  const [actionKind, setActionKind] =
    useState<BorrowLifecycleConfirmKind | null>(null);

  const busy =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    returnMutation.isPending;

  const closeConfirm = () => {
    setConfirmKind(null);
    setActionKind(null);
  };

  const runLifecycle = (kind: BorrowLifecycleConfirmKind) => {
    if (busy) return;
    setActionKind(kind);
    const onSettled = () => {
      closeConfirm();
    };
    if (kind === "approve") {
      approveMutation.mutate(
        {
          recordId: request.id,
          bookTitle: request.bookTitle || undefined,
          userName: request.userName || undefined,
          decisionActor,
        },
        { onSettled },
      );
      return;
    }
    if (kind === "reject") {
      rejectMutation.mutate(
        {
          recordId: request.id,
          bookTitle: request.bookTitle || undefined,
          userName: request.userName || undefined,
          decisionActor,
        },
        { onSettled },
      );
      return;
    }
    returnMutation.mutate(
      {
        recordId: request.id,
        bookTitle: request.bookTitle || undefined,
        decisionActor,
      },
      { onSettled },
    );
  };

  const fineDisplay = request.fineAmount
    ? `$${Number(request.fineAmount).toFixed(2)}`
    : "$0.00";

  const showActors = Boolean(
    request.approvedByActor ||
      request.returnedByActor ||
      request.cancelledByActor ||
      request.borrowedBy ||
      request.returnedBy ||
      (request.status === "CANCELLED" && request.updatedBy),
  );

  const auditEvents = request.auditEvents ?? [];

  return (
    <section className="w-full space-y-4 sm:space-y-6">
      <div className="flex w-full flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-primary-admin"
        >
          <ArrowLeft className="size-4" />
          <span className="max-w-44 truncate sm:max-w-none">
            Back to Borrow Queue
          </span>
        </button>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {request.status === "PENDING" ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmKind("approve")}
                className={cn(
                  LIGHT_GLASS_CTA.host,
                  "bg-emerald-700 text-white hover:bg-emerald-800",
                )}
              >
                {actionKind === "approve" && busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckCircle className="size-4" />
                )}
                <span>Approve</span>
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmKind("reject")}
                className={cn(
                  LIGHT_GLASS_CTA.host,
                  LIGHT_GLASS_CTA.delete,
                  "bg-red-800 text-white",
                )}
              >
                {actionKind === "reject" && busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <XCircle className="size-4" />
                )}
                <span>Reject</span>
              </button>
            </>
          ) : null}
          {request.status === "BORROWED" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmKind("return")}
              className={cn(
                LIGHT_GLASS_CTA.host,
                "bg-emerald-700 text-white hover:bg-emerald-800",
              )}
            >
              {actionKind === "return" && busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Undo2 className="size-4" />
              )}
              <span>Mark Returned</span>
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-1">
        <h1 className="text-xl font-medium text-dark-400 sm:text-2xl">
          {request.bookTitle}
        </h1>
        <TicketDateMeta
          createdAt={request.createdAt}
          updatedAt={request.updatedAt}
          createdLabel="Requested"
          updatedLabel="Updated"
        />
      </div>

      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DetailKpiShell
          variant="light"
          icon={<CircleDot className="size-4" />}
          label="Status"
          hint="Lifecycle state & actor"
        >
          <div className="min-w-0">
            <BorrowQueueStatusActorCell request={request} />
          </div>
        </DetailKpiShell>
        <DetailKpiShell
          variant="light"
          icon={<BookOpen className="size-4" />}
          label="Genre"
          hint="Catalog category"
        >
          <p className="text-base font-medium text-dark-400">
            {request.bookGenre || "—"}
          </p>
        </DetailKpiShell>
        <DetailKpiShell
          variant="light"
          icon={<CircleDollarSign className="size-4" />}
          label="Fine"
          hint="Accrued balance"
        >
          <p className="text-lg font-medium tabular-nums text-dark-400">
            {fineDisplay}
          </p>
        </DetailKpiShell>
        <DetailKpiShell
          variant="light"
          icon={<UserRound className="size-4" />}
          label="Renewals"
          hint="Extensions on this loan"
        >
          <p className="text-lg font-medium tabular-nums text-dark-400">
            {request.renewalCount ?? 0}
          </p>
        </DetailKpiShell>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AdminBookDetailsPanel
          request={request}
          initialStats={initialBookStats}
        />

        <div className="admin-panel space-y-3">
          <TicketSectionHeader
            icon={<UserRound className="size-4" />}
            title="Borrower"
            subtitle="Account that placed the request"
          />
          <PersonAttribution
            person={{
              id: request.userId,
              fullName: request.userName,
              email: request.userEmail,
              universityCard: request.userUniversityCard ?? null,
            }}
            href={`/admin/users/${request.userId}`}
            variant="light"
          />
          <p className={cn(FIELD_LABEL_TEXT, "pt-1")}>University ID</p>
          <p className="text-sm text-gray-700">{request.userUniversityId}</p>
        </div>
      </div>

      {showActors ? (
        <div className="admin-panel space-y-4">
          <TicketSectionHeader
            icon={<CheckCircle className="size-4" />}
            title="Lifecycle actors"
            subtitle="Approver, returner, and canceler attribution"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className={FIELD_LABEL_TEXT}>Approved by</p>
              {request.approvedByActor ? (
                <PersonAttribution
                  person={request.approvedByActor}
                  href={`/admin/users/${request.approvedByActor.id}`}
                  variant="light"
                />
              ) : (
                <p className="text-sm text-gray-600">
                  {request.borrowedBy || "—"}
                </p>
              )}
            </div>
            <div>
              <p className={FIELD_LABEL_TEXT}>Returned by</p>
              {request.returnedByActor ? (
                <PersonAttribution
                  person={request.returnedByActor}
                  href={`/admin/users/${request.returnedByActor.id}`}
                  variant="light"
                />
              ) : (
                <p className="text-sm text-gray-600">
                  {request.returnedBy || "—"}
                </p>
              )}
            </div>
            <div>
              <p className={FIELD_LABEL_TEXT}>Cancelled by</p>
              {request.cancelledByActor ? (
                <PersonAttribution
                  person={request.cancelledByActor}
                  href={`/admin/users/${request.cancelledByActor.id}`}
                  variant="light"
                />
              ) : (
                <p className="text-sm text-gray-600">
                  {request.status === "CANCELLED"
                    ? request.updatedBy || "—"
                    : "—"}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <div className="admin-panel space-y-4">
        <TicketSectionHeader
          icon={<ClipboardList className="size-4" />}
          title="Record"
          subtitle="Identifiers, emails, and lifecycle timestamps"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <RecordField label="Request ID" value={request.id} mono />
          <RecordField label="Book ID" value={request.bookId} mono />
          <RecordField label="User ID" value={request.userId} mono />
          <RecordField label="Status" value={request.status} />
          <RecordField label="Fine" value={fineDisplay} />
          <RecordField
            label="Renewals"
            value={String(request.renewalCount ?? 0)}
          />
          <RecordField
            label="Borrowed by (email)"
            value={request.borrowedBy || "—"}
          />
          <RecordField
            label="Returned by (email)"
            value={request.returnedBy || "—"}
          />
          <RecordField
            label="Updated by (email)"
            value={request.updatedBy || "—"}
          />
          <RecordField
            label="Requested"
            value={formatMediumDate(request.createdAt)}
          />
          <RecordField
            label="Borrow date"
            value={formatMediumDate(request.borrowDate)}
          />
          <RecordField
            label="Due date"
            value={formatMediumDate(request.dueDate)}
          />
          <RecordField
            label="Return date"
            value={formatMediumDate(request.returnDate)}
          />
          <RecordField
            label="Updated"
            value={formatMediumDate(request.updatedAt)}
          />
          <RecordField
            label="Last reminder"
            value={formatMediumDate(request.lastReminderSent)}
          />
        </div>
        <div>
          <p className={FIELD_LABEL_TEXT}>Notes</p>
          <p className="whitespace-pre-wrap text-sm text-gray-700">
            {request.notes?.trim() ? request.notes : "—"}
          </p>
        </div>
      </div>

      <TicketActivityTimeline
        events={auditEvents}
        variant="light"
        adminUserHref
      />

      <BorrowLifecycleAlertDialog
        open={confirmKind !== null}
        onOpenChange={(open) => {
          if (!open && !busy) closeConfirm();
        }}
        kind={confirmKind}
        request={request}
        isPending={busy && actionKind === confirmKind}
        onConfirm={() => {
          if (confirmKind) runLifecycle(confirmKind);
        }}
      />
    </section>
  );
}
