/* testing/alert-visibility-tests.js
   Who may see which alert. No database needed.
   The case this suite exists for: an alert escalated to a clinical
   psychologist who works at a health centre rather than the district hospital.
   Assignment can choose that person, so viewing must accept them. Before this
   was fixed the alert showed as "sent to a psychologist" on both admin
   dashboards and never appeared on the psychologist's own dashboard.
   Usage: node testing/alert-visibility-tests.js
*/

var visibility = require("../backend/alert-visibility");

var failures = [];
function check(name, condition, detail) {
  if (condition) { console.log("  PASS  " + name); return; }
  failures.push(name);
  console.log("  FAIL  " + name + (detail ? " -> " + detail : ""));
}

var HOSPITAL = { staffId: "psy-hospital", role: "clinical_psychologist", facilityId: "f-hosp", facilityType: "district_hospital", district: "Gasabo" };
var HEALTH_CENTRE = { staffId: "psy-centre", role: "clinical_psychologist", facilityId: "f-hc", facilityType: "health_center", district: "Gasabo" };
var OTHER_DISTRICT = { staffId: "psy-other", role: "clinical_psychologist", facilityId: "f-kic", facilityType: "district_hospital", district: "Kicukiro" };
var NURSE = { staffId: "nurse-1", role: "psychiatric_nurse", facilityId: "f-hc", facilityType: "health_center", district: "Gasabo" };
var OTHER_NURSE = { staffId: "nurse-2", role: "psychiatric_nurse", facilityId: "f-hc", facilityType: "health_center", district: "Gasabo" };

function alert(extra) {
  return Object.assign({
    status: "open",
    requiresSpecialist: true,
    assignedStaffId: null,
    psychologistId: null,
    patientFacilityId: "f-hc",
    patientDistrict: "Gasabo"
  }, extra);
}

console.log("1. A psychologist always sees an alert assigned to them");
check("district hospital psychologist, assigned",
  visibility.canSeeAlert(HOSPITAL, alert({ assignedStaffId: HOSPITAL.staffId })) === true);
check("health centre psychologist, assigned  <- the reported bug",
  visibility.canSeeAlert(HEALTH_CENTRE, alert({ assignedStaffId: HEALTH_CENTRE.staffId })) === true);
check("assignment held in the legacy psychologist_id column still counts",
  visibility.canSeeAlert(HEALTH_CENTRE, alert({ psychologistId: HEALTH_CENTRE.staffId })) === true);
check("a psychologist in another district, assigned, still sees it",
  visibility.canSeeAlert(OTHER_DISTRICT, alert({ assignedStaffId: OTHER_DISTRICT.staffId })) === true);

console.log("\n2. An unheld alert is visible to every psychologist in the district");
check("district hospital psychologist sees an unheld case in their district",
  visibility.canSeeAlert(HOSPITAL, alert({ assignedStaffId: null })) === true);
check("health centre psychologist also sees it  <- facility type is irrelevant",
  visibility.canSeeAlert(HEALTH_CENTRE, alert({ assignedStaffId: null })) === true);
check("a psychologist registering later finds the case still waiting",
  visibility.canSeeAlert({ staffId: "psy-new", role: "clinical_psychologist", facilityId: "f-hc2", facilityType: "health_center", district: "Gasabo" },
    alert({ assignedStaffId: null })) === true);
check("district is still the boundary: another district's unheld case is hidden",
  visibility.canSeeAlert(OTHER_DISTRICT, alert({ assignedStaffId: null })) === false);

console.log("\n3. A psychologist never sees somebody else's case");
check("not assigned to them, held by another psychologist",
  visibility.canSeeAlert(HOSPITAL, alert({ assignedStaffId: HEALTH_CENTRE.staffId })) === false);
check("a non-specialist alert is never a psychologist's",
  visibility.canSeeAlert(HOSPITAL, alert({ requiresSpecialist: false, assignedStaffId: HOSPITAL.staffId })) === false);

console.log("\n4. Psychiatric nurses are unchanged");
check("sees their own non-specialist alert at their own facility",
  visibility.canSeeAlert(NURSE, alert({ requiresSpecialist: false, assignedStaffId: NURSE.staffId })) === true);
check("does not see a colleague's alert",
  visibility.canSeeAlert(OTHER_NURSE, alert({ requiresSpecialist: false, assignedStaffId: NURSE.staffId })) === false);
check("does not see a case at another facility",
  visibility.canSeeAlert(NURSE, alert({ requiresSpecialist: false, assignedStaffId: NURSE.staffId, patientFacilityId: "f-other" })) === false);
check("loses sight of a case once it is escalated",
  visibility.canSeeAlert(NURSE, alert({ requiresSpecialist: true, assignedStaffId: NURSE.staffId })) === false);

console.log("\n4b. Alerts raised before any psychiatric nurse existed");
check("a nurse sees an unheld alert at their own facility (it waited for them)",
  visibility.canSeeAlert(NURSE, alert({ requiresSpecialist: false, assignedStaffId: null })) === true);
check("a nurse does not see an unheld alert at another facility",
  visibility.canSeeAlert(NURSE, alert({ requiresSpecialist: false, assignedStaffId: null, patientFacilityId: "f-other" })) === false);
check("an unheld, never-escalated alert is not a psychologist's",
  visibility.canSeeAlert(HOSPITAL, alert({ requiresSpecialist: false, assignedStaffId: null })) === false);

console.log("\n5. Closed alerts are off every dashboard");
["closed", "acknowledged"].forEach(function (status) {
  check("status '" + status + "' is not listed as open",
    visibility.canSeeAlert(HOSPITAL, alert({ status: status, assignedStaffId: HOSPITAL.staffId })) === false);
});

console.log("\n6. Other roles see nothing");
["ncd_nurse", "facility_admin", "system_admin"].forEach(function (role) {
  check(role + " sees no alert",
    visibility.canSeeAlert({ staffId: "x", role: role, facilityId: "f-hc" }, alert({ assignedStaffId: "x" })) === false);
});

console.log("\n7. The SQL predicate matches the rule above");
var sql = visibility.whereClause("$1");
check("no facility-type condition survives anywhere in the predicate",
  sql.indexOf("facility_type") < 0, sql);
check("an unheld alert is scoped by district only",
  sql.indexOf("IS NULL AND f.district=viewer_facility.district") > 0, sql);
check("the psychologist branch does not gate an assigned alert at all",
  /clinical_psychologist' AND a\.requires_specialist AND \(COALESCE\([^)]*\)=\$1 OR/.test(sql), sql);
check("both branches are present", /psychiatric_nurse/.test(sql) && /clinical_psychologist/.test(sql));

if (failures.length) {
  console.log("\n" + failures.length + " check(s) failed.");
  process.exit(1);
}
console.log("\nAll checks passed.");
