/**
 * Database Migration Script for University Library Management System
 *
 * This script migrates data from CSV files to PostgreSQL database (Hetzner VPS).
 *
 * Migration Status: Ready for execution
 * - Migrates all existing data from NeonDB CSV exports to Hetzner VPS PostgreSQL
 *
 * Usage:
 *   npm run db:migrate-csv
 *
 * Note: This script uses upsert pattern, so it's safe to run multiple times.
 * It will update existing records or create new ones.
 */

import { config } from "dotenv";
import { parse } from "csv-parse/sync";
import * as fs from "fs";
import * as path from "path";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import {
  users,
  books,
  borrowRecords,
  bookReviews,
  adminRequests,
  systemConfig,
} from "@/database/schema";
import { eq } from "drizzle-orm";

config({ path: ".env" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
});

const db = drizzle(pool, { casing: "snake_case" });

// CSV file paths
const CSV_DIR =
  "/Users/arnob_t78/Papers/Project Doc/db-migration/university-library";

// Interface definitions matching CSV structure
interface UserRow {
  id: string;
  full_name: string;
  email: string;
  university_id: string;
  password: string;
  university_card: string;
  status: string;
  role: string;
  last_activity_date: string | null;
  created_at: string;
  last_login: string | null;
}

interface BookRow {
  id: string;
  title: string;
  author: string;
  genre: string;
  rating: string;
  cover_url: string;
  cover_color: string;
  description: string;
  total_copies: string;
  available_copies: string;
  video_url: string;
  summary: string;
  created_at: string;
  isbn: string | null;
  publication_year: string | null;
  publisher: string | null;
  language: string | null;
  page_count: string | null;
  edition: string | null;
  is_active: string;
  updated_at: string;
  updated_by: string | null;
}

interface BorrowRecordRow {
  id: string;
  user_id: string;
  book_id: string;
  borrow_date: string;
  due_date: string | null;
  return_date: string | null;
  status: string;
  created_at: string;
  borrowed_by: string | null;
  returned_by: string | null;
  fine_amount: string;
  notes: string | null;
  renewal_count: string;
  last_reminder_sent: string | null;
  updated_at: string;
  updated_by: string | null;
}

interface BookReviewRow {
  id: string;
  book_id: string;
  user_id: string;
  rating: string;
  comment: string;
  created_at: string;
  updated_at: string;
}

