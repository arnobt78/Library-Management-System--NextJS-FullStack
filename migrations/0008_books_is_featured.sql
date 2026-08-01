-- Curated homepage hero flag (exclusive featured book)
-- Partial unique index guarantees at most one featured book at a time.
ALTER TABLE "books" ADD COLUMN IF NOT EXISTS "is_featured" boolean DEFAULT false NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "books_one_featured_idx"
  ON "books" ("is_featured")
  WHERE "is_featured" = true;
