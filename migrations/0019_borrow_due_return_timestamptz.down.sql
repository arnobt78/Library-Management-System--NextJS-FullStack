ALTER TABLE borrow_records DROP COLUMN IF EXISTS approved_at;

ALTER TABLE borrow_records
  ALTER COLUMN due_date TYPE date
  USING (due_date AT TIME ZONE 'UTC')::date;

ALTER TABLE borrow_records
  ALTER COLUMN return_date TYPE date
  USING (return_date AT TIME ZONE 'UTC')::date;
