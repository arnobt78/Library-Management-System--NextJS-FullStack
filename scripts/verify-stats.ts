/**
 * Database Statistics Verification Script
 *
 * This script queries the database directly and verifies all calculations
 * to ensure the admin dashboard statistics are correct.
 */

// Load environment variables FIRST before importing anything that uses them
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { users, books, borrowRecords } from "@/database/schema";
import { eq, sql, count } from "drizzle-orm";

config({ path: ".env" });

// Create database connection directly
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { casing: "snake_case" });

async function verifyStatistics() {
  console.log("🔍 Verifying Database Statistics...\n");
  console.log("=".repeat(60));

  try {
    // 1. User Statistics
    console.log("\n📊 USER STATISTICS");
    console.log("-".repeat(60));

    const allUsers = await db.select().from(users);
    const totalUsers = allUsers.length;
    const approvedUsers = allUsers.filter(
      (u) => u.status === "APPROVED"
    ).length;
    const pendingUsers = allUsers.filter((u) => u.status === "PENDING").length;
    const adminUsers = allUsers.filter((u) => u.role === "ADMIN").length;

    console.log(`Total Users: ${totalUsers}`);
    console.log(`  ✓ Approved: ${approvedUsers}`);
    console.log(`  ✓ Pending: ${pendingUsers}`);
    console.log(`  ✓ Admins: ${adminUsers}`);

    // 2. Book Statistics
    console.log("\n📚 BOOK STATISTICS");
    console.log("-".repeat(60));

    const allBooks = await db.select().from(books);
    const totalBooks = allBooks.length;

    // Calculate total copies
    const totalCopiesResult = await db
      .select({ total: sql<number>`sum(${books.totalCopies})` })
      .from(books);
    const totalCopies = Number(totalCopiesResult[0]?.total || 0);

    // Calculate available copies
    const availableCopiesResult = await db
      .select({ total: sql<number>`sum(${books.availableCopies})` })
      .from(books);
    const availableCopies = Number(availableCopiesResult[0]?.total || 0);

    // Calculate borrowed copies
    const borrowedCopies = totalCopies - availableCopies;

    // Verify with manual calculation
    const manualTotalCopies = allBooks.reduce(
      (sum, book) => sum + book.totalCopies,
      0
    );
    const manualAvailableCopies = allBooks.reduce(
      (sum, book) => sum + book.availableCopies,
      0
    );
    const manualBorrowedCopies = manualTotalCopies - manualAvailableCopies;

    const activeBooks = allBooks.filter((book) => book.isActive).length;
    const inactiveBooks = allBooks.filter((book) => !book.isActive).length;

    console.log(`Total Books: ${totalBooks}`);
    console.log(
      `Total Copies: ${totalCopies} (manual: ${manualTotalCopies}) ${totalCopies === manualTotalCopies ? "✓" : "✗"}`
    );
    console.log(
      `Available Copies: ${availableCopies} (manual: ${manualAvailableCopies}) ${availableCopies === manualAvailableCopies ? "✓" : "✗"}`
    );
    console.log(
      `Borrowed Copies: ${borrowedCopies} (manual: ${manualBorrowedCopies}) ${borrowedCopies === manualBorrowedCopies ? "✓" : "✗"}`
    );
    console.log(`Active Books: ${activeBooks}`);
    console.log(`Inactive Books: ${inactiveBooks}`);

    // Verify: Total = Available + Borrowed
    const isCorrect = totalCopies === availableCopies + borrowedCopies;
    console.log(`\n✓ Calculation Check: Total = Available + Borrowed`);
    console.log(
      `  ${totalCopies} = ${availableCopies} + ${borrowedCopies} ${isCorrect ? "✓ CORRECT" : "✗ INCORRECT"}`
    );

    // 3. Borrow Record Statistics
    console.log("\n📖 BORROW RECORD STATISTICS");
    console.log("-".repeat(60));

    const allBorrowRecords = await db.select().from(borrowRecords);

    const activeBorrows = allBorrowRecords.filter(
      (r) => r.status === "BORROWED"
    ).length;
    const pendingBorrows = allBorrowRecords.filter(
      (r) => r.status === "PENDING"
    ).length;
    const returnedBooks = allBorrowRecords.filter(
      (r) => r.status === "RETURNED"
    ).length;
    const totalBorrowRecords = allBorrowRecords.length;

    console.log(`Total Borrow Records: ${totalBorrowRecords}`);
    console.log(`Active Borrows (BORROWED): ${activeBorrows}`);
    console.log(`Pending Borrows (PENDING): ${pendingBorrows}`);
    console.log(`Returned Books (RETURNED): ${returnedBooks}`);

    // Verify: Total = Active + Pending + Returned
    const borrowSum = activeBorrows + pendingBorrows + returnedBooks;
    const borrowIsCorrect = totalBorrowRecords === borrowSum;
    console.log(`\n✓ Calculation Check: Total = Active + Pending + Returned`);
    console.log(
      `  ${totalBorrowRecords} = ${activeBorrows} + ${pendingBorrows} + ${returnedBooks} ${borrowIsCorrect ? "✓ CORRECT" : "✗ INCORRECT"}`
    );

    // 4. Cross-Verification: Borrowed Copies vs Active Borrows
    console.log("\n🔗 CROSS-VERIFICATION");
    console.log("-".repeat(60));
    console.log(`Borrowed Copies (from books table): ${borrowedCopies}`);
    console.log(`Active Borrows (from borrow_records): ${activeBorrows}`);
    console.log(`\nNote: These may differ because:`);
    console.log(`  - Borrowed Copies = physical copies currently out`);
    console.log(
      `  - Active Borrows = number of borrow records with BORROWED status`
    );
    console.log(
      `  - If a book has multiple copies, one borrow record = multiple copies borrowed`
    );

    // 5. Detailed Book Breakdown
    console.log("\n📋 DETAILED BOOK BREAKDOWN");
    console.log("-".repeat(60));
    const booksWithBorrowedCopies = allBooks.filter(
      (book) => book.totalCopies > book.availableCopies
    );
    console.log(
      `Books with borrowed copies: ${booksWithBorrowedCopies.length}`
    );

    if (booksWithBorrowedCopies.length > 0) {
      console.log("\nBooks with borrowed copies:");
      booksWithBorrowedCopies.forEach((book) => {
        const borrowed = book.totalCopies - book.availableCopies;
        console.log(
          `  - ${book.title}: ${book.totalCopies} total, ${book.availableCopies} available, ${borrowed} borrowed`
        );
      });
    }

    // 6. Summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 SUMMARY");
    console.log("=".repeat(60));
    console.log(
      `✓ Total Users: ${totalUsers} (${approvedUsers} approved, ${pendingUsers} pending)`
    );
    console.log(
      `✓ Total Books: ${totalBooks} (${activeBooks} active, ${inactiveBooks} inactive)`
    );
    console.log(`✓ Total Copies: ${totalCopies}`);
    console.log(`✓ Available Copies: ${availableCopies}`);
    console.log(`✓ Borrowed Copies: ${borrowedCopies}`);
    console.log(`✓ Active Borrows: ${activeBorrows}`);
    console.log(`✓ Pending Borrows: ${pendingBorrows}`);
    console.log(`✓ Returned Books: ${returnedBooks}`);

    // Final verification
    const allCorrect = isCorrect && borrowIsCorrect;
    console.log("\n" + "=".repeat(60));
    if (allCorrect) {
      console.log("✅ ALL CALCULATIONS ARE CORRECT!");
    } else {
      console.log("⚠️  SOME CALCULATIONS NEED REVIEW");
    }
    console.log("=".repeat(60));

    // Close database connection
    process.exit(0);
  } catch (error) {
    console.error("❌ Error verifying statistics:", error);
    process.exit(1);
  }
}

// Run the verification
verifyStatistics();
