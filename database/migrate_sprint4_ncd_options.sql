BEGIN;

ALTER TABLE patient
  ADD COLUMN IF NOT EXISTS chronic_condition_other TEXT;

ALTER TABLE patient
  DROP CONSTRAINT IF EXISTS patient_chronic_condition_check;

ALTER TABLE patient
  ADD CONSTRAINT patient_chronic_condition_check CHECK (
    chronic_condition IN (
      'diabetes',
      'hypertension',
      'cardiovascular_disease',
      'chronic_respiratory_disease',
      'cancer',
      'other'
    )
    AND (
      (chronic_condition = 'other' AND chronic_condition_other IS NOT NULL
        AND length(trim(chronic_condition_other)) BETWEEN 2 AND 120)
      OR
      (chronic_condition <> 'other' AND chronic_condition_other IS NULL)
    )
  );

COMMIT;
