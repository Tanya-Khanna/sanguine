-- Sanguine schema for Aurora DSQL.
-- DSQL notes baked in: no sequences/SERIAL, no foreign keys, no SELECT ... FOR
-- UPDATE. We use uuid defaults, application-level referential integrity, and
-- optimistic concurrency (the `version` token) instead of row locks.

-- One row per physical blood bag (the authoritative inventory row).
CREATE TABLE IF NOT EXISTS blood_units (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_no          int  NOT NULL,            -- human-friendly tag, e.g. #1182
  blood_type       text NOT NULL,            -- O-, O+, A-, ... AB+
  status           text NOT NULL DEFAULT 'available', -- available|held|allocated|in_transit|expired
  center_id        uuid NOT NULL,
  center_name      text NOT NULL,
  expires_at       timestamptz NOT NULL,
  held_by_request  uuid,
  held_until       timestamptz,
  version          int  NOT NULL DEFAULT 0,  -- optimistic-concurrency token
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- A hospital's ask.
CREATE TABLE IF NOT EXISTS requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id   uuid NOT NULL,
  hospital_name text NOT NULL,
  blood_type    text NOT NULL,
  units_needed  int  NOT NULL,
  deadline      timestamptz NOT NULL,
  status        text NOT NULL DEFAULT 'pending', -- pending|partially_filled|filled|failed
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- STRONG path claims. unit_id is the PRIMARY KEY: the database physically
-- cannot record the same unit allocated twice. This is the safety net.
CREATE TABLE IF NOT EXISTS allocations (
  unit_id      uuid PRIMARY KEY,
  id           uuid NOT NULL DEFAULT gen_random_uuid(),
  request_id   uuid NOT NULL,
  status       text NOT NULL DEFAULT 'held', -- held|allocated|confirmed
  allocated_at timestamptz NOT NULL DEFAULT now()
);

-- NAIVE path claims. Deliberately UNPROTECTED: no uniqueness on unit_id, so
-- two concurrent promises for the same unit both land. This is what the strong
-- path's safety net prevents — kept separate so the contrast is visible.
CREATE TABLE IF NOT EXISTS naive_allocations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id      uuid NOT NULL,
  request_id   uuid NOT NULL,
  allocated_at timestamptz NOT NULL DEFAULT now()
);

-- Append-only custody ledger. Never updated or deleted. The audit story.
CREATE TABLE IF NOT EXISTS custody_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id    uuid,
  unit_no    int,
  request_id uuid,
  event_type text NOT NULL, -- requested|held|allocated|rerouted|released|expired|confirmed
  detail     jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
