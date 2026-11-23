/* testing/routing-tests.js
   Proves the agreed rules in backend/routing.js: the standard PHQ-9 bands, 5-9 raises no alert, 10+ does, everything stays with the psychiatric nurse except a nurse escalation, item 9 above 0 always alerts and is always urgent, alerts spread evenly instead of piling on one person.
   Pure logic. No database and no server needed.
   Usage: node testing/routing-tests.js
*/

var routing = require("../backend/routing");
var scoring = require("../backend/scoring");

var failures = [];
function check(name, condition, detail) {
  if (condition) { console.log("  PASS  " + name); return; }
  failures.push(name);
  console.log("  FAIL  " + name + (detail ? " -> " + detail : ""));
}

console.log("1. Severity bands (standard PHQ-9)");
[[0, "minimal"], [4, "minimal"], [5, "mild"], [9, "mild"], [10, "moderate"], [14, "moderate"],
 [15, "moderately_severe"], [19, "moderately_severe"], [20, "severe"], [27, "severe"]].forEach(function (pair) {
  check("score " + pair[0] + " is " + pair[1], routing.severityForTotal(pair[0]) === pair[1], routing.severityForTotal(pair[0]));
});

console.log("\n2. Alert threshold: mild is watchful waiting, 10 and above alerts");
check("score 4 raises no alert", routing.routeAlert({ total: 4, item9: 0 }).needsAlert === false);
check("score 9 raises no alert", routing.routeAlert({ total: 9, item9: 0 }).needsAlert === false);
check("score 9 is marked watchful waiting", routing.routeAlert({ total: 9, item9: 0 }).reason === "watchful_waiting");
check("score 10 raises an alert", routing.routeAlert({ total: 10, item9: 0 }).needsAlert === true);
check("score 27 raises an alert", routing.routeAlert({ total: 27, item9: 0 }).needsAlert === true);

console.log("\n3. Target: psychiatric nurse keeps everything except an escalation");
for (var total = 10; total <= 27; total++) {
  var out = routing.routeAlert({ total: total, item9: 0 });
  if (out.target !== routing.TARGET_PSYCHIATRIC_NURSE) {
    check("score " + total + " goes to the psychiatric nurse", false, out.target);
  }
}
check("scores 10-27 all go to the psychiatric nurse", failures.length === 0 || failures.every(function (f) { return f.indexOf("goes to the psychiatric nurse") < 0; }));
check("item 9 above 0 stays with the psychiatric nurse", routing.routeAlert({ total: 3, item9: 2 }).target === routing.TARGET_PSYCHIATRIC_NURSE);
check("a severe score stays with the psychiatric nurse", routing.routeAlert({ total: 25, item9: 0 }).target === routing.TARGET_PSYCHIATRIC_NURSE);
check("an escalated case goes to the clinical psychologist", routing.routeAlert({ total: 12, item9: 0, escalated: true }).target === routing.TARGET_CLINICAL_PSYCHOLOGIST);
check("escalation records why", routing.routeAlert({ total: 12, item9: 0, escalated: true }).reason === "escalated_by_psychiatric_nurse");

console.log("\n4. Item 9 beats the total");
check("item 9 above 0 alerts even at total 1", routing.routeAlert({ total: 1, item9: 1 }).needsAlert === true);
check("item 9 above 0 is high risk", routing.routeAlert({ total: 1, item9: 1 }).risk === "high");
check("item 9 above 0 is an emergency", routing.routeAlert({ total: 1, item9: 1 }).emergency === true);
check("item 9 above 0 is urgent", routing.routeAlert({ total: 1, item9: 1 }).urgent === true);
check("item 9 of 0 at a low total is not urgent", routing.routeAlert({ total: 11, item9: 0 }).urgent === false);
check("a severe score is urgent", routing.routeAlert({ total: 20, item9: 0 }).urgent === true);

console.log("\n5. Bad input is rejected, not silently scored");
[[28, 0], [-1, 0], [10, 4], [10, -1], ["x", 0]].forEach(function (pair) {
  var threw = false;
  try { routing.routeAlert({ total: pair[0], item9: pair[1] }); } catch (e) { threw = true; }
  check("rejects total=" + pair[0] + " item9=" + pair[1], threw);
});

console.log("\n6. Even spread across psychiatric nurses");
var nurses = [
  { staffId: "n-a", openAlerts: 0, createdAt: "2026-01-01" },
  { staffId: "n-b", openAlerts: 0, createdAt: "2026-01-02" },
  { staffId: "n-c", openAlerts: 0, createdAt: "2026-01-03" }
];
for (var i = 0; i < 30; i++) {
  var picked = routing.pickLeastLoaded(nurses);
  picked.openAlerts++;
}
var loads = nurses.map(function (n) { return n.openAlerts; });
check("30 alerts across 3 nurses give 10 each", loads.join(",") === "10,10,10", loads.join(","));

console.log("\n7. A nurse who is already loaded is skipped until the others catch up");
var uneven = [
  { staffId: "n-a", openAlerts: 7, createdAt: "2026-01-01" },
  { staffId: "n-b", openAlerts: 0, createdAt: "2026-01-02" },
  { staffId: "n-c", openAlerts: 1, createdAt: "2026-01-03" }
];
var firstSix = [];
for (var j = 0; j < 6; j++) { var p = routing.pickLeastLoaded(uneven); firstSix.push(p.staffId); p.openAlerts++; }
check("the overloaded nurse gets nothing while others catch up", firstSix.indexOf("n-a") < 0, firstSix.join(" "));
// 6 alerts cannot close a gap of 7 on their own. Give the queue enough work to
// even out, then the loads must be within one of each other.
for (var j2 = 0; j2 < 20; j2++) { var p2 = routing.pickLeastLoaded(uneven); p2.openAlerts++; }
check("loads even out within 1 once there is enough work", Math.max.apply(null, uneven.map(function (n) { return n.openAlerts; })) - Math.min.apply(null, uneven.map(function (n) { return n.openAlerts; })) <= 1,
  uneven.map(function (n) { return n.staffId + "=" + n.openAlerts; }).join(" "));

console.log("\n8. Even spread across psychologists (escalated cases only)");
var psychologists = [
  { staffId: "p-a", openAlerts: 2, createdAt: "2026-01-01" },
  { staffId: "p-b", openAlerts: 2, createdAt: "2026-01-02" }
];
for (var k = 0; k < 8; k++) { var q = routing.pickLeastLoaded(psychologists); q.openAlerts++; }
check("8 escalations across 2 psychologists give 6 each", psychologists.map(function (n) { return n.openAlerts; }).join(",") === "6,6",
  psychologists.map(function (n) { return n.openAlerts; }).join(","));
check("no candidates returns null, so the caller can mark the alert urgent and unassigned", routing.pickLeastLoaded([]) === null);

console.log("\n9. routing.js agrees with scoring.js on severity");
var mismatches = [];
for (var t = 0; t <= 27; t++) {
  var items = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  var left = t;
  for (var idx = 0; idx < 8 && left > 0; idx++) { items[idx] = Math.min(3, left); left -= items[idx]; }
  if (left > 0) continue; // totals above 24 need item 9; covered separately
  var scored = scoring.scoreFullQuestionnaire(items);
  if (scored.severity !== routing.severityForTotal(t)) mismatches.push(t + ": " + scored.severity + " vs " + routing.severityForTotal(t));
}
check("severity labels match for every reachable total", mismatches.length === 0, mismatches.join("; "));

if (failures.length) {
  console.log("\n" + failures.length + " check(s) failed.");
  process.exit(1);
}
console.log("\nAll checks passed.");
