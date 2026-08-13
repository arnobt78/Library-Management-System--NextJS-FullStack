// Parent: REQ-0025
// Replay-safe borrow state transitions with inventory updates in one transaction.

import { db } from "@/database/drizzle";
import { books, borrowRecords, users } from "@/database/schema";
import {
  assertOwnerOrAdmin,
  type AuthorizedActor,
} from "@/lib/auth/authorization";
import { and, eq, inArray, sql } from "drizzle-orm";
import {
  canApproveBorrow,
  canCancelBorrow,
  canReturnBorrow,
} from "./borrowTransitionPolicy";
import { offerNextReservation } from "@/lib/circulation/reservations";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type BorrowActionResult<T = undefined> = T extends undefined
  ? { success: true } | { success: false; error: string }
  : { success: true; data: T } | { success: false; error: string };

interface ReturnResult {
  fineAmount: number;
  daysOverdue: number;
  isOverdue: boolean;
  /** Absolute copies after return + optional FIFO offer. */
  availableCopies: number;
  /** WAITING→READY reservation id when offer consumed the returned copy. */
  offeredReservationId: string | null;
}

function getDueDate(): string {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7);
  dueDate.setHours(23, 59, 59, 999);
  return dueDate.toISOString().slice(0, 10);
}

async function approveWithTransaction(
  tx: Transaction,
  recordId: string,
  actor: AuthorizedActor
): Promise<BorrowActionResult> {
  const [record] = await tx
    .select({
      bookId: borrowRecords.bookId,
      status: borrowRecords.status,
      userEmail: users.email,
    })
    .from(borrowRecords)
    .innerJoin(users, eq(borrowRecords.userId, users.id))
    .where(eq(borrowRecords.id, recordId))
    .limit(1)
    .for("update");

  if (!record) {
    return { success: false, error: "Borrow record not found" };
  }

  const [book] = await tx
    .select({ availableCopies: books.availableCopies })
    .from(books)
    .where(eq(books.id, record.bookId))
    .limit(1)
    .for("update");

  if (!book) {
    return { success: false, error: "Book is no longer available" };
  }

  const decision = canApproveBorrow(record.status, book.availableCopies);
  if (!decision.allowed) {
    return { success: false, error: decision.error };
  }

  const updated = await tx
    .update(borrowRecords)
    .set({
      status: "BORROWED",
      // Issuer/admin email — Status & Issuer joins borrowed_by → approvedByActor.
      borrowedBy: actor.email,
      dueDate: getDueDate(),
      updatedAt: new Date(),
      updatedBy: actor.email,
    })
    .where(
      and(
        eq(borrowRecords.id, recordId),
        eq(borrowRecords.status, "PENDING")
      )
    )
    .returning({ id: borrowRecords.id });

  if (updated.length !== 1) {
    return { success: false, error: "This request has already been processed" };
  }

  await tx
    .update(books)
    .set({
      availableCopies: sql`${books.availableCopies} - 1`,
      updatedAt: new Date(),
    })
    .where(and(eq(books.id, record.bookId), sql`${books.availableCopies} > 0`));

  return { success: true };
}

async function returnWithTransaction(
  tx: Transaction,
  recordId: string,
  actor: AuthorizedActor,
  dailyFineAmount: number
): Promise<BorrowActionResult<ReturnResult>> {
  const [record] = await tx
    .select({
      bookId: borrowRecords.bookId,
      userId: borrowRecords.userId,
      status: borrowRecords.status,
      dueDate: borrowRecords.dueDate,
      borrowedBy: borrowRecords.borrowedBy,
      userEmail: users.email,
    })
    .from(borrowRecords)
    .innerJoin(users, eq(borrowRecords.userId, users.id))
    .where(eq(borrowRecords.id, recordId))
    .limit(1)
    .for("update");

  if (!record) {
    return { success: false, error: "Borrow record not found" };
  }

  assertOwnerOrAdmin(actor, record.userId);

  const decision = canReturnBorrow(record.status);
  if (!decision.allowed) {
    return { success: false, error: decision.error };
  }

  const [book] = await tx
    .select({
      availableCopies: books.availableCopies,
      totalCopies: books.totalCopies,
    })
    .from(books)
    .where(eq(books.id, record.bookId))
    .limit(1)
    .for("update");

  if (!book) {
    return { success: false, error: "Book not found" };
  }

  const today = new Date().toISOString().slice(0, 10);
  const dueDate = record.dueDate ? new Date(record.dueDate) : null;
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
    daysOverdue > 0
      ? (daysOverdue * dailyFineAmount).toFixed(2)
      : "0.00";

  const updated = await tx
    .update(borrowRecords)
    .set({
      status: "RETURNED",
      returnDate: today,
      returnedBy: actor.email,
      borrowedBy: record.borrowedBy || record.userEmail,
      fineAmount,
      updatedAt: new Date(),
      updatedBy: actor.email,
    })
    .where(
      and(
        eq(borrowRecords.id, recordId),
        eq(borrowRecords.status, "BORROWED")
      )
    )
    .returning({ id: borrowRecords.id });

  if (updated.length !== 1) {
    return { success: false, error: "This book has already been returned" };
  }

  await tx
    .update(books)
    .set({
      availableCopies: sql`LEAST(${books.totalCopies}, ${books.availableCopies} + 1)`,
      updatedAt: new Date(),
    })
    .where(eq(books.id, record.bookId));

  const offeredReservationId = await offerNextReservation(
    tx,
    record.bookId,
    actor.email,
  );

  const [bookAfter] = await tx
    .select({ availableCopies: books.availableCopies })
    .from(books)
    .where(eq(books.id, record.bookId))
    .limit(1);

  return {
    success: true,
    data: {
      fineAmount: Number(fineAmount),
      daysOverdue,
      isOverdue: daysOverdue > 0,
      availableCopies: bookAfter?.availableCopies ?? 0,
      offeredReservationId,
    },
  };
}

