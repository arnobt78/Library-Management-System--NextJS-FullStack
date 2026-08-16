-- Parent: optional book trailer (cover stays required)
-- Empty form trailer persists as NULL; non-empty URLs still ImageKit-asserted.

ALTER TABLE "books"
  ALTER COLUMN "video_url" DROP NOT NULL;
