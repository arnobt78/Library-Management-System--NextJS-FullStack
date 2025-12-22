/**
 * Check All Books for Calculation Issues
 * 
 * This script checks all books to find why the total shows 2 borrowed copies
 * but individual books show 3 borrowed copies
 */

import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { books } from "@/database/schema";

config({ path: ".env" });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { casing: "snake_case" });

async function checkAllBooks() {
  console.log("🔍 Checking All Books for Calculation Issues\n");
  console.log("=".repeat(80));

  try {
    const allBooks = await db.select().from(books);
    
    console.log(`Total Books: ${allBooks.length}\n`);

    let totalCopiesSum = 0;
    let availableCopiesSum = 0;
    let borrowedCopiesSum = 0;
    let issuesFound = 0;

    for (const book of allBooks) {
      const borrowed = book.totalCopies - book.availableCopies;
      totalCopiesSum += book.totalCopies;
      availableCopiesSum += book.availableCopies;
      borrowedCopiesSum += borrowed;

      // Check for issues
      if (book.availableCopies > book.totalCopies) {
        console.log(`⚠️  "${book.title}"`);
        console.log(`   Total: ${book.totalCopies}, Available: ${book.availableCopies}`);
        console.log(`   ISSUE: Available copies > Total copies!`);
        issuesFound++;
      } else if (borrowed > 0) {
        console.log(`📖 "${book.title}"`);
        console.log(`   Total: ${book.totalCopies}, Available: ${book.availableCopies}, Borrowed: ${borrowed}`);
      } else if (borrowed < 0) {
        console.log(`⚠️  "${book.title}"`);
        console.log(`   Total: ${book.totalCopies}, Available: ${book.availableCopies}`);
        console.log(`   ISSUE: Negative borrowed copies!`);
        issuesFound++;
      }
    }

    console.log("\n" + "=".repeat(80));
    console.log("📊 SUMMARY");
    console.log("=".repeat(80));
    console.log(`Total Copies (sum): ${totalCopiesSum}`);
    console.log(`Available Copies (sum): ${availableCopiesSum}`);
    console.log(`Borrowed Copies (sum): ${borrowedCopiesSum}`);
    console.log(`Borrowed Copies (calculated): ${totalCopiesSum - availableCopiesSum}`);

    if (borrowedCopiesSum === (totalCopiesSum - availableCopiesSum)) {
      console.log(`\n✅ Sum calculation is correct`);
    } else {
      console.log(`\n⚠️  Sum calculation mismatch!`);
      console.log(`   Sum of individual borrowed: ${borrowedCopiesSum}`);
      console.log(`   Total - Available: ${totalCopiesSum - availableCopiesSum}`);
    }

    if (issuesFound > 0) {
      console.log(`\n⚠️  Found ${issuesFound} book(s) with data issues`);
    } else {
      console.log(`\n✅ No data issues found in individual books`);
    }

    console.log("\n" + "=".repeat(80));
    console.log("✅ Check Complete");
    console.log("=".repeat(80));

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    await pool.end();
    process.exit(1);
  }
}

checkAllBooks();

