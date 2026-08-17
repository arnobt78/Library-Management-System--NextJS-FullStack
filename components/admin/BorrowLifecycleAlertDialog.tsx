/**
 * LIGHT_ALERT confirm for Borrow Queue Approve / Reject / Mark Returned.
 * All kinds show Available/Total (+ Waiting holds when > 0) for admin awareness;
 * Reject is info-only (soft-cancel — no inventory mutation).
 * Genre chip + catalog star match AdminBookIdentityCell DNA under author.
 * DNA: ModerateReviewAlertDialog + settle-until-done.
 * Parent: dialog DNA + kebab polish
 */
"use client";

import { CheckCircle, Loader2, Star, Undo2, XCircle } from "lucide-react";
import { useState } from "react";
import BookCover from "@/components/BookCover";
import PersonAttribution from "@/components/PersonAttribution";
import { BorrowLifecycleDates } from "@/components/admin/BorrowLifecycleDates";
import { BorrowStatusBadge } from "@/lib/ui/semanticBadges";
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
import { LIGHT_ALERT } from "@/lib/ui/glassActionChrome";
import { OverviewGenreChip } from "@/lib/ui/overviewGenreChip";
import { cn } from "@/lib/utils";
import { useBook } from "@/hooks/useQueries";
import type { BorrowRecordWithDetails } from "@/lib/services/borrows";

export type BorrowLifecycleConfirmKind =
  | "approve"
  | "reject"
  | "return"
  | "fine-free-return";

const COPY: Record<
  BorrowLifecycleConfirmKind,
  {
    title: string;
    body: string;
    confirm: string;
    pending: string;
    actionClass: string;
    Icon: typeof CheckCircle;
  }
> = {
  approve: {
    title: "Approve this borrow request?",
    body: "Marks the request borrowed and decrements available copies.",
    confirm: "Approve",
    pending: "Approving…",
    actionClass: "bg-emerald-600 hover:bg-emerald-700",
    Icon: CheckCircle,
  },
  reject: {
    title: "Reject this borrow request?",
    body: "Soft-cancels the pending request. The row stays in Borrow Queue history.",
    confirm: "Reject",
    pending: "Rejecting…",
    actionClass: "bg-rose-600 hover:bg-rose-700",
    Icon: XCircle,
  },
  return: {
    title: "Mark this book returned?",
    body: "Closes the loan and returns the copy to circulation (or the next hold).",
    confirm: "Mark Returned",
    pending: "Marking returned…",
    actionClass: "bg-emerald-600 hover:bg-emerald-700",
    Icon: Undo2,
  },
  "fine-free-return": {
    title: "Fine-free return?",
    body: "Closes the loan with a waived $0.00 fine. Inventory returns to circulation.",
    confirm: "Fine-Free Return",
    pending: "Returning…",
    actionClass: "bg-sky-700 hover:bg-sky-800",
    Icon: Undo2,
  },
};

