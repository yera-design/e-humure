/* Offline Africa's Talking transport tests. HTTP is fully mocked. */
var assert = require("assert");
var config = require("../backend/config");
var providers = require("../backend/sms-providers");
var worker = require("../backend/sms-worker");

var checks = 0;
function check(name, condition) {
  assert.ok(condition, name);
  checks++;
  console.log("  PASS  " + name);
}
function fakeResponse(statusCode, value) {
  return { statusCode: statusCode, body: typeof value === "string" ? value : JSON.stringify(value) };
}
function atSuccess(code) {
  return { SMSMessageData: { Recipients: [{ status: "Success", statusCode: code, number: "+250781234567" }] } };
}
function caught(fn) {
  try { fn(); return false; } catch (error) { return true; }
}
function throwsMatching(fn, pattern) {
  try { fn(); return false; } catch (error) { return pattern.test(error.message); }
}

async function main() {
  console.log("1. Africa's Talking request and successful per-recipient result");
  var captured;
  var settings = config.smsSettings({ SMS_PROVIDER: "africastalking", AT_USERNAME: "sandbox", AT_API_KEY: "synthetic-test-key" });
  var success = await providers.sendAfricaTalkingSms("+250781234567", "Test message only", settings, async function (options) {
    captured = options;
    return fakeResponse(201, atSuccess(101));
  });
  check("successful recipient response is accepted", success.ok && success.providerState === "sent");
  check("uses the sandbox messaging endpoint", captured.url === config.SANDBOX_SMS_ENDPOINT);
  check("uses the API key header", captured.headers.apiKey === "synthetic-test-key");
  check("requests JSON response and form encoding", captured.headers.Accept === "application/json" && captured.headers["Content-Type"] === "application/x-www-form-urlencoded");
  var form = new URLSearchParams(captured.body);
  check("sends username, international recipient and message as form fields", form.get("username") === "sandbox" && form.get("to") === "+250781234567" && form.get("message") === "Test message only");
  check("does not include sender ID unless configured", !form.has("from"));
  check("sets the 15-second timeout", captured.timeoutMs === 15000);

  console.log("\n2. Provider failures are returned safely");
  var rejected = await providers.sendAfricaTalkingSms("+250781234567", "synthetic", settings, async function () {
    return fakeResponse(201, { SMSMessageData: { Recipients: [{ status: "Failed", statusCode: 202 }] } });
  });
  check("provider rejection is not treated as success", !rejected.ok && /statusCode=202/.test(rejected.error));
  var timeout = await providers.sendAfricaTalkingSms("+250781234567", "synthetic", settings, async function () {
    var error = new Error("secret synthetic-test-key and +250781234567"); error.code = "ETIMEDOUT"; throw error;
  });
  check("timeout is reported without exposing the raw error", !timeout.ok && timeout.retryable && timeout.error === "request timed out" && timeout.error.indexOf("synthetic-test-key") < 0);
  var network = await providers.sendAfricaTalkingSms("+250781234567", "synthetic", settings, async function () {
    var error = new Error("synthetic-test-key +250781234567"); error.code = "ECONNRESET"; throw error;
  });
  check("network error is caught and retryable", !network.ok && network.retryable && /ECONNRESET/.test(network.error));
  var malformed = await providers.sendAfricaTalkingSms("+250781234567", "synthetic", settings, async function () { return fakeResponse(201, "{"); });
  check("malformed response is safely rejected", !malformed.ok && malformed.retryable && malformed.error === "malformed provider response");

  console.log("\n3. Provider configuration and Rwanda number formatting");
  check("missing Africa's Talking credentials are rejected", caught(function () { config.smsSettings({ SMS_PROVIDER: "africastalking" }); }));
  check("unknown SMS_PROVIDER is rejected", caught(function () { config.smsSettings({ SMS_PROVIDER: "unknown" }); }));
  var validAppSecrets = { JWT_SECRET: "a".repeat(64), PHONE_KEY: "b".repeat(64), SETUP_SECRET: "c".repeat(64) };
  check("config.validate gives a provider-specific missing-credentials error", throwsMatching(function () { config.validate(Object.assign({}, validAppSecrets, { SMS_PROVIDER: "africastalking" })); }, /requires AT_USERNAME and AT_API_KEY/));
  check("config.validate rejects an unknown SMS_PROVIDER", throwsMatching(function () { config.validate(Object.assign({}, validAppSecrets, { SMS_PROVIDER: "telepathy" })); }, /SMS_PROVIDER must be simulator or africastalking/));
  check("simulator remains the default provider", config.smsSettings({}).provider === "simulator");
  check("Rwanda 10-digit mobile converts to E.164", worker.rwandaToInternational("0781234567") === "+250781234567");
  check("invalid international input is rejected", caught(function () { worker.rwandaToInternational("+250781234567"); }));
  check("11 digits are rejected", caught(function () { worker.rwandaToInternational("07812345678"); }));
  check("invalid prefixes and repeated digits are rejected", caught(function () { worker.rwandaToInternational("0701234567"); }) && caught(function () { worker.rwandaToInternational("0000000000"); }));

  console.log("\n4. Worker output masks identifiers and labels simulation");
  var line = worker.formatWorkerLog("reminder-001", "africastalking", "+250781234567", "confirmation", "provider_accepted_sent_delivery_unconfirmed");
  check("log shows only a masked number and does not contain key or message", line.indexOf("+250 78* *** *67") >= 0 && line.indexOf("+250781234567") < 0 && line.indexOf("synthetic-test-key") < 0 && line.indexOf("Test message only") < 0);
  var simulated = worker.formatWorkerLog("reminder-002", "simulator", "0781234567", "appointment", "SIMULATED_only_not_delivered");
  check("simulator output is explicitly labelled simulated", simulated.indexOf("SIMULATED") >= 0);

  console.log("\nAll " + checks + " provider checks passed.");
}

main().catch(function (error) { console.error(error.message); process.exitCode = 1; });