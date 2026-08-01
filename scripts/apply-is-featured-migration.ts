/**
 * Apply migration 0008: books.is_featured column + partial unique index.
 *
 * Usage: npx tsx scripts/apply-is-featured-migration.ts
 */

import { config } from "dotenv";
import { Pool } from "pg";
import { readFileSync } from "fs";
import { join } from "path";

config({ path: ".env" });

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const sql = readFileSync(
    join(process.cwd(), "migrations/0008_books_is_featured.sql"),
    "utf8"
  );

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(sql);
    console.log("Migration 0008_books_is_featured applied successfully.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
