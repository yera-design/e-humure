/* backend/outbox.js | owner: Djibril | card: S2-01 | branch: feature/djibril-s2-01-outbox
   Appends one JSON line per alert or SMS request. Survives a restart. */

var fs = require("fs");
var path = require("path");

var FILE = path.join(__dirname, "..", "outbox.jsonl");

function enqueue(type, payload) {
  var row = JSON.stringify({ id: payload.id, type: type, payload: payload, attempts: 0, queuedAt: new Date().toISOString() });
  fs.appendFileSync(FILE, row + "\n", "utf8");
}

function readAll() {
  if (!fs.existsSync(FILE)) return [];
  return fs.readFileSync(FILE, "utf8").split("\n").filter(Boolean).map(function (l) {
    try { return JSON.parse(l); } catch (e) { return null; }
  }).filter(Boolean);
}

function rewrite(rows) {
  fs.writeFileSync(FILE, rows.map(function (r) { return JSON.stringify(r); }).join("\n") + (rows.length ? "\n" : ""), "utf8");
}

module.exports = { enqueue: enqueue, readAll: readAll, rewrite: rewrite };