interface AdminRequestRow {
  id: string;
  user_id: string;
  request_reason: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

interface SystemConfigRow {
  id: string;
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
  updated_by: string | null;
  created_at: string;
}

/**
 * Helper Functions for CSV Parsing and Data Transformation
 * 
 * These functions handle the conversion from CSV string data to TypeScript types
 * and PostgreSQL-compatible formats.
 */

/**
 * Parse CSV file into array of typed objects
 * 
 * @param filePath - Path to CSV file
 * @returns Array of objects matching the CSV structure
 * 
 * CSV parsing options:
 * - columns: true - Use first row as column names
 * - skip_empty_lines: true - Ignore empty lines
 * - trim: true - Remove whitespace from values
 */
async function parseCSV<T>(filePath: string): Promise<T[]> {
  const content = fs.readFileSync(filePath, "utf-8");
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
  return records as T[];
}

/**
 * Parse date string to Date object
 * 
 * Handles various date formats and null/empty values
 * 
 * @param dateString - Date string from CSV (can be null, "null", or empty)
 * @returns Date object or null if invalid
 */
function parseDate(dateString: string | null | undefined): Date | null {
  if (!dateString || dateString === "null" || dateString === "") {
    return null;
  }
  try {
    return new Date(dateString);
  } catch (e) {
    console.warn(`Failed to parse date: ${dateString}`, e);
    return null;
  }
}

/**
 * Format Date object for PostgreSQL date column
 * 
 * PostgreSQL date columns expect "YYYY-MM-DD" format (not timestamp)
 * 
 * IMPORTANT: This is different from timestamp columns which use full ISO strings
 * 
 * @param date - Date object to format
 * @returns String in "YYYY-MM-DD" format or null
 * 
 * Example: new Date("2025-12-20") → "2025-12-20"
 */
function formatDateForPostgres(date: Date | null): string | null {
  if (!date) {
    return null;
  }
  // Format as YYYY-MM-DD for PostgreSQL date type
  // Split on "T" to get date part only (removes time and timezone)
  return date.toISOString().split("T")[0];
}

function parseInteger(value: string | null | undefined): number | null {
  if (!value || value === "null" || value === "") {
    return null;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? null : parsed;
}

function parseDecimal(value: string | null | undefined): string {
  if (!value || value === "null" || value === "") {
    return "0.00";
  }
  return value;
}

function parseBoolean(value: string | null | undefined): boolean {
  if (!value || value === "null" || value === "") {
    return true; // Default to true
  }
  return (
    value === "true" ||
    value === "1" ||
    value === "t" ||
    value.toLowerCase() === "true"
  );
}

/**
 * Seed Functions
 * 
 * Each function migrates data from a CSV file to the corresponding database table.
 * 
 * Migration Strategy: UPSERT (Update or Insert)
 * - If record exists (by ID), update it
 * - If record doesn't exist, insert it
 * - This makes the script idempotent (safe to run multiple times)
 * 
 * Data Transformation:
 * - CSV columns (snake_case) → TypeScript (camelCase)
 * - String dates → Date objects → PostgreSQL date strings
 * - String numbers → Integers/Decimals
 * - String booleans → Boolean values
 */

/**
 * Seed users from CSV
 * 
 * Migrates user accounts from NeonDB CSV export to Hetzner VPS PostgreSQL
 * 
 * Key transformations:
 * - full_name → fullName
 * - last_activity_date → lastActivityDate (date column, needs formatting)
 * - last_login → lastLogin (timestamp, can be null)
 * - status/role → enum types
 */
async function seedUsers() {
  console.log("🌱 Seeding users...");
  const userRows = await parseCSV<UserRow>(path.join(CSV_DIR, "users.csv"));

  for (const row of userRows) {
    try {
      /**
       * UPSERT Pattern: Check if user exists first
       * 
       * Why check first?
       * - Drizzle doesn't have built-in upsert for all databases
       * - We want to preserve existing data if record exists
       * - Allows re-running migration without duplicates
       */
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.id, row.id))
        .limit(1);

      if (existing.length > 0) {
        // Update existing user (preserves ID, updates other fields)
        await db
          .update(users)
          .set({
            fullName: row.full_name,
            email: row.email,
            universityId: parseInt(row.university_id, 10),
            password: row.password, // Already hashed from NeonDB
            universityCard: row.university_card,
            status: row.status as "PENDING" | "APPROVED" | "REJECTED",
            role: row.role as "USER" | "ADMIN",
            lastActivityDate: formatDateForPostgres(
              parseDate(row.last_activity_date)
            ), // Convert to YYYY-MM-DD format for date column
            lastLogin: parseDate(row.last_login), // Timestamp, can be null
            createdAt: parseDate(row.created_at) || new Date(),
          })
          .where(eq(users.id, row.id));
      } else {
        // Insert new user
        await db.insert(users).values({
          id: row.id, // Preserve original UUID from NeonDB
          fullName: row.full_name,
          email: row.email,
          universityId: parseInt(row.university_id, 10),
          password: row.password, // Already hashed from NeonDB
          universityCard: row.university_card,
          status:
            (row.status as "PENDING" | "APPROVED" | "REJECTED") || "PENDING",
          role: (row.role as "USER" | "ADMIN") || "USER",
          lastActivityDate: formatDateForPostgres(
            parseDate(row.last_activity_date)
          ),
          lastLogin: parseDate(row.last_login),
          createdAt: parseDate(row.created_at) || new Date(),
        });
      }
    } catch (error) {
      // Log error but continue with other users (don't fail entire migration)
      console.error(`❌ Error seeding user ${row.id} (${row.email}):`, error);
    }
  }
  console.log(`✅ Seeded ${userRows.length} users`);
}

