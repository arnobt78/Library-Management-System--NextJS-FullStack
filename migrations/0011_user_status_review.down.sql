-- C2 rollback for signup decision attribution columns.
DROP INDEX IF EXISTS users_status_reviewed_by_idx;
ALTER TABLE "users" DROP COLUMN IF EXISTS "status_reviewed_at";
ALTER TABLE "users" DROP COLUMN IF EXISTS "status_reviewed_by";
