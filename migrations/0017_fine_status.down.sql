DROP INDEX IF EXISTS borrow_records_fine_status_idx;
ALTER TABLE borrow_records DROP COLUMN IF EXISTS fine_status;
DROP TYPE IF EXISTS fine_status;
