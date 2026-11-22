(function () {
  var button = document.getElementById("create-admin");
  var message = document.getElementById("setup-message");
  var pending = false;
  function say(text, error) { message.textContent = text; message.className = error ? "status error" : "status"; }
  function validMobile(text) {
    return /^07[2389]\d{7}$/.test(text);}
  function goToSignIn() {
    try { sessionStorage.setItem("ehumure_setup_completed", "1"); } catch (e) {}
    location.href = "login.html";
  }
  function checkForCompletedSetup() {
    return fetch("/setup/status").then(function (r) { return r.json(); }).then(function (status) {
      if (!status.setupRequired) goToSignIn();
      else say("No confirmation came back and setup is still incomplete. Check the backend terminal before trying again.", true);
    }).catch(function () { say("The server did not confirm whether setup finished. Check the backend terminal and database before submitting again.", true); });
  }
  button.addEventListener("click", function () {
    if (pending) return;
    var body = {
      setupSecret: document.getElementById("setup-secret").value,
      fullName: document.getElementById("admin-name").value.trim(),
      contact: document.getElementById("admin-contact").value.trim(),
      username: document.getElementById("admin-username").value.trim(),
      password: document.getElementById("admin-password").value
    };
    if (!body.setupSecret || !body.fullName || !body.contact || !body.username || !body.password) return say("Complete all fields before submitting.", true); if (!validMobile(body.contact)) return say("Enter a valid 10-digit Rwanda mobile number.", true);
    pending = true; button.disabled = true; say("Creating the system administrator…", false);
    var controller = new AbortController(); var timeout = setTimeout(function () { controller.abort(); }, 15000);
    fetch("/setup/initial-admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: controller.signal })
      .then(function (response) { return response.json().then(function (data) { return { ok: response.ok, data: data }; }); })
      .then(function (result) {
        if (!result.ok) { say(result.data.error || "Setup failed. Check the details and try again.", true); return; }
        document.getElementById("setup-secret").value = ""; document.getElementById("admin-password").value = ""; goToSignIn();
      }).catch(function (error) {
        if (error.name === "AbortError") return checkForCompletedSetup();
        say(navigator.onLine ? "Setup could not reach the server. Check the backend terminal and try again." : "You are offline. Setup was not sent.", true);
      }).finally(function () { clearTimeout(timeout); pending = false; button.disabled = false; });
  });
})();

