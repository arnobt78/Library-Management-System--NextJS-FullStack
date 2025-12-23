#!/usr/bin/env npx tsx -r dotenv/config

/**
 * Script to apply the email tracking fields migration (corrected version)
 * Usage: npx tsx -r dotenv/config scripts/apply-email-tracking-migration.ts
 */

import { db } from "@/database/drizzle";
import { sql } from "drizzle-orm";

/**
 * Applies email tracking fields migration to change UUID foreign keys to TEXT (email addresses)
 * @returns Promise<void>
 */
async function applyEmailTrackingMigration(): Promise<void> {
  try {
    console.log("🔄 Applying email tracking fields migration...");

    // First, drop foreign key constraints
    try {
      await db.execute(
        sql`ALTER TABLE "borrow_records" DROP CONSTRAINT IF EXISTS "borrow_records_borrowed_by_fkey"`
      );
      await db.execute(
        sql`ALTER TABLE "borrow_records" DROP CONSTRAINT IF EXISTS "borrow_records_returned_by_fkey"`
      );
      await db.execute(
        sql`ALTER TABLE "borrow_records" DROP CONSTRAINT IF EXISTS "borrow_records_updated_by_fkey"`
      );
      console.log("✅ Dropped foreign key constraints");
    } catch {
      // Error is intentionally ignored - constraints may not exist
      console.log(
        "ℹ️  Some foreign key constraints may not exist, continuing..."
      );
    }

    // Change borrowed_by column type
    await db.execute(
      sql`ALTER TABLE "borrow_records" ALTER COLUMN "borrowed_by" TYPE TEXT`
    );
    console.log("✅ Changed borrowed_by to TEXT");

    // Change returned_by column type
    await db.execute(
      sql`ALTER TABLE "borrow_records" ALTER COLUMN "returned_by" TYPE TEXT`
    );
    console.log("✅ Changed returned_by to TEXT");

    // Change updated_by column type
    await db.execute(
      sql`ALTER TABLE "borrow_records" ALTER COLUMN "updated_by" TYPE TEXT`
    );
    console.log("✅ Changed updated_by to TEXT");

    console.log("🎉 Migration completed successfully!");
    console.log(
      "📧 Tracking fields now store email addresses for better readability"
    );

    process.exit(0);
  } catch (error: unknown) {
    console.error("❌ Error applying migration:", error);
    process.exit(1);
  }
}

applyEmailTrackingMigration();

