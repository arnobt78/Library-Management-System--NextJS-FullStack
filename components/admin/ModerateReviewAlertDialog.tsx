/**
 * LIGHT_ALERT confirm before Approve / Reject — detail buttons + list kebab.
 * Dynamic title/copy; preventDefault until mutate settles (no accidental dismiss).
 * Parent: CR-0003 / review detail redesign
 */
"use client";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";
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
import StarRow from "@/components/ui/StarRow";
import { LIGHT_ALERT } from "@/lib/ui/glassActionChrome";
import { cn } from "@/lib/utils";

export type ModerateReviewTargetStatus = "APPROVED" | "REJECTED";

export function ModerateReviewAlertDialog({
  open,
  onOpenChange,
  status,
  bookTitle,
  comment,
  rating,
  isPending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Null while closed — dialog body stays stable when animating out */
  status: ModerateReviewTargetStatus | null;
  bookTitle: string;
  comment: string;
  rating: number;
  isPending: boolean;
  onConfirm: () => void;
}) {
  const isApprove = status === "APPROVED";
  const verb = isApprove ? "Approve" : "Reject";
  const pendingVerb = isApprove ? "Approving…" : "Rejecting…";

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        // Block dismiss while mutation in flight (same as delete confirms).
        if (isPending && !next) return;
        onOpenChange(next);
      }}
    >
      <AlertDialogContent className={LIGHT_ALERT.content}>
        <AlertDialogHeader>
          <AlertDialogTitle className={LIGHT_ALERT.title}>
            {verb} review of &ldquo;{bookTitle}&rdquo;?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className={`space-y-2 ${LIGHT_ALERT.description}`}>
              <p>
                {isApprove
                  ? "This makes the review visible on the public book page."
                  : "This rejects the review so it stays out of the public book page."}
              </p>
              <div className={LIGHT_ALERT.preview}>
                <StarRow
                  rating={rating}
                  starClassName="size-4"
                  filledClassName="fill-yellow-400 text-yellow-400"
                  emptyClassName="fill-gray-300 text-gray-300"
                />
                <p className="mt-1.5 line-clamp-3 text-sm">{comment}</p>
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
            disabled={isPending || !status}
            className={cn(
              "w-full gap-1.5 text-xs text-white sm:w-auto sm:text-sm",
              isApprove
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-amber-600 hover:bg-amber-700",
            )}
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
          >
            {isPending ? (
              <Loader2 className="size-3.5 animate-spin sm:size-4" />
            ) : isApprove ? (
              <CheckCircle2 className="size-3.5 sm:size-4" />
            ) : (
              <XCircle className="size-3.5 sm:size-4" />
            )}
            {isPending ? pendingVerb : `${verb} review`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
