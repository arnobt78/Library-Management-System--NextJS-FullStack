"use server";

/**
 * Bulk admin operations for books, users, and borrow requests.
 * Hard-delete books requires ADMIN_DELETE_SECRET and removes reviews + borrow rows first.
 */

import { db } from "@/database/drizzle";
import {
  books,
  users,
  userStatusDecisions,
  borrowRecords,
  bookReviews,
  reservations,
  reservationEvents,
} from "@/database/schema";
import { eq, sql, inArray, and } from "drizzle-orm";
import { after } from "next/server";
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
import {
  DEFAULT_ACCOUNT_REJECTION_REASON,
  notifyAccountStatusDecision,
} from "@/lib/admin/accountStatusEmails";
import { isProtectedDemoAccount } from "@/constants";
import {
  revokeLatestApprovedAdminRequest,
  settlePendingOrInsertApprovedAdminRequest,
} from "@/lib/admin/adminPrivilegeLedger";

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
    // Role changes must go through ledger-aware promote/demote (not a bare UPDATE).
    if (updates.role === "ADMIN") {
      return bulkMakeAdminUsers(userIds);
    }
    if (updates.role === "USER") {
      return bulkRemoveAdminUsers(userIds);
    }

    const actor = await requireAdminActor();
    if (userIds.length === 0) {
      return { success: false, message: "No users selected" };
    }
    const safeUserIds = parseEntityIds(userIds);
    const decidedAt = new Date();

    // When status is decided, also stamp durable statusReviewedBy/At (UUID actor).
    const statusReviewPatch =
      updates.status === "APPROVED" || updates.status === "REJECTED"
        ? {
            statusReviewedBy: actor.id,
            statusReviewedAt: decidedAt,
          }
        : updates.status === "PENDING"
          ? {
              statusReviewedBy: null,
              statusReviewedAt: null,
            }
          : {};

    const { role: _ignoredRole, ...nonRoleUpdates } = updates;

    await db
      .update(users)
      .set({
        ...nonRoleUpdates,
        updatedAt: decidedAt,
        updatedBy: actor.email,
        ...statusReviewPatch,
      })
      .where(inArray(users.id, safeUserIds));

    if (updates.status === "APPROVED" || updates.status === "REJECTED") {
      await db.insert(userStatusDecisions).values(
        safeUserIds.map((id) => ({
          userId: id,
          decision: updates.status as "APPROVED" | "REJECTED",
          decidedBy: actor.id,
          decidedAt,
        })),
      );
    }

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

/**
 * Bulk signup approve — stamps statusReviewed* and emails each non-demo target.
 */
export async function bulkApproveUsers(userIds: string[]) {
  try {
    const actor = await requireAdminActor();
    if (userIds.length === 0) {
      return { success: false, message: "No users selected" };
    }
    const safeUserIds = parseEntityIds(userIds);
    const decidedAt = new Date();

    const targets = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        universityId: users.universityId,
        status: users.status,
      })
      .from(users)
      .where(inArray(users.id, safeUserIds));

    const eligible = targets.filter((u) => !isProtectedDemoAccount(u));
    const eligibleIds = eligible.map((u) => u.id);
    if (eligibleIds.length === 0) {
      return { success: false, message: "No eligible users to approve" };
    }

    await db
      .update(users)
      .set({
        status: "APPROVED",
        updatedAt: decidedAt,
        updatedBy: actor.email,
        statusReviewedBy: actor.id,
        statusReviewedAt: decidedAt,
      })
      .where(inArray(users.id, eligibleIds));

    // Append-only ledger rows (one per approved user this batch)
    if (eligibleIds.length > 0) {
      await db.insert(userStatusDecisions).values(
        eligibleIds.map((id) => ({
          userId: id,
          decision: "APPROVED" as const,
          decidedBy: actor.id,
          decidedAt,
        })),
      );
    }

    revalidateMutationPaths("user.write");

    const toNotify = eligible.filter((u) => u.status !== "APPROVED");
    if (toNotify.length > 0) {
      after(async () => {
        await Promise.all(
          toNotify.map((u) =>
            notifyAccountStatusDecision({
              to: u.email,
              fullName: u.fullName,
              status: "APPROVED",
              userId: u.id,
              decidedAt,
              decidedBy: { fullName: actor.name, email: actor.email },
            }),
          ),
        );
      });
    }

    return {
      success: true,
      message: `Successfully approved ${eligibleIds.length} user(s)`,
    };
  } catch (error) {
    return {
      success: false,
      message: getActionErrorMessage(error, "Failed to approve users"),
    };
  }
}

/**
 * Bulk signup reject — stamps statusReviewed* and emails each non-demo target.
 */
