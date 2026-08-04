/**
 * purge-admin-request-history.ts
 *
 * Deletes settled make-admin history (APPROVED / REJECTED / CANCELLED-as-REJECTED
 * with self-withdraw) for one email while keeping the user account and any PENDING request.
 *
 * Demo emails are allowed (unlike user:delete). Use to clear Test User clutter on /admin/users.
 *
 * Usage:
 *   npm run admin-requests:purge -- test@user.com
 *   npx tsx scripts/purge-admin-request-history.ts test@user.com
 *
 * Requires DATABASE_URL in .env / .env.local
 */

import { config } from "dotenv";
import { Pool } from "pg";

config({ path: ".env" });
config({ path: ".env.local", override: true });

async function main() {
  const emailArg = process.argv[2]?.trim().toLowerCase();
  if (!emailArg || !emailArg.includes("@")) {
    throw new Error("Usage: npm run admin-requests:purge -- <email>");
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const found = await client.query<{ id: string; email: string }>(
      `SELECT id, email FROM users WHERE lower(email) = $1 LIMIT 1`,
      [emailArg],
    );

    if (found.rowCount !== 1) {
      await client.query("ROLLBACK");
      console.log(`No user found for ${emailArg} — nothing to purge.`);
      return;
    }

    const userId = found.rows[0].id;
    console.log(
      `Purging settled admin_requests for ${found.rows[0].email} (keeping PENDING)…`,
    );

    // Keep PENDING; remove decided / withdrawn history
    const deleted = await client.query(
      `DELETE FROM admin_requests
       WHERE user_id = $1
         AND status IN ('APPROVED', 'REJECTED')`,
      [userId],
    );

    await client.query("COMMIT");
    console.log(`  ✓ deleted ${deleted.rowCount ?? 0} settled admin_request(s)`);
    console.log("Done.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("purge-admin-request-history failed:", err);
  process.exit(1);
});
