// Parent: REQ-0030

import { and, asc, eq, gt, inArray, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/database/drizzle";
import {
  books,
  borrowRecords,
  circulationCommands,
  reservations,
  reservationEvents,
  systemConfig,
} from "@/database/schema";
import {
  assertOwnerOrAdmin,
  type AuthorizedActor,
} from "@/lib/auth/authorization";
import { RESERVATION_OUTBOX_LOCK_TIMEOUT_MS } from "@/lib/circulation/outboxPolicy";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type CirculationResult<T = undefined> = T extends undefined
  ? { success: true } | { success: false; error: string }
  : { success: true; data: T } | { success: false; error: string };

async function numericConfig(
  tx: Transaction,
  key: string,
  fallback: number,
): Promise<number> {
  const [row] = await tx
    .select({ value: systemConfig.value })
    .from(systemConfig)
    .where(eq(systemConfig.key, key))
    .limit(1);
  const value = Number(row?.value ?? fallback);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

async function isReadyNotificationDispatching(
  tx: Transaction,
  reservationId: string,
): Promise<boolean> {
  const [event] = await tx
    .select({ id: reservationEvents.id })
    .from(reservationEvents)
    .where(
      and(
        eq(reservationEvents.reservationId, reservationId),
        eq(reservationEvents.eventType, "RESERVATION_READY"),
        isNull(reservationEvents.deliveredAt),
        isNull(reservationEvents.deadLetteredAt),
        gt(
          reservationEvents.lockedAt,
          sql`CURRENT_TIMESTAMP - (${RESERVATION_OUTBOX_LOCK_TIMEOUT_MS} * INTERVAL '1 millisecond')`,
        ),
      ),
    )
    .limit(1);
  return Boolean(event);
}

export async function offerNextReservation(
  tx: Transaction,
  bookId: string,
  actorEmail: string,
): Promise<string | null> {
  const [book] = await tx
    .select({
      availableCopies: books.availableCopies,
      totalCopies: books.totalCopies,
      isActive: books.isActive,
    })
    .from(books)
    .where(eq(books.id, bookId))
    .limit(1)
    .for("update");
  if (!book?.isActive) return null;

  // Expired offers release their held copies before the next FIFO allocation.
  const expired = await tx
    .update(reservations)
    .set({ status: "EXPIRED", updatedAt: new Date(), updatedBy: actorEmail })
    .where(
      and(
        eq(reservations.bookId, bookId),
        eq(reservations.status, "READY"),
        sql`${reservations.readyExpiresAt} <= NOW()`,
        sql`NOT EXISTS (
        SELECT 1 FROM ${reservationEvents} active_delivery
        WHERE active_delivery.reservation_id = ${reservations.id}
          AND active_delivery.delivered_at IS NULL
          AND active_delivery.dead_lettered_at IS NULL
          AND active_delivery.locked_at > CURRENT_TIMESTAMP - (${RESERVATION_OUTBOX_LOCK_TIMEOUT_MS} * INTERVAL '1 millisecond')
      )`,
      ),
    )
    .returning({ id: reservations.id });
  const availableCopies = Math.min(
    book.totalCopies,
    book.availableCopies + expired.length,
  );
  if (expired.length > 0) {
    await tx
      .update(books)
      .set({ availableCopies, updatedAt: new Date() })
      .where(eq(books.id, bookId));
  }
  if (availableCopies <= 0) return null;

  const [next] = await tx
    .select({ id: reservations.id })
    .from(reservations)
    .where(
      and(
        eq(reservations.bookId, bookId),
        eq(reservations.status, "WAITING"),
        sql`NOT EXISTS (
          SELECT 1 FROM ${borrowRecords} active_loan
          WHERE active_loan.user_id = ${reservations.userId}
            AND active_loan.book_id = ${reservations.bookId}
            AND active_loan.status IN ('PENDING', 'BORROWED')
        )`,
      ),
    )
    .orderBy(asc(reservations.createdAt), asc(reservations.id))
    .limit(1)
    .for("update");
  if (!next) return null;

  const readyHours = await numericConfig(tx, "reservation_ready_hours", 48);
  const expiresAt = new Date(Date.now() + readyHours * 60 * 60 * 1000);
  await tx
    .update(reservations)
    .set({
      status: "READY",
      readyExpiresAt: expiresAt,
      updatedAt: new Date(),
      updatedBy: actorEmail,
    })
    .where(
      and(eq(reservations.id, next.id), eq(reservations.status, "WAITING")),
    );
  await tx
    .insert(reservationEvents)
    .values({
      reservationId: next.id,
      eventType: "RESERVATION_READY",
      eventKey: `${next.id}:READY`,
    })
    .onConflictDoNothing();
  await tx
    .update(books)
    .set({
      availableCopies: sql`${books.availableCopies} - 1`,
      updatedAt: new Date(),
    })
    .where(and(eq(books.id, bookId), sql`${books.availableCopies} > 0`));
  return next.id;
}

export async function expireReadyReservations(
  actorEmail = "system:reservation-expiry",
): Promise<number> {
  const candidateBooks = await db
    .selectDistinct({ bookId: reservations.bookId })
    .from(reservations)
    .where(
      and(
        eq(reservations.status, "READY"),
        sql`${reservations.readyExpiresAt} <= CURRENT_TIMESTAMP`,
      ),
    )
    .orderBy(asc(reservations.bookId))
    .limit(100);

  // Each book is reconciled in the same book-first lock order as return,
  // cancellation and fulfillment, keeping concurrent allocators deadlock-safe.
  for (const { bookId } of candidateBooks) {
    await db.transaction((tx) => offerNextReservation(tx, bookId, actorEmail));
  }
  return candidateBooks.length;
}

export function createReservation(
  bookId: string,
  actor: AuthorizedActor,
): Promise<CirculationResult<{ id: string; bookId: string }>> {
  return db.transaction(async (tx) => {
    const [book] = await tx
      .select({
        availableCopies: books.availableCopies,
        isActive: books.isActive,
      })
      .from(books)
      .where(eq(books.id, bookId))
      .limit(1)
      .for("update");
    if (!book?.isActive) return { success: false, error: "Book not found" };
    await offerNextReservation(tx, bookId, actor.email);
    const [reconciledBook] = await tx
      .select({ availableCopies: books.availableCopies })
      .from(books)
      .where(eq(books.id, bookId))
      .limit(1);
    if ((reconciledBook?.availableCopies ?? book.availableCopies) > 0) {
      return { success: false, error: "This book is available to borrow" };
    }

    const [existingLoan] = await tx
      .select({ id: borrowRecords.id })
      .from(borrowRecords)
      .where(
        and(
          eq(borrowRecords.userId, actor.id),
          eq(borrowRecords.bookId, bookId),
          inArray(borrowRecords.status, ["PENDING", "BORROWED"]),
        ),
      )
      .limit(1);
    if (existingLoan)
      return { success: false, error: "You already have an active request" };

    const [created] = await tx
      .insert(reservations)
      .values({ userId: actor.id, bookId, updatedBy: actor.email })
      .onConflictDoNothing()
      .returning({ id: reservations.id });
    return created
      ? { success: true, data: { ...created, bookId } }
      : { success: false, error: "You already have an active reservation" };
  });
}

export function cancelReservation(
  reservationId: string,
  actor: AuthorizedActor,
): Promise<CirculationResult<{ bookId: string }>> {
  return db.transaction(async (tx) => {
    const [reservation] = await tx
      .select({
        id: reservations.id,
        userId: reservations.userId,
        bookId: reservations.bookId,
        status: reservations.status,
        readyExpired: sql<boolean>`COALESCE(${reservations.readyExpiresAt} <= CURRENT_TIMESTAMP, false)`,
      })
      .from(reservations)
      .where(eq(reservations.id, reservationId))
      .limit(1)
      .for("update");
    if (!reservation) return { success: false, error: "Reservation not found" };
    assertOwnerOrAdmin(actor, reservation.userId);
    if (reservation.status !== "WAITING" && reservation.status !== "READY") {
      return { success: false, error: "Reservation is already closed" };
    }
    if (
      reservation.status === "READY" &&
      (await isReadyNotificationDispatching(tx, reservation.id))
    ) {
      return {
        success: false,
        error: "Notification delivery is finishing; retry shortly",
      };
    }
    if (reservation.status === "READY" && reservation.readyExpired) {
      await tx
        .update(reservations)
        .set({
          status: "EXPIRED",
          updatedAt: new Date(),
          updatedBy: actor.email,
        })
        .where(eq(reservations.id, reservation.id));
      await tx
        .update(books)
        .set({
          availableCopies: sql`LEAST(${books.totalCopies}, ${books.availableCopies} + 1)`,
          updatedAt: new Date(),
        })
        .where(eq(books.id, reservation.bookId));
      await offerNextReservation(tx, reservation.bookId, actor.email);
      return { success: false, error: "Reservation has expired" };
    }
    await tx
      .update(reservations)
      .set({
        status: "CANCELLED",
        updatedAt: new Date(),
        updatedBy: actor.email,
      })
      .where(eq(reservations.id, reservation.id));
    if (reservation.status === "READY") {
      await tx
        .update(books)
        .set({
          availableCopies: sql`LEAST(${books.totalCopies}, ${books.availableCopies} + 1)`,
          updatedAt: new Date(),
        })
        .where(eq(books.id, reservation.bookId));
      await offerNextReservation(tx, reservation.bookId, actor.email);
    }
    return { success: true, data: { bookId: reservation.bookId } };
  });
}

export function renewBorrow(
  recordId: string,
  actor: AuthorizedActor,
  commandId?: string,
): Promise<
  CirculationResult<{ bookId: string; dueDate: string; renewalCount: number }>
> {
  return db.transaction(async (tx) => {
    type RenewalResult = CirculationResult<{
      bookId: string;
      dueDate: string;
      renewalCount: number;
    }>;
    if (commandId) {
      const [claim] = await tx
        .insert(circulationCommands)
        .values({
          id: commandId,
          actorId: actor.id,
          operation: "RENEW_BORROW",
          entityId: recordId,
        })
        .onConflictDoNothing()
        .returning({ id: circulationCommands.id });
      if (!claim) {
        const [prior] = await tx
          .select({ result: circulationCommands.result })
          .from(circulationCommands)
          .where(
            and(
              eq(circulationCommands.id, commandId),
              eq(circulationCommands.actorId, actor.id),
              eq(circulationCommands.operation, "RENEW_BORROW"),
              eq(circulationCommands.entityId, recordId),
            ),
          )
          .limit(1);
        if (!prior?.result)
          throw new Error("Invalid or incomplete command replay");
        return prior.result as RenewalResult;
      }
    }
    const finish = async (result: RenewalResult): Promise<RenewalResult> => {
      if (commandId) {
        await tx
          .update(circulationCommands)
          .set({ result })
          .where(eq(circulationCommands.id, commandId));
      }
      return result;
    };
    const [record] = await tx
      .select({
        userId: borrowRecords.userId,
        bookId: borrowRecords.bookId,
        status: borrowRecords.status,
        dueDate: borrowRecords.dueDate,
        renewalCount: borrowRecords.renewalCount,
      })
      .from(borrowRecords)
      .where(eq(borrowRecords.id, recordId))
      .limit(1)
      .for("update");
    if (!record)
      return finish({ success: false, error: "Borrow record not found" });
    assertOwnerOrAdmin(actor, record.userId);
    const today = new Date().toISOString().slice(0, 10);
    if (
      record.status !== "BORROWED" ||
      !record.dueDate ||
      record.dueDate < today
    )
      return finish({ success: false, error: "This loan cannot be renewed" });
    const [maxRenewals, duration] = await Promise.all([
      numericConfig(tx, "max_renewals", 2),
      numericConfig(tx, "borrow_duration_days", 7),
    ]);
    if (record.renewalCount >= maxRenewals)
      return finish({ success: false, error: "Renewal limit reached" });
    const [waiting] = await tx
      .select({ id: reservations.id })
      .from(reservations)
      .where(
        and(
          eq(reservations.bookId, record.bookId),
          ne(reservations.userId, record.userId),
          inArray(reservations.status, ["WAITING", "READY"]),
        ),
      )
      .limit(1);
    if (waiting)
      return finish({
        success: false,
        error: "Another user is waiting for this book",
      });
    const dueDate = new Date(`${record.dueDate}T00:00:00Z`);
    dueDate.setUTCDate(dueDate.getUTCDate() + duration);
    const nextDate = dueDate.toISOString().slice(0, 10);
    const renewalCount = record.renewalCount + 1;
    await tx
      .update(borrowRecords)
      .set({
        dueDate: nextDate,
        renewalCount,
        updatedAt: new Date(),
        updatedBy: actor.email,
      })
      .where(
        and(
          eq(borrowRecords.id, recordId),
          eq(borrowRecords.renewalCount, record.renewalCount),
        ),
      );
    return finish({
      success: true,
      data: { bookId: record.bookId, dueDate: nextDate, renewalCount },
    });
  });
}

export function fulfillReservation(
  reservationId: string,
  actor: AuthorizedActor,
): Promise<
  CirculationResult<{ bookId: string; borrowId: string; dueDate: string }>
> {
  return db.transaction(async (tx) => {
    const [reservation] = await tx
      .select({
        id: reservations.id,
        userId: reservations.userId,
        bookId: reservations.bookId,
        status: reservations.status,
        readyExpiresAt: reservations.readyExpiresAt,
      })
      .from(reservations)
      .where(eq(reservations.id, reservationId))
      .limit(1)
      .for("update");
    if (!reservation) return { success: false, error: "Reservation not found" };
    assertOwnerOrAdmin(actor, reservation.userId);
    if (reservation.status !== "READY" || !reservation.readyExpiresAt)
      return { success: false, error: "Reservation is not ready" };
    if (await isReadyNotificationDispatching(tx, reservation.id)) {
      return {
        success: false,
        error: "Notification delivery is finishing; retry shortly",
      };
    }
    if (reservation.readyExpiresAt.getTime() <= Date.now()) {
      await tx
        .update(reservations)
        .set({
          status: "EXPIRED",
          updatedAt: new Date(),
          updatedBy: actor.email,
        })
        .where(eq(reservations.id, reservation.id));
      await tx
        .update(books)
        .set({
          availableCopies: sql`LEAST(${books.totalCopies}, ${books.availableCopies} + 1)`,
          updatedAt: new Date(),
        })
        .where(eq(books.id, reservation.bookId));
      await offerNextReservation(tx, reservation.bookId, actor.email);
      return { success: false, error: "Reservation has expired" };
    }
    const duration = await numericConfig(tx, "borrow_duration_days", 7);
    const due = new Date();
    due.setUTCDate(due.getUTCDate() + duration);
    const dueDate = due.toISOString().slice(0, 10);
    const [borrow] = await tx
      .insert(borrowRecords)
      .values({
        userId: reservation.userId,
        bookId: reservation.bookId,
        status: "BORROWED",
        borrowedBy: actor.email,
        dueDate,
        updatedBy: actor.email,
      })
      .returning({ id: borrowRecords.id });
    await tx
      .update(reservations)
      .set({
        status: "FULFILLED",
        fulfilledBorrowId: borrow.id,
        updatedAt: new Date(),
        updatedBy: actor.email,
      })
      .where(
        and(
          eq(reservations.id, reservation.id),
          eq(reservations.status, "READY"),
        ),
      );
    return {
      success: true,
      data: { bookId: reservation.bookId, borrowId: borrow.id, dueDate },
    };
  });
}
