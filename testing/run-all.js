/* testing/run-all.js
   Runs every test that needs no database and no running server.
   Usage: node testing/run-all.js
   Exits non-zero if any suite fails, so it can be used in a pre-commit hook.

   The database-backed suites (api-tests.js, at4-no-duplicate.js,
   at7-access-control.js, smoke.js) are NOT run here: they need Postgres and a
   running server. Start those separately.
*/

var path = require("path");
var child = require("child_process");

var suites = [
  "run-tests.js",
  "routing-tests.js",
  "sms-message-tests.js",
  "alert-visibility-tests.js",
  "escalation-tests.js",
  "sms-provider-tests.js",
  "shell-language-status.js",
  "translation-check.js",
  "page-wiring.js",
  "page-structure.js",
  "sprint9-system-admin-unit.js"
];

var failed = [];
suites.forEach(function (name) {
  console.log("\n==================== " + name + " ====================");
  var result = child.spawnSync(process.execPath, [path.join(__dirname, name)], { stdio: "inherit" });
  if (result.status !== 0) failed.push(name);
});

console.log("\n=========================================================");
if (failed.length) {
  console.log("FAILED: " + failed.join(", "));
  process.exit(1);
}
console.log("All offline suites passed.");
