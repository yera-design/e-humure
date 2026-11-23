var NURSE_API = "";

function nurseToken() { return sessionStorage.getItem("ehumure_token") || ""; }
function nurseHeaders(json) {
  var headers = { Authorization: "Bearer " + nurseToken() };
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}
function statusMessage(id, message, isError) {
  var box = document.getElementById(id);
  box.hidden = false;
  box.textContent = message || "";
  box.className = isError ? "status error" : "status";
}
function showNurseView(view) {
  document.getElementById("nurse-dashboard").hidden = view !== "dashboard";
  document.getElementById("registration-panel").hidden = view !== "registration";
  document.getElementById("screening-flow").hidden = view !== "screening";
  if (view === "dashboard") document.getElementById("patient-code").value = "";
  window.scrollTo({ top: 0, behavior: "smooth" });
}
/* "Start a new screening" on the result screen: a new screening is for a new
   patient, so it opens an empty registration form instead of jumping straight
   to the questions for the patient just screened. */
function resetRegistrationForm() {
  ["reg-age", "reg-sector", "reg-phone", "reg-condition-other"].forEach(function (id) { document.getElementById(id).value = ""; });
  document.getElementById("reg-condition").selectedIndex = 0;
  document.getElementById("reg-condition-other").hidden = true;
  document.getElementById("reg-phone-error").textContent = "";
  document.getElementById("reg-phone").classList.remove("field-invalid");
  document.getElementById("reg-phone").removeAttribute("aria-invalid");
  var message = document.getElementById("reg-message"); message.textContent = ""; message.className = "status";
  document.getElementById("code-wrap").hidden = true;
  document.getElementById("patient-code-display").textContent = "";
}
// As soon as the nurse starts changing the number, the duplicate warning goes.
document.getElementById("reg-phone").addEventListener("input", function () {
  if (!this.classList.contains("field-invalid")) return;
  this.classList.remove("field-invalid");
  this.removeAttribute("aria-invalid");
  document.getElementById("reg-phone-error").textContent = "";
  var message = document.getElementById("reg-message"); message.textContent = ""; message.className = "status";
});
window.nurseStartNewPatient = function () {
  document.getElementById("patient-code").value = "";
  resetRegistrationForm();
  showNurseView("registration");
  loadPendingScreenings(); loadCompletedScreenings();
  document.getElementById("reg-age").focus();
};
window.nurseBackToDashboard = function () { showNurseView("dashboard"); loadPendingScreenings(); loadCompletedScreenings(); };
function updateScreen() {
  document.getElementById("screening-flow").hidden = !document.getElementById("patient-code").value.trim();
}
function signOutNurse() {
  ["ehumure_token", "ehumure_role", "ehumure_name", "ehumure_facility_id"].forEach(function (key) { sessionStorage.removeItem(key); });
  location.href = "welcome.html";
}

