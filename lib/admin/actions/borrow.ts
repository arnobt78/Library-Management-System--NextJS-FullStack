/**
 * Borrow Management Server Actions
 * 
 * This file contains server actions for managing book borrowing operations.
 * All functions are marked with "use server" to run on the server side.
 * 
 * Key Operations:
 * - Fetching borrow requests
 * - Approving/rejecting borrow requests
 * - Returning books
 * - Calculating and updating overdue fines
 * 
 * IMPORTANT: These are Server Actions, not API routes.
 * They can be called directly from Client Components without fetch().
 */

"use server";

import { db } from "@/database/drizzle";
import { borrowRecords, books, users } from "@/database/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  getActionErrorMessage,
  requireAdminActor,
  requireAuthenticatedActor,
} from "@/lib/auth/authorization";
import {
  approveBorrowRecord,
  rejectBorrowRecord,
  returnBorrowRecord,
} from "@/lib/admin/borrowLifecycle";
import { parseEntityId } from "@/lib/actionInputs";
import { revalidateMutationPaths } from "@/lib/utils/revalidateMutation";
import { scheduleReservationOutboxDelivery } from "@/lib/circulation/scheduleOutbox";
import { logActivity } from "@/lib/admin/activityLog";

/** Cheap join for activity-log details (userId + title) after lifecycle writes. */
async function borrowActivityDetails(recordId: string): Promise<{
  userId: string;
  title: string;
} | null> {
  const [row] = await db
    .select({
      userId: borrowRecords.userId,
      title: books.title,
    })
    .from(borrowRecords)
    .innerJoin(books, eq(borrowRecords.bookId, books.id))
    .where(eq(borrowRecords.id, recordId))
    .limit(1);
  return row ?? null;
}

/**
 * Fetch all borrow requests with user and book details
 * 
 * Returns borrow records joined with:
 * - User information (name, email, university ID)
 * - Book information (title, author, genre, cover)
 * 
 * Used by: Admin dashboard to display all borrow requests
 */
export const getAllBorrowRequests = async () => {
  try {
    await requireAdminActor();
    const requests = await db
      .select({
        id: borrowRecords.id,
        userId: borrowRecords.userId,
        bookId: borrowRecords.bookId,
        borrowDate: borrowRecords.borrowDate,
        dueDate: borrowRecords.dueDate,
        returnDate: borrowRecords.returnDate,
        status: borrowRecords.status,
        createdAt: borrowRecords.createdAt,
        borrowedBy: borrowRecords.borrowedBy,
        returnedBy: borrowRecords.returnedBy,
        fineAmount: borrowRecords.fineAmount,
        notes: borrowRecords.notes,
        renewalCount: borrowRecords.renewalCount,
        lastReminderSent: borrowRecords.lastReminderSent,
        updatedAt: borrowRecords.updatedAt,
        updatedBy: borrowRecords.updatedBy,
        userName: users.fullName,
        userEmail: users.email,
        userUniversityId: users.universityId,
        userUniversityCard: users.universityCard,
        bookTitle: books.title,
        bookAuthor: books.author,
        bookGenre: books.genre,
        bookRating: books.rating,
        bookCoverUrl: books.coverUrl,
        bookCoverColor: books.coverColor,
      })
      .from(borrowRecords)
      .innerJoin(users, eq(borrowRecords.userId, users.id))
      .innerJoin(books, eq(borrowRecords.bookId, books.id))
      .orderBy(desc(borrowRecords.createdAt));

    return {
      success: true as const,
      data: requests.map((row) => mapBorrowRequestRow(row)),
    };
  } catch (error) {
    console.error("Error fetching borrow requests:", error);
    return { success: false as const, error: "Failed to fetch borrow requests" };
  }
};

