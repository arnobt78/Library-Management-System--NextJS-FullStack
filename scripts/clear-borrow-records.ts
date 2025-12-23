#!/usr/bin/env npx tsx -r dotenv/config

/**
 * Script to clear all borrow_records for testing purposes
 * Usage: npx tsx -r dotenv/config scripts/clear-borrow-records.ts
 */

import { db } from "@/database/drizzle";
import { borrowRecords } from "@/database/schema";

async function clearBorrowRecords() {
  try {
    console.log("🗑️  Clearing all borrow_records...");

    const result = await db.delete(borrowRecords);

    console.log("✅ Successfully cleared all borrow_records!");
    console.log("📊 Records deleted:", result.rowCount || "Unknown");
    console.log("🎯 Ready for clean testing!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error clearing borrow_records:", error);
    process.exit(1);
  }
}

clearBorrowRecords();

