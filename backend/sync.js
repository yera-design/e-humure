/* backend/sync.js | owner: Djibril | card: S2-02 | branch: feature/djibril-s2-02-sync
   Reads outbox.jsonl, posts each row to the district URL, retries with backoff.
   Run: node backend/sync.js  (or called on reconnect from server.js)
   Env: DISTRICT_URL (default http://localhost:4001) */

var http = require("http");
var https = require("https");
var outbox = require("./outbox");

var DISTRICT_URL = process.env.DISTRICT_URL || "http://localhost:4001";
// Retry delays in minutes: 1, 5, 15, 60. Max 5 attempts.
var DELAYS_MS = [1 * 60000, 5 * 60000, 15 * 60000, 60 * 60000];
var MAX_ATTEMPTS = 5;

function post(url, body) {
  return new Promise(function (resolve, reject) {
    var data = JSON.stringify(body);
    var parsed = new URL(url);
    var lib = parsed.protocol === "https:" ? https : http;
    var req = lib.request({ hostname: parsed.hostname, port: parsed.port || (parsed.protocol === "https:" ? 443 : 80), path: parsed.pathname, method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) } }, function (res) {
      var body = "";
      res.on("data", function (c) { body += c; });
      res.on("end", function () { res.statusCode < 300 ? resolve(res.statusCode) : reject(new Error("HTTP " + res.statusCode)); });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  var rows = outbox.readAll();
  if (!rows.length) { console.log("outbox empty"); return; }

  var keep = [];
  for (var row of rows) {
    var now = Date.now();
    if (row.nextRetryAt && new Date(row.nextRetryAt).getTime() > now) {
      keep.push(row); continue;
    }
    try {
      await post(DISTRICT_URL + "/sync", { id: row.id, type: row.type, payload: row.payload });
      console.log("sent", row.id);
      // sent — do not keep
    } catch (e) {
      row.attempts = (row.attempts || 0) + 1;
      if (row.attempts >= MAX_ATTEMPTS) {
        row.status = "failed";
        console.error("failed after", MAX_ATTEMPTS, "attempts:", row.id);
      } else {
        var delayMs = DELAYS_MS[Math.min(row.attempts - 1, DELAYS_MS.length - 1)];
        row.nextRetryAt = new Date(now + delayMs).toISOString();
        console.log("retry", row.attempts, "scheduled for", row.nextRetryAt);
      }
      keep.push(row);
    }
  }
  outbox.rewrite(keep);
  console.log("sync done.", rows.length - keep.length, "sent,", keep.length, "remaining");
}

if (require.main === module) {
  run().catch(function (e) { console.error(e.message); process.exit(1); });
}

module.exports = { run: run };
