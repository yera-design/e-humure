var QUICK_COUNT = 2;
var FULL_COUNT = 9;
var ITEM9_INDEX = 8;

// Whooley: all No = low risk, any Yes = do the PHQ-9.
function scoreQuickQuestions(answers) {
  var ok = Array.isArray(answers) && answers.length === QUICK_COUNT &&
    answers.every(function (a) { return typeof a === "boolean"; });
  if (!ok) throw new Error("answers must be an array of 2 true/false values");

  var positive = answers.indexOf(true) !== -1;
  return {
    stage: "quick",
    positive: positive,
    risk: positive ? null : "low",
    total: null,
    emergency: false,
    next: positive ? "phq9" : "rescreen"
  };
}

// PHQ-9 standard severity bands. Operational alert risk remains a separate
// workflow label: 0-9 low, 10-14 moderate, 15+ high.
function scoreFullQuestionnaire(items) {
  var ok = Array.isArray(items) && items.length === FULL_COUNT &&
    items.every(function (n) { return Number.isInteger(n) && n >= 0 && n <= 3; });
  if (!ok) throw new Error("answers must be an array of 9 whole numbers from 0 to 3");

  var total = items.reduce(function (sum, n) { return sum + n; }, 0);
  var severity = total <= 4 ? "minimal" : total <= 9 ? "mild" : total <= 14 ? "moderate" : total <= 19 ? "moderately_severe" : "severe";
  var risk = total >= 15 ? "high" : total >= 10 ? "moderate" : "low";

  // Item 9 above 0 beats the total: always high and always an emergency.
  var emergency = items[ITEM9_INDEX] > 0;
  if (emergency) risk = "high";

  var next = "rescreen";
  if (emergency) next = "emergency";
  else if (risk !== "low") next = "psychologist_review";

  return {
    stage: "full",
    positive: risk !== "low",
    risk: risk,
    severity: severity,
    total: total,
    emergency: emergency,
    next: next
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    scoreQuickQuestions: scoreQuickQuestions,
    scoreFullQuestionnaire: scoreFullQuestionnaire
  };
}
