"use client";

/**
 * Admin Borrow Queue detail — ticket/review shell:
 * Back+confirm CTAs → Book DNA header + lifecycle date chips →
 * KPI rows (Status/Inventory/Fine/Renewals + Borrow Statistics) →
 * About Book | Borrower & Issuer → Record → Activity.
 * Densify via useApproveBorrow / useRejectBorrow / useReturnBook.
 * Parent: Borrow + Review detail DNA polish
 */

import { useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle,
  CircleDollarSign,
  CircleDot,
  ClipboardList,
  Layers,
  Loader2,
  Package,
  RefreshCw,
  Undo2,
  UserRound,
  XCircle,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useBackWithRefresh } from "@/hooks/useBackWithRefresh";
import {
  useBook,
  useBookBorrowStats,
  useBorrowRequestDetail,
} from "@/hooks/useQueries";
import {
  useApproveBorrow,
  useRejectBorrow,
  useReturnBook,
} from "@/hooks/useMutations";
import { LIGHT_GLASS_CTA } from "@/lib/ui/glassActionChrome";
import { FIELD_LABEL_TEXT } from "@/lib/ui/fieldLabelStyles";
import { formatMediumDate } from "@/lib/ui/formatMediumDate";
import { getBookAvailabilityStatus } from "@/lib/books/bookDetailsViewModel";
import { cn } from "@/lib/utils";
import PersonAttribution from "@/components/PersonAttribution";
import ReviewBookIdentity from "@/components/reviews/ReviewBookIdentity";
import { AdminBookDetailsPanel } from "@/components/admin/AdminBookDetailsPanel";
import { BorrowLifecycleDateMeta } from "@/components/admin/BorrowLifecycleDateMeta";
import { BorrowLifecycleDates } from "@/components/admin/BorrowLifecycleDates";
import { BorrowQueueStatusActorCell } from "@/components/admin/BorrowQueueStatusActorCell";
import {
  BorrowLifecycleAlertDialog,
  type BorrowLifecycleConfirmKind,
} from "@/components/admin/BorrowLifecycleAlertDialog";
import { DetailKpiShell } from "@/components/admin/DetailKpiShell";
import { TicketActivityTimeline } from "@/components/support-tickets/TicketActivityTimeline";
import { TicketSectionHeader } from "@/components/support-tickets/TicketSectionHeader";
import CopyableText from "@/components/ui/CopyableText";
import type { BorrowRecordWithDetails } from "@/lib/services/borrows";
import type { BookBorrowStats } from "@/lib/services/books";
import type { AdminRequestReviewer } from "@/lib/admin/adminRequestTypes";
import { resolveDecisionActor } from "@/lib/admin/resolveDecisionActor";

