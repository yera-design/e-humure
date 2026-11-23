-- Sprint 12: duplicate patient phone numbers, approval SMS, and alert routing.
-- Additive and safe to run more than once.
BEGIN;

-- 1. Patient phone fingerprint.
--    phone_enc uses a random IV, so the same number never encrypts the same way
--    twice and cannot be compared. phone_hash is an HMAC of the number (see
--    backend/phone.js) used only to detect that a number is already registered,
--    in ANY facility. Existing rows are filled in by the server when it starts.
ALTER TABLE patient ADD COLUMN IF NOT EXISTS phone_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_patient_phone_hash ON patient (phone_hash);

-- 2. SMS sent to a staff member or facility head when their access is approved.
--    It has no appointment, so appointment_id stays NULL for this type.
ALTER TABLE sms_reminder DROP CONSTRAINT IF EXISTS sms_reminder_message_type_check;
ALTER TABLE sms_reminder ADD CONSTRAINT sms_reminder_message_type_check
  CHECK (message_type IN ('appointment', 'confirmation', 'staff_reminder', 'access_approved', 're-test', 'referral'));
ALTER TABLE sms_reminder ALTER COLUMN appointment_id DROP NOT NULL;
ALTER TABLE sms_reminder ADD COLUMN IF NOT EXISTS facility_code TEXT;

-- 3. One-time fix: alerts that went to a clinical psychologist only because the
--    facility had no psychiatric nurse at the time. The rule is that every
--    alert goes to a psychiatric nurse first; only a nurse's escalation sends
--    it to a psychologist. These alerts were never escalated, so they move back
--    to the psychiatric-nurse queue of the patient's facility.
--    Only OPEN alerts are moved. An alert a psychologist has already booked an
--    appointment for (status 'acknowledged') is left where it is.
WITH misrouted AS (
  SELECT a.alert_id, p.facility_id
  FROM risk_alert a
  JOIN screening s ON s.screening_id = a.screening_id
  JOIN patient p ON p.patient_id = s.patient_id
  WHERE a.status = 'open'
    AND a.requires_specialist = TRUE
    AND a.escalated_at IS NULL
)
UPDATE risk_alert a
SET requires_specialist = FALSE,
    psychologist_id = NULL,
    assigned_staff_id = (
      SELECT st.staff_id
      FROM staff st
      LEFT JOIN risk_alert open_a ON open_a.assigned_staff_id = st.staff_id AND open_a.status = 'open'
      WHERE st.facility_id = m.facility_id AND st.role = 'psychiatric_nurse' AND st.is_active = TRUE
      GROUP BY st.staff_id, st.created_at
      ORDER BY COUNT(open_a.alert_id), st.created_at, st.staff_id
      LIMIT 1
    )
FROM misrouted m
WHERE a.alert_id = m.alert_id;
-- Any that found no psychiatric nurse stay unassigned and urgent; the server
-- hands them to the first psychiatric nurse approved at that facility.
UPDATE risk_alert SET urgent = TRUE
WHERE status = 'open' AND requires_specialist = FALSE AND assigned_staff_id IS NULL AND psychologist_id IS NULL;

COMMIT;

