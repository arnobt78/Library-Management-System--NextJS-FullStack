/**
 * Script to check test user's borrow records count from database
 * 
 * Usage: npx tsx scripts/check-test-user-borrows.ts
 */

// Load environment variables FIRST before importing anything that uses them
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { borrowRecords, users } from "@/database/schema";
import { eq, sql } from "drizzle-orm";

config({ path: ".env.local" });
config({ path: ".env" });

// Create database connection directly
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { casing: "snake_case" });

async function checkTestUserBorrows() {
  try {
    console.log("=== Checking Test User Borrow Records ===\n");

    // Find test user
    const testUser = await db
      .select()
      .from(users)
      .where(eq(users.email, "test@user.com"))
      .limit(1);

    if (testUser.length === 0) {
      console.error("Test user (test@user.com) not found in database");
      process.exit(1);
    }

    const userId = testUser[0].id;
    console.log(`Test User ID: ${userId}`);
    console.log(`Test User Email: ${testUser[0].email}`);
    console.log(`Test User Name: ${testUser[0].fullName}\n`);

    // Count borrow records by status
    const statusCounts = await db
      .select({
        status: borrowRecords.status,
        count: sql<number>`count(*)::int`,
      })
      .from(borrowRecords)
      .where(eq(borrowRecords.userId, userId))
      .groupBy(borrowRecords.status);

    console.log("=== Borrow Records by Status ===");
    let totalRecords = 0;
    statusCounts.forEach(({ status, count }) => {
      console.log(`${status}: ${count} records`);
      totalRecords += count;
    });
    console.log(`Total: ${totalRecords} records\n`);

    // Get detailed counts
    const pendingCount = statusCounts.find((s) => s.status === "PENDING")?.count || 0;
    const borrowedCount = statusCounts.find((s) => s.status === "BORROWED")?.count || 0;
    const returnedCount = statusCounts.find((s) => s.status === "RETURNED")?.count || 0;

    console.log("=== Summary ===");
    console.log(`Pending Requests: ${pendingCount}`);
    console.log(`Active Borrows (BORROWED): ${borrowedCount}`);
    console.log(`Borrow History (RETURNED): ${returnedCount}`);
    console.log(`Total Records: ${totalRecords}\n`);

    // Verify the API would return
    console.log("=== API Query Check ===");
    const apiQueryResult = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(borrowRecords)
      .where(eq(borrowRecords.userId, userId));

    const apiTotalCount = apiQueryResult[0]?.count || 0;
    console.log(`API would return: ${apiTotalCount} records (with limit=10000)`);
    console.log(`Expected in UI:`);
    console.log(`  - Active Borrows: ${borrowedCount}`);
    console.log(`  - Pending Requests: ${pendingCount}`);
    console.log(`  - Borrow History: ${returnedCount}`);

    if (returnedCount !== 50) {
      console.log(`\n⚠️  WARNING: Borrow History shows 50 but database has ${returnedCount} RETURNED records!`);
    } else {
      console.log(`\n✅ Borrow History count matches database (${returnedCount} records)`);
    }

    process.exit(0);
  } catch (error) {
    console.error("Error checking borrow records:", error);
    process.exit(1);
  }
}

checkTestUserBorrows();

