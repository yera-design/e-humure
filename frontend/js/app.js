var LANGUAGE = LANGUAGE_DEFAULT;
try { if (localStorage.getItem("ehumure_language") === "rw") LANGUAGE = "rw"; } catch (e) {}
var draftSaveChain = Promise.resolve();

var state = {
  step: "consent",
  quickIndex: 0,
  fullIndex: 0,
  quick: [null, null],
  full: [null, null, null, null, null, null, null, null, null],
  result: null,
  message: "",
  draftStatus: ""
};

// Shows Kinyarwanda when it exists, otherwise falls back to English.
function text(item) {
  if (LANGUAGE === "rw" && item.rw) return item.rw;
  return item.en;
}

// The shared language switch in the top bar (js/shell-language.js) owns the
// language choice and announces it. The screening flow only has to redraw, so
// every answer already picked stays picked.
function setLanguage(code) {
  LANGUAGE = code === "rw" ? "rw" : "en";
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
    var codeBox = document.getElementById("patient-code");
    var token = sessionStorage.getItem("ehumure_token");
    if (codeBox && codeBox.value.trim() && token) {
      state.draftStatus = "Recording consent…";
      render();
      fetch("/patients/" + encodeURIComponent(codeBox.value.trim()) + "/consent", {
        method: "POST", headers: { Authorization: "Bearer " + token }
      }).then(function (res) {
        return res.json().then(function (data) { return { ok: res.ok, data: data }; });
      }).then(function (out) {
        if (!out.ok) {
          state.step = "message";
          state.message = out.data.error || "Consent could not be recorded. Check the connection and try again.";
        } else {
          state.step = "quick";
          state.quickIndex = 0;
          state.draftStatus = "Consent recorded. Screening progress saves as you go.";
          saveDraft();
        }
        render();
      }).catch(function () {
        state.step = "consent";
        state.draftStatus = "Consent was not saved. Reconnect and try again.";
        render();
      });
      return;
    }
    state.step = "quick";
  }
  render();
}

function pickQuick(index, value) { state.quick[index] = value; saveDraft(); }
function pickFull(index, value) { state.full[index] = value; saveDraft(); }

function saveDraft() {
  var codeBox = document.getElementById("patient-code");
  var token = sessionStorage.getItem("ehumure_token");
  if (!codeBox || !token || !codeBox.value.trim() || (state.step !== "quick" && state.step !== "full")) return;
  var fullStage = state.step === "full";
  state.draftStatus = "Saving progress…";
  var status = document.getElementById("draft-save-status");
  if (status) status.textContent = state.draftStatus;
  var payload = {
    patientId: codeBox.value.trim(), stage: fullStage ? "full" : "quick",
    quickAnswers: state.quick, fullAnswers: state.full,
    questionIndex: fullStage ? state.fullIndex : state.quickIndex
  };
  draftSaveChain = draftSaveChain.catch(function () {}).then(function () { return fetch("/screening-drafts", {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify(payload)
  }); }).then(function (res) {
    return res.json().then(function (data) { return { ok: res.ok, data: data }; });
  }).then(function (out) {
    state.draftStatus = out.ok ? "Progress saved." : (out.data.error || "Progress could not be saved.");
    var saveStatus = document.getElementById("draft-save-status");
    if (saveStatus) saveStatus.textContent = state.draftStatus;
    if (typeof loadPendingScreenings === "function") loadPendingScreenings();
  }).catch(function () {
    state.draftStatus = "Progress is not saved. Reconnect before leaving this page.";
    var saveStatus = document.getElementById("draft-save-status");
    if (saveStatus) saveStatus.textContent = state.draftStatus;
  });
}

function resumeDraft(draft) {
  document.getElementById("patient-code").value = draft.patientId;
  state.step = draft.stage;
  state.quick = Array.isArray(draft.quickAnswers) ? draft.quickAnswers.slice(0, 2) : [null, null];
  state.full = Array.isArray(draft.fullAnswers) ? draft.fullAnswers.slice(0, 9) : [null, null, null, null, null, null, null, null, null];
  while (state.quick.length < 2) state.quick.push(null);
  while (state.full.length < 9) state.full.push(null);
  state.quickIndex = draft.stage === "quick" ? draft.questionIndex : 0;
  state.fullIndex = draft.stage === "full" ? draft.questionIndex : 0;
  state.result = null;
  state.saved = "";
  state.draftStatus = "Saved progress restored.";
  if (typeof updateScreen === "function") updateScreen();
  render();
}

function onQuickDone(answers) {
  var quick = scoreQuickQuestions(answers);
  if (quick.positive) {
    state.quickIndex = 0;
    state.step = "full";
    state.draftStatus = "";
    saveDraft();
  } else {
    state.result = quick;
    state.step = "result";
  }
  render();
  if (!quick.positive) saveScreening("quick", answers);
}

function onFullDone(items) {
  state.result = scoreFullQuestionnaire(items);
  state.step = "result";
  state.draftStatus = "";
  render();
  saveScreening("full", items);
}

