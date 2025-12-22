/**
 * Find Missing Borrow Decrement
 * 
 * This script finds which book has a BORROWED record but its availableCopies
 * wasn't decremented (should be 3 borrowed copies, but only showing 2)
 */

import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { books, borrowRecords } from "@/database/schema";
import { eq, and } from "drizzle-orm";

config({ path: ".env" });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { casing: "snake_case" });

async function findMissingBorrow() {
  console.log("🔍 Finding Missing Borrow Decrement\n");
  console.log("=".repeat(80));

  try {
    // Get all BORROWED records
    const allBorrowedRecords = await db
      .select()
      .from(borrowRecords)
      .where(eq(borrowRecords.status, "BORROWED"));

    console.log(`Total BORROWED records: ${allBorrowedRecords.length}\n`);

    // Check each BORROWED record
    for (const record of allBorrowedRecords) {
      const book = await db
        .select()
        .from(books)
        .where(eq(books.id, record.bookId))
        .limit(1);

      if (book.length > 0) {
        const b = book[0];
        const borrowedCount = b.totalCopies - b.availableCopies;
        const expectedBorrowed = 1; // Each BORROWED record should mean 1 copy borrowed

        console.log(`📖 "${b.title}"`);
        console.log(`   Total Copies: ${b.totalCopies}`);
        console.log(`   Available Copies: ${b.availableCopies}`);
        console.log(`   Borrowed Copies (calculated): ${borrowedCount}`);
        console.log(`   Expected Borrowed: ${expectedBorrowed}`);
        console.log(`   Record ID: ${record.id.substring(0, 8)}...`);
        console.log(`   User ID: ${record.userId.substring(0, 8)}...`);
        console.log(`   Due Date: ${record.dueDate || "Not set"}`);

        if (borrowedCount < expectedBorrowed) {
          console.log(`   ⚠️  ISSUE: Book has BORROWED record but availableCopies wasn't decremented!`);
          console.log(`   Should have: ${b.totalCopies - expectedBorrowed} available`);
          console.log(`   Currently has: ${b.availableCopies} available`);
          console.log(`   Need to decrement by: ${expectedBorrowed - borrowedCount}`);
        } else if (borrowedCount === expectedBorrowed) {
          console.log(`   ✓ Correct: Borrowed copies match BORROWED record`);
        } else {
          console.log(`   ⚠️  WARNING: More copies borrowed than expected`);
        }
        console.log("");
      }
    }

    // Summary
    console.log("=".repeat(80));
    console.log("📊 SUMMARY");
    console.log("=".repeat(80));

    const allBooks = await db.select().from(books);
    const totalCopies = allBooks.reduce((sum, book) => sum + book.totalCopies, 0);
    const availableCopies = allBooks.reduce((sum, book) => sum + book.availableCopies, 0);
    const borrowedCopies = totalCopies - availableCopies;

    console.log(`Total Copies: ${totalCopies}`);
    console.log(`Available Copies: ${availableCopies}`);
    console.log(`Borrowed Copies (calculated): ${borrowedCopies}`);
    console.log(`BORROWED Records: ${allBorrowedRecords.length}`);

    if (borrowedCopies === allBorrowedRecords.length) {
      console.log(`\n✅ All borrowed copies match BORROWED records!`);
    } else {
      const difference = allBorrowedRecords.length - borrowedCopies;
      console.log(`\n⚠️  Discrepancy: ${difference} BORROWED record(s) don't have corresponding borrowed copies`);
      console.log(`   Expected: ${allBorrowedRecords.length} borrowed copies`);
      console.log(`   Actual: ${borrowedCopies} borrowed copies`);
      console.log(`   Missing: ${difference} copy/copies`);
    }

    console.log("\n" + "=".repeat(80));
    console.log("✅ Investigation Complete");
    console.log("=".repeat(80));

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    await pool.end();
    process.exit(1);
  }
}

findMissingBorrow();

