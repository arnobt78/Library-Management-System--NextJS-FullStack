"use client";

/**
 * BookBorrowButton Component
 *
 * Client component that displays the appropriate button (Borrow or Return) based on user's borrow status.
 * Uses React Query to check if user has an existing borrow, ensuring immediate updates.
 *
 * Features:
 * - Uses useUserBorrows hook to check for existing borrows
 * - Displays Return Book button if user has active borrow
 * - Displays Borrow Book button if user doesn't have active borrow
 * - Updates immediately when borrow status changes
 */

import React from "react";
import BorrowBook from "@/components/BorrowBook";
import ReturnBookButton from "@/components/ReturnBookButton";
import ReviewButton from "@/components/ReviewButton";
import { useUserBorrows } from "@/hooks/useQueries";
import type { BorrowRecord } from "@/lib/services/borrows";
import type { ReviewEligibility } from "@/lib/services/reviews";
import ReserveBookButton from "@/components/ReserveBookButton";
import type { UserReservationItem } from "@/lib/services/reservations";

interface BookBorrowButtonProps {
  /**
   * Book ID
   */
  bookId: string;
  /**
   * User ID
   */
  userId: string;
  /**
   * Book title
   */
  bookTitle: string;
  bookCoverUrl?: string | null;
  bookCoverColor?: string | null;
  bookAuthor?: string | null;
  bookGenre?: string | null;
  bookRating?: number | null;
  /**
   * Available copies (from book data, updates via React Query)
   */
  availableCopies: number;
  /**
   * Whether book is active
   */
  isActive: boolean;
  /**
   * User status (APPROVED, PENDING, etc.)
   */
  userStatus?: string | null;
  /**
   * Whether this is a detail page (for Review Button)
   */
  isDetailPage?: boolean;
  /**
   * Initial user borrows from SSR (prevents duplicate fetch, ensures correct button state on first load)
   */
  initialUserBorrows?: BorrowRecord[];
  /**
   * SSR reservations — Waitlisted CTA without Join Waitlist flash.
   */
  initialReservations?: UserReservationItem[];
  /**
   * Initial review eligibility from SSR (prevents duplicate fetch, ensures correct button state on first load)
   */
  initialReviewEligibility?: ReviewEligibility;
}

const BookBorrowButton: React.FC<BookBorrowButtonProps> = ({
  bookId,
  userId,
  bookTitle,
  bookCoverUrl,
  bookCoverColor,
  bookAuthor,
  bookGenre,
  bookRating,
  availableCopies,
  isActive,
  userStatus,
  isDetailPage = false,
  initialUserBorrows,
  initialReservations,
  initialReviewEligibility,
}) => {
  // Gate on SSR userStatus so PENDING never hits APPROVED-only borrow APIs (no 403 noise)
  const { data: userBorrows } = useUserBorrows(
    userId,
    undefined, // No status filter - get all
    initialUserBorrows, // SSR seed when APPROVED
    undefined,
    userStatus,
  );

  // CRITICAL: Handle case where userBorrows might be undefined or loading
  // The API returns data WITH book field, but we only need bookId for this check
  // Cast to handle both BorrowRecord[] and data with book field
  const borrowsArray = (userBorrows || []) as Array<{
    id: string;
    bookId: string;
    status: string;
    dueDate?: string | Date | null;
    createdAt?: string | Date | null;
    borrowDate?: string | Date | null;
    updatedAt?: string | Date | null;
    approvedAt?: string | Date | null;
    cancelledAt?: string | Date | null;
    renewedAt?: string | Date | null;
    returnDate?: string | Date | null;
    book?: unknown; // API includes book field, but we don't need it here
  }>;

  // Find if user has an active or pending borrow for this book
  const existingBorrow = borrowsArray.find(
    (borrow) =>
      borrow.bookId === bookId &&
      (borrow.status === "BORROWED" || borrow.status === "PENDING")
  );

  const hasExistingBorrow = !!existingBorrow;
  const isBorrowed = existingBorrow?.status === "BORROWED";

  // Calculate borrowing eligibility
  const borrowingEligibility = {
    isEligible:
      availableCopies > 0 &&
      userStatus === "APPROVED" &&
      isActive &&
      !hasExistingBorrow,
    message: hasExistingBorrow
      ? "You already have an active borrow or pending request for this book"
      : !isActive
        ? "This book is currently unavailable"
        : availableCopies <= 0
          ? "Book is not available"
          : "You are not eligible to borrow this book",
  };

  return (
    <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:gap-4">
      {/* Show Return Book button if user has an active borrow */}
      {hasExistingBorrow && isBorrowed ? (
        <ReturnBookButton
          recordId={existingBorrow.id}
          bookTitle={bookTitle}
          dueDate={
            existingBorrow.dueDate ? new Date(existingBorrow.dueDate) : null
          }
          bookCoverUrl={bookCoverUrl}
          bookCoverColor={bookCoverColor}
          bookAuthor={bookAuthor}
          bookGenre={bookGenre}
          bookRating={bookRating}
          status={existingBorrow.status}
          createdAt={existingBorrow.createdAt}
          borrowDate={existingBorrow.borrowDate}
          updatedAt={existingBorrow.updatedAt}
          approvedAt={existingBorrow.approvedAt}
          cancelledAt={existingBorrow.cancelledAt}
          renewedAt={existingBorrow.renewedAt}
          returnDate={existingBorrow.returnDate}
        />
      ) : availableCopies <= 0 && userStatus === "APPROVED" && isActive ? (
        <ReserveBookButton
          bookId={bookId}
          userId={userId}
          initialReservations={initialReservations}
        />
      ) : (
        <BorrowBook
          bookId={bookId}
          userId={userId}
          bookTitle={bookTitle}
          borrowingEligibility={borrowingEligibility}
        />
      )}

      {/* Review Button - only show on detail page */}
      {isDetailPage && (
        <ReviewButton
          bookId={bookId}
          userId={userId}
          bookTitle={bookTitle}
          bookCoverUrl={bookCoverUrl}
          bookCoverColor={bookCoverColor}
          bookAuthor={bookAuthor}
          bookGenre={bookGenre}
          bookRating={bookRating}
          initialReviewEligibility={initialReviewEligibility}
        />
      )}
    </div>
  );
};

export default BookBorrowButton;
