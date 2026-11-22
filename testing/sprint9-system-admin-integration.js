/*
 * Database-backed Sprint 9 acceptance checks.
 * Run once against a fresh, disposable PostgreSQL database whose name ends in
 * _test, with the migrated app running. This suite creates records and does
 * not delete them. Example: E_HUMURE_RUN_DB_TESTS=1 node testing/sprint9-system-admin-integration.js
 */
var assert = require("assert");
require("../backend/config").loadEnvFile();
var databaseUrl = process.env.DATABASE_URL || "";
var dbName = "";
try { dbName = decodeURIComponent(new URL(databaseUrl).pathname.replace(/^\//, "")); } catch (e) {}
if (process.env.E_HUMURE_RUN_DB_TESTS !== "1" || !/_test$/i.test(dbName)) {
  console.error("Refusing to run: set E_HUMURE_RUN_DB_TESTS=1 and use a disposable DATABASE_URL database ending in _test.");
  process.exit(2);
}
var pool = require("../backend/db");
var base = (process.env.TEST_BASE_URL || "http://localhost:4000").replace(/\/$/, "");
var secret = process.env.SETUP_SECRET;
var rootUser = "s9it" + Date.now().toString(36);
var rootPassword = "TestAdminPass123";
var facilityPassword = "TestFacilityPass123";
var nursePassword = "TestNursePass123";
var assertions = 0;
function check(value, message) { assert.ok(value, message); assertions += 1; console.log("PASS  " + message); }
async function request(method, route, body, token) {
  var headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = "Bearer " + token;
  var response = await fetch(base + route, { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined });
  var data = await response.json();
  return { status: response.status, data: data };
}
function expectStatus(result, expected, message) { check(result.status === expected, message + " (expected " + expected + ", got " + result.status + ")"); }
async function createFacilityRequest(adminName, username, facilityName) {
  var result = await request("POST", "/facility-requests", {
    facilityName: facilityName, district: "Kigali", facilityType: "health_center",
    contact: "0781000001", adminName: adminName, username: username, password: facilityPassword
  });
  expectStatus(result, 201, "facility registration is accepted as pending");
  var list = await request("GET", "/admin/facility-requests", null, globalToken);
  expectStatus(list, 200, "system administrator can list facility requests");
  check(list.data.some(function (item) { return item.username === username; }), "request is visible to the system administrator");
  var pending = list.data.find(function (item) { return item.username === username; });
  var decision = await request("POST", "/admin/facility-requests/" + encodeURIComponent(pending.id) + "/decision", { decision: "approve" }, globalToken);
  expectStatus(decision, 200, "system administrator approves facility registration");
  check(/^([A-Z0-9]{2,3})-\d{2,}$/.test(decision.data.facilityId), "facility code is generated on approval");
  var login = await request("POST", "/login", { facilityId: decision.data.facilityId, username: username, password: facilityPassword });
  expectStatus(login, 200, "facility head can sign in after approval using the generated code");
  return { id: decision.data.facilityId, token: login.data.token, username: username };
}
async function run() {
  assert.ok(secret, "SETUP_SECRET must be loaded from backend/.env");
  var status = await request("GET", "/setup/status");
  expectStatus(status, 200, "fresh database is reachable");
  check(status.data.setupRequired === true, "new test database requires first-admin setup");
  var setup = { setupSecret: secret, fullName: "Sprint Nine IT Admin", contact: "0781000002", username: rootUser, password: rootPassword };
  var created = await request("POST", "/setup/initial-admin", setup);
  expectStatus(created, 201, "setup creates global system administrator");
  var dbAdmin = await pool.query("SELECT role,facility_id FROM staff WHERE username=$1", [rootUser]);
  check(dbAdmin.rowCount === 1 && dbAdmin.rows[0].role === "system_admin" && dbAdmin.rows[0].facility_id === null, "system administrator is stored without a facility");
  expectStatus(await request("POST", "/setup/initial-admin", setup), 409, "one-time setup refuses a second administrator");

  var adminLogin = await request("POST", "/login", { loginType: "system_admin", username: rootUser, password: rootPassword });
  expectStatus(adminLogin, 200, "global administrator signs in without a facility ID");
  globalToken = adminLogin.data.token;
  var me = await request("GET", "/me", null, globalToken);
  expectStatus(me, 200, "global administrator profile loads");
  check(me.data.facilityId === null && me.data.facilityName === null, "/me represents the global account with no facility");
  expectStatus(await request("GET", "/admin/requests", null, globalToken), 403, "global administrator cannot approve facility staff");

  var first = await createFacilityRequest("Facility Head One", rootUser + "head1", "Sprint Nine Clinic One");
  var second = await createFacilityRequest("Facility Head Two", rootUser + "head2", "Sprint Nine Clinic Two");
  var nurseAName = rootUser + "nurse1";
  var nurseBName = rootUser + "nurse2";
  var requestA = await request("POST", "/staff-requests", { facilityId: first.id, fullName: "Nurse One", contact: "0781000003", district: "Kigali", username: nurseAName, role: "ncd_nurse", password: nursePassword });
  expectStatus(requestA, 201, "nurse access request is accepted for facility one");
  var requestB = await request("POST", "/staff-requests", { facilityId: second.id, fullName: "Nurse Two", contact: "0781000004", district: "Kigali", username: nurseBName, role: "ncd_nurse", password: nursePassword });
  expectStatus(requestB, 201, "nurse access request is accepted for facility two");
  expectStatus(await request("POST", "/login", { username: nurseAName, password: nursePassword }), 400, "staff login requires a facility");
  expectStatus(await request("POST", "/login", { facilityId: first.id, username: nurseAName, password: nursePassword }), 401, "pending nurse cannot sign in before approval");

  var pendingA = await request("GET", "/admin/requests", null, first.token);
  var pendingB = await request("GET", "/admin/requests", null, second.token);
  check(pendingA.status === 200 && pendingA.data.some(function (r) { return r.username === nurseAName; }) && !pendingA.data.some(function (r) { return r.username === nurseBName; }), "facility head one sees only own facility requests");
  check(pendingB.status === 200 && pendingB.data.some(function (r) { return r.username === nurseBName; }) && !pendingB.data.some(function (r) { return r.username === nurseAName; }), "facility head two sees only own facility requests");
  var foreign = await request("POST", "/admin/requests/" + encodeURIComponent(pendingB.data.find(function (r) { return r.username === nurseBName; }).id) + "/decision", { decision: "approve" }, first.token);
  expectStatus(foreign, 404, "facility head cannot approve another facility's request");
  var local = await request("POST", "/admin/requests/" + encodeURIComponent(pendingA.data.find(function (r) { return r.username === nurseAName; }).id) + "/decision", { decision: "approve" }, first.token);
  expectStatus(local, 200, "facility head can approve own facility's request");
  var nurseLogin = await request("POST", "/login", { facilityId: first.id, username: nurseAName, password: nursePassword });
  expectStatus(nurseLogin, 200, "approved nurse signs in at assigned facility");
  console.log("All " + assertions + " Sprint 9 database acceptance checks passed. Records were intentionally retained in the disposable test database.");
}
var globalToken = null;
run().catch(function (error) { console.error("Sprint 9 database acceptance failed:", error.message); process.exitCode = 1; }).finally(function () { pool.end(); });
