"use client";

/**
 * Admin Borrow Queue detail — ticket/review shell:
 * Back+confirm CTAs → Book DNA + lifecycle chips →
 * KPI (Status badge · Inventory · Fine · Renewals + stats) →
 * Borrow Book Context | Borrower & Issuer → IDs & Notes → Activity.
 * Densify via useApproveBorrow / useRejectBorrow / useReturnBook.
 * Parent: borrow detail UI polish
 */

import { useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Bell,
  BookOpen,
  CheckCircle,
  CircleDollarSign,
  CircleDot,
  ClipboardList,
  Clock,
  Hash,
  Layers,
  Loader2,
  Package,
  RefreshCw,
  StickyNote,
  Undo2,
  UserRound,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useBackWithRefresh } from "@/hooks/useBackWithRefresh";
import {
  useBookBorrowStats,
  useBorrowRequestDetail,
} from "@/hooks/useQueries";
import {
  useApproveBorrow,
  useRejectBorrow,
  useReturnBook,
  useFineFreeReturn,
} from "@/hooks/useMutations";
import { LIGHT_GLASS_CTA } from "@/lib/ui/glassActionChrome";
import {
  FIELD_LABEL_ROW,
  FIELD_LABEL_TEXT,
} from "@/lib/ui/fieldLabelStyles";
import { formatMediumDate } from "@/lib/ui/formatMediumDate";
import { getBookAvailabilityStatus } from "@/lib/books/bookDetailsViewModel";
import { borrowDaysOverdue } from "@/lib/admin/borrowDaysOverdue";
import { cn } from "@/lib/utils";
import PersonAttribution from "@/components/PersonAttribution";
import ReviewBookIdentity from "@/components/reviews/ReviewBookIdentity";
import { AdminBookDetailsPanel } from "@/components/admin/AdminBookDetailsPanel";
import { AdminDetailIdChip } from "@/components/admin/AdminDetailIdChip";
import { AdminDetailToolbar } from "@/components/admin/AdminDetailToolbar";
import { AdminBorrowFineMenu } from "@/components/admin/AdminBorrowFineMenu";
import PrefetchLink from "@/components/PrefetchLink";
import { BorrowLifecycleDateMeta } from "@/components/admin/BorrowLifecycleDateMeta";
import {
  BorrowLifecycleAlertDialog,
  type BorrowLifecycleConfirmKind,
} from "@/components/admin/BorrowLifecycleAlertDialog";
import { DetailKpiShell } from "@/components/admin/DetailKpiShell";
import { DecisionDateMeta } from "@/components/support-tickets/DecisionDateMeta";
import { TicketActivityTimeline } from "@/components/support-tickets/TicketActivityTimeline";
import { TicketDateMeta } from "@/components/support-tickets/TicketDateMeta";
import { TicketSectionHeader } from "@/components/support-tickets/TicketSectionHeader";
import CopyableText from "@/components/ui/CopyableText";
import { BorrowStatusBadge } from "@/lib/ui/semanticBadges";
import type { BorrowRecordWithDetails } from "@/lib/services/borrows";
import type { BookBorrowStats } from "@/lib/services/books";
import type { AdminRequestReviewer } from "@/lib/admin/adminRequestTypes";
import { resolveDecisionActor } from "@/lib/admin/resolveDecisionActor";

const AVAIL_TONE: Record<"emerald" | "amber" | "rose", string> = {
  emerald: "text-emerald-700",
  amber: "text-amber-700",
  rose: "text-rose-700",
};

/** Legacy reject notes used "librarian"; display as admin without DB migrate. */
function formatBorrowNotesDisplay(notes: string | null | undefined): string {
  const trimmed = notes?.trim();
  if (!trimmed) return "—";
  if (trimmed === "Rejected by librarian") return "Rejected by admin";
  return trimmed;
}