function registerPatient() {
  var age = document.getElementById("reg-age").value.trim();
  var condition = document.getElementById("reg-condition").value;
  var otherCondition = document.getElementById("reg-condition-other").value.trim();
  var sector = document.getElementById("reg-sector").value.trim();
  var phone = document.getElementById("reg-phone").value.trim();
  var phoneError = document.getElementById("reg-phone-error");
  phoneError.textContent = "";
  if (!age || !sector || !phone) return statusMessage("reg-message", "Complete age, condition, sector and phone number.", true);
  if (condition === "other" && (otherCondition.length < 2 || otherCondition.length > 120)) return statusMessage("reg-message", "Specify the other condition (2 to 120 characters).", true);
  if (!Number.isInteger(Number(age)) || Number(age) < 18 || Number(age) > 120) {
    document.getElementById("reg-age").focus();
    return statusMessage("reg-message", "Enter an age from 18 to 120.", true);
  }
  if (!/^[0-9]{10}$/.test(phone)) {
    phoneError.textContent = phone.length !== 10 ? "Enter exactly 10 digits, with no spaces or +250." : "Use digits only.";
    document.getElementById("reg-phone").focus();
    return;
  }
  if (!/^(072|073|078|079)[0-9]{7}$/.test(phone)) {
    phoneError.textContent = "Start with a Rwanda mobile prefix: 072, 073, 078 or 079.";
    document.getElementById("reg-phone").focus();
    return;
  }
  if (/^(.)\1{9}$/.test(phone)) {
    phoneError.textContent = "Enter a valid mobile number, not the same digit repeated.";
    document.getElementById("reg-phone").focus();
    return;
  }

  statusMessage("reg-message", "Saving patient record…", false);
  fetch(NURSE_API + "/patients", {
    method: "POST", headers: nurseHeaders(true),
    body: JSON.stringify({ age: Number(age), condition: condition, conditionOther: condition === "other" ? otherCondition : "", sector: sector, phone: phone })
  }).then(function (res) {
    return res.json().then(function (data) { return { ok: res.ok, data: data }; });
  }).then(function (out) {
    if (!out.ok) {
      if (out.data.code === "duplicate_phone") {
        // Blocked: this number already belongs to another patient. No record
        // was saved and nothing about the other patient is shown.
        // Shown on the page itself (not a browser popup), in the nurse's
        // chosen language, next to the field that needs changing.
        var phoneInput = document.getElementById("reg-phone");
        phoneError.textContent = "This phone number is already registered. Use the patient's own number.";
        phoneInput.classList.add("field-invalid");
        phoneInput.setAttribute("aria-invalid", "true");
        phoneInput.focus();
        phoneInput.select();
      }
      return statusMessage("reg-message", out.data.error || "Patient could not be registered.", true);
    }
    choosePatient(out.data.patientId);
    document.getElementById("patient-code-display").textContent = out.data.patientId;
    document.getElementById("code-wrap").hidden = false;
    statusMessage("reg-message", "Patient registered. Ask for consent before screening.", false);
    loadPendingScreenings();
    updateScreen();
  }).catch(function () {
    statusMessage("reg-message", navigator.onLine ? "The server could not complete registration. Check the server and try again." : "You're offline. Reconnect before registering; no record was saved.", true);
  });
}

function choosePatient(patientId) {
  document.getElementById("patient-code").value = patientId;
  showNurseView("screening");
  if (typeof startOver === "function") startOver();
  else if (typeof render === "function") { state.step = "consent"; state.saved = ""; render(); }
}

function searchPatient() {
  var id = document.getElementById("patient-search").value.trim().toUpperCase();
  if (!/^(P[0-9]{3,}|P-[0-9]{4,})$/.test(id)) return statusMessage("patient-search-message", "Enter a patient code such as P001.", true);
  statusMessage("patient-search-message", "Searching this facility…", false);
  fetch(NURSE_API + "/patients/search?patientId=" + encodeURIComponent(id), { headers: nurseHeaders(false) })
    .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
    .then(function (out) {
      if (!out.ok) return statusMessage("patient-search-message", out.data.error || "Patient not found in this facility.", true);
      return Promise.all([
        Promise.resolve(out.data),
        fetch(NURSE_API + "/screening-drafts?patientId=" + encodeURIComponent(id), { headers: nurseHeaders(false) }).then(function (res) { return res.json(); }),
        fetch(NURSE_API + "/screenings?patientId=" + encodeURIComponent(id), { headers: nurseHeaders(false) }).then(function (res) { return res.json(); })
      ]);
    }).then(function (parts) {
      if (!parts) return;
      if (parts[1].error || parts[2].error) return statusMessage("patient-search-message", parts[1].error || parts[2].error, true);
      renderPatientSearchResult(parts[0], parts[1], parts[2]);
    }).catch(function () {
      statusMessage("patient-search-message", navigator.onLine ? "Search failed. Check the server and try again." : "You're offline. Reconnect to search saved records.", true);
    });
}

