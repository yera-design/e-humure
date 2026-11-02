

var assert = require("assert");

var API = process.env.API || "http://localhost:4000";
var ACCOUNTS = [
  { username: "nurse1", password: process.env.API_PW_NURSE, role: "nurse" },
  { username: "psych1", password: process.env.API_PW_PSYCH, role: "psychologist" },
  { username: "desk1", password: process.env.API_PW_DESK, role: "desk" }
];

function call(route, options) {
  return fetch(API + route, options).then(function (res) {
    return res.json().then(function (data) { return { status: res.status, data: data }; });
  });
}

function login(account) {
  return call("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: account.username, password: account.password })
  });
}

async function run() {
  var health = await call("/health");
  assert.strictEqual(health.status, 200);
  assert.strictEqual(health.data.status, "ok");

  var tokens = {};
  for (var account of ACCOUNTS) {
    var out = await login(account);
    assert.strictEqual(out.status, 200, account.username + " should log in");
    assert.strictEqual(out.data.role, account.role);
    tokens[account.role] = out.data.token;
  }

  var bad = await login({ username: "nurse1", password: "wrong-password" });
  assert.strictEqual(bad.status, 401);
  assert.ok(bad.data.error);

  var body = { stage: "full", answers: [1, 1, 1, 1, 1, 1, 1, 1, 0] };
  var nurseScore = await call("/score", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + tokens.nurse },
    body: JSON.stringify(body)
  });
  assert.strictEqual(nurseScore.status, 200);
  assert.strictEqual(nurseScore.data.total, 8);
  assert.strictEqual(nurseScore.data.risk, "moderate");

  var deskScore = await call("/score", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + tokens.desk },
    body: JSON.stringify(body)
  });
  assert.strictEqual(deskScore.status, 403);

  var invalid = await call("/score", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + tokens.nurse },
    body: JSON.stringify({ stage: "full", answers: [9, 9, 9] })
  });
  assert.strictEqual(invalid.status, 400);

  console.log("All API tests passed");
}

run().catch(function (err) {
  console.error("API tests failed: " + err.message);
  process.exit(1);
});