function RecordField({
  label,
  value,
  mono = false,
  icon: Icon,
}: {
  label: string;
  value: string;
  mono?: boolean;
  icon?: LucideIcon;
}) {
  return (
    <div className="min-w-0">
      {Icon ? (
        <p className={cn(FIELD_LABEL_ROW, "mb-1")}>
          <Icon className="size-3.5 shrink-0" aria-hidden />
          {label}
        </p>
      ) : (
        <p className={FIELD_LABEL_TEXT}>{label}</p>
      )}
      {mono ? (
        <CopyableText value={value} className="text-sm text-gray-700" />
      ) : (
        <p className="break-words text-sm text-gray-700">{value}</p>
      )}
    </div>
  );
}

function isSelfReturned(r: BorrowRecordWithDetails): boolean {
  if (r.returnedByActor?.id && r.returnedByActor.id === r.userId) return true;
  const byEmail = r.returnedBy?.trim().toLowerCase();
  const userEmail = r.userEmail?.trim().toLowerCase();
  return Boolean(byEmail && userEmail && byEmail === userEmail);
}

function isSelfCancelled(r: BorrowRecordWithDetails): boolean {
  if (r.cancelledByActor?.id && r.cancelledByActor.id === r.userId) return true;
  const byEmail = r.updatedBy?.trim().toLowerCase();
  const userEmail = r.userEmail?.trim().toLowerCase();
  return Boolean(byEmail && userEmail && byEmail === userEmail);
}

/** Parties Status — badge (+ Due / Self-*) without full actor stack. */
function BorrowDetailStatusSimple({
  request,
}: {
  request: BorrowRecordWithDetails;
}) {
  const r = request;
  if (r.status === "BORROWED") {
    const dueText = formatMediumDate(r.dueDate);
    return (
      <div className="flex min-w-0 flex-col items-start gap-1 leading-none">
        <BorrowStatusBadge status="BORROWED" />
        {r.dueDate && dueText !== "—" ? (
          <span className="inline-flex items-center gap-1 text-xs text-violet-700">
            <Clock className="size-3 shrink-0 text-violet-600" aria-hidden />
            <span className="font-medium">Due:</span>
            <span className="text-gray-700">{dueText}</span>
          </span>
        ) : null}
      </div>
    );
  }
  if (r.status === "RETURNED" && isSelfReturned(r)) {
    return (
      <div className="flex min-w-0 flex-col items-start gap-1 leading-none">
        <BorrowStatusBadge status="RETURNED" />
        <p className="text-xs font-medium text-emerald-700">Self-returned</p>
      </div>
    );
  }
  if (r.status === "CANCELLED" && isSelfCancelled(r)) {
    return (
      <div className="flex min-w-0 flex-col items-start gap-1 leading-none">
        <BorrowStatusBadge status="CANCELLED" />
        <p className="text-xs font-medium text-rose-700">Self-cancelled</p>
      </div>
    );
  }
  return (
    <span className="inline-flex self-start">
      <BorrowStatusBadge status={r.status} />
    </span>
  );
}