function renderPatientSearchResult(patient, drafts, screenings) {
  var box = document.getElementById("patient-search-message");
  box.hidden = false; box.className = "status search-results"; box.innerHTML = "";
  var heading = document.createElement("h3"); heading.textContent = "Patient " + patient.patientId; box.appendChild(heading);
  var demographics = document.createElement("p"); demographics.className = "muted";
  demographics.textContent = "Age " + patient.age + " · " + String(patient.condition || "").replace(/_/g, " ") + " · " + (patient.sector || "Sector not recorded"); box.appendChild(demographics);
  if (drafts.length) {
    var pending = document.createElement("p"); pending.className = "status"; pending.textContent = "An unfinished screening is saved. Resume it to continue at the last unanswered question."; box.appendChild(pending);
    renderResumeButton(drafts[0], box);
  }
  if (screenings.length) {
    var historyTitle = document.createElement("h3"); historyTitle.textContent = "Previous screening results"; box.appendChild(historyTitle);
    screenings.forEach(function (record) {
      var row = document.createElement("article"); row.className = "screening-result-row";
      var stage = record.stage === "quick" ? "Quick screening · Low" : "PHQ-9 · " + (record.severity || "Completed") + " · " + record.total_score + "/27";
      var result = document.createElement("strong"); result.textContent = stage; row.appendChild(result);
      if (record.item9_flag) { var emergency = document.createElement("span"); emergency.className = "pill result-emergency"; emergency.textContent = "EMERGENCY · Item 9 flagged"; row.appendChild(emergency); }
      var date = document.createElement("span"); date.className = "muted small"; date.textContent = new Date(record.screened_at).toLocaleString(); row.appendChild(date); box.appendChild(row);
    });
  } else {
    var empty = document.createElement("p"); empty.className = "muted"; empty.textContent = "No completed screenings are recorded for this patient yet."; box.appendChild(empty);
  }
  var begin = document.createElement("button"); begin.type = "button"; begin.className = "search-start-button"; begin.textContent = "Start a new screening";
  begin.onclick = function () { choosePatient(patient.patientId); };
  box.appendChild(begin);
}

function renderResumeButton(draft, boxId) {
  var box = typeof boxId === "string" ? document.getElementById(boxId) : boxId;
  var button = document.createElement("button");
  button.type = "button";
  button.className = "secondary";
  button.textContent = "Resume screening";
  button.onclick = function () {
    choosePatient(draft.patientId);
    resumeDraft(draft);
    document.getElementById("screening-flow").scrollIntoView({ behavior: "smooth", block: "start" });
  };
  box.appendChild(button);
}

function loadPendingScreenings() {
  var box = document.getElementById("pending-list");
  box.textContent = "Loading pending screenings…";
  fetch(NURSE_API + "/screening-drafts", { headers: nurseHeaders(false), cache: "no-store" })

    .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
    .then(function (out) {
      var count = document.getElementById("pending-total");
      if (!out.ok) { box.textContent = out.data.error || "Could not load pending screenings."; count.textContent = "Unavailable"; return; }
      count.textContent = String(out.data.length);
      if (!out.data.length) { box.textContent = "No pending screenings. Started screenings appear here until completed."; return; }
      box.innerHTML = "";
      out.data.forEach(function (draft) {
        var card = document.createElement("article"); card.className = "list-card";
        var title = document.createElement("h3"); title.textContent = "Patient " + draft.patientId;
        var detail = document.createElement("p"); detail.className = "muted";
        var total = draft.stage === "quick" ? 2 : 9;
        detail.textContent = (draft.stage === "quick" ? "Quick questions" : "PHQ-9") + " · Question " + (draft.questionIndex + 1) + " of " + total + " · Updated " + new Date(draft.updatedAt).toLocaleString();
        card.appendChild(title); card.appendChild(detail); renderResumeButton(draft, card); box.appendChild(card);
      });
    }).catch(function () { box.textContent = navigator.onLine ? "Could not load pending screenings. Check the server." : "Offline: pending records need a connection to load."; });
}

