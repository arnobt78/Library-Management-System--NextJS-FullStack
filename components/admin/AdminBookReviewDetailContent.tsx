"use client";

/**
 * Admin Book Review detail — ticket-shaped layout:
 * Back+Delete → title+dates → KPI row → About book | Description (+ moderate confirms).
 * Per-action Approve/Reject spinner; densify via useModerateReview + decisionActor.
 * Parent: CR-0003 / review detail redesign
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import PrefetchLink from "@/components/PrefetchLink";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  FileText,
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
import { LIGHT_ALERT, LIGHT_GLASS_CTA } from "@/lib/ui/glassActionChrome";
import { FIELD_LABEL_TEXT } from "@/lib/ui/fieldLabelStyles";
import { SKY_LINK_LIGHT } from "@/lib/ui/skyLinkStyles";
import { cn } from "@/lib/utils";
import StarRow from "@/components/ui/StarRow";
import PersonAttribution from "@/components/PersonAttribution";
import { DecisionActorStack } from "@/components/admin/DecisionActorStack";
import ReviewDateMeta from "@/components/reviews/ReviewDateMeta";
import ReviewBookIdentity from "@/components/reviews/ReviewBookIdentity";
import { ReviewBorrowMeta } from "@/components/reviews/ReviewBorrowMeta";
import { ReviewDetailKpiGrid } from "@/components/reviews/ReviewDetailKpiGrid";
import { TicketDateMeta } from "@/components/support-tickets/TicketDateMeta";
import { TicketSectionHeader } from "@/components/support-tickets/TicketSectionHeader";
import { ReviewStatusBadge } from "@/lib/ui/semanticBadges";
import {
  ModerateReviewAlertDialog,
  type ModerateReviewTargetStatus,
} from "@/components/admin/ModerateReviewAlertDialog";
import type { AdminRequestReviewer } from "@/lib/admin/adminRequestTypes";
import { resolveDecisionActor } from "@/lib/admin/resolveDecisionActor";

export default function AdminBookReviewDetailContent({
  initialReview,
  currentAdmin = null,
}: {
  initialReview: AdminBookReviewItem;
  /** SSR DB actor for Approver densify (preferred over useSession). */
  currentAdmin?: AdminRequestReviewer | null;
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
  const [moderateTarget, setModerateTarget] =
    useState<ModerateReviewTargetStatus | null>(null);

  const decisionActor =
    resolveDecisionActor(currentAdmin, session?.user) ?? undefined;

  // Only the clicked action shows a spinner; sibling stays disabled without Loader2.
  const moderatingStatus = moderateMutation.isPending
    ? moderateMutation.variables?.status
    : undefined;

  const handleModerateConfirm = () => {
    if (!moderateTarget) return;
    moderateMutation.mutate(
      {
        reviewId: review.id,
        status: moderateTarget,
        bookTitle: review.bookTitle,
        decisionActor,
      },
      { onSuccess: () => setModerateTarget(null) },
    );
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

  const bookHref = `/books/${review.bookId}`;
  const decided =
    review.status === "APPROVED" || review.status === "REJECTED";

  // Status KPI / About — Privilege Recent DNA: badge+Submitted or DecisionActorStack
  const statusDecisionSlot = decided ? (
    <DecisionActorStack
      status={review.status}
      badge={<ReviewStatusBadge status={review.status} />}
      actor={moderator}
      actorHref={
        review.reviewedBy ? `/admin/users/${review.reviewedBy}` : null
      }
      decidedAt={review.reviewedAt}
      showActor={Boolean(moderator)}
    />
  ) : (
    <div className="flex min-w-0 flex-col gap-1 leading-none">
      <span className="inline-flex self-start">
        <ReviewStatusBadge status="PENDING" />
      </span>
      <TicketDateMeta
        createdAt={review.createdAt}
        createdLabel="Submitted"
        hideUpdated
      />
    </div>
  );

  return (
    <section className="w-full space-y-4 sm:space-y-6">
      {/* Header: Back + Delete */}
      <div className="flex w-full flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-primary-admin"
        >
          <ArrowLeft className="size-4" />
          <span className="max-w-44 truncate sm:max-w-none">
            Back to Book Reviews
          </span>
        </button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              disabled={deleteMutation.isPending}
              className={cn(
                LIGHT_GLASS_CTA.host,
                LIGHT_GLASS_CTA.delete,
                "bg-red-800 text-white",
              )}
            >
              <Trash2 className="size-4" />
              <span className="hidden sm:inline">Delete</span>
            </button>
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

      {/* Title + tracking dates */}
      <div className="admin-panel w-full space-y-2">
        <PrefetchLink
          href={bookHref}
          prefetch={false}
          className={cn("block text-lg font-medium sm:text-xl", SKY_LINK_LIGHT)}
        >
          {review.bookTitle}
        </PrefetchLink>
        <ReviewDateMeta
          createdAt={review.createdAt}
          updatedAt={review.updatedAt}
          reviewedAt={review.reviewedAt}
          status={review.status}
          variant="light"
        />
      </div>

      {/* KPI row */}
      <ReviewDetailKpiGrid
        variant="light"
        status={review.status}
        rating={review.rating}
        genre={review.bookGenre}
        statusSlot={statusDecisionSlot}
        approverSlot={
          moderator && decided ? (
            <PersonAttribution
              person={moderator}
              layout="stack"
              variant="light"
              size={36}
              href={
                review.reviewedBy ? `/admin/users/${review.reviewedBy}` : null
              }
            />
          ) : (
            <p className="text-sm text-gray-500">Pending moderation</p>
          )
        }
      />

      {/* About book | Description */}
      <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="admin-panel space-y-4">
          <TicketSectionHeader
            variant="light"
            icon={<BookOpen className="size-5" />}
            title="About book"
            subtitle="Catalog identity, borrow dates, and reviewer"
            className="mb-0"
          />
          <ReviewBookIdentity
            variant="light"
            title={review.bookTitle}
            author={review.bookAuthor}
            coverUrl={review.bookCoverUrl}
            coverColor={review.bookCoverColor}
            bookId={review.bookId}
            genre={review.bookGenre}
            bookRating={review.bookRating}
            showMeta
            catalogRatingMode="number"
          />
          <ReviewBorrowMeta
            borrowedAt={review.borrowedAt}
            dueDate={review.dueDate}
            returnedAt={review.returnedAt}
            variant="light"
          />
          <div className="space-y-1">
            <p className={FIELD_LABEL_TEXT}>
              Reviewer
            </p>
            <PersonAttribution
              person={author}
              layout="stack"
              variant="light"
              href={`/admin/users/${review.userId}`}
              size={36}
            />
          </div>
          <div className="space-y-1">
            <p className={FIELD_LABEL_TEXT}>Status</p>
            {statusDecisionSlot}
          </div>
        </div>

        <div className="admin-panel flex flex-col space-y-2">
          <TicketSectionHeader
            variant="light"
            icon={<FileText className="size-5" />}
            title="Description"
            subtitle="Full review text from the borrower"
            className="mb-0"
          />
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-emerald-700">
            {review.comment}
          </p>
          <div className="mt-auto flex flex-col gap-2 pt-2 sm:flex-row">
            <Button
              type="button"
              className="bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white"
              disabled={
                moderateMutation.isPending || review.status === "APPROVED"
              }
              onClick={() => setModerateTarget("APPROVED")}
            >
              {moderatingStatus === "APPROVED" ? (
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
              onClick={() => setModerateTarget("REJECTED")}
            >
              {moderatingStatus === "REJECTED" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <XCircle className="size-4" />
              )}
              Reject
            </Button>
          </div>
        </div>
      </div>

      <ModerateReviewAlertDialog
        open={moderateTarget !== null}
        onOpenChange={(open) => {
          if (!open && !moderateMutation.isPending) setModerateTarget(null);
        }}
        status={moderateTarget}
        bookTitle={review.bookTitle}
        comment={review.comment}
        rating={review.rating}
        isPending={moderateMutation.isPending}
        onConfirm={handleModerateConfirm}
      />
    </section>
  );
}
