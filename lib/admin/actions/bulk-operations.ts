"use server";

import { db } from "@/database/drizzle";
import { books, users, borrowRecords } from "@/database/schema";
import { eq, sql, inArray, and } from "drizzle-orm";

// Bulk book operations
export async function bulkUpdateBooks(
  bookIds: string[],
  updates: Partial<typeof books.$inferInsert>
) {
  if (bookIds.length === 0) {
    return { success: false, message: "No books selected" };
  }

  try {
    await db
      .update(books)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(inArray(books.id, bookIds));

    return {
      success: true,
      message: `Successfully updated ${bookIds.length} book(s)`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to update books: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

export async function bulkDeleteBooks(bookIds: string[]) {
  if (bookIds.length === 0) {
    return { success: false, message: "No books selected" };
  }

  try {
    // Check if any books have active borrows
    const activeBorrows = await db
      .select({ count: sql<number>`count(*)` })
      .from(borrowRecords)
      .where(
        and(
          inArray(borrowRecords.bookId, bookIds),
          eq(borrowRecords.status, "BORROWED")
        )
      );

    if (activeBorrows[0]?.count > 0) {
      return {
        success: false,
        message: "Cannot delete books with active borrows",
      };
    }

    // Delete borrow records first
    await db
      .delete(borrowRecords)
      .where(inArray(borrowRecords.bookId, bookIds));

    // Delete books
    await db.delete(books).where(inArray(books.id, bookIds));

    return {
      success: true,
      message: `Successfully deleted ${bookIds.length} book(s)`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to delete books: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

export async function bulkActivateBooks(bookIds: string[]) {
  return bulkUpdateBooks(bookIds, { isActive: true });
}

export async function bulkDeactivateBooks(bookIds: string[]) {
  return bulkUpdateBooks(bookIds, { isActive: false });
}

// Bulk user operations
export async function bulkUpdateUsers(
  userIds: string[],
  updates: Partial<typeof users.$inferInsert>
) {
  if (userIds.length === 0) {
    return { success: false, message: "No users selected" };
  }

  try {
    await db
      .update(users)
      .set({
        ...updates,
      })
      .where(inArray(users.id, userIds));

    return {
      success: true,
      message: `Successfully updated ${userIds.length} user(s)`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to update users: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

export async function bulkApproveUsers(userIds: string[]) {
  return bulkUpdateUsers(userIds, { status: "APPROVED" });
}

export async function bulkRejectUsers(userIds: string[]) {
  return bulkUpdateUsers(userIds, { status: "REJECTED" });
}

export async function bulkMakeAdminUsers(userIds: string[]) {
  return bulkUpdateUsers(userIds, { role: "ADMIN" });
}

export async function bulkRemoveAdminUsers(userIds: string[]) {
  return bulkUpdateUsers(userIds, { role: "USER" });
}

// Bulk borrow operations
export async function bulkApproveBorrowRequests(recordIds: string[]) {
  if (recordIds.length === 0) {
    return { success: false, message: "No requests selected" };
  }

  try {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    sevenDaysFromNow.setHours(23, 59, 59, 999); // Set to end of day

    await db
      .update(borrowRecords)
      .set({
        status: "BORROWED",
        dueDate: sevenDaysFromNow.toISOString(),
        updatedAt: new Date(),
      })
      .where(inArray(borrowRecords.id, recordIds));

    return {
      success: true,
      message: `Successfully approved ${recordIds.length} borrow request(s)`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to approve requests: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

export async function bulkRejectBorrowRequests(recordIds: string[]) {
  if (recordIds.length === 0) {
    return { success: false, message: "No requests selected" };
  }

  try {
    await db
      .update(borrowRecords)
      .set({
        status: "RETURNED",
        updatedAt: new Date(),
      })
      .where(inArray(borrowRecords.id, recordIds));

    return {
      success: true,
      message: `Successfully rejected ${recordIds.length} borrow request(s)`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to reject requests: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

// Get bulk operation statistics
export async function getBulkOperationStats() {
  const [totalBooks, totalUsers, pendingRequests, activeBorrows] =
    await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(books),
      db.select({ count: sql<number>`count(*)` }).from(users),
      db
        .select({ count: sql<number>`count(*)` })
        .from(borrowRecords)
        .where(eq(borrowRecords.status, "PENDING")),
      db
        .select({ count: sql<number>`count(*)` })
        .from(borrowRecords)
        .where(eq(borrowRecords.status, "BORROWED")),
    ]);

  return {
    totalBooks: totalBooks[0]?.count || 0,
    totalUsers: totalUsers[0]?.count || 0,
    pendingRequests: pendingRequests[0]?.count || 0,
    activeBorrows: activeBorrows[0]?.count || 0,
  };
}

// Validate bulk operations
export async function validateBulkBookOperation(
  bookIds: string[],
  operation: string
) {
  if (bookIds.length === 0) {
    return { valid: false, message: "No books selected" };
  }

  if (operation === "delete") {
    // Check for active borrows
    const activeBorrows = await db
      .select({ count: sql<number>`count(*)` })
      .from(borrowRecords)
      .where(
        and(
          inArray(borrowRecords.bookId, bookIds),
          eq(borrowRecords.status, "BORROWED")
        )
      );

    if (activeBorrows[0]?.count > 0) {
      return {
        valid: false,
        message: `${activeBorrows[0].count} book(s) have active borrows and cannot be deleted`,
      };
    }
  }

  return { valid: true, message: "Operation is valid" };
}

export async function validateBulkUserOperation(
  userIds: string[],
  operation: string
) {
  if (userIds.length === 0) {
    return { valid: false, message: "No users selected" };
  }

  if (operation === "delete") {
    // Check for active borrows
    const activeBorrows = await db
      .select({ count: sql<number>`count(*)` })
      .from(borrowRecords)
      .where(
        and(
          inArray(borrowRecords.userId, userIds),
          eq(borrowRecords.status, "BORROWED")
        )
      );

    if (activeBorrows[0]?.count > 0) {
      return {
        valid: false,
        message: `${activeBorrows[0].count} user(s) have active borrows and cannot be deleted`,
      };
    }
  }

  return { valid: true, message: "Operation is valid" };
}
