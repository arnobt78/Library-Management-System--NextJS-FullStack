-- Rollback for 0014_admin_suite_expansion.sql

DROP TABLE IF EXISTS "activity_logs";
DROP TABLE IF EXISTS "notifications";
DROP TABLE IF EXISTS "support_ticket_replies";
DROP TABLE IF EXISTS "support_tickets";

DROP INDEX IF EXISTS "book_reviews_status_idx";
ALTER TABLE "book_reviews"
  DROP COLUMN IF EXISTS "reviewed_at",
  DROP COLUMN IF EXISTS "reviewed_by",
  DROP COLUMN IF EXISTS "status";

DROP TYPE IF EXISTS "ticket_priority";
DROP TYPE IF EXISTS "ticket_status";
