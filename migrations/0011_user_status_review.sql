-- Durable library signup approve/reject attribution (who + when).
-- Distinct from users.updated_by (text email) which role edits also overwrite.
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "status_reviewed_by" uuid REFERENCES "users"("id");
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "status_reviewed_at" timestamp with time zone;

-- Backfill from legacy updated_by email → admin user id when status was decided.
UPDATE "users" AS u
SET
  "status_reviewed_by" = reviewer.id,
  "status_reviewed_at" = COALESCE(u."status_reviewed_at", u."updated_at")
FROM "users" AS reviewer
WHERE u."status_reviewed_by" IS NULL
  AND u."status" IN ('APPROVED', 'REJECTED')
  AND u."updated_by" IS NOT NULL
  AND reviewer."email" = u."updated_by";

CREATE INDEX IF NOT EXISTS users_status_reviewed_by_idx
  ON "users" ("status_reviewed_by")
  WHERE "status_reviewed_by" IS NOT NULL;
