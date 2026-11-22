var API = "";
function rw() { return typeof window.getShellLanguage === "function" && window.getShellLanguage() === "rw"; }
function token() { return sessionStorage.getItem("ehumure_token") || ""; }
function authHeaders(json) { var h = { Authorization: "Bearer " + token() }; if (json) h["Content-Type"] = "application/json"; return h; }
function say(box, message, isError) { box.innerHTML = ""; var p = document.createElement("p"); p.className = isError ? "error" : "note"; p.textContent = message; box.appendChild(p); }
function badge(riskLevel, item9Flag) { var isRw=rw(), labels={low:isRw?"BIKE":"LOW",moderate:isRw?"BIRINGANIYE":"MODERATE",high:isRw?"BYINSHI":"HIGH"}; return { label: item9Flag ? (isRw?"BYIHUTIRWA":"EMERGENCY") : (labels[riskLevel]||labels.low), cls: item9Flag ? "result-high" : "result-" + riskLevel }; }

function claimAlert(alert, button) {
  button.disabled = true;
  fetch(API + "/alerts/" + encodeURIComponent(alert.alert_id) + "/assign", { method: "POST", headers: authHeaders(true), body: "{}" })
    .then(function (response) { return response.json().then(function (data) { return { ok: response.ok, data: data }; }); })
    .then(function (out) { if (!out.ok) { say(document.getElementById("alert-list"), out.data.error || "This alert could not be assigned.", true); return; } loadAlerts(); })
    .catch(function () { say(document.getElementById("alert-list"), navigator.onLine ? "Could not assign the alert. Try again." : "You are offline. The alert was not assigned.", true); })
    .finally(function () { button.disabled = false; });
}

/* Both mental-health roles may take an unheld alert: a psychiatric nurse at
   their own facility, a clinical psychologist anywhere in their district. */
function canClaim() {
  return ["psychiatric_nurse", "clinical_psychologist"].indexOf(sessionStorage.getItem("ehumure_role")) >= 0;
}

function escalateAlert(alert, button, statusBox) {
  // The nurse must say why the case is beyond them. The reason is stored on the
  // alert and written to the audit log, so it is not optional.
  var reason = window.prompt(rw()
    ? "Andika impamvu iki kibazo kirenze ubushobozi bwawe (inyuguti 10 kugeza 500):"
    : "Write why this case is beyond what you can handle (10 to 500 characters):", "");
  if (reason === null) return;
  reason = String(reason).trim();
  if (reason.length < 10 || reason.length > 500) {
    statusBox.textContent = rw()
      ? "Andika impamvu ngufi, inyuguti 10 kugeza 500."
      : "Write a short reason, from 10 to 500 characters.";
    statusBox.className = "status error";
    return;
  }
  button.disabled = true;
  statusBox.className = "status";
  statusBox.textContent = rw() ? "Kohereza ikibazo ku nzobere…" : "Referring the case to a clinical psychologist…";
  fetch(API + "/alerts/" + encodeURIComponent(alert.alert_id) + "/escalate", { method: "POST", headers: authHeaders(true), body: JSON.stringify({ reason: reason }) })
    .then(function (response) { return response.json().then(function (data) { return { ok: response.ok, data: data }; }); })
    .then(function (out) {
      if (!out.ok) {
        // Show exactly what the server said, so a refusal such as the
        // first-visit rule explains itself instead of failing silently.
        statusBox.textContent = out.data.error || (rw() ? "Ntibyashobotse kohereza ikibazo ku nzobere." : "The alert could not be escalated.");
        statusBox.className = "status error";
        statusBox.scrollIntoView({ block: "nearest" });
        return;
      }
      if (out.data.warning) {
        statusBox.textContent = rw()
          ? "Nta nzobere ihari muri aka karere. Ikibazo gifunguye kandi cyanditsweho ko ari IHUTIRWA. Menyesha umuyobozi w'ivuriro ako kanya."
          : out.data.warning;
        statusBox.className = "status error";
      } else {
        statusBox.textContent = rw()?"Ikibazo cyoherejwe ku nzobere yo ku rwego rw'akarere.":"The alert was sent to a clinical psychologist in this district.";
        statusBox.className = "status";
      }
      button.hidden=true;
      // Hide booking: an escalated case is no longer this nurse's to schedule.
      statusBox.parentNode.querySelectorAll('[data-action="book"]').forEach(function (item) { item.hidden = true; });
      loadAlerts();
    }).catch(function () { statusBox.textContent = rw()?"Ntibyashobotse kugera kuri seriveri.":"Could not reach the server."; statusBox.className="status error"; })
    .finally(function () { button.disabled = false; });
}

