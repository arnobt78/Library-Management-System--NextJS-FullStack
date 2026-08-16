-- Rollback: books.video_url required again (empty trailers become '').

UPDATE "books"
  SET "video_url" = ''
  WHERE "video_url" IS NULL;

ALTER TABLE "books"
  ALTER COLUMN "video_url" SET NOT NULL;
