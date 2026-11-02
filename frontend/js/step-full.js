
// Draws the 9 PHQ-9 questions. saved holds earlier picks so a language change loses nothing.
function renderFull(box, saved, onPick, onDone) {
  box.innerHTML = "";

  var card = document.createElement("div");
  card.className = "card";

  var title = document.createElement("h2");
  title.textContent = text(UI_TEXT.fullTitle);
  card.appendChild(title);

  var stem = document.createElement("p");
  stem.className = "note";
  stem.textContent = text(PHQ9_STEM);
  card.appendChild(stem);

  PHQ9_QUESTIONS.forEach(function (q, i) {
    var wrap = document.createElement("div");
    wrap.className = "question";

    var label = document.createElement("p");
    label.textContent = (i + 1) + ". " + text(q);
    wrap.appendChild(label);

    var options = document.createElement("div");
    options.className = "options";
    PHQ9_OPTIONS.forEach(function (opt) {
      var option = document.createElement("label");
      option.className = "option";
      var input = document.createElement("input");
      input.type = "radio";
      input.name = "phq" + i;
      input.checked = saved[i] === opt.value;
      input.onchange = function () { onPick(i, opt.value); };
      option.appendChild(input);
      option.appendChild(document.createTextNode(opt.value + " " + text(opt)));
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
  var done = document.createElement("button");
  done.textContent = text(UI_TEXT.seeResult);
  done.onclick = function () {
    if (saved.indexOf(null) !== -1) {
      error.textContent = text(UI_TEXT.answerAll);
      return;
    }
    onDone(saved);
  };
  actions.appendChild(done);
  card.appendChild(actions);
  box.appendChild(card);
}
