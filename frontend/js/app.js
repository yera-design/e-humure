var LANGUAGE = LANGUAGE_DEFAULT;

var state = {
  step: "consent",
  quick: [null, null],
  full: [null, null, null, null, null, null, null, null, null],
  result: null,
  message: ""
};

// Shows Kinyarwanda when it exists, otherwise falls back to English.
function text(item) {
  if (LANGUAGE === "rw" && item.rw) return item.rw;
  return item.en;
}

// Changing the language redraws the current screen and keeps every answer already picked.
function setLanguage(code) {
  LANGUAGE = code;
  document.getElementById("lang-en").className = code === "en" ? "" : "secondary";
  document.getElementById("lang-rw").className = code === "rw" ? "" : "secondary";
  render();
}

function render() {
  var box = document.getElementById("screen");
  if (state.step === "consent") return renderConsent(box, onConsent);
  if (state.step === "quick") return renderQuick(box, state.quick, pickQuick, onQuickDone);
  if (state.step === "full") return renderFull(box, state.full, pickFull, onFullDone);
  if (state.step === "message") return showMessage(box, state.message);
  showResult(box, state.result);
}

function onConsent(agreed) {
  if (!agreed) {
    state.step = "message";
    state.message = text(UI_TEXT.declined);
  } else {
    state.step = "quick";
  }
  render();
}

function pickQuick(index, value) { state.quick[index] = value; }
function pickFull(index, value) { state.full[index] = value; }

function onQuickDone(answers) {
  var quick = scoreQuickQuestions(answers);
  if (quick.positive) {
    state.step = "full";
  } else {
    state.result = quick;
    state.step = "result";
  }
  render();
}

function onFullDone(items) {
  state.result = scoreFullQuestionnaire(items);
  state.step = "result";
  render();
}

function startOver() {
  state = {
    step: "consent",
    quick: [null, null],
    full: [null, null, null, null, null, null, null, null, null],
    result: null,
    message: ""
  };
  render();
}

function showMessage(box, message) {
  box.innerHTML = "";
  var card = document.createElement("div");
  card.className = "card";
  var p = document.createElement("p");
  p.textContent = message;
  card.appendChild(p);
  card.appendChild(restartButton());
  box.appendChild(card);
}

function showResult(box, result) {
  box.innerHTML = "";
  var card = document.createElement("div");
  card.className = "card result-" + result.risk;

  var words = { low: UI_TEXT.riskWordLow, moderate: UI_TEXT.riskWordModerate, high: UI_TEXT.riskWordHigh };
  var title = document.createElement("h2");
  title.textContent = text(UI_TEXT.resultTitle) + ": " + text(words[result.risk]);
  card.appendChild(title);

  if (result.total !== null) {
    var score = document.createElement("p");
    score.textContent = text(UI_TEXT.totalLabel) + ": " + result.total + " " + text(UI_TEXT.outOf);
    card.appendChild(score);
  }

  var advice = document.createElement("p");
  var byRisk = { low: UI_TEXT.riskLow, moderate: UI_TEXT.riskModerate, high: UI_TEXT.riskHigh };
  advice.textContent = result.stage === "quick" ? text(UI_TEXT.quickNegative) : text(byRisk[result.risk]);
  card.appendChild(advice);

  if (result.emergency) {
    var alertBox = document.createElement("div");
    alertBox.className = "emergency";
    alertBox.textContent = text(UI_TEXT.emergency);
    card.appendChild(alertBox);
  }

  var note = document.createElement("p");
  note.className = "note";
  note.textContent = text(UI_TEXT.notDiagnosis);
  card.appendChild(note);

  card.appendChild(restartButton());
  box.appendChild(card);
}

function restartButton() {
  var actions = document.createElement("div");
  actions.className = "actions";
  var again = document.createElement("button");
  again.textContent = text(UI_TEXT.startOver);
  again.onclick = startOver;
  actions.appendChild(again);
  return actions;
}

window.onload = function () {
  document.getElementById("lang-en").onclick = function () { setLanguage("en"); };
  document.getElementById("lang-rw").onclick = function () { setLanguage("rw"); };
  setLanguage(LANGUAGE_DEFAULT);
};

