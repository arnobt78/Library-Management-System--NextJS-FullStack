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
}

const BookBorrowButton: React.FC<BookBorrowButtonProps> = ({
  bookId,
  userId,
  bookTitle,
  availableCopies,
  isActive,
  userStatus,
  isDetailPage = false,
}) => {
  // Use React Query to check if user has an existing borrow for this book
  // This will update immediately when borrow status changes
  const { data: userBorrows } = useUserBorrows(
    userId,
    undefined, // No status filter - get all
    undefined // No initial data - let React Query fetch
  );

  // Find if user has an active or pending borrow for this book
  const existingBorrow = (userBorrows as Array<{
    id: string;
    bookId: string;
    status: string;
    dueDate?: string | null;
  }>)?.find(
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
    <div className="flex gap-4">
      {/* Show Return Book button if user has an active borrow */}
      {hasExistingBorrow && isBorrowed ? (
        <ReturnBookButton
          recordId={existingBorrow.id}
          bookTitle={bookTitle}
          dueDate={
            existingBorrow.dueDate ? new Date(existingBorrow.dueDate) : null
          }
        />
      ) : (
        <BorrowBook
          bookId={bookId}
          userId={userId}
          borrowingEligibility={borrowingEligibility}
        />
      )}

      {/* Review Button - only show on detail page */}
      {isDetailPage && <ReviewButton bookId={bookId} userId={userId} />}
    </div>
  );
};

export default BookBorrowButton;

