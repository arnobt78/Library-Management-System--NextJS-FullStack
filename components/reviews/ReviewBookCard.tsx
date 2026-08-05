/**
 * ReviewBookCard — My Reviews densified list card.
 * Layout: cover+title/author | kebab → genre/rating/borrow meta →
 * inner bordered body (stars+status, comment, dates/moderator).
 * Parent: CR-0003 / REQ-0035 polish
 */

"use client";

import { useState } from "react";
import {
  Calendar,
  Clock,
  Library,
  Loader2,
  MoreVertical,
  Pencil,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useDeleteReview } from "@/hooks/useMutations";
import ReviewFormDialog from "@/components/ReviewFormDialog";
import ReviewBookIdentity from "@/components/reviews/ReviewBookIdentity";
import ReviewDateMeta from "@/components/reviews/ReviewDateMeta";
import PersonAttribution from "@/components/PersonAttribution";
import StarRow from "@/components/ui/StarRow";
import { Badge } from "@/components/ui/badge";
import { ReviewStatusBadge } from "@/lib/ui/semanticBadges";
import { formatBorrowDate } from "@/lib/profile/formatBorrowDates";
import { GLASS_ALERT, GLASS_MENU } from "@/lib/ui/glassActionChrome";
import { cn } from "@/lib/utils";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ReviewBookCard({
  review,
}: {
  review: AdminBookReviewItem;
}) {
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteMutation = useDeleteReview();

  const borrowedLabel = formatBorrowDate(review.borrowedAt);
  const dueLabel = formatBorrowDate(review.dueDate);
  const returnedLabel = formatBorrowDate(review.returnedAt);
  const hasBorrowMeta = Boolean(borrowedLabel || dueLabel || returnedLabel);

  const moderator =
    review.reviewedByName || review.reviewedByEmail
      ? {
          id: review.reviewedBy,
          fullName: review.reviewedByName || "an admin",
          email: review.reviewedByEmail || "",
          universityCard: review.reviewedByUniversityCard,
        }
      : null;

  return (
    <div role="article" className="profile-borrow-row">
      <div className="p-2.5 text-light-100 sm:p-3">
        {/* Header: cover + title/author stack ‖ kebab (book-detail parity) */}
        <div className="flex items-start justify-between gap-3">
          <ReviewBookIdentity
            title={review.bookTitle}
            author={review.bookAuthor}
            coverUrl={review.bookCoverUrl}
            coverColor={review.bookCoverColor}
            bookId={review.bookId}
            className="min-w-0 flex-1"
          />

          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Review actions"
                className={GLASS_MENU.trigger}
              >
                <MoreVertical className="size-4 sm:size-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className={GLASS_MENU.content}>
              <DropdownMenuItem
                className={GLASS_MENU.item}
                onSelect={() => setEditing(true)}
              >
                <Pencil className="size-3.5 sm:size-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className={GLASS_MENU.itemDestructive}
                onSelect={() => setDeleteOpen(true)}
              >
                <Trash2 className="size-3.5 sm:size-4" />
                Delete
              </DropdownMenuItem>
              <DropdownMenuSeparator className={GLASS_MENU.separator} />
              <DropdownMenuItem className={GLASS_MENU.item}>
                <X className="size-3.5 sm:size-4" />
                Cancel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Meta: genre · catalog rating · borrow dates */}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs sm:gap-3 sm:text-sm">
          {review.bookGenre ? (
            <Badge variant="glassGenre" className="px-1.5 py-0.5 sm:px-2">
              <Library className="size-3" aria-hidden />
              {review.bookGenre}
            </Badge>
          ) : null}
          {review.bookRating > 0 ? (
            <div className="flex items-center gap-1">
              <Star className="size-3 fill-current text-yellow-400 sm:size-4" />
              <span className="text-yellow-400">{review.bookRating}</span>
            </div>
          ) : null}
          {hasBorrowMeta ? (
            <>
              {borrowedLabel ? (
                <span className="inline-flex items-center gap-1 text-light-200">
                  <Calendar className="size-3 text-blue-400 sm:size-4" />
                  <span className="font-medium">Borrowed:</span>
                  <span className="text-light-100">{borrowedLabel}</span>
                </span>
              ) : null}
              {dueLabel ? (
                <span className="inline-flex items-center gap-1 text-light-200">
                  <Clock className="size-3 text-purple-400 sm:size-4" />
                  <span className="font-medium">Due:</span>
                  <span className="text-light-100">{dueLabel}</span>
                </span>
              ) : null}
              {returnedLabel ? (
                <span className="inline-flex items-center gap-1 text-light-200">
                  <Calendar className="size-3 text-emerald-400 sm:size-4" />
                  <span className="font-medium">Returned:</span>
                  <span className="text-light-100">{returnedLabel}</span>
                </span>
              ) : null}
            </>
          ) : null}
        </div>

        {/* Inner body: review stars + status, comment, timestamps */}
        <div className="mt-2 space-y-2 rounded-lg border border-white/10 bg-dark-300/40 p-2">
          <div className="flex flex-wrap items-center gap-2">
            <StarRow
              rating={review.rating}
              starClassName="size-3.5 sm:size-4"
              filledClassName="fill-yellow-400 text-yellow-400"
              emptyClassName="fill-gray-300 text-gray-300"
              className="shrink-0"
            />
            <ReviewStatusBadge status={review.status} variant="dark" />
          </div>

          <p className="text-sm text-light-200 sm:text-base">{review.comment}</p>

          <div className="space-y-1.5">
            <ReviewDateMeta
              createdAt={review.createdAt}
              updatedAt={review.updatedAt}
              reviewedAt={review.reviewedAt}
              status={review.status}
              variant="dark"
            />
            {moderator && review.status !== "PENDING" ? (
              <PersonAttribution
                person={moderator}
                prefix={
                  review.status === "APPROVED" ? "Approved by" : "Rejected by"
                }
                layout="inline"
                variant="dark"
                size={28}
              />
            ) : null}
          </div>
        </div>
      </div>

      {editing ? (
        <ReviewFormDialog
          mode="edit"
          bookId={review.bookId}
          bookTitle={review.bookTitle}
          bookCoverUrl={review.bookCoverUrl}
          bookCoverColor={review.bookCoverColor}
          bookAuthor={review.bookAuthor}
          bookGenre={review.bookGenre}
          bookRating={review.bookRating}
          reviewId={review.id}
          initialRating={review.rating}
          initialComment={review.comment}
          isOpen
          onClose={() => setEditing(false)}
          onReviewSaved={() => setEditing(false)}
          userId={review.userId}
        />
      ) : null}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className={GLASS_ALERT.content}>
          <AlertDialogHeader>
            <AlertDialogTitle className={GLASS_ALERT.title}>
              Delete review for &ldquo;{review.bookTitle}&rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className={cn("space-y-2", GLASS_ALERT.description)}>
                <p>
                  This permanently removes your review. This action cannot be
                  undone.
                </p>
                <div className={GLASS_ALERT.preview}>
                  <StarRow
                    rating={review.rating}
                    starClassName="size-4"
                    filledClassName="fill-yellow-400 text-yellow-400"
                    emptyClassName="fill-gray-300 text-gray-300"
                  />
                  <p className="mt-1.5 line-clamp-3 text-sm text-light-100">
                    {review.comment}
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={GLASS_ALERT.footer}>
            <AlertDialogCancel
              disabled={deleteMutation.isPending}
              className={GLASS_ALERT.cancel}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              className={GLASS_ALERT.destructive}
              onClick={(e) => {
                e.preventDefault();
                deleteMutation.mutate(
                  {
                    reviewId: review.id,
                    bookId: review.bookId,
                    bookTitle: review.bookTitle,
                    userId: review.userId,
                  },
                  { onSuccess: () => setDeleteOpen(false) },
                );
              }}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin sm:size-4" />
              ) : (
                <Trash2 className="size-3.5 sm:size-4" />
              )}
              {deleteMutation.isPending ? "Deleting…" : "Delete review"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
