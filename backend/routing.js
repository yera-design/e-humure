/* backend/routing.js
   ONE place for every number and rule that decides what happens after a PHQ-9.
   Change the constants here and the whole system follows. Nothing else in the
   codebase should hard-code a score boundary.

   Agreed with the product owner on 2026-11-13:

   1. Severity bands are the standard PHQ-9 bands, unchanged:
        0-4   minimal
        5-9   mild                  (watchful waiting - NO alert is raised)
        10-14 moderate
        15-19 moderately severe
        20-27 severe

   2. An alert is raised from 10 upwards. A score of 5-9 is recorded and the
      patient is re-screened later; it does not create work for mental-health
      staff.

   3. Who receives the alert:
        - every alert, including PHQ-9 item 9 above 0 and every score from
          15 to 27, goes to a PSYCHIATRIC NURSE at the patient's own facility;
        - the ONLY route to a CLINICAL PSYCHOLOGIST is a psychiatric nurse
          escalating a case as beyond what they can handle, with a reason;
        - if the facility has no active psychiatric nurse yet, the alert is
          NOT sent to a psychologist. It waits at the facility, open,
          unassigned and urgent, and goes to the first psychiatric nurse
          approved there (changed 2026-11-23 with the product owner).

   4. Urgency is a separate flag from the target. Item 9 above 0 is always
      urgent, and so is a severe score, so the nurse sees it at the top of the
      queue even though it stays with the nurse.
*/

// ---------------------------------------------------------------------------
// Constants. These are the only numbers to change.
// ---------------------------------------------------------------------------
var SEVERITY_BANDS = [
  { max: 4, severity: "minimal" },
  { max: 9, severity: "mild" },
  { max: 14, severity: "moderate" },
  { max: 19, severity: "moderately_severe" },
  { max: 27, severity: "severe" }
];

var ALERT_MIN_SCORE = 10;   // 10 and above raises an alert. 5-9 is watchful waiting.
var HIGH_RISK_MIN_SCORE = 15; // 15 and above is labelled "high" in the workflow.
var URGENT_MIN_SCORE = 20;  // severe band; shown first in the nurse's queue.

var TARGET_PSYCHIATRIC_NURSE = "psychiatric_nurse";
var TARGET_CLINICAL_PSYCHOLOGIST = "clinical_psychologist";

function severityForTotal(total) {
  for (var i = 0; i < SEVERITY_BANDS.length; i++) {
    if (total <= SEVERITY_BANDS[i].max) return SEVERITY_BANDS[i].severity;
  }
  return SEVERITY_BANDS[SEVERITY_BANDS.length - 1].severity;
}

function riskForTotal(total) {
  if (total >= HIGH_RISK_MIN_SCORE) return "high";
  if (total >= ALERT_MIN_SCORE) return "moderate";
  return "low";
}

/* The one routing function.
   input:  { total, item9, escalated }
     total     PHQ-9 total, 0-27
     item9     answer to item 9 (0-3). Above 0 means thoughts of self-harm.
     escalated true only when a psychiatric nurse pressed "escalate".
   output: { needsAlert, risk, severity, emergency, urgent, target, reason }
*/
function routeAlert(input) {
  var total = Number(input && input.total);
  var item9 = Number((input && input.item9) || 0);
  var escalated = Boolean(input && input.escalated);
  if (!Number.isInteger(total) || total < 0 || total > 27) throw new Error("total must be a whole number from 0 to 27");
  if (!Number.isInteger(item9) || item9 < 0 || item9 > 3) throw new Error("item9 must be a whole number from 0 to 3");

  var severity = severityForTotal(total);
  var emergency = item9 > 0;
  // Item 9 overrides the total: self-harm thoughts always raise an alert and
  // always count as high risk, even when the total is low.
  var risk = emergency ? "high" : riskForTotal(total);
  var needsAlert = escalated || emergency || total >= ALERT_MIN_SCORE;

  if (!needsAlert) {
    return { needsAlert: false, risk: risk, severity: severity, emergency: false, urgent: false, target: null, reason: "watchful_waiting" };
  }

  var urgent = emergency || total >= URGENT_MIN_SCORE || escalated;
  var target = escalated ? TARGET_CLINICAL_PSYCHOLOGIST : TARGET_PSYCHIATRIC_NURSE;
  var reason = escalated ? "escalated_by_psychiatric_nurse" : emergency ? "item9_self_harm" : total >= URGENT_MIN_SCORE ? "severe_score" : "score_above_threshold";

  return { needsAlert: true, risk: risk, severity: severity, emergency: emergency, urgent: urgent, target: target, reason: reason };
}

