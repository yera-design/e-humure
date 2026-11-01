var ALLOWED = {
  nurse: ["login", "create_patient", "record_screening", "read_screening_details"],
  psychologist: ["login", "record_screening", "read_screening_details", "read_summary_codes"],
  desk: ["login", "read_summary_codes"]
};

// True only when the role is listed and the action is in its list.
function canDo(role, action) {
  var list = ALLOWED[role];
  return Array.isArray(list) && list.indexOf(action) !== -1;
}

module.exports = { canDo: canDo, ALLOWED: ALLOWED };
