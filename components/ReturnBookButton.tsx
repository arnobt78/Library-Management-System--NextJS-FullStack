"use client";

/**
 * ReturnBookButton — confirm via GLASS_ALERT (cover preview), then useReturnBook.
 * Dialog stays open with spinner until mutate settles (Cancel Request parity).
 */

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import BookCover from "@/components/BookCover";
import { Badge } from "@/components/ui/badge";
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
import { Library, Loader2, RotateCcw, Star } from "lucide-react";
import { useReturnBook } from "@/hooks/useMutations";
import { GLASS_ALERT } from "@/lib/ui/glassActionChrome";
import { BorrowLifecycleDates } from "@/components/admin/BorrowLifecycleDates";
import { BorrowStatusBadge } from "@/lib/ui/semanticBadges";

interface Props {
  recordId: string;
  bookTitle: string;
  dueDate: Date | null;
  bookCoverUrl?: string | null;
  bookCoverColor?: string | null;
  bookAuthor?: string | null;
  bookGenre?: string | null;
  bookRating?: number | null;
  status?: "PENDING" | "BORROWED" | "RETURNED" | "CANCELLED" | string;
  createdAt?: Date | string | null;
  borrowDate?: Date | string | null;
  updatedAt?: Date | string | null;
  returnDate?: Date | string | null;
}

const ReturnBookButton = ({
  recordId,
  bookTitle,
  dueDate,
  bookCoverUrl,
  bookCoverColor,
  bookAuthor,
  bookGenre,
  bookRating,
  status = "BORROWED",
  createdAt,
  borrowDate,
  updatedAt,
  returnDate,
}: Props) => {
  const returnBookMutation = useReturnBook();
  const isPending = returnBookMutation.isPending;
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleConfirmReturn = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isPending) return;
    returnBookMutation.mutate(
      {
        recordId,
        bookTitle,
      },
      {
        onSettled: () => {
          setConfirmOpen(false);
        },
        onError: (error) => {
          console.error("[ReturnBookButton] Mutation error:", error);
        },
      },
    );
  };

  const today = new Date();
  const isOverdue = dueDate && today > new Date(dueDate);
  const daysOverdue = isOverdue
    ? Math.floor(
        (today.getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24),
      )
    : 0;

  return (
    <>
      <Button
        className={`hover:bg-primary/90 mt-3 min-h-12 w-full bg-primary text-dark-100 sm:mt-4 sm:min-h-14 sm:w-fit ${isOverdue ? "bg-red-600 hover:bg-red-700" : "bg-orange-600 hover:bg-orange-700"}`}
        onClick={() => setConfirmOpen(true)}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin text-dark-100 sm:size-5" />
        ) : (
          <RotateCcw className="size-4 text-dark-100 sm:size-5" />
        )}
        <p className="font-bebas-neue text-base text-dark-100 sm:text-xl">
          {isPending
            ? "Returning…"
            : isOverdue
              ? `Return Book (${daysOverdue} days overdue)`
              : "Return Book"}
        </p>
      </Button>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (isPending) return;
          setConfirmOpen(open);
        }}
      >
        <AlertDialogContent className={GLASS_ALERT.content}>
          <AlertDialogHeader>
            <AlertDialogTitle className={GLASS_ALERT.title}>
              Return this book?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className={`space-y-2 ${GLASS_ALERT.description}`}>
                <p>
                  Mark this loan as returned. The copy will go back into
                  circulation (or the next hold in queue).
                </p>
                <div className={`flex gap-3 ${GLASS_ALERT.preview}`}>
                  <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded sm:h-28 sm:w-20">
                    <BookCover
                      variant="small"
                      coverColor={bookCoverColor ?? "#1e293b"}
                      coverImage={bookCoverUrl ?? ""}
                      className="size-full"
                    />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div>
                      <p className="line-clamp-2 text-sm font-medium text-light-100">
                        {bookTitle}
                      </p>
                      {bookAuthor ? (
                        <p className="mt-1 text-xs text-light-200">
                          by {bookAuthor}
                        </p>
                      ) : null}
                      {(bookGenre || bookRating != null) && (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {bookGenre ? (
                            <Badge
                              variant="glassGenre"
                              className="px-1.5 py-0.5 sm:px-2"
                            >
                              <Library className="size-3" />
                              {bookGenre}
                            </Badge>
                          ) : null}
                          {bookRating != null ? (
                            <div className="flex items-center gap-1">
                              <Star className="size-3 fill-current text-yellow-400 sm:size-4" />
                              <span className="text-xs text-yellow-400 sm:text-sm">
                                {bookRating}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                    <BorrowStatusBadge status={status} variant="dark" />
                    <BorrowLifecycleDates
                      status={status}
                      createdAt={createdAt}
                      borrowDate={borrowDate}
                      updatedAt={updatedAt}
                      dueDate={dueDate}
                      returnDate={returnDate}
                      variant="dark"
                      className="mt-0"
                    />
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={GLASS_ALERT.footer}>
            <AlertDialogCancel
              disabled={isPending}
              className={GLASS_ALERT.cancel}
            >
              Keep borrowed
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReturn}
              disabled={isPending}
              className={GLASS_ALERT.destructive}
            >
              {isPending ? (
                <Loader2 className="size-3.5 animate-spin sm:size-4" />
              ) : (
                <RotateCcw className="size-3.5 sm:size-4" />
              )}
              {isPending ? "Returning…" : "Return Book"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ReturnBookButton;
