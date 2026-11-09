var API = "http://localhost:4000";

function token() { return sessionStorage.getItem("ehumure_token") || ""; }

function say(box, message, isError) {
  box.innerHTML = "";
  var c = document.createElement("div");
  c.className = "card";
  var p = document.createElement("p");
  p.className = isError ? "error" : "note";
  p.textContent = message;
  c.appendChild(p);
  box.appendChild(c);
}

// Risk badge styling. EMERGENCY overrides everything.
function badge(riskLevel, item9Flag) {
  var label = item9Flag ? "EMERGENCY" : riskLevel.toUpperCase();
  var cls = item9Flag ? "result-high" : "result-" + riskLevel;
  return { label: label, cls: cls };
}

function renderList(alerts) {
  var box = document.getElementById("alert-list");
  box.innerHTML = "";
  if (!alerts.length) { say(box, "No open alerts.", false); return; }

  alerts.forEach(function (a) {
    var b = badge(a.risk_level, a.item9_flag);
    var card = document.createElement("div");
    card.className = "card " + b.cls;
    card.style.cursor = "pointer";

    var title = document.createElement("h2");
    title.textContent = b.label + " — Patient " + a.patient_id;
    card.appendChild(title);

    var meta = document.createElement("p");
    meta.className = "note";
    meta.textContent = "PHQ-9 total: " + a.total_score + "  |  Screened: " + new Date(a.screened_at).toLocaleDateString();
    card.appendChild(meta);

    card.onclick = function () { renderDetail(a); };
    box.appendChild(card);
  });
}

function renderDetail(a) {
  var listBox = document.getElementById("alert-list");
  var detailBox = document.getElementById("alert-detail");
  listBox.style.display = "none";
  detailBox.style.display = "";
  detailBox.innerHTML = "";

  var b = badge(a.risk_level, a.item9_flag);
  var card = document.createElement("div");
  card.className = "card " + b.cls;

  var title = document.createElement("h2");
  title.textContent = b.label + " — Patient " + a.patient_id;
  card.appendChild(title);

  if (a.item9_flag) {
    var em = document.createElement("div");
    em.className = "emergency";
    em.textContent = "EMERGENCY: patient reported thoughts of self-harm. Call the on-duty nurse now.";
    card.appendChild(em);
  }

  var score = document.createElement("p");
  var phone = document.createElement("p");
  phone.textContent = "Patient phone: " + a.phone;
  card.appendChild(phone);

  var dateLabel = document.createElement("p");
  dateLabel.className = "note";
  dateLabel.textContent = "Screened: " + new Date(a.screened_at).toLocaleString();
  card.appendChild(dateLabel);

  // Appointment booking form
  var bookTitle = document.createElement("h2");
  bookTitle.textContent = "Book appointment";
  card.appendChild(bookTitle);

  var dateInput = document.createElement("input");
  dateInput.type = "datetime-local";
  dateInput.style.fontSize = "17px";
  dateInput.style.padding = "10px";
  dateInput.style.borderRadius = "8px";
  dateInput.style.border = "1px solid #d8e0e6";
  dateInput.style.width = "100%";
  card.appendChild(dateInput);

  var error = document.createElement("p");
  error.className = "error";
  card.appendChild(error);

  var actions = document.createElement("div");
  actions.className = "actions";

  var bookBtn = document.createElement("button");
  bookBtn.textContent = "Book";
  bookBtn.onclick = function () {
    if (!dateInput.value) { error.textContent = "Pick a date and time first."; return; }
    error.textContent = "";
    fetch(API + "/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token() },
      body: JSON.stringify({ patientId: a.patient_id, alertId: a.alert_id, scheduledFor: new Date(dateInput.value).toISOString() })
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (d.error) { error.textContent = d.error; return; }
      error.style.color = "#0f6b5c";
      error.textContent = "Appointment booked. SMS reminder queued.";
      bookBtn.disabled = true;
    }).catch(function () { error.textContent = "Cannot reach the backend."; });
  };

  var backBtn = document.createElement("button");
  backBtn.className = "secondary";
  backBtn.textContent = "Back to list";
  backBtn.onclick = function () {
    detailBox.style.display = "none";
    listBox.style.display = "";
    loadAlerts();
  };

  actions.appendChild(bookBtn);
  actions.appendChild(backBtn);
  card.appendChild(actions);
  detailBox.appendChild(card);
}

function loadAlerts() {
  fetch(API + "/alerts", { headers: { Authorization: "Bearer " + token() } })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (Array.isArray(data)) renderList(data);
      else say(document.getElementById("alert-list"), data.error || "Error loading alerts.", true);
    })
    .catch(function () { say(document.getElementById("alert-list"), "Cannot reach the backend. Run npm start in backend first.", true); });
}

window.onload = loadAlerts;
