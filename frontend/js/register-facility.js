/* frontend/js/register-facility.js
   The head of a hospital or clinic registers their facility. The request waits
   for a system administrator. Nothing goes live until it is approved.
   Every request has a timeout and a finally block, so the button is never left
   disabled and the status line never stays on "Submitting...".
*/
(function () {
  var TIMEOUT_MS = 15000;

  function rw() { return typeof window.getShellLanguage === "function" && window.getShellLanguage() === "rw"; }
  function value(id) { return String(document.getElementById(id).value || "").trim(); }
  function say(message, isError) {
    var box = document.getElementById("message");
    box.textContent = message;
    box.className = isError ? "status error" : "status";
  }

  function validMobile(text) { return /^07[2389]\d{7}$/.test(text); }
  function validPassword(text) { return text.length >= 12 && /[A-Za-z]/.test(text) && /\d/.test(text); }

  function submit() {
    var button = document.getElementById("submit");
    var body = {
      facilityName: value("facility-name"),
      facilityType: value("facility-type"),
      district: value("district"),
      contact: value("contact"),
      adminName: value("admin-name"),
      username: value("username"),
      password: document.getElementById("password").value
    };

    if (body.facilityName.length < 2) return say(rw() ? "Andika izina ry'ivuriro cyangwa ibitaro." : "Enter the hospital or clinic name.", true);
    if (body.district.length < 2) return say(rw() ? "Andika akarere." : "Enter the district.", true);
    if (!validMobile(body.contact)) return say(rw() ? "Andika nimero ya telefone y'u Rwanda y'imibare 10." : "Enter a valid 10-digit Rwanda mobile number.", true);
    if (body.adminName.length < 2) return say(rw() ? "Andika amazina yawe yose." : "Enter your full name.", true);
    if (body.username.length < 3) return say(rw() ? "Hitamo izina ryo kwinjira rifite inyuguti 3 cyangwa zirenga." : "Choose a username of 3 characters or more.", true);
    if (!validPassword(body.password)) return say(rw() ? "Ijambobanga rigomba kugira inyuguti 12 zirimo inyuguti n'imibare." : "The password needs 12+ characters including a letter and a number.", true);

    button.disabled = true;
    say(rw() ? "Kohereza ubusabe\u2026" : "Submitting your registration\u2026", false);

    // A request that never answers must still end, or the page waits forever.
    var controller = typeof AbortController === "function" ? new AbortController() : null;
    var timer = setTimeout(function () { if (controller) controller.abort(); }, TIMEOUT_MS);

    fetch("/facility-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller ? controller.signal : undefined
    })
      .then(function (response) { return response.json().then(function (data) { return { ok: response.ok, data: data }; }); })
      .then(function (out) {
        if (!out.ok) { say(out.data.error || (rw() ? "Ubusabe ntibwakiriwe." : "The registration was not accepted."), true); return; }
        say(rw()
          ? "Ubusabe bwakiriwe. Umuyobozi wa sisitemu agomba kubwemeza mbere y'uko winjira. Kode y'ivuriro izatangwa igihe bwemejwe."
          : (out.data.message || "Request submitted. A system administrator must approve it before you can sign in."), false);
        ["facility-name", "district", "contact", "admin-name", "username", "password"].forEach(function (id) { document.getElementById(id).value = ""; });
      })
      .catch(function (error) {
        if (error && error.name === "AbortError") { say(rw() ? "Seriveri yatinze gusubiza. Ongera ugerageze." : "The server took too long to answer. Try again.", true); return; }
        say(navigator.onLine
          ? (rw() ? "Ntibyashobotse kugera kuri seriveri. Reba umurongo wongere ugerageze." : "Cannot reach the server. Check the connection and try again.")
          : (rw() ? "Nta murongo. Ubusabe ntibwoherejwe." : "You are offline. The registration was not sent."), true);
      })
      .finally(function () { clearTimeout(timer); button.disabled = false; });
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("submit").addEventListener("click", submit);
  });
})();

