-- Sprint 10: cleanly retire queued SMS reminders when an appointment is
-- rescheduled. Appointment outcomes and repeat visits use existing columns.
-- Additive only; safe to run more than once.
BEGIN;

ALTER TABLE sms_reminder DROP CONSTRAINT IF EXISTS sms_reminder_status_check;
ALTER TABLE sms_reminder ADD CONSTRAINT sms_reminder_status_check
  CHECK (status IN ('queued', 'processing', 'sent', 'failed', 'cancelled'));

COMMIT;
