-- Parent: REQ-0030, REQ-0032
-- Run only after reverting all application code that references reservations.
DROP TABLE IF EXISTS operation_telemetry;
DROP TABLE IF EXISTS circulation_commands;
DROP TABLE IF EXISTS reservation_events;
DROP TABLE IF EXISTS reservations;
DROP TYPE IF EXISTS reservation_status;
