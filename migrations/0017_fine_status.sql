-- Parent: Fines Platform Wave C — borrow fine lifecycle
DO $$ BEGIN
  CREATE TYPE fine_status AS ENUM ('NONE', 'ACCRUING', 'STAMPED', 'WAIVED', 'PAID');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE borrow_records
  ADD COLUMN IF NOT EXISTS fine_status fine_status NOT NULL DEFAULT 'NONE';

-- Open overdue → ACCRUING
UPDATE borrow_records
SET fine_status = 'ACCRUING'
WHERE status = 'BORROWED'
  AND due_date IS NOT NULL
  AND due_date < CURRENT_DATE;

-- Returned with stored fine → STAMPED
UPDATE borrow_records
SET fine_status = 'STAMPED'
WHERE status = 'RETURNED'
  AND COALESCE(fine_amount::numeric, 0) > 0;

CREATE INDEX IF NOT EXISTS borrow_records_fine_status_idx ON borrow_records (fine_status);
