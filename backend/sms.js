/* backend/sms.js | owner: Djibril | card: S2-03 | branch: feature/djibril-s2-03-sms-sim
   Sends one SMS. In production replace GATEWAY_URL with the Africa's Talking endpoint.
   In tests point it at sms-simulator.js on port 4002. */

var http = require("http");
var https = require("https");

var GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:4002/send";
var MAX_ATTEMPTS = 3;

function postOnce(phone, message) {
  return new Promise(function (resolve, reject) {
    var data = JSON.stringify({ phone: phone, message: message });
    var parsed = new URL(GATEWAY_URL);
    var lib = parsed.protocol === "https:" ? https : http;
    var req = lib.request({ hostname: parsed.hostname, port: parsed.port, path: parsed.pathname, method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) } }, function (res) {
      res.resume();
      res.statusCode < 300 ? resolve() : reject(new Error("HTTP " + res.statusCode));
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function sendSms(phone, message) {
  for (var attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await postOnce(phone, message);
      return { ok: true, attempts: attempt };
    } catch (e) {
      if (attempt === MAX_ATTEMPTS) return { ok: false, attempts: attempt, error: e.message };
      await new Promise(function (r) { setTimeout(r, 200 * attempt); }); // short delay in tests
    }
  }
}

module.exports = { sendSms: sendSms };
