var API = "http://localhost:4000";

function say(message, isError) {
  var box = document.getElementById("message");
  box.textContent = message;
  box.className = isError ? "error" : "note";
}

// Keeps the token for this browser tab only; nothing is written to disk.
function signIn() {
  var body = {
    username: document.getElementById("username").value.trim(),
    password: document.getElementById("password").value
  };
  fetch(API + "/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  })
    .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
    .then(function (out) {
      if (!out.ok) return say(out.data.error, true);
      sessionStorage.setItem("ehumure_token", out.data.token);
      say("Signed in as " + out.data.name + " (" + out.data.role + ")", false);
    })
    .catch(function () { say("Cannot reach the backend. Run npm start in backend first.", true); });
}

function checkRole() {
  var token = sessionStorage.getItem("ehumure_token") || "";
  fetch(API + "/me", { headers: { Authorization: "Bearer " + token } })
    .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
    .then(function (out) {
      say(out.ok ? out.data.username + " is a " + out.data.role : out.data.error, !out.ok);
    })
    .catch(function () { say("Cannot reach the backend. Run npm start in backend first.", true); });
}

document.getElementById("signin").onclick = signIn;
document.getElementById("check").onclick = checkRole;
