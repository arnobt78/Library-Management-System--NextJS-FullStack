"use client";

/**
 * "My Reviews" — signed-in user's own book reviews (any moderation status).
 * Reuses the shared ReviewFormDialog for editing and useDeleteReview for
 * removal, matching ReviewsSection's pattern on the public book page.
 * Parent: CR-0003 / REQ-0034 — Book Review moderation
 */

import { useState } from "react";
import Link from "next/link";
import { CalendarCheck2, Loader2, Pencil, Trash2 } from "lucide-react";
import { useUserBookReviews } from "@/hooks/useQueries";
import { useDeleteReview } from "@/hooks/useMutations";
import { ReviewStatusBadge } from "@/lib/ui/semanticBadges";
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
import { GLASS_ALERT } from "@/lib/ui/glassActionChrome";

function MyReviewCard({ review }: { review: AdminBookReviewItem }) {
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteMutation = useDeleteReview();

  return (
    <div className="rounded-lg border border-gray-600 bg-gray-800/50 p-3 shadow-sm sm:p-4">
      <div className="flex flex-row items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <Link
              href={`/books/${review.bookId}`}
              className="truncate text-sm font-medium text-light-100 hover:underline sm:text-base"
            >
              {review.bookTitle}
            </Link>
            <StarRow
              rating={review.rating}
              filledClassName="fill-yellow-400 text-yellow-400"
              emptyClassName="fill-gray-300 text-gray-300"
            />
            <ReviewStatusBadge status={review.status} />
          </div>
          <p className="mt-2 text-sm text-light-200 sm:text-base">{review.comment}</p>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-light-100 sm:text-xs">
            <CalendarCheck2 className="size-3.5 shrink-0 sm:size-4" />
            Submitted{" "}
            {review.createdAt ? new Date(review.createdAt).toLocaleString() : "N/A"}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label="Edit review"
            onClick={() => setEditing(true)}
            className="rounded-full p-1.5 text-light-200/60 hover:bg-gray-700/50 hover:text-light-100"
          >
            <Pencil className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Delete review"
            onClick={() => setDeleteOpen(true)}
            className="rounded-full p-1.5 text-light-200/60 hover:bg-gray-700/50 hover:text-red-400"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      {editing ? (
        <ReviewFormDialog
          mode="edit"
          bookId={review.bookId}
          bookTitle={review.bookTitle}
          reviewId={review.id}
          initialRating={review.rating}
          initialComment={review.comment}
          isOpen
          onClose={() => setEditing(false)}
          onReviewSaved={() => setEditing(false)}
        />
      ) : null}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className={GLASS_ALERT.content}>
          <AlertDialogHeader>
            <AlertDialogTitle className={GLASS_ALERT.title}>
              Delete review for &ldquo;{review.bookTitle}&rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className={`space-y-2 ${GLASS_ALERT.description}`}>
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

export default function MyReviewsTab({
  userId,
  initialReviews,
}: {
  userId: string;
  initialReviews?: AdminBookReviewItem[];
}) {
  const { data: reviews = [], isLoading } = useUserBookReviews(
    userId,
    initialReviews,
  );

  if (isLoading && reviews.length === 0) {
    return (
      <div className="space-y-3 sm:space-y-4">
        {[...Array(2)].map((_, i) => (
          <div
            key={`my-review-sk-${i}`}
            className="h-24 animate-pulse rounded-lg border border-gray-600 bg-gray-800/30"
          />
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="profile-borrow-row p-4 text-center sm:p-6">
        <p className="text-sm text-light-200 sm:text-base">
          You haven&apos;t written any reviews yet. Reviews appear here as soon as you submit
          one — pending admin moderation before other readers can see it.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {reviews.map((review) => (
        <MyReviewCard key={review.id} review={review} />
      ))}
    </div>
  );
}
