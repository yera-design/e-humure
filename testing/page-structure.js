/* testing/page-structure.js
   Structural checks that do not need a browser.
   These catch the classes of bug that were actually shipped before:
     - two elements sharing one id, so getElementById writes to the wrong one
       (the administration page had two "facility-message" elements);
     - a page that forgets the stylesheet, the theme bootstrap or the language
       switch, so it looks nothing like the rest of the app;
     - a page whose script reaches for an id that is not on that page;
     - a phone prefix that is no longer supported creeping back in.
   Usage: node testing/page-structure.js
*/

var fs = require("fs");
var path = require("path");

var ROOT = path.join(__dirname, "..");
var FRONTEND = path.join(ROOT, "frontend");

var failures = [];
function check(name, condition, detail) {
  if (condition) { console.log("  PASS  " + name); return; }
  failures.push(name);
  console.log("  FAIL  " + name + (detail ? " -> " + detail : ""));
}

/* The ids each page's own scripts depend on. Kept here deliberately: if a page
   is restructured, this list is what fails first. */
var REQUIRED_IDS = {
  "login.html": ["facility-field", "facility", "username", "password", "password-visibility", "signin", "message", "staff-mode", "system-mode", "setup-link", "login-instructions"],
  "nurse.html": ["welcome", "signout", "nurse-dashboard", "registration-panel", "screening-flow", "screen", "patient-code", "open-registration", "back-to-dashboard-from-registration", "back-to-dashboard-from-screening", "reg-age", "reg-condition", "reg-condition-other", "reg-sector", "reg-phone", "reg-phone-error", "reg-save", "reg-message", "code-wrap", "patient-code-display", "copy-code", "patient-search", "patient-search-button", "patient-search-message", "pending-list", "pending-total", "pending-refresh", "screening-list", "screening-total", "scr-refresh"],
  "psychologist.html": ["welcome", "signout", "alert-total", "assigned-total", "appt-total", "alert-list", "alert-detail", "mental-health-search", "mental-health-patient-code", "mental-health-search-clear", "mental-health-search-message", "appointment-list", "appt-heading-total", "appt-refresh"],
  "admin.html": ["admin-welcome", "admin-role", "signout", "facility-requests-panel", "facility-request-list", "facility-request-count", "facility-request-message", "facility-request-refresh", "system-overview-panel", "system-overview-list", "overview-refresh", "audit-panel", "audit-list", "audit-refresh", "facility-summary-panel", "facility-summary", "summary-refresh", "staff-requests-panel", "request-list", "request-count", "staff-request-message", "request-refresh"],
  "setup.html": ["setup-secret", "admin-name", "admin-contact", "admin-username", "admin-password", "create-admin", "setup-message"],
  "register-facility.html": ["facility-name", "facility-type", "district", "contact", "admin-name", "username", "password", "submit", "message"],
  "request-access.html": ["name", "contact", "role", "district", "facility", "username", "password", "request", "message"],
  "welcome.html": []
};

function idsIn(html) {
  var found = [];
  var pattern = /\sid=["']([^"']+)["']/g;
  var match;
  while ((match = pattern.exec(html)) !== null) found.push(match[1]);
  return found;
}

var pages = fs.readdirSync(FRONTEND).filter(function (file) { return /\.html$/.test(file); }).sort();

console.log("1. Every page is listed in this test");
check("no page is missing from REQUIRED_IDS",
  pages.every(function (page) { return Object.prototype.hasOwnProperty.call(REQUIRED_IDS, page); }),
  pages.filter(function (page) { return !REQUIRED_IDS[page]; }).join(", "));

pages.forEach(function (page) {
  console.log("\n" + page);
  var html = fs.readFileSync(path.join(FRONTEND, page), "utf8");
  var ids = idsIn(html);

  var duplicates = ids.filter(function (id, index) { return ids.indexOf(id) !== index; });
  check("  no duplicate element ids", duplicates.length === 0, duplicates.join(", "));

  check("  links the shared stylesheet", /href=["']css\/style\.css["']/.test(html));
  check("  sets the theme before first paint", /ehumure_theme/.test(html));
  check("  has a theme toggle", /data-theme-toggle/.test(html));
  check("  has both language buttons",
    /data-shell-lang=["']en["']/.test(html) && /data-shell-lang=["']rw["']/.test(html));
  check("  loads the shared language switch", /js\/shell-language\.js/.test(html));
  check("  declares a responsive viewport", /name=["']viewport["']/.test(html));

  (REQUIRED_IDS[page] || []).forEach(function (id) {
    if (ids.indexOf(id) >= 0) return;
    failures.push(page + " is missing #" + id);
    console.log("  FAIL  missing #" + id);
  });
  if ((REQUIRED_IDS[page] || []).every(function (id) { return ids.indexOf(id) >= 0; })) {
    console.log("  PASS  all " + (REQUIRED_IDS[page] || []).length + " required ids present");
  }
});

console.log("\n2. Unsupported phone prefix is gone");
var sourceDirs = [
  path.join(FRONTEND),
  path.join(FRONTEND, "js"),
  path.join(FRONTEND, "css"),
  path.join(ROOT, "backend")
];
var offenders = [];
sourceDirs.forEach(function (dir) {
  fs.readdirSync(dir)
    .filter(function (file) { return /\.(js|html|css)$/.test(file); })
    .forEach(function (file) {
      var body = fs.readFileSync(path.join(dir, file), "utf8");
      // The one allowed mention is the comment in phone.js saying 077 is
      // rejected. Any other appearance is a leftover.
      body.split(/\r?\n/).forEach(function (row, index) {
        if (row.indexOf("077") < 0) return;
        if (/^\s*\/\//.test(row)) return;
        offenders.push(path.relative(ROOT, path.join(dir, file)) + ":" + (index + 1));
      });
    });
});
check("no 077 prefix remains in frontend or backend source", offenders.length === 0, offenders.join(", "));

console.log("\n3. Contacts are phone-only");
var emailMentions = [];
[path.join(FRONTEND), path.join(FRONTEND, "js"), path.join(ROOT, "backend")].forEach(function (dir) {
  fs.readdirSync(dir)
    .filter(function (file) { return /\.(js|html)$/.test(file); })
    .forEach(function (file) {
      var body = fs.readFileSync(path.join(dir, file), "utf8");
      if (/type=["']email["']|autocomplete=["']email["']/i.test(body)) {
        emailMentions.push(path.relative(ROOT, path.join(dir, file)));
      }
    });
});
check("no email input or email autocomplete anywhere", emailMentions.length === 0, emailMentions.join(", "));

if (failures.length) {
  console.log("\n" + failures.length + " check(s) failed.");
  process.exit(1);
}
console.log("\nAll structural checks passed.");