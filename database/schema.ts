/**
 * Database Schema Definition
 * 
 * This file defines all database tables and their structure using Drizzle ORM.
 * 
 * Schema Overview:
 * - users: User accounts (students, admins)
 * - books: Library book catalog
 * - borrowRecords: Book borrowing transactions
 * - bookReviews: User reviews and ratings
 * - adminRequests: Requests for admin privileges
 * - systemConfig: Dynamic system configuration (fines, limits, etc.)
 * 
 * Database: PostgreSQL (Hetzner VPS)
 * ORM: Drizzle ORM
 * Naming Convention: snake_case in database, camelCase in TypeScript
 */

import {
  varchar,
  uuid,
  integer,
  text,
  pgTable,
  date,
  pgEnum,
  timestamp,
  boolean,
  decimal,
} from "drizzle-orm/pg-core";

/**
 * PostgreSQL Enums
 * 
 * Enums ensure data integrity by restricting values to predefined options
 * 
 * STATUS_ENUM: Used for admin requests and user account status
 * ROLE_ENUM: User roles (USER or ADMIN)
 * BORROW_STATUS_ENUM: Book borrowing status lifecycle
 */
export const STATUS_ENUM = pgEnum("status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
]);
export const ROLE_ENUM = pgEnum("role", ["USER", "ADMIN"]);
export const BORROW_STATUS_ENUM = pgEnum("borrow_status", [
  "PENDING",    // User requested to borrow, awaiting admin approval
  "BORROWED",   // Book is currently borrowed by user
  "RETURNED",   // Book has been returned
]);

/**
 * Users Table
 * 
 * Stores all user accounts (students and admins)
 * 
 * Key Fields:
 * - id: UUID primary key (auto-generated)
 * - email: Unique identifier for login
 * - password: SHA-256 hashed password with salt (format: "salt:hash")
 * - status: Account approval status (PENDING/APPROVED/REJECTED)
 * - role: User role (USER/ADMIN)
 * - lastActivityDate: Last time user interacted with system
 * - lastLogin: Last successful login timestamp
 */
