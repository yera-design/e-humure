// AT-7: desk staff get 403 on every clinical route.
// This proves the role-based access control is working.
// Run: node testing/at7-access-control.js

var assert = require("assert");
var API = process.env.API || "http://localhost:4000";

async function call(route, opts) {
  var res = await fetch(API + route, opts);
  return { status: res.status, data: await res.json() };
}

async function login(username, password) {
  var out = await call("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  assert.strictEqual(out.status, 200, "login failed");
  return out.data.token;
}

async function run() {
  var deskToken = await login("Demo Desk Staff", process.env.API_PW_DESK || "Desk#2026");
  var headers = { "Content-Type": "application/json", Authorization: "Bearer " + deskToken };

  // Every one of these must return 403 for a desk user.
  var routes = [
    {
      method: "POST",
      route: "/score",
      body: JSON.stringify({ stage: "full", answers: [0, 0, 0, 0, 0, 0, 0, 0, 0] })
    },
    {
      method: "GET",
      route: "/alerts"
    },
    {
      method: "POST",
      route: "/appointments",
      body: JSON.stringify({
        patientId: "P-X",
        alertId: "00000000-0000-0000-0000-000000000000",
        scheduledFor: new Date().toISOString()
      })
    }
  ];

  for (var endpoint of routes) {
    var r = await call(endpoint.route, { method: endpoint.method, headers, body: endpoint.body });
    assert.strictEqual(
      r.status,
      403,
      "AT-7 FAIL: desk got " + r.status + " on " + endpoint.method + " " + endpoint.route + " (expected 403)"
    );
  }

  console.log("AT-7 PASS: desk got 403 on all " + routes.length + " protected routes");
}

run().catch(function (e) { console.error("AT-7 FAIL:", e.message); process.exit(1); });
