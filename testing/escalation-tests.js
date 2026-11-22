/* testing/escalation-tests.js
   Two rules, both pure, both read by server.js from backend/routing.js: routing.pickPsychologist(which psychologist takes an escalated) and caserouting.canEscalate(whether a nurse may escalate yet)
   Usage: node testing/escalation-tests.js
*/

var routing = require("../backend/routing");

var failures = [];
function check(name, condition, detail) {
  if (condition) { console.log("  PASS  " + name); return; }
  failures.push(name);
  console.log("  FAIL  " + name + (detail ? " -> " + detail : ""));
}

var OLD = "2024-01-01T00:00:00.000Z";
var NEW = "2026-01-01T00:00:00.000Z";
var HOME = "f-kimironko";          // the patient's own facility, a health centre
var OTHER_HC = "f-remera";         // another health centre in the district
var HOSPITAL = "f-district-hosp";  // the district hospital

function psy(id, facilityId, openAlerts, createdAt) {
  return { staffId: id, facilityId: facilityId, openAlerts: openAlerts, createdAt: createdAt || OLD };
}

console.log("1. A psychologist at the patient's own facility wins");
check("chosen over an idle psychologist elsewhere in the district",
  routing.pickPsychologist([psy("local", HOME, 9), psy("hospital", HOSPITAL, 0)], HOME).staffId === "local");
check("chosen even when the alternative is the district hospital",
  routing.pickPsychologist([psy("hospital", HOSPITAL, 0), psy("local", HOME, 3)], HOME).staffId === "local");
check("among several at that facility, the least loaded wins",
  routing.pickPsychologist([psy("busy", HOME, 5), psy("free", HOME, 1), psy("hospital", HOSPITAL, 0)], HOME).staffId === "free");
check("a tie at that facility goes to the oldest account",
  routing.pickPsychologist([psy("newer", HOME, 2, NEW), psy("older", HOME, 2, OLD)], HOME).staffId === "older");

console.log("\n2. With nobody at that facility, the whole district is open");
check("the least loaded in the district takes it",
  routing.pickPsychologist([psy("hospital", HOSPITAL, 4), psy("other-hc", OTHER_HC, 1)], HOME).staffId === "other-hc");
check("a health centre psychologist is as eligible as a hospital one",
  routing.pickPsychologist([psy("hospital", HOSPITAL, 2), psy("other-hc", OTHER_HC, 2, NEW)], HOME).staffId === "hospital",
  "equal load, hospital account is older, so it wins on age not on facility type");
check("facility type carries no weight when the health centre is less loaded",
  routing.pickPsychologist([psy("hospital", HOSPITAL, 6), psy("other-hc", OTHER_HC, 0, NEW)], HOME).staffId === "other-hc");
check("a district tie goes to the oldest account",
  routing.pickPsychologist([psy("newer", OTHER_HC, 1, NEW), psy("older", HOSPITAL, 1, OLD)], HOME).staffId === "older");

console.log("\n3. Nobody in the district: the alert stays unassigned");
check("an empty candidate list returns null", routing.pickPsychologist([], HOME) === null);
check("a missing candidate list returns null", routing.pickPsychologist(null, HOME) === null);
check("undefined returns null", routing.pickPsychologist(undefined, HOME) === null);

console.log("\n4. The first visit is required before every escalation");
var blocked = routing.canEscalate({ hasAttendedVisit: false });
check("no attended visit is refused", blocked.allowed === false);
check("refusal is a 409, not a 403 or a 400", blocked.status === 409, String(blocked.status));
check("refusal carries the agreed wording",
  blocked.reason === "This case can't be escalated yet. Record the patient's first appointment as attended first.", blocked.reason);
check("the message is exported for the server to reuse",
  routing.FIRST_VISIT_REQUIRED === blocked.reason);

console.log("\n5. Urgency grants no exemption");
[
  ["an urgent alert", { hasAttendedVisit: false, urgent: true }],
  ["an emergency alert, item 9 flagged", { hasAttendedVisit: false, urgent: true, item9: 3 }],
  ["a severe score of 27", { hasAttendedVisit: false, urgent: true, total: 27 }]
].forEach(function (pair) {
  var out = routing.canEscalate(pair[1]);
  check(pair[0] + " is still refused without an attended visit", out.allowed === false && out.status === 409);
});

console.log("\n6. After the visit is attended, escalation is allowed");
var allowed = routing.canEscalate({ hasAttendedVisit: true });
check("an attended visit is accepted", allowed.allowed === true);
check("nothing is refused and no reason is given", allowed.status === 200 && allowed.reason === null);
check("an attended visit on a routine alert is accepted too",
  routing.canEscalate({ hasAttendedVisit: true, urgent: false }).allowed === true);

console.log("\n7. Bad input is refused, never allowed by accident");
[null, undefined, {}, { hasAttendedVisit: 0 }, { hasAttendedVisit: "" }].forEach(function (input, index) {
  check("input " + (index + 1) + " is refused", routing.canEscalate(input).allowed === false);
});

if (failures.length) {
  console.log("\n" + failures.length + " check(s) failed.");
  process.exit(1);
}
console.log("\nAll checks passed.");