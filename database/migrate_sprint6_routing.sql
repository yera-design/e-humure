-- Sprint 6: alert routing, urgency and escalation reasons.
-- Additive only. No column is dropped and no row is deleted.
-- Safe to run more than once.

ALTER TABLE risk_alert ADD COLUMN IF NOT EXISTS urgent BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE risk_alert ADD COLUMN IF NOT EXISTS route_reason TEXT;
ALTER TABLE risk_alert ADD COLUMN IF NOT EXISTS escalation_reason TEXT;
ALTER TABLE risk_alert ADD COLUMN IF NOT EXISTS escalated_by UUID REFERENCES staff (staff_id);
ALTER TABLE risk_alert ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ;
ALTER TABLE risk_alert ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Existing emergencies and severe scores become urgent so old alerts sort
-- correctly in the new queue.
UPDATE risk_alert a
   SET urgent = TRUE
  FROM screening s
 WHERE s.screening_id = a.screening_id
   AND a.status = 'open'
   AND a.urgent = FALSE
   AND (s.item9_flag = TRUE OR s.total_score >= 20);

-- Find the least-loaded assignee quickly.
CREATE INDEX IF NOT EXISTS idx_alert_open_assignee ON risk_alert (assigned_staff_id) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_alert_unassigned_urgent ON risk_alert (urgent, created_at) WHERE status = 'open' AND assigned_staff_id IS NULL;
