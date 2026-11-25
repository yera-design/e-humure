(function () {
  function rw() { return typeof window.getShellLanguage === "function" && window.getShellLanguage() === "rw"; }
  function role() { return sessionStorage.getItem("ehumure_role"); }
  function headers(json) { var h = { Authorization: "Bearer " + (sessionStorage.getItem("ehumure_token") || "") }; if (json) h["Content-Type"] = "application/json"; return h; }
  function text(en, rwText) { return rw() ? rwText : en; }
  function showStatus(box, message, error) { box.textContent = message; box.className = error ? "status error" : "status"; }
  function request(method, url, body) {
    return fetch(url, { method: method, headers: headers(!!body), body: body ? JSON.stringify(body) : undefined })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); });
  }
  function activeSearch() { return document.getElementById("mental-health-patient-code").value.trim().toUpperCase(); }
  function withPatientSearch(url, patientId) { return patientId ? url + "?patientId=" + encodeURIComponent(patientId) : url; }
  function localDateTime(value) {
    var date = new Date(value); date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
  }
  function addButton(parent, label, secondary, callback) {
    var b = document.createElement("button"); b.type = "button"; b.textContent = label;
    if (secondary) b.className = "secondary";
    b.addEventListener("click", function () { callback(b); }); parent.appendChild(b); return b;
  }
  function updateOutcome(item, outcome, button) {
    button.disabled = true;
    request("PATCH", "/appointments/" + encodeURIComponent(item.appointment_id) + "/outcome", { outcome: outcome })
      .then(function (out) { if (!out.ok) throw new Error(out.data.error || "Appointment status could not be saved."); loadAppointments(activeSearch()); if (window.loadAlerts) window.loadAlerts(activeSearch()); })
      .catch(function (error) { var message = document.getElementById("appointment-action-message"); if (message) showStatus(message, error.message, true); })
      .finally(function () { button.disabled = false; });
  }
  function closeCase(item, button, actionMessage) {
    window.askReason(button, {
      label: text("Is the patient well? Write a short reason for closing the case (10 to 500 characters):", "Umurwayi yorohewe? Andika impamvu ngufi yo gufunga ikibazo (inyuguti 10 kugeza kuri 500):"),
      placeholder: text("For example: Symptoms resolved after 3 visits.", "Urugero: Ibimenyetso byashize nyuma y'isura 3."),
      confirm: text("Close the case", "Funga ikibazo"),
      working: text("Closing the case…", "Gufunga ikibazo…")
    }, function (reason, done) {
      request("POST", "/alerts/" + encodeURIComponent(item.alert_id) + "/handled", { reason: reason })
        .then(function (out) {
          if (!out.ok) { done(out.data.error || text("The case could not be closed.", "Ntibyashobotse gufunga ikibazo.")); return; }
          done(); showStatus(actionMessage, text("Case closed.", "Ikibazo cyafunzwe."), false);
          loadAppointments(activeSearch()); if (window.loadAlerts) window.loadAlerts(activeSearch());
        })
        .catch(function () { done(text("Could not reach the server.", "Ntibyashobotse kugera kuri seriveri.")); });
    });
  }
  function renderNotes(item, parent) {
    parent.querySelectorAll(".appointment-notes").forEach(function (old) { old.remove(); });
    var section = document.createElement("section"); section.className = "appointment-notes";
    var title = document.createElement("h3"); title.textContent = text("Visit note", "Inyandiko y'isura"); section.appendChild(title);
    var list = document.createElement("div"); list.className = "appointment-note-list"; section.appendChild(list);
    var feedback = document.createElement("p"); feedback.className = "status"; feedback.hidden = true; feedback.setAttribute("role", "status"); feedback.setAttribute("aria-live", "polite"); section.appendChild(feedback);
    var ownNote = null, editingNoteId = null;
    var editor = document.createElement("div"); editor.className = "visit-note-editor"; editor.hidden = true;
    var label = document.createElement("label"); label.textContent = text("Write what happened with this case", "Andika uko iki kibazo cyagenze"); label.htmlFor = "visit-note-" + item.appointment_id; editor.appendChild(label);
    var input = document.createElement("textarea"); input.id = label.htmlFor; input.rows = 3; input.maxLength = 1000; editor.appendChild(input);
    var msg = document.createElement("p"); msg.className = "status"; msg.setAttribute("aria-live", "polite"); editor.appendChild(msg);
    var save = addButton(editor, text("Save note", "Bika inyandiko"), false, function () {
      var note = input.value.trim();
      if (note.length < 3) { showStatus(msg, text("Write a short note first.", "Banza wandike inyandiko ngufi."), true); input.focus(); return; }
      save.disabled = true; showStatus(msg, text("Saving note…", "Kubika inyandiko…"), false);
      var url = "/alerts/" + encodeURIComponent(item.alert_id) + (editingNoteId ? "/notes/" + encodeURIComponent(editingNoteId) : "/note");
      request(editingNoteId ? "PATCH" : "POST", url, { note: note })
        .then(function (out) {
          if (!out.ok) throw new Error(out.data.error || "The note was not saved.");
          editingNoteId = null; input.value = ""; editor.hidden = true; editorToggle.setAttribute("aria-expanded", "false");
          feedback.hidden = false; showStatus(feedback, text("Visit note saved.", "Inyandiko y'isura yabitswe."), false); loadNotes();
        })
        .catch(function (error) { editor.hidden = false; editorToggle.setAttribute("aria-expanded", "true"); showStatus(msg, error.message, true); })
        .finally(function () { save.disabled = false; });
    });
    editor.appendChild(save);
    var editorToggle = addButton(section, text("Add visit note", "Ongeraho inyandiko y'isura"), true, function () {
      if (editor.hidden) {
        editingNoteId = ownNote ? ownNote.note_id : null;
        input.value = ownNote ? ownNote.note : "";
        save.textContent = ownNote ? text("Save changes", "Bika impinduka") : text("Save note", "Bika inyandiko");
        editor.hidden = false;
      } else {
        editor.hidden = true; editingNoteId = null; input.value = "";
      }
      editorToggle.setAttribute("aria-expanded", String(!editor.hidden));
      if (!editor.hidden) input.focus();
    });
    editorToggle.setAttribute("aria-expanded", "false"); section.appendChild(editor);
    function loadNotes() {
      list.textContent = text("Loading notes…", "Gukurura inyandiko…");
      request("GET", "/alerts/" + encodeURIComponent(item.alert_id) + "/notes")
        .then(function (out) {
          list.innerHTML = ""; ownNote = null;
          if (!out.ok || !Array.isArray(out.data)) { list.textContent = text("Notes could not be loaded.", "Ntibyashobotse kureba inyandiko."); return; }
          if (!out.data.length) { list.textContent = text("No visit notes yet.", "Nta nyandiko y'isura irahari."); editorToggle.textContent = text("Add visit note", "Ongeraho inyandiko y'isura"); return; }
          out.data.forEach(function (note) {
            var row = document.createElement("p"); row.className = "note";
            row.textContent = new Date(note.created_at).toLocaleString(rw() ? "rw-RW" : "en-RW") + " · " + note.full_name + ": " + note.note;
            list.appendChild(row);
          });
          ownNote = out.data.find(function (note) { return note.can_edit; }) || null;
          editorToggle.textContent = ownNote ? text("Edit my note", "Hindura inyandiko yanjye") : text("Add visit note", "Ongeraho inyandiko y'isura");
        }).catch(function () { list.textContent = text("Notes could not be loaded.", "Ntibyashobotse kureba inyandiko."); });
    }
    parent.appendChild(section); loadNotes();
  }
  function renderAppointment(item, box, upcomingByCase) {
    var card = document.createElement("article"); card.className = "list-card";
    var heading = document.createElement("h3"); heading.textContent = text("Patient ", "Umurwayi ") + item.patient_id; card.appendChild(heading);
    var site = document.createElement("p"); site.textContent = text("Facility: ", "Ivuriro: ") + (item.facility_name || item.location || "—") + (item.district ? " · " + item.district : ""); card.appendChild(site);
    var when = document.createElement("p"); when.textContent = new Date(item.scheduled_for).toLocaleString(rw() ? "rw-RW" : "en-RW"); card.appendChild(when);
    var statusNames = rw() ? { scheduled: "Biteganyijwe", attended: "Yitabiriye", missed: "Yasibye", cancelled: "Byahagaritswe" } : { scheduled: "Scheduled", attended: "Attended", missed: "Missed", cancelled: "Cancelled" };
    var status = document.createElement("p"); status.className = "note";
    status.textContent = text("Status: ", "Imiterere: ") + (statusNames[item.status] || item.status) + (item.arrived_at ? text(" · Attended ", " · Yitabiriye ") + new Date(item.arrived_at).toLocaleString(rw() ? "rw-RW" : "en-RW") : ""); card.appendChild(status);
    var phone = document.createElement("p"); phone.textContent = text("Phone: ", "Telefone: ") + item.phone; card.appendChild(phone);
    var actionMessage = document.createElement("p"); actionMessage.id = "appointment-action-message"; actionMessage.className = "status"; actionMessage.setAttribute("aria-live", "polite"); card.appendChild(actionMessage);
    if (item.alert_status === "closed") {
      var closedBox = document.createElement("div"); closedBox.className = "case-transferred";
      var closedTitle = document.createElement("strong"); closedTitle.textContent = text("CASE CLOSED", "IVURWA RYASOJWE"); closedBox.appendChild(closedTitle);
      if (item.closing_reason) { var closedText = document.createElement("p"); closedText.textContent = text("Reason: ", "Impamvu: ") + item.closing_reason; closedBox.appendChild(closedText); }
      card.appendChild(closedBox);
      if (item.status === "attended") renderNotes(item, card);
      box.appendChild(card); return;
    }
    if (role() === "psychiatric_nurse" && item.requires_specialist) {
      var transferred = document.createElement("div"); transferred.className = "case-transferred";
      var transferTitle = document.createElement("strong"); transferTitle.textContent = text("CASE TRANSFERRED · No longer assigned to you", "IKIBAZO CYOHEREJWE · Ntukigishinzwe"); transferred.appendChild(transferTitle);
      var transferText = document.createElement("p"); transferText.textContent = item.escalation_reason
        ? text("A clinical psychologist is responsible for follow-up. Reason: ", "Inzobere mu mitekerereze ni yo ikurikirana iki kibazo. Impamvu: ") + item.escalation_reason
        : text("A clinical psychologist is responsible for follow-up. No further action is needed from your queue.", "Inzobere mu mitekerereze ni yo ikurikirana iki kibazo. Nta yindi nshingano usigaranye kuri uru rutonde.");
      transferred.appendChild(transferText); card.appendChild(transferred); box.appendChild(card); return;
    }
    if (item.status === "scheduled") {
      var attended = addButton(card, text("Mark attended", "Shyira ko yitabiriye"), false, function () { updateOutcome(item, "attended", attended); });
      var missed = addButton(card, text("Mark missed", "Shyira ko yasibye"), true, function () { updateOutcome(item, "missed", missed); });
    }
    if (item.status === "scheduled" || item.status === "missed") {
      var dateLabel = document.createElement("label"); dateLabel.textContent = text("Reschedule for", "Hindura itariki ya gahunda"); dateLabel.htmlFor = "reschedule-" + item.appointment_id; card.appendChild(dateLabel);
      var date = document.createElement("input"); date.type = "datetime-local"; date.id = dateLabel.htmlFor; date.value = localDateTime(item.scheduled_for); card.appendChild(date);
      var reschedule = addButton(card, text("Save new time", "Bika isaha nshya"), true, function () {
        if (!date.value || new Date(date.value).getTime() <= Date.now()) { showStatus(actionMessage, text("Choose a future date and time.", "Hitamo itariki n'isaha bizaza."), true); return; }
        reschedule.disabled = true; showStatus(actionMessage, text("Rescheduling and updating simulated reminders…", "Guhindura gahunda n'ubutumwa bw'igerageza…"), false);
        request("PATCH", "/appointments/" + encodeURIComponent(item.appointment_id) + "/reschedule", { scheduledFor: new Date(date.value).toISOString() })
          .then(function (out) { if (!out.ok) throw new Error(out.data.error || "The appointment could not be rescheduled."); loadAppointments(activeSearch()); })
          .catch(function (error) { showStatus(actionMessage, error.message, true); })
          .finally(function () { reschedule.disabled = false; });
      });
    }
    if (item.status === "attended") {
      renderNotes(item, card);
      if (role() === "psychiatric_nurse" && !item.requires_specialist) {
        addButton(card, text("Escalate to clinical psychologist", "Ohereza ku nzobere mu mitekerereze"), true, function (button) {
          window.askReason(button, {
            label: text("Write why this case needs a psychologist (10 to 500 characters):", "Andika impamvu iki kibazo gikeneye inzobere (inyuguti 10 kugeza kuri 500):"),
            placeholder: text("For example: Patient's condition is beyond my ability.", "Urugero: Uyu murwayi ararembye akeneye ubuvuzi bwisumbuye."),
            confirm: text("Refer to the psychologist", "Ohereza ku nzobere"),
            working: text("Referring the case…", "Kohereza ikibazo…")
          }, function (reason, done) {
            request("POST", "/alerts/" + encodeURIComponent(item.alert_id) + "/escalate", { reason: reason })
              .then(function (out) {
                if (!out.ok) { done(out.data.error || text("The case could not be escalated.", "Ntibyashobotse kohereza ikibazo ku nzobere.")); return; }
                done(); showStatus(actionMessage, text("The case was referred to the district clinical psychologist.", "Ikibazo cyoherejwe ku nzobere mu mitekerereze yo ku rwego rw'akarere."), false);
                loadAppointments(activeSearch());
              })
              .catch(function () { done(text("Could not reach the server.", "Ntibyashobotse kugera kuri seriveri.")); });
          });
        });
      }
      var alreadyBooked = upcomingByCase && upcomingByCase[item.alert_id];
      if (alreadyBooked) {
        var nextNote = document.createElement("p"); nextNote.className = "note";
        nextNote.textContent = text("Next appointment already booked: ", "Gahunda ikurikira yamaze guteganywa: ") + new Date(alreadyBooked).toLocaleString(rw() ? "rw-RW" : "en-RW");
        card.appendChild(nextNote);
      }
      var followToggle = addButton(card, text("Book another appointment", "Teganya indi gahunda"), false, function () {
        bookingPanel.hidden = !bookingPanel.hidden;
        followToggle.setAttribute("aria-expanded", String(!bookingPanel.hidden));
        if (!bookingPanel.hidden) followDate.focus();
      });
      followToggle.setAttribute("aria-expanded", "false");
      if (alreadyBooked) followToggle.hidden = true;
      var bookingPanel = document.createElement("div"); bookingPanel.className = "follow-up-booking"; bookingPanel.hidden = true;
      var followLabel = document.createElement("label"); followLabel.textContent = text("Next appointment date and time", "Itariki n'isaha bya gahunda ikurikira"); followLabel.htmlFor = "follow-up-" + item.appointment_id; bookingPanel.appendChild(followLabel);
      var followDate = document.createElement("input"); followDate.type = "datetime-local"; followDate.id = followLabel.htmlFor; bookingPanel.appendChild(followDate);
      var follow = addButton(bookingPanel, text("Confirm appointment", "Emeza gahunda"), false, function () {
        if (!followDate.value || new Date(followDate.value).getTime() <= Date.now()) { showStatus(actionMessage, text("Choose a future date and time.", "Hitamo itariki n'isaha bizaza."), true); return; }
        follow.disabled = true;
        request("POST", "/appointments/" + encodeURIComponent(item.appointment_id) + "/follow-up", { scheduledFor: new Date(followDate.value).toISOString() })
          .then(function (out) { if (!out.ok) throw new Error(out.data.error || "The follow-up could not be booked."); showStatus(actionMessage, text("Appointment booked. A reminder has been queued.", "Gahunda yabitswe. Ubutumwa bwo kwibutsa bwateguwe."), false); loadAppointments(activeSearch()); })
          .catch(function (error) { showStatus(actionMessage, error.message, true); }).finally(function () { follow.disabled = false; });
      });
      card.appendChild(bookingPanel);
      // Closing: the psychiatric nurse closes cases she follows herself; an
      // escalated case is closed only by the clinical psychologist.
      if ((role() === "psychiatric_nurse" && !item.requires_specialist) || role() === "clinical_psychologist") {
        addButton(card, text("Close case (patient is well)", "Funga ikibazo (umurwayi yorohewe)"), true, function (button) { closeCase(item, button, actionMessage); });
      }
    }
    box.appendChild(card);
  }
  function loadAppointments(patientId) {
    var box = document.getElementById("appointment-list"); box.textContent = text("Loading appointments…", "Gukurura gahunda…");
    request("GET", withPatientSearch("/appointments", patientId || ""))
      .then(function (out) {
        if (!out.ok || !Array.isArray(out.data)) throw new Error(out.data.error || "Appointments could not be loaded.");
        var rows = out.data; box.innerHTML = "";
        // Count only visits still to come in cases that are not closed;
        // attended, missed and cancelled visits stay listed as history.
        var upcomingByCase = {};
        rows.forEach(function (row) { if (row.status === "scheduled" && row.alert_status !== "closed" && !upcomingByCase[row.alert_id]) upcomingByCase[row.alert_id] = row.scheduled_for; });
        var upcoming = rows.filter(function (row) { return row.status === "scheduled" && row.alert_status !== "closed"; }).length;
        document.getElementById("appt-total").textContent = upcoming; document.getElementById("appt-heading-total").textContent = upcoming;
        if (!rows.length) { box.textContent = patientId ? text("No appointments found for this patient code in your assigned work.", "Nta gahunda z'uyu murwayi wabonye mu kazi wahawe.") : text("No appointments are scheduled.", "Nta gahunda zateganyijwe."); return; }
        rows.forEach(function (item) { renderAppointment(item, box, upcomingByCase); });
      }).catch(function (error) { document.getElementById("appt-total").textContent = "—"; document.getElementById("appt-heading-total").textContent = "—"; showStatus(box, navigator.onLine ? error.message : text("You are offline. Appointments are unavailable until you reconnect.", "Nta murongo. Gahunda zizaboneka umaze kongera kwihuza."), true); });
  }
  function search(event) {
    if (event) event.preventDefault();
    var code = activeSearch(); var message = document.getElementById("mental-health-search-message");
    if (code && !/^(P[0-9]{3,}|P-[0-9]{4,})$/.test(code)) { showStatus(message, text("Enter a patient code such as P001.", "Andika kode y'umurwayi nka P001."), true); return; }
    showStatus(message, code ? text("Showing your assigned records for ", "Dore dosiye wahawe za ") + code : "", false);
    loadAppointments(code); if (window.loadAlerts) window.loadAlerts(code);
  }
  function clearSession() { ["ehumure_token", "ehumure_role", "ehumure_name", "ehumure_facility_id"].forEach(function (key) { sessionStorage.removeItem(key); }); location.href = "login.html"; }
  document.addEventListener("DOMContentLoaded", function () {
    if (["psychiatric_nurse", "clinical_psychologist"].indexOf(role()) < 0 || !sessionStorage.getItem("ehumure_token")) { location.href = "login.html"; return; }
    document.getElementById("welcome").textContent = sessionStorage.getItem("ehumure_name") || "";
    var badge = document.querySelector(".role-badge"), label = role() === "psychiatric_nurse" ? "Psychiatric nurse" : "Clinical psychologist";
    badge.setAttribute("data-shell-en", label); badge.textContent = rw() ? (role() === "psychiatric_nurse" ? "Umuforomo w'indwara zo mu mutwe" : "Inzobere mu mitekerereze") : label;
    document.getElementById("signout").addEventListener("click", clearSession);
    document.getElementById("appt-refresh").addEventListener("click", function () { loadAppointments(activeSearch()); });
    document.getElementById("mental-health-search").addEventListener("submit", search);
    document.getElementById("mental-health-search-clear").addEventListener("click", function () { document.getElementById("mental-health-patient-code").value = ""; search(); });
    loadAppointments("");
  });
  window.loadAppointments = loadAppointments;
  document.addEventListener("ehumure:language", function () { loadAppointments(activeSearch()); });
})();


