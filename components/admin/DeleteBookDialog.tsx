/**
 * Hard-delete book confirm — title + ADMIN_DELETE_SECRET (server-verified).
 * LIGHT_ALERT settle DNA: dialog stays open with Loader2 until book.write densify
 * finishes (success → close + push; error → stay open, toast from useDeleteBook).
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
import { LIGHT_ALERT } from "@/lib/ui/glassActionChrome";
import { cn } from "@/lib/utils";

interface DeleteBookDialogProps {
  bookId: string;
  bookTitle: string;
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
  triggerClassName,
  trigger,
  redirectTo,
}: DeleteBookDialogProps) => {
  const router = useRouter();
  const deleteBookMutation = useDeleteBook();
  const [open, setOpen] = useState(false);
  const [titleConfirm, setTitleConfirm] = useState("");
  const [deleteSecret, setDeleteSecret] = useState("");

  const isPending = deleteBookMutation.isPending;
  const titleMatches = titleConfirm.trim() === bookTitle.trim();
  const canSubmit =
    titleMatches && deleteSecret.length > 0 && !isPending;

  const handleDelete = async () => {
    if (!canSubmit) return;

    try {
      // Await densify (commitMutationCache inside useDeleteBook onSuccess).
      await deleteBookMutation.mutateAsync({
        bookIds: [bookId],
        bookTitle,
        deleteSecret,
      });
      setTitleConfirm("");
      setDeleteSecret("");
      setOpen(false);
      // Densify already patched RQ list/KPIs — push without router.refresh flash.
      if (redirectTo) {
        router.push(redirectTo);
      }
    } catch {
      // Toast from useDeleteBook; keep dialog open with fields intact.
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
          <Button
            size="sm"
            variant="destructive"
            className={triggerClassName}
            type="button"
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
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
                <p className="line-clamp-2 text-sm font-medium text-dark-400">
                  {bookTitle}
                </p>
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
