-- Rollback: books.created_by

DROP INDEX IF EXISTS "books_created_by_idx";
ALTER TABLE "books" DROP COLUMN IF EXISTS "created_by";
