var ALLOWED = {
  system_admin: ["login", "approve_facility_requests", "read_audit", "read_system_overview", "read_facility_summary"],
  facility_admin: ["login", "approve_staff", "read_facility_summary"],
  ncd_nurse: ["login", "create_patient", "read_patients", "record_screening", "manage_screening_drafts"],
  psychiatric_nurse: ["login", "read_screening_details", "book_appointment", "escalate_alert", "read_summary_codes", "add_alert_note"],
  clinical_psychologist: ["login", "read_screening_details", "book_appointment", "read_summary_codes", "add_alert_note", "close_alert"]
};

function canDo(role, action) {
  var list = ALLOWED[role];
  return Array.isArray(list) && list.indexOf(action) !== -1;
}

module.exports = { canDo: canDo, ALLOWED: ALLOWED };
