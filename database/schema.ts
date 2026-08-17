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
  jsonb,
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
  "PENDING", // User requested to borrow, awaiting admin approval
  "BORROWED", // Book is currently borrowed by user
  "RETURNED", // Book has been returned
  "CANCELLED", // Admin rejected the pending request (row kept for history)
]);
export const RESERVATION_STATUS_ENUM = pgEnum("reservation_status", [
  "WAITING",
  "READY",
  "FULFILLED",
  "CANCELLED",
  "EXPIRED",
]);
// Parent: CR-0003 / REQ-0034 (Admin Suite Parity Expansion)
export const TICKET_STATUS_ENUM = pgEnum("ticket_status", [
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
]);
export const TICKET_PRIORITY_ENUM = pgEnum("ticket_priority", [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
]);
export const FINE_STATUS_ENUM = pgEnum("fine_status", [
  "NONE",
  "ACCRUING",
  "STAMPED",
  "WAIVED",
  "PAID",
]);

/**
 * Users Table
 * 
 * Stores all user accounts (students and admins)
 * 
 * Key Fields:
 * - id: UUID primary key (auto-generated)
 * - email: Unique identifier for login
 * - password: versioned memory-hard hash; legacy salted SHA-256 is upgraded on login
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
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(), // Last account/permission change
  updatedBy: text("updated_by"), // Server-derived actor email for permission/status auditability
  // Durable signup APPROVED/REJECTED actor (UUID) — not overwritten by role-only edits
  statusReviewedBy: uuid("status_reviewed_by"), // FK to users.id (see migration 0011)
  statusReviewedAt: timestamp("status_reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", {
    withTimezone: true,
  }).defaultNow(), // Account creation timestamp
});

/**
 * User Status Decisions (signup approve/reject ledger)
 *
 * Append-only history for library registration decisions.
 * Survives REJECTED → PENDING re-apply (unlike users.status_reviewed_* alone).
 * Migration: 0012_user_status_decisions.sql
 */