export async function bulkRejectUsers(userIds: string[]) {
  try {
    const actor = await requireAdminActor();
    if (userIds.length === 0) {
      return { success: false, message: "No users selected" };
    }
    const safeUserIds = parseEntityIds(userIds);
    const decidedAt = new Date();

    const targets = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        universityId: users.universityId,
        status: users.status,
      })
      .from(users)
      .where(inArray(users.id, safeUserIds));

    const eligible = targets.filter((u) => !isProtectedDemoAccount(u));
    const eligibleIds = eligible.map((u) => u.id);
    if (eligibleIds.length === 0) {
      return { success: false, message: "No eligible users to reject" };
    }

    await db
      .update(users)
      .set({
        status: "REJECTED",
        updatedAt: decidedAt,
        updatedBy: actor.email,
        statusReviewedBy: actor.id,
        statusReviewedAt: decidedAt,
      })
      .where(inArray(users.id, eligibleIds));

    if (eligibleIds.length > 0) {
      await db.insert(userStatusDecisions).values(
        eligibleIds.map((id) => ({
          userId: id,
          decision: "REJECTED" as const,
          decidedBy: actor.id,
          decidedAt,
        })),
      );
    }

    revalidateMutationPaths("user.write");

    const toNotify = eligible.filter((u) => u.status !== "REJECTED");
    if (toNotify.length > 0) {
      after(async () => {
        await Promise.all(
          toNotify.map((u) =>
            notifyAccountStatusDecision({
              to: u.email,
              fullName: u.fullName,
              status: "REJECTED",
              userId: u.id,
              decidedAt,
              decidedBy: { fullName: actor.name, email: actor.email },
              rejectionReason: DEFAULT_ACCOUNT_REJECTION_REASON,
            }),
          ),
        );
      });
    }

    return {
      success: true,
      message: `Successfully rejected ${eligibleIds.length} user(s)`,
    };
  } catch (error) {
    return {
      success: false,
      message: getActionErrorMessage(error, "Failed to reject users"),
    };
  }
}

/**
 * Bulk promote — same admin_requests ledger as single updateUserRole(ADMIN)
 * (approve PENDING or insert direct-grant APPROVED). Skips demo + already ADMIN.
 */
export async function bulkMakeAdminUsers(userIds: string[]) {
  try {
    const actor = await requireAdminActor();
    if (userIds.length === 0) {
      return { success: false, message: "No users selected" };
    }
    const safeUserIds = parseEntityIds(userIds);
    const decidedAt = new Date();

    const targets = await db
      .select({
        id: users.id,
        email: users.email,
        universityId: users.universityId,
        role: users.role,
      })
      .from(users)
      .where(inArray(users.id, safeUserIds));

    const eligible = targets.filter(
      (u) => u.role !== "ADMIN" && !isProtectedDemoAccount(u),
    );

    if (eligible.length === 0) {
      return {
        success: false,
        message: "No eligible users to promote (demo or already admin)",
      };
    }

    await db.transaction(async (tx) => {
      for (const target of eligible) {
        await tx
          .update(users)
          .set({
            role: "ADMIN",
            updatedAt: decidedAt,
            updatedBy: actor.email,
          })
          .where(eq(users.id, target.id));

        await settlePendingOrInsertApprovedAdminRequest(tx, {
          userId: target.id,
          actorId: actor.id,
          now: decidedAt,
        });
      }
    });

    revalidateMutationPaths("admin-request.write");
    return {
      success: true,
      message: `Successfully promoted ${eligible.length} user(s) to admin`,
    };
  } catch (error) {
    return {
      success: false,
      message: getActionErrorMessage(error, "Failed to promote users"),
    };
  }
}

/**
 * Bulk demote — settles APPROVED admin_requests like removeAdminPrivileges.
 * Skips demo + non-ADMIN targets.
 */
export async function bulkRemoveAdminUsers(userIds: string[]) {
  try {
    const actor = await requireAdminActor();
    if (userIds.length === 0) {
      return { success: false, message: "No users selected" };
    }
    const safeUserIds = parseEntityIds(userIds);
    const decidedAt = new Date();

    const targets = await db
      .select({
        id: users.id,
        email: users.email,
        universityId: users.universityId,
        role: users.role,
      })
      .from(users)
      .where(inArray(users.id, safeUserIds));

    const eligible = targets.filter(
      (u) => u.role === "ADMIN" && !isProtectedDemoAccount(u),
    );

    if (eligible.length === 0) {
      return {
        success: false,
        message: "No eligible admins to demote (demo or not admin)",
      };
    }

    await db.transaction(async (tx) => {
      for (const target of eligible) {
        await tx
          .update(users)
          .set({
            role: "USER",
            updatedAt: decidedAt,
            updatedBy: actor.email,
          })
          .where(eq(users.id, target.id));

        await revokeLatestApprovedAdminRequest(tx, {
          userId: target.id,
          actorId: actor.id,
          now: decidedAt,
        });
      }
    });

    revalidateMutationPaths("admin-request.write");
    return {
      success: true,
      message: `Successfully removed admin from ${eligible.length} user(s)`,
    };
  } catch (error) {
    return {
      success: false,
      message: getActionErrorMessage(error, "Failed to remove admin privileges"),
    };
  }
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
    const actor = await requireAdminActor();
    if (recordIds.length === 0) {
      return { success: false, message: "No requests selected" };
    }
    const safeRecordIds = parseEntityIds(recordIds);
    const result = await rejectBorrowRecords(safeRecordIds, actor.email);
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
