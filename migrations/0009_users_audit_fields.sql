-- REQ-0025: attribute privileged role/status changes to the authenticated DB actor.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "updated_by" text;
