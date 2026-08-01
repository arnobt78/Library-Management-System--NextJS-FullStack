"use server";

/**
 * Bulk admin operations for books, users, and borrow requests.
 * Hard-delete books requires ADMIN_DELETE_SECRET and removes reviews + borrow rows first.
 */

import { db } from "@/database/drizzle";
import { books, users, borrowRecords, bookReviews, reservations, reservationEvents } from "@/database/schema";
import { eq, sql, inArray, and } from "drizzle-orm";
import { verifyAdminDeleteSecret } from "../verifyAdminDeleteSecret";
import {
  getActionErrorMessage,
  requireAdminActor,
} from "@/lib/auth/authorization";
import {
  approveBorrowRecords,
  rejectBorrowRecords,
} from "../borrowLifecycle";
import { parseEntityIds } from "../../actionInputs";
import { revalidateMutationPaths } from "@/lib/utils/revalidateMutation";

type BulkBookUpdates = Pick<typeof books.$inferInsert, "isActive">;
type BulkUserUpdates = Pick<typeof users.$inferInsert, "role" | "status">;

// Bulk book operations
export async function bulkUpdateBooks(
  bookIds: string[],
  updates: BulkBookUpdates
) {
  try {
    const actor = await requireAdminActor();
    if (bookIds.length === 0) {
      return { success: false, message: "No books selected" };
    }
    const safeBookIds = parseEntityIds(bookIds);
    await db
      .update(books)
      .set({
        ...updates,
        updatedBy: actor.id,
        updatedAt: new Date(),
      })
      .where(inArray(books.id, safeBookIds));

    revalidateMutationPaths("book.write");
    return {
      success: true,
      message: `Successfully updated ${bookIds.length} book(s)`,
    };
  } catch (error) {
    return {
      success: false,
      message: getActionErrorMessage(error, "Failed to update books"),
    };
  }
}

/**
 * Hard-delete books after secret verification.
 * Order: reservation events → reservations → reviews → borrow records → books.
 * Active loans and reservations block destructive catalog deletion.
 */
export async function bulkDeleteBooks(
  bookIds: string[],
  deleteSecret: string
) {
  try {
    await requireAdminActor();
    if (bookIds.length === 0) {
      return { success: false, message: "No books selected" };
    }
    const safeBookIds = parseEntityIds(bookIds);
    const secretCheck = verifyAdminDeleteSecret(deleteSecret);
    if (!secretCheck.ok) {
      return {
        success: false,
        message: secretCheck.message || "Invalid delete secret.",
      };
    }

    const result = await db.transaction(async (tx) => {
      await tx
        .select({ id: borrowRecords.id })
        .from(borrowRecords)
        .where(inArray(borrowRecords.bookId, safeBookIds))
        .orderBy(borrowRecords.id)
        .for("update");

      await tx
        .select({ id: books.id })
        .from(books)
        .where(inArray(books.id, safeBookIds))
        .orderBy(books.id)
        .for("update");

      const activeBorrows = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(borrowRecords)
        .where(
          and(
            inArray(borrowRecords.bookId, safeBookIds),
            eq(borrowRecords.status, "BORROWED")
          )
        );

      if (Number(activeBorrows[0]?.count ?? 0) > 0) {
        return { success: false as const };
      }

      const activeReservations = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(reservations)
        .where(and(inArray(reservations.bookId, safeBookIds), inArray(reservations.status, ["WAITING", "READY"])));
      if (Number(activeReservations[0]?.count ?? 0) > 0) {
        return { success: false as const };
      }

      const reservationIds = tx
        .select({ id: reservations.id })
        .from(reservations)
        .where(inArray(reservations.bookId, safeBookIds));
      await tx.delete(reservationEvents).where(inArray(reservationEvents.reservationId, reservationIds));
      await tx.delete(reservations).where(inArray(reservations.bookId, safeBookIds));

      await tx
        .delete(bookReviews)
        .where(inArray(bookReviews.bookId, safeBookIds));

      await tx
        .delete(borrowRecords)
        .where(inArray(borrowRecords.bookId, safeBookIds));

      await tx.delete(books).where(inArray(books.id, safeBookIds));
      return { success: true as const };
    });

    if (!result.success) {
      return {
        success: false,
        message: "Cannot delete books with active borrows or reservations",
      };
    }

    revalidateMutationPaths("book.write");
    return {
      success: true,
      message: `Successfully deleted ${bookIds.length} book(s)`,
    };
  } catch (error) {
    return {
      success: false,
      message: getActionErrorMessage(error, "Failed to delete books"),
    };
  }
}

/** Single-book hard delete — same rules as bulkDeleteBooks */
export async function deleteBook(bookId: string, deleteSecret: string) {
  return bulkDeleteBooks([bookId], deleteSecret);
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
  updates: BulkUserUpdates
) {
  try {
    const actor = await requireAdminActor();
    if (userIds.length === 0) {
      return { success: false, message: "No users selected" };
    }
    const safeUserIds = parseEntityIds(userIds);
    await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
        updatedBy: actor.email,
      })
      .where(inArray(users.id, safeUserIds));

    revalidateMutationPaths("user.write");
    return {
      success: true,
      message: `Successfully updated ${userIds.length} user(s)`,
    };
  } catch (error) {
    return {
      success: false,
      message: getActionErrorMessage(error, "Failed to update users"),
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
  try {
    const actor = await requireAdminActor();
    if (recordIds.length === 0) {
      return { success: false, message: "No requests selected" };
    }
    const safeRecordIds = parseEntityIds(recordIds);
    const result = await approveBorrowRecords(safeRecordIds, actor);
    if (!result.success) {
      return { success: false, message: result.error };
    }

    revalidateMutationPaths("borrow.lifecycle");
    return {
      success: true,
      message: `Successfully approved ${recordIds.length} borrow request(s)`,
    };
  } catch (error) {
    return {
      success: false,
      message: getActionErrorMessage(error, "Failed to approve requests"),
    };
  }
}

export async function bulkRejectBorrowRequests(recordIds: string[]) {
  try {
    await requireAdminActor();
    if (recordIds.length === 0) {
      return { success: false, message: "No requests selected" };
    }
    const safeRecordIds = parseEntityIds(recordIds);
    const result = await rejectBorrowRecords(safeRecordIds);
    if (!result.success) {
      return { success: false, message: result.error };
    }

    revalidateMutationPaths("borrow.lifecycle");
    return {
      success: true,
      message: `Successfully rejected ${recordIds.length} borrow request(s)`,
    };
  } catch (error) {
    return {
      success: false,
      message: getActionErrorMessage(error, "Failed to reject requests"),
    };
  }
}

// Get bulk operation statistics
export async function getBulkOperationStats() {
  await requireAdminActor();
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
  await requireAdminActor();
  const safeBookIds = parseEntityIds(bookIds);
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
        inArray(borrowRecords.bookId, safeBookIds),
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
  await requireAdminActor();
  const safeUserIds = parseEntityIds(userIds);
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
          inArray(borrowRecords.userId, safeUserIds),
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