const AVAIL_TONE: Record<"emerald" | "amber" | "rose", string> = {
  emerald: "text-emerald-700",
  amber: "text-amber-700",
  rose: "text-rose-700",
};

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
  /** SSR book borrow stats — seeds KPI row 2 + About Book panel. */
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
  const { data: liveBook } = useBook(request.bookId, undefined);
  const { data: stats } = useBookBorrowStats(
    request.bookId,
    initialBookStats ?? undefined,
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

  const totalCopies = liveBook?.totalCopies ?? request.bookTotalCopies ?? null;
  const availableCopies =
    liveBook?.availableCopies ?? request.bookAvailableCopies ?? null;
  const hasInventory =
    typeof totalCopies === "number" &&
    Number.isFinite(totalCopies) &&
    typeof availableCopies === "number" &&
    Number.isFinite(availableCopies);
  const availability = hasInventory
    ? getBookAvailabilityStatus(availableCopies, totalCopies)
    : null;

  const totalBorrows =
    stats?.totalBorrows ?? initialBookStats?.totalBorrows ?? 0;
  const activeBorrows =
    stats?.activeBorrows ?? initialBookStats?.activeBorrows ?? 0;
  const returnedBorrows =
    stats?.returnedBorrows ?? initialBookStats?.returnedBorrows ?? 0;

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

      {/* Book DNA header + lifecycle date chips */}
      <div className="admin-panel w-full space-y-2">
        <ReviewBookIdentity
          variant="light"
          title={request.bookTitle}
          author={request.bookAuthor}
          coverUrl={request.bookCoverUrl}
          coverColor={request.bookCoverColor}
          bookId={request.bookId}
          genre={request.bookGenre}
          bookRating={request.bookRating}
          showMeta
          catalogRatingMode="number"
        />
        <BorrowLifecycleDateMeta
          status={request.status}
          createdAt={request.createdAt}
          borrowDate={request.borrowDate}
          updatedAt={request.updatedAt}
          dueDate={request.dueDate}
          returnDate={request.returnDate}
          variant="light"
        />
      </div>

      {/* Row 1 — Status · Inventory · Fine · Renewals */}
      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DetailKpiShell
          variant="light"
          icon={<CircleDot className="size-4" />}
          label="Status"
          hint="Lifecycle state and actor"
        >
          <div className="min-w-0">
            <BorrowQueueStatusActorCell request={request} />
          </div>
        </DetailKpiShell>
        <DetailKpiShell
          variant="light"
          icon={<Package className="size-4" />}
          label="Inventory"
          hint="Catalog stock levels"
        >
          {hasInventory && availability ? (
            <div className="space-y-1 leading-none">
              <p className="text-sm text-gray-600">
                Total Copies{" "}
                <span className="font-medium tabular-nums text-dark-400">
                  {totalCopies}
                </span>
              </p>
              <p className="text-sm text-gray-600">
                Available Copies{" "}
                <span
                  className={cn(
                    "font-medium tabular-nums",
                    AVAIL_TONE[availability.tone],
                  )}
                >
                  {availableCopies}
                </span>
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">—</p>
          )}
        </DetailKpiShell>
        <DetailKpiShell
          variant="light"
          icon={<CircleDollarSign className="size-4" />}
          label="Fine Balance"
          hint="Accrued balance on this loan"
        >
          <p className="text-lg font-medium tabular-nums text-dark-400">
            {fineDisplay}
          </p>
        </DetailKpiShell>
        <DetailKpiShell
          variant="light"
          icon={<RefreshCw className="size-4" />}
          label="Renewal Count"
          hint="Extensions on this loan"
        >
          <p className="text-lg font-medium tabular-nums text-dark-400">
            {request.renewalCount ?? 0}
          </p>
        </DetailKpiShell>
      </div>

      {/* Row 2 — Borrow Statistics */}
      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DetailKpiShell
          variant="light"
          icon={<BookOpen className="size-4" />}
          label="Total Times Borrowed"
          hint="Lifetime borrow count for this book"
        >
          <p className="text-lg font-medium tabular-nums text-dark-400">
            {totalBorrows}
          </p>
        </DetailKpiShell>
        <DetailKpiShell
          variant="light"
          icon={<Layers className="size-4" />}
          label="Currently Borrowed"
          hint="Active loans for this title"
        >
          <p className="text-lg font-medium tabular-nums text-dark-400">
            {activeBorrows}
          </p>
        </DetailKpiShell>
        <DetailKpiShell
          variant="light"
          icon={<CircleDot className="size-4" />}
          label="Availability Status"
          hint="Stock health cue"
        >
          <p
            className={cn(
              "text-base font-medium",
              availability ? AVAIL_TONE[availability.tone] : "text-gray-500",
            )}
          >
            {availability?.label ?? "—"}
          </p>
        </DetailKpiShell>
        <DetailKpiShell
          variant="light"
          icon={<Undo2 className="size-4" />}
          label="Successfully Returned"
          hint="Completed returns for this book"
        >
          <p className="text-lg font-medium tabular-nums text-dark-400">
            {returnedBorrows}
          </p>
        </DetailKpiShell>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AdminBookDetailsPanel
          request={request}
          initialStats={initialBookStats}
        />

        {/* Borrower & Issuer — review About Book DNA */}
        <div className="admin-panel space-y-4">
          <TicketSectionHeader
            icon={<UserRound className="size-4" />}
            title="Borrower & Issuer"
            subtitle="Requester, lifecycle dates, and decision actors"
            className="mb-0"
          />

          <div className="space-y-1">
            <p className={FIELD_LABEL_TEXT}>Borrower</p>
            <PersonAttribution
              person={{
                id: request.userId,
                fullName: request.userName,
                email: request.userEmail,
                universityCard: request.userUniversityCard ?? null,
              }}
              href={`/admin/users/${request.userId}`}
              variant="light"
              layout="stack"
              size={36}
            />
            <p className={cn(FIELD_LABEL_TEXT, "pt-2")}>University ID</p>
            <p className="text-sm text-gray-700">{request.userUniversityId}</p>
          </div>

          <div className="space-y-1">
            <p className={FIELD_LABEL_TEXT}>Lifecycle Dates</p>
            <BorrowLifecycleDates
              status={request.status}
              createdAt={request.createdAt}
              borrowDate={request.borrowDate}
              updatedAt={request.updatedAt}
              dueDate={request.dueDate}
              returnDate={request.returnDate}
              variant="light"
              className="flex flex-col items-start gap-1"
            />
          </div>

          <div className="space-y-1">
            <p className={FIELD_LABEL_TEXT}>Status</p>
            <BorrowQueueStatusActorCell request={request} />
          </div>

          <div className="space-y-3">
            <p className={FIELD_LABEL_TEXT}>Issuer</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <p className={cn(FIELD_LABEL_TEXT, "mb-1")}>Approved By</p>
                {request.approvedByActor ? (
                  <PersonAttribution
                    person={request.approvedByActor}
                    href={`/admin/users/${request.approvedByActor.id}`}
                    variant="light"
                    layout="stack"
                    size={32}
                  />
                ) : (
                  <p className="text-sm text-gray-600">
                    {request.borrowedBy || "—"}
                  </p>
                )}
              </div>
              <div>
                <p className={cn(FIELD_LABEL_TEXT, "mb-1")}>Returned By</p>
                {request.returnedByActor ? (
                  <PersonAttribution
                    person={request.returnedByActor}
                    href={`/admin/users/${request.returnedByActor.id}`}
                    variant="light"
                    layout="stack"
                    size={32}
                  />
                ) : (
                  <p className="text-sm text-gray-600">
                    {request.returnedBy || "—"}
                  </p>
                )}
              </div>
              <div className="sm:col-span-2">
                <p className={cn(FIELD_LABEL_TEXT, "mb-1")}>Cancelled By</p>
                {request.cancelledByActor ? (
                  <PersonAttribution
                    person={request.cancelledByActor}
                    href={`/admin/users/${request.cancelledByActor.id}`}
                    variant="light"
                    layout="stack"
                    size={32}
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
        </div>
      </div>

      <div className="admin-panel space-y-4">
        <TicketSectionHeader
          icon={<ClipboardList className="size-4" />}
          title="Record"
          subtitle="Identifiers, emails, and timestamps"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <RecordField label="Request ID" value={request.id} mono />
          <RecordField label="Book ID" value={request.bookId} mono />
          <RecordField label="User ID" value={request.userId} mono />
          <RecordField label="Status" value={request.status} />
          <RecordField label="Fine Balance" value={fineDisplay} />
          <RecordField
            label="Renewal Count"
            value={String(request.renewalCount ?? 0)}
          />
          <RecordField
            label="Borrowed By Email"
            value={request.borrowedBy || "—"}
          />
          <RecordField
            label="Returned By Email"
            value={request.returnedBy || "—"}
          />
          <RecordField
            label="Updated By Email"
            value={request.updatedBy || "—"}
          />
          <RecordField
            label="Requested"
            value={formatMediumDate(request.createdAt)}
          />
          <RecordField
            label="Borrow Date"
            value={formatMediumDate(request.borrowDate)}
          />
          <RecordField
            label="Due Date"
            value={formatMediumDate(request.dueDate)}
          />
          <RecordField
            label="Return Date"
            value={formatMediumDate(request.returnDate)}
          />
          <RecordField
            label="Updated"
            value={formatMediumDate(request.updatedAt)}
          />
          <RecordField
            label="Last Reminder"
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
