var config = require("./config");
config.loadEnvFile();
config.validate();
var { spawn } = require("child_process");

var express = require("express");
var path = require("path");
var crypto = require("crypto");
var bcrypt = require("bcryptjs");
var { v4: uuidv4 } = require("uuid");
var pool = require("./db");
var auth = require("./auth");
var scoring = require("./scoring");
var routing = require("./routing");
var alertVisibility = require("./alert-visibility");
var phone = require("./phone");
var audit = require("./audit");
var security = require("./security");
var permissions = require("./permissions");

var app = express();
var PORT = Number(process.env.PORT || 4000);
var BIND_HOST = process.env.BIND_HOST || "0.0.0.0";
var FRONTEND = path.join(__dirname, "..", "frontend");

app.disable("x-powered-by");
app.use(function (req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});
app.use(security.facilityNetworkOnly);
app.use(express.json({ limit: "32kb" }));

function replyError(res, status, message) { return res.status(status).json({ error: message }); }
function usernameIsValid(value) { return /^[A-Za-z0-9._-]{3,32}$/.test(String(value || "")); }
function passwordIsValid(value) {
  value = String(value || "");
  return value.length >= 12 && value.length <= 128 && /[A-Za-z]/.test(value) && /[0-9]/.test(value);
}
function facilityIdIsValid(value) { return /^[A-Z0-9][A-Z0-9-]{1,15}$/.test(String(value || "")); }
function facilityCodePrefix(name) {
  var ignored = { health: true, center: true, hospital: true, clinic: true, district: true, medical: true, of: true, the: true, and: true };
  var words = String(name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().match(/[A-Z0-9]+/g) || [];
  var word = words.find(function (part) { return !ignored[part.toLowerCase()] && /[A-Z]/.test(part); }) || words[0] || "FAC";
  return (word + "FAC").slice(0, 3);
}
async function nextFacilityCode(client, name) {
  var prefix = facilityCodePrefix(name);
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [prefix]);
  var result = await client.query("SELECT COALESCE(MAX(CASE WHEN facility_id ~ ('^' || $1 || '-[0-9]+$') THEN split_part(facility_id, '-', 2)::INTEGER ELSE 0 END), 0) + 1 AS next_number FROM facility", [prefix]);
  return prefix + "-" + String(result.rows[0].next_number).padStart(2, "0");
}
function isValidStaffContact(value) {
  return phone.isRwandaMobile(String(value || "").trim());
}
function validFacilityType(value) { return ["health_center", "district_hospital"].indexOf(value) >= 0; }
function setupSecretMatches(candidate) {
  var expected = Buffer.from(process.env.SETUP_SECRET || "", "utf8");
  var received = Buffer.from(String(candidate || ""), "utf8");
  return expected.length > 0 && expected.length === received.length && crypto.timingSafeEqual(expected, received);
}
function hasPermission(req, res, action) {
  if (permissions.canDo(req.user.role, action)) return true;
  audit.logAccess(req.user.staffId, "permission_denied:" + action, "route", req.path, req, "denied");
  replyError(res, 403, "Your role is not allowed to do this.");
  return false;
}
function routeError(res, error, context) {
  console.error(context, error && error.message ? error.message : error);
  return replyError(res, 500, "The request could not be completed. Check the server log or try again.");
}
function transaction(work) {
  return pool.connect().then(async function (client) {
    try {
      await client.query("BEGIN");
      var result = await work(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  });
}
async function queueAppointmentReminders(client, appointmentId, scheduledFor, staffId) {
  var dayBefore = new Date(Date.parse(scheduledFor) - 24 * 60 * 60 * 1000).toISOString();
  await client.query(
    "INSERT INTO sms_reminder(reminder_id,appointment_id,send_on,message_type,recipient_kind,status) VALUES($1,$2,now(),'confirmation','patient','queued')",
    [uuidv4(), appointmentId]);
  await client.query(
    "INSERT INTO sms_reminder(reminder_id,appointment_id,send_on,message_type,recipient_kind,status) VALUES($1,$2,GREATEST($3::timestamptz,now()),'appointment','patient','queued')",
    [uuidv4(), appointmentId, dayBefore]);
  await client.query(
    "INSERT INTO sms_reminder(reminder_id,appointment_id,send_on,message_type,recipient_kind,recipient_staff_id,status) VALUES($1,$2,GREATEST($3::timestamptz,now()),'staff_reminder','staff',$4,'queued')",
    [uuidv4(), appointmentId, dayBefore, staffId]);
}
function checkAnswerArrays(body) {
  var quick = body.quickAnswers;
  var full = body.fullAnswers;
  if (!Array.isArray(quick) || quick.length !== 2 || !quick.every(function (v) { return v === null || typeof v === "boolean"; })) return false;
  if (!Array.isArray(full) || full.length !== 9 || !full.every(function (v) { return v === null || (Number.isInteger(v) && v >= 0 && v <= 3); })) return false;
  return true;
}

app.get("/", function (req, res) { res.sendFile(path.join(FRONTEND, "welcome.html")); });
app.get("/backend/scoring.js", function (req, res) { res.sendFile(path.join(__dirname, "scoring.js")); });
app.use(express.static(FRONTEND, { index: false, fallthrough: true, maxAge: "1h", setHeaders: function (res, filePath) {
  if (/\.(html|js)$/.test(filePath)) res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
} }));


app.get("/health", async function (req, res) {
  try { await pool.query("SELECT 1"); res.json({ status: "ok" }); }
  catch (error) { routeError(res, error, "HEALTH ERROR"); }
});

app.get("/facilities", async function (req, res) {
  try {
    var district = String(req.query.district || "").trim();
    var rows = await pool.query("SELECT facility_id AS id, name, district, facility_type AS \"facilityType\" FROM facility WHERE is_active = TRUE AND ($1='' OR district=$1) ORDER BY name", [district]);
    res.json(rows.rows);
  } catch (error) { routeError(res, error, "FACILITIES ERROR"); }
});

app.get("/districts", async function (req, res) {
  try {
    var rows = await pool.query("SELECT DISTINCT district AS name FROM facility WHERE is_active=TRUE ORDER BY district");
    res.json(rows.rows);
  } catch (error) { routeError(res, error, "DISTRICTS ERROR"); }
});

app.get("/setup/status", async function (req, res) {
  try {
    var result = await pool.query("SELECT EXISTS (SELECT 1 FROM staff WHERE role='system_admin') AS ready");
    res.json({ setupRequired: !result.rows[0].ready });
  } catch (error) { routeError(res, error, "SETUP STATUS ERROR"); }
});

app.post("/setup/initial-admin", async function (req, res) {
  var body = req.body || {};
  if (!setupSecretMatches(body.setupSecret)) {
    await audit.logAccess(null, "initial_setup_failed", "setup", "initial-admin", req, "denied", body.username);
    return replyError(res, 403, "Setup key is incorrect.");
  }
  var fullName = String(body.fullName || "").trim();
  var contact = String(body.contact || "").trim();
  var username = String(body.username || "").trim();
  if (fullName.length < 2 || fullName.length > 120 || !phone.isRwandaMobile(contact) || !usernameIsValid(username) || !passwordIsValid(body.password)) {
    return replyError(res, 400, "Enter your name, a valid Rwanda mobile number, a username, and a password of at least 12 characters including a letter and a number.");
  }
  try {
    var created = await transaction(async function (client) {
      await client.query("SET LOCAL lock_timeout = '5s'");
      await client.query("SET LOCAL statement_timeout = '20s'");
      await client.query("SELECT pg_advisory_xact_lock(hashtext('ehumure-initial-admin-setup'))");
      var existing = await client.query("SELECT 1 FROM staff WHERE role='system_admin' LIMIT 1");
      if (existing.rowCount) { var e = new Error("Initial setup is already complete."); e.status = 409; throw e; }
      var staffId = uuidv4();
      var hash = bcrypt.hashSync(String(body.password), 12);
      await client.query("INSERT INTO staff(staff_id,full_name,username,role,facility_id,password_hash,contact,is_active) VALUES($1,$2,$3,'system_admin',NULL,$4,$5,TRUE)", [staffId, fullName, username, hash, phone.encryptContact(contact)]);
      return { staffId: staffId };
    });
    await audit.logAccess(created.staffId, "initial_admin_created", "staff", created.staffId, req);
    res.status(201).json({ ok: true });
  } catch (error) {
    if (error.status) return replyError(res, error.status, error.message);
    if (error.code === "23505") return replyError(res, 409, "That username is already in use.");
    routeError(res, error, "INITIAL ADMIN ERROR");
  }
});

app.post("/staff-requests", async function (req, res) {
  var body = req.body || {};
  var facilityId = String(body.facilityId || "").trim().toUpperCase();
  var fullName = String(body.fullName || "").trim();
  var contact = String(body.contact || "").trim();
  var district = String(body.district || "").trim();
  var username = String(body.username || "").trim();
  var role = String(body.role || "");
  if (!facilityId || fullName.length < 2 || fullName.length > 120 || !phone.isRwandaMobile(contact) || district.length < 2 || district.length > 100 || !usernameIsValid(username) || !passwordIsValid(body.password) || ["ncd_nurse", "psychiatric_nurse", "clinical_psychologist"].indexOf(role) < 0) {
    return replyError(res, 400, "Enter your name, a 10-digit Rwanda mobile number, district, facility, role, username, and a password of at least 12 characters including a letter and a number.");
  }
  try {
    var id = uuidv4();
    var hash = bcrypt.hashSync(String(body.password), 12);
    await pool.query("INSERT INTO staff_access_request(request_id,facility_id,full_name,contact,district,username,role,password_hash) SELECT $1,facility_id,$3,$4,district,$5,$6,$7 FROM facility WHERE facility_id=$2 AND district=$8 AND is_active=TRUE", [id, facilityId, fullName, phone.encryptContact(contact), username, role, hash, district]).then(function (result) {
      if (!result.rowCount) { var error = new Error("Choose a facility in the selected district."); error.status = 404; throw error; }
    });
    await audit.logAccess(null, "staff_access_requested", "staff_access_request", id, req, "success", username);
    res.status(201).json({ ok: true, message: "Request submitted. A facility administrator must approve it before you can sign in." });
  } catch (error) {
    if (error.status) return replyError(res, error.status, error.message);
    if (error.code === "23505") return replyError(res, 409, "This username already has a pending request for the selected facility.");
    routeError(res, error, "STAFF REQUEST ERROR");
  }
});

app.post("/login", async function (req, res) {
  var body = req.body || {};
  var username = String(body.username || "").trim();
  var systemAdminLogin = body.loginType === "system_admin";
  var facilityId = systemAdminLogin ? null : String(body.facilityId || "").trim().toUpperCase();
  if (!systemAdminLogin && !facilityId) return replyError(res, 400, "Choose your facility before signing in.");
  var ip = req.socket.remoteAddress || "unknown";
  if (!security.canAttemptLogin(ip, username)) {
    await audit.logAccess(null, "login_rate_limited", "auth", username || "unknown", req, "denied", username);
    return replyError(res, 429, "Too many sign-in attempts. Wait 15 minutes, then try again.");
  }
  try {
    var result = systemAdminLogin
      ? await pool.query("SELECT staff_id,full_name AS name,username,role,facility_id,password_hash AS \"passwordHash\" FROM staff WHERE username=$1 AND role='system_admin' AND facility_id IS NULL AND is_active=TRUE LIMIT 1", [username])
      : await pool.query("SELECT staff_id,full_name AS name,username,role,facility_id,password_hash AS \"passwordHash\" FROM staff WHERE username=$1 AND facility_id=$2 AND role<>'system_admin' AND is_active=TRUE LIMIT 1", [username, facilityId]);
    var user = result.rows[0];
    if (!user || !bcrypt.compareSync(String(body.password || ""), user.passwordHash)) {
      security.recordLoginFailure(ip, username);
      await audit.logAccess(user ? user.staff_id : null, "login_failed", "auth", username || "unknown", req, "denied", username);
      return replyError(res, 401, auth.SAME_LOGIN_ERROR);
    }
    security.clearLoginFailures(ip, username);
    await audit.logAccess(user.staff_id, "login_succeeded", "auth", user.facility_id, req);
    res.json({ token: auth.createToken(user), role: user.role, name: user.name, facilityId: user.facility_id });
  } catch (error) { routeError(res, error, "LOGIN ERROR"); }
});

app.get("/me", auth.requireLogin, async function (req, res) {
  try {
    var facility = req.user.facilityId ? await pool.query("SELECT name FROM facility WHERE facility_id=$1", [req.user.facilityId]) : { rows: [] };
    res.json({ username: req.user.username, role: req.user.role, facilityId: req.user.facilityId || null, facilityName: facility.rows[0] && facility.rows[0].name || null });
  } catch (error) { routeError(res, error, "ME ERROR"); }
});

app.get("/admin/requests", auth.requireLogin, auth.requirePermission("approve_staff"), async function (req, res) {
  try {
    var rows = await pool.query("SELECT r.request_id AS id,r.full_name AS name,r.contact,r.district,r.username,r.role,f.name AS facility_name,r.created_at FROM staff_access_request r JOIN facility f ON f.facility_id=r.facility_id WHERE r.facility_id=$1 AND r.status='pending' ORDER BY r.created_at", [req.user.facilityId]);
    await audit.logAccess(req.user.staffId, "view_staff_requests", "staff_access_request", req.user.facilityId, req);
    res.json(rows.rows.map(function(row){ row.contact=phone.decryptContact(row.contact); return row; }));
  } catch (error) { routeError(res, error, "STAFF REQUEST LIST ERROR"); }
});


app.post("/admin/requests/:id/decision", auth.requireLogin, auth.requirePermission("approve_staff"), async function (req, res) {
  var decision = String((req.body || {}).decision || "");
  if (["approve", "reject"].indexOf(decision) < 0) return replyError(res, 400, "Choose approve or reject.");
  try {
    var row = await transaction(async function (client) {
      var selected = await client.query("SELECT * FROM staff_access_request WHERE request_id=$1 AND facility_id=$2 AND status='pending' FOR UPDATE", [req.params.id, req.user.facilityId]);
      if (!selected.rowCount) { var missing = new Error("Pending request was not found in this facility."); missing.status = 404; throw missing; }
      var request = selected.rows[0];
      if (decision === "approve") {
        await client.query("INSERT INTO staff(staff_id,full_name,contact,username,role,facility_id,password_hash,is_active) VALUES($1,$2,$3,$4,$5,$6,$7,TRUE)", [uuidv4(), request.full_name, request.contact, request.username, request.role, request.facility_id, request.password_hash]);
      }
      await client.query("UPDATE staff_access_request SET status=$2,reviewed_by=$3,reviewed_at=now() WHERE request_id=$1", [request.request_id, decision === "approve" ? "approved" : "rejected", req.user.staffId]);
      return request;
    });
    await audit.logAccess(req.user.staffId, "staff_request_" + decision, "staff_access_request", row.request_id, req);
    res.json({ ok: true });
  } catch (error) {
    if (error.status) return replyError(res, error.status, error.message);
    if (error.code === "23505") return replyError(res, 409, "That username is already registered in this facility.");
    routeError(res, error, "STAFF REQUEST DECISION ERROR");
  }
});

app.post("/patients", auth.requireLogin, auth.requirePermission("create_patient"), async function (req, res) {
  var body = req.body || {};
  var age = Number(body.age);
  var phoneNumber = String(body.phone || "").trim();
  var condition = String(body.condition || "");
  var conditionOther = String(body.conditionOther || "").trim();
  var sector = String(body.sector || "").trim();
  if (!Number.isInteger(age) || age < 18 || age > 120) return replyError(res, 400, "Enter an age from 18 to 120.");
  if (["diabetes", "hypertension", "cardiovascular_disease", "chronic_respiratory_disease", "cancer", "other"].indexOf(condition) < 0) return replyError(res, 400, "Choose a listed non-communicable disease category.");
  if (condition === "other" && (conditionOther.length < 2 || conditionOther.length > 120)) return replyError(res, 400, "Specify the other condition using 2 to 120 characters.");
  if (condition !== "other") conditionOther = "";
  if (!sector || sector.length > 120) return replyError(res, 400, "Enter a sector (up to 120 characters).");
  if (!phone.isRwandaMobile(phoneNumber)) return replyError(res, 400, "Enter a valid 10-digit Rwanda mobile number starting with 072, 073, 078 or 079. Do not include +250.");
  try {
    var patientId = await transaction(async function (client) {
      var seq = await client.query("SELECT nextval('patient_code_seq') AS n");
      var id = "P" + String(seq.rows[0].n).padStart(3, "0");
      await client.query("INSERT INTO patient(patient_id,age,chronic_condition,chronic_condition_other,sector,phone_enc,consent_given_at,facility_id) VALUES($1,$2,$3,$4,$5,$6,NULL,$7)", [id, age, condition, conditionOther || null, sector, phone.encryptPhone(phoneNumber), req.user.facilityId]);
      return id;
    });
    await audit.logAccess(req.user.staffId, "patient_registered", "patient", patientId, req);
    res.status(201).json({ patientId: patientId });
  } catch (error) { routeError(res, error, "PATIENT REGISTRATION ERROR"); }
});

app.get("/patients/search", auth.requireLogin, auth.requirePermission("read_patients"), async function (req, res) {
  var patientId = String(req.query.patientId || "").trim().toUpperCase();
  if (!/^(P[0-9]{3,}|P-[0-9]{4,})$/.test(patientId)) return replyError(res, 400, "Enter a patient code such as P001.");
  try {
    var result = await pool.query("SELECT patient_id AS \"patientId\",age,chronic_condition AS condition,sector,consent_given_at AS \"consentGivenAt\" FROM patient WHERE patient_id=$1 AND facility_id=$2", [patientId, req.user.facilityId]);
    await audit.logAccess(req.user.staffId, "patient_search", "patient", patientId, req, result.rowCount ? "success" : "not_found");
    if (!result.rowCount) return replyError(res, 404, "Patient code not found in this facility.");
    res.json(result.rows[0]);
  } catch (error) { routeError(res, error, "PATIENT SEARCH ERROR"); }
});

app.post("/patients/:patientId/consent", auth.requireLogin, auth.requirePermission("create_patient"), async function (req, res) {
  var patientId = String(req.params.patientId || "").trim().toUpperCase();
  try {
    var result = await pool.query("UPDATE patient SET consent_given_at=now() WHERE patient_id=$1 AND facility_id=$2 RETURNING patient_id", [patientId, req.user.facilityId]);
    if (!result.rowCount) return replyError(res, 404, "Patient code not found in this facility.");
    await audit.logAccess(req.user.staffId, "patient_consent_recorded", "patient", patientId, req);
    res.json({ ok: true });
  } catch (error) { routeError(res, error, "CONSENT ERROR"); }
});

app.get("/screening-drafts", auth.requireLogin, auth.requirePermission("manage_screening_drafts"), async function (req, res) {
  var patientId = String(req.query.patientId || "").trim().toUpperCase();
  try {
    var rows = await pool.query(
      "SELECT d.patient_id AS \"patientId\",d.stage,d.quick_answers AS \"quickAnswers\",d.full_answers AS \"fullAnswers\",d.question_index AS \"questionIndex\",d.updated_at AS \"updatedAt\" " +
      "FROM screening_draft d JOIN patient p ON p.patient_id=d.patient_id " +
      "WHERE d.facility_id=$1 AND p.facility_id=$1 AND d.status='pending' AND ($2='' OR d.patient_id=$2) " +
      "ORDER BY d.updated_at DESC LIMIT 100", [req.user.facilityId, patientId]);
    await audit.logAccess(req.user.staffId, "view_pending_screenings", "screening_draft", patientId || req.user.facilityId, req);
    res.json(rows.rows);
  } catch (error) { routeError(res, error, "DRAFT LIST ERROR"); }
});

app.put("/screening-drafts", auth.requireLogin, auth.requirePermission("manage_screening_drafts"), async function (req, res) {
  var body = req.body || {};
  var patientId = String(body.patientId || "").trim().toUpperCase();
  var stage = String(body.stage || "");
  var index = Number(body.questionIndex);
  if (!/^(P[0-9]{3,}|P-[0-9]{4,})$/.test(patientId) || ["quick", "full"].indexOf(stage) < 0 || !Number.isInteger(index) || index < 0 || index >= (stage === "quick" ? 2 : 9) || !checkAnswerArrays(body)) {
    return replyError(res, 400, "Screening progress is invalid. Refresh the patient and try again.");
  }
  if (stage === "full" && !body.quickAnswers.some(function (answer) { return answer === true; })) return replyError(res, 400, "The full questionnaire can start only after a positive quick screen.");
  try {
    var savedAt = await transaction(async function (client) {
      var patient = await client.query("SELECT patient_id FROM patient WHERE patient_id=$1 AND facility_id=$2 AND consent_given_at IS NOT NULL", [patientId, req.user.facilityId]);
      if (!patient.rowCount) { var missing = new Error("Patient not found in this facility, or consent has not been recorded."); missing.status = 404; throw missing; }
      var current = await client.query("SELECT draft_id FROM screening_draft WHERE patient_id=$1 AND facility_id=$2 AND status='pending' FOR UPDATE", [patientId, req.user.facilityId]);
      if (current.rowCount) {
        await client.query("UPDATE screening_draft SET staff_id=$2,stage=$3,quick_answers=$4,full_answers=$5,question_index=$6,updated_at=now() WHERE draft_id=$1", [current.rows[0].draft_id, req.user.staffId, stage, JSON.stringify(body.quickAnswers), JSON.stringify(body.fullAnswers), index]);
      } else {
        await client.query("INSERT INTO screening_draft(draft_id,patient_id,facility_id,staff_id,stage,quick_answers,full_answers,question_index) VALUES($1,$2,$3,$4,$5,$6,$7,$8)", [uuidv4(), patientId, req.user.facilityId, req.user.staffId, stage, JSON.stringify(body.quickAnswers), JSON.stringify(body.fullAnswers), index]);
      }
      return new Date().toISOString();
    });
    res.json({ ok: true, updatedAt: savedAt });
  } catch (error) {
    if (error.status) return replyError(res, error.status, error.message);
    routeError(res, error, "DRAFT SAVE ERROR");
  }
});

/* Pick the psychiatric nurse at this facility carrying the fewest OPEN alerts.
   The caller must already hold the facility row lock. Returns null when the
   facility has no active psychiatric nurse. */
async function assignLeastLoadedNurse(client, facilityId) {
  var rows = await client.query(
    "SELECT s.staff_id, s.created_at, COUNT(a.alert_id) AS open_alerts " +
    "FROM staff s LEFT JOIN risk_alert a ON a.assigned_staff_id=s.staff_id AND a.status='open' " +
    "WHERE s.facility_id=$1 AND s.role='psychiatric_nurse' AND s.is_active=TRUE " +
    "GROUP BY s.staff_id, s.created_at", [facilityId]);
  var best = routing.pickLeastLoaded(rows.rows.map(function (row) {
    return { staffId: row.staff_id, openAlerts: Number(row.open_alerts), createdAt: row.created_at };
  }));
  return best ? best.staffId : null;
}

/* Pick the clinical psychologist in this district carrying the fewest OPEN
   alerts, preferring the district hospital. Takes a district-wide transaction
   lock so two facilities escalating at the same moment cannot both pick the
   same psychologist. Returns null when the district has none. */
/* Pick the clinical psychologist who should take this case.

   Care stays as close to the patient as possible:
     1. an active psychologist at the patient's OWN facility;
     2. failing that, an active psychologist anywhere in the same district,
        whatever type of facility they work at;
     3. failing that, nobody. The caller leaves the alert open, urgent and
        unassigned, and warns the nurse.

   Within each step the least loaded wins: fewest open alerts, ties broken by
   the oldest account. Facility type carries no weight at all; a health centre
   psychologist is as valid a destination as a district hospital one.

   The advisory lock is held for the whole transaction and is keyed on the
   district, which contains every candidate either step can return. Two
   escalations happening at the same moment therefore queue behind each other
   and cannot both read the same "fewest open alerts" count and pile onto one
   person. */
async function assignLeastLoadedPsychologist(client, facilityId, district) {
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", ["ehumure:district:" + String(district)]);
  var rows = await client.query(
    "SELECT s.staff_id, s.created_at, (s.facility_id=$2) AS same_facility, COUNT(a.alert_id) AS open_alerts " +
    "FROM staff s JOIN facility f ON f.facility_id=s.facility_id " +
    "LEFT JOIN risk_alert a ON a.assigned_staff_id=s.staff_id AND a.status='open' " +
    "WHERE s.role='clinical_psychologist' AND s.is_active=TRUE AND f.is_active=TRUE AND f.district=$1 " +
    "GROUP BY s.staff_id, s.created_at, s.facility_id", [district, facilityId]);
  var candidates = rows.rows.map(function (row) {
    return { staffId: row.staff_id, openAlerts: Number(row.open_alerts), createdAt: row.created_at, sameFacility: row.same_facility === true };
  });
  var best = routing.pickPsychologist(candidates, facilityId);
  return best ? best.staffId : null;
}

app.post("/score", auth.requireLogin, auth.requirePermission("record_screening"), async function (req, res) {
  var body = req.body || {};
  var result;
  try {
    result = body.stage === "quick" ? scoring.scoreQuickQuestions(body.answers) : body.stage === "full" ? scoring.scoreFullQuestionnaire(body.answers) : null;
    if (!result) throw new Error("stage must be quick or full");
  } catch (error) { return replyError(res, 400, error.message); }
  var patientId = String(body.patientId || "").trim().toUpperCase();
  if (!/^(P[0-9]{3,}|P-[0-9]{4,})$/.test(patientId)) return replyError(res, 400, "Enter a valid patient code.");
  try {
    var screenId = uuidv4();
    var alertWarning = null;
    await transaction(async function (client) {
      var patient = await client.query("SELECT patient_id FROM patient WHERE patient_id=$1 AND facility_id=$2 AND consent_given_at IS NOT NULL", [patientId, req.user.facilityId]);
      if (!patient.rowCount) { var missing = new Error("Patient not found in this facility, or consent has not been recorded."); missing.status = 404; throw missing; }
      var severity = result.stage === "full" ? result.severity : null;
      await client.query("INSERT INTO screening(screening_id,patient_id,staff_id,stage,responses,total_score,item9_flag,severity,sync_status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'pending')", [screenId, patientId, req.user.staffId, result.stage, JSON.stringify(body.answers), result.total, result.emergency, severity]);
      // Every routing decision comes from backend/routing.js. See the comment
      // at the top of that file for the agreed rules.
      var route = result.stage === "full"
        ? routing.routeAlert({ total: result.total, item9: body.answers[8], escalated: false })
        : { needsAlert: false };
      if (route.needsAlert) {
        // Lock the facility row so two screenings saved at the same moment
        // cannot both read the same "fewest open alerts" count.
        var facility = await client.query("SELECT district FROM facility WHERE facility_id=$1 FOR UPDATE", [req.user.facilityId]);
        var district = facility.rows[0].district;
        var assigned = await assignLeastLoadedNurse(client, req.user.facilityId);
        var specialist = false;
        if (!assigned) {
          // Availability fallback only: the facility has no active psychiatric
          // nurse, so a psychologist takes it rather than the case being lost.
          // Own facility first, then anywhere in the district.
          assigned = await assignLeastLoadedPsychologist(client, req.user.facilityId, district);
          specialist = true;
        }
        // No one available at all: the alert is still written, unassigned and
        // flagged urgent, so it stays visible instead of disappearing.
        var urgent = route.urgent || (!assigned);
        alertWarning = assigned ? null : (specialist
          ? "No psychiatric nurse or clinical psychologist is available. This alert is open and marked URGENT; tell the facility administrator now."
          : "No one is available to take this alert. It is open and marked URGENT; tell the facility administrator now.");
        await client.query(
          "INSERT INTO risk_alert(alert_id,screening_id,psychologist_id,assigned_staff_id,requires_specialist,risk_level,status,urgent,route_reason) VALUES($1,$2,NULL,$3,$4,$5,'open',$6,$7)",
          [uuidv4(), screenId, assigned, specialist, route.risk, urgent, route.reason]);
      }
      await client.query("UPDATE screening_draft SET status='completed',completed_at=now(),updated_at=now() WHERE patient_id=$1 AND facility_id=$2 AND status='pending'", [patientId, req.user.facilityId]);
    });
    await audit.logAccess(req.user.staffId, "screening_completed", "screening", screenId, req);
    if (alertWarning) result.alertWarning = alertWarning;
    res.json(result);
  } catch (error) {
    if (error.status) return replyError(res, error.status, error.message);
    routeError(res, error, "SCREENING SAVE ERROR");
  }
});

app.get("/screenings", auth.requireLogin, auth.requirePermission("record_screening"), async function (req, res) {
  var patientId = String(req.query.patientId || "").trim().toUpperCase();
  if (patientId && !/^(P[0-9]{3,}|P-[0-9]{4,})$/.test(patientId)) return replyError(res, 400, "Enter a patient code such as P001.");
  try {
    var rows = await pool.query("SELECT s.patient_id,s.stage,s.total_score,s.item9_flag,s.severity,s.screened_at FROM screening s JOIN patient p ON p.patient_id=s.patient_id WHERE p.facility_id=$2 AND ($3='' OR s.patient_id=$3) AND ($3<>'' OR s.staff_id=$1) ORDER BY s.screened_at DESC LIMIT 50", [req.user.staffId, req.user.facilityId, patientId]);
    await audit.logAccess(req.user.staffId, patientId ? "search_patient_screenings" : "view_completed_screenings", "screening", patientId || req.user.facilityId, req);
    res.json(rows.rows);
  } catch (error) { routeError(res, error, "SCREENINGS ERROR"); }
});

app.get("/alerts", auth.requireLogin, auth.requirePermission("read_screening_details"), async function (req, res) {
  if (["psychiatric_nurse", "clinical_psychologist"].indexOf(req.user.role) < 0) return replyError(res, 403, "Only mental-health care staff can access screening alerts.");
  var patientId = String(req.query.patientId || "").trim().toUpperCase();
  if (patientId && !/^(P[0-9]{3,}|P-[0-9]{4,})$/.test(patientId)) return replyError(res, 400, "Enter a patient code such as P001.");
  try {
    var rows = await pool.query(
      "SELECT a.alert_id,a.risk_level,a.status,COALESCE(a.assigned_staff_id,a.psychologist_id) AS assigned_staff_id,a.requires_specialist,a.urgent,a.route_reason,a.escalation_reason,a.escalated_at,escalator.full_name AS escalated_by_name,s.total_score,s.severity,s.item9_flag,s.screened_at,s.patient_id,p.phone_enc,p.sector,f.name AS facility_name,f.district,(SELECT MAX(ap.arrived_at) FROM appointment ap WHERE ap.alert_id=a.alert_id AND ap.status='attended') AS last_attended_at " +
      "FROM risk_alert a JOIN screening s ON s.screening_id=a.screening_id JOIN patient p ON p.patient_id=s.patient_id JOIN facility f ON f.facility_id=p.facility_id " +
      "LEFT JOIN staff escalator ON escalator.staff_id=a.escalated_by " +
      "JOIN staff viewer ON viewer.staff_id=$1 JOIN facility viewer_facility ON viewer_facility.facility_id=viewer.facility_id " +
      "WHERE a.status='open' AND ($2='' OR p.patient_id=$2) AND " + alertVisibility.whereClause("$1") + " " +
      "ORDER BY a.urgent DESC,s.item9_flag DESC,s.total_score DESC,s.screened_at ASC", [req.user.staffId, patientId]);
    await audit.logAccess(req.user.staffId, patientId ? "search_alerts" : "read_alerts", "risk_alert", patientId || req.user.facilityId, req);
    res.json(rows.rows.map(function (row) {
      row.phone = phone.decryptPhone(row.phone_enc); delete row.phone_enc;
      row.assigned_to_me = row.assigned_staff_id === req.user.staffId;
      return row;
    }));
  } catch (error) { routeError(res, error, "ALERTS ERROR"); }
});

/* Claiming an unheld alert.

   A psychiatric nurse claims a non-specialist alert at their own facility.
   A clinical psychologist claims a specialist alert that nobody holds, from
   any facility in their own district. Both are a single conditional UPDATE,
   so if two people claim at the same moment exactly one succeeds and the
   other is told the alert is gone. */
app.post("/alerts/:alertId/assign", auth.requireLogin, auth.requirePermission("read_screening_details"), async function (req, res) {
  if (["psychiatric_nurse", "clinical_psychologist"].indexOf(req.user.role) < 0) {
    return replyError(res, 403, "Only mental-health care staff can claim alerts.");
  }
  try {
    var result = req.user.role === "psychiatric_nurse"
      ? await pool.query(
          "UPDATE risk_alert a SET assigned_staff_id=$1 FROM screening s JOIN patient p ON p.patient_id=s.patient_id " +
          "WHERE a.alert_id=$2 AND a.screening_id=s.screening_id AND p.facility_id=$3 AND a.status='open' AND NOT a.requires_specialist " +
          "AND (COALESCE(a.assigned_staff_id,a.psychologist_id) IS NULL OR COALESCE(a.assigned_staff_id,a.psychologist_id)=$1) RETURNING a.alert_id",
          [req.user.staffId, req.params.alertId, req.user.facilityId])
      : await pool.query(
          "UPDATE risk_alert a SET assigned_staff_id=$1 FROM screening s JOIN patient p ON p.patient_id=s.patient_id " +
          "JOIN facility f ON f.facility_id=p.facility_id JOIN facility viewer_facility ON viewer_facility.facility_id=$3 " +
          "WHERE a.alert_id=$2 AND a.screening_id=s.screening_id AND f.district=viewer_facility.district AND a.status='open' AND a.requires_specialist " +
          "AND (COALESCE(a.assigned_staff_id,a.psychologist_id) IS NULL OR COALESCE(a.assigned_staff_id,a.psychologist_id)=$1) RETURNING a.alert_id",
          [req.user.staffId, req.params.alertId, req.user.facilityId]);
    if (!result.rowCount) return replyError(res, 409, "This alert is no longer available to assign.");
    await audit.logAccess(req.user.staffId, "alert_assigned", "risk_alert", req.params.alertId, req);
    res.json({ ok: true });
  } catch (error) { routeError(res, error, "ALERT ASSIGN ERROR"); }
});

app.post("/alerts/:alertId/escalate", auth.requireLogin, auth.requirePermission("escalate_alert"), async function (req, res) {
  if (req.user.role !== "psychiatric_nurse") return replyError(res, 403, "Only psychiatric nurses can escalate alerts.");
  var reason = String((req.body && req.body.reason) || "").trim();
  if (reason.length < 10 || reason.length > 500) return replyError(res, 400, "Write a short reason for the escalation, from 10 to 500 characters.");
  try {
    var escalated = await transaction(async function (client) {
      var alert = await client.query(
        "SELECT a.alert_id,p.facility_id,f.district,a.status,a.urgent,EXISTS(SELECT 1 FROM appointment ap WHERE ap.alert_id=a.alert_id AND ap.psychologist_id=$3 AND ap.status='attended') AS has_attended " +
        "FROM risk_alert a JOIN screening s ON s.screening_id=a.screening_id JOIN patient p ON p.patient_id=s.patient_id JOIN facility f ON f.facility_id=p.facility_id " +
        "WHERE a.alert_id=$1 AND a.status IN ('open','acknowledged') AND p.facility_id=$2 AND a.assigned_staff_id=$3 AND NOT a.requires_specialist FOR UPDATE OF a", [req.params.alertId, req.user.facilityId, req.user.staffId]);
      if (!alert.rowCount) { var missing = new Error("This alert is no longer assigned to you."); missing.status = 404; throw missing; }
      // The first-visit rule lives in routing.js so the server and the tests
      // read it from the same place. It applies to every escalation, urgent
      // and emergency cases included: there is no exemption.
      var gate = routing.canEscalate({ hasAttendedVisit: alert.rows[0].has_attended });
      if (!gate.allowed) {
        var firstVisit = new Error(gate.reason);
        firstVisit.status = gate.status;
        throw firstVisit;
      }
      var specialistId = await assignLeastLoadedPsychologist(client, alert.rows[0].facility_id, alert.rows[0].district);
      // An escalated case is always urgent. If the district has no psychologist
      // the alert is NOT refused: it moves to the specialist queue unassigned
      // and marked urgent so it stays visible and is never lost.
      await client.query(
        "UPDATE risk_alert SET assigned_staff_id=$2,requires_specialist=TRUE,urgent=TRUE,status='open',route_reason='escalated_by_psychiatric_nurse',escalation_reason=$3,escalated_by=$4,escalated_at=now() WHERE alert_id=$1",
        [req.params.alertId, specialistId, reason, req.user.staffId]);
      return specialistId;
    });
    await audit.logAccess(req.user.staffId, "alert_escalated_to_specialist", "risk_alert", req.params.alertId, req);
    res.json({
      ok: true,
      assignedStaffId: escalated,
      warning: escalated ? null : "No clinical psychologist is active in this district. The case is open and marked URGENT in the specialist queue, where any psychologist registered in this district can claim it; tell the facility administrator now."
    });
  } catch (error) {
    if (error.status) return replyError(res, error.status, error.message);
    routeError(res, error, "ALERT ESCALATION ERROR");
  }
});

app.post("/appointments", auth.requireLogin, auth.requirePermission("book_appointment"), async function (req, res) {
  var body = req.body || {};
  if (!body.patientId || !body.alertId || !body.scheduledFor || !Number.isFinite(Date.parse(body.scheduledFor)) || Date.parse(body.scheduledFor) <= Date.now()) {
    return replyError(res, 400, "Choose a patient alert and a future appointment date and time.");
  }
  try {
    var appointmentId = await transaction(async function (client) {
      var alert = await client.query(
        "SELECT a.alert_id,p.patient_id,p.phone_enc,p.facility_id,f.name AS facility_name FROM risk_alert a JOIN screening s ON s.screening_id=a.screening_id JOIN patient p ON p.patient_id=s.patient_id JOIN facility f ON f.facility_id=p.facility_id " +
        "WHERE a.alert_id=$1 AND p.patient_id=$2 AND a.status='open' AND COALESCE(a.assigned_staff_id,a.psychologist_id)=$4 AND " +
        // Holding the alert is already proof of entitlement, so only the
        // nurse's own-facility rule needs restating here. A psychologist
        // books for whatever facility the case came from.
        "(($5='psychiatric_nurse' AND p.facility_id=$3 AND NOT a.requires_specialist) OR ($5='clinical_psychologist' AND a.requires_specialist)) FOR UPDATE OF a",
        [body.alertId, body.patientId, req.user.facilityId, req.user.staffId, req.user.role]);
      if (!alert.rowCount) { var missing = new Error("This alert is no longer open in your facility."); missing.status = 404; throw missing; }
      var found = alert.rows[0];
      var id = uuidv4();
      await client.query("INSERT INTO appointment(appointment_id,patient_id,psychologist_id,alert_id,scheduled_for,location,kind,status) VALUES($1,$2,$3,$4,$5,$6,'session','scheduled')", [id, found.patient_id, req.user.staffId, found.alert_id, body.scheduledFor, found.facility_name]);
      await client.query("UPDATE risk_alert SET psychologist_id=$1,assigned_staff_id=$1,status='acknowledged' WHERE alert_id=$2", [req.user.staffId, found.alert_id]);
      await queueAppointmentReminders(client, id, body.scheduledFor, req.user.staffId);
      return id;
    });
    await audit.logAccess(req.user.staffId, "appointment_booked", "appointment", appointmentId, req);
    res.status(201).json({
      appointmentId: appointmentId,
      reminderStatus: "queued_for_simulation",
      messagesQueued: ["patient_confirmation", "patient_day_before", "staff_day_before"]
    });
  } catch (error) {
    if (error.status) return replyError(res, error.status, error.message);
    routeError(res, error, "APPOINTMENT BOOKING ERROR");
  }
});

app.get("/appointments", auth.requireLogin, auth.requirePermission("read_screening_details"), async function (req, res) {
  if (["psychiatric_nurse", "clinical_psychologist"].indexOf(req.user.role) < 0) return replyError(res, 403, "Only mental-health care staff can access appointments.");
  var patientId = String(req.query.patientId || "").trim().toUpperCase();
  if (patientId && !/^(P[0-9]{3,}|P-[0-9]{4,})$/.test(patientId)) return replyError(res, 400, "Enter a patient code such as P001.");
  try {
    var rows = await pool.query("SELECT a.appointment_id,a.alert_id,a.patient_id,a.scheduled_for,a.location,a.status,a.arrived_at,ra.requires_specialist,ra.escalation_reason,p.phone_enc,f.name AS facility_name,f.district FROM appointment a JOIN risk_alert ra ON ra.alert_id=a.alert_id JOIN patient p ON p.patient_id=a.patient_id JOIN facility f ON f.facility_id=p.facility_id WHERE a.psychologist_id=$1 AND ($2='' OR a.patient_id=$2) ORDER BY a.scheduled_for ASC", [req.user.staffId, patientId]);
    await audit.logAccess(req.user.staffId, patientId ? "search_appointments" : "read_appointments", "appointment", patientId || req.user.facilityId, req);
    res.json(rows.rows.map(function (row) { row.phone = phone.decryptPhone(row.phone_enc); delete row.phone_enc; return row; }));
  } catch (error) { routeError(res, error, "APPOINTMENTS ERROR"); }
});

app.patch("/appointments/:appointmentId/outcome", auth.requireLogin, auth.requirePermission("book_appointment"), async function (req, res) {
  if (["psychiatric_nurse", "clinical_psychologist"].indexOf(req.user.role) < 0) return replyError(res, 403, "Only mental-health care staff can update appointments.");
  var outcome = String((req.body && req.body.outcome) || "");
  if (["attended", "missed"].indexOf(outcome) < 0) return replyError(res, 400, "Choose attended or missed.");
  try {
    var result = await pool.query("UPDATE appointment SET status=$3,arrived_at=CASE WHEN $3='attended' THEN now() ELSE NULL END WHERE appointment_id=$1 AND psychologist_id=$2 AND status='scheduled' RETURNING appointment_id,alert_id,status,arrived_at", [req.params.appointmentId, req.user.staffId, outcome]);
    if (!result.rowCount) return replyError(res, 409, "This appointment is not yours or is no longer scheduled.");
    await audit.logAccess(req.user.staffId, "appointment_marked_" + outcome, "appointment", req.params.appointmentId, req);
    res.json({ ok: true, appointment: result.rows[0] });
  } catch (error) { routeError(res, error, "APPOINTMENT OUTCOME ERROR"); }
});

app.patch("/appointments/:appointmentId/reschedule", auth.requireLogin, auth.requirePermission("book_appointment"), async function (req, res) {
  if (["psychiatric_nurse", "clinical_psychologist"].indexOf(req.user.role) < 0) return replyError(res, 403, "Only mental-health care staff can reschedule appointments.");
  var scheduledFor = (req.body || {}).scheduledFor;
  if (!scheduledFor || !Number.isFinite(Date.parse(scheduledFor)) || Date.parse(scheduledFor) <= Date.now()) return replyError(res, 400, "Choose a future appointment date and time.");
  try {
    await transaction(async function (client) {
      var found = await client.query("SELECT appointment_id FROM appointment WHERE appointment_id=$1 AND psychologist_id=$2 AND status IN ('scheduled','missed') FOR UPDATE", [req.params.appointmentId, req.user.staffId]);
      if (!found.rowCount) { var missing = new Error("This appointment is not yours or is no longer scheduled."); missing.status = 404; throw missing; }
      await client.query("UPDATE appointment SET scheduled_for=$2,status='scheduled' WHERE appointment_id=$1", [req.params.appointmentId, new Date(scheduledFor).toISOString()]);
      await client.query("UPDATE sms_reminder SET status='cancelled',last_error='Superseded by appointment reschedule' WHERE appointment_id=$1 AND status='queued'", [req.params.appointmentId]);
      await queueAppointmentReminders(client, req.params.appointmentId, scheduledFor, req.user.staffId);
    });
    await audit.logAccess(req.user.staffId, "appointment_rescheduled", "appointment", req.params.appointmentId, req);
    res.json({ ok: true, reminderStatus: "queued_for_simulation" });
  } catch (error) { if (error.status) return replyError(res, error.status, error.message); routeError(res, error, "APPOINTMENT RESCHEDULE ERROR"); }
});

app.post("/appointments/:appointmentId/follow-up", auth.requireLogin, auth.requirePermission("book_appointment"), async function (req, res) {
  if (["psychiatric_nurse", "clinical_psychologist"].indexOf(req.user.role) < 0) return replyError(res, 403, "Only mental-health care staff can book follow-up appointments.");
  var scheduledFor = (req.body || {}).scheduledFor;
  if (!scheduledFor || !Number.isFinite(Date.parse(scheduledFor)) || Date.parse(scheduledFor) <= Date.now()) return replyError(res, 400, "Choose a future appointment date and time.");
  try {
    var appointmentId = await transaction(async function (client) {
      var source = await client.query("SELECT ap.patient_id,ap.alert_id,ap.location FROM appointment ap JOIN risk_alert a ON a.alert_id=ap.alert_id WHERE ap.appointment_id=$1 AND ap.psychologist_id=$2 AND ap.status='attended' AND COALESCE(a.assigned_staff_id,a.psychologist_id)=$2 AND a.status='acknowledged' FOR UPDATE OF a", [req.params.appointmentId, req.user.staffId]);
      if (!source.rowCount) { var missing = new Error("Mark your first appointment as attended before booking a follow-up."); missing.status = 409; throw missing; }
      var id = uuidv4(); var previous = source.rows[0];
      await client.query("INSERT INTO appointment(appointment_id,patient_id,psychologist_id,alert_id,scheduled_for,location,kind,status) VALUES($1,$2,$3,$4,$5,$6,'session','scheduled')", [id, previous.patient_id, req.user.staffId, previous.alert_id, new Date(scheduledFor).toISOString(), previous.location]);
      await queueAppointmentReminders(client, id, scheduledFor, req.user.staffId);
      return id;
    });
    await audit.logAccess(req.user.staffId, "follow_up_appointment_booked", "appointment", appointmentId, req);
    res.status(201).json({ ok: true, appointmentId: appointmentId, reminderStatus: "queued_for_simulation" });
  } catch (error) { if (error.status) return replyError(res, error.status, error.message); routeError(res, error, "FOLLOW-UP APPOINTMENT ERROR"); }
});

app.get("/admin/audit", auth.requireLogin, auth.requirePermission("read_audit"), async function (req, res) {
  if (req.user.role !== "system_admin") return replyError(res, 403, "The system-wide audit log is only available to the system administrator.");
  try {
    var sql = "SELECT a.action,a.record_type,a.record_id,a.actor_label,a.outcome,a.ip_address,a.occurred_at,s.full_name AS staff_name,f.name AS facility_name " +
      "FROM audit_log a LEFT JOIN staff s ON s.staff_id=a.staff_id LEFT JOIN facility f ON f.facility_id=a.facility_id " +
      "ORDER BY a.occurred_at DESC LIMIT 200";
    var rows = await pool.query(sql);
    await audit.logAccess(req.user.staffId, "read_audit_log", "audit_log", req.user.facilityId, req);
    res.json(rows.rows);
  } catch (error) { routeError(res, error, "AUDIT LOG ERROR"); }
});

/* ---------------------------------------------------------------------------
   A hospital or clinic head registers their own facility.
   The request stays pending until a system administrator approves it. Nothing
   is created in the facility or staff tables until then, so an unapproved
   facility can never appear in the staff sign-up dropdown and its head cannot
   sign in.
--------------------------------------------------------------------------- */
app.post("/facility-requests", async function (req, res) {
  var body = req.body || {};
  var facilityName = String(body.facilityName || "").trim();
  var district = String(body.district || "").trim();
  var facilityType = String(body.facilityType || "");
  var contact = String(body.contact || "").trim();
  var adminName = String(body.adminName || "").trim();
  var username = String(body.username || "").trim();
  if (facilityName.length < 2 || facilityName.length > 120 || district.length < 2 || district.length > 100 ||
      !validFacilityType(facilityType) || !isValidStaffContact(contact) ||
      adminName.length < 2 || adminName.length > 120 || !usernameIsValid(username) || !passwordIsValid(body.password)) {
    return replyError(res, 400, "Enter the facility name, district and type, a valid Rwanda mobile number, your name and username, and a password with at least 12 characters including a letter and a number.");
  }
  try {
    var id = uuidv4();
    await pool.query(
      "INSERT INTO facility_request(request_id,facility_name,district,facility_type,contact,admin_full_name,username,password_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
      [id, facilityName, district, facilityType, phone.encryptContact(contact), adminName, username, bcrypt.hashSync(String(body.password), 12)]);
    await audit.logAccess(null, "facility_registration_requested", "facility_request", id, req, "success", username);
    res.status(201).json({ ok: true, message: "Request submitted. A system administrator must approve it before you can sign in. Your facility code is issued when the request is approved." });
  } catch (error) {
    if (error.code === "23505") return replyError(res, 409, "A request for that facility name or username is already waiting for review.");
    routeError(res, error, "FACILITY REQUEST ERROR");
  }
});

app.get("/admin/facility-requests", auth.requireLogin, auth.requirePermission("approve_facility_requests"), async function (req, res) {
  try {
    var rows = await pool.query(
      "SELECT request_id AS id,facility_name,district,facility_type,contact,admin_full_name,username,created_at FROM facility_request WHERE status='pending' ORDER BY created_at");
    await audit.logAccess(req.user.staffId, "view_facility_requests", "facility_request", "pending", req);
    res.json(rows.rows.map(function (row) { row.contact = phone.decryptContact(row.contact); return row; }));
  } catch (error) { routeError(res, error, "FACILITY REQUEST LIST ERROR"); }
});

app.post("/admin/facility-requests/:requestId/decision", auth.requireLogin, auth.requirePermission("approve_facility_requests"), async function (req, res) {
  var decision = String((req.body && req.body.decision) || "");
  if (["approve", "reject"].indexOf(decision) < 0) return replyError(res, 400, "Choose approve or reject.");
  try {
    var outcome = await transaction(async function (client) {
      var found = await client.query("SELECT * FROM facility_request WHERE request_id=$1 AND status='pending' FOR UPDATE", [req.params.requestId]);
      if (!found.rowCount) { var missing = new Error("That request is no longer waiting for review."); missing.status = 404; throw missing; }
      var request = found.rows[0];
      if (decision === "reject") {
        await client.query("UPDATE facility_request SET status='rejected',reviewed_by=$2,reviewed_at=now() WHERE request_id=$1", [req.params.requestId, req.user.staffId]);
        return { approved: false, facilityId: null };
      }
      // Approved: the facility and its first administrator are created now, and
      // the facility code is generated the same way as everywhere else.
      var facilityId = await nextFacilityCode(client, request.facility_name);
      await client.query("INSERT INTO facility(facility_id,name,district,facility_type,contact) VALUES($1,$2,$3,$4,$5)",
        [facilityId, request.facility_name, request.district, request.facility_type, request.contact]);
      await client.query("INSERT INTO staff(staff_id,full_name,username,role,facility_id,password_hash,contact,is_active) VALUES($1,$2,$3,'facility_admin',$4,$5,$6,TRUE)",
        [uuidv4(), request.admin_full_name, request.username, facilityId, request.password_hash, request.contact]);
      await client.query("UPDATE facility_request SET status='approved',reviewed_by=$2,reviewed_at=now(),facility_id=$3 WHERE request_id=$1",
        [req.params.requestId, req.user.staffId, facilityId]);
      return { approved: true, facilityId: facilityId };
    });
    await audit.logAccess(req.user.staffId, outcome.approved ? "facility_request_approved" : "facility_request_rejected", "facility_request", req.params.requestId, req);
    res.json({
      ok: true,
      approved: outcome.approved,
      facilityId: outcome.facilityId,
      message: outcome.approved
        ? "Facility approved. Its code is " + outcome.facilityId + ". Give this code to the facility head; staff can now request access to it."
        : "Request rejected. Nothing was created."
    });
  } catch (error) {
    if (error.status) return replyError(res, error.status, error.message);
    if (error.code === "23505") return replyError(res, 409, "That facility name or username is already in use by an existing facility.");
    routeError(res, error, "FACILITY REQUEST DECISION ERROR");
  }
});

/* ---------------------------------------------------------------------------
   System administrator: the supervisor's view across every facility.
   Counts and roles only. No patient codes, no answers, no phone numbers.
--------------------------------------------------------------------------- */
app.get("/system/overview", auth.requireLogin, auth.requirePermission("read_system_overview"), async function (req, res) {
  try {
    var facilities = await pool.query(
      "SELECT f.facility_id,f.name,f.district,f.facility_type,f.is_active FROM facility f ORDER BY f.district,f.name");
    var staff = await pool.query(
      "SELECT s.staff_id,s.full_name,s.role,s.facility_id,s.is_active FROM staff s WHERE s.role<>'system_admin' ORDER BY s.facility_id,s.role,s.full_name");
    var pending = await pool.query(
      "SELECT r.request_id,r.full_name,r.role,r.facility_id,r.created_at FROM staff_access_request r WHERE r.status='pending' ORDER BY r.created_at");

    var byFacility = {};
    facilities.rows.forEach(function (row) {
      byFacility[row.facility_id] = {
        facilityId: row.facility_id,
        name: row.name,
        district: row.district,
        facilityType: row.facility_type,
        isActive: row.is_active,
        administrators: [],
        staff: []
      };
    });
    staff.rows.forEach(function (row) {
      var facility = byFacility[row.facility_id];
      if (!facility) return;
      var entry = {
        staffId: row.staff_id,
        fullName: row.full_name,
        role: row.role,
        status: row.role === "disabled" || !row.is_active ? "disabled" : "approved"
      };
      if (row.role === "facility_admin") facility.administrators.push(entry);
      else facility.staff.push(entry);
    });
    pending.rows.forEach(function (row) {
      var facility = byFacility[row.facility_id];
      if (!facility) return;
      facility.staff.push({ staffId: null, fullName: row.full_name, role: row.role, status: "pending", requestedAt: row.created_at });
    });

    await audit.logAccess(req.user.staffId, "read_system_overview", "facility", "all", req);
    res.json({ facilities: Object.keys(byFacility).map(function (key) { return byFacility[key]; }) });
  } catch (error) { routeError(res, error, "SYSTEM OVERVIEW ERROR"); }
});

/* ---------------------------------------------------------------------------
   Facility administrator: counts for their own facility only.
   Deliberately no patient codes and no answers, as required by permissions.js.
--------------------------------------------------------------------------- */
app.get("/facility/summary", auth.requireLogin, auth.requirePermission("read_facility_summary"), async function (req, res) {
  var facilityId = req.user.role === "system_admin" && req.query.facilityId
    ? String(req.query.facilityId).trim().toUpperCase()
    : req.user.facilityId;
  try {
    var screenings = await pool.query(
      "SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE s.stage='full')::int AS phq9, COUNT(*) FILTER (WHERE s.stage='quick')::int AS whooley_only " +
      "FROM screening s JOIN patient p ON p.patient_id=s.patient_id WHERE p.facility_id=$1", [facilityId]);

    var perNurse = await pool.query(
      "SELECT st.full_name, COUNT(s.screening_id)::int AS screenings " +
      "FROM staff st LEFT JOIN screening s ON s.staff_id=st.staff_id " +
      "LEFT JOIN patient p ON p.patient_id=s.patient_id AND p.facility_id=$1 " +
      "WHERE st.facility_id=$1 AND st.role='ncd_nurse' AND st.is_active=TRUE " +
      "GROUP BY st.staff_id, st.full_name ORDER BY screenings DESC, st.full_name", [facilityId]);

    var bySeverity = await pool.query(
      "SELECT s.severity, COUNT(*)::int AS count FROM screening s JOIN patient p ON p.patient_id=s.patient_id " +
      "WHERE p.facility_id=$1 AND s.stage='full' GROUP BY s.severity", [facilityId]);

    var alerts = await pool.query(
      "SELECT COUNT(*)::int AS total, " +
      "COUNT(*) FILTER (WHERE a.status='open')::int AS open, " +
      "COUNT(*) FILTER (WHERE a.status='closed')::int AS closed, " +
      "COUNT(*) FILTER (WHERE a.urgent AND a.status='open')::int AS urgent_open, " +
      "COUNT(*) FILTER (WHERE a.assigned_staff_id IS NULL AND a.status='open')::int AS unassigned_open, " +
      "COUNT(*) FILTER (WHERE NOT a.requires_specialist)::int AS to_psychiatric_nurse, " +
      "COUNT(*) FILTER (WHERE a.requires_specialist)::int AS to_psychologist, " +
      "COUNT(*) FILTER (WHERE a.escalated_at IS NOT NULL)::int AS escalated " +
      "FROM risk_alert a JOIN screening s ON s.screening_id=a.screening_id JOIN patient p ON p.patient_id=s.patient_id " +
      "WHERE p.facility_id=$1", [facilityId]);

    // Open alerts carried by each psychiatric nurse at this facility, and by
    // each psychologist handling this facility's escalations.
    var load = await pool.query(
      "SELECT st.full_name, st.role, COUNT(a.alert_id) FILTER (WHERE a.status='open')::int AS open_alerts " +
      "FROM staff st LEFT JOIN risk_alert a ON a.assigned_staff_id=st.staff_id " +
      "LEFT JOIN screening s ON s.screening_id=a.screening_id LEFT JOIN patient p ON p.patient_id=s.patient_id " +
      "WHERE st.is_active=TRUE AND st.role IN ('psychiatric_nurse','clinical_psychologist') " +
      "AND (st.facility_id=$1 OR p.facility_id=$1) " +
      "GROUP BY st.staff_id, st.full_name, st.role ORDER BY st.role, open_alerts DESC, st.full_name", [facilityId]);

    var appointments = await pool.query(
      "SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE ap.scheduled_for>now())::int AS upcoming, " +
      "COUNT(*) FILTER (WHERE ap.status='attended')::int AS attended " +
      "FROM appointment ap JOIN patient p ON p.patient_id=ap.patient_id WHERE p.facility_id=$1", [facilityId]);

    var severityCounts = { minimal: 0, mild: 0, moderate: 0, moderately_severe: 0, severe: 0 };
    bySeverity.rows.forEach(function (row) { if (row.severity) severityCounts[row.severity] = row.count; });

    await audit.logAccess(req.user.staffId, "read_facility_summary", "facility", facilityId, req);
    res.json({
      facilityId: facilityId,
      screenings: screenings.rows[0],
      screeningsPerNurse: perNurse.rows,
      phq9BySeverity: severityCounts,
      alerts: alerts.rows[0],
      openAlertsPerSpecialist: load.rows,
      appointments: appointments.rows[0],
      warning: Number(alerts.rows[0].unassigned_open) > 0
        ? "Some open alerts have nobody assigned. Register a psychiatric nurse or a district psychologist now."
        : null
    });
  } catch (error) { routeError(res, error, "FACILITY SUMMARY ERROR"); }
});

/* Follow-up note on an alert. Written by whoever currently holds the alert. */
app.post("/alerts/:alertId/note", auth.requireLogin, auth.requirePermission("add_alert_note"), async function (req, res) {
  var note = String((req.body && req.body.note) || "").trim();
  if (note.length < 3 || note.length > 1000) return replyError(res, 400, "Write a note from 3 to 1000 characters.");
  try {
    var alert = await pool.query(
      "SELECT a.alert_id FROM risk_alert a WHERE a.alert_id=$1 AND COALESCE(a.assigned_staff_id,a.psychologist_id)=$2", [req.params.alertId, req.user.staffId]);
    if (!alert.rowCount) return replyError(res, 404, "This alert is not assigned to you.");
    await pool.query("INSERT INTO alert_note(note_id,alert_id,staff_id,note) VALUES($1,$2,$3,$4)", [uuidv4(), req.params.alertId, req.user.staffId, note]);
    await audit.logAccess(req.user.staffId, "alert_note_added", "risk_alert", req.params.alertId, req);
    res.status(201).json({ ok: true });
  } catch (error) { routeError(res, error, "ALERT NOTE ERROR"); }
});

app.get("/alerts/:alertId/notes", auth.requireLogin, auth.requirePermission("add_alert_note"), async function (req, res) {
  try {
    var rows = await pool.query(
      "SELECT n.note_id,(n.staff_id=$2) AS can_edit,n.note,n.created_at,st.full_name FROM alert_note n JOIN staff st ON st.staff_id=n.staff_id " +
      "JOIN risk_alert a ON a.alert_id=n.alert_id WHERE n.alert_id=$1 AND COALESCE(a.assigned_staff_id,a.psychologist_id)=$2 ORDER BY n.created_at DESC",
      [req.params.alertId, req.user.staffId]);
    res.json(rows.rows);
  } catch (error) { routeError(res, error, "ALERT NOTES ERROR"); }
});

app.patch("/alerts/:alertId/notes/:noteId", auth.requireLogin, auth.requirePermission("add_alert_note"), async function (req, res) {
  var note = String((req.body && req.body.note) || "").trim();
  if (note.length < 3 || note.length > 1000) return replyError(res, 400, "Write a note from 3 to 1000 characters.");
  try {
    var result = await pool.query(
      "UPDATE alert_note n SET note=$3 FROM risk_alert a WHERE n.note_id=$1 AND n.alert_id=$2 AND a.alert_id=n.alert_id AND n.staff_id=$4 AND COALESCE(a.assigned_staff_id,a.psychologist_id)=$4 RETURNING n.note_id",
      [req.params.noteId, req.params.alertId, note, req.user.staffId]);
    if (!result.rowCount) return replyError(res, 404, "This note is not yours or the case is no longer assigned to you.");
    await audit.logAccess(req.user.staffId, "alert_note_edited", "risk_alert", req.params.alertId, req);
    res.json({ ok: true });
  } catch (error) { routeError(res, error, "ALERT NOTE EDIT ERROR"); }
});

/* Mark an alert handled. Only a clinical psychologist closes a case. */
app.post("/alerts/:alertId/handled", auth.requireLogin, auth.requirePermission("close_alert"), async function (req, res) {
  try {
    var result = await pool.query(
      "UPDATE risk_alert SET status='closed',closed_by=$2,closed_at=now() WHERE alert_id=$1 AND status<>'closed' AND COALESCE(assigned_staff_id,psychologist_id)=$2 RETURNING alert_id",
      [req.params.alertId, req.user.staffId]);
    if (!result.rowCount) return replyError(res, 404, "This alert is not assigned to you, or it is already closed.");
    await audit.logAccess(req.user.staffId, "alert_marked_handled", "risk_alert", req.params.alertId, req);
    res.json({ ok: true });
  } catch (error) { routeError(res, error, "ALERT HANDLED ERROR"); }
});

/* ---------------------------------------------------------------------------
   Anything that reaches here is an unknown API path or an unhandled throw.
   Both answer with JSON and a correct status. The server never crashes on a
   bad request.
--------------------------------------------------------------------------- */
app.use(function (req, res, next) {
  if (req.method === "GET" && req.accepts("html")) return next();
  replyError(res, 404, "That address does not exist on this server.");
});

app.use(function (error, req, res, next) {
  if (error && error.type === "entity.parse.failed") return replyError(res, 400, "The request body was not valid JSON.");
  if (error && error.type === "entity.too.large") return replyError(res, 413, "That request is too large.");
  console.error("UNHANDLED ERROR", error && error.stack ? error.stack : error);
  if (res.headersSent) return;
  replyError(res, 500, "The request could not be completed. Check the server log or try again.");
});

process.on("unhandledRejection", function (reason) {
  console.error("UNHANDLED PROMISE REJECTION", reason && reason.stack ? reason.stack : reason);
});


var smsWorkerProcess = null;
var shuttingDown = false;

if (require.main === module) {
  var server = app.listen(PORT, BIND_HOST, function () {
    console.log("e-Humure is available on the facility network at port " + PORT);
    console.log("Open e-Humure on this computer: http://localhost:" + PORT + "/");

    console.log("Starting e-Humure SMS worker...");
    smsWorkerProcess = spawn(process.execPath, [path.join(__dirname, "sms-worker.js")], {
      stdio: "inherit"
    });

    smsWorkerProcess.on("error", function (error) {
      console.error("Could not start SMS worker:", error.message);
    });

    smsWorkerProcess.on("exit", function (code, signal) {
      if (code !== 0 && !shuttingDown) {
        console.error("SMS worker exited unexpectedly:", code || signal);
      }
    });
  });

  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(signal + " received. Shutting down e-Humure...");

    if (smsWorkerProcess && !smsWorkerProcess.killed) {
      smsWorkerProcess.kill(signal);
    }

    server.close(async function () {
      try {
        await pool.end();
        console.log("e-Humure shut down successfully.");
        process.exit(0);
      } catch (error) {
        console.error("Shutdown error:", error.message);
        process.exit(1);
      }
    });
  }

  process.on("SIGTERM", function () { shutdown("SIGTERM"); });
  process.on("SIGINT", function () { shutdown("SIGINT"); });
}

<<<<<<< Updated upstream
=======

>>>>>>> Stashed changes
module.exports = app;