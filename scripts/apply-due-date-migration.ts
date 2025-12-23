#!/usr/bin/env npx tsx -r dotenv/config

/**
 * Script to apply the due_date nullable migration
 * Usage: npx tsx -r dotenv/config scripts/apply-due-date-migration.ts
 */

import { db } from "@/database/drizzle";
import { sql } from "drizzle-orm";

async function applyDueDateMigration() {
  try {
    console.log("🔄 Applying due_date nullable migration...");

    // Make due_date nullable
    await db.execute(
      sql`ALTER TABLE "borrow_records" ALTER COLUMN "due_date" DROP NOT NULL`
    );
    console.log("✅ Made due_date column nullable");

    // Update existing records where due_date is null
    await db.execute(sql`
      UPDATE "borrow_records" 
      SET "due_date" = "borrow_date" + INTERVAL '7 days' 
      WHERE "due_date" IS NULL AND "status" = 'BORROWED'
    `);
    console.log("✅ Updated existing records with null due_date");

    console.log("🎉 Migration completed successfully!");
    console.log(
      "📅 Due dates will now be set when admin approves borrow requests"
    );

    process.exit(0);
  } catch (error) {
    console.error("❌ Error applying migration:", error);
    process.exit(1);
  }
}

applyDueDateMigration();

