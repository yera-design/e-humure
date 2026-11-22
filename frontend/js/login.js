var loginMode = "staff";
var setupCompletedNow = false;

function loginMessage(message, error) {
  var box = document.getElementById("message");
  box.textContent = message || "";
  box.className = error ? "status error" : "status";
}

function setLoginMode(mode) {
  loginMode = mode;
  var admin = mode === "system_admin";
  document.getElementById("facility-field").hidden = admin;
  document.getElementById("facility").required = !admin;
  document.getElementById("staff-mode").setAttribute("aria-pressed", String(!admin));
  document.getElementById("system-mode").setAttribute("aria-pressed", String(admin));
  document.getElementById("login-instructions").textContent = admin
    ? "System administrator sign-in. No facility is selected for this account."
    : "Select your facility, then enter your approved staff account.";
  loginMessage("", false);
}

function loadFacilityList() {
  var select = document.getElementById("facility");
  fetch("/facilities").then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
    .then(function (out) {
      if (!out.ok) throw new Error(out.data.error || "Facilities could not be loaded.");
      select.innerHTML = "";
      if (!out.data.length) { select.innerHTML = '<option value="">No facilities are configured</option>'; if (!setupCompletedNow) loginMessage("No facilities are configured yet. Register your facility or contact the system administrator.", true); return; }
      var prompt = document.createElement("option"); prompt.value = ""; prompt.textContent = "Choose a facility"; select.appendChild(prompt);
      out.data.forEach(function (facility) { var option = document.createElement("option"); option.value = facility.id; option.textContent = facility.name; select.appendChild(option); });
    }).catch(function () { select.innerHTML = '<option value="">Facilities unavailable</option>'; loginMessage(navigator.onLine ? "Could not load facilities. Check that the server and database are running." : "You are offline. Connect to the facility network and try again.", true); });
  fetch("/setup/status").then(function (res) { return res.json(); }).then(function (data) {
    document.getElementById("setup-link").hidden = !data.setupRequired;
    document.getElementById("system-mode").hidden = data.setupRequired;
  }).catch(function () {});
  try {
    if (sessionStorage.getItem("ehumure_setup_completed")) {
      setupCompletedNow = true;
      sessionStorage.removeItem("ehumure_setup_completed");
      loginMessage("System administrator created successfully. Sign in using the account you just created.", false);
    }
  } catch (e) {}
}

function signIn() {
  var body = { username: document.getElementById("username").value.trim(), password: document.getElementById("password").value };
  if (loginMode === "system_admin") body.loginType = "system_admin";
  else body.facilityId = document.getElementById("facility").value;
  if ((!body.facilityId && loginMode !== "system_admin") || !body.username || !body.password) return loginMessage(loginMode === "system_admin" ? "Enter your system administrator username and password." : "Choose your facility and enter your username and password.", true);
  var button = document.getElementById("signin"); button.disabled = true; loginMessage("Checking your account…", false);
  fetch("/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
    .then(function (out) {
      if (!out.ok) { loginMessage(out.data.error || "Sign-in failed. Check your details and try again.", true); return; }
      sessionStorage.setItem("ehumure_token", out.data.token); sessionStorage.setItem("ehumure_role", out.data.role); sessionStorage.setItem("ehumure_name", out.data.name); sessionStorage.setItem("ehumure_facility_id", out.data.facilityId || "");
      var pages = { ncd_nurse: "nurse.html", psychiatric_nurse: "psychologist.html", clinical_psychologist: "psychologist.html", facility_admin: "admin.html", system_admin: "admin.html" };
      if (!pages[out.data.role]) { loginMessage("This account role is not enabled.", true); return; }
      location.href = pages[out.data.role];
    }).catch(function () { loginMessage(navigator.onLine ? "Sign-in could not reach the server. Check that the app is running on your facility network." : "You are offline. Sign-in was not sent.", true); }).finally(function () { button.disabled = false; });
}

document.getElementById("signin").addEventListener("click", signIn);
document.getElementById("staff-mode").addEventListener("click", function () { setLoginMode("staff"); });
document.getElementById("system-mode").addEventListener("click", function () { setLoginMode("system_admin"); });
document.getElementById("password").addEventListener("keydown", function (event) { if (event.key === "Enter") signIn(); });
document.getElementById("password-visibility").addEventListener("click", function () {
  var password = document.getElementById("password"), visible = password.type === "password";
  password.type = visible ? "text" : "password";
  this.textContent = visible ? "Hide" : "Show";
  this.setAttribute("aria-pressed", String(visible));
});
document.addEventListener("DOMContentLoaded", loadFacilityList);
window.addEventListener("online", function () { document.querySelector("[data-offline]").classList.remove("visible"); });
window.addEventListener("offline", function () { document.querySelector("[data-offline]").classList.add("visible"); });