function IssuerActorRow({
  label,
  person,
  href,
  status,
  at,
  decisionLabel,
  selfLabel,
}: {
  label: string;
  person?: {
    id: string | null;
    fullName: string;
    email: string;
    universityCard: string | null;
  } | null;
  href?: string | null;
  status: string;
  at: string | Date | null | undefined;
  decisionLabel?: string;
  selfLabel?: string;
}) {
  if (!person && !selfLabel) return null;
  return (
    <div className="space-y-1">
      <p className={cn(FIELD_LABEL_TEXT, "mb-1")}>{label}</p>
      {selfLabel ? (
        <div className="flex min-w-0 flex-col gap-0.5 leading-none">
          <p className="text-sm font-medium text-gray-800">{selfLabel}</p>
          <DecisionDateMeta status={status} at={at} label={decisionLabel} />
        </div>
      ) : person ? (
        <PersonAttribution
          person={person}
          href={href ?? null}
          variant="light"
          layout="stack"
          size={32}
          meta={
            <DecisionDateMeta
              status={status}
              at={at}
              label={decisionLabel}
            />
          }
        />
      ) : null}
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
  // Inventory densify via syncBorrowRequestBookFields on request fields;
  // AdminBookDetailsPanel owns the shared useBook observer (no duplicate fetch).
  const { data: stats } = useBookBorrowStats(
    request.bookId,
    initialBookStats ?? undefined,
  );

  const approveMutation = useApproveBorrow();
  const rejectMutation = useRejectBorrow();
  const returnMutation = useReturnBook();
  const fineFreeReturnMutation = useFineFreeReturn();
  const [confirmKind, setConfirmKind] =
    useState<BorrowLifecycleConfirmKind | null>(null);
  const [actionKind, setActionKind] =
    useState<BorrowLifecycleConfirmKind | null>(null);

  const busy =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    returnMutation.isPending ||
    fineFreeReturnMutation.isPending;

  const hasActions =
    request.status === "PENDING" || request.status === "BORROWED";

  const closeConfirm = () => {
    setConfirmKind(null);
    setActionKind(null);
  };

  const runLifecycle = (
    kind: BorrowLifecycleConfirmKind,
    payload?: { reason?: string },
  ) => {
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
    if (kind === "fine-free-return") {
      fineFreeReturnMutation.mutate(
        {
          recordId: request.id,
          bookTitle: request.bookTitle || undefined,
          reason: payload?.reason,
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

  const fineDisplay = request.displayFineAmount ?? request.fineAmount;
  const fineDisplayFormatted = fineDisplay
    ? `$${Number(fineDisplay).toFixed(2)}`
    : "$0.00";
  const overdueDays = borrowDaysOverdue(request.status, request.dueDate);
  const fineHint =
    overdueDays > 0
      ? `Accrued balance · ${overdueDays} day${overdueDays === 1 ? "" : "s"} overdue`
      : "Accrued balance · No overdue days";

  const totalCopies = request.bookTotalCopies ?? null;
  const availableCopies = request.bookAvailableCopies ?? null;
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

  const borrowerMeta = (
    <div className="flex min-w-0 flex-col gap-0.5 leading-none">
      {request.userUniversityId ? (
        <span className="inline-flex min-w-0 flex-wrap items-center gap-1 text-xs leading-none text-gray-600">
          <span className="opacity-70">University ID</span>
          <CopyableText
            value={String(request.userUniversityId)}
            label="university ID"
            className="text-xs text-gray-800"
          />
        </span>
      ) : null}
      <TicketDateMeta
        createdAt={request.createdAt ?? request.borrowDate}
        createdLabel="Requested"
        hideUpdated
      />
    </div>
  );

  const issuerRows: ReactNode[] = [];
  if (request.approvedByActor) {
    issuerRows.push(
      <IssuerActorRow
        key="approved"
        label="Approved By"
        person={request.approvedByActor}
        href={`/admin/users/${request.approvedByActor.id}`}
        status="APPROVED"
        at={request.borrowDate ?? request.updatedAt}
        decisionLabel="Approved:"
      />,
    );
  }
  if (request.status === "RETURNED" || request.returnedByActor) {
    if (isSelfReturned(request)) {
      issuerRows.push(
        <IssuerActorRow
          key="returned-self"
          label="Returned By"
          status="RETURNED"
          at={request.returnDate ?? request.updatedAt}
          decisionLabel="Returned:"
          selfLabel="Self-returned"
        />,
      );
    } else if (request.returnedByActor) {
      issuerRows.push(
        <IssuerActorRow
          key="returned"
          label="Returned By"
          person={request.returnedByActor}
          href={`/admin/users/${request.returnedByActor.id}`}
          status="RETURNED"
          at={request.returnDate ?? request.updatedAt}
          decisionLabel="Returned:"
        />,
      );
    }
  }
  if (request.status === "CANCELLED" || request.cancelledByActor) {
    if (isSelfCancelled(request)) {
      issuerRows.push(
        <IssuerActorRow
          key="cancelled-self"
          label="Cancelled By"
          status="CANCELLED"
          at={request.updatedAt}
          decisionLabel="Cancelled:"
          selfLabel="Self-cancelled"
        />,
      );
    } else if (request.cancelledByActor) {
      issuerRows.push(
        <IssuerActorRow
          key="cancelled"
          label="Cancelled By"
          person={request.cancelledByActor}
          href={`/admin/users/${request.cancelledByActor.id}`}
          status="CANCELLED"
          at={request.updatedAt}
          decisionLabel="Cancelled:"
        />,
      );
    }
  }

  return (
    <section className="w-full space-y-4 sm:space-y-6">
      <AdminDetailToolbar
        hasActions={hasActions}
        back={
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
        }
        idChip={
          <AdminDetailIdChip
            label="Borrow Request ID"
            value={request.id}
            icon={ClipboardList}
            className="justify-center"
          />
        }
        actions={
          <>
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
              <>
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
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirmKind("fine-free-return")}
                  className={cn(
                    LIGHT_GLASS_CTA.host,
                    "bg-sky-800 text-white hover:bg-sky-900",
                  )}
                >
                  {actionKind === "fine-free-return" && busy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Undo2 className="size-4" />
                  )}
                  <span>Fine-Free Return</span>
                </button>
              </>
            ) : null}
          </>
        }
      />

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

      {/* Row 1 — Status badge · Inventory · Fine · Renewals */}
      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DetailKpiShell
          variant="light"
          icon={<CircleDot className="size-4" />}
          label="Status"
          hint="Lifecycle state"
        >
          {/* No self-start — DetailKpiShell mid-aligns the badge with other KPI values */}
          <span className="inline-flex">
            <BorrowStatusBadge status={request.status} />
          </span>
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
          hint={fineHint}
        >
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg font-medium tabular-nums text-dark-400">
              {fineDisplayFormatted}
            </p>
            <AdminBorrowFineMenu recordId={request.id} disabled={busy} />
          </div>
          <PrefetchLink
            href={`/support-tickets?create=1&borrowId=${request.id}&bookId=${request.bookId}`}
            className="mt-1 inline-block text-xs text-sky-700 hover:text-sky-900"
          >
            Open support ticket
          </PrefetchLink>
        </DetailKpiShell>
        <DetailKpiShell
          variant="light"
          icon={<RefreshCw className="size-4" />}
          label="Renewal Count"
          hint="Extensions on this loan · 1 = +7 days"
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

        {/* Borrower & Issuer — review Context DNA */}
        <div className="admin-panel space-y-4">
          <TicketSectionHeader
            icon={<UserRound className="size-4" />}
            title="Borrower & Issuer"
            subtitle="Requester, status, and decision actors"
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
              meta={borrowerMeta}
            />
          </div>

          <div className="space-y-1">
            <p className={FIELD_LABEL_TEXT}>Status</p>
            <BorrowDetailStatusSimple request={request} />
          </div>

          {issuerRows.length > 0 ? (
            <div className="space-y-3">
              <p className={FIELD_LABEL_TEXT}>Issuer</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {issuerRows}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Thin IDs & Notes — no duplicate status/fine/dates dump */}
      <div className="admin-panel space-y-4">
        <TicketSectionHeader
          icon={<ClipboardList className="size-4" />}
          title="IDs & Notes"
          subtitle="Request identifiers, notes, and last reminder"
          className="mb-0"
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <RecordField
            label="Request ID"
            value={request.id}
            mono
            icon={Hash}
          />
          <RecordField
            label="Book ID"
            value={request.bookId}
            mono
            icon={BookOpen}
          />
          <RecordField
            label="User ID"
            value={request.userId}
            mono
            icon={UserRound}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="min-w-0">
            <p className={cn(FIELD_LABEL_ROW, "mb-1")}>
              <StickyNote className="size-3.5 shrink-0" aria-hidden />
              Notes
            </p>
            <p className="whitespace-pre-wrap text-sm text-gray-700">
              {formatBorrowNotesDisplay(request.notes)}
            </p>
          </div>
          <RecordField
            label="Last Reminder"
            value={formatMediumDate(request.lastReminderSent)}
            icon={Bell}
          />
        </div>
      </div>

      <TicketActivityTimeline
        events={auditEvents}
        variant="light"
        adminUserHref
        fifoLimit={25}
      />

      <BorrowLifecycleAlertDialog
        open={confirmKind !== null}
        onOpenChange={(open) => {
          if (!open && !busy) closeConfirm();
        }}
        kind={confirmKind}
        request={request}
        isPending={busy && actionKind === confirmKind}
        onConfirm={(payload) => {
          if (confirmKind) runLifecycle(confirmKind, payload);
        }}
      />
    </section>
  );
}
