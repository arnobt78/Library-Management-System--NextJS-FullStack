/**
 * Hard-delete book confirm — title + ADMIN_DELETE_SECRET (server-verified).
 * Preview uses ReviewBookIdentity DNA (cover · title · author · genre · rating).
 * Default trigger is native LIGHT_GLASS_CTA delete (same h-8 as Cancel/Edit).
 * Custom `trigger` kept for kebab menus.
 * LIGHT_ALERT settle DNA: dialog stays open with Loader2 until book.write densify
 * finishes (success → close + push; error → stay open, toast from useDeleteBook).
 * Pass catalog snapshot fields so Overview KPIs densify when RQ cache is thin.
 * Parent: Delete settle UX + book densify closeout
 */
"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { useDeleteBook } from "@/hooks/useMutations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import ReviewBookIdentity from "@/components/reviews/ReviewBookIdentity";
import { LIGHT_ALERT, LIGHT_GLASS_CTA } from "@/lib/ui/glassActionChrome";
import { cn } from "@/lib/utils";
import type { AdminStatsBookSnapshot } from "@/lib/utils/patchAdminStatsCaches";

interface DeleteBookDialogProps {
  bookId: string;
  bookTitle: string;
  /** Optional catalog DNA for LIGHT_ALERT preview (falls back to title-only strip). */
  author?: string | null;
  coverUrl?: string | null;
  coverColor?: string | null;
  genre?: string | null;
  rating?: number | null;
  isActive?: boolean | null;
  totalCopies?: number | null;
  availableCopies?: number | null;
  language?: string | null;
  publicationYear?: number | string | null;
  isbn?: string | null;
  publisher?: string | null;
  pageCount?: number | null;
  /** Optional trigger button className override (default Delete button). */
  triggerClassName?: string;
  /** Custom trigger (e.g. kebab DropdownMenuItem); default is red Delete button. */
  trigger?: ReactNode;
  /** After densify settle, soft-nav here (catalog list / edit parent). */
  redirectTo?: string;
}

const DeleteBookDialog = ({
  bookId,
  bookTitle,
  author,
  coverUrl,
  coverColor,
  genre,
  rating,
  isActive,
  totalCopies,
  availableCopies,
  language,
  publicationYear,
  isbn,
  publisher,
  pageCount,
  triggerClassName,
  trigger,
  redirectTo,
}: DeleteBookDialogProps) => {
  const router = useRouter();
  const deleteBookMutation = useDeleteBook();
  const [open, setOpen] = useState(false);
  const [titleConfirm, setTitleConfirm] = useState("");
  const [deleteSecret, setDeleteSecret] = useState("");
  // Keep overlay spinner through soft-nav away from detail (avoid 404 flash).
  const [isNavigating, setIsNavigating] = useState(false);

  const isPending = deleteBookMutation.isPending || isNavigating;
  const titleMatches = titleConfirm.trim() === bookTitle.trim();
  const canSubmit =
    titleMatches && deleteSecret.length > 0 && !isPending;

  /** Thin KPI snapshot for densify when detail/list cache miss. */
  const deleteSnapshot = (): AdminStatsBookSnapshot => ({
    id: bookId,
    title: bookTitle,
    author: author ?? null,
    coverUrl: coverUrl ?? null,
    coverColor: coverColor ?? null,
    genre: genre ?? null,
    rating: typeof rating === "number" ? rating : null,
    isActive: typeof isActive === "boolean" ? isActive : true,
    totalCopies: typeof totalCopies === "number" ? totalCopies : null,
    availableCopies:
      typeof availableCopies === "number" ? availableCopies : null,
    language: language ?? null,
    publicationYear: publicationYear ?? null,
    isbn: isbn ?? null,
    publisher: publisher ?? null,
    pageCount: typeof pageCount === "number" ? pageCount : null,
  });

  const handleDelete = async () => {
    if (!canSubmit) return;

    try {
      // Await densify (commitMutationCache inside useDeleteBook onSuccess).
      await deleteBookMutation.mutateAsync({
        bookIds: [bookId],
        bookTitle,
        deleteSecret,
        snapshots: [deleteSnapshot()],
      });
      setTitleConfirm("");
      setDeleteSecret("");
      // Navigate while dialog still open — detail unmounts under overlay (no 404).
      if (redirectTo) {
        setIsNavigating(true);
        router.replace(redirectTo);
        return;
      }
      setOpen(false);
    } catch {
      // Toast from useDeleteBook; keep dialog open with fields intact.
      setIsNavigating(false);
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        // Block dismiss while mutation + densify in flight.
        if (isPending && !next) return;
        setOpen(next);
        if (!next) {
          setTitleConfirm("");
          setDeleteSecret("");
        }
      }}
    >
      <AlertDialogTrigger asChild>
        {trigger ?? (
          <button
            type="button"
            className={cn(
              LIGHT_GLASS_CTA.host,
              LIGHT_GLASS_CTA.delete,
              triggerClassName,
            )}
          >
            <Trash2 aria-hidden />
            Delete
          </button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent className={LIGHT_ALERT.content}>
        <AlertDialogHeader>
          <AlertDialogTitle className={LIGHT_ALERT.title}>
            Hard-delete this book?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className={cn("space-y-2", LIGHT_ALERT.description)}>
              <p>
                This permanently removes &quot;{bookTitle}&quot; and related
                reviews/borrow history. Active borrows block deletion. Type the
                exact title and your ADMIN_DELETE_SECRET to confirm.
              </p>
              <div className={LIGHT_ALERT.preview}>
                <ReviewBookIdentity
                  variant="light"
                  showMeta
                  catalogRatingMode="number"
                  title={bookTitle}
                  author={author}
                  coverUrl={coverUrl}
                  coverColor={coverColor}
                  genre={genre}
                  bookRating={rating}
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-2">
          <div className="space-y-1.5">
            <label
              htmlFor={`delete-title-${bookId}`}
              className="text-sm font-medium text-dark-500"
            >
              Type book title to confirm
            </label>
            <Input
              id={`delete-title-${bookId}`}
              value={titleConfirm}
              onChange={(e) => setTitleConfirm(e.target.value)}
              placeholder={bookTitle}
              autoComplete="off"
              disabled={isPending}
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor={`delete-secret-${bookId}`}
              className="text-sm font-medium text-dark-500"
            >
              ADMIN_DELETE_SECRET
            </label>
            <Input
              id={`delete-secret-${bookId}`}
              type="password"
              value={deleteSecret}
              onChange={(e) => setDeleteSecret(e.target.value)}
              placeholder="Enter delete secret"
              autoComplete="off"
              disabled={isPending}
            />
          </div>
        </div>

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
            variant="destructive"
            disabled={!canSubmit}
            className={LIGHT_ALERT.destructive}
            onClick={() => {
              void handleDelete();
            }}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="size-4" aria-hidden />
            )}
            {isPending ? "Deleting..." : "Delete Permanently"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteBookDialog;
