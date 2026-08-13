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
import { logActivity } from "@/lib/admin/activityLog";
import { cancelOwnBorrowRecord } from "@/lib/admin/borrowLifecycle";

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
        status: "PENDING" | "BORROWED" | "RETURNED" | "CANCELLED";
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
        .select({
          availableCopies: books.availableCopies,
          title: books.title,
        })
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

      return {
        success: true as const,
        data: [record],
        bookTitle: book.title,
      };
    });

    if (result.success) {
      const recordId = result.data[0]?.id ?? null;
      await logActivity({
        actorId: actor.id,
        action: "CREATE",
        entityType: "borrow",
        entityId: recordId,
        details: {
          status: "PENDING",
          userId: actor.id,
          ...(result.bookTitle ? { title: result.bookTitle } : {}),
        },
      });
      revalidateMutationPaths("borrow.lifecycle");
      // Strip audit-only bookTitle from the client response contract.
      return { success: true as const, data: result.data };
    }
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

/**
 * Owner soft-cancels a PENDING borrow request (keeps CANCELLED history row).
 * Admin reject stays on rejectBorrowRequest — different actor + notes.
 */
export const cancelPendingBorrowRequest = async (
  recordId: string,
): Promise<{ success: true } | { success: false; error: string }> => {
  try {
    const actor = await requireAuthenticatedActor();
    const safeRecordId = parseEntityId(recordId);
    const result = await cancelOwnBorrowRecord(safeRecordId, actor);
    if (!result.success) {
      return result;
    }

    const [meta] = await db
      .select({
        userId: borrowRecords.userId,
        title: books.title,
      })
      .from(borrowRecords)
      .innerJoin(books, eq(borrowRecords.bookId, books.id))
      .where(eq(borrowRecords.id, safeRecordId))
      .limit(1);

    await logActivity({
      actorId: actor.id,
      action: "UPDATE",
      entityType: "borrow",
      entityId: safeRecordId,
      details: {
        status: "CANCELLED",
        userId: actor.id,
        ...(meta?.title ? { title: meta.title } : {}),
      },
    });
    revalidateMutationPaths("borrow.lifecycle");
    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to cancel pending borrow request", error);
    return {
      success: false,
      error: getActionErrorMessage(
        error,
        "An error occurred while cancelling the request",
      ),
    };
  }
};
