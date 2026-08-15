/**
 * delete-user-by-email.ts
 *
 * FK-safe hard delete of a single user (and their circulation/review/admin-request rows)
 * so you can re-register the same email for end-to-end signup → approve/reject → make-admin tests.
 *
 * Does NOT wipe books, demo accounts, or system_config.
 * Restores available_copies for any BORROWED rows owned by the deleted user.
 * After commit, best-effort ImageKit purge of university_card when it lives under ids/.
 *
 * Usage:
 *   npx tsx scripts/delete-user-by-email.ts
 *   npx tsx scripts/delete-user-by-email.ts arnob_t78@yahoo.com
 *   npm run user:delete -- arnob_t78@yahoo.com
 *
 * Requires DATABASE_URL in .env / .env.local
 */

import { config } from "dotenv";
import { Pool } from "pg";

config({ path: ".env" });
config({ path: ".env.local", override: true });

import { isProtectedDemoAccount } from "@/constants";
import { purgeImageKitMedia } from "@/lib/media/imagekitPurge";

const DEFAULT_EMAIL = "arnob_t78@yahoo.com";

async function main() {
  const emailArg = process.argv[2]?.trim().toLowerCase();
  const email = (emailArg || DEFAULT_EMAIL).toLowerCase();

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  if (!email.includes("@")) {
    throw new Error(`Invalid email: ${email}`);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  let universityCard: string | null = null;

  try {
    await client.query("BEGIN");

    const found = await client.query<{
      id: string;
      email: string;
      full_name: string;
      university_id: number;
      status: string;
      role: string;
      university_card: string | null;
    }>(
      `SELECT id, email, full_name, university_id, status, role, university_card
       FROM users
       WHERE lower(email) = $1
       LIMIT 1`,
      [email],
    );

    if (found.rowCount !== 1) {
      await client.query("ROLLBACK");
      console.log(`No user found for ${email} — nothing to delete.`);
      return;
    }

    const user = found.rows[0];
    universityCard = user.university_card;

    if (
      isProtectedDemoAccount({
        email: user.email,
        universityId: user.university_id,
      })
    ) {
      await client.query("ROLLBACK");
      throw new Error(
        `Refusing to delete protected demo account ${user.email}`,
      );
    }

    const userId = user.id;
    console.log(
      `Deleting ${user.email} (${user.full_name}, ${user.status}/${user.role})…`,
    );

    // Detach non-owned FKs that only reference this user as actor/reviewer.
    await client.query(
      `UPDATE books SET updated_by = NULL WHERE updated_by = $1`,
      [userId],
    );
    await client.query(
      `UPDATE admin_requests SET reviewed_by = NULL WHERE reviewed_by = $1`,
      [userId],
    );
    await client.query(
      `UPDATE users SET status_reviewed_by = NULL WHERE status_reviewed_by = $1`,
      [userId],
    );
    // Ledger decided_by is ON DELETE SET NULL; still clear explicitly for clarity.
    await client.query(
      `UPDATE user_status_decisions SET decided_by = NULL WHERE decided_by = $1`,
      [userId],
    );

    // Outbox rows for this user's reservations
    const reservationEvents = await client.query(
      `DELETE FROM reservation_events
       WHERE reservation_id IN (
         SELECT id FROM reservations WHERE user_id = $1
       )`,
      [userId],
    );
    console.log(`  ✓ reservation_events (${reservationEvents.rowCount ?? 0})`);

    const commands = await client.query(
      `DELETE FROM circulation_commands WHERE actor_id = $1`,
      [userId],
    );
    console.log(`  ✓ circulation_commands (${commands.rowCount ?? 0})`);

    const reservations = await client.query(
      `DELETE FROM reservations WHERE user_id = $1`,
      [userId],
    );
    console.log(`  ✓ reservations (${reservations.rowCount ?? 0})`);

    // Return inventory for active loans before removing borrow rows.
    const restored = await client.query(
      `UPDATE books b
       SET available_copies = LEAST(b.total_copies, b.available_copies + sub.cnt),
           updated_at = NOW()
       FROM (
         SELECT book_id, COUNT(*)::int AS cnt
         FROM borrow_records
         WHERE user_id = $1 AND status = 'BORROWED'
         GROUP BY book_id
       ) sub
       WHERE b.id = sub.book_id
       RETURNING b.id`,
      [userId],
    );
    if ((restored.rowCount ?? 0) > 0) {
      console.log(`  ✓ restored available_copies on ${restored.rowCount} book(s)`);
    }

    const borrows = await client.query(
      `DELETE FROM borrow_records WHERE user_id = $1`,
      [userId],
    );
    console.log(`  ✓ borrow_records (${borrows.rowCount ?? 0})`);

    const reviews = await client.query(
      `DELETE FROM book_reviews WHERE user_id = $1`,
      [userId],
    );
    console.log(`  ✓ book_reviews (${reviews.rowCount ?? 0})`);

    const adminRequests = await client.query(
      `DELETE FROM admin_requests WHERE user_id = $1`,
      [userId],
    );
    console.log(`  ✓ admin_requests (${adminRequests.rowCount ?? 0})`);

    const statusDecisions = await client.query(
      `DELETE FROM user_status_decisions WHERE user_id = $1`,
      [userId],
    );
    console.log(`  ✓ user_status_decisions (${statusDecisions.rowCount ?? 0})`);

    const deleted = await client.query(`DELETE FROM users WHERE id = $1`, [
      userId,
    ]);
    if (deleted.rowCount !== 1) {
      throw new Error("User delete failed unexpectedly");
    }
    console.log(`  ✓ users (${user.email})`);

    await client.query("COMMIT");
    console.log(`\nDone. You can sign up again with ${email}.`);

    // After commit: purge ImageKit ID card if allowlisted (local seeds skipped).
    // Await so the CLI process does not exit before the Management API call finishes.
    if (universityCard) {
      await purgeImageKitMedia([universityCard]);
      console.log("  ✓ ImageKit university_card purge attempted (best-effort)");
    }
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("delete-user-by-email failed:", err);
  process.exit(1);
});
