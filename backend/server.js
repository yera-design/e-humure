var express = require("express");
var cors = require("cors");
var bcrypt = require("bcryptjs");

var store = require("./store");
var auth = require("./auth");
var scoring = require("./scoring");

var app = express();
var PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/health", function (req, res) {
  res.json({ status: "ok" });
});

// Wrong username and wrong password give the same message on purpose.
app.post("/login", function (req, res) {
  var body = req.body || {};
  var user = store.findUser(String(body.username || ""));
  if (!user || !bcrypt.compareSync(String(body.password || ""), user.passwordHash)) {
    return res.status(401).json({ error: auth.SAME_LOGIN_ERROR });
  }
  res.json({ token: auth.createToken(user), role: user.role, name: user.name });
});

app.get("/me", auth.requireLogin, function (req, res) {
  res.json({ username: req.user.username, role: req.user.role });
});

app.post("/score", auth.requireLogin, auth.requirePermission("record_screening"), function (req, res) {
  var body = req.body || {};
  try {
    var result = body.stage === "quick"
      ? scoring.scoreQuickQuestions(body.answers)
      : body.stage === "full"
        ? scoring.scoreFullQuestionnaire(body.answers)
        : null;
    if (!result) throw new Error('stage must be "quick" or "full"');
    store.addScreening({ stage: result.stage, risk: result.risk, at: new Date().toISOString() });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

if (require.main === module) {
  app.listen(PORT, function () {
    console.log("e-Humure backend listening on http://localhost:" + PORT);
  });
}

module.exports = app;
