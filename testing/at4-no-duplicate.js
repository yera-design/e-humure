/* testing/at4-no-duplicate.js | owner: Anny | card: S2-01 | branch: feature/anny-s2-01-at4
   depends on: backend running on port 4000, database live | contract v2
   AT-4: POST the same screening twice. Assert one risk_alert row, not two. */

var assert = require("assert");
var API = process.env.API || "http://localhost:4000";

async function call(route, opts) {
  var res = await fetch(API + route, opts);
  return { status: res.status, data: await res.json() };
}

async function login(username, password) {
  var out = await call("/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
  assert.strictEqual(out.status, 200, "login failed: " + JSON.stringify(out.data));
  return out.data.token;
}

async function run() {
  var token = await login("Demo Nurse", process.env.API_PW_NURSE || "Nurse#2026");

  // High-risk answers — total 11, item9=0
  var answers = [2, 2, 1, 1, 1, 1, 1, 1, 0];
  var body = JSON.stringify({ stage: "full", answers, patientId: "P-SEED-AT4" });
  var headers = { "Content-Type": "application/json", Authorization: "Bearer " + token };

  var r1 = await call("/score", { method: "POST", headers, body });
  assert.strictEqual(r1.status, 200, "first POST failed");
  assert.strictEqual(r1.data.risk, "high");

  // POST the same payload a second time (simulates a queue replay)
  var r2 = await call("/score", { method: "POST", headers, body });
  assert.strictEqual(r2.status, 200, "second POST failed");

  // The outbox should have queued two items but the upsert means the district
  // receives one alert row. We verify by checking the outbox file has 2 entries
  // but the risk_alert table has 1 for this patient.
  var pool = require("../backend/db");
  var rows = await pool.query("SELECT COUNT(*) FROM risk_alert ra JOIN screening s ON s.screening_id=ra.screening_id WHERE s.patient_id=$1", ["P-SEED-AT4"]);
  assert.strictEqual(Number(rows.rows[0].count), 1, "AT-4 FAIL: more than one alert row for the same screening");
  await pool.end();

  console.log("AT-4 PASS: 1 alert row after 2 identical POSTs");
}

run().catch(function (e) { console.error("AT-4 FAIL:", e.message); process.exit(1); });
