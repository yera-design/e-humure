-- Sprint 11: distinguish local simulation fallback from provider-accepted SMS.
-- Additive and safe to run more than once.
BEGIN;

ALTER TABLE sms_reminder DROP CONSTRAINT IF EXISTS sms_reminder_status_check;
ALTER TABLE sms_reminder ADD CONSTRAINT sms_reminder_status_check
  CHECK (status IN ('queued', 'processing', 'sent', 'simulated', 'failed', 'cancelled'));

COMMIT;
