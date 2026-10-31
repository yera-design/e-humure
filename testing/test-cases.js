
var assert = require("assert");
var q = require("../frontend/questions");

assert.strictEqual(q.PHQ9_QUESTIONS.length, 9, "there must be exactly 9 PHQ-9 questions");
assert.strictEqual(q.QUICK_QUESTIONS.length, 2, "there must be exactly 2 quick questions");
assert.deepStrictEqual(q.PHQ9_OPTIONS.map(function (o) { return o.value; }), [0, 1, 2, 3]);

var missing = [];
var labels = [];

// Walks every text object and records the ones with no Kinyarwanda yet.
function check(label, item) {
  labels.push(label);
  assert.strictEqual(typeof item.en, "string", label + " needs English text");
  assert.ok(item.en.length > 0, label + " English text is empty");
  assert.strictEqual(typeof item.rw, "string", label + " rw must be a string");
  if (item.rw === "") missing.push(label);
}

check("PHQ9_STEM", q.PHQ9_STEM);
check("QUICK_STEM", q.QUICK_STEM);
q.PHQ9_OPTIONS.forEach(function (o, i) { check("PHQ9_OPTIONS[" + i + "]", o); });
q.PHQ9_QUESTIONS.forEach(function (o, i) { check("PHQ9_QUESTIONS[" + (i + 1) + "]", o); });
q.QUICK_QUESTIONS.forEach(function (o, i) { check("QUICK_QUESTIONS[" + (i + 1) + "]", o); });
Object.keys(q.CONSENT_TEXT).forEach(function (k) { check("CONSENT_TEXT." + k, q.CONSENT_TEXT[k]); });
Object.keys(q.UI_TEXT).forEach(function (k) { check("UI_TEXT." + k, q.UI_TEXT[k]); });


q.RW_NEEDS_CLINICIAN_CHECK.forEach(function (label) {
  assert.ok(labels.indexOf(label) !== -1, label + " is on the clinician list but does not exist");
});

console.log("Checks passed on " + labels.length + " strings.");
console.log("Still missing Kinyarwanda: " + missing.length);
missing.forEach(function (label) { console.log("  - " + label); });
console.log("Team draft, waiting for a clinician: " + q.RW_NEEDS_CLINICIAN_CHECK.length);
q.RW_NEEDS_CLINICIAN_CHECK.forEach(function (label) { console.log("  - " + label); });

if (missing.length > 0 || q.RW_NEEDS_CLINICIAN_CHECK.length > 0) {
  console.log('LANGUAGE_DEFAULT must stay "en". The nurse can still switch to Kinyarwanda on the page.');
}
