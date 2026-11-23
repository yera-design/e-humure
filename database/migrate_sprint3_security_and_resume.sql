BEGIN;

CREATE TABLE IF NOT EXISTS facility (
  facility_id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO facility(facility_id, name)
VALUES ('GIK-01', 'Gikomero Health Center')
ON CONFLICT (facility_id) DO NOTHING;
ALTER TABLE facility ADD COLUMN IF NOT EXISTS district TEXT NOT NULL DEFAULT 'Unassigned';
ALTER TABLE facility ADD COLUMN IF NOT EXISTS facility_type TEXT NOT NULL DEFAULT 'health_center';
ALTER TABLE facility ADD COLUMN IF NOT EXISTS last_assigned_psych_nurse_index INTEGER NOT NULL DEFAULT 0;
ALTER TABLE facility DROP CONSTRAINT IF EXISTS facility_facility_type_check;
ALTER TABLE facility ADD CONSTRAINT facility_facility_type_check CHECK (facility_type IN ('health_center','district_hospital'));

ALTER TABLE staff ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
UPDATE staff
SET username = lower(regexp_replace(full_name, '[^a-zA-Z0-9]+', '', 'g'))
WHERE username IS NULL OR username = '';
DROP INDEX IF EXISTS staff_username_unique;
WITH duplicates AS (
  SELECT staff_id, username, row_number() OVER (PARTITION BY facility_id, username ORDER BY staff_id) AS n
  FROM staff
)
UPDATE staff s SET username = d.username || '-' || right(replace(s.staff_id::text, '-', ''), 6)
FROM duplicates d WHERE d.staff_id = s.staff_id AND d.n > 1;
CREATE UNIQUE INDEX IF NOT EXISTS staff_username_facility_unique ON staff(facility_id, username);

ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_role_check;
UPDATE staff
SET role = 'disabled', is_active = FALSE
WHERE role = 'desk' OR full_name ILIKE 'Demo %';
UPDATE staff SET role='ncd_nurse' WHERE role='nurse';
UPDATE staff SET role='clinical_psychologist' WHERE role='psychologist';
ALTER TABLE staff ADD CONSTRAINT staff_role_check
  CHECK (role IN ('system_admin', 'facility_admin', 'ncd_nurse', 'psychiatric_nurse', 'clinical_psychologist', 'disabled'));
ALTER TABLE staff ADD COLUMN IF NOT EXISTS contact TEXT;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'staff_facility_fk') THEN
    ALTER TABLE staff ADD CONSTRAINT staff_facility_fk
      FOREIGN KEY (facility_id) REFERENCES facility(facility_id) NOT VALID;
  END IF;
END $$;
ALTER TABLE staff VALIDATE CONSTRAINT staff_facility_fk;

ALTER TABLE patient ADD COLUMN IF NOT EXISTS facility_id TEXT NOT NULL DEFAULT 'GIK-01';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'patient_facility_fk') THEN
    ALTER TABLE patient ADD CONSTRAINT patient_facility_fk
      FOREIGN KEY (facility_id) REFERENCES facility(facility_id) NOT VALID;
  END IF;
END $$;
ALTER TABLE patient VALIDATE CONSTRAINT patient_facility_fk;