function loadCompletedScreenings() {
  var box = document.getElementById("screening-list"), count = document.getElementById("screening-total");
  box.textContent = "Loading completed screenings…";
  fetch(NURSE_API + "/screenings", { headers: nurseHeaders(false) })
    .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
    .then(function (out) {
      if (!out.ok) { box.textContent = out.data.error || "Could not load completed screenings."; count.textContent = "Unavailable"; return; }
      count.textContent = String(out.data.length);
      if (!out.data.length) { box.textContent = "No completed screenings yet."; return; }
      box.innerHTML = "";
      out.data.forEach(function (screening) {
        var card = document.createElement("article"); card.className = "list-card";
        var title = document.createElement("h3"); title.textContent = "Patient " + screening.patient_id;
        var detail = document.createElement("p"); detail.className = "muted";
        detail.textContent = screening.stage === "quick" ? "Quick screen · Low" : "PHQ-9 · " + (screening.severity || "Completed") + " · " + screening.total_score + "/27";
        var date = document.createElement("p"); date.className = "small muted"; date.textContent = new Date(screening.screened_at).toLocaleString();
        card.appendChild(title); card.appendChild(detail);
        if (screening.item9_flag) { var emergency = document.createElement("span"); emergency.className = "pill result-emergency"; emergency.textContent = "EMERGENCY · Item 9 flagged"; card.appendChild(emergency); }
        card.appendChild(date); box.appendChild(card);
      });
    }).catch(function () { box.textContent = navigator.onLine ? "Could not load completed screenings." : "Offline: completed records need a connection to load."; count.textContent = "Unavailable"; });
}

document.getElementById("reg-save").addEventListener("click", registerPatient);
document.getElementById("open-registration").addEventListener("click", function () { resetRegistrationForm(); showNurseView("registration"); });
document.getElementById("back-to-dashboard-from-registration").addEventListener("click", function () { showNurseView("dashboard"); });
document.getElementById("back-to-dashboard-from-screening").addEventListener("click", function () { window.nurseBackToDashboard(); });
document.getElementById("reg-condition").addEventListener("change", function () {
  var field=document.getElementById("reg-condition-other");
  field.hidden=this.value!=="other";
  field.required=this.value==="other";
  if(field.hidden)field.value="";
});
document.getElementById("patient-search-button").addEventListener("click", searchPatient);
document.getElementById("patient-search").addEventListener("keydown", function (event) { if (event.key === "Enter") searchPatient(); });
document.getElementById("copy-code").addEventListener("click", function () {
  var code = document.getElementById("patient-code-display").textContent;
  if (!navigator.clipboard) return statusMessage("reg-message", "Copy is unavailable in this browser. Select the code to copy it.", true);
  navigator.clipboard.writeText(code).then(function () { statusMessage("reg-message", "Patient code copied.", false); }).catch(function () { statusMessage("reg-message", "Copy failed. Select the code and copy it.", true); });
});
document.getElementById("signout").addEventListener("click", signOutNurse);
document.getElementById("pending-refresh").addEventListener("click", loadPendingScreenings);
document.getElementById("scr-refresh").addEventListener("click", loadCompletedScreenings);
document.addEventListener("ehumure:language", function () { loadPendingScreenings(); loadCompletedScreenings(); });
document.addEventListener("DOMContentLoaded", function () {
  var name = sessionStorage.getItem("ehumure_name"), role = sessionStorage.getItem("ehumure_role");
  if (!name || role !== "ncd_nurse") { location.href = "login.html"; return; }
  document.getElementById("welcome").textContent = name;
  loadPendingScreenings();
  loadCompletedScreenings();
});
window.addEventListener("online", function () { document.querySelector("[data-offline]").classList.remove("visible"); });
window.addEventListener("offline", function () { document.querySelector("[data-offline]").classList.add("visible"); });

