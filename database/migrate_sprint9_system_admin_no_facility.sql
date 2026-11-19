-- Sprint 9: the one-time system administrator is a global IT account, not a
-- member of a clinic. Existing records are preserved; any legacy system-admin
-- facility assignment is cleared so this invariant can be enforced.
-- Apply after migrate_sprint8_facilty_requests.sql.
BEGIN;

ALTER TABLE staff ALTER COLUMN facility_id DROP NOT NULL;
UPDATE staff SET facility_id = NULL WHERE role = 'system_admin' AND facility_id IS NOT NULL;
ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_facility_assignment_check;
ALTER TABLE staff ADD CONSTRAINT staff_facility_assignment_check CHECK (
  (role = 'system_admin' AND facility_id IS NULL) OR
  (role <> 'system_admin' AND facility_id IS NOT NULL)
);

-- Sprint 3 introduced this nullable facility reference. Make the requirement
-- explicit for databases whose local schema was customized.
ALTER TABLE audit_log ALTER COLUMN facility_id DROP NOT NULL;

COMMIT;