CREATE TABLE IF NOT EXISTS staff_access_request (
  request_id UUID PRIMARY KEY,
  facility_id TEXT NOT NULL REFERENCES facility(facility_id),
  full_name TEXT NOT NULL,
  contact TEXT NOT NULL,
  district TEXT NOT NULL,
  username TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ncd_nurse', 'psychiatric_nurse', 'clinical_psychologist')),
  password_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES staff(staff_id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE staff_access_request ADD COLUMN IF NOT EXISTS contact TEXT;
ALTER TABLE staff_access_request ADD COLUMN IF NOT EXISTS district TEXT;
UPDATE staff_access_request SET contact='Not supplied' WHERE contact IS NULL;
UPDATE staff_access_request SET district='Unassigned' WHERE district IS NULL;
ALTER TABLE staff_access_request ALTER COLUMN contact SET NOT NULL;
ALTER TABLE staff_access_request ALTER COLUMN district SET NOT NULL;
ALTER TABLE staff_access_request DROP CONSTRAINT IF EXISTS staff_access_request_role_check;
UPDATE staff_access_request SET role='ncd_nurse' WHERE role='nurse';
UPDATE staff_access_request SET role='clinical_psychologist' WHERE role='psychologist';
ALTER TABLE staff_access_request ADD CONSTRAINT staff_access_request_role_check
  CHECK (role IN ('ncd_nurse', 'psychiatric_nurse', 'clinical_psychologist'));
CREATE UNIQUE INDEX IF NOT EXISTS access_request_pending_username
  ON staff_access_request(facility_id, username) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS screening_draft (
  draft_id UUID PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patient(patient_id),
  facility_id TEXT NOT NULL REFERENCES facility(facility_id),
  staff_id UUID NOT NULL REFERENCES staff(staff_id),
  stage TEXT NOT NULL CHECK (stage IN ('quick', 'full')),
  quick_answers JSONB NOT NULL DEFAULT '[null,null]'::jsonb,
  full_answers JSONB NOT NULL DEFAULT '[null,null,null,null,null,null,null,null,null]'::jsonb,
  question_index INTEGER NOT NULL DEFAULT 0 CHECK (question_index BETWEEN 0 AND 8),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS screening_draft_one_pending_per_patient
  ON screening_draft(patient_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS screening_draft_facility_pending
  ON screening_draft(facility_id, updated_at DESC) WHERE status = 'pending';

ALTER TABLE screening ADD COLUMN IF NOT EXISTS severity TEXT;
UPDATE screening SET severity = CASE
  WHEN total_score BETWEEN 0 AND 4 THEN 'minimal'
  WHEN total_score BETWEEN 5 AND 9 THEN 'mild'
  WHEN total_score BETWEEN 10 AND 14 THEN 'moderate'
  WHEN total_score BETWEEN 15 AND 19 THEN 'moderately_severe'
  WHEN total_score BETWEEN 20 AND 27 THEN 'severe'
  ELSE NULL END
WHERE stage = 'full' AND severity IS NULL;
ALTER TABLE risk_alert ADD COLUMN IF NOT EXISTS assigned_staff_id UUID REFERENCES staff(staff_id);
ALTER TABLE risk_alert ADD COLUMN IF NOT EXISTS requires_specialist BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE risk_alert SET assigned_staff_id=psychologist_id WHERE assigned_staff_id IS NULL AND psychologist_id IS NOT NULL;
UPDATE risk_alert a SET requires_specialist=TRUE FROM staff s WHERE a.assigned_staff_id=s.staff_id AND s.role='clinical_psychologist';

ALTER TABLE appointment ADD COLUMN IF NOT EXISTS arrived_at TIMESTAMPTZ;
ALTER TABLE sms_reminder ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES appointment(appointment_id);
ALTER TABLE sms_reminder ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sms_reminder ADD COLUMN IF NOT EXISTS last_error TEXT;
CREATE INDEX IF NOT EXISTS sms_reminder_queue ON sms_reminder(send_on) WHERE status = 'queued';

ALTER TABLE audit_log ALTER COLUMN staff_id DROP NOT NULL;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS actor_label TEXT;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS ip_address INET;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS outcome TEXT NOT NULL DEFAULT 'success';
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS facility_id TEXT REFERENCES facility(facility_id);

ALTER TABLE sms_reminder DROP CONSTRAINT IF EXISTS sms_reminder_status_check;
ALTER TABLE sms_reminder ADD CONSTRAINT sms_reminder_status_check
  CHECK (status IN ('queued', 'processing', 'sent', 'failed'));

COMMIT;