/** Map DB join row → admin BorrowRecordWithDetails (list + detail). */
function mapBorrowRequestRow(record: {
  id: string;
  userId: string;
  bookId: string;
  borrowDate: Date | null;
  dueDate: string | Date | null;
  returnDate: string | Date | null;
  status: string;
  borrowedBy: string | null;
  returnedBy: string | null;
  fineAmount: string | null;
  notes: string | null;
  renewalCount: number;
  lastReminderSent: Date | null;
  updatedAt: Date | null;
  updatedBy: string | null;
  createdAt: Date | null;
  userName: string;
  userEmail: string;
  userUniversityId: number;
  userUniversityCard: string | null;
  bookTitle: string;
  bookAuthor: string;
  bookGenre: string;
  bookRating: number | null;
  bookCoverUrl: string | null;
  bookCoverColor: string | null;
  approvedById?: string | null;
  approvedByName?: string | null;
  approvedByEmail?: string | null;
  approvedByCard?: string | null;
  returnedById?: string | null;
  returnedByName?: string | null;
  returnedByEmail?: string | null;
  returnedByCard?: string | null;
}) {
  const dueDateValue = record.dueDate;
  let dueDateStr: string | null = null;
  if (dueDateValue) {
    dueDateStr =
      typeof dueDateValue === "string"
        ? dueDateValue
        : dueDateValue.toISOString().split("T")[0];
  }
  const returnDateValue = record.returnDate;
  let returnDateStr: string | null = null;
  if (returnDateValue) {
    returnDateStr =
      typeof returnDateValue === "string"
        ? returnDateValue
        : returnDateValue.toISOString().split("T")[0];
  }
  return {
    id: record.id,
    userId: record.userId,
    bookId: record.bookId,
    borrowDate: record.borrowDate,
    dueDate: dueDateStr,
    returnDate: returnDateStr,
    status: record.status as "PENDING" | "BORROWED" | "RETURNED" | "CANCELLED",
    borrowedBy: record.borrowedBy,
    returnedBy: record.returnedBy,
    fineAmount: record.fineAmount || "0.00",
    notes: record.notes,
    renewalCount: record.renewalCount,
    lastReminderSent: record.lastReminderSent,
    updatedAt: record.updatedAt,
    updatedBy: record.updatedBy,
    createdAt: record.createdAt,
    userName: record.userName,
    userEmail: record.userEmail,
    userUniversityId: record.userUniversityId,
    userUniversityCard: record.userUniversityCard ?? null,
    bookTitle: record.bookTitle,
    bookAuthor: record.bookAuthor,
    bookGenre: record.bookGenre,
    bookRating: record.bookRating ?? null,
    bookCoverUrl: record.bookCoverUrl,
    bookCoverColor: record.bookCoverColor,
    approvedByActor:
      record.approvedById && record.approvedByEmail && record.approvedByName
        ? {
            id: record.approvedById,
            fullName: record.approvedByName,
            email: record.approvedByEmail,
            universityCard: record.approvedByCard ?? null,
          }
        : null,
    returnedByActor:
      record.returnedById && record.returnedByEmail && record.returnedByName
        ? {
            id: record.returnedById,
            fullName: record.returnedByName,
            email: record.returnedByEmail,
            universityCard: record.returnedByCard ?? null,
          }
        : null,
  };
}

/**
 * Single Borrow Queue row for `/admin/book-requests/[id]`.
 * Joins borrower book + optional approver/returner users via email fields.
 * Auth is the caller's responsibility (page / API / server action wrapper).
 */
export async function loadBorrowRequestById(recordId: string) {
  try {
    const safeId = parseEntityId(recordId);
    const approverUsers = alias(users, "borrow_approver_users");
    const returnerUsers = alias(users, "borrow_returner_users");

    const [row] = await db
      .select({
        id: borrowRecords.id,
        userId: borrowRecords.userId,
        bookId: borrowRecords.bookId,
        borrowDate: borrowRecords.borrowDate,
        dueDate: borrowRecords.dueDate,
        returnDate: borrowRecords.returnDate,
        status: borrowRecords.status,
        createdAt: borrowRecords.createdAt,
        borrowedBy: borrowRecords.borrowedBy,
        returnedBy: borrowRecords.returnedBy,
        fineAmount: borrowRecords.fineAmount,
        notes: borrowRecords.notes,
        renewalCount: borrowRecords.renewalCount,
        lastReminderSent: borrowRecords.lastReminderSent,
        updatedAt: borrowRecords.updatedAt,
        updatedBy: borrowRecords.updatedBy,
        userName: users.fullName,
        userEmail: users.email,
        userUniversityId: users.universityId,
        userUniversityCard: users.universityCard,
        bookTitle: books.title,
        bookAuthor: books.author,
        bookGenre: books.genre,
        bookRating: books.rating,
        bookCoverUrl: books.coverUrl,
        bookCoverColor: books.coverColor,
        approvedById: approverUsers.id,
        approvedByName: approverUsers.fullName,
        approvedByEmail: approverUsers.email,
        approvedByCard: approverUsers.universityCard,
        returnedById: returnerUsers.id,
        returnedByName: returnerUsers.fullName,
        returnedByEmail: returnerUsers.email,
        returnedByCard: returnerUsers.universityCard,
      })
      .from(borrowRecords)
      .innerJoin(users, eq(borrowRecords.userId, users.id))
      .innerJoin(books, eq(borrowRecords.bookId, books.id))
      .leftJoin(approverUsers, eq(borrowRecords.borrowedBy, approverUsers.email))
      .leftJoin(returnerUsers, eq(borrowRecords.returnedBy, returnerUsers.email))
      .where(eq(borrowRecords.id, safeId))
      .limit(1);

    if (!row) {
      return { success: false as const, error: "Borrow request not found" };
    }
    return {
      success: true as const,
      data: mapBorrowRequestRow(row),
    };
  } catch (error) {
    console.error("Error loading borrow request detail:", error);
    return {
      success: false as const,
      error: getActionErrorMessage(error, "Failed to fetch borrow request"),
    };
  }
}

