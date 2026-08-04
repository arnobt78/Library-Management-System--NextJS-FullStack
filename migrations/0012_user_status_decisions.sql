-- Append-only ledger for library signup APPROVED/REJECTED decisions.
-- Survives REJECTED → PENDING re-apply (users.status_reviewed_* may be cleared).
CREATE TABLE IF NOT EXISTS "user_status_decisions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "decision" "status" NOT NULL,
  "decided_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "decided_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Only APPROVED/REJECTED belong in the ledger (not PENDING).
ALTER TABLE "user_status_decisions"
  ADD CONSTRAINT "user_status_decisions_decision_check"
  CHECK ("decision" IN ('APPROVED', 'REJECTED'));

CREATE INDEX IF NOT EXISTS "user_status_decisions_decided_at_idx"
  ON "user_status_decisions" ("decided_at" DESC);

CREATE INDEX IF NOT EXISTS "user_status_decisions_user_decided_at_idx"
  ON "user_status_decisions" ("user_id", "decided_at" DESC);

-- Backfill from current users.status_reviewed_* (one row per decided account).
INSERT INTO "user_status_decisions" ("user_id", "decision", "decided_by", "decided_at")
SELECT
  u."id",
  u."status",
  u."status_reviewed_by",
  COALESCE(u."status_reviewed_at", u."updated_at", u."created_at", now())
FROM "users" AS u
WHERE u."status" IN ('APPROVED', 'REJECTED')
  AND u."status_reviewed_at" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "user_status_decisions" AS d
    WHERE d."user_id" = u."id"
      AND d."decision" = u."status"
      AND d."decided_at" = COALESCE(u."status_reviewed_at", u."updated_at", u."created_at", now())
  );
