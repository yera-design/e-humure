/* testing/smoke.js | owner: Ivan | card: S2-04 | branch: feature/ivan-s2-04-smoke
   depends on: backend running, database seeded | contract v2
   Walks the full happy path: consent -> screen -> alert -> appointment -> reminder */

var assert = require("assert");
var API = process.env.API || "http://localhost:4000";

async function call(route, opts) {
  var res = await fetch(API + route, opts);
  return { status: res.status, data: await res.json() };
}

async function login(username, password) {
  var out = await call("/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
  assert.strictEqual(out.status, 200, "login failed for " + username);
  return out.data.token;
}

async function run() {
  // 1. Health check
  var h = await call("/health");
  assert.strictEqual(h.status, 200);
  assert.strictEqual(h.data.sprint, 2);

  // 2. Nurse logs in and posts a high-risk screening
  var nurseToken = await login("Demo Nurse", process.env.API_PW_NURSE || "Nurse#2026");
  var nurseHeaders = { "Content-Type": "application/json", Authorization: "Bearer " + nurseToken };

  var screenResult = await call("/score", {
    method: "POST", headers: nurseHeaders,
    body: JSON.stringify({ stage: "full", answers: [2,2,1,2,1,1,1,1,0], patientId: "P-SMOKE-01" })
  });
  assert.strictEqual(screenResult.status, 200);
  assert.strictEqual(screenResult.data.risk, "high");

  // 3. Outbox has an alert row
  var outbox = require("../backend/outbox");
  var rows = outbox.readAll();
  var alertRow = rows.find(function (r) { return r.type === "alert" && r.payload && r.payload.riskLevel === "high"; });
  assert.ok(alertRow, "SMOKE FAIL: no alert in outbox after high-risk screening");

  // 4. Psychologist logs in and sees alerts
  var psychToken = await login("Demo Psychologist", process.env.API_PW_PSYCH || "Psych#2026");
  var psychHeaders = { "Content-Type": "application/json", Authorization: "Bearer " + psychToken };

  var alerts = await call("/alerts", { headers: psychHeaders });
  assert.strictEqual(alerts.status, 200);
  assert.ok(Array.isArray(alerts.data) && alerts.data.length > 0, "SMOKE FAIL: no alerts returned");

  // 5. Psychologist books an appointment
  var first = alerts.data[0];
  var tomorrow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
  var appt = await call("/appointments", {
    method: "POST", headers: psychHeaders,
    body: JSON.stringify({ patientId: first.patient_id, alertId: first.alert_id, scheduledFor: tomorrow })
  });
  assert.strictEqual(appt.status, 200, "SMOKE FAIL: appointment booking returned " + appt.status);
  assert.ok(appt.data.appointmentId, "SMOKE FAIL: no appointmentId in response");
  assert.ok(appt.data.reminderId, "SMOKE FAIL: no reminderId in response");

  // 6. Reminder is queued in the outbox
  var afterRows = outbox.readAll();
  var smsRow = afterRows.find(function (r) { return r.id === appt.data.reminderId; });
  assert.ok(smsRow, "SMOKE FAIL: reminder not found in outbox");

  // 7. Desk staff cannot see alerts
  var deskToken = await login("Demo Desk Staff", process.env.API_PW_DESK || "Desk#2026");
  var deskResult = await call("/alerts", { headers: { Authorization: "Bearer " + deskToken } });
  assert.strictEqual(deskResult.status, 403);

  console.log("SMOKE PASS: consent -> screen -> alert -> appointment -> reminder -> access control");
}

run().catch(function (e) { console.error("SMOKE FAIL:", e.message); process.exit(1); });
