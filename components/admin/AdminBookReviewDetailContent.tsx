"use client";

/**
 * Admin Book Review detail — PersonAttribution for author + moderator,
 * ReviewDateMeta, approve/reject densify via useModerateReview.
 * Parent: CR-0003 / REQ-0035 polish
 */

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Loader2,
  Trash2,
  XCircle,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useBackWithRefresh } from "@/hooks/useBackWithRefresh";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAdminReviewDetail } from "@/hooks/useQueries";
import { useDeleteReview, useModerateReview } from "@/hooks/useMutations";
import { ReviewStatusBadge } from "@/lib/ui/semanticBadges";
import { LIGHT_ALERT } from "@/lib/ui/glassActionChrome";
import StarRow from "@/components/ui/StarRow";
import PersonAttribution from "@/components/PersonAttribution";
import ReviewDateMeta from "@/components/reviews/ReviewDateMeta";
import { SafeImage } from "@/components/ui/safe-image";
import { Image as ImageKitImage } from "@imagekit/next";
import config from "@/lib/config";

function AdminCircleCover({
  coverUrl,
  coverColor,
  title,
}: {
  coverUrl: string | null;
  coverColor: string | null;
  title: string;
}) {
  const isRemote = Boolean(coverUrl?.startsWith("http"));
  return (
    <div
      className="relative size-14 shrink-0 overflow-hidden rounded-full border-2 border-gray-200 sm:size-16"
      style={{ backgroundColor: coverColor || "#f3f4f6" }}
    >
      {coverUrl && isRemote ? (
        <SafeImage
          src={coverUrl}
          alt=""
          width={64}
          height={64}
          className="size-full object-cover"
        />
      ) : coverUrl ? (
        <ImageKitImage
          src={coverUrl}
          urlEndpoint={config.env.imagekit.urlEndpoint}
          alt=""
          width={64}
          height={64}
          className="size-full object-cover"
        />
      ) : (
        <span className="flex size-full items-center justify-center text-sm font-medium text-gray-500">
          {title.slice(0, 1).toUpperCase()}
        </span>
      )}
    </div>
  );
}

export default function AdminBookReviewDetailContent({
  initialReview,
}: {
  initialReview: AdminBookReviewItem;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const handleBack = useBackWithRefresh("review.write", "/admin/book-reviews");
  const { data: review = initialReview } = useAdminReviewDetail(
    initialReview.id,
    initialReview,
  );
  const moderateMutation = useModerateReview();
  const deleteMutation = useDeleteReview();

  const decisionActor = session?.user
    ? {
        id: session.user.id,
        fullName: session.user.name || "an admin",
        email: session.user.email || "",
        universityCard:
          (session.user as { universityCard?: string | null }).universityCard ??
          null,
      }
    : undefined;

  const handleModerate = (status: "APPROVED" | "REJECTED") => {
    moderateMutation.mutate({
      reviewId: review.id,
      status,
      bookTitle: review.bookTitle,
      decisionActor,
    });
  };

  const handleDelete = () => {
    deleteMutation.mutate(
      {
        reviewId: review.id,
        bookId: review.bookId,
        bookTitle: review.bookTitle,
        userId: review.userId,
      },
      { onSuccess: () => router.push("/admin/book-reviews") },
    );
  };

  const author = {
    id: review.userId,
    fullName: review.userName,
    email: review.userEmail,
    universityCard: review.userUniversityCard,
  };

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
    <section className="space-y-4 sm:space-y-6">
      <button
        type="button"
        onClick={handleBack}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-primary-admin"
      >
        <ArrowLeft className="size-4" />
        Back to Book Reviews
      </button>

      <div className="admin-panel">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-1 gap-3">
            <AdminCircleCover
              coverUrl={review.bookCoverUrl}
              coverColor={review.bookCoverColor}
              title={review.bookTitle}
            />
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/books/${review.bookId}`}
                  className="text-lg font-semibold text-dark-400 hover:text-primary-admin hover:underline sm:text-xl"
                >
                  {review.bookTitle}
                </Link>
                <ReviewStatusBadge status={review.status} />
              </div>
              <p className="text-sm text-gray-500">
                by {review.bookAuthor || "Unknown"}
                {review.bookGenre ? ` · ${review.bookGenre}` : ""}
              </p>
              <StarRow
                rating={review.rating}
                starClassName="size-4"
                className="flex items-center gap-1"
              />
              <PersonAttribution
                person={author}
                prefix="Reviewer"
                layout="stack"
                variant="light"
                href={`/admin/users/${review.userId}`}
                size={36}
              />
              <Link
                href={`/books/${review.bookId}`}
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-admin hover:underline"
              >
                <BookOpen className="size-3.5" aria-hidden />
                View book page
              </Link>
              <ReviewDateMeta
                createdAt={review.createdAt}
                updatedAt={review.updatedAt}
                reviewedAt={review.reviewedAt}
                status={review.status}
                variant="light"
              />
              {moderator && review.status !== "PENDING" ? (
                <PersonAttribution
                  person={moderator}
                  prefix={
                    review.status === "APPROVED" ? "Approved by" : "Rejected by"
                  }
                  layout="inline"
                  variant="light"
                  href={
                    review.reviewedBy
                      ? `/admin/users/${review.reviewedBy}`
                      : null
                  }
                  size={32}
                />
              ) : null}
            </div>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                type="button"
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="size-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className={LIGHT_ALERT.content}>
              <AlertDialogHeader>
                <AlertDialogTitle className={LIGHT_ALERT.title}>
                  Delete review for &ldquo;{review.bookTitle}&rdquo;?
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className={`space-y-2 ${LIGHT_ALERT.description}`}>
                    <p>
                      This permanently removes the review. This action cannot be
                      undone.
                    </p>
                    <div className={LIGHT_ALERT.preview}>
                      <StarRow
                        rating={review.rating}
                        starClassName="size-4"
                        filledClassName="fill-yellow-400 text-yellow-400"
                        emptyClassName="fill-gray-300 text-gray-300"
                      />
                      <p className="mt-1.5 line-clamp-3 text-sm">
                        {review.comment}
                      </p>
                    </div>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className={LIGHT_ALERT.footer}>
                <AlertDialogCancel
                  disabled={deleteMutation.isPending}
                  className={LIGHT_ALERT.cancel}
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className={LIGHT_ALERT.destructive}
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

        <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50/60 p-3 sm:mt-6 sm:p-4">
          <p className="whitespace-pre-wrap text-sm text-gray-700">
            {review.comment}
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:mt-6 sm:flex-row">
          <Button
            type="button"
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={
              moderateMutation.isPending || review.status === "APPROVED"
            }
            onClick={() => handleModerate("APPROVED")}
          >
            {moderateMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            Approve
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-amber-300 text-amber-700 hover:bg-amber-50"
            disabled={
              moderateMutation.isPending || review.status === "REJECTED"
            }
            onClick={() => handleModerate("REJECTED")}
          >
            {moderateMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <XCircle className="size-4" />
            )}
            Reject
          </Button>
        </div>
      </div>
    </section>
  );
}
