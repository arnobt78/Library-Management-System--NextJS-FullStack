-- Parent: REQ-0033 polish — cancel/reject and last-renew clocks (not updated_at)
ALTER TABLE borrow_records
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

ALTER TABLE borrow_records
  ADD COLUMN IF NOT EXISTS renewed_at timestamptz;

UPDATE borrow_records
SET cancelled_at = updated_at
WHERE status = 'CANCELLED'
  AND cancelled_at IS NULL
  AND updated_at IS NOT NULL;

UPDATE borrow_records
SET renewed_at = updated_at
WHERE renewal_count > 0
  AND renewed_at IS NULL
  AND updated_at IS NOT NULL;
