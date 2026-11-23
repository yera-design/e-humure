-- Hide the development-only Gikomero facility from selection lists.
-- Keep all existing records and preserve access if an administrator already
-- uses this facility; a system administrator can then add the real facility.
UPDATE facility f
SET is_active = FALSE
WHERE f.facility_id = 'GIK-01'
  AND f.name = 'Gikomero Health Center'
  AND NOT EXISTS (
    SELECT 1 FROM staff s
    WHERE s.facility_id = f.facility_id
      AND s.role IN ('system_admin', 'facility_admin')
      AND s.is_active = TRUE
  );
