* frontend/js/admin.js
   The administration workspace, for both the facility administrator and the
   system administrator. Each role sees only its own panels; the panels the
   role may not use stay hidden and are never loaded.

   A facility administrator sees:  facility summary, pending staff requests.
   A system administrator sees:    facility registrations, system overview,
                                   audit log.
*/
(function () {
  var TOKEN = sessionStorage.getItem("ehumure_token");
  var ROLE = sessionStorage.getItem("ehumure_role");
  var NAME = sessionStorage.getItem("ehumure_name");

  if (!TOKEN || ["facility_admin", "system_admin"].indexOf(ROLE) < 0) {
    location.href = "login.html";
    return;
  }

  var isSystemAdmin = ROLE === "system_admin";

  var ROLE_NAMES = {
    facility_admin: "Facility administrator",
    ncd_nurse: "NCD nurse",
    psychiatric_nurse: "Psychiatric nurse",
    clinical_psychologist: "Clinical psychologist",
    disabled: "Disabled"
  };
  var ROLE_NAMES_RW = {
    facility_admin: "Umuyobozi w'ivuriro",
    ncd_nurse: "Umuforomo w'indwara zitandura",
    psychiatric_nurse: "Umuforomo w'indwara zo mu mutwe",
    clinical_psychologist: "Inzobere mu mitekerereze",
    disabled: "Yahagaritswe"
  };
  var STATUS_NAMES = { approved: "Approved", pending: "Pending", disabled: "Disabled" };
  var FACILITY_TYPE_NAMES = { health_center: "Health center or clinic", district_hospital: "District hospital" };

  /* ---------------------------------------------------------------- utils */

  function rw() { return typeof window.getShellLanguage === "function" && window.getShellLanguage() === "rw"; }
  function text(en, rwText) { return rw() ? rwText : en; }
  function roleName(role) { return (rw() ? ROLE_NAMES_RW[role] : ROLE_NAMES[role]) || role; }
  function locale() { return rw() ? "rw-RW" : "en-RW"; }
  function element(id) { return document.getElementById(id); }

  function headers(json) {
    var value = { Authorization: "Bearer " + TOKEN };
    if (json) value["Content-Type"] = "application/json";
    return value;
  }

  function request(method, url, body) {
    return fetch(url, {
      method: method,
      headers: headers(!!body),
      body: body ? JSON.stringify(body) : undefined
    }).then(function (response) {
      return response.json().then(function (data) { return { ok: response.ok, data: data }; });
    });
  }

  function say(id, message, isError) {
    var box = element(id);
    if (!box) return;
    box.textContent = message || "";
    box.className = isError ? "status error" : "status";
  }

  function offlineText(whenOnline, whenOffline) {
    return navigator.onLine ? whenOnline : whenOffline;
  }

  function makeCard(parent) {
    var card = document.createElement("article");
    card.className = "list-card";
    parent.appendChild(card);
    return card;
  }

  function line(card, value, className) {
    var paragraph = document.createElement("p");
    if (className) paragraph.className = className;
    paragraph.textContent = value;
    card.appendChild(paragraph);
    return paragraph;
  }

  function heading(card, value) {
    var title = document.createElement("h3");
    title.textContent = value;
    card.appendChild(title);
    return title;
  }

  function decisionButtons(card, labels, onChoose) {
    ["approve", "reject"].forEach(function (decision) {
      var button = document.createElement("button");
      button.type = "button";
      if (decision === "reject") button.className = "secondary";
      button.textContent = labels[decision];
      button.addEventListener("click", function () { onChoose(decision, button); });
      card.appendChild(button);
    });
  }

  /* -------------------------------------------- staff access requests */

  function loadStaffRequests() {
    var box = element("request-list");
    box.textContent = text("Loading requests…", "Gukurura ubusabe…");

    request("GET", "/admin/requests").then(function (out) {
      if (!out.ok) { box.textContent = out.data.error || text("Could not load requests.", "Ntibyashobotse kureba ubusabe."); return; }

      element("request-count").textContent = String(out.data.length);
      document.title = out.data.length
        ? "(" + out.data.length + ") Staff requests | e-Humure"
        : "Administration | e-Humure";

      if (!out.data.length) {
        box.textContent = text("No staff requests are waiting for review.", "Nta busabe bw'abakozi butegereje gusuzumwa.");
        return;
      }

      box.innerHTML = "";
      out.data.forEach(function (entry) {
        var card = makeCard(box);
        heading(card, entry.name + " · " + roleName(entry.role));
        line(card, [
          entry.contact,
          text("District: ", "Akarere: ") + entry.district,
          text("Facility: ", "Ivuriro: ") + entry.facility_name,
          text("Username: ", "Izina: ") + entry.username,
          text("Requested ", "Byasabwe ") + new Date(entry.created_at).toLocaleString(locale())
        ].join(" · "), "muted");

        decisionButtons(card, {
          approve: text("Approve", "Emeza"),
          reject: text("Reject", "Hakana")
        }, function (decision, button) {
          button.disabled = true;
          say("staff-request-message", decision === "approve"
            ? text("Approving…", "Kwemeza…")
            : text("Rejecting…", "Guhakana…"), false);

          request("POST", "/admin/requests/" + encodeURIComponent(entry.id) + "/decision", { decision: decision })
            .then(function (result) {
              if (!result.ok) { say("staff-request-message", result.data.error || text("The decision could not be saved.", "Ntibyashobotse kubika icyemezo."), true); return; }
              say("staff-request-message", decision === "approve"
                ? text("Staff account approved.", "Konti y'umukozi yemejwe.")
                : text("Request rejected. No account was created.", "Ubusabe bwanzwe. Nta konti yakozwe."), false);
              loadStaffRequests();
            })
            .catch(function () { say("staff-request-message", text("Could not reach the server.", "Ntibyashobotse kugera kuri seriveri."), true); })
            .finally(function () { button.disabled = false; });
        });
      });
    }).catch(function () {
      box.textContent = offlineText(
        text("Could not load staff requests. Check the server.", "Ntibyashobotse kureba ubusabe. Reba seriveri."),
        text("You are offline. Staff requests need a connection.", "Nta murongo. Ubusabe bukeneye umurongo.")
      );
    });
  }

  /* ------------------------------------------ facility registrations */

  function loadFacilityRequests() {
    var box = element("facility-request-list");
    box.textContent = text("Loading registrations…", "Gukurura iyandikisha…");

    request("GET", "/admin/facility-requests").then(function (out) {
      if (!out.ok) { box.textContent = out.data.error || text("Registrations could not be loaded.", "Ntibyashobotse kureba iyandikisha."); return; }

      element("facility-request-count").textContent = String(out.data.length);

      if (!out.data.length) {
        box.textContent = text("No facility registrations are waiting for review.", "Nta ivuriro ryiyandikishije ritegereje gusuzumwa.");
        return;
      }

      box.innerHTML = "";
      out.data.forEach(function (entry) {
        var card = makeCard(box);
        heading(card, entry.facility_name + " · " + (FACILITY_TYPE_NAMES[entry.facility_type] || entry.facility_type) + " · " + entry.district);
        line(card, text("Head: ", "Umuyobozi: ") + entry.admin_full_name + " · " + text("username ", "izina ") + entry.username);
        line(card, text("Contact: ", "Telefone: ") + entry.contact + " · " + text("Requested ", "Byasabwe ") + new Date(entry.created_at).toLocaleString(locale()), "muted");

        decisionButtons(card, {
          approve: text("Approve and issue code", "Emeza utange kode"),
          reject: text("Reject", "Hakana")
        }, function (decision, button) {
          button.disabled = true;
          say("facility-request-message", decision === "approve"
            ? text("Approving…", "Kwemeza…")
            : text("Rejecting…", "Guhakana…"), false);

          request("POST", "/admin/facility-requests/" + encodeURIComponent(entry.id) + "/decision", { decision: decision })
            .then(function (result) {
              if (!result.ok) { say("facility-request-message", result.data.error || text("The decision could not be saved.", "Ntibyashobotse kubika icyemezo."), true); return; }
              say("facility-request-message", result.data.message || text("Saved.", "Byabitswe."), false);
              loadFacilityRequests();
              loadOverview();
              loadAudit();
            })
            .catch(function () { say("facility-request-message", text("Could not reach the server. Try again.", "Ntibyashobotse kugera kuri seriveri. Ongera ugerageze."), true); })
            .finally(function () { button.disabled = false; });
        });
      });
    }).catch(function () {
      box.textContent = offlineText(
        text("Registrations could not be loaded. Check the server.", "Ntibyashobotse kureba iyandikisha. Reba seriveri."),
        text("You are offline. Registrations need a connection.", "Nta murongo. Iyandikisha rikeneye umurongo.")
      );
    });
  }

  /* -------------------------------------------------- system overview */

  function loadOverview() {
    var box = element("system-overview-list");
    box.textContent = text("Loading facilities…", "Gukurura amavuriro…");

    request("GET", "/system/overview").then(function (out) {
      if (!out.ok) { box.textContent = out.data.error || text("The overview could not be loaded.", "Ntibyashobotse kureba incamake."); return; }

      var facilities = out.data.facilities || [];
      if (!facilities.length) { box.textContent = text("No facilities are registered yet.", "Nta vuriro ryanditswe."); return; }

      box.innerHTML = "";
      facilities.forEach(function (facility) {
        var card = makeCard(box);
        heading(card, facility.name + " · " + facility.facilityId + " · " + facility.district);
        line(card, (facility.facilityType === "district_hospital"
          ? text("District hospital", "Ibitaro by'akarere")
          : text("Health center or clinic", "Ikigo nderabuzima cyangwa ivuriro"))
          + (facility.isActive ? "" : text(" · inactive", " · ntirikora")), "muted");

        line(card, text("Facility administrator: ", "Umuyobozi w'ivuriro: ") + (facility.administrators.length
          ? facility.administrators.map(function (admin) { return admin.fullName; }).join(", ")
          : text("none registered", "nta we uranditswe")));

        if (!facility.staff.length) {
          line(card, text("No staff under this administrator yet.", "Nta bakozi bari muri uyu muyobozi."), "note");
          return;
        }

        var list = document.createElement("ul");
        facility.staff.forEach(function (member) {
          var row = document.createElement("li");
          row.textContent = member.fullName + " · " + roleName(member.role) + " · " + (STATUS_NAMES[member.status] || member.status);
          list.appendChild(row);
        });
        card.appendChild(list);
      });
    }).catch(function () {
      box.textContent = offlineText(
        text("The overview could not be loaded. Check the server.", "Ntibyashobotse kureba incamake. Reba seriveri."),
        text("You are offline. The overview needs a connection.", "Nta murongo. Incamake ikeneye umurongo.")
      );
    });
  }

  /* ------------------------------------------------- facility summary */

  function loadSummary() {
    var box = element("facility-summary");
    box.textContent = text("Loading summary…", "Gukurura incamake…");

    request("GET", "/facility/summary").then(function (out) {
      if (!out.ok) { box.textContent = out.data.error || text("The summary could not be loaded.", "Ntibyashobotse kureba incamake."); return; }

      var summary = out.data;
      box.innerHTML = "";

      if (summary.warning) {
        var warning = document.createElement("p");
        warning.className = "status error";
        warning.textContent = summary.warning;
        box.appendChild(warning);
      }

      function block(title, pairs) {
        var card = makeCard(box);
        heading(card, title);
        var list = document.createElement("ul");
        pairs.forEach(function (pair) {
          var row = document.createElement("li");
          row.textContent = pair[0] + ": " + pair[1];
          list.appendChild(row);
        });
        card.appendChild(list);
      }

      block(text("Screenings", "Isuzuma"), [
        [text("Total", "Byose"), summary.screenings.total],
        [text("Full PHQ-9", "PHQ-9 yuzuye"), summary.screenings.phq9],
        [text("Quick questions only", "Ibibazo bibiri gusa"), summary.screenings.whooley_only]
      ]);

      block(text("Screenings per NCD nurse", "Isuzuma kuri buri muforomo w'indwara zitandura"),
        summary.screeningsPerNurse.length
          ? summary.screeningsPerNurse.map(function (nurse) { return [nurse.full_name, nurse.screenings]; })
          : [[text("No active NCD nurse", "Nta muforomo w'indwara zitandura ukora"), 0]]);

      var severity = summary.phq9BySeverity;
      block(text("PHQ-9 results by level", "Ibisubizo bya PHQ-9 ku rwego"), [
        [text("Minimal (0-4)", "Bike cyane (0-4)"), severity.minimal],
        [text("Mild (5-9)", "Byoroheje (5-9)"), severity.mild],
        [text("Moderate (10-14)", "Biringaniye (10-14)"), severity.moderate],
        [text("Moderately severe (15-19)", "Bikabije ku rugero ruringaniye (15-19)"), severity.moderately_severe],
        [text("Severe (20-27)", "Bikabije (20-27)"), severity.severe]
      ]);

      var alerts = summary.alerts;
      block(text("Alerts", "Integuza"), [
        [text("Total raised", "Zose zatanzwe"), alerts.total],
        [text("Open", "Zifunguye"), alerts.open],
        [text("Closed", "Zafunzwe"), alerts.closed],
        [text("Urgent and open", "Zihutirwa kandi zifunguye"), alerts.urgent_open],
        [text("Open with nobody assigned", "Zifunguye nta we zahawe"), alerts.unassigned_open],
        [text("Sent to a psychiatric nurse", "Zoherejwe ku muforomo w'indwara zo mu mutwe"), alerts.to_psychiatric_nurse],
        [text("Sent to a clinical psychologist", "Zoherejwe ku nzobere mu mitekerereze"), alerts.to_psychologist],
        [text("Escalated by a nurse", "Zoherejwe n'umuforomo ku nzobere"), alerts.escalated]
      ]);

      block(text("Open alerts per specialist", "Integuza zifunguye kuri buri nzobere"),
        summary.openAlertsPerSpecialist.length
          ? summary.openAlertsPerSpecialist.map(function (person) { return [person.full_name + " (" + roleName(person.role) + ")", person.open_alerts]; })
          : [[text("Nobody registered", "Nta we uranditswe"), 0]]);

      block(text("Appointments", "Gahunda"), [
        [text("Total", "Zose"), summary.appointments.total],
        [text("Upcoming", "Ziri imbere"), summary.appointments.upcoming],
        [text("Attended", "Zitabiriwe"), summary.appointments.attended]
      ]);
    }).catch(function () {
      box.textContent = offlineText(
        text("The summary could not be loaded. Check the server.", "Ntibyashobotse kureba incamake. Reba seriveri."),
        text("You are offline. The summary needs a connection.", "Nta murongo. Incamake ikeneye umurongo.")
      );
    });
  }

  /* -------------------------------------------------------- audit log */

  function loadAudit() {
    var box = element("audit-list");
    box.textContent = text("Loading audit entries…", "Gukurura amateka y'ibikorwa…");

    request("GET", "/admin/audit").then(function (out) {
      if (!out.ok) { box.textContent = out.data.error || text("Audit entries could not be loaded.", "Ntibyashobotse kureba amateka y'ibikorwa."); return; }
      if (!out.data.length) { box.textContent = text("No audit entries yet.", "Nta mateka y'ibikorwa arahari."); return; }

      box.innerHTML = "";
      out.data.forEach(function (entry) {
        var card = makeCard(box);
        heading(card, entry.staff_name || entry.actor_label || text("Unidentified account", "Konti itazwi"));
        line(card, entry.action + " · " + entry.record_type + " " + entry.record_id + " · " + entry.outcome);
        line(card, new Date(entry.occurred_at).toLocaleString(locale()), "small muted");
      });
    }).catch(function () {
      box.textContent = offlineText(
        text("Audit entries could not be loaded. Check the server.", "Ntibyashobotse kureba amateka. Reba seriveri."),
        text("You are offline. The audit log needs a connection.", "Nta murongo. Amateka y'ibikorwa akeneye umurongo.")
      );
    });
  }

  /* ------------------------------------------------------------ start */

  function signOut() {
    ["ehumure_token", "ehumure_role", "ehumure_name", "ehumure_facility_id"].forEach(function (key) {
      sessionStorage.removeItem(key);
    });
    location.href = "welcome.html";
  }

  function refreshAll() {
    if (isSystemAdmin) { loadFacilityRequests(); loadOverview(); loadAudit(); }
    else { loadSummary(); loadStaffRequests(); }
  }

  element("admin-welcome").textContent = NAME || "";

  var roleLabel = element("admin-role");
  var roleText = isSystemAdmin ? "System administrator" : "Facility administrator";
  roleLabel.setAttribute("data-shell-en", roleText);
  roleLabel.textContent = roleText;

  element("facility-requests-panel").hidden = !isSystemAdmin;
  element("system-overview-panel").hidden = !isSystemAdmin;
  element("audit-panel").hidden = !isSystemAdmin;
  element("facility-summary-panel").hidden = isSystemAdmin;
  element("staff-requests-panel").hidden = isSystemAdmin;

  element("signout").addEventListener("click", signOut);
  element("facility-request-refresh").addEventListener("click", loadFacilityRequests);
  element("overview-refresh").addEventListener("click", loadOverview);
  element("audit-refresh").addEventListener("click", loadAudit);
  element("summary-refresh").addEventListener("click", loadSummary);
  element("request-refresh").addEventListener("click", loadStaffRequests);

  document.addEventListener("ehumure:language", refreshAll);
  window.addEventListener("online", function () { document.querySelector("[data-offline]").classList.remove("visible"); });
  window.addEventListener("offline", function () { document.querySelector("[data-offline]").classList.add("visible"); });

  if (window.applyShellLanguage && window.getShellLanguage) window.applyShellLanguage(window.getShellLanguage());
  refreshAll();

  // A facility administrator works from this page all day, so new staff
  // requests appear without them having to press Refresh.
  if (!isSystemAdmin) setInterval(loadStaffRequests, 30000);
})();

