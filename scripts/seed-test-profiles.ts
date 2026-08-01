/**
 * Upsert Test User / Test Admin profiles for the sign-in dropdown.
 *
 * Sets fullName, password (salted SHA-256), role, APPROVED status, and
 * universityCard to local /images/profile-img*.png paths.
 *
 * Usage:
 *   npm run seed:test-profiles
 *
 * Uses DATABASE_URL from .env (same DB as local/prod if shared).
 */

import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq } from "drizzle-orm";
import { users } from "@/database/schema";
import { TEST_ACCOUNTS } from "@/constants";
import { hashPassword } from "@/lib/auth/password";

config({ path: ".env" });

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { casing: "snake_case" });

  try {
    for (const account of TEST_ACCOUNTS) {
      const hashedPassword = hashPassword(account.password);

      const existing = await db
        .select({
          id: users.id,
          universityId: users.universityId,
          email: users.email,
        })
        .from(users)
        .where(eq(users.email, account.email))
        .limit(1);

      if (existing.length > 0) {
        // Keep existing universityId to avoid unique conflicts with other rows
        await db
          .update(users)
          .set({
            fullName: account.fullName,
            password: hashedPassword,
            universityCard: account.image,
            role: account.role,
            status: "APPROVED",
          })
          .where(eq(users.email, account.email));

        console.log(
          `Updated ${account.email} → ${account.fullName} (${account.role}), card=${account.image}`
        );
      } else {
        // Reserved universityId may already be taken by another email — fall back check
        const idTaken = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.universityId, account.universityId))
          .limit(1);

        if (idTaken.length > 0) {
          throw new Error(
            `Cannot insert ${account.email}: universityId ${account.universityId} is already used by another user. Update that row or free the ID.`
          );
        }

        await db.insert(users).values({
          fullName: account.fullName,
          email: account.email,
          universityId: account.universityId,
          password: hashedPassword,
          universityCard: account.image,
          role: account.role,
          status: "APPROVED",
        });

        console.log(
          `Inserted ${account.email} → ${account.fullName} (${account.role}), card=${account.image}`
        );
      }
    }

    console.log("seed:test-profiles complete.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("seed:test-profiles failed:", err);
  process.exit(1);
});
