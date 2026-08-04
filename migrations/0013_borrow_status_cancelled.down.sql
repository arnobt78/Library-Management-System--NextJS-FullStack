-- Rollback: PostgreSQL cannot drop enum values safely; leave CANCELLED in place.
-- Application code must stop writing CANCELLED before relying on this down file.
SELECT 1;
