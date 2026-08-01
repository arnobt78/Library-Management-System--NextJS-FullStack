"use server";

import { db } from "@/database/drizzle";
import { books, borrowRecords } from "@/database/schema";
import { and, eq, inArray } from "drizzle-orm";
import {
  getActionErrorMessage,
  requireAuthenticatedActor,
} from "@/lib/auth/authorization";
import { parseEntityId } from "@/lib/actionInputs";
import { revalidateMutationPaths } from "@/lib/utils/revalidateMutation";

/**
 * Parameters for borrowing a book
 */
export interface BorrowBookParams {
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
 * The authenticated database actor is always the borrower; browser user IDs
 * are intentionally excluded from this contract.
 * @returns Promise with success status and data or error message
 */
export const borrowBook = async (
  params: BorrowBookParams
): Promise<BorrowBookResponse> => {
  try {
    const actor = await requireAuthenticatedActor();
    const bookId = parseEntityId(params.bookId);

    const result = await db.transaction(async (tx) => {
      // Locking the book serializes requests for the same title, preventing two
      // concurrent requests by one user from both passing the duplicate check.
      const [book] = await tx
        .select({ availableCopies: books.availableCopies })
        .from(books)
        .where(and(eq(books.id, bookId), eq(books.isActive, true)))
        .limit(1)
        .for("update");

      if (!book || book.availableCopies <= 0) {
        return {
          success: false as const,
          error: "Book is not available for borrowing",
        };
      }

      const [existingRequest] = await tx
        .select({ id: borrowRecords.id })
        .from(borrowRecords)
        .where(
          and(
            eq(borrowRecords.userId, actor.id),
            eq(borrowRecords.bookId, bookId),
            inArray(borrowRecords.status, ["PENDING", "BORROWED"])
          )
        )
        .limit(1);

      if (existingRequest) {
        return {
          success: false as const,
          error: "You already have an active request for this book",
        };
      }

      const [record] = await tx
        .insert(borrowRecords)
        .values({
          userId: actor.id,
          bookId,
          dueDate: null,
          status: "PENDING",
          updatedBy: actor.email,
        })
        .returning();

      return { success: true as const, data: [record] };
    });

    if (result.success) revalidateMutationPaths("borrow.lifecycle");
    return result;
  } catch (error: unknown) {
    console.error("Failed to borrow book", error);

    return {
      success: false,
      error: getActionErrorMessage(
        error,
        "An error occurred while borrowing the book"
      ),
    };
  }
};
