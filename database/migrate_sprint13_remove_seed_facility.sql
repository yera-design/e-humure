BEGIN;

-- New patients always get their facility from the nurse who registers them;
-- this old default pointed at GIK-01 and is no longer used.
ALTER TABLE patient ALTER COLUMN facility_id DROP DEFAULT;

DO $$
DECLARE
  linked TEXT := '';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM facility WHERE facility_id = 'GIK-01') THEN
    RAISE NOTICE 'GIK-01 is already gone. Nothing to do.';
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM patient WHERE facility_id = 'GIK-01') THEN linked := linked || ' patients'; END IF;
  IF EXISTS (SELECT 1 FROM staff WHERE facility_id = 'GIK-01') THEN linked := linked || ' staff'; END IF;
  IF EXISTS (SELECT 1 FROM staff_access_request WHERE facility_id = 'GIK-01') THEN linked := linked || ' staff-requests'; END IF;
  IF EXISTS (SELECT 1 FROM facility_request WHERE facility_id = 'GIK-01') THEN linked := linked || ' facility-requests'; END IF;
  IF EXISTS (SELECT 1 FROM screening_draft WHERE facility_id = 'GIK-01') THEN linked := linked || ' screening-drafts'; END IF;
  IF EXISTS (SELECT 1 FROM audit_log WHERE facility_id = 'GIK-01') THEN linked := linked || ' audit-log'; END IF;

  IF linked <> '' THEN
    RAISE NOTICE 'GIK-01 was NOT removed because records are linked to it:%', linked;
    RETURN;
  END IF;

  DELETE FROM facility WHERE facility_id = 'GIK-01';
  RAISE NOTICE 'GIK-01 (Gikomero Health Center) removed.';
END $$;

COMMIT;

