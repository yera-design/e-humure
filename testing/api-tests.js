var assert = require("assert");

var API = process.env.API || "http://localhost:4000";
var FACILITY = process.env.API_TEST_FACILITY;
var NCD_USER = process.env.API_TEST_NCD_USERNAME;
var NCD_PASSWORD = process.env.API_TEST_NCD_PASSWORD;
var PSY_USER = process.env.API_TEST_PSYCHIATRIC_USERNAME;
var PSY_PASSWORD = process.env.API_TEST_PSYCHIATRIC_PASSWORD;

function call(route, options) {
  return fetch(API + route, options || {}).then(function (res) {
    return res.json().then(function (data) { return { status: res.status, data: data }; });
  });
}
function login(username, password) {
  return call("/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ facilityId: FACILITY, username: username, password: password }) });
}

/* The first-visit rule, end to end.

   Escalation is refused with 409 until the psychiatric nurse has an
   appointment on that alert recorded as attended, and that holds for urgent
   and emergency alerts too. Once the visit is attended the same escalation
   succeeds.

   This needs an open, non-specialist alert already assigned to the test
   psychiatric nurse. If the queue is empty the check reports that it was
   skipped rather than passing quietly. */
async function checkFirstVisitRule(psychHeaders) {
  var jsonHeaders = Object.assign({ "Content-Type": "application/json" }, psychHeaders);

  var alerts = await call("/alerts", { headers: psychHeaders });
  assert.strictEqual(alerts.status, 200);

  var target = (alerts.data || []).filter(function (a) {
    return a.assigned_to_me && !a.requires_specialist && !a.last_attended_at;
  })[0];

  if (!target) {
    console.log("First-visit rule: SKIPPED, no open alert without an attended visit is assigned to this nurse");
    return;
  }

  var reason = "Needs specialist review, this is beyond routine follow-up care.";

  // 1. Before any visit, escalation is refused. Urgency is no exemption.
  var tooEarly = await call("/alerts/" + encodeURIComponent(target.alert_id) + "/escalate", {
    method: "POST", headers: jsonHeaders, body: JSON.stringify({ reason: reason })
  });
  assert.strictEqual(tooEarly.status, 409, "escalation before the first visit must be refused with 409" + (target.urgent ? " even when the alert is urgent" : ""));
  assert.strictEqual(tooEarly.data.error, "This case can't be escalated yet. Record the patient's first appointment as attended first.");

  // 2. Book the first appointment and record the patient as attended.
  var when = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  var booked = await call("/appointments", {
    method: "POST", headers: jsonHeaders,
    body: JSON.stringify({ patientId: target.patient_id, alertId: target.alert_id, scheduledFor: when })
  });
  assert.strictEqual(booked.status, 201, "the nurse should be able to book the first appointment");

  var attended = await call("/appointments/" + encodeURIComponent(booked.data.appointmentId) + "/outcome", {
    method: "PATCH", headers: jsonHeaders, body: JSON.stringify({ outcome: "attended" })
  });
  assert.strictEqual(attended.status, 200, "the nurse should be able to mark the visit attended");

  // 3. The same escalation now succeeds.
  var escalated = await call("/alerts/" + encodeURIComponent(target.alert_id) + "/escalate", {
    method: "POST", headers: jsonHeaders, body: JSON.stringify({ reason: reason })
  });
  assert.strictEqual(escalated.status, 200, "escalation should succeed once the first visit is attended");
  assert.strictEqual(escalated.data.ok, true);

  // 4. The case has left this nurse's queue.
  var after = await call("/alerts", { headers: psychHeaders });
  assert.ok(!(after.data || []).some(function (a) { return a.alert_id === target.alert_id; }),
    "an escalated case should no longer sit in the psychiatric nurse's queue");

  console.log("First-visit rule: 409 before the visit, success after it");
}

async function run() {
  if (!FACILITY || !NCD_USER || !NCD_PASSWORD || !PSY_USER || !PSY_PASSWORD) {
    throw new Error("Set API_TEST_FACILITY, API_TEST_NCD_USERNAME/PASSWORD, and API_TEST_PSYCHIATRIC_USERNAME/PASSWORD to existing approved staff accounts.");
  }
  var health = await call("/health");
  assert.strictEqual(health.status, 200);
  assert.strictEqual(health.data.status, "ok");
  var facilities = await call("/facilities");
  assert.strictEqual(facilities.status, 200);
  assert.ok(facilities.data.some(function (item) { return item.id === FACILITY; }));

  var ncd = await login(NCD_USER, NCD_PASSWORD);
  assert.strictEqual(ncd.status, 200, "approved NCD nurse should sign in");
  assert.strictEqual(ncd.data.role, "ncd_nurse");
  var psychiatric = await login(PSY_USER, PSY_PASSWORD);
  assert.strictEqual(psychiatric.status, 200, "approved psychiatric nurse should sign in");
  assert.strictEqual(psychiatric.data.role, "psychiatric_nurse");

  var ncdHeaders = { Authorization: "Bearer " + ncd.data.token };
  var psychHeaders = { Authorization: "Bearer " + psychiatric.data.token };
  var drafts = await call("/screening-drafts", { headers: ncdHeaders });
  assert.strictEqual(drafts.status, 200);
  var deniedAlerts = await call("/alerts", { headers: ncdHeaders });
  assert.strictEqual(deniedAlerts.status, 403, "NCD nurses must not open mental-health alert details");
  var alerts = await call("/alerts", { headers: psychHeaders });
  assert.strictEqual(alerts.status, 200);
  var appointments = await call("/appointments", { headers: psychHeaders });
  assert.strictEqual(appointments.status, 200);

  await checkFirstVisitRule(psychHeaders);

  var bad = await login(NCD_USER, "incorrect-password");
  assert.strictEqual(bad.status, 401);
  assert.ok(bad.data.error);
  console.log("Role access API checks passed");
}
run().catch(function (err) { console.error("API checks failed: " + err.message); process.exit(1); });
