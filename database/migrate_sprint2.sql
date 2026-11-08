DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'risk_alert_screening_id_key'
  ) THEN
    ALTER TABLE risk_alert ADD CONSTRAINT risk_alert_screening_id_key UNIQUE (screening_id);
  END IF;
END $$;

-- Fix 2: every appointment must trace back to the alert it fulfils.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='appointment' AND column_name='alert_id'
  ) THEN
    ALTER TABLE appointment ADD COLUMN alert_id UUID REFERENCES risk_alert(alert_id);
  END IF;
END $$;

-- Fix 3: remove patient_id from sms_reminder. Read the patient through the appointment instead.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='sms_reminder' AND column_name='patient_id'
  ) THEN
    ALTER TABLE sms_reminder DROP COLUMN patient_id;
  END IF;
END $$;

-- Sprint 2: add facility_id to patient for row-level security.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='patient' AND column_name='facility_id'
  ) THEN
    ALTER TABLE patient ADD COLUMN facility_id TEXT NOT NULL DEFAULT 'GIK-01';
  END IF;
END $$;

SELECT 'migration done' AS result;
