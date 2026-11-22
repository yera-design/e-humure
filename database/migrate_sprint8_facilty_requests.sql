-- Sprint 8: a hospital or clinic head registers their own facility, and the
-- system administrator approves it before anyone can sign in.
-- Additive only. No column is dropped and no row is deleted.
-- Safe to run more than once.

-- Contact details for the facility itself, as supplied by its head.
-- Stored encrypted, like every other contact in this system.
ALTER TABLE facility ADD COLUMN IF NOT EXISTS contact TEXT;

CREATE TABLE IF NOT EXISTS facility_request (
  request_id      UUID PRIMARY KEY,
  facility_name   TEXT NOT NULL,
  district        TEXT NOT NULL,
  facility_type   TEXT NOT NULL CHECK (facility_type IN ('health_center', 'district_hospital')),
  contact         TEXT NOT NULL,
  admin_full_name TEXT NOT NULL,
  username        TEXT NOT NULL,
  password_hash   TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by     UUID REFERENCES staff (staff_id),
  reviewed_at     TIMESTAMPTZ,
  facility_id     TEXT REFERENCES facility (facility_id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One pending request per facility name, and per username, so a double submit
-- cannot create two facilities.
CREATE UNIQUE INDEX IF NOT EXISTS idx_facility_request_pending_name
  ON facility_request (lower(facility_name)) WHERE status = 'pending';
CREATE UNIQUE INDEX IF NOT EXISTS idx_facility_request_pending_user
  ON facility_request (lower(username)) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_facility_request_status ON facility_request (status, created_at);
