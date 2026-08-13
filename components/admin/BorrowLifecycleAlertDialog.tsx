/**
 * LIGHT_ALERT confirm for Borrow Queue Approve / Reject / Mark Returned.
 * DNA: ModerateReviewAlertDialog + My Profile settle-until-done (preventDefault,
 * block dismiss while pending, spinner on primary).
 * Parent: borrow actor flash fix + lifecycle AlertDialogs
 */
"use client";

import { CheckCircle, Loader2, Undo2, XCircle } from "lucide-react";
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
import { cn } from "@/lib/utils";
import type { BorrowRecordWithDetails } from "@/lib/services/borrows";

export type BorrowLifecycleConfirmKind = "approve" | "reject" | "return";

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
  onConfirm: () => void;
}) {
  const copy = kind ? COPY[kind] : null;
  const Icon = copy?.Icon ?? CheckCircle;

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
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <BorrowStatusBadge status={request.status} />
                  </div>
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
              onConfirm();
            }}
          >
            {isPending ? (
              <Loader2 className="size-3.5 animate-spin sm:size-4" />
            ) : (
              <Icon className="size-3.5 sm:size-4" />
            )}
            {isPending ? (copy?.pending ?? "Working…") : (copy?.confirm ?? "Confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
