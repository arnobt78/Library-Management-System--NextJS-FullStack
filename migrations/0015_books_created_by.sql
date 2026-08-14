-- Parent: admin book catalog Created-by DNA
-- Nullable for legacy rows; seed + createBook always stamp an admin.

ALTER TABLE "books"
  ADD COLUMN IF NOT EXISTS "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "books_created_by_idx" ON "books" ("created_by");
