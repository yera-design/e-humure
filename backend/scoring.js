// e-Humure scoring rules (Table 1 of the proposal).
// Plain JavaScript. No install needed. Owner: Djibril (card C1).

// Quick questions: answers is a list of true (Yes) / false (No).
function scoreQuickQuestions(answers) {
  const anyYes = answers.some(function (a) { return a === true; });
  if (anyYes) {
    return { positive: true, risk: null, next: "Do the full questionnaire (PHQ-9)" };
  }
  return { positive: false, risk: "low", next: "Screen again at the next routine visit" };
}

// Full questionnaire (PHQ-9): items is a list of 9 numbers, each 0, 1, 2 or 3.
function scoreFullQuestionnaire(items) {
  if (items.length !== 9) throw new Error("The full questionnaire needs exactly 9 answers");
  for (const v of items) {
    if (![0, 1, 2, 3].includes(v)) throw new Error("Each answer must be 0, 1, 2 or 3");
  }
  const total = items.reduce(function (a, b) { return a + b; }, 0);

  // Item 9 is the 9th answer (thoughts of self-harm). Above 0 means EMERGENCY, whatever the total.
  if (items[8] > 0) {
    return { total: total, risk: "high", emergency: true, next: "Emergency: call the on-duty psychologist now" };
  }
  if (total >= 10) return { total: total, risk: "high", emergency: false, next: "Alert the psychologist and book a priority appointment" };
  if (total >= 5) return { total: total, risk: "moderate", emergency: false, next: "Add to the psychologist's review list" };
  return { total: total, risk: "low", emergency: false, next: "Screen again at the next routine visit" };
}

module.exports = { scoreQuickQuestions, scoreFullQuestionnaire };
