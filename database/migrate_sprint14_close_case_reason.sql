-- Sprint 14: a psychiatric nurse can close a case she follows herself once the
-- patient is well (escalated cases are still closed only by the clinical
-- psychologist). Every closure now records a short reason.
-- Additive only; safe to run more than once.
BEGIN;

ALTER TABLE risk_alert ADD COLUMN IF NOT EXISTS closing_reason TEXT;
ALTER TABLE risk_alert DROP CONSTRAINT IF EXISTS risk_alert_closing_reason_length;
ALTER TABLE risk_alert ADD CONSTRAINT risk_alert_closing_reason_length
  CHECK (closing_reason IS NULL OR char_length(closing_reason) BETWEEN 10 AND 500);

COMMIT;