function renderList(alerts) {
  var box = document.getElementById("alert-list"); box.innerHTML = "";
  document.getElementById("alert-total").textContent = alerts.length;
  document.getElementById("assigned-total").textContent = alerts.filter(function (a) { return a.assigned_to_me; }).length;
  if (!alerts.length) { say(box, "No open alerts. New alerts will appear here.", false); return; }
  // URGENT first: emergencies (item 9), then the highest scores, then oldest.
  alerts.sort(function (a, b) {
    return Number(b.urgent) - Number(a.urgent)
      || Number(b.item9_flag) - Number(a.item9_flag)
      || Number(b.total_score || 0) - Number(a.total_score || 0)
      || new Date(a.screened_at) - new Date(b.screened_at);
  });
  alerts.forEach(function (a) {
    var labels = badge(a.risk_level, a.item9_flag);
    var card = document.createElement("article"); card.className = "list-card " + (a.item9_flag ? "alert-emergency" : "alert-" + a.risk_level);
    var title = document.createElement("h2"); title.textContent = (a.urgent ? (rw()?"IHUTIRWA · ":"URGENT · ") : "") + labels.label + " — " + (rw()?"Umurwayi ":"Patient ") + a.patient_id; card.appendChild(title);
    if (a.escalation_reason) {
      var why = document.createElement("p"); why.className = "note";
      why.textContent = (rw()?"Yoherejwe na ":"Escalated by ") + (a.escalated_by_name || (rw()?"umuforomo":"a psychiatric nurse")) + ": " + a.escalation_reason;
      card.appendChild(why);
    }
    var meta = document.createElement("p"); meta.className = "note";
    var sev={minimal:rw()?"Bike cyane":"Minimal",mild:rw()?"Byoroheje":"Mild",moderate:rw()?"Biringaniye":"Moderate",moderately_severe:rw()?"Bikabije ku rugero ruringaniye":"Moderately severe",severe:rw()?"Bikabije":"Severe"};
    meta.textContent = (rw()?"Ivuriro: ":"Clinic: ") + a.facility_name + " · " + a.sector + " · PHQ-9 " + (sev[a.severity]||a.severity) + " (" + a.total_score + "/27) · " + new Date(a.screened_at).toLocaleDateString(rw()?"rw-RW":"en-RW"); card.appendChild(meta);
    // Anything in this list that is not already mine is unheld, so both a
    // psychiatric nurse and a clinical psychologist can claim it.
    if (!a.assigned_to_me && canClaim()) {
      var assign = document.createElement("button"); assign.type = "button"; assign.className = "secondary"; assign.textContent = rw()?"Mpa iyi nteguza":"Assign to me";
      assign.onclick = function () { claimAlert(a, assign); }; card.appendChild(assign);
    }
    var open = document.createElement("button"); open.type = "button"; open.className = "secondary"; open.textContent = rw()?"Reba integuza":"Review alert"; open.onclick = function () { renderDetail(a); }; card.appendChild(open);
    box.appendChild(card);
  });
}