export function BorrowLifecycleAlertDialog({
  open,
  onOpenChange,
  kind,
  request,
  isPending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: BorrowLifecycleConfirmKind | null;
  request: BorrowRecordWithDetails;
  isPending: boolean;
  onConfirm: (payload?: { reason?: string }) => void;
}) {
  const copy = kind ? COPY[kind] : null;
  const Icon = copy?.Icon ?? CheckCircle;
  const [reason, setReason] = useState("");
  const catalogRating =
    typeof request.bookRating === "number" ? request.bookRating : 0;

  // Densified books.detail preferred; SSR list/detail fields as fallback.
  // Open for all kinds (including Reject) so Available/Total is always visible.
  const { data: book } = useBook(open ? request.bookId : "", undefined);
  const available =
    book?.availableCopies ?? request.bookAvailableCopies ?? null;
  const total = book?.totalCopies ?? request.bookTotalCopies ?? null;
  const waitingHolds = request.bookWaitingHolds ?? 0;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (isPending && !next) return;
        onOpenChange(next);
      }}
    >
      <AlertDialogContent className={LIGHT_ALERT.content}>
        <AlertDialogHeader>
          <AlertDialogTitle className={LIGHT_ALERT.title}>
            {copy?.title ?? "Confirm borrow action?"}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className={cn("space-y-2", LIGHT_ALERT.description)}>
              <p>{copy?.body}</p>
              <div className={cn("flex gap-3", LIGHT_ALERT.preview)}>
                <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded sm:h-28 sm:w-20">
                  <BookCover
                    variant="small"
                    coverColor={request.bookCoverColor ?? "#1e293b"}
                    coverImage={request.bookCoverUrl ?? ""}
                    className="size-full"
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div>
                    <p className="line-clamp-2 text-sm font-medium text-dark-400">
                      {request.bookTitle}
                    </p>
                    {request.bookAuthor ? (
                      <p className="mt-0.5 text-xs text-gray-500">
                        by {request.bookAuthor}
                      </p>
                    ) : null}
                    {/* Table DNA: genre chip + catalog star under author */}
                    <div className="mt-0.5 flex flex-nowrap items-center gap-x-1.5 overflow-hidden">
                      <OverviewGenreChip
                        genre={request.bookGenre}
                        className="max-w-32 shrink-0 truncate px-1.5 py-0 text-[10px] sm:text-[10px]"
                      />
                      {catalogRating > 0 ? (
                        <span className="inline-flex shrink-0 items-center gap-0.5 text-[10px] tabular-nums text-amber-600">
                          <Star
                            className="size-2.5 fill-amber-400 text-amber-400"
                            aria-hidden
                          />
                          {catalogRating}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <BorrowStatusBadge status={request.status} />
                  </div>
                  {available != null && total != null ? (
                    <p className="text-xs text-gray-600">
                      Available{" "}
                      <span className="font-medium tabular-nums text-dark-400">
                        {available}
                      </span>
                      {" / Total "}
                      <span className="font-medium tabular-nums text-dark-400">
                        {total}
                      </span>
                      {waitingHolds > 0 ? (
                        <>
                          {" · Waiting holds "}
                          <span className="font-medium tabular-nums text-violet-700">
                            {waitingHolds}
                          </span>
                        </>
                      ) : null}
                    </p>
                  ) : null}
                  <PersonAttribution
                    person={{
                      id: request.userId,
                      fullName: request.userName,
                      email: request.userEmail,
                      universityCard: request.userUniversityCard ?? null,
                    }}
                    href={`/admin/users/${request.userId}`}
                    size={28}
                    layout="inline"
                  />
                  <BorrowLifecycleDates
                    status={request.status}
                    createdAt={request.createdAt}
                    borrowDate={request.borrowDate}
                    updatedAt={request.updatedAt}
                    dueDate={request.dueDate}
                    returnDate={request.returnDate}
                    className="mt-0"
                  />
                </div>
              </div>
              {kind === "fine-free-return" ? (
                <div className="space-y-1.5">
                  <label
                    htmlFor="fine-free-reason"
                    className="text-xs font-medium text-gray-600"
                  >
                    Reason (optional)
                  </label>
                  <textarea
                    id="fine-free-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    disabled={isPending}
                    rows={2}
                    className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm text-dark-400"
                    placeholder="e.g. goodwill waiver, equipment failure"
                  />
                </div>
              ) : null}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className={LIGHT_ALERT.footer}>
          <AlertDialogCancel
            disabled={isPending}
            className={LIGHT_ALERT.cancel}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending || !kind}
            className={cn(
              "w-full gap-1.5 text-xs text-white sm:w-auto sm:text-sm",
              copy?.actionClass ?? "bg-primary-admin hover:bg-primary-admin/90",
            )}
            onClick={(e) => {
              e.preventDefault();
              onConfirm(
                kind === "fine-free-return"
                  ? { reason: reason.trim() || undefined }
                  : undefined,
              );
            }}
          >
            {isPending ? (
              <Loader2 className="size-3.5 animate-spin sm:size-4" />
            ) : (
              <Icon className="size-3.5 sm:size-4" />
            )}
            {isPending
              ? (copy?.pending ?? "Working…")
              : (copy?.confirm ?? "Confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
