"use client";

/**
 * DeleteBookDialog
 *
 * Hard-delete confirmation requiring:
 * 1) Exact book title typed
 * 2) ADMIN_DELETE_SECRET typed (verified server-side only)
 *
 * On success: React Query invalidation (via useDeleteBook) + router.refresh().
 */

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
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
import { Trash2 } from "lucide-react";

interface DeleteBookDialogProps {
  bookId: string;
  bookTitle: string;
  /** Optional trigger button className override (default Delete button). */
  triggerClassName?: string;
  /** Custom trigger (e.g. kebab DropdownMenuItem); default is red Delete button. */
  trigger?: ReactNode;
  /** After delete, navigate here (e.g. edit page → /admin/books) */
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

  const titleMatches = titleConfirm.trim() === bookTitle.trim();
  const canSubmit =
    titleMatches && deleteSecret.length > 0 && !deleteBookMutation.isPending;

  const handleDelete = () => {
    if (!canSubmit) return;

    deleteBookMutation.mutate(
      {
        bookIds: [bookId],
        bookTitle,
        deleteSecret,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setTitleConfirm("");
          setDeleteSecret("");
          router.refresh();
          if (redirectTo) {
            router.push(redirectTo);
          }
        },
      },
    );
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
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
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hard-delete this book?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes &quot;{bookTitle}&quot; and related
            reviews/borrow history. Active borrows block deletion. Type the
            exact title and your ADMIN_DELETE_SECRET to confirm.
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
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={!canSubmit}
            onClick={handleDelete}
          >
            <Trash2 className="size-4" />
            {deleteBookMutation.isPending
              ? "Deleting..."
              : "Delete Permanently"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteBookDialog;
