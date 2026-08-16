/**
 * LIGHT_ALERT confirm before create/update book — ReviewBookIdentity DNA +
 * settle-until-densify (block dismiss, Loader2) like DeleteBookDialog.
 * Parent: REQ-0033 book form UI polish
 */
"use client";


import { Loader2, Plus, Save } from "lucide-react";
import ReviewBookIdentity from "@/components/reviews/ReviewBookIdentity";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LIGHT_ALERT } from "@/lib/ui/glassActionChrome";
import { cn } from "@/lib/utils";

export type BookFormConfirmPreview = {
  title: string;
  author: string;
  genre: string;
  rating: number;
  coverUrl: string;
  coverColor: string;
};

export function BookFormConfirmDialog({
  open,
  onOpenChange,
  mode,
  preview,
  isPending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "update";
  preview: BookFormConfirmPreview;
  isPending: boolean;
  onConfirm: () => void;
}) {
  const isCreate = mode === "create";

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        // Block dismiss while mutation + book.write densify in flight.
        if (isPending && !next) return;
        onOpenChange(next);
      }}
    >
      <AlertDialogContent className={LIGHT_ALERT.content}>
        <AlertDialogHeader>
          <AlertDialogTitle className={LIGHT_ALERT.title}>
            {isCreate
              ? "Add this book to the library?"
              : "Save changes to this book?"}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className={cn("space-y-2", LIGHT_ALERT.description)}>
              <p>
                {isCreate
                  ? "Creates the catalog title and densifies admin + public views."
                  : "Updates catalog fields and densifies admin + public views."}
              </p>
              <div className={LIGHT_ALERT.preview}>
                <ReviewBookIdentity
                  variant="light"
                  showMeta
                  catalogRatingMode="number"
                  title={preview.title || "Untitled"}
                  author={preview.author || "—"}
                  genre={preview.genre || null}
                  bookRating={preview.rating || null}
                  coverUrl={preview.coverUrl || null}
                  coverColor={preview.coverColor || null}
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className={LIGHT_ALERT.footer}>
          <AlertDialogCancel
            type="button"
            disabled={isPending}
            className={LIGHT_ALERT.cancel}
          >
            Cancel
          </AlertDialogCancel>
          <Button
            type="button"
            disabled={isPending}
            className={LIGHT_ALERT.confirm}
            onClick={() => {
              onConfirm();
            }}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : isCreate ? (
              <Plus className="size-4" aria-hidden />
            ) : (
              <Save className="size-4" aria-hidden />
            )}
            {isPending
              ? isCreate
                ? "Adding book…"
                : "Updating book…"
              : isCreate
                ? "Add Book to Library"
                : "Update Book"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