async function seedBooks() {
  console.log("🌱 Seeding books...");
  const bookRows = await parseCSV<BookRow>(path.join(CSV_DIR, "books.csv"));

  for (const row of bookRows) {
    try {
      const existing = await db
        .select()
        .from(books)
        .where(eq(books.id, row.id))
        .limit(1);

      const bookData = {
        title: row.title,
        author: row.author,
        genre: row.genre,
        rating: parseInt(row.rating, 10),
        coverUrl: row.cover_url,
        coverColor: row.cover_color,
        description: row.description,
        totalCopies: parseInt(row.total_copies, 10),
        availableCopies: parseInt(row.available_copies, 10),
        videoUrl: row.video_url,
        summary: row.summary,
        isbn: row.isbn || null,
        publicationYear: parseInteger(row.publication_year),
        publisher: row.publisher || null,
        language: row.language || "English",
        pageCount: parseInteger(row.page_count),
        edition: row.edition || null,
        isActive: parseBoolean(row.is_active),
        updatedAt: parseDate(row.updated_at) || new Date(),
        updatedBy: row.updated_by || null,
        createdAt: parseDate(row.created_at) || new Date(),
      };

      if (existing.length > 0) {
        await db.update(books).set(bookData).where(eq(books.id, row.id));
      } else {
        await db.insert(books).values({
          id: row.id,
          ...bookData,
        });
      }
    } catch (error) {
      console.error(`❌ Error seeding book ${row.id} (${row.title}):`, error);
    }
  }
  console.log(`✅ Seeded ${bookRows.length} books`);
}

async function seedBorrowRecords() {
  console.log("🌱 Seeding borrow records...");
  const borrowRows = await parseCSV<BorrowRecordRow>(
    path.join(CSV_DIR, "borrow_records.csv")
  );

  for (const row of borrowRows) {
    try {
      const existing = await db
        .select()
        .from(borrowRecords)
        .where(eq(borrowRecords.id, row.id))
        .limit(1);

      const borrowData = {
        userId: row.user_id,
        bookId: row.book_id,
        borrowDate: parseDate(row.borrow_date) || new Date(),
        dueDate: formatDateForPostgres(parseDate(row.due_date)),
        returnDate: formatDateForPostgres(parseDate(row.return_date)),
        status:
          (row.status as "PENDING" | "BORROWED" | "RETURNED") || "BORROWED",
        borrowedBy: row.borrowed_by || null,
        returnedBy: row.returned_by || null,
        fineAmount: parseDecimal(row.fine_amount),
        notes: row.notes || null,
        renewalCount: parseInt(row.renewal_count, 10) || 0,
        lastReminderSent: parseDate(row.last_reminder_sent),
        updatedAt: parseDate(row.updated_at) || new Date(),
        updatedBy: row.updated_by || null,
        createdAt: parseDate(row.created_at) || new Date(),
      };

      if (existing.length > 0) {
        await db
          .update(borrowRecords)
          .set(borrowData)
          .where(eq(borrowRecords.id, row.id));
      } else {
        await db.insert(borrowRecords).values({
          id: row.id,
          ...borrowData,
        });
      }
    } catch (error) {
      console.error(`❌ Error seeding borrow record ${row.id}:`, error);
    }
  }
  console.log(`✅ Seeded ${borrowRows.length} borrow records`);
}

