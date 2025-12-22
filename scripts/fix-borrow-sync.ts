/**
 * Fix Borrow Records Data Sync Issues
 * 
 * This script fixes data synchronization issues between:
 * - books.availableCopies (book availability)
 * - borrow_records.status (borrow record status)
 * 
 * Issues to fix:
 * 1. "The Clean Coder" - Book was returned but availableCopies wasn't incremented
 * 2. "HTML and CSS: Design and Build Websites" - Request is pending but availableCopies was decremented
 */

// Load environment variables FIRST
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { books, borrowRecords } from "@/database/schema";
import { eq, and } from "drizzle-orm";

config({ path: ".env" });

// Create database connection
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { casing: "snake_case" });

async function fixBorrowSync() {
  console.log("🔧 Fixing Borrow Records Data Sync Issues\n");
  console.log("=".repeat(80));

  try {
    let cleanCoderBefore = 0;
    let htmlCssBefore = 0;

    // 1. Fix "The Clean Coder" - Book was returned but availableCopies wasn't incremented
    console.log("\n📖 Fixing: 'The Clean Coder'");
    console.log("-".repeat(80));

    const cleanCoder = await db
      .select()
      .from(books)
      .where(eq(books.title, "The Clean Coder"))
      .limit(1);

    if (cleanCoder.length === 0) {
      console.log("❌ Book not found: 'The Clean Coder'");
    } else {
      const book = cleanCoder[0];
      cleanCoderBefore = book.availableCopies;
      const afterAvailable = book.availableCopies + 1;

      console.log(`Before: ${cleanCoderBefore} available copies`);
      console.log(`After: ${afterAvailable} available copies (incrementing by 1)`);

      // Verify the borrow record is RETURNED
      const borrowRecord = await db
        .select()
        .from(borrowRecords)
        .where(
          and(
            eq(borrowRecords.bookId, book.id),
            eq(borrowRecords.status, "RETURNED")
          )
        )
        .limit(1);

      if (borrowRecord.length > 0) {
        console.log(`✓ Found RETURNED record: ${borrowRecord[0].id.substring(0, 8)}...`);
        console.log(`  Return Date: ${borrowRecord[0].returnDate || "Not set"}`);

        // Update availableCopies
        await db
          .update(books)
          .set({ availableCopies: afterAvailable })
          .where(eq(books.id, book.id));

        console.log(`✅ Updated: ${book.title}`);
        console.log(`   Available copies: ${cleanCoderBefore} → ${afterAvailable}`);
      } else {
        console.log("⚠️  No RETURNED record found, but proceeding with fix anyway");
        await db
          .update(books)
          .set({ availableCopies: afterAvailable })
          .where(eq(books.id, book.id));
        console.log(`✅ Updated: ${book.title}`);
      }
    }

    // 2. Fix "HTML and CSS: Design and Build Websites" - Request is pending but availableCopies was decremented
    console.log("\n\n📖 Fixing: 'HTML and CSS: Design and Build Websites'");
    console.log("-".repeat(80));

    const htmlCss = await db
      .select()
      .from(books)
      .where(eq(books.title, "HTML and CSS: Design and Build Websites"))
      .limit(1);

    if (htmlCss.length === 0) {
      console.log("❌ Book not found: 'HTML and CSS: Design and Build Websites'");
    } else {
      const book = htmlCss[0];
      htmlCssBefore = book.availableCopies;
      const afterAvailable = book.availableCopies + 1;

      console.log(`Before: ${htmlCssBefore} available copies`);
      console.log(`After: ${afterAvailable} available copies (incrementing by 1)`);

      // Verify the borrow record is PENDING
      const borrowRecord = await db
        .select()
        .from(borrowRecords)
        .where(
          and(
            eq(borrowRecords.bookId, book.id),
            eq(borrowRecords.status, "PENDING")
          )
        )
        .limit(1);

      if (borrowRecord.length > 0) {
        console.log(`✓ Found PENDING record: ${borrowRecord[0].id.substring(0, 8)}...`);
        console.log(`  Borrow Date: ${borrowRecord[0].borrowDate}`);
        console.log(`  Status: ${borrowRecord[0].status}`);

        // Update availableCopies
        await db
          .update(books)
          .set({ availableCopies: afterAvailable })
          .where(eq(books.id, book.id));

        console.log(`✅ Updated: ${book.title}`);
        console.log(`   Available copies: ${htmlCssBefore} → ${afterAvailable}`);
        console.log(`   Note: PENDING requests should not decrement availableCopies until approved`);
      } else {
        console.log("⚠️  No PENDING record found, but proceeding with fix anyway");
        await db
          .update(books)
          .set({ availableCopies: afterAvailable })
          .where(eq(books.id, book.id));
        console.log(`✅ Updated: ${book.title}`);
      }
    }

    // 3. Verify the fixes
    console.log("\n\n" + "=".repeat(80));
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
      console.log(`\n✅ SUCCESS: Borrowed copies (${borrowedCopies}) now matches BORROWED records (${allBorrowedRecords.length})`);
    } else {
      console.log(`\n⚠️  Still a discrepancy:`);
      console.log(`   Borrowed Copies: ${borrowedCopies}`);
      console.log(`   BORROWED Records: ${allBorrowedRecords.length}`);
      console.log(`   Difference: ${Math.abs(borrowedCopies - allBorrowedRecords.length)}`);
    }

    // Show fixed books
    console.log("\n📋 Fixed Books Summary:");
    if (cleanCoder.length > 0) {
      const book = await db
        .select()
        .from(books)
        .where(eq(books.id, cleanCoder[0].id))
        .limit(1);
      console.log(`   - "The Clean Coder": ${book[0].availableCopies} available (was ${cleanCoderBefore})`);
    }
    if (htmlCss.length > 0) {
      const book = await db
        .select()
        .from(books)
        .where(eq(books.id, htmlCss[0].id))
        .limit(1);
      console.log(`   - "HTML and CSS: Design and Build Websites": ${book[0].availableCopies} available (was ${htmlCssBefore})`);
    }

    console.log("\n" + "=".repeat(80));
    console.log("✅ Fix Complete!");
    console.log("=".repeat(80));

    // Close database connection
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error fixing data sync:", error);
    await pool.end();
    process.exit(1);
  }
}

// Run the fix
fixBorrowSync();

