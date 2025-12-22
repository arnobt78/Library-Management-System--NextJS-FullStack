/**
 * Detailed Borrow Records Verification Script
 * 
 * This script investigates the relationship between:
 * - Borrowed copies (from books table)
 * - Borrow records (from borrow_records table)
 * - Overdue books
 */

// Load environment variables FIRST
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { users, books, borrowRecords } from "@/database/schema";
import { eq, sql, and, gte, lte } from "drizzle-orm";

config({ path: ".env" });

// Create database connection
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { casing: "snake_case" });

async function verifyBorrowDetails() {
  console.log("🔍 Detailed Borrow Records Investigation\n");
  console.log("=".repeat(80));

  try {
    // 1. Get all books with borrowed copies
    console.log("\n📚 BOOKS WITH BORROWED COPIES");
    console.log("-".repeat(80));
    
    const allBooks = await db.select().from(books);
    const booksWithBorrowed = allBooks.filter(
      (book) => book.totalCopies > book.availableCopies
    );

    console.log(`Total books with borrowed copies: ${booksWithBorrowed.length}\n`);

    // 2. For each book with borrowed copies, check borrow records
    for (const book of booksWithBorrowed) {
      const borrowedCount = book.totalCopies - book.availableCopies;
      console.log(`\n📖 "${book.title}"`);
      console.log(`   Total Copies: ${book.totalCopies}`);
      console.log(`   Available Copies: ${book.availableCopies}`);
      console.log(`   Borrowed Copies: ${borrowedCount}`);

      // Get all borrow records for this book
      const bookBorrowRecords = await db
        .select()
        .from(borrowRecords)
        .where(eq(borrowRecords.bookId, book.id));

      console.log(`   Borrow Records: ${bookBorrowRecords.length}`);
      
      // Group by status
      const byStatus = {
        BORROWED: bookBorrowRecords.filter((r) => r.status === "BORROWED"),
        PENDING: bookBorrowRecords.filter((r) => r.status === "PENDING"),
        RETURNED: bookBorrowRecords.filter((r) => r.status === "RETURNED"),
      };

      console.log(`     - BORROWED: ${byStatus.BORROWED.length}`);
      console.log(`     - PENDING: ${byStatus.PENDING.length}`);
      console.log(`     - RETURNED: ${byStatus.RETURNED.length}`);

      // Check for overdue
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const record of byStatus.BORROWED) {
        if (record.dueDate) {
          const dueDate = new Date(record.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          const isOverdue = dueDate < today;
          
          const daysOverdue = isOverdue
            ? Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
            : 0;

          console.log(`     Record ${record.id.substring(0, 8)}...`);
          console.log(`       Due Date: ${record.dueDate}`);
          console.log(`       Status: ${record.status}`);
          console.log(`       Overdue: ${isOverdue ? `YES (${daysOverdue} days)` : "NO"}`);
          
          // Get user info
          const user = await db
            .select()
            .from(users)
            .where(eq(users.id, record.userId))
            .limit(1);
          
          if (user.length > 0) {
            console.log(`       User: ${user[0].fullName} (${user[0].email})`);
          }
        }
      }

      // Check if borrowed copies match borrow records
      const activeBorrowRecords = byStatus.BORROWED.length;
      if (borrowedCount !== activeBorrowRecords) {
        console.log(`   ⚠️  MISMATCH: ${borrowedCount} borrowed copies but ${activeBorrowRecords} BORROWED records`);
      } else {
        console.log(`   ✓ Match: ${borrowedCount} borrowed copies = ${activeBorrowRecords} BORROWED records`);
      }
    }

    // 3. Check all BORROWED status records
    console.log("\n\n📋 ALL BORROWED STATUS RECORDS");
    console.log("-".repeat(80));
    
    const allBorrowedRecords = await db
      .select()
      .from(borrowRecords)
      .where(eq(borrowRecords.status, "BORROWED"));

    console.log(`Total BORROWED records: ${allBorrowedRecords.length}\n`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let overdueCount = 0;

    for (const record of allBorrowedRecords) {
      const book = await db
        .select()
        .from(books)
        .where(eq(books.id, record.bookId))
        .limit(1);

      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, record.userId))
        .limit(1);

      const bookTitle = book.length > 0 ? book[0].title : "Unknown";
      const userName = user.length > 0 ? user[0].fullName : "Unknown";

      let isOverdue = false;
      let daysOverdue = 0;

      if (record.dueDate) {
        const dueDate = new Date(record.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        isOverdue = dueDate < today;
        daysOverdue = isOverdue
          ? Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
          : 0;
      }

      if (isOverdue) {
        overdueCount++;
      }

      console.log(`📖 ${bookTitle}`);
      console.log(`   User: ${userName}`);
      console.log(`   Borrow Date: ${record.borrowDate}`);
      console.log(`   Due Date: ${record.dueDate || "Not set"}`);
      console.log(`   Status: ${record.status}`);
      console.log(`   Overdue: ${isOverdue ? `YES (${daysOverdue} days)` : "NO"}`);
      console.log("");
    }

    // 4. Summary
    console.log("\n" + "=".repeat(80));
    console.log("📊 SUMMARY");
    console.log("=".repeat(80));
    
    const totalBorrowedCopies = allBooks.reduce(
      (sum, book) => sum + (book.totalCopies - book.availableCopies),
      0
    );
    
    console.log(`Total Borrowed Copies (from books): ${totalBorrowedCopies}`);
    console.log(`Total BORROWED Records: ${allBorrowedRecords.length}`);
    console.log(`Overdue Books: ${overdueCount}`);
    
    if (totalBorrowedCopies !== allBorrowedRecords.length) {
      console.log(`\n⚠️  DISCREPANCY DETECTED:`);
      console.log(`   Borrowed Copies: ${totalBorrowedCopies}`);
      console.log(`   BORROWED Records: ${allBorrowedRecords.length}`);
      console.log(`   Difference: ${Math.abs(totalBorrowedCopies - allBorrowedRecords.length)}`);
      console.log(`\nPossible reasons:`);
      console.log(`   1. Some books have multiple copies borrowed but only one record`);
      console.log(`   2. Data sync issue between books.availableCopies and borrow_records`);
      console.log(`   3. Some borrow records might be in PENDING status but copies are already marked as borrowed`);
    } else {
      console.log(`\n✓ All borrowed copies match BORROWED records`);
    }

    // 5. Check PENDING records that might have copies already marked as borrowed
    console.log("\n\n🔍 CHECKING PENDING RECORDS");
    console.log("-".repeat(80));
    
    const pendingRecords = await db
      .select()
      .from(borrowRecords)
      .where(eq(borrowRecords.status, "PENDING"));

    console.log(`Total PENDING records: ${pendingRecords.length}\n`);

    for (const record of pendingRecords) {
      const book = await db
        .select()
        .from(books)
        .where(eq(books.id, record.bookId))
        .limit(1);

      if (book.length > 0) {
        const borrowed = book[0].totalCopies - book[0].availableCopies;
        if (borrowed > 0) {
          console.log(`⚠️  "${book[0].title}" has PENDING record but ${borrowed} copies are marked as borrowed`);
        }
      }
    }

    console.log("\n" + "=".repeat(80));
    console.log("✅ Investigation Complete");
    console.log("=".repeat(80));

    // Close database connection
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    await pool.end();
    process.exit(1);
  }
}

// Run the verification
verifyBorrowDetails();

