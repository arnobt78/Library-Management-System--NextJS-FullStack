-- Parent: REQ-0033 polish — due/return clocks + approved_at (not updated_at)
ALTER TABLE borrow_records
  ALTER COLUMN due_date TYPE timestamptz
  USING CASE
    WHEN due_date IS NULL THEN NULL
    ELSE (due_date::timestamp + INTERVAL '12 hours') AT TIME ZONE 'UTC'
  END;

ALTER TABLE borrow_records
  ALTER COLUMN return_date TYPE timestamptz
  USING CASE
    WHEN return_date IS NULL THEN NULL
    ELSE return_date::timestamp AT TIME ZONE 'UTC'
  END;

ALTER TABLE borrow_records
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

UPDATE borrow_records
SET approved_at = borrow_date
WHERE status IN ('BORROWED', 'RETURNED')
  AND approved_at IS NULL
  AND borrow_date IS NOT NULL;
