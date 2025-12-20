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
        // Enhanced tracking fields
        borrowedBy: borrowRecords.borrowedBy,
        returnedBy: borrowRecords.returnedBy,
        fineAmount: borrowRecords.fineAmount,
        notes: borrowRecords.notes,
        renewalCount: borrowRecords.renewalCount,
        lastReminderSent: borrowRecords.lastReminderSent,
        updatedAt: borrowRecords.updatedAt,
        updatedBy: borrowRecords.updatedBy,
        // User details
        userName: users.fullName,
        userEmail: users.email,
        userUniversityId: users.universityId,
        // Book details
        bookTitle: books.title,
        bookAuthor: books.author,
        bookGenre: books.genre,
        bookCoverUrl: books.coverUrl,
        bookCoverColor: books.coverColor,
      })
      .from(borrowRecords)
      .innerJoin(users, eq(borrowRecords.userId, users.id))
      .innerJoin(books, eq(borrowRecords.bookId, books.id))
      .orderBy(desc(borrowRecords.createdAt));

    return { success: true, data: requests };
  } catch (error) {
    console.error("Error fetching borrow requests:", error);
    return { success: false, error: "Failed to fetch borrow requests" };
  }
};

export const updateBorrowStatus = async (
  recordId: string,
  status: "PENDING" | "BORROWED" | "RETURNED"
) => {
  try {
    await db
      .update(borrowRecords)
      .set({ status })
      .where(eq(borrowRecords.id, recordId));

    return { success: true };
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
    // Get the borrow record with user email
    const record = await db
      .select({
        bookId: borrowRecords.bookId,
        userId: borrowRecords.userId,
        userEmail: users.email,
      })
      .from(borrowRecords)
      .innerJoin(users, eq(borrowRecords.userId, users.id))
      .where(eq(borrowRecords.id, recordId))
      .limit(1);

    if (record.length === 0) {
      return { success: false, error: "Borrow record not found" };
    }

    // Check if book is still available (prevent over-borrowing)
    const book = await db
      .select({ availableCopies: books.availableCopies })
      .from(books)
      .where(eq(books.id, record[0].bookId))
      .limit(1);

    if (book.length === 0 || book[0].availableCopies <= 0) {
      return { success: false, error: "Book is no longer available" };
    }

    /**
     * Calculate due date (7 days from approval date, set to end of day)
     * 
     * Why end of day?
     * - Gives user the full day to return the book
     * - Prevents timezone issues
     * - Standard library practice
     */
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7); // 7 days from now
    dueDate.setHours(23, 59, 59, 999); // Set to end of day
    const dueDateString = dueDate.toISOString().split("T")[0]; // Format as YYYY-MM-DD

    // Update borrow record status to BORROWED and set borrowedBy and dueDate
    await db
      .update(borrowRecords)
      .set({
        status: "BORROWED",
        borrowedBy: record[0].userEmail, // Set who actually borrowed the book (email for readability)
        dueDate: dueDateString, // Set due date when approved
        updatedAt: new Date(),
        updatedBy: record[0].userEmail,
      })
      .where(eq(borrowRecords.id, recordId));

    /**
     * Decrement available copies
     * 
     * This is critical for inventory management:
     * - Prevents multiple users from borrowing the same copy
     * - Ensures availableCopies reflects actual availability
     * - When book is returned, availableCopies is incremented
     */
    await db
      .update(books)
      .set({ availableCopies: book[0].availableCopies - 1 })
      .where(eq(books.id, record[0].bookId));

    return { success: true };
  } catch (error) {
    console.error("Error approving borrow request:", error);
    return { success: false, error: "Failed to approve borrow request" };
  }
};

