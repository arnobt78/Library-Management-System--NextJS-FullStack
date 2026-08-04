-- Parent: C2 polish — soft-cancel borrow rejects (preserve history; no hard DELETE).
-- Adds CANCELLED to borrow_status so Reject keeps the row for profile + admin lists.

ALTER TYPE borrow_status ADD VALUE IF NOT EXISTS 'CANCELLED';
