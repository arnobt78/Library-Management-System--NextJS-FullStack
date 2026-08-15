/**
 * Annotate activity rows when referenced entities no longer exist.
 * Soft UUID on activity_logs — no FK; batch existence checks for linkability.
 * Parent: universal hard-delete activity unlink
 */

import "server-only";

import { inArray } from "drizzle-orm";
import { db } from "@/database/drizzle";
import {
  bookReviews,
  books,
  borrowRecords,
  supportTickets,
  users,
} from "@/database/schema";

type ActivityLike = {
  entityType: string;
  entityId: string | null;
  details: Record<string, unknown> | null;
};

function withEntityDeleted(
  details: Record<string, unknown> | null,
): Record<string, unknown> {
  return { ...(details ?? {}), entityDeleted: true };
}

function collectIds(
  rows: ActivityLike[],
  entityType: string,
): string[] {
  const ids = new Set<string>();
  for (const row of rows) {
    if (row.entityType === entityType && row.entityId) {
      ids.add(row.entityId);
    }
  }
  return [...ids];
}

function collectReservationBookIds(rows: ActivityLike[]): string[] {
  const ids = new Set<string>();
  for (const row of rows) {
    if (row.entityType !== "reservation") continue;
    const bookId = row.details?.bookId;
    if (typeof bookId === "string" && bookId.length > 0) {
      ids.add(bookId);
    }
  }
  return [...ids];
}

async function loadAliveIds(
  table: typeof books | typeof bookReviews | typeof supportTickets | typeof users | typeof borrowRecords,
  ids: string[],
): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const existing = await db
    .select({ id: table.id })
    .from(table)
    .where(inArray(table.id, ids));
  return new Set(existing.map((r) => r.id));
}

/**
 * For FIFO activity payloads: mark rows whose hard-deleted targets are gone so
 * `isActivityEntityLinkable` stays false after refresh / other tabs.
 * Soft REJECTED/CANCELLED rows are unchanged (detail surfaces still exist).
 */
export async function annotateMissingActivityEntities<T extends ActivityLike>(
  rows: T[],
): Promise<T[]> {
  if (rows.length === 0) return rows;

  const bookIds = [
    ...new Set([
      ...collectIds(rows, "book"),
      ...collectReservationBookIds(rows),
    ]),
  ];
  const reviewIds = collectIds(rows, "review");
  const ticketIds = collectIds(rows, "ticket");
  const userIds = collectIds(rows, "user");
  const borrowIds = collectIds(rows, "borrow");

  const [aliveBooks, aliveReviews, aliveTickets, aliveUsers, aliveBorrows] =
    await Promise.all([
      loadAliveIds(books, bookIds),
      loadAliveIds(bookReviews, reviewIds),
      loadAliveIds(supportTickets, ticketIds),
      loadAliveIds(users, userIds),
      loadAliveIds(borrowRecords, borrowIds),
    ]);

  return rows.map((row) => {
    if (row.entityType === "book" && row.entityId && !aliveBooks.has(row.entityId)) {
      return { ...row, details: withEntityDeleted(row.details) };
    }
    if (row.entityType === "reservation") {
      const bookId = row.details?.bookId;
      if (
        typeof bookId === "string" &&
        bookId.length > 0 &&
        !aliveBooks.has(bookId)
      ) {
        return { ...row, details: withEntityDeleted(row.details) };
      }
    }
    if (
      row.entityType === "review" &&
      row.entityId &&
      !aliveReviews.has(row.entityId)
    ) {
      return { ...row, details: withEntityDeleted(row.details) };
    }
    if (
      row.entityType === "ticket" &&
      row.entityId &&
      !aliveTickets.has(row.entityId)
    ) {
      return { ...row, details: withEntityDeleted(row.details) };
    }
    if (row.entityType === "user" && row.entityId && !aliveUsers.has(row.entityId)) {
      return { ...row, details: withEntityDeleted(row.details) };
    }
    if (
      row.entityType === "borrow" &&
      row.entityId &&
      !aliveBorrows.has(row.entityId)
    ) {
      return { ...row, details: withEntityDeleted(row.details) };
    }
    return row;
  });
}

/** @deprecated Use annotateMissingActivityEntities — kept for import stability. */
export const annotateMissingBookEntities = annotateMissingActivityEntities;
