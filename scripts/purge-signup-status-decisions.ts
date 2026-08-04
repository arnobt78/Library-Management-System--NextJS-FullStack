/**
 * purge-signup-status-decisions.ts
 *
 * Clears Sign-up Requests “Recent decisions” ledger rows (user_status_decisions).
 * Does not delete users. Optional email limits purge to that applicant.
 *
 * Usage:
 *   npm run signup-decisions:purge
 *   npm run signup-decisions:purge -- arnob_t78@yahoo.com
 *
 * Requires DATABASE_URL in .env / .env.local
 */

import { config } from "dotenv";
import { Pool } from "pg";

config({ path: ".env" });
config({ path: ".env.local", override: true });

async function main() {
  const emailArg = process.argv[2]?.trim().toLowerCase();

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let deleted;
    if (emailArg) {
      if (!emailArg.includes("@")) {
        throw new Error(`Invalid email: ${emailArg}`);
      }
      console.log(
        `Purging user_status_decisions for applicant ${emailArg}…`,
      );
      deleted = await client.query(
        `DELETE FROM user_status_decisions
         WHERE user_id IN (
           SELECT id FROM users WHERE lower(email) = $1
         )`,
        [emailArg],
      );
    } else {
      console.log("Purging ALL user_status_decisions (Sign-up Recent ledger)…");
      deleted = await client.query(`DELETE FROM user_status_decisions`);
    }

    await client.query("COMMIT");
    console.log(`  ✓ deleted ${deleted.rowCount ?? 0} ledger row(s)`);
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
  console.error("purge-signup-status-decisions failed:", err);
  process.exit(1);
});
