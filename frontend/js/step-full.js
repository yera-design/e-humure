function renderFull(box, saved, onPick, onDone) {
  box.innerHTML = "";
  var index = state.fullIndex || 0;

  var card = document.createElement("section");
  card.className = "card enter";

  var title = document.createElement("h2");
  title.textContent = text(UI_TEXT.fullTitle);
  card.appendChild(title);

  var stem = document.createElement("p");
  stem.className = "note";
  stem.textContent = text(PHQ9_STEM);
  card.appendChild(stem);

  var progress = document.createElement("div");
  progress.className = "progress";
  progress.setAttribute("role", "progressbar");
  progress.setAttribute("aria-valuemin", "1");
  progress.setAttribute("aria-valuemax", "9");
  progress.setAttribute("aria-valuenow", String(index + 1));

  var fill = document.createElement("span");
  fill.style.width = ((index + 1) / 9 * 100) + "%";
  progress.appendChild(fill);
  card.appendChild(progress);

  var count = document.createElement("p");
  count.className = "small muted";
  count.textContent = (LANGUAGE === "rw"
    ? "Ikibazo " + (index + 1) + " kuri 9"
    : "Question " + (index + 1) + " of 9");
  card.appendChild(count);

  var question = document.createElement("p");
  question.className = "question-text";
  question.textContent = text(PHQ9_QUESTIONS[index]);
  card.appendChild(question);

  var options = document.createElement("div");
  options.className = "options";

  PHQ9_OPTIONS.forEach(function (option) {
    var label = document.createElement("label");
    label.className = "option";

    var input = document.createElement("input");
    input.type = "radio";
    input.name = "phq" + index;
    input.checked = saved[index] === option.value;

    input.onchange = function () {
      onPick(index, option.value);
      next.disabled = false;
    };

    label.appendChild(input);
    label.appendChild(document.createTextNode(text(option)));
    options.appendChild(label);
  });

  card.appendChild(options);

  var saveStatus = document.createElement("p");
  saveStatus.id = "draft-save-status";
  saveStatus.className = "small muted";
  saveStatus.setAttribute("aria-live", "polite");
  saveStatus.textContent = state.draftStatus || "";
  card.appendChild(saveStatus);

  var actions = document.createElement("div");
  actions.className = "actions";

  if (index > 0) {
    var back = document.createElement("button");
    back.className = "secondary";
    back.textContent = text(UI_TEXT.back);

    back.onclick = function () {
      state.fullIndex = index - 1;
      saveDraft();
      render();
    };

    actions.appendChild(back);
  }

  var next = document.createElement("button");
  next.textContent = text(index === 8 ? UI_TEXT.seeResult : UI_TEXT.next);
  next.disabled = saved[index] === null;

  next.onclick = function () {
    if (saved[index] === null) return;

    if (index < 8) {
      state.fullIndex = index + 1;
      saveDraft();
      render();
    } else {
      state.fullIndex = 0;
      onDone(saved);
    }
  };

  actions.appendChild(next);
  card.appendChild(actions);
  box.appendChild(card);
}