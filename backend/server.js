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
        var user = await store.findUserByUsername(
            String(body.username || "")
        );

        if (!user || !bcrypt.compareSync(
            String(body.password || ""),
            user.passwordHash
        )) {
            return res.status(401).json({
                error: auth.SAME_LOGIN_ERROR
            });
        }

        res.json({
            token: auth.createToken(user),
            role: user.role,
            name: user.name
        });

    } catch (err) {
        res.status(500).json({
            error: "Database error"
        });
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
    id: screenId,
    patientId: body.patientId,
    staffId: req.user.staffId,
    stage: result.stage,
    responses: body.answers,
    total: result.total,
    item9Flag: result.emergency
  });
  if (result.risk === "moderate" || result.risk === "high") {
      await store.addAlert(uuidv4(), screenId, result.risk);
    }
    res.json(result);
  } catch (err) {
    res.status(400).json({
    error: err.code === "23503"
        ? "Unknown patientId"
        : err.message
    });
  }
});


app.post("/patients", auth.requireLogin, auth.requirePermission("create_patient"), async function (req, res) {
  var body = req.body || {};
  var age = Number(body.age);
  var phone = String(body.phone || "").trim();
  if (!(age >= 18 && age <= 120) ||
      ["diabetes", "hypertension"].indexOf(body.condition) === -1 ||
      !body.sector || !/^\+?[0-9]{9,15}$/.test(phone)) {
    return res.status(400).json({ error: "age (18-120), condition (diabetes or hypertension), sector and a valid phone are required" });
  }
  try {
    var pool = require("./db");
    var patientId = "P-" + uuidv4().slice(0, 6).toUpperCase();
    await pool.query(
      "INSERT INTO patient(patient_id,age,chronic_condition,sector,phone_enc,consent_given_at) VALUES($1,$2,$3,$4,$5,now())",
      [patientId, age, body.condition, String(body.sector), require("./phone").encryptPhone(phone)]
    );
    res.json({ patientId: patientId });
  } catch (e) {
    res.status(500).json({ error: "Database error" });
  }
});

// GET /alerts: psychologist sees open alerts.
app.get("/alerts", auth.requireLogin, auth.requirePermission("read_screening_details"),
  async function (req, res) {
    if (req.user.role === "nurse") {
      return res.status(403).json({ error: "Your role is not allowed to do this" });
    }
    try {
      var pool = require("./db");
      var rows = await pool.query(
        "SELECT a.alert_id, a.risk_level, a.status, " +
        "s.total_score, s.item9_flag, s.screened_at, s.patient_id, p.phone_enc " +
        "FROM risk_alert a JOIN screening s ON s.screening_id = a.screening_id " +
        "JOIN patient p ON p.patient_id = s.patient_id " +
        "WHERE a.status = 'open' ORDER BY s.screened_at DESC"
      );
      await require("./audit").logAccess(req.user.staffId, "read_alerts", "risk_alert", "all");
      var out = rows.rows.map(function (r) {
        r.phone = require("./phone").decryptPhone(r.phone_enc);
        delete r.phone_enc;
        return r;
      });
      res.json(out);
    } catch (e) {
      console.error("ALERTS ERROR:", e.message);
      res.status(500).json({ error: "Database error" });
    }
  }
);

// POST /appointments: psychologist books an appointment and the alert is acknowledged.
app.post("/appointments", auth.requireLogin, auth.requirePermission("read_screening_details"),
  async function (req, res) {
    if (req.user.role === "nurse") {
      return res.status(403).json({ error: "Your role is not allowed to do this" });
    }
    var body = req.body || {};
    if (!body.patientId || !body.alertId || !body.scheduledFor) {
      return res.status(400).json({ error: "patientId, alertId and scheduledFor are required" });
    }
    try {
      var pool = require("./db");
      var apptId = uuidv4();
      await pool.query(
        "INSERT INTO appointment(appointment_id,patient_id,psychologist_id,alert_id,scheduled_for,location,kind,status) " +
        "VALUES($1,$2,$3,$4,$5,'Gikomero HC','session','scheduled')",
        [apptId, body.patientId, req.user.staffId, body.alertId, body.scheduledFor]
      );
      await pool.query("UPDATE risk_alert SET status='acknowledged' WHERE alert_id=$1", [body.alertId]);
      await require("./audit").logAccess(req.user.staffId, "book_appointment", "appointment", apptId);
      res.json({ appointmentId: apptId });
    } catch (e) {
      res.status(500).json({ error: "Database error: " + e.message });
    }
  }
);
// GET /appointments: the psychologist sees the appointments they booked.
app.get("/appointments", auth.requireLogin, auth.requirePermission("read_screening_details"),
  async function (req, res) {
    if (req.user.role === "nurse") {
      return res.status(403).json({ error: "Your role is not allowed to do this" });
    }
    try {
      var pool = require("./db");
      var rows = await pool.query(
        "SELECT a.appointment_id, a.patient_id, a.scheduled_for, a.location, a.status, p.phone_enc " +
        "FROM appointment a JOIN patient p ON p.patient_id = a.patient_id " +
        "WHERE a.psychologist_id = $1 ORDER BY a.scheduled_for ASC",
        [req.user.staffId]
      );
      await require("./audit").logAccess(req.user.staffId, "read_appointments", "appointment", "all");
      var out = rows.rows.map(function (r) {
        r.phone = require("./phone").decryptPhone(r.phone_enc);
        delete r.phone_enc;
        return r;
      });
      res.json(out);
    } catch (e) {
      console.error("APPOINTMENTS ERROR:", e.message);
      res.status(500).json({ error: "Database error" });
    }
  }
);
if (require.main === module) {
  app.listen(PORT, function () {
    console.log("e-Humure backend listening on http://localhost:" + PORT);
  });
}

module.exports = app;