/**
 * Server-action entry — authenticates then loads detail.
 * Prefer `loadBorrowRequestById` from already-authorized RSC/API paths.
 */
export const getBorrowRequestById = async (recordId: string) => {
  try {
    await requireAdminActor();
    return await loadBorrowRequestById(recordId);
  } catch (error) {
    console.error("Error fetching borrow request detail:", error);
    return {
      success: false as const,
      error: getActionErrorMessage(error, "Failed to fetch borrow request"),
    };
  }
};

export const updateBorrowStatus = async (
  recordId: string,
  status: "PENDING" | "BORROWED" | "RETURNED" | "CANCELLED"
) => {
  try {
    const actor = await requireAdminActor();
    const safeRecordId = parseEntityId(recordId);
    if (status === "BORROWED") {
      const result = await approveBorrowRecord(safeRecordId, actor);
      if (result.success) {
        const meta = await borrowActivityDetails(safeRecordId);
        // Await audit insert before RSC revalidate — avoids Activity History race.
        await logActivity({
          actorId: actor.id,
          action: "UPDATE",
          entityType: "borrow",
          entityId: safeRecordId,
          details: {
            status: "BORROWED",
            ...(meta?.userId ? { userId: meta.userId } : {}),
            ...(meta?.title ? { title: meta.title } : {}),
          },
        });
        revalidateMutationPaths("borrow.lifecycle");
      }
      return result;
    }
    if (status === "RETURNED") {
      const { getDailyFineAmount } = await import("./config");
      const result = await returnBorrowRecord(
        safeRecordId,
        actor,
        await getDailyFineAmount()
      );
      if (result.success) {
        scheduleReservationOutboxDelivery();
        const meta = await borrowActivityDetails(safeRecordId);
        await logActivity({
          actorId: actor.id,
          action: "UPDATE",
          entityType: "borrow",
          entityId: safeRecordId,
          details: {
            status: "RETURNED",
            ...(meta?.userId ? { userId: meta.userId } : {}),
            ...(meta?.title ? { title: meta.title } : {}),
          },
        });
        revalidateMutationPaths("borrow.lifecycle");
      }
      return result;
    }

    const [record] = await db
      .select({ status: borrowRecords.status })
      .from(borrowRecords)
      .where(eq(borrowRecords.id, safeRecordId))
      .limit(1);
    return record?.status === "PENDING"
      ? { success: true }
      : { success: false, error: "Invalid borrow status transition" };
  } catch (error) {
    console.error("Error updating borrow status:", error);
    return { success: false, error: "Failed to update borrow status" };
  }
};

/**
 * Approve a borrow request
 * 
 * This function:
 * 1. Validates the borrow record exists
 * 2. Checks if book is still available (availableCopies > 0)
 * 3. Sets due date to 7 days from approval (end of day)
 * 4. Updates status to BORROWED
 * 5. Decrements availableCopies in books table
 * 
 * Business Logic:
 * - Due date is calculated as 7 days from approval (configurable via systemConfig)
 * - Due date is set to end of day (23:59:59) to give full day
 * - availableCopies is decremented to prevent over-borrowing
 * 
 * @param recordId - UUID of the borrow record to approve
 * @returns Success/error response
 */