function renderDetail(a) {
  var list = document.getElementById("alert-list"), detail = document.getElementById("alert-detail");
  list.hidden = true; detail.hidden = false; detail.innerHTML = "";
  var labels = badge(a.risk_level, a.item9_flag), card = document.createElement("section"); card.className = "card " + labels.cls;
  var title = document.createElement("h2"); title.textContent = labels.label + " — " + (rw()?"Umurwayi ":"Patient ") + a.patient_id; card.appendChild(title);
  var facility = document.createElement("p"); facility.textContent = (rw()?"Ivuriro cyangwa ibitaro: ":"Clinic or hospital: ") + a.facility_name + (a.sector ? (rw()?" · Umurenge ":" · Sector ") + a.sector : ""); card.appendChild(facility);
  var severityNames={minimal:rw()?"Bike cyane":"Minimal",mild:rw()?"Byoroheje":"Mild",moderate:rw()?"Biringaniye":"Moderate",moderately_severe:rw()?"Bikabije ku rugero ruringaniye":"Moderately severe",severe:rw()?"Bikabije":"Severe"};
  var severity = document.createElement("p"); severity.textContent = (rw()?"Urwego rwa PHQ-9: ":"PHQ-9 severity: ") + (severityNames[a.severity]||a.severity) + " · " + (rw()?"Amanota ":"Score ") + a.total_score+"/27"; card.appendChild(severity);
  var phone = document.createElement("p"); phone.textContent = (rw()?"Telefone y'umurwayi: ":"Patient phone: ") + a.phone; card.appendChild(phone);
  var screened = document.createElement("p"); screened.className = "note"; screened.textContent = (rw()?"Yasuzumwe: ":"Screened: ") + new Date(a.screened_at).toLocaleString(rw()?"rw-RW":"en-RW"); card.appendChild(screened);
  if (a.last_attended_at) { var priorVisit = document.createElement("p"); priorVisit.className = "note"; priorVisit.textContent = (rw()?"Gahunda iheruka yitabiriwe: ":"Last attended appointment: ") + new Date(a.last_attended_at).toLocaleString(rw()?"rw-RW":"en-RW"); card.appendChild(priorVisit); }
  if (a.escalation_reason) {
    var escalatedBox = document.createElement("p");
    escalatedBox.textContent = (rw()?"Impamvu yo kohereza ku nzobere (":"Reason for escalation (") + (a.escalated_by_name || (rw()?"umuforomo w'indwara zo mu mutwe":"psychiatric nurse")) + "): " + a.escalation_reason;
    card.appendChild(escalatedBox);
  }
  if (a.item9_flag) { var emergency = document.createElement("div"); emergency.className = "emergency"; emergency.textContent = rw()?"⚠ BYIHUTIRWA: kurikiza intambwe zo kohereza umurwayi zihutirwa zo ku ivuriro kandi ubimenyeshe itsinda ryita ku barwayi.":"⚠ EMERGENCY: follow the facility's immediate referral steps and contact the responsible care team."; card.appendChild(emergency); }
  if (!a.assigned_to_me && canClaim()) { var claim = document.createElement("button"); claim.type = "button"; claim.textContent = rw()?"Mpa iyi nteguza":"Assign to me"; claim.onclick = function () { claimAlert(a, claim); }; card.appendChild(claim); }
  var heading = document.createElement("h2"); heading.textContent = rw()?"Teganya gahunda":"Book appointment"; card.appendChild(heading);
  var label = document.createElement("label"); label.htmlFor = "appointment-time"; label.textContent = rw()?"Itariki n'isaha bya gahunda":"Appointment date and time"; card.appendChild(label);
  var date = document.createElement("input"); date.id = "appointment-time"; date.type = "datetime-local"; date.required = true; card.appendChild(date);
  var error = document.createElement("p"); error.className = "status"; error.setAttribute("aria-live", "polite"); card.appendChild(error);
  // Escalation is only possible once the nurse has seen the patient, urgent
  // and emergency cases included. Before that first attended visit no button
  // is drawn at all, so the nurse is never offered an action the server will
  // refuse; a visible warning explains what to do instead.
  if (sessionStorage.getItem("ehumure_role") === "psychiatric_nurse" && !a.requires_specialist) {
    if (a.last_attended_at) {
      var escalate = document.createElement("button"); escalate.type = "button"; escalate.className = "secondary";
      escalate.textContent = a.urgent
        ? (rw() ? "Kohereza ikibazo cyihutirwa ku nzobere" : "Urgent specialist referral")
        : (rw() ? "Kohereza ikibazo ku nzobere" : "Refer to a specialist");
      escalate.onclick = function () { escalateAlert(a, escalate, error); };
      card.appendChild(escalate);
    } else {
      var waitForVisit = document.createElement("p");
      waitForVisit.className = "case-transferred";
      waitForVisit.textContent = rw()
        ? "Ntushobora kohereza iki kibazo ku nzobere mbere y'uko umurwayi aza bwa mbere. Banza uteganye gahunda, wandike ko yayitabiriye."
        : "You can't escalate this case before the first visit. Book the appointment and mark it attended first.";
      card.appendChild(waitForVisit);
    }
  }
  var actions = document.createElement("div"); actions.className = "actions";
  // Only a clinical psychologist closes a case.
  if (sessionStorage.getItem("ehumure_role") === "clinical_psychologist") {
    var handled = document.createElement("button"); handled.type = "button"; handled.className = "secondary";
    handled.textContent = rw()?"Shyira ku byarangiye":"Mark as handled";
    handled.onclick = function () {
      handled.disabled = true; error.className = "status"; error.textContent = rw()?"Gufunga ikibazo\u2026":"Closing the case\u2026";
      fetch(API + "/alerts/" + encodeURIComponent(a.alert_id) + "/handled", { method: "POST", headers: authHeaders(true), body: "{}" })
        .then(function (response) { return response.json().then(function (data) { return { ok: response.ok, data: data }; }); })
        .then(function (out) {
          if (!out.ok) { error.textContent = out.data.error || (rw()?"Ntibyashobotse gufunga ikibazo.":"The case could not be closed."); error.className = "status error"; return; }
          error.textContent = rw()?"Ikibazo cyafunzwe.":"Case marked as handled."; error.className = "status";
          detail.hidden = true; list.hidden = false; loadAlerts();
        })
        .catch(function () { error.textContent = rw()?"Ntibyashobotse kugera kuri seriveri.":"Could not reach the server."; error.className = "status error"; })
        .finally(function () { handled.disabled = false; });
    };
    actions.appendChild(handled);
  }
  var book = document.createElement("button"); book.type = "button"; book.dataset.action = "book"; book.textContent = rw()?"Teganya gahunda":"Book appointment";
  book.onclick = function () {
    if (!date.value) { error.textContent = rw()?"Hitamo itariki n'isaha.":"Choose a date and time."; error.className = "status error"; date.focus(); return; }
    if (new Date(date.value).getTime() <= Date.now()) { error.textContent = rw()?"Hitamo itariki n'isaha bizaza.":"Choose a future date and time."; error.className = "status error"; date.focus(); return; }
    book.disabled = true; error.textContent = rw()?"Kubika gahunda n'ubutumwa bwo kwibutsa…":"Saving appointment and reminder…";
    fetch(API + "/appointments", { method: "POST", headers: authHeaders(true), body: JSON.stringify({ patientId: a.patient_id, alertId: a.alert_id, scheduledFor: new Date(date.value).toISOString() }) })
      .then(function (response) { return response.json().then(function (data) { return { ok: response.ok, data: data }; }); })
      .then(function (out) { if (!out.ok) { error.textContent = out.data.error || (rw()?"Gahunda ntiyabitswe.":"Appointment was not saved."); error.className = "status error"; return; } error.textContent = rw()?"Gahunda yabitswe. Ubutumwa butatu bwo kwibutsa (umurwayi x2, nawe) buri muri sisitemu yo kugerageza; nta butumwa nyabwo bwoherejwe.":"Appointment saved. Three reminders queued in the SMS simulator: confirmation to the patient, a reminder to the patient the day before, and a reminder to you the day before. No real SMS has been sent."; error.className = "status"; loadAppointments(); loadAlerts(); })
      .catch(function () { error.textContent = navigator.onLine ? (rw()?"Ntibyashobotse kubika gahunda. Reba seriveri wongere ugerageze.":"Could not save the appointment. Check the server and try again.") : (rw()?"Nta murongo. Gahunda ntiyabitswe.":"You are offline. The appointment was not saved."); error.className = "status error"; })
      .finally(function () { book.disabled = false; });
  };
  var back = document.createElement("button"); back.type = "button"; back.className = "secondary"; back.textContent = rw()?"Subira ku nteguza":"Back to alerts"; back.onclick = function () { detail.hidden = true; list.hidden = false; };
  actions.appendChild(book); actions.appendChild(back); card.appendChild(actions); detail.appendChild(card);
}

function loadAlerts(patientId) {
  var box = document.getElementById("alert-list"); box.textContent = "Loading alerts…";
  var url = API + "/alerts" + (patientId ? "?patientId=" + encodeURIComponent(patientId) : "");
  fetch(url, { headers: authHeaders(false) }).then(function (response) { return response.json().then(function (data) { return { ok: response.ok, data: data }; }); })
    .then(function (out) { if (Array.isArray(out.data)) renderList(out.data); else { document.getElementById("alert-total").textContent = "—"; document.getElementById("assigned-total").textContent = "—"; say(box, out.data.error || "Alerts could not be loaded.", true); } })
    .catch(function () { say(box, navigator.onLine ? "Could not load alerts. Check the server and try again." : "You are offline. Alerts are unavailable until you reconnect.", true); });
}

window.loadAlerts = loadAlerts;
window.onload = function () {
  loadAlerts();
};
document.addEventListener("ehumure:language", function () { loadAlerts(); if (typeof window.loadAppointments === "function") window.loadAppointments(); });