// Sends the result to the backend so it is saved in the database.
// It only runs on the nurse page, which has the patient code box and a login token.
function saveScreening(stage, answers) {
  var codeBox = document.getElementById("patient-code");
  var token = sessionStorage.getItem("ehumure_token");
  if (!codeBox || !token) return;
  if (!codeBox.value.trim()) {
    state.saved = "Not saved: enter a patient code first.";
    return render();
  }
  state.saved = "Saving screening…";
  render();
  draftSaveChain.catch(function () {}).then(function () { return fetch("/score", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify({ stage: stage, answers: answers, patientId: codeBox.value.trim() })
  }); })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      state.saved = data.error ? "Not saved: " + data.error : "Screening saved.";
      render();
      if (typeof loadScreenings === "function") loadScreenings();
      if (typeof loadPendingScreenings === "function") loadPendingScreenings();
    })
    .catch(function () {
      state.saved = "Not saved: cannot reach the backend.";
      render();
    });
}

function startOver() {
  state = {
    step: "consent",
    quickIndex: 0,
    fullIndex: 0,
    quick: [null, null],
    full: [null, null, null, null, null, null, null, null, null],
    result: null,
    message: "",
    draftStatus: ""
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
  if (sessionStorage.getItem("ehumure_role") === "ncd_nurse" && typeof window.nurseBackToDashboard === "function") {
    var dashboardActions = document.createElement("div"); dashboardActions.className = "actions";
    var dashboardButton = document.createElement("button"); dashboardButton.type = "button"; dashboardButton.className = "secondary"; dashboardButton.textContent = LANGUAGE === "rw" ? "Subira ku rubuga rw'umuforomo" : "Back to nurse dashboard";
    dashboardButton.addEventListener("click", window.nurseBackToDashboard); dashboardActions.appendChild(dashboardButton); card.appendChild(dashboardActions);
  }
  box.appendChild(card);
}

function showResult(box, result) {
  box.innerHTML = "";
  var card = document.createElement("div");
  card.className = "card result-" + result.risk;

  var words = { low: UI_TEXT.riskWordLow, moderate: UI_TEXT.riskWordModerate, high: UI_TEXT.riskWordHigh };
  var title = document.createElement("h2");
  title.textContent = text(UI_TEXT.resultTitle);
  card.appendChild(title);
  var risk = document.createElement("p");
  risk.className = "risk " + result.risk;
  risk.textContent = text(words[result.risk]);
  card.appendChild(risk);

  if (result.total !== null) {
    var score = document.createElement("p");
    score.textContent = text(UI_TEXT.totalLabel) + ": " + result.total + " " + text(UI_TEXT.outOf);
    card.appendChild(score);
    var severityNames = { minimal: { en: "Minimal", rw: "Bike cyane" }, mild: { en: "Mild", rw: "Byoroheje" }, moderate: { en: "Moderate", rw: "Biringaniye" }, moderately_severe: { en: "Moderately severe", rw: "Bikabije ku rugero ruringaniye" }, severe: { en: "Severe", rw: "Bikabije" } };
    var severity = document.createElement("p");
    severity.textContent = (LANGUAGE === "rw" ? "Urwego rwa PHQ-9: " : "PHQ-9 severity: ") + text(severityNames[result.severity]);
    card.appendChild(severity);
  }

  var advice = document.createElement("p");
  var byRisk = { low: UI_TEXT.riskLow, moderate: UI_TEXT.riskModerate, high: UI_TEXT.riskHigh };
  advice.textContent = result.stage === "quick" ? text(UI_TEXT.quickNegative) : text(byRisk[result.risk]);
  card.appendChild(advice);

  if (result.emergency) {
    var alertBox = document.createElement("div");
    alertBox.className = "emergency";
    alertBox.textContent = "⚠ " + text(UI_TEXT.emergency);
    card.appendChild(alertBox);
  }

  var note = document.createElement("p");
  note.className = "note";
  note.textContent = text(UI_TEXT.notDiagnosis);
  card.appendChild(note);

  if (state.saved) {
    var saved = document.createElement("p");
    saved.className = "status" + (state.saved.indexOf("Not saved:") === 0 ? " error" : "");
    saved.textContent = state.saved;
    card.appendChild(saved);
  }

  card.appendChild(restartButton());
  if (sessionStorage.getItem("ehumure_role") === "ncd_nurse" && typeof window.nurseBackToDashboard === "function") {
    var dashboardActions = document.createElement("div"); dashboardActions.className = "actions";
    var dashboardButton = document.createElement("button"); dashboardButton.type = "button"; dashboardButton.className = "secondary"; dashboardButton.textContent = LANGUAGE === "rw" ? "Subira ku rubuga rw'umuforomo" : "Back to nurse dashboard";
    dashboardButton.addEventListener("click", window.nurseBackToDashboard); dashboardActions.appendChild(dashboardButton); card.appendChild(dashboardActions);
  }
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

document.addEventListener("ehumure:language", function (event) {
  setLanguage(event.detail && event.detail.language);
});

document.addEventListener("DOMContentLoaded", function () {
  setLanguage(typeof window.getShellLanguage === "function" ? window.getShellLanguage() : LANGUAGE);
});