export const approveBorrowRequest = async (recordId: string) => {
  try {
    const actor = await requireAdminActor();
    const safeRecordId = parseEntityId(recordId);
    const result = await approveBorrowRecord(safeRecordId, actor);
    if (result.success) {
      const meta = await borrowActivityDetails(safeRecordId);
      await logActivity({
        actorId: actor.id,
        action: "UPDATE",
        entityType: "borrow",
        entityId: safeRecordId,
        details: {
          status: "BORROWED",
          ...(meta?.userId ? { userId: meta.userId } : {}),
          ...(meta?.title ? { title: meta.title } : {}),
        },
      });
      revalidateMutationPaths("borrow.lifecycle");
    }
    return result;
  } catch (error) {
    console.error("Error approving borrow request:", error);
    return {
      success: false,
      error: getActionErrorMessage(error, "Failed to approve borrow request"),
    };
  }
};

export const rejectBorrowRequest = async (recordId: string) => {
  try {
    const actor = await requireAdminActor();
    const safeRecordId = parseEntityId(recordId);
    const result = await rejectBorrowRecord(safeRecordId, actor.email);
    if (result.success) {
      const meta = await borrowActivityDetails(safeRecordId);
      await logActivity({
        actorId: actor.id,
        action: "UPDATE",
        entityType: "borrow",
        entityId: safeRecordId,
        details: {
          status: "CANCELLED",
          ...(meta?.userId ? { userId: meta.userId } : {}),
          ...(meta?.title ? { title: meta.title } : {}),
        },
      });
      revalidateMutationPaths("borrow.lifecycle");
    }
    return result;
  } catch (error) {
    console.error("Error rejecting borrow request:", error);
    return { success: false, error: "Failed to reject borrow request" };
  }
};

/**
 * Update fines for overdue books (without returning them)
 * 
 * This function is called by automation/admin to calculate fines for overdue books.
 * 
 * Business Logic:
 * - Only updates books that are BORROWED and overdue (dueDate < today)
 * - Only updates books that don't have fines calculated yet (fineAmount is NULL or 0.00)
 * - Fine = (days overdue) × dailyFineAmount
 * - Days overdue = floor((today - dueDate) / 1 day)
 * 
 * Why only update books without fines?
 * - Prevents recalculating fines that were already set
 * - Fair to users (fine is calculated once, not continuously increasing)
 * - Fine is recalculated when book is returned if needed
 * 
 * @param customFineAmount - Optional override for daily fine amount (for testing)
 * @returns Array of updated records with fine details
 */