/* Even spread.
   Given the candidates for a facility or district, pick the one carrying the
   fewest OPEN alerts. Ties go to the longest-serving staff member, then to the
   lowest id, so the choice is deterministic and testable.
   The caller must run this inside a transaction that holds a lock on the
   facility (or district) row, so two screenings saved at the same moment
   cannot both read the same "fewest" count.
   candidates: [{ staffId, openAlerts, createdAt }]
*/
function pickLeastLoaded(candidates) {
  if (!Array.isArray(candidates) || !candidates.length) return null;
  var best = null;
  candidates.forEach(function (candidate) {
    if (!best) { best = candidate; return; }
    var load = Number(candidate.openAlerts || 0);
    var bestLoad = Number(best.openAlerts || 0);
    if (load !== bestLoad) { if (load < bestLoad) best = candidate; return; }
    var at = Date.parse(candidate.createdAt || 0) || 0;
    var bestAt = Date.parse(best.createdAt || 0) || 0;
    if (at !== bestAt) { if (at < bestAt) best = candidate; return; }
    if (String(candidate.staffId) < String(best.staffId)) best = candidate;
  });
  return best;
}


/* Which clinical psychologist should take an escalated or specialist case.

   Care stays as close to the patient as possible: a psychologist at the
   patient's OWN facility is preferred, and only when there is none does the
   choice widen to the whole district. Facility type is never considered - a
   health centre psychologist and a district hospital psychologist are equal
   candidates. Within whichever group applies, pickLeastLoaded decides:
   fewest open alerts, ties broken by the oldest account.

   Returns null when the district has nobody. The caller then leaves the
   alert open, urgent and unassigned, where any psychologist in the district
   can still see and claim it. */
function pickPsychologist(candidates, patientFacilityId) {
  if (!Array.isArray(candidates) || !candidates.length) return null;
  var local = candidates.filter(function (candidate) {
    return candidate.facilityId !== undefined
      ? candidate.facilityId === patientFacilityId
      : Boolean(candidate.sameFacility);
  });
  return pickLeastLoaded(local.length ? local : candidates);
}

/* Whether a psychiatric nurse may escalate this alert right now.

   The first visit is required before EVERY escalation, urgent and emergency
   cases included. The nurse sees the patient first, so the specialist
   receives a case somebody has actually met. Urgency changes how quickly
   that first appointment should be arranged, not whether it is needed. */
var FIRST_VISIT_REQUIRED = "This case can't be escalated yet. Record the patient's first appointment as attended first.";

function canEscalate(input) {
  if (!input || !input.hasAttendedVisit) return { allowed: false, status: 409, reason: FIRST_VISIT_REQUIRED };
  return { allowed: true, status: 200, reason: null };
}

module.exports = {
  SEVERITY_BANDS: SEVERITY_BANDS,
  ALERT_MIN_SCORE: ALERT_MIN_SCORE,
  HIGH_RISK_MIN_SCORE: HIGH_RISK_MIN_SCORE,
  URGENT_MIN_SCORE: URGENT_MIN_SCORE,
  TARGET_PSYCHIATRIC_NURSE: TARGET_PSYCHIATRIC_NURSE,
  TARGET_CLINICAL_PSYCHOLOGIST: TARGET_CLINICAL_PSYCHOLOGIST,
  severityForTotal: severityForTotal,
  riskForTotal: riskForTotal,
  routeAlert: routeAlert,
  pickLeastLoaded: pickLeastLoaded,
  pickPsychologist: pickPsychologist,
  canEscalate: canEscalate,
  FIRST_VISIT_REQUIRED: FIRST_VISIT_REQUIRED
};

