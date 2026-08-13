"use client";

/**
 * Admin Borrow Queue detail — ticket/review shell:
 * Back → title+dates → KPI row → Book | Borrower (+ lifecycle actions).
 * Densify via useApproveBorrow / useRejectBorrow / useReturnBook.
 */

import { useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle,
  CircleDollarSign,
  CircleDot,
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
import { cn } from "@/lib/utils";
import PersonAttribution from "@/components/PersonAttribution";
import { AdminBookIdentityCell } from "@/components/admin/AdminBookIdentityCell";
import { BorrowLifecycleDates } from "@/components/admin/BorrowLifecycleDates";
import { DetailKpiShell } from "@/components/admin/DetailKpiShell";
import { TicketDateMeta } from "@/components/support-tickets/TicketDateMeta";
import { TicketSectionHeader } from "@/components/support-tickets/TicketSectionHeader";
import { BorrowStatusBadge } from "@/lib/ui/semanticBadges";
import type { BorrowRecordWithDetails } from "@/lib/services/borrows";
import type { AdminRequestReviewer } from "@/lib/admin/adminRequestTypes";
import { resolveDecisionActor } from "@/lib/admin/resolveDecisionActor";

export default function AdminBorrowRequestDetailContent({
  initialRequest,
  currentAdmin = null,
}: {
  initialRequest: BorrowRecordWithDetails;
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
  const [actionKind, setActionKind] = useState<
    "approve" | "reject" | "return" | null
  >(null);

  const busy =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    returnMutation.isPending;

  const statusSlot = (
    <div className="flex min-w-0 flex-col gap-1 leading-none">
      <span className="inline-flex self-start">
        <BorrowStatusBadge status={request.status} />
      </span>
      <BorrowLifecycleDates
        status={request.status}
        createdAt={request.createdAt}
        borrowDate={request.borrowDate}
        updatedAt={request.updatedAt}
        dueDate={request.dueDate}
        returnDate={request.returnDate}
      />
    </div>
  );

  const fineDisplay = request.fineAmount
    ? `$${Number(request.fineAmount).toFixed(2)}`
    : "$0.00";

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
                onClick={() => {
                  setActionKind("approve");
                  approveMutation.mutate(
                    {
                      recordId: request.id,
                      bookTitle: request.bookTitle || undefined,
                      userName: request.userName || undefined,
                      decisionActor,
                    },
                    { onSettled: () => setActionKind(null) },
                  );
                }}
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
                onClick={() => {
                  setActionKind("reject");
                  rejectMutation.mutate(
                    {
                      recordId: request.id,
                      bookTitle: request.bookTitle || undefined,
                      userName: request.userName || undefined,
                    },
                    { onSettled: () => setActionKind(null) },
                  );
                }}
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
              onClick={() => {
                setActionKind("return");
                returnMutation.mutate(
                  {
                    recordId: request.id,
                    bookTitle: request.bookTitle || undefined,
                    decisionActor,
                  },
                  { onSettled: () => setActionKind(null) },
                );
              }}
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
          hint="Lifecycle state"
        >
          <div className="min-w-0">{statusSlot}</div>
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
        <div className="admin-panel space-y-3">
          <TicketSectionHeader
            icon={<BookOpen className="size-4" />}
            title="Book"
            subtitle="Catalog identity"
          />
          <AdminBookIdentityCell
            bookId={request.bookId}
            title={request.bookTitle}
            author={request.bookAuthor}
            coverUrl={request.bookCoverUrl}
            coverColor={request.bookCoverColor}
            genre={request.bookGenre}
            rating={request.bookRating}
            className="items-start"
          />
        </div>

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

      {(request.approvedByActor ||
        request.returnedByActor ||
        request.borrowedBy ||
        request.returnedBy) && (
        <div className="admin-panel space-y-4">
          <TicketSectionHeader
            icon={<CheckCircle className="size-4" />}
            title="Lifecycle actors"
            subtitle="Approver and returner attribution"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          </div>
        </div>
      )}

      {request.notes ? (
        <div className="admin-panel space-y-2">
          <TicketSectionHeader
            icon={<BookOpen className="size-4" />}
            title="Notes"
            subtitle="Internal borrow notes"
          />
          <p className="whitespace-pre-wrap text-sm text-gray-700">
            {request.notes}
          </p>
        </div>
      ) : null}
    </section>
  );
}
