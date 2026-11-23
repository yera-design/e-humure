/* backend/alert-visibility.js
   Who may see and act on a given alert.

   This rule used to be written out twice in server.js, once in GET /alerts and
   once in POST /appointments, and a third, looser version lived in the note and
   close routes. They disagreed, which is how an alert could be assigned to a
   clinical psychologist and then be invisible to that psychologist. The rule
   now lives here and both SQL routes build their WHERE clause from it.

   The rule, in words
   ------------------
   A psychiatric nurse sees a non-specialist alert when it is assigned to them
   and the patient is at their own facility.

   A clinical psychologist sees a specialist alert when EITHER
     (a) it is assigned to them - always, whatever facility they work at; or
     (b) nobody holds it yet, and the patient's facility is in their district.

   Facility type carries no weight anywhere in this rule
   ----------------------------------------------------
   assignLeastLoadedPsychologist() looks for a psychologist at the patient's
   own facility first, then anywhere in the district, and treats a health
   centre exactly like a district hospital. The viewing rule has to accept
   everyone the assignment rule can choose, or a case is routed into a queue
   its owner cannot open. Assignment is itself proof of entitlement.

   (b) is the safety net for alerts nobody holds. When a district has no
   active psychologist at the moment of escalation the alert stays open,
   urgent and unassigned; the district scope means a psychologist registering
   later finds it waiting, and POST /alerts/:alertId/assign lets them claim
   it. The two must agree, so the claim query uses the same district test.
*/

/* The SQL predicate. Parameters are supplied by the caller:
     $viewerStaffId  the signed-in staff id
   and the query must already expose:
     a                 risk_alert
     p                 the patient
     f                 the patient's facility
     viewer            the signed-in staff row
     viewer_facility   the signed-in staff member's facility

   `assigned` is COALESCE(a.assigned_staff_id, a.psychologist_id): older rows
   carry the holder in psychologist_id only. */
var ASSIGNED = "COALESCE(a.assigned_staff_id,a.psychologist_id)";

function whereClause(viewerStaffIdParam) {
  var me = viewerStaffIdParam;
  return "((viewer.role='psychiatric_nurse' AND p.facility_id=viewer.facility_id AND NOT a.requires_specialist AND " + ASSIGNED + "=" + me + ") " +
    "OR (viewer.role='clinical_psychologist' AND a.requires_specialist AND (" +
    ASSIGNED + "=" + me + " " +
    "OR (" + ASSIGNED + " IS NULL AND f.district=viewer_facility.district)" +
    ")))";
}

/* The same rule as plain JavaScript, so it can be unit tested without a
   database. If this and whereClause() ever disagree, the test suite is the
   thing that should fail, not a psychologist staring at an empty dashboard. */
function canSeeAlert(viewer, alert) {
  if (!viewer || !alert) return false;
  if (alert.status !== "open") return false;

  var assigned = alert.assignedStaffId || alert.psychologistId || null;

  if (viewer.role === "psychiatric_nurse") {
    return !alert.requiresSpecialist &&
      alert.patientFacilityId === viewer.facilityId &&
      assigned === viewer.staffId;
  }

  if (viewer.role === "clinical_psychologist") {
    if (!alert.requiresSpecialist) return false;
    if (assigned === viewer.staffId) return true;
    return assigned === null && alert.patientDistrict === viewer.district;
  }

  return false;
}

module.exports = {
  ASSIGNED: ASSIGNED,
  whereClause: whereClause,
  canSeeAlert: canSeeAlert
};
