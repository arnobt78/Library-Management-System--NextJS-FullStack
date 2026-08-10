"use server";

/**
 * Slim admin User 360 reservations loader — same shape as UserReservationItem
 * so circulation.userReservations densify paints the panel.
 */

import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/database/drizzle";
import { books, reservations } from "@/database/schema";
import { requireAdminActor } from "@/lib/auth/authorization";
import { parseEntityId } from "@/lib/actionInputs";
import type { UserReservationItem } from "@/lib/services/reservations";

export async function getAdminUserReservations(
  userId: string,
): Promise<UserReservationItem[]> {
  await requireAdminActor();
  const id = parseEntityId(userId);

  const rows = await db
    .select({
      id: reservations.id,
      status: sql<string>`CASE WHEN ${reservations.status} = 'READY' AND ${reservations.readyExpiresAt} <= CURRENT_TIMESTAMP THEN 'EXPIRED' ELSE ${reservations.status} END`,
      readyExpiresAt: reservations.readyExpiresAt,
      bookId: books.id,
      bookTitle: books.title,
    })
    .from(reservations)
    .innerJoin(books, eq(reservations.bookId, books.id))
    .where(eq(reservations.userId, id))
    .orderBy(desc(reservations.createdAt))
    .limit(25);

  return rows.map((row) => ({
    id: row.id,
    status: row.status as UserReservationItem["status"],
    bookTitle: row.bookTitle,
    bookId: row.bookId,
    queuePosition: null,
    readyExpiresAt: row.readyExpiresAt
      ? String(row.readyExpiresAt)
      : null,
  }));
}
