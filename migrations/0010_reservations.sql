-- Parent: REQ-0030
DO $$ BEGIN
  CREATE TYPE reservation_status AS ENUM ('WAITING', 'READY', 'FULFILLED', 'CANCELLED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  book_id uuid NOT NULL REFERENCES books(id),
  status reservation_status NOT NULL DEFAULT 'WAITING',
  ready_expires_at timestamptz,
  fulfilled_borrow_id uuid REFERENCES borrow_records(id),
  updated_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS reservations_one_active_user_book
  ON reservations (user_id, book_id)
  WHERE status IN ('WAITING', 'READY');
CREATE INDEX IF NOT EXISTS reservations_fifo_book
  ON reservations (book_id, created_at, id)
  WHERE status = 'WAITING';
CREATE INDEX IF NOT EXISTS reservations_user_history
  ON reservations (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS reservation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES reservations(id),
  event_type varchar(50) NOT NULL,
  event_key varchar(100) NOT NULL UNIQUE,
  attempt_count integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  last_error varchar(100),
  provider varchar(30),
  provider_message_id varchar(255),
  dead_lettered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz
);
ALTER TABLE reservation_events ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0;
ALTER TABLE reservation_events ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE reservation_events ADD COLUMN IF NOT EXISTS locked_at timestamptz;
ALTER TABLE reservation_events ADD COLUMN IF NOT EXISTS last_error varchar(100);
ALTER TABLE reservation_events ADD COLUMN IF NOT EXISTS provider varchar(30);
ALTER TABLE reservation_events ADD COLUMN IF NOT EXISTS provider_message_id varchar(255);
ALTER TABLE reservation_events ADD COLUMN IF NOT EXISTS dead_lettered_at timestamptz;
CREATE INDEX IF NOT EXISTS reservation_events_delivery_schedule
  ON reservation_events (next_attempt_at, created_at)
  WHERE delivered_at IS NULL AND dead_lettered_at IS NULL;

CREATE TABLE IF NOT EXISTS circulation_commands (
  id uuid PRIMARY KEY,
  actor_id uuid NOT NULL REFERENCES users(id),
  operation varchar(50) NOT NULL,
  entity_id uuid NOT NULL,
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS circulation_commands_created_at
  ON circulation_commands (created_at);

CREATE TABLE IF NOT EXISTS operation_telemetry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation varchar(80) NOT NULL,
  kind varchar(20) NOT NULL,
  outcome varchar(20) NOT NULL,
  duration_ms integer NOT NULL CHECK (duration_ms >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS operation_telemetry_window
  ON operation_telemetry (created_at, kind, outcome);
