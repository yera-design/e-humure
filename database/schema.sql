CREATE TABLE staff (
  staff_id      UUID PRIMARY KEY,
  full_name     TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('system_admin', 'facility_admin', 'ncd_nurse', 'psychiatric_nurse', 'clinical_psychologist', 'disabled')),
  facility_id   TEXT,
  password_hash TEXT NOT NULL,
  created_at	TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT staff_facility_assignment_check CHECK (
    (role = 'system_admin' AND facility_id IS NULL) OR 
    (role <> 'system_admin' AND facility_id IS NOT NULL)
  )
);

CREATE TABLE patient (
  patient_id       TEXT PRIMARY KEY,
  age              INTEGER NOT NULL CHECK (age BETWEEN 18 AND 120),
  chronic_condition TEXT NOT NULL,
  chronic_condition_other TEXT,
  sector           TEXT NOT NULL,
  phone_enc        TEXT NOT NULL,
  consent_given_at TIMESTAMPTZ,
  CONSTRAINT patient_chronic_condition_check CHECK (
    chronic_condition IN ('diabetes', 'hypertension', 'cardiovascular_disease', 'chronic_respiratory_disease', 'cancer', 'other')
    AND (
      (chronic_condition = 'other' AND chronic_condition_other IS NOT NULL AND length(trim(chronic_condition_other)) BETWEEN 2 AND 120)
       OR (chronic_condition <> 'other' AND chronic_condition_other IS NULL)
     )
  )
);

CREATE TABLE screening (
  screening_id UUID PRIMARY KEY,
  patient_id   TEXT NOT NULL REFERENCES patient (patient_id),
  staff_id     UUID NOT NULL REFERENCES staff (staff_id),
  stage        TEXT NOT NULL CHECK (stage IN ('quick', 'full')),
  responses    JSONB NOT NULL,
  total_score  INTEGER CHECK (total_score BETWEEN 0 AND 27),
  item9_flag   BOOLEAN NOT NULL DEFAULT FALSE,
  screened_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  sync_status  TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed'))
);

CREATE TABLE risk_alert (
  alert_id       UUID PRIMARY KEY,
  screening_id   UUID NOT NULL UNIQUE REFERENCES screening (screening_id),
  psychologist_id UUID REFERENCES staff (staff_id),
  risk_level     TEXT NOT NULL CHECK (risk_level IN ('low', 'moderate', 'high')),
  status         TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'closed'))
);

CREATE TABLE appointment (
  appointment_id  UUID PRIMARY KEY,
  patient_id      TEXT NOT NULL REFERENCES patient (patient_id),
  psychologist_id UUID NOT NULL REFERENCES staff (staff_id),
  scheduled_for   TIMESTAMPTZ NOT NULL,
  location        TEXT NOT NULL,
  kind            TEXT NOT NULL CHECK (kind IN ('session', 're-test')),
  status          TEXT NOT NULL DEFAULT 'scheduled'
                  CHECK (status IN ('scheduled', 'attended', 'missed', 'cancelled'))
);

CREATE TABLE sms_reminder (
  reminder_id    UUID PRIMARY KEY,
  patient_id     TEXT NOT NULL REFERENCES patient (patient_id),
  appointment_id UUID REFERENCES appointment (appointment_id),
  send_on        TIMESTAMPTZ NOT NULL,
  message_type   TEXT NOT NULL CHECK (message_type IN ('appointment', 're-test', 'referral')),
  status         TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed'))
);

CREATE TABLE audit_log (
  log_id      BIGSERIAL PRIMARY KEY,
  staff_id    UUID NOT NULL REFERENCES staff (staff_id),
  action      TEXT NOT NULL,
  record_type TEXT NOT NULL,
  record_id   TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_screening_patient ON screening (patient_id);
CREATE INDEX idx_alert_status ON risk_alert (status);
CREATE INDEX idx_appointment_patient ON appointment (patient_id);
