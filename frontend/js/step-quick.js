// Draws the 2 quick questions. saved holds earlier picks so a language change loses nothing.

function renderQuick(box, saved, onPick, onDone) {
  box.innerHTML = "";

  var card = document.createElement("div");
  card.className = "card";

  var title = document.createElement("h2");
  title.textContent = text(UI_TEXT.quickTitle);
  card.appendChild(title);

  var stem = document.createElement("p");
  stem.className = "note";
  stem.textContent = text(QUICK_STEM);
  card.appendChild(stem);

  QUICK_QUESTIONS.forEach(function (q, i) {
    var wrap = document.createElement("div");
    wrap.className = "question";

    var label = document.createElement("p");
    label.textContent = (i + 1) + ". " + text(q);
    wrap.appendChild(label);

    var options = document.createElement("div");
    options.className = "options";
    [[true, text(UI_TEXT.answerYes)], [false, text(UI_TEXT.answerNo)]].forEach(function (pair) {
      var option = document.createElement("label");
      option.className = "option";
      var input = document.createElement("input");
      input.type = "radio";
      input.name = "quick" + i;
      input.checked = saved[i] === pair[0];
      input.onchange = function () { onPick(i, pair[0]); };
      option.appendChild(input);
      option.appendChild(document.createTextNode(pair[1]));
      options.appendChild(option);
    });

    wrap.appendChild(options);
    card.appendChild(wrap);
  });

  var error = document.createElement("p");
  error.className = "error";
  card.appendChild(error);

  var actions = document.createElement("div");
  actions.className = "actions";
  var next = document.createElement("button");
  next.textContent = text(UI_TEXT.next);
  next.onclick = function () {
    if (saved.indexOf(null) !== -1) {
      error.textContent = text(UI_TEXT.answerAll);
      return;
    }
    onDone(saved);
  };
  actions.appendChild(next);
  card.appendChild(actions);
  box.appendChild(card);
}

function renderQuick(box, saved, onPick, onDone) {
  box.innerHTML = "";
  var index = state.quickIndex || 0;
  var card = document.createElement("section");
  card.className = "card enter";
  var title = document.createElement("h2"); title.textContent = text(UI_TEXT.quickTitle); card.appendChild(title);
  var stem = document.createElement("p"); stem.className = "note"; stem.textContent = text(QUICK_STEM); card.appendChild(stem);
  var progress = document.createElement("div"); progress.className = "progress"; progress.setAttribute("role", "progressbar"); progress.setAttribute("aria-valuemin", "1"); progress.setAttribute("aria-valuemax", "2"); progress.setAttribute("aria-valuenow", String(index + 1));
  var fill = document.createElement("span"); fill.style.width = ((index + 1) / 2 * 100) + "%"; progress.appendChild(fill); card.appendChild(progress);
  var count = document.createElement("p"); count.className = "small muted"; count.textContent = (LANGUAGE === "rw" ? "Ikibazo " + (index + 1) + " kuri 2" : "Question " + (index + 1) + " of 2"); card.appendChild(count);
  var question = document.createElement("p"); question.className = "question-text"; question.textContent = text(QUICK_QUESTIONS[index]); card.appendChild(question);
  var options = document.createElement("div"); options.className = "options";
  [[true, UI_TEXT.answerYes], [false, UI_TEXT.answerNo]].forEach(function (pair) {
    var label = document.createElement("label"); label.className = "option";
    var input = document.createElement("input"); input.type = "radio"; input.name = "quick" + index; input.checked = saved[index] === pair[0];
    input.onchange = function () { onPick(index, pair[0]); next.disabled = false; };
    label.appendChild(input); label.appendChild(document.createTextNode(text(pair[1]))); options.appendChild(label);
  });
  card.appendChild(options);
  var saveStatus = document.createElement("p"); saveStatus.id = "draft-save-status"; saveStatus.className = "small muted"; saveStatus.setAttribute("aria-live", "polite"); saveStatus.textContent = state.draftStatus || ""; card.appendChild(saveStatus);
  var actions = document.createElement("div"); actions.className = "actions";
  if (index > 0) { var back = document.createElement("button"); back.className = "secondary"; back.textContent = text(UI_TEXT.back); back.onclick = function () { state.quickIndex = index - 1; saveDraft(); render(); }; actions.appendChild(back); }
  var next = document.createElement("button"); next.textContent = text(index === 1 ? UI_TEXT.seeResult : UI_TEXT.next); next.disabled = saved[index] === null;
  next.onclick = function () { if (saved[index] === null) return; if (index < 1) { state.quickIndex = index + 1; saveDraft(); render(); } else { state.quickIndex = 0; onDone(saved); } };
  actions.appendChild(next); card.appendChild(actions); box.appendChild(card);
}
