var express = require("express");
var cors = require("cors");
var bcrypt = require("bcryptjs");
var { v4: uuidv4 } = require("uuid");
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
app.post("/login", async function (req, res) {
  var body = req.body || {};
  try {
    var user = await store.findUserByUsername(String(body.username || ""));
    if (!user || !bcrypt.compareSync(String(body.password || ""), user.passwordHash)) {
      return res.status(401).json({ error: auth.SAME_LOGIN_ERROR });
    }
    res.json({ token: auth.createToken(user), role: user.role, name: user.name });
  } catch (err) {
    console.error("LOGIN ERROR:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/me", auth.requireLogin, function (req, res) {
  res.json({ username: req.user.username, role: req.user.role });
});

app.post("/score", auth.requireLogin, auth.requirePermission("record_screening"), async function (req, res) {
  var body = req.body || {};
  try {
    var result = body.stage === "quick"
      ? scoring.scoreQuickQuestions(body.answers)
      : body.stage === "full"
        ? scoring.scoreFullQuestionnaire(body.answers)
        : null;
    if (!result) throw new Error('stage must be "quick" or "full"');
    var screenId = uuidv4();
    await store.addScreening({
   	id: screenId, patientId: body.patientId, staffId: req.user.staffId,
   	stage: result.stage, responses: body.answers,
    	total: result.total, item9Flag: result.emergency
   });
    res.json(results);
  } catch (err) {
    res.status(400).json({ error: err.code === "23503" ? "Unknown patientId" : err.message });
  }
});

if (require.main === module) {
  app.listen(PORT, function () {
    console.log("e-Humure backend listening on http://localhost:" + PORT);
  });
}

module.exports = app;
