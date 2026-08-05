-- Parent: CR-0003 / REQ-0034 (Admin Suite Parity Expansion)
-- Adds support tickets + replies, in-app notifications, activity log, and
-- book_reviews moderation columns. Additive only — no existing rows/columns
-- are modified in a breaking way; book_reviews.status defaults to APPROVED
-- so every pre-existing review stays publicly visible.

CREATE TYPE "ticket_status" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
CREATE TYPE "ticket_priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- Book review moderation gate -------------------------------------------------
ALTER TABLE "book_reviews"
  ADD COLUMN IF NOT EXISTS "status" "status" NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN IF NOT EXISTS "reviewed_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "reviewed_at" timestamp with time zone;

CREATE INDEX IF NOT EXISTS "book_reviews_status_idx" ON "book_reviews" ("status");

-- Support tickets --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "support_tickets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  "subject" varchar(255) NOT NULL,
  "description" text NOT NULL,
  "status" "ticket_status" NOT NULL DEFAULT 'OPEN',
  "priority" "ticket_priority" NOT NULL DEFAULT 'MEDIUM',
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "assigned_to_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "related_book_id" uuid REFERENCES "books"("id") ON DELETE SET NULL,
  "notes" text,
  "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "support_tickets_user_id_idx" ON "support_tickets" ("user_id");
CREATE INDEX IF NOT EXISTS "support_tickets_status_idx" ON "support_tickets" ("status");
CREATE INDEX IF NOT EXISTS "support_tickets_assigned_to_id_idx" ON "support_tickets" ("assigned_to_id");
CREATE INDEX IF NOT EXISTS "support_tickets_created_at_idx" ON "support_tickets" ("created_at" DESC);

CREATE TABLE IF NOT EXISTS "support_ticket_replies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  "ticket_id" uuid NOT NULL REFERENCES "support_tickets"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "body" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "support_ticket_replies_ticket_id_idx" ON "support_ticket_replies" ("ticket_id", "created_at");

-- Notifications -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" varchar(60) NOT NULL,
  "title" varchar(255) NOT NULL,
  "message" text NOT NULL,
  "link" text,
  "is_read" boolean NOT NULL DEFAULT false,
  "read_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "notifications_user_id_created_at_idx" ON "notifications" ("user_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "notifications_user_id_is_read_idx" ON "notifications" ("user_id", "is_read");

-- Activity logs -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "activity_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  "actor_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "action" varchar(20) NOT NULL,
  "entity_type" varchar(40) NOT NULL,
  "entity_id" uuid,
  "details" jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "activity_logs_created_at_idx" ON "activity_logs" ("created_at" DESC);
