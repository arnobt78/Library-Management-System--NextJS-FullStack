"use server";

import { db } from "@/database/drizzle";
import { books, borrowRecords } from "@/database/schema";
import { eq } from "drizzle-orm";

/**
 * Parameters for borrowing a book
 */
export interface BorrowBookParams {
  userId: string;
  bookId: string;
}

/**
 * Response type for borrow book operation
 */
export type BorrowBookResponse =
  | {
      success: true;
      data: Array<{
        id: string;
        userId: string;
        bookId: string;
        borrowDate: Date | null;
        dueDate: string | null;
        returnDate: string | null;
        status: "PENDING" | "BORROWED" | "RETURNED";
        borrowedBy: string | null;
        returnedBy: string | null;
        fineAmount: string | null;
        notes: string | null;
        renewalCount: number;
        lastReminderSent: Date | null;
        updatedAt: Date | null;
        updatedBy: string | null;
        createdAt: Date | null;
      }>;
    }
  | {
      success: false;
      error: string;
    };

/**
 * Borrow a book for a user
 * Creates a PENDING borrow request that requires admin approval
 *
 * @param params - Borrow book parameters (userId, bookId)
 * @returns Promise with success status and data or error message
 */
export const borrowBook = async (
  params: BorrowBookParams
): Promise<BorrowBookResponse> => {
  const { userId, bookId } = params;

  try {
    const book = await db
      .select({ availableCopies: books.availableCopies })
      .from(books)
      .where(eq(books.id, bookId))
      .limit(1);

    if (!book.length || book[0].availableCopies <= 0) {
      return {
        success: false,
        error: "Book is not available for borrowing",
      };
    }

    // CRITICAL: Use .returning() to get the inserted record
    // Without this, db.insert() doesn't return the actual record data
    const [record] = await db
      .insert(borrowRecords)
      .values({
        userId,
        bookId,
        dueDate: null, // Will be set when admin approves
        status: "PENDING",
      })
      .returning();

    // Don't decrement available copies until admin approves

    return {
      success: true,
      data: [record], // Return as array to match the response type
    };
  } catch (error: unknown) {
    console.log(error);

    return {
      success: false,
      error: "An error occurred while borrowing the book",
    };
  }
};
