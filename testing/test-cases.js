

var assert = require("assert");
var scoring = require("../backend/scoring");

// Builds 9 answers: the first 8 add up to the target, item 9 is set on its own.
function build(target, item9) {
  var items = [0, 0, 0, 0, 0, 0, 0, 0];
  var left = target;
  for (var i = 0; i < 8 && left > 0; i++) {
    items[i] = Math.min(3, left);
    left -= items[i];
  }
  return items.concat([item9]);
}

var quickNo = scoring.scoreQuickQuestions([false, false]);
assert.strictEqual(quickNo.positive, false);
assert.strictEqual(quickNo.risk, "low");
assert.strictEqual(quickNo.next, "rescreen");

var quickYes = scoring.scoreQuickQuestions([true, false]);
assert.strictEqual(quickYes.positive, true);
assert.strictEqual(quickYes.next, "phq9");

assert.strictEqual(scoring.scoreFullQuestionnaire(build(4, 0)).risk, "low");
assert.strictEqual(scoring.scoreFullQuestionnaire(build(5, 0)).risk, "moderate");
assert.strictEqual(scoring.scoreFullQuestionnaire(build(9, 0)).risk, "moderate");
assert.strictEqual(scoring.scoreFullQuestionnaire(build(10, 0)).risk, "high");

var selfHarm = scoring.scoreFullQuestionnaire(build(0, 1));
assert.strictEqual(selfHarm.total, 1);
assert.strictEqual(selfHarm.risk, "high");
assert.strictEqual(selfHarm.emergency, true);

var maxNoItem9 = scoring.scoreFullQuestionnaire(build(24, 0));
assert.strictEqual(maxNoItem9.total, 24);
assert.strictEqual(maxNoItem9.risk, "high");
assert.strictEqual(maxNoItem9.emergency, false);

assert.strictEqual(scoring.scoreFullQuestionnaire(build(24, 3)).total, 27);

// Bad input must throw, never return a quiet wrong answer.
assert.throws(function () { scoring.scoreQuickQuestions([true]); });
assert.throws(function () { scoring.scoreQuickQuestions(["yes", "no"]); });
assert.throws(function () { scoring.scoreFullQuestionnaire([0, 0, 0, 0, 0, 0, 0, 0]); });
assert.throws(function () { scoring.scoreFullQuestionnaire([0, 0, 0, 0, 0, 0, 0, 0, 4]); });
assert.throws(function () { scoring.scoreFullQuestionnaire([0, 0, 0, 0, 0, 0, 0, 0, 1.5]); });

console.log("All boundary test cases passed");