export const users = pgTable("users", {
  id: uuid("id").notNull().primaryKey().defaultRandom().unique(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  email: text("email").notNull().unique(), // Unique constraint ensures no duplicate emails
  universityId: integer("university_id").notNull().unique(), // University student ID
  password: text("password").notNull(), // Format: "salt:hash" (both base64 encoded)
  universityCard: text("university_card").notNull(), // University card image/identifier
  status: STATUS_ENUM("status").default("PENDING"), // New users start as PENDING
  role: ROLE_ENUM("role").default("USER"), // Default role is USER (not admin)
  lastActivityDate: date("last_activity_date").defaultNow(), // Tracks user engagement
  lastLogin: timestamp("last_login", { withTimezone: true }), // Updated on each login
  createdAt: timestamp("created_at", {
    withTimezone: true,
  }).defaultNow(), // Account creation timestamp
});

/**
 * Books Table
 * 
 * Stores the library catalog with all book information
 * 
 * Inventory Management:
 * - totalCopies: Total number of copies owned by library
 * - availableCopies: Currently available copies (decremented when borrowed)
 * - When availableCopies reaches 0, book cannot be borrowed
 * 
 * Enhanced Fields (for better cataloging):
 * - ISBN, publication year, publisher, language, page count, edition
 * - These help with book identification and metadata
 */
export const books = pgTable("books", {
  id: uuid("id").notNull().primaryKey().defaultRandom().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  author: varchar("author", { length: 255 }).notNull(),
  genre: text("genre").notNull(), // Category (e.g., "Programming", "Fiction")
  rating: integer("rating").notNull(), // Average rating (1-5 stars)
  coverUrl: text("cover_url").notNull(), // Book cover image URL
  coverColor: varchar("cover_color", { length: 7 }).notNull(), // Hex color for placeholder
  description: text("description").notNull(), // Book description/synopsis
  totalCopies: integer("total_copies").notNull().default(1), // Total inventory
  availableCopies: integer("available_copies").notNull().default(0), // Available to borrow
  videoUrl: text("video_url").notNull(), // Book trailer or related video
  summary: varchar("summary").notNull(), // Detailed summary
  // Enhanced tracking and control fields
  isbn: varchar("isbn", { length: 20 }), // International Standard Book Number
  publicationYear: integer("publication_year"), // Year published
  publisher: varchar("publisher", { length: 255 }), // Publishing company
  language: varchar("language", { length: 50 }).default("English"), // Book language
  pageCount: integer("page_count"), // Number of pages
  edition: varchar("edition", { length: 50 }), // Edition number/version
  isActive: boolean("is_active").default(true).notNull(), // Soft delete flag
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(), // Last modification
  updatedBy: uuid("updated_by").references(() => users.id), // Who last updated (admin)
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(), // When added to catalog
});

/**
 * Borrow Records Table
 * 
 * Tracks all book borrowing transactions and their lifecycle
 * 
 * Status Flow:
 * 1. PENDING: User requests to borrow → awaiting admin approval
 * 2. BORROWED: Admin approves → book is borrowed, dueDate is set
 * 3. RETURNED: User returns book → returnDate is set, fine calculated if overdue
 * 
 * Fine Calculation:
 * - Fine = (days overdue) × dailyFineAmount (from systemConfig)
 * - Calculated when book is returned or updated via automation
 * - Stored in fineAmount field for record keeping
 */
export const borrowRecords = pgTable("borrow_records", {
  id: uuid("id").notNull().primaryKey().defaultRandom().unique(),
  userId: uuid("user_id")
    .references(() => users.id) // Foreign key to users table
    .notNull(),
  bookId: uuid("book_id")
    .references(() => books.id) // Foreign key to books table
    .notNull(),
  borrowDate: timestamp("borrow_date", { withTimezone: true })
    .defaultNow()
    .notNull(), // When borrow request was created
  dueDate: date("due_date"), // Nullable - set when admin approves (7 days from approval)
  returnDate: date("return_date"), // When book was actually returned
  status: BORROW_STATUS_ENUM("status").default("BORROWED").notNull(), // Current status
  // Enhanced tracking and control fields
  borrowedBy: text("borrowed_by"), // Who actually borrowed (email for readability, not UUID)
  returnedBy: text("returned_by"), // Who returned the book (email for readability)
  fineAmount: decimal("fine_amount", { precision: 10, scale: 2 }).default(
    "0.00"
  ), // Late return fines (calculated on return or via automation)
  notes: text("notes"), // Additional notes about the borrowing (admin notes, special conditions)
  renewalCount: integer("renewal_count").default(0).notNull(), // How many times the book was renewed
  lastReminderSent: timestamp("last_reminder_sent", { withTimezone: true }), // Track reminder notifications (prevents spam)
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(), // Last modification
  updatedBy: text("updated_by"), // Email for readability (who made the update)
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(), // When record was created
});

/**
 * System Configuration Table
 * 
 * Stores dynamic system settings that can be changed without code deployment
 * 
 * Common Keys:
 * - "daily_fine_amount": Fine per day for overdue books (e.g., "1.00")
 * - "borrow_duration_days": How many days users can borrow books (e.g., "7")
 * - "max_renewals": Maximum number of times a book can be renewed (e.g., "2")
 * 
 * Benefits:
 * - Admins can adjust settings via UI without code changes
 * - Settings are persisted in database
 * - Audit trail via updatedBy and updatedAt
 */
export const systemConfig = pgTable("system_config", {
  id: uuid("id").notNull().primaryKey().defaultRandom().unique(),
  key: varchar("key", { length: 100 }).notNull().unique(), // Setting identifier (unique)
  value: text("value").notNull(), // Setting value (stored as text, parsed as needed)
  description: text("description"), // Human-readable description of what this setting does
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  updatedBy: text("updated_by"), // Email for readability (admin who changed it)
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

/**
 * Book Reviews Table
 * 
 * Stores user reviews and ratings for books
 * 
 * Business Rules:
 * - Users can only review books they have borrowed (enforced in API)
 * - One review per user per book (enforced by unique constraint in application logic)
 * - Rating must be 1-5 stars (validated in API)
 * 
 * Used for:
 * - Displaying book ratings on book pages
 * - Helping other users decide which books to borrow
 * - Calculating average book ratings
 */
export const bookReviews = pgTable("book_reviews", {
  id: uuid("id").notNull().primaryKey().defaultRandom().unique(),
  bookId: uuid("book_id")
    .references(() => books.id) // Foreign key to books table
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id) // Foreign key to users table
    .notNull(),
  rating: integer("rating").notNull(), // 1-5 stars (validated in API)
  comment: text("comment").notNull(), // Review text content
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(), // When review was posted
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(), // When review was last edited
});

/**
 * Admin Requests Table
 * 
 * Tracks requests from users who want admin privileges
 * 
 * Workflow:
 * 1. User submits request with reason
 * 2. Status = PENDING (awaiting admin review)
 * 3. Admin reviews and either APPROVES or REJECTS
 * 4. If approved, user's role is updated to ADMIN
 * 5. If rejected, rejectionReason is stored for record keeping
 * 
 * Security:
 * - Only existing admins can approve/reject requests
 * - All actions are logged (reviewedBy, reviewedAt)
 */
export const adminRequests = pgTable("admin_requests", {
  id: uuid("id").notNull().primaryKey().defaultRandom().unique(),
  userId: uuid("user_id")
    .references(() => users.id) // Foreign key to users table
    .notNull(),
  requestReason: text("request_reason").notNull(), // Why they want admin access
  status: STATUS_ENUM("status").default("PENDING").notNull(), // PENDING, APPROVED, REJECTED
  reviewedBy: uuid("reviewed_by").references(() => users.id), // Admin who reviewed the request
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }), // When request was reviewed
  rejectionReason: text("rejection_reason"), // Reason for rejection if applicable
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(), // When request was submitted
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(), // Last modification
});
