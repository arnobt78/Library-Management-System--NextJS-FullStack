/**
 * Fix "Cracking the Coding Interview" Data Issue
 * 
 * This book has 21 total copies but 22 available copies (impossible!)
 * Should be fixed to 21 available copies (or less if there are borrowed copies)
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

async function fixCodingInterview() {
  console.log("🔧 Fixing 'Cracking the Coding Interview' Data Issue\n");
  console.log("=".repeat(80));

  try {
    const book = await db
      .select()
      .from(books)
      .where(eq(books.title, "Cracking the Coding Interview"))
      .limit(1);

    if (book.length === 0) {
      console.log("❌ Book not found");
      await pool.end();
      process.exit(1);
    }

    const b = book[0];
    console.log(`📖 "${b.title}"`);
    console.log(`   Total Copies: ${b.totalCopies}`);
    console.log(`   Current Available: ${b.availableCopies}`);
    console.log(`   Issue: Available (${b.availableCopies}) > Total (${b.totalCopies})`);

    // Check if there are any BORROWED records for this book
    const borrowedRecords = await db
      .select()
      .from(borrowRecords)
      .where(
        and(
          eq(borrowRecords.bookId, b.id),
          eq(borrowRecords.status, "BORROWED")
        )
      );

    const correctAvailable = b.totalCopies - borrowedRecords.length;
    
    console.log(`\n   BORROWED Records: ${borrowedRecords.length}`);
    console.log(`   Correct Available: ${correctAvailable} (Total - Borrowed)`);
    console.log(`   Fixing: ${b.availableCopies} → ${correctAvailable}`);

    // Update to correct value
    await db
      .update(books)
      .set({ availableCopies: correctAvailable })
      .where(eq(books.id, b.id));

    console.log(`\n   ✅ Fixed!`);

    // Verify
    console.log("\n" + "=".repeat(80));
    console.log("✅ Verification");
    console.log("=".repeat(80));

    const allBooks = await db.select().from(books);
    const totalCopies = allBooks.reduce((sum, book) => sum + book.totalCopies, 0);
    const availableCopies = allBooks.reduce((sum, book) => sum + book.availableCopies, 0);
    const borrowedCopies = totalCopies - availableCopies;

    const allBorrowedRecords = await db
      .select()
      .from(borrowRecords)
      .where(eq(borrowRecords.status, "BORROWED"));

    console.log(`Total Copies: ${totalCopies}`);
    console.log(`Available Copies: ${availableCopies}`);
    console.log(`Borrowed Copies: ${borrowedCopies}`);
    console.log(`BORROWED Records: ${allBorrowedRecords.length}`);

    if (borrowedCopies === allBorrowedRecords.length) {
      console.log(`\n✅ SUCCESS: Borrowed copies (${borrowedCopies}) now matches BORROWED records (${allBorrowedRecords.length})!`);
    } else {
      console.log(`\n⚠️  Still a discrepancy:`);
      console.log(`   Borrowed Copies: ${borrowedCopies}`);
      console.log(`   BORROWED Records: ${allBorrowedRecords.length}`);
    }

    console.log("\n" + "=".repeat(80));
    console.log("✅ Fix Complete!");
    console.log("=".repeat(80));

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    await pool.end();
    process.exit(1);
  }
}

fixCodingInterview();