export const userStatusDecisions = pgTable("user_status_decisions", {
  id: uuid("id").notNull().primaryKey().defaultRandom().unique(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  // Reuses status enum; application only writes APPROVED | REJECTED
  decision: STATUS_ENUM("decision").notNull(),
  decidedBy: uuid("decided_by").references(() => users.id, {
    onDelete: "set null",
  }),
  decidedAt: timestamp("decided_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
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
  // Optional trailer — NULL when admin skips upload (migration 0016).
  videoUrl: text("video_url"),
  summary: varchar("summary").notNull(), // Detailed summary
  // Enhanced tracking and control fields
  isbn: varchar("isbn", { length: 20 }), // International Standard Book Number
  publicationYear: integer("publication_year"), // Year published
  publisher: varchar("publisher", { length: 255 }), // Publishing company
  language: varchar("language", { length: 50 }).default("English"), // Book language
  pageCount: integer("page_count"), // Number of pages
  edition: varchar("edition", { length: 50 }), // Edition number/version
  isActive: boolean("is_active").default(true).notNull(), // Soft delete flag (catalog visibility)
  // Curated homepage hero: at most one row should be true (enforced by partial unique index)
  isFeatured: boolean("is_featured").default(false).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(), // Last modification
  updatedBy: uuid("updated_by").references(() => users.id), // Who last updated (admin)
  createdBy: uuid("created_by").references(() => users.id), // Who added to catalog (admin)
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
  fineStatus: FINE_STATUS_ENUM("fine_status").default("NONE").notNull(),
  notes: text("notes"), // Additional notes about the borrowing (admin notes, special conditions)
  renewalCount: integer("renewal_count").default(0).notNull(), // How many times the book was renewed
  lastReminderSent: timestamp("last_reminder_sent", { withTimezone: true }), // Track reminder notifications (prevents spam)
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(), // Last modification
  updatedBy: text("updated_by"), // Email for readability (who made the update)
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(), // When record was created
});

// Parent: REQ-0030
export const reservations = pgTable("reservations", {
  id: uuid("id").notNull().primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  bookId: uuid("book_id").notNull().references(() => books.id),
  status: RESERVATION_STATUS_ENUM("status").notNull().default("WAITING"),
  readyExpiresAt: timestamp("ready_expires_at", { withTimezone: true }),
  fulfilledBorrowId: uuid("fulfilled_borrow_id").references(
    () => borrowRecords.id,
  ),
  updatedBy: text("updated_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Transactional outbox rows make READY notifications replay-safe. A delivery
// worker can mark deliveredAt without coupling provider calls to inventory locks.
export const reservationEvents = pgTable("reservation_events", {
  id: uuid("id").notNull().primaryKey().defaultRandom(),
  reservationId: uuid("reservation_id").notNull().references(() => reservations.id),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  eventKey: varchar("event_key", { length: 100 }).notNull().unique(),
  attemptCount: integer("attempt_count").notNull().default(0),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  lastError: varchar("last_error", { length: 100 }),
  provider: varchar("provider", { length: 30 }),
  providerMessageId: varchar("provider_message_id", { length: 255 }),
  deadLetteredAt: timestamp("dead_lettered_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
});

// Client command IDs make circulation mutations safe to retry across network
// timeouts. The result is committed atomically with the domain mutation.
export const circulationCommands = pgTable("circulation_commands", {
  id: uuid("id").notNull().primaryKey(),
  actorId: uuid("actor_id").notNull().references(() => users.id),
  operation: varchar("operation", { length: 50 }).notNull(),
  entityId: uuid("entity_id").notNull(),
  result: jsonb("result"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const operationTelemetry = pgTable("operation_telemetry", {
  id: uuid("id").notNull().primaryKey().defaultRandom(),
  operation: varchar("operation", { length: 80 }).notNull(),
  kind: varchar("kind", { length: 20 }).notNull(),
  outcome: varchar("outcome", { length: 20 }).notNull(),
  durationMs: integer("duration_ms").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
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
export const fineRateHistory = pgTable("fine_rate_history", {
  id: uuid("id").notNull().primaryKey().defaultRandom(),
  rate: decimal("rate", { precision: 10, scale: 2 }).notNull(),
  effectiveFrom: date("effective_from").notNull(),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

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
  // Parent: CR-0003 / REQ-0034 — moderation gate. Default APPROVED so pre-existing
  // rows stay publicly visible; API explicitly writes PENDING for new reviews.
  status: STATUS_ENUM("status").default("APPROVED").notNull(),
  reviewedBy: uuid("reviewed_by").references(() => users.id, {
    onDelete: "set null",
  }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
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

/**
 * Support Tickets Table
 *
 * Parent: CR-0003 / REQ-0034 (Admin Suite Parity Expansion)
 *
 * User-raised issues resolved by admins. Creator must be an APPROVED actor
 * (same gate as borrowing/reviewing). assignedToId is nullable until an admin
 * claims the ticket; unassigned OPEN tickets are visible to every admin.
 */
export const supportTickets = pgTable("support_tickets", {
  id: uuid("id").notNull().primaryKey().defaultRandom().unique(),
  subject: varchar("subject", { length: 255 }).notNull(),
  description: text("description").notNull(),
  status: TICKET_STATUS_ENUM("status").default("OPEN").notNull(),
  priority: TICKET_PRIORITY_ENUM("priority").default("MEDIUM").notNull(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(), // Creator
  assignedToId: uuid("assigned_to_id").references(() => users.id, {
    onDelete: "set null",
  }), // Admin owner (nullable = unassigned)
  relatedBookId: uuid("related_book_id").references(() => books.id, {
    onDelete: "set null",
  }),
  notes: text("notes"), // Admin-only internal notes
  updatedBy: uuid("updated_by").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Support Ticket Replies Table
 *
 * Threaded conversation between the creator and admins on a ticket.
 * Cascades on ticket delete (replies have no independent lifecycle).
 */
export const supportTicketReplies = pgTable("support_ticket_replies", {
  id: uuid("id").notNull().primaryKey().defaultRandom().unique(),
  ticketId: uuid("ticket_id")
    .references(() => supportTickets.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Notifications Table (in-app bell)
 *
 * Parent: CR-0003 / REQ-0034
 *
 * Fire-and-forget recipient-scoped notifications created alongside domain
 * mutations (ticket/review/admin-request/borrow events). `link` is an
 * app-relative path the client navigates to on click.
 */
export const notifications = pgTable("notifications", {
  id: uuid("id").notNull().primaryKey().defaultRandom().unique(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(), // Recipient
  type: varchar("type", { length: 60 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  link: text("link"),
  isRead: boolean("is_read").notNull().default(false),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Activity Logs Table
 *
 * Parent: CR-0003 / REQ-0034
 *
 * FIFO-retained (latest 50) audit trail of create/update/delete actions
 * across every mutation domain. actorId is nullable (SET NULL) so deleting
 * a user account never blocks on log history.
 */
export const activityLogs = pgTable("activity_logs", {
  id: uuid("id").notNull().primaryKey().defaultRandom().unique(),
  actorId: uuid("actor_id").references(() => users.id, {
    onDelete: "set null",
  }),
  action: varchar("action", { length: 20 }).notNull(), // CREATE | UPDATE | DELETE
  entityType: varchar("entity_type", { length: 40 }).notNull(),
  entityId: uuid("entity_id"),
  details: jsonb("details"), // Optional structured context (titles, before/after, etc.)
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
