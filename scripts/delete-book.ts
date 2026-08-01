/**
 * One-off hard-delete for a book by UUID.
 *
 * Usage:
 *   npm run delete-book -- --id 78e5c2c9-ac5d-4fe6-8b87-23587399ddf0
 *   npm run delete-book -- --id <uuid> --force-return
 *
 * --force-return: mark BORROWED rows as RETURNED first (junk/test cleanup only).
 * Still requires ADMIN_DELETE_SECRET. Uses the DATABASE_URL from .env
 * (same DB as prod if you share one connection string).
 */

import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { and, eq, inArray, sql } from "drizzle-orm";
import { books, bookReviews, borrowRecords } from "@/database/schema";
import { verifyAdminDeleteSecret } from "@/lib/admin/verifyAdminDeleteSecret";
import { parseDeleteBookArgs } from "@/lib/admin/deleteBookCli";

config({ path: ".env" });

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const { id, forceReturn } = parseDeleteBookArgs(process.argv.slice(2));
  const deleteSecret = process.env.ADMIN_DELETE_SECRET || "";

  const secretCheck = verifyAdminDeleteSecret(deleteSecret);
  if (!secretCheck.ok) {
    throw new Error(secretCheck.message || "Invalid ADMIN_DELETE_SECRET");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { casing: "snake_case" });

  try {
    const existing = await db
      .select({
        id: books.id,
        title: books.title,
        totalCopies: books.totalCopies,
      })
      .from(books)
      .where(eq(books.id, id))
      .limit(1);

    if (existing.length === 0) {
      console.log(`Book ${id} not found — nothing to delete.`);
      return;
    }

    console.log(`Deleting book: "${existing[0].title}" (${id})`);

    const activeBorrows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(borrowRecords)
      .where(
        and(eq(borrowRecords.bookId, id), eq(borrowRecords.status, "BORROWED"))
      );

    const activeCount = Number(activeBorrows[0]?.count ?? 0);
    if (activeCount > 0 && !forceReturn) {
      throw new Error(
        `Cannot delete: book has ${activeCount} active BORROWED record(s). Re-run with --force-return to close them first.`
      );
    }

    await db.transaction(async (tx) => {
      if (forceReturn && activeCount > 0) {
        // Close active loans so hard-delete can proceed (script-only escape hatch)
        await tx
          .update(borrowRecords)
          .set({
            status: "RETURNED",
            returnDate: new Date().toISOString().slice(0, 10),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(borrowRecords.bookId, id),
              eq(borrowRecords.status, "BORROWED")
            )
          );
        console.log(`Force-returned ${activeCount} active borrow(s).`);
      }

      await tx.delete(bookReviews).where(eq(bookReviews.bookId, id));
      await tx.delete(borrowRecords).where(eq(borrowRecords.bookId, id));
      await tx.delete(books).where(inArray(books.id, [id]));
    });

    console.log("Hard-delete completed successfully.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
