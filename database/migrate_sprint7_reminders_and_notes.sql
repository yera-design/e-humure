-- Sprint 7: SMS to patients AND to the clinician, plus follow-up notes.
-- Additive only. No column is dropped and no row is deleted.
-- Safe to run more than once.

-- 1. A reminder can now be addressed to a patient or to a staff member.
ALTER TABLE sms_reminder ADD COLUMN IF NOT EXISTS recipient_kind TEXT NOT NULL DEFAULT 'patient';
ALTER TABLE sms_reminder ADD COLUMN IF NOT EXISTS recipient_staff_id UUID REFERENCES staff (staff_id);
ALTER TABLE sms_reminder DROP CONSTRAINT IF EXISTS sms_reminder_recipient_kind_check;
ALTER TABLE sms_reminder ADD CONSTRAINT sms_reminder_recipient_kind_check
  CHECK (recipient_kind IN ('patient', 'staff'));

-- 2. Two more message types: the booking confirmation sent straight away, and
--    the day-before reminder for the clinician.
ALTER TABLE sms_reminder DROP CONSTRAINT IF EXISTS sms_reminder_message_type_check;
ALTER TABLE sms_reminder ADD CONSTRAINT sms_reminder_message_type_check
  CHECK (message_type IN ('appointment', 'confirmation', 'staff_reminder', 're-test', 'referral'));

-- 3. Older rows were all patient messages.
UPDATE sms_reminder SET recipient_kind = 'patient' WHERE recipient_kind IS NULL;

-- 4. Staff phone numbers. staff.contact already exists and holds a Rwandan mobile
--    number. Contacts are phone-only; there is no email anywhere in e-Humure.
CREATE INDEX IF NOT EXISTS idx_reminder_recipient ON sms_reminder (recipient_kind, status);

-- 5. Follow-up notes on an alert, written by the psychiatric nurse or the
--    clinical psychologist. No patient name is ever stored.
CREATE TABLE IF NOT EXISTS alert_note (
  note_id    UUID PRIMARY KEY,
  alert_id   UUID NOT NULL REFERENCES risk_alert (alert_id),
  staff_id   UUID NOT NULL REFERENCES staff (staff_id),
  note       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_alert_note_alert ON alert_note (alert_id, created_at DESC);

-- 6. Who closed an alert and when.
ALTER TABLE risk_alert ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES staff (staff_id);
ALTER TABLE risk_alert ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