export function approveBorrowRecord(
  recordId: string,
  actor: AuthorizedActor
): Promise<BorrowActionResult> {
  return db.transaction((tx) => approveWithTransaction(tx, recordId, actor));
}

export function returnBorrowRecord(
  recordId: string,
  actor: AuthorizedActor,
  dailyFineAmount: number
): Promise<BorrowActionResult<ReturnResult>> {
  return db.transaction((tx) =>
    returnWithTransaction(tx, recordId, actor, dailyFineAmount)
  );
}

export async function rejectBorrowRecord(
  recordId: string,
  actorEmail?: string,
): Promise<BorrowActionResult> {
  return db.transaction(async (tx) => {
    const [record] = await tx
      .select({ status: borrowRecords.status })
      .from(borrowRecords)
      .where(eq(borrowRecords.id, recordId))
      .limit(1)
      .for("update");

    if (!record) {
      return { success: false, error: "Borrow record not found" };
    }

    const decision = canCancelBorrow(record.status);
    if (!decision.allowed) {
      return { success: false, error: decision.error };
    }

    // Soft-cancel: keep the row so profile + admin lists retain history.
    const updated = await tx
      .update(borrowRecords)
      .set({
        status: "CANCELLED",
        updatedAt: new Date(),
        updatedBy: actorEmail ?? "admin",
        notes: "Rejected by librarian",
      })
      .where(
        and(
          eq(borrowRecords.id, recordId),
          eq(borrowRecords.status, "PENDING"),
        ),
      )
      .returning({ id: borrowRecords.id });

    if (updated.length !== 1) {
      return { success: false, error: "This request has already been processed" };
    }

    return { success: true };
  });
}

/**
 * Owner withdraws a still-PENDING borrow request (soft-cancel).
 * Same CANCELLED history row as librarian reject; notes attribute the borrower.
 */
export async function cancelOwnBorrowRecord(
  recordId: string,
  actor: AuthorizedActor,
): Promise<BorrowActionResult> {
  return db.transaction(async (tx) => {
    const [record] = await tx
      .select({
        status: borrowRecords.status,
        userId: borrowRecords.userId,
      })
      .from(borrowRecords)
      .where(eq(borrowRecords.id, recordId))
      .limit(1)
      .for("update");

    if (!record) {
      return { success: false, error: "Borrow record not found" };
    }

    if (record.userId !== actor.id) {
      return { success: false, error: "You can only cancel your own requests" };
    }

    const decision = canCancelBorrow(record.status);
    if (!decision.allowed) {
      return { success: false, error: decision.error };
    }

    const updated = await tx
      .update(borrowRecords)
      .set({
        status: "CANCELLED",
        updatedAt: new Date(),
        updatedBy: actor.email,
        notes: "Cancelled by borrower",
      })
      .where(
        and(
          eq(borrowRecords.id, recordId),
          eq(borrowRecords.userId, actor.id),
          eq(borrowRecords.status, "PENDING"),
        ),
      )
      .returning({ id: borrowRecords.id });

    if (updated.length !== 1) {
      return { success: false, error: "This request has already been processed" };
    }

    return { success: true };
  });
}

export function approveBorrowRecords(
  recordIds: string[],
  actor: AuthorizedActor
): Promise<BorrowActionResult> {
  return db.transaction(async (tx) => {
    for (const recordId of [...new Set(recordIds)].sort()) {
      const result = await approveWithTransaction(tx, recordId, actor);
      if (!result.success) {
        throw new Error(result.error);
      }
    }
    return { success: true };
  });
}

export function rejectBorrowRecords(
  recordIds: string[],
  actorEmail?: string,
): Promise<BorrowActionResult> {
  return db.transaction(async (tx) => {
    const uniqueIds = [...new Set(recordIds)];
    const records = await tx
      .select({ id: borrowRecords.id, status: borrowRecords.status })
      .from(borrowRecords)
      .where(inArray(borrowRecords.id, uniqueIds))
      .orderBy(borrowRecords.id)
      .for("update");

    if (
      records.length !== uniqueIds.length ||
      records.some((record) => record.status !== "PENDING")
    ) {
      return { success: false, error: "One or more requests were already processed" };
    }

    // Soft-cancel all selected pending rows (preserve audit trail).
    await tx
      .update(borrowRecords)
      .set({
        status: "CANCELLED",
        updatedAt: new Date(),
        updatedBy: actorEmail ?? "admin",
        notes: "Rejected by librarian",
      })
      .where(inArray(borrowRecords.id, uniqueIds));
    return { success: true };
  });
}