export const updateOverdueFines = async (customFineAmount?: number) => {
  const actor = await requireAdminActor();
  const today = new Date();

  if (
    customFineAmount !== undefined &&
    (!Number.isFinite(customFineAmount) || customFineAmount < 0)
  ) {
    throw new Error("Fine amount must be a finite non-negative number");
  }

  /**
   * Import getDailyFineAmount dynamically to avoid circular dependency
   * 
   * Circular dependency can occur if:
   * - borrow.ts imports config.ts
   * - config.ts imports borrow.ts
   * 
   * Dynamic import breaks the cycle by loading at runtime instead of module load time
   */
  const { getDailyFineAmount } = await import("./config");
  const dailyFineAmount = customFineAmount ?? (await getDailyFineAmount());

  /**
   * Only update fines for overdue books that don't have fines calculated yet
   * 
   * This ensures we don't change existing fine amounts unfairly.
   * For example, if a fine was manually adjusted by an admin, we don't want
   * to overwrite it with an automated calculation.
   */
  const result = await db.transaction(async (tx) => {
    // Lock the selected rows so concurrent automation runs cannot overwrite
    // manual adjustments or attribute the same batch to different actors.
    const overdueRecords = await tx
      .select({
        id: borrowRecords.id,
        dueDate: borrowRecords.dueDate,
        fineAmount: borrowRecords.fineAmount,
      })
      .from(borrowRecords)
      .where(
        and(
          eq(borrowRecords.status, "BORROWED"),
          sql`${borrowRecords.dueDate} < ${today}`,
          sql`${borrowRecords.fineAmount} IS NULL OR ${borrowRecords.fineAmount} = '0.00'`
        )
      )
      .for("update");

    const results = [];
    for (const record of overdueRecords) {
      if (!record.dueDate) continue;

      const dueDate = new Date(record.dueDate);
      const daysOverdue = Math.max(
        0,
        Math.floor(
          (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
        )
      );
      const fineAmount =
        daysOverdue > 0 ? (daysOverdue * dailyFineAmount).toFixed(2) : "0.00";

      await tx
        .update(borrowRecords)
        .set({
          fineAmount,
          updatedAt: new Date(),
          updatedBy: actor.email,
        })
        .where(eq(borrowRecords.id, record.id));

      results.push({
        recordId: record.id,
        daysOverdue,
        fineAmount,
        updated: true,
      });
    }
    return results;
  });
  await logActivity({
    actorId: actor.id,
    action: "UPDATE",
    entityType: "borrow",
    entityId: null,
    details: { status: "FINE_UPDATE", count: result.length },
  });
  revalidateMutationPaths("fine.write");
  return result;
};

// Force update fines for ALL overdue books (for testing/admin purposes)
export const forceUpdateOverdueFines = async (customFineAmount?: number) => {
  const actor = await requireAdminActor();
  const today = new Date();

  if (
    customFineAmount !== undefined &&
    (!Number.isFinite(customFineAmount) || customFineAmount < 0)
  ) {
    throw new Error("Fine amount must be a finite non-negative number");
  }

  // Import getDailyFineAmount dynamically to avoid circular dependency
  const { getDailyFineAmount } = await import("./config");
  const dailyFineAmount = customFineAmount ?? (await getDailyFineAmount());

  // Update ALL overdue books regardless of existing fine amounts
  const result = await db.transaction(async (tx) => {
    const overdueRecords = await tx
      .select({
        id: borrowRecords.id,
        dueDate: borrowRecords.dueDate,
        currentFineAmount: borrowRecords.fineAmount,
      })
      .from(borrowRecords)
      .where(
        and(
          eq(borrowRecords.status, "BORROWED"),
          sql`${borrowRecords.dueDate} < ${today}`
        )
      )
      .for("update");

    const results = [];
    for (const record of overdueRecords) {
      if (!record.dueDate) continue;

      const dueDate = new Date(record.dueDate);
      const daysOverdue = Math.max(
        0,
        Math.floor(
          (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
        )
      );

      const fineAmount =
        daysOverdue > 0 ? (daysOverdue * dailyFineAmount).toFixed(2) : "0.00";

      // Persist overdue fine on the borrow record
      await tx
        .update(borrowRecords)
        .set({
          fineAmount,
          updatedAt: new Date(),
          updatedBy: actor.email,
        })
        .where(eq(borrowRecords.id, record.id));

      // Verify the update was successful by reading back from database
      const verifyResult = await tx
        .select({ id: borrowRecords.id, fineAmount: borrowRecords.fineAmount })
        .from(borrowRecords)
        .where(eq(borrowRecords.id, record.id))
        .limit(1);

      results.push({
        recordId: record.id,
        daysOverdue,
        fineAmount,
        updated: true,
        previousFineAmount: record.currentFineAmount,
        verifiedFineAmount: verifyResult[0]?.fineAmount,
      });
    }
    return results;
  });
  await logActivity({
    actorId: actor.id,
    action: "UPDATE",
    entityType: "borrow",
    entityId: null,
    details: { status: "FINE_FORCE_UPDATE", count: result.length },
  });
  revalidateMutationPaths("fine.write");
  return result;
};

export const returnBook = async (recordId: string) => {
  try {
    const actor = await requireAuthenticatedActor();
    const safeRecordId = parseEntityId(recordId);
    const { getDailyFineAmount } = await import("./config");
    const result = await returnBorrowRecord(
      safeRecordId,
      actor,
      await getDailyFineAmount()
    );
    if (result.success) {
      scheduleReservationOutboxDelivery();
      const meta = await borrowActivityDetails(safeRecordId);
      await logActivity({
        actorId: actor.id,
        action: "UPDATE",
        entityType: "borrow",
        entityId: safeRecordId,
        details: {
          status: "RETURNED",
          ...(meta?.userId ? { userId: meta.userId } : {}),
          ...(meta?.title ? { title: meta.title } : {}),
        },
      });
      revalidateMutationPaths("borrow.lifecycle");
    }
    return result;
  } catch (error) {
    console.error("Error returning book:", error);
    return {
      success: false as const,
      error: getActionErrorMessage(error, "Failed to return book"),
    };
  }
};
