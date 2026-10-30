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

