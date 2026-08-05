"use client";

/**
 * Book reviews list — portaled menu, shared ReviewFormDialog for edit,
 * university_card / Robohash avatars, optimistic RQ + review.write toasts.
 */

import React, { useMemo, useState } from "react";
import {
  CalendarArrowUp,
  CalendarCheck2,
  Loader2,
  MoreVertical,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { useDeleteReview } from "@/hooks/useMutations";
import UserAvatar from "@/components/UserAvatar";
import ReviewFormDialog from "@/components/ReviewFormDialog";
import StarRow from "@/components/ui/StarRow";
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
import { resolveActionBookTitle } from "@/lib/toast";
import { GLASS_ALERT, GLASS_MENU } from "@/lib/ui/glassActionChrome";
import type { Review } from "@/lib/services/reviews";

interface ReviewCardProps {
  review: Review;
  bookId: string;
  bookTitle: string;
  currentUserId?: string;
  onEdit: (review: Review) => void;
  onDeleteLocal: (reviewId: string) => void;
  onDeleteRollback: (reviewId: string) => void;
}

function truncateComment(comment: string, max = 120): string {
  const trimmed = comment.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function ReviewCard({
  review,
  bookId,
  bookTitle,
  currentUserId,
  onEdit,
  onDeleteLocal,
  onDeleteRollback,
}: ReviewCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteReviewMutation = useDeleteReview();
  const isDeleting = deleteReviewMutation.isPending;

  const isOwner = Boolean(currentUserId) && currentUserId === review.userId;
  const isEdited =
    review.createdAt &&
    review.updatedAt &&
    new Date(review.createdAt).getTime() !==
      new Date(review.updatedAt).getTime();

  const titleLabel = resolveActionBookTitle(bookTitle);

  const handleDeleteConfirm = (e: React.MouseEvent) => {
    // Prevent Radix AlertDialogAction from auto-closing before mutate settles
    e.preventDefault();
    onDeleteLocal(review.id);
    deleteReviewMutation.mutate(
      {
        reviewId: review.id,
        bookId,
        bookTitle,
      },
      {
        onSuccess: () => {
          setDeleteOpen(false);
        },
        onError: () => {
          onDeleteRollback(review.id);
        },
      },
    );
  };

  return (
    <div className="rounded-lg border border-gray-600 bg-gray-800/50 p-3 shadow-sm sm:p-4">
      <div className="flex flex-row items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <UserAvatar
                universityCard={review.universityCard}
                fullName={review.userFullName}
                email={review.userId}
                size={36}
                alt={`${review.userFullName} avatar`}
              />
              <h4 className="truncate text-sm font-medium text-light-100 sm:text-base">
                {review.userFullName}
              </h4>
            </div>
            <StarRow
              rating={review.rating}
              starClassName="size-3 sm:size-4"
              filledClassName="fill-yellow-400 text-yellow-400"
              emptyClassName="fill-gray-300 text-gray-300"
              className="flex items-center gap-0.5 sm:space-x-1"
            />
          </div>

          <p className="mt-2 text-sm text-light-200 sm:text-base">
            {review.comment}
          </p>

          <div className="mt-2 flex flex-col gap-1.5 text-[10px] sm:mt-3 sm:flex-row sm:items-center sm:justify-between sm:text-xs">
            <span className="inline-flex items-center gap-1.5 text-light-100">
              <CalendarCheck2 className="size-3.5 shrink-0 text-light-100 sm:size-4" />
              Created:{" "}
              {review.createdAt
                ? new Date(review.createdAt).toLocaleString()
                : "N/A"}
            </span>
            {isEdited && (
              <span className="inline-flex items-center gap-1.5 text-light-100">
                <CalendarArrowUp className="size-3.5 shrink-0 text-light-100 sm:size-4" />
                Edited:{" "}
                {review.updatedAt
                  ? new Date(review.updatedAt).toLocaleString()
                  : "N/A"}
              </span>
            )}
          </div>
        </div>

        {isOwner && (
          <>
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
                  onSelect={() => onEdit(review)}
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

            <AlertDialog
              open={deleteOpen}
              onOpenChange={(open) => {
                if (isDeleting) return;
                setDeleteOpen(open);
              }}
            >
              <AlertDialogContent className={GLASS_ALERT.content}>
                <AlertDialogHeader>
                  <AlertDialogTitle className={GLASS_ALERT.title}>
                    Delete review for &ldquo;{titleLabel}&rdquo;?
                  </AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className={`space-y-2 ${GLASS_ALERT.description}`}>
                      <p>
                        This permanently removes your review. This action cannot
                        be undone.
                      </p>
                      <div className={GLASS_ALERT.preview}>
                        <StarRow
                          rating={review.rating}
                          starClassName="size-4"
                          filledClassName="fill-yellow-400 text-yellow-400"
                          emptyClassName="fill-gray-300 text-gray-300"
                          className="flex items-center gap-0.5 sm:space-x-1"
                        />
                        <p className="mt-1.5 text-light-100">
                          {truncateComment(review.comment)}
                        </p>
                      </div>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className={GLASS_ALERT.footer}>
                  <AlertDialogCancel
                    disabled={isDeleting}
                    className={GLASS_ALERT.cancel}
                  >
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteConfirm}
                    disabled={isDeleting}
                    className={GLASS_ALERT.destructive}
                  >
                    {isDeleting ? (
                      <Loader2 className="size-3.5 animate-spin sm:size-4" />
                    ) : (
                      <Trash2 className="size-3.5 sm:size-4" />
                    )}
                    {isDeleting ? "Deleting…" : "Delete review"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>
    </div>
  );
}

interface ReviewsSectionProps {
  bookId: string;
  bookTitle: string;
  reviews: Review[];
  currentUserId?: string | null;
}

export default function ReviewsSection({
  bookId,
  bookTitle,
  reviews,
  currentUserId,
}: ReviewsSectionProps) {
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  // Optimistic patches merged over props — avoids stale-text flash without sync effect
  const [patches, setPatches] = useState<
    Record<string, { rating: number; comment: string; updatedAt: Date }>
  >({});
  const [removedIds, setRemovedIds] = useState<Record<string, true>>({});

  const localReviews = useMemo(
    () =>
      reviews
        .filter((r) => !removedIds[r.id])
        .map((r) => {
          const patch = patches[r.id];
          if (!patch) return r;
          return {
            ...r,
            rating: patch.rating,
            comment: patch.comment,
            updatedAt: patch.updatedAt,
          };
        }),
    [reviews, patches, removedIds],
  );

  const handleReviewEdit = (review: Review) => {
    setEditingReview(review);
  };

  const handleReviewDeleteLocal = (reviewId: string) => {
    setRemovedIds((prev) => ({ ...prev, [reviewId]: true }));
  };

  const handleReviewDeleteRollback = (reviewId: string) => {
    setRemovedIds((prev) => {
      const next = { ...prev };
      delete next[reviewId];
      return next;
    });
  };

  const handleReviewSaved = (updated: {
    reviewId: string;
    rating: number;
    comment: string;
  }) => {
    setPatches((prev) => ({
      ...prev,
      [updated.reviewId]: {
        rating: updated.rating,
        comment: updated.comment,
        updatedAt: new Date(),
      },
    }));
    setEditingReview(null);
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <h3 className="text-base font-semibold text-light-100 sm:text-lg">
        Reviews ({localReviews.length})
      </h3>

      {localReviews.length === 0 ? (
        <div className="rounded-lg border border-gray-600 bg-gray-800/30 p-4 text-center sm:p-8">
          <p className="text-sm text-light-200/70 sm:text-base">
            No reviews yet. Be the first to review this book!
          </p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {localReviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              bookId={bookId}
              bookTitle={bookTitle}
              currentUserId={currentUserId || undefined}
              onEdit={handleReviewEdit}
              onDeleteLocal={handleReviewDeleteLocal}
              onDeleteRollback={handleReviewDeleteRollback}
            />
          ))}
        </div>
      )}

      {editingReview ? (
        <ReviewFormDialog
          key={editingReview.id}
          mode="edit"
          bookId={bookId}
          bookTitle={bookTitle}
          reviewId={editingReview.id}
          initialRating={editingReview.rating}
          initialComment={editingReview.comment}
          isOpen
          onClose={() => setEditingReview(null)}
          onReviewSaved={handleReviewSaved}
        />
      ) : null}
    </div>
  );
}