export const rejectBorrowRequest = async (recordId: string) => {
  try {
    // For now, we'll just delete the pending request
    // In a real system, you might want to keep it for audit purposes
    await db.delete(borrowRecords).where(eq(borrowRecords.id, recordId));

    return { success: true };
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
  const today = new Date();

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
  const dailyFineAmount = customFineAmount || (await getDailyFineAmount());

  /**
   * Only update fines for overdue books that don't have fines calculated yet
   * 
   * This ensures we don't change existing fine amounts unfairly.
   * For example, if a fine was manually adjusted by an admin, we don't want
   * to overwrite it with an automated calculation.
   */
  const overdueRecords = await db
    .select({
      id: borrowRecords.id,
      dueDate: borrowRecords.dueDate,
      userEmail: users.email,
      fineAmount: borrowRecords.fineAmount,
    })
    .from(borrowRecords)
    .innerJoin(users, eq(borrowRecords.userId, users.id))
    .where(
      and(
        eq(borrowRecords.status, "BORROWED"),
        sql`${borrowRecords.dueDate} < ${today}`,
        // Only update records that don't have fines calculated yet
        sql`${borrowRecords.fineAmount} IS NULL OR ${borrowRecords.fineAmount} = '0.00'`
      )
    );

  const results = [];

  for (const record of overdueRecords) {
    if (record.dueDate) {
      const dueDate = new Date(record.dueDate);
      const daysOverdue = Math.max(
        0,
        Math.floor(
          (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
        )
      );

      const fineAmount =
        daysOverdue > 0 ? (daysOverdue * dailyFineAmount).toFixed(2) : "0.00";

      await db
        .update(borrowRecords)
        .set({
          fineAmount: fineAmount,
          updatedAt: new Date(),
          updatedBy: record.userEmail,
        })
        .where(eq(borrowRecords.id, record.id));

      results.push({
        recordId: record.id,
        daysOverdue,
        fineAmount,
        updated: true,
      });
    }
  }

  return results;
};

// Force update fines for ALL overdue books (for testing/admin purposes)
export const forceUpdateOverdueFines = async (customFineAmount?: number) => {
  const today = new Date();

  // Import getDailyFineAmount dynamically to avoid circular dependency
  const { getDailyFineAmount } = await import("./config");
  const dailyFineAmount = customFineAmount || (await getDailyFineAmount());

  console.log(
    `Force updating overdue fines with daily amount: $${dailyFineAmount}`
  );

  // Update ALL overdue books regardless of existing fine amounts
  const overdueRecords = await db
    .select({
      id: borrowRecords.id,
      dueDate: borrowRecords.dueDate,
      userEmail: users.email,
      currentFineAmount: borrowRecords.fineAmount, // Add this to see current value
    })
    .from(borrowRecords)
    .innerJoin(users, eq(borrowRecords.userId, users.id))
    .where(
      and(
        eq(borrowRecords.status, "BORROWED"),
        sql`${borrowRecords.dueDate} < ${today}`
      )
    );

  console.log(`Found ${overdueRecords.length} overdue records to update`);

  const results = [];

  for (const record of overdueRecords) {
    if (record.dueDate) {
      const dueDate = new Date(record.dueDate);
      const daysOverdue = Math.max(
        0,
        Math.floor(
          (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
        )
      );

      const fineAmount =
        daysOverdue > 0 ? (daysOverdue * dailyFineAmount).toFixed(2) : "0.00";

      console.log(
        `Updating record ${record.id}: ${record.currentFineAmount} -> ${fineAmount}`
      );

      // Use explicit transaction to ensure commit
      const updateResult = await db
        .update(borrowRecords)
        .set({
          fineAmount: fineAmount,
          updatedAt: new Date(),
          updatedBy: record.userEmail,
        })
        .where(eq(borrowRecords.id, record.id))
        .returning({
          id: borrowRecords.id,
          fineAmount: borrowRecords.fineAmount,
        });

      console.log(`Update result for ${record.id}:`, updateResult);

      // Verify the update was successful by reading back from database
      const verifyResult = await db
        .select({ id: borrowRecords.id, fineAmount: borrowRecords.fineAmount })
        .from(borrowRecords)
        .where(eq(borrowRecords.id, record.id))
        .limit(1);

      console.log(`Verification for ${record.id}:`, verifyResult);

      results.push({
        recordId: record.id,
        daysOverdue,
        fineAmount,
        updated: true,
        previousFineAmount: record.currentFineAmount,
        verifiedFineAmount: verifyResult[0]?.fineAmount,
      });
    }
  }

  console.log(`Force update completed. Updated ${results.length} records.`);

  // Add a small delay to ensure database consistency
  await new Promise((resolve) => setTimeout(resolve, 100));

  return results;
};

export const returnBook = async (recordId: string) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    // Get the borrow record details first with user email
    const record = await db
      .select({
        bookId: borrowRecords.bookId,
        userId: borrowRecords.userId,
        dueDate: borrowRecords.dueDate,
        borrowedBy: borrowRecords.borrowedBy,
        userEmail: users.email,
      })
      .from(borrowRecords)
      .innerJoin(users, eq(borrowRecords.userId, users.id))
      .where(eq(borrowRecords.id, recordId))
      .limit(1);

    if (record.length === 0) {
      return { success: false, error: "Borrow record not found" };
    }

    // Calculate fine if overdue
    const dueDate = record[0].dueDate ? new Date(record[0].dueDate) : null;
    const returnDate = new Date(today);
    const daysOverdue = dueDate
      ? Math.max(
          0,
          Math.floor(
            (returnDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
          )
        )
      : 0;
    const fineAmount =
      daysOverdue > 0 ? (daysOverdue * 1.0).toFixed(2) : "0.00"; // $1 per day overdue

    // Update borrow record with enhanced tracking (store email instead of user ID for readability)
    await db
      .update(borrowRecords)
      .set({
        status: "RETURNED",
        returnDate: today,
        returnedBy: record[0].userEmail, // Store email for better readability
        borrowedBy: record[0].borrowedBy || record[0].userEmail, // Set borrowedBy if not already set
        fineAmount: fineAmount,
        updatedAt: new Date(),
        updatedBy: record[0].userEmail,
      })
      .where(eq(borrowRecords.id, recordId));

    // Update available copies
    const book = await db
      .select({ availableCopies: books.availableCopies })
      .from(books)
      .where(eq(books.id, record[0].bookId))
      .limit(1);

    if (book.length > 0) {
      await db
        .update(books)
        .set({ availableCopies: book[0].availableCopies + 1 })
        .where(eq(books.id, record[0].bookId));
    }

    return {
      success: true,
      data: {
        fineAmount: parseFloat(fineAmount),
        daysOverdue,
        isOverdue: daysOverdue > 0,
      },
    };
  } catch (error) {
    console.error("Error returning book:", error);
    return { success: false, error: "Failed to return book" };
  }
};
