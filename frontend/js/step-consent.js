/* frontend/js/step-consent.js | owner: Audrey | card: S1-03 | branch: feature/audrey-s1-03-consent
   depends on: questions.js (Audrey), app.js text() helper (Promise) | contract v1 */

// Draws the consent screen. onDone(true) means the patient agreed.
function renderConsent(box, onDone) {
  box.innerHTML = "";

  var card = document.createElement("div");
  card.className = "card";

  var title = document.createElement("h2");
  title.textContent = text(CONSENT_TEXT.title);
  card.appendChild(title);

  var body = document.createElement("p");
  body.textContent = text(CONSENT_TEXT.body);
  card.appendChild(body);

  var note = document.createElement("p");
  note.className = "note";
  note.textContent = text(UI_TEXT.notDiagnosis);
  card.appendChild(note);

  var actions = document.createElement("div");
  actions.className = "actions";

  var agree = document.createElement("button");
  agree.textContent = text(UI_TEXT.consentAgree);
  agree.onclick = function () { onDone(true); };

  var decline = document.createElement("button");
  decline.className = "secondary";
  decline.textContent = text(UI_TEXT.consentDecline);
  decline.onclick = function () { onDone(false); };

  actions.appendChild(agree);
  actions.appendChild(decline);
  card.appendChild(actions);
  box.appendChild(card);
}