async function seedBookReviews() {
  console.log("🌱 Seeding book reviews...");
  const reviewRows = await parseCSV<BookReviewRow>(
    path.join(CSV_DIR, "book_reviews.csv")
  );

  for (const row of reviewRows) {
    try {
      const existing = await db
        .select()
        .from(bookReviews)
        .where(eq(bookReviews.id, row.id))
        .limit(1);

      const reviewData = {
        bookId: row.book_id,
        userId: row.user_id,
        rating: parseInt(row.rating, 10),
        comment: row.comment,
        createdAt: parseDate(row.created_at) || new Date(),
        updatedAt: parseDate(row.updated_at) || new Date(),
      };

      if (existing.length > 0) {
        await db
          .update(bookReviews)
          .set(reviewData)
          .where(eq(bookReviews.id, row.id));
      } else {
        await db.insert(bookReviews).values({
          id: row.id,
          ...reviewData,
        });
      }
    } catch (error) {
      console.error(`❌ Error seeding book review ${row.id}:`, error);
    }
  }
  console.log(`✅ Seeded ${reviewRows.length} book reviews`);
}

async function seedAdminRequests() {
  console.log("🌱 Seeding admin requests...");
  const requestRows = await parseCSV<AdminRequestRow>(
    path.join(CSV_DIR, "admin_requests.csv")
  );

  for (const row of requestRows) {
    try {
      const existing = await db
        .select()
        .from(adminRequests)
        .where(eq(adminRequests.id, row.id))
        .limit(1);

      const requestData = {
        userId: row.user_id,
        requestReason: row.request_reason,
        status:
          (row.status as "PENDING" | "APPROVED" | "REJECTED") || "PENDING",
        reviewedBy: row.reviewed_by || null,
        reviewedAt: parseDate(row.reviewed_at),
        rejectionReason: row.rejection_reason || null,
        createdAt: parseDate(row.created_at) || new Date(),
        updatedAt: parseDate(row.updated_at) || new Date(),
      };

      if (existing.length > 0) {
        await db
          .update(adminRequests)
          .set(requestData)
          .where(eq(adminRequests.id, row.id));
      } else {
        await db.insert(adminRequests).values({
          id: row.id,
          ...requestData,
        });
      }
    } catch (error) {
      console.error(`❌ Error seeding admin request ${row.id}:`, error);
    }
  }
  console.log(`✅ Seeded ${requestRows.length} admin requests`);
}

async function seedSystemConfig() {
  console.log("🌱 Seeding system config...");
  const configRows = await parseCSV<SystemConfigRow>(
    path.join(CSV_DIR, "system_config.csv")
  );

  for (const row of configRows) {
    try {
      const existing = await db
        .select()
        .from(systemConfig)
        .where(eq(systemConfig.id, row.id))
        .limit(1);

      const configData = {
        key: row.key,
        value: row.value,
        description: row.description || null,
        updatedAt: parseDate(row.updated_at) || new Date(),
        updatedBy: row.updated_by || null,
        createdAt: parseDate(row.created_at) || new Date(),
      };

      if (existing.length > 0) {
        await db
          .update(systemConfig)
          .set(configData)
          .where(eq(systemConfig.id, row.id));
      } else {
        await db.insert(systemConfig).values({
          id: row.id,
          ...configData,
        });
      }
    } catch (error) {
      console.error(
        `❌ Error seeding system config ${row.id} (${row.key}):`,
        error
      );
    }
  }
  console.log(`✅ Seeded ${configRows.length} system config entries`);
}

async function main() {
  console.log("🚀 Starting database migration from CSV files...\n");
  console.log(`📁 CSV Directory: ${CSV_DIR}\n`);

  try {
    // Seed in order to maintain foreign key relationships
    await seedUsers();
    await seedBooks();
    await seedBorrowRecords();
    await seedBookReviews();
    await seedAdminRequests();
    await seedSystemConfig();

    console.log("\n✨ Database migration completed successfully!");
    console.log("\n📊 Summary:");
    console.log("  - Users migrated");
    console.log("  - Books migrated");
    console.log("  - Borrow records migrated");
    console.log("  - Book reviews migrated");
    console.log("  - Admin requests migrated");
    console.log("  - System config migrated");
  } catch (error) {
    console.error("❌ Error during database migration:", error);
    throw error;
  }
}

main()
  .then(async () => {
    console.log("\n✅ Migration script completed");
    await pool.end();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("\n❌ Migration script failed:", error);
    await pool.end();
    process.exit(1);
  });
