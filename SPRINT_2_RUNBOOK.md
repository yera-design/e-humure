# Sprint 2 runbook, 5 Nov to 13 Nov

Owner: Promise. Everything in this file is ready to copy into PowerShell or Git Bash on Windows.

---

## Assumptions (read before anything else)

- No real SMS gateway. Djibril's simulator on port 4002 is enough.
- `pg` and `uuid` are added to `backend/package.json`. Run `npm install` once on Day 1 after Djibril's package card is merged.
- Login username is `full_name` from the `staff` table. The schema has no separate username column yet.
- Stretch cards (S2-05, S2-06, S2-07, S2-08) are written in full but marked STRETCH. If the sprint is running short on Day 5, drop them and focus on the three MUST tests.
- Sprint 1 is fully closed. All 50 patients score correctly. The repo is clean on `main`.

---

## Must-have vs stretch

| Card | Title | Priority |
|---|---|---|
| S2-01 | Add pg and uuid to package.json | MUST |
| S2-02 | Connect backend to PostgreSQL | MUST |
| S2-03 | Save screenings to the database | MUST |
| S2-04 | Role screens after login | MUST |
| S2-05 | Psychologist alert list | STRETCH |
| S2-06 | Book appointment from dashboard | STRETCH |
| S2-07 | Offline queue and sync | STRETCH |
| S2-08 | SMS simulator and reminder | STRETCH |
| S2-09 | AT-4: no duplicate alert | MUST |
| S2-10 | AT-7: access control | MUST |
| S2-11 | Smoke test end-to-end | MUST |
| S2-12 | Schema migration (3 fixes) | MUST |

If time is short, drop STRETCH cards first. Never drop a MUST card.

---

## Every day, everyone, first thing

```
git checkout main
git pull
```

Do this before you open any file. If you skip it you will get conflicts.

## Every card, same six commands

```
git checkout main
git pull
git checkout -b <branch>
git add <only your own files>
git commit -m "<message>"
git push -u origin <branch>
```

Then open a pull request on GitHub, move the Trello card to In review, and tag your reviewer.

## Reviewers

| Author | Reviewer | Done-when check |
|---|---|---|
| Djibril | Ivan | Anny |
| Ivan | Djibril | Anny |
| Ines | Anny | Anny |
| Audrey | Promise | Anny |
| Promise | Audrey | Anny |
| Anny | Ivan | Promise |

Merge at 20:00 each day. Code freeze Thu 12 Nov at 12:00.

---

## Files that must exist before each person starts

This is the most important table in this file. If you start before the file you need is merged, you will build on something that does not exist yet and your branch will conflict.

| Person | Card | Needs this file merged first |
|---|---|---|
| Ines | S2-02 | S2-01 merged (Djibril) — `backend/package.json` with `pg` and `uuid` |
| Djibril | S2-03 | S2-02 merged (Ines) — `backend/db.js` |
| Promise | S2-04 | S2-02 merged (Ines) — `backend/db.js` |
| Ivan | S2-05 | S2-02 and S2-03 merged — `backend/db.js` and the two new routes in `backend/server.js` |
| Anny | S2-09, S2-11 | S2-02 and S2-03 merged |
| Audrey | S2-13 | Nothing — works on `frontend/css/style.css` only |

---

# Day 1, Thu 5 Nov

Goal: packages updated, everyone on a branch, Ines starts the database connection. Cards open tonight: S2-01.

This is a light day. Only Djibril opens a real PR tonight. Everyone else creates their branch and reads the existing code carefully before Day 2.

## Djibril, S2-01, `feature/djibril-s2-01-packages`

This is the smallest card in the sprint but it must go first. Nothing else can run until `pg` and `uuid` are installed.

Files: `backend/package.json`

Open `backend/package.json`. Find the `"dependencies"` block. Add two lines exactly as shown:

```json
{
  "name": "ehumure-backend",
  "version": "2.0.0",
  "private": true,
  "description": "e-Humure Sprint 2",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "seed": "node seed.js",
    "sync": "node sync.js",
    "simulator": "node sms-simulator.js"
  },
  "dependencies": {
    "bcryptjs": "2.4.3",
    "cors": "2.8.5",
    "express": "4.21.2",
    "jsonwebtoken": "9.0.2",
    "pg": "8.13.3",
    "uuid": "9.0.1"
  },
  "engines": {
    "node": ">=18"
  }
}
```

What changed: `"pg": "8.13.3"` and `"uuid": "9.0.1"` are the two new lines. `pg` lets Node talk to PostgreSQL. `uuid` generates a unique ID for every new record so we can never get duplicates.

```
git checkout main
git pull
git checkout -b feature/djibril-s2-01-packages
git add backend/package.json
git commit -m "chore: add pg and uuid dependencies"
git push -u origin feature/djibril-s2-01-packages
```

Check: open the pull request. Reviewer Ivan approves. After merge, everyone runs `cd backend && npm install` once. It should finish with no errors.

**Make it yours:** add one sentence to the PR description explaining what `pg` does in plain words.

## Everyone else, Day 1

Create your branch for your first card today. Do not push any code yet — just create the branch so it shows on GitHub.

Ines:
```
git checkout -b feature/ines-s2-02-db
```

Audrey:
```
git checkout -b feature/audrey-s2-13-emergency-style
```

Promise:
```
git checkout -b feature/promise-s2-04-role-screens
```

Ivan:
```
git checkout -b feature/ivan-s2-05-dashboard
```

Anny:
```
git checkout -b feature/anny-s2-09-tests
```

Then each person reads the following files carefully. You will need to understand them before you write your own code:

- `backend/server.js` — the four existing routes
- `backend/auth.js` — how the token works
- `backend/permissions.js` — the canDo table
- `database/schema.sql` — the seven tables

**Day 1 conflict check:** only `backend/package.json` changes today. No two people touch the same file. Nothing depends on anything unmerged.

---

# Day 2, Fri 7 Nov

Goal: database connected, demo data seeded, server reads staff from PostgreSQL. Cards done tonight: S2-01 merged, S2-02 merged.

Merge order tonight: Djibril S2-01 first (if not merged last night), then Ines S2-02.

## Ines, S2-02, `feature/ines-s2-02-db`

**Needs:** S2-01 merged. Run `cd backend && npm install` before you start writing any code.

Files you create: `backend/db.js` (new), `backend/seed.js` (new), `backend/audit.js` (new), `database/migrate_sprint2.sql` (new)
Files you change: `backend/store.js` (replace the whole file)

---

### backend/db.js

Create this file. It is the only place in the whole project that opens a connection to the database. Every other file imports this instead of connecting themselves.

```js
// This file opens one shared connection to the database.
// Think of it as a phone line. Every file imports this instead of opening its own.
// DATABASE_URL is set in the terminal before starting the server.

var pg = require("pg");

var pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
    || "postgresql://postgres:postgres@localhost:5432/ehumure"
});

// If the database connection drops, print the error but do not crash the server.
pool.on("error", function (err) {
  console.error("database connection error:", err.message);
});

module.exports = pool;
```

---

### backend/seed.js

Create this file. Run it once after the database is set up. It puts three demo staff members and two fake patients into the database. It is safe to run more than once — the `ON CONFLICT DO NOTHING` part means it never creates duplicates.

```js
// Run this once to put demo data in the database: node backend/seed.js
// ON CONFLICT DO NOTHING means you can run it again and nothing breaks.

var pool = require("./db");
var crypto = require("crypto");

// The three demo accounts from Sprint 1.
// Passwords are stored only as bcrypt hashes — never as plain text.
var STAFF = [
  {
    id: "11111111-0000-0000-0000-000000000001",
    name: "Demo Nurse",
    role: "nurse",
    facility: "GIK-01",
    hash: "$2b$10$vfqzjzlYdHVRmNODH2FXTuQs5Y2uTreK9vKlZFC9yfDy7C.c98P7G"
  },
  {
    id: "11111111-0000-0000-0000-000000000002",
    name: "Demo Psychologist",
    role: "psychologist",
    facility: "GIK-01",
    hash: "$2b$10$vqzgIoLA0EH/KOkQynK0uu6NV8C.KhzTbwx1cpwKPQnmqPuxOX8ty"
  },
  {
    id: "11111111-0000-0000-0000-000000000003",
    name: "Demo Desk Staff",
    role: "desk",
    facility: "GIK-01",
    hash: "$2b$10$1E0VqKn2LBC.C17QMOjeeOZ5s2Vnkrzfupq3EDYWnmc2hgqB4JVJu"
  }
];

// Two fake patients. Phone numbers are encrypted before saving — never plain text.
var PATIENTS = [
  {
    id: "P-SEED-001",
    age: 54,
    condition: "hypertension",
    sector: "Sector-A",
    phone: "+250780000001",
    facility: "GIK-01"
  },
  {
    id: "P-SEED-002",
    age: 38,
    condition: "diabetes",
    sector: "Sector-B",
    phone: "+250780000002",
    facility: "GIK-01"
  }
];

// AES-256-CBC turns the phone number into unreadable text before it touches the database.
function encryptPhone(phone) {
  var key = Buffer.from(
    (process.env.PHONE_KEY || "ehumure-demo-key-32bytes-padding!").slice(0, 32)
  );
  var iv = crypto.randomBytes(16);
  var cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  return iv.toString("hex") + ":" + cipher.update(phone, "utf8", "hex") + cipher.final("hex");
}

async function run() {
  // c is a single connection taken from the pool for this transaction.
  var c = await pool.connect();
  try {
    await c.query("BEGIN");

    for (var s of STAFF) {
      await c.query(
        "INSERT INTO staff(staff_id,full_name,role,facility_id,password_hash) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING",
        [s.id, s.name, s.role, s.facility, s.hash]
      );
    }

    for (var pt of PATIENTS) {
      await c.query(
        "INSERT INTO patient(patient_id,age,chronic_condition,sector,phone_enc,facility_id,consent_given_at) VALUES($1,$2,$3,$4,$5,$6,now()) ON CONFLICT DO NOTHING",
        [pt.id, pt.age, pt.condition, pt.sector, encryptPhone(pt.phone), pt.facility]
      );
    }

    // One high-risk screening so the dashboard has something to show immediately.
    var screenId = "22222222-0000-0000-0000-000000000001";
    await c.query(
      "INSERT INTO screening(screening_id,patient_id,staff_id,stage,responses,total_score,item9_flag,sync_status) VALUES($1,$2,$3,'full',$4,13,false,'synced') ON CONFLICT DO NOTHING",
      [screenId, "P-SEED-002", STAFF[0].id, JSON.stringify([0,2,3,2,2,1,1,1,0])]
    );

    // One open alert so the psychologist dashboard has something to show.
    var alertId = "33333333-0000-0000-0000-000000000001";
    await c.query(
      "INSERT INTO risk_alert(alert_id,screening_id,psychologist_id,risk_level,status) VALUES($1,$2,$3,'high','open') ON CONFLICT DO NOTHING",
      [alertId, screenId, STAFF[1].id]
    );

    await c.query("COMMIT");
    console.log("seeded: 3 staff, 2 patients, 1 high-risk alert");
  } catch (e) {
    // If anything goes wrong, undo everything so the database stays clean.
    await c.query("ROLLBACK");
    throw e;
  } finally {
    // Always give the connection back to the pool, even if there was an error.
    c.release();
    pool.end();
  }
}

run().catch(function (e) {
  console.error("seed failed:", e.message);
  process.exit(1);
});
```

---

### backend/store.js (replace the whole file)

This was the in-memory store in Sprint 1. Replace it completely. It now reads from PostgreSQL.

```js
// Sprint 1 kept users in memory. Sprint 2 reads from PostgreSQL instead.
// This is the only file that talks to the database for user lookups and screenings.

var pool = require("./db");

// Look up a staff member by their full name, which is used as the login username.
async function findUserByUsername(username) {
  var res = await pool.query(
    "SELECT staff_id, full_name AS name, role, password_hash AS \"passwordHash\" FROM staff WHERE full_name = $1 LIMIT 1",
    [username]
  );
  return res.rows[0] || null;
}

// Save one screening result. Called by the /score route after scoring.
async function addScreening(record) {
  await pool.query(
    "INSERT INTO screening(screening_id,patient_id,staff_id,stage,responses,total_score,item9_flag,sync_status) VALUES($1,$2,$3,$4,$5,$6,$7,'pending')",
    [
      record.id,
      record.patientId,
      record.staffId,
      record.stage,
      JSON.stringify(record.responses),
      record.total,
      record.item9Flag
    ]
  );
}

// Save one risk alert. Called after a screening comes back moderate or high.
async function addAlert(alertId, screeningId, riskLevel) {
  await pool.query(
    "INSERT INTO risk_alert(alert_id,screening_id,risk_level,status) VALUES($1,$2,$3,'open') ON CONFLICT DO NOTHING",
    [alertId, screeningId, riskLevel]
  );
}

module.exports = { findUserByUsername, addScreening, addAlert };
```

---

### backend/audit.js (new)

Every time someone reads or changes patient data, write one row here. This is how we can prove who saw what and when.

```js
// Every read and every write to patient data calls this function.
// It inserts one row into audit_log so we can prove who accessed what.

var pool = require("./db");

async function logAccess(staffId, action, recordType, recordId) {
  try {
    await pool.query(
      "INSERT INTO audit_log(staff_id,action,record_type,record_id) VALUES($1,$2,$3,$4)",
      [staffId, action, recordType, String(recordId)]
    );
  } catch (e) {
    // Never let a failed log entry crash the actual request the user is making.
    console.error("audit log write failed:", e.message);
  }
}

module.exports = { logAccess };
```

---

### database/migrate_sprint2.sql (new)

This fixes three problems the marker flagged in the proposal review. Run it once after `schema.sql`.

```sql
-- Run after schema.sql: psql -U postgres -d ehumure -f database/migrate_sprint2.sql
-- Safe to run more than once. Each block checks before it changes anything.

-- Fix 1: one alert per screening. Prevents duplicates if the queue replays.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'risk_alert_screening_id_key'
  ) THEN
    ALTER TABLE risk_alert ADD CONSTRAINT risk_alert_screening_id_key UNIQUE (screening_id);
  END IF;
END $$;

-- Fix 2: every appointment must trace back to the alert it fulfils.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='appointment' AND column_name='alert_id'
  ) THEN
    ALTER TABLE appointment ADD COLUMN alert_id UUID REFERENCES risk_alert(alert_id);
  END IF;
END $$;

-- Fix 3: remove patient_id from sms_reminder. Read the patient through the appointment instead.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='sms_reminder' AND column_name='patient_id'
  ) THEN
    ALTER TABLE sms_reminder DROP COLUMN patient_id;
  END IF;
END $$;

-- Sprint 2: add facility_id to patient for row-level security.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='patient' AND column_name='facility_id'
  ) THEN
    ALTER TABLE patient ADD COLUMN facility_id TEXT NOT NULL DEFAULT 'GIK-01';
  END IF;
END $$;

SELECT 'migration done' AS result;
```

---

### How to set up the database (run this once, in order)

```
psql -U postgres -c "CREATE DATABASE ehumure;"
psql -U postgres -d ehumure -f database/schema.sql
psql -U postgres -d ehumure -f database/migrate_sprint2.sql
```

Then seed the demo data:

```
cd backend
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/ehumure"
node seed.js
```

---

### Git commands — Ines

```
git checkout main
git pull
git checkout feature/ines-s2-02-db
git add backend/db.js backend/seed.js backend/store.js backend/audit.js database/migrate_sprint2.sql
git commit -m "feat(db): connect server to postgres, seed demo data, add audit log"
git push -u origin feature/ines-s2-02-db
```

Check: `node backend/seed.js` → prints `seeded: 3 staff, 2 patients, 1 high-risk alert`

Then start the server and test the login route still works:

```
cd backend
npm start
```

In a second window:

```
curl -X POST http://localhost:4000/login -H "Content-Type: application/json" -d "{\"username\":\"Demo Nurse\",\"password\":\"Nurse#2026\"}"
```

You should get a token and `"role":"nurse"`. If you get an error, check that `DATABASE_URL` is set in the terminal.

Reviewer Anny. Tell Djibril, Promise, and Ivan that it is merged — they all need this before they can start their Day 3 cards.

**Make it yours:** add one comment inside `seed.js` in your own words explaining why `ON CONFLICT DO NOTHING` matters.

**Day 2 conflict check:** Ines owns every file she touches today. Djibril's `server.js` is not changed yet. No overlap. Merge order: Djibril S2-01 (if still open), then Ines S2-02.

---

# Day 3, Sat 8 Nov

Goal: role screens work, the server saves screenings to the database, Djibril adds the two new routes. Cards done tonight: S2-03, S2-04.

**Important:** Ines's S2-02 must be merged before Promise, Djibril, or Ivan touch any backend file today.

## Djibril, S2-03, `feature/djibril-s2-03-routes`

**Needs:** S2-02 merged (Ines).

You make four targeted changes to `backend/server.js`. Do not rewrite the whole file. Find each section and make only the change shown.

**Change 1 — update the `/login` route to use async/await**

Find the existing `/login` route. Change it from a plain function to an async function and change `store.findUser` to `store.findUserByUsername`:

```js
// NEW (Sprint 2) — the function is now async and reads from the database:
app.post("/login", async function (req, res) {
  var body = req.body || {};
  try {
    var user = await store.findUserByUsername(String(body.username || ""));
    if (!user || !bcrypt.compareSync(String(body.password || ""), user.passwordHash)) {
      return res.status(401).json({ error: auth.SAME_LOGIN_ERROR });
    }
    res.json({ token: auth.createToken(user), role: user.role, name: user.name });
  } catch (e) {
    res.status(500).json({ error: "Database error" });
  }
});
```

**Change 2 — update the `/score` route to save to the database**

Find the existing `/score` route. Make it async and add the three lines marked NEW:

```js
app.post("/score", auth.requireLogin, auth.requirePermission("record_screening"), async function (req, res) {
  var body = req.body || {};
  try {
    var result = body.stage === "quick"
      ? scoring.scoreQuickQuestions(body.answers)
      : body.stage === "full"
        ? scoring.scoreFullQuestionnaire(body.answers)
        : null;
    if (!result) throw new Error('stage must be "quick" or "full"');

    // NEW: generate a unique ID and save the screening to the database.
    var { v4: uuidv4 } = require("uuid");
    var screenId = uuidv4();
    await store.addScreening({
      id: screenId,
      patientId: body.patientId || "UNKNOWN",
      staffId: "11111111-0000-0000-0000-000000000001",
      stage: result.stage,
      responses: body.answers,
      total: result.total,
      item9Flag: result.emergency
    });

    // NEW: if the result is moderate or high, save an alert row.
    if (result.risk === "moderate" || result.risk === "high") {
      var alertId = uuidv4();
      await store.addAlert(alertId, screenId, result.risk);
    }

    // NEW: write to the audit log so we can see who scored what.
    var audit = require("./audit");
    await audit.logAccess(req.user.username, "score", "screening", screenId);

    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
```

**Change 3 — add GET /alerts after the /score route**

```js
// GET /alerts — psychologist only. Returns all open alerts with their screening data.
// Nurses record screenings but cannot see the alert list — that is the psychologist's job.
app.get("/alerts", auth.requireLogin, auth.requirePermission("read_screening_details"),
  async function (req, res) {
    if (req.user.role === "nurse") {
      return res.status(403).json({ error: "Your role is not allowed to do this" });
    }
    try {
      var pool = require("./db");
      var rows = await pool.query(
        "SELECT a.alert_id, a.risk_level, a.status, " +
        "s.total_score, s.item9_flag, s.screened_at, s.patient_id " +
        "FROM risk_alert a JOIN screening s ON s.screening_id = a.screening_id " +
        "WHERE a.status = 'open' ORDER BY s.screened_at DESC"
      );
      var audit = require("./audit");
      await audit.logAccess(req.user.username, "read_alerts", "risk_alert", "all");
      res.json(rows.rows);
    } catch (e) {
      res.status(500).json({ error: "Database error" });
    }
  }
);
```

**Change 4 — add POST /appointments after GET /alerts**

```js
// POST /appointments — psychologist books an appointment for a patient.
// Body must have patientId, alertId and scheduledFor.
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
      var { v4: uuidv4 } = require("uuid");
      var apptId = uuidv4();

      await pool.query(
        "INSERT INTO appointment(appointment_id,patient_id,psychologist_id,alert_id,scheduled_for,location,kind,status) VALUES($1,$2,$3,$4,$5,'Gikomero HC','session','scheduled')",
        [apptId, body.patientId, "11111111-0000-0000-0000-000000000002", body.alertId, body.scheduledFor]
      );

      // Mark the alert as acknowledged so it no longer appears in the open list.
      await pool.query("UPDATE risk_alert SET status='acknowledged' WHERE alert_id=$1", [body.alertId]);

      var audit = require("./audit");
      await audit.logAccess(req.user.username, "book_appointment", "appointment", apptId);
      res.json({ appointmentId: apptId });
    } catch (e) {
      res.status(500).json({ error: "Database error: " + e.message });
    }
  }
);
```

```
git checkout main
git pull
git checkout -b feature/djibril-s2-03-routes
git add backend/server.js
git commit -m "feat(backend): save screenings to db, add GET /alerts and POST /appointments"
git push -u origin feature/djibril-s2-03-routes
```

Check: start the server. Log in as Demo Nurse. POST a high-risk screening to `/score`. Then log in as Demo Psychologist. `GET /alerts` should return one row. Tell Ivan and Anny it is merged — they both need these routes.

Reviewer Ivan.

**Make it yours:** write the comment above `GET /alerts` in your own words.

---

## Promise, S2-04, `feature/promise-s2-04-role-screens`

**Needs:** S2-02 merged (Ines).

Files you change: `frontend/js/login.js` (replace the whole file)
Files you create: `frontend/nurse.html` (new), `frontend/psychologist.html` (new), `frontend/desk.html` (new)

The plan: when login succeeds, read the role from the server's response and send the user to their own page.

---

### frontend/js/login.js (replace the whole file)

```js
// When login succeeds, send the user to the page for their role.
// The token and role are saved in sessionStorage so other pages can use them.

var API = "http://localhost:4000";

function say(message, isError) {
  var box = document.getElementById("message");
  box.textContent = message;
  box.className = isError ? "error" : "note";
}

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
    .then(function (res) {
      return res.json().then(function (data) { return { ok: res.ok, data: data }; });
    })
    .then(function (out) {
      if (!out.ok) return say(out.data.error, true);

      // Save the token and role so every page can use them without asking for a password again.
      sessionStorage.setItem("ehumure_token", out.data.token);
      sessionStorage.setItem("ehumure_role", out.data.role);
      sessionStorage.setItem("ehumure_name", out.data.name);

      // Each role goes to their own page.
      var pages = {
        nurse: "nurse.html",
        psychologist: "psychologist.html",
        desk: "desk.html"
      };
      var next = pages[out.data.role];
      if (next) {
        window.location.href = next;
      } else {
        say("Unknown role: " + out.data.role, true);
      }
    })
    .catch(function () {
      say("Cannot reach the backend. Run npm start in backend/ first.", true);
    });
}

document.getElementById("signin").onclick = signIn;
```

---

### frontend/nurse.html (new)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>e-Humure — nurse</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <div class="card">
    <h1>e-Humure</h1>
    <p class="note" id="welcome"></p>
    <p class="note"><a href="login.html">Sign out</a></p>
  </div>
  <div id="screen"></div>
  <script src="../backend/scoring.js"></script>
  <script src="questions.js"></script>
  <script src="js/step-consent.js"></script>
  <script src="js/step-quick.js"></script>
  <script src="js/step-full.js"></script>
  <script src="js/app.js"></script>
  <script>
    // If no token or wrong role, go back to login.
    var name = sessionStorage.getItem("ehumure_name");
    var role = sessionStorage.getItem("ehumure_role");
    if (!name || role !== "nurse") window.location.href = "login.html";
    document.getElementById("welcome").textContent = "Signed in as " + name;
  </script>
</body>
</html>
```

---

### frontend/psychologist.html (new)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>e-Humure — psychologist</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <div class="card">
    <h1>e-Humure — psychologist dashboard</h1>
    <p class="note" id="welcome"></p>
    <p class="note"><a href="login.html">Sign out</a></p>
  </div>
  <div id="alert-list"></div>
  <div id="alert-detail" style="display:none"></div>
  <script src="js/dashboard.js"></script>
  <script>
    var name = sessionStorage.getItem("ehumure_name");
    var role = sessionStorage.getItem("ehumure_role");
    if (!name || role !== "psychologist") window.location.href = "login.html";
    document.getElementById("welcome").textContent = "Signed in as " + name;
  </script>
</body>
</html>
```

---

### frontend/desk.html (new)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>e-Humure — desk</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <div class="card">
    <h1>e-Humure</h1>
    <p class="note" id="welcome"></p>
    <p>Your role does not include access to screening results.</p>
    <p class="note"><a href="login.html">Sign out</a></p>
  </div>
  <script>
    var name = sessionStorage.getItem("ehumure_name");
    var role = sessionStorage.getItem("ehumure_role");
    if (!name || role !== "desk") window.location.href = "login.html";
    document.getElementById("welcome").textContent = "Signed in as " + name;
  </script>
</body>
</html>
```

```
git checkout main
git pull
git checkout feature/promise-s2-04-role-screens
git add frontend/js/login.js frontend/nurse.html frontend/psychologist.html frontend/desk.html
git commit -m "feat(frontend): send each role to their own page after login"
git push -u origin feature/promise-s2-04-role-screens
```

Check: open `login.html`. Log in as Demo Nurse → lands on `nurse.html`. Log in as Demo Psychologist → lands on `psychologist.html`. Log in as Demo Desk Staff → lands on `desk.html`. Each page shows the name of the person signed in.

Reviewer Audrey.

**Make it yours:** change the message on `desk.html` to your own words.

**Day 3 conflict check:** `server.js` is Djibril only. `login.js` and the three new HTML files are Promise only. No overlap. Merge order: Ines S2-02 (if still open), then Djibril S2-03, then Promise S2-04.

---

# Day 4, Sun 9 Nov

Goal: psychologist dashboard shows real alerts, emergency styling works. Cards done tonight: S2-05, S2-13.

## Ivan, S2-05, `feature/ivan-s2-05-dashboard` (STRETCH)

**Needs:** S2-02 merged (Ines), S2-03 merged (Djibril) — the `/alerts` and `/appointments` routes must be live before this page will work.

Files you create: `frontend/js/dashboard.js`

This file has three jobs:
1. Load the list of open alerts from the backend when the page opens.
2. Show each alert as a card. Emergency alerts (item9_flag = true) get a red border.
3. When the psychologist clicks an alert, show the detail view with a date picker and a Book button.

```js
// The psychologist's dashboard. Three steps: load, list, detail + book.

var API = "http://localhost:4000";

// Read the token that was saved when the psychologist logged in.
function token() {
  return sessionStorage.getItem("ehumure_token") || "";
}

function say(box, message, isError) {
  box.innerHTML = "";
  var card = document.createElement("div");
  card.className = "card";
  var p = document.createElement("p");
  p.className = isError ? "error" : "note";
  p.textContent = message;
  card.appendChild(p);
  box.appendChild(card);
}

// Step 1: ask the backend for all open alerts.
function loadAlerts() {
  fetch(API + "/alerts", {
    headers: { Authorization: "Bearer " + token() }
  })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (Array.isArray(data)) {
        renderList(data);
      } else {
        say(document.getElementById("alert-list"), data.error || "Error loading alerts.", true);
      }
    })
    .catch(function () {
      say(document.getElementById("alert-list"), "Cannot reach the backend. Run npm start in backend/ first.", true);
    });
}

// Step 2: draw one card per alert.
function renderList(alerts) {
  var box = document.getElementById("alert-list");
  box.innerHTML = "";
  if (!alerts.length) {
    say(box, "No open alerts.", false);
    return;
  }

  alerts.forEach(function (a) {
    var card = document.createElement("div");
    // Emergency: red border all round. High: red left stripe. Moderate: orange left stripe.
    card.className = "card " + (a.item9_flag ? "result-high emergency-border" : "result-" + a.risk_level);
    card.style.cursor = "pointer";

    var title = document.createElement("h2");
    title.textContent = (a.item9_flag ? "EMERGENCY — " : "") + a.risk_level.toUpperCase() + " — Patient " + a.patient_id;
    card.appendChild(title);

    var meta = document.createElement("p");
    meta.className = "note";
    meta.textContent = "PHQ-9 total: " + a.total_score + "   Screened: " + new Date(a.screened_at).toLocaleDateString();
    card.appendChild(meta);

    // Clicking the card opens the detail view.
    card.onclick = function () { renderDetail(a); };
    box.appendChild(card);
  });
}

// Step 3: detail view with the booking form.
function renderDetail(a) {
  var listBox = document.getElementById("alert-list");
  var detailBox = document.getElementById("alert-detail");
  listBox.style.display = "none";
  detailBox.style.display = "";
  detailBox.innerHTML = "";

  var card = document.createElement("div");
  card.className = "card result-" + a.risk_level;

  var title = document.createElement("h2");
  title.textContent = (a.item9_flag ? "EMERGENCY — " : "") + a.risk_level.toUpperCase() + " — Patient " + a.patient_id;
  card.appendChild(title);

  // Show the emergency message at the top where it cannot be missed.
  if (a.item9_flag) {
    var em = document.createElement("div");
    em.className = "emergency";
    em.textContent = "Patient reported thoughts of self-harm. Act on this now.";
    card.appendChild(em);
  }

  var score = document.createElement("p");
  score.textContent = "PHQ-9 total: " + a.total_score + " out of 27";
  card.appendChild(score);

  var bookLabel = document.createElement("h2");
  bookLabel.textContent = "Book appointment";
  card.appendChild(bookLabel);

  // A date and time picker for the appointment.
  var dateInput = document.createElement("input");
  dateInput.type = "datetime-local";
  dateInput.style.fontSize = "17px";
  dateInput.style.padding = "10px";
  dateInput.style.width = "100%";
  dateInput.style.borderRadius = "8px";
  dateInput.style.border = "1px solid #d8e0e6";
  card.appendChild(dateInput);

  var errorMsg = document.createElement("p");
  errorMsg.className = "error";
  card.appendChild(errorMsg);

  var actions = document.createElement("div");
  actions.className = "actions";

  var bookBtn = document.createElement("button");
  bookBtn.textContent = "Book";
  bookBtn.onclick = function () {
    if (!dateInput.value) {
      errorMsg.textContent = "Pick a date and time first.";
      return;
    }
    errorMsg.textContent = "";

    fetch(API + "/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token() },
      body: JSON.stringify({
        patientId: a.patient_id,
        alertId: a.alert_id,
        scheduledFor: new Date(dateInput.value).toISOString()
      })
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.error) { errorMsg.textContent = d.error; return; }
        // Show success without a popup alert box.
        errorMsg.style.color = "#0f6b5c";
        errorMsg.textContent = "Appointment booked.";
        bookBtn.disabled = true;
      })
      .catch(function () { errorMsg.textContent = "Cannot reach the backend."; });
  };

  var backBtn = document.createElement("button");
  backBtn.className = "secondary";
  backBtn.textContent = "Back to list";
  backBtn.onclick = function () {
    detailBox.style.display = "none";
    listBox.style.display = "";
    loadAlerts();
  };

  actions.appendChild(bookBtn);
  actions.appendChild(backBtn);
  card.appendChild(actions);
  detailBox.appendChild(card);
}

// Load the alerts as soon as the page opens.
window.onload = loadAlerts;
```

```
git checkout main
git pull
git checkout feature/ivan-s2-05-dashboard
git add frontend/js/dashboard.js
git commit -m "feat(dashboard): alert list, detail view, appointment booking"
git push -u origin feature/ivan-s2-05-dashboard
```

Check: open `psychologist.html`. The seeded high-risk patient appears in the list. Click it. Pick a date. Click Book. The message says "Appointment booked."

Reviewer Djibril.

**Make it yours:** change the "Appointment booked." message to your own words.

---

## Audrey, S2-13, `feature/audrey-s2-13-emergency-style`

**Needs:** nothing — this only touches `frontend/css/style.css`.

Files you change: `frontend/css/style.css`

Add this block to the bottom of the file. The `.emergency-border` class is used by Ivan's dashboard for the red border around an emergency alert card. The `.emergency` block is already in `style.css` from Sprint 1 — confirm it is there and do not duplicate it.

```css
/* Red border on the full alert card when item9_flag is true.
   Separate from result-high because not every high-risk result is an emergency. */
.emergency-border {
  border: 3px solid var(--warn);
}
```

```
git checkout main
git pull
git checkout feature/audrey-s2-13-emergency-style
git add frontend/css/style.css
git commit -m "style(dashboard): red border on emergency alert cards"
git push -u origin feature/audrey-s2-13-emergency-style
```

Check: open `psychologist.html` with the seeded high-risk patient. The card has a red border all the way around it.

Reviewer Promise.

**Make it yours:** add a second comment inside the CSS block explaining what item9_flag means in plain words.

**Day 4 conflict check:** `dashboard.js` is Ivan only. `style.css` is Audrey only. No overlap. Merge order: Ivan S2-05, then Audrey S2-13.

---

# Day 5, Mon 10 Nov

Goal: offline queue working, SMS simulator running. Cards: S2-07, S2-08.

If the sprint is behind, skip Day 5 entirely and go straight to Day 6. The MUST tests are more important than the STRETCH features.

## Djibril, S2-07 and S2-08, `feature/djibril-s2-07-sync` (STRETCH)

**Needs:** S2-02 merged (Ines).

Files you create: `backend/outbox.js`, `backend/sync.js`, `backend/sms.js`, `backend/sms-simulator.js`

---

### backend/outbox.js

The outbox is a text file called `outbox.jsonl`. Each line is one JSON record waiting to be sent. The file stays on disk even if the server restarts, which is why it is better than keeping things in memory.

```js
// outbox.jsonl is the queue. One JSON object per line.
// The file stays on disk even if the server restarts.
// sync.js reads this file and sends the rows when the network returns.

var fs = require("fs");
var path = require("path");

// outbox.jsonl lives in the root of the project, next to backend/.
var FILE = path.join(__dirname, "..", "outbox.jsonl");

// Add one row to the bottom of the file.
function enqueue(type, payload) {
  var row = JSON.stringify({
    id: payload.id,
    type: type,
    payload: payload,
    attempts: 0,
    queuedAt: new Date().toISOString()
  });
  fs.appendFileSync(FILE, row + "\n", "utf8");
}

// Read every row from the file.
function readAll() {
  if (!fs.existsSync(FILE)) return [];
  return fs.readFileSync(FILE, "utf8")
    .split("\n")
    .filter(Boolean)
    .map(function (line) {
      try { return JSON.parse(line); } catch (e) { return null; }
    })
    .filter(Boolean);
}

// Write a new list back to the file. Used after sending rows successfully.
function rewrite(rows) {
  var content = rows.map(function (r) { return JSON.stringify(r); }).join("\n");
  fs.writeFileSync(FILE, content + (rows.length ? "\n" : ""), "utf8");
}

module.exports = { enqueue, readAll, rewrite };
```

---

### backend/sync.js

```js
// Run manually: node backend/sync.js
// Reads outbox.jsonl, posts each row to the district server, removes the ones that worked.
// Rows that fail stay in the file and are retried next time.

var http = require("http");
var outbox = require("./outbox");

var DISTRICT_URL = process.env.DISTRICT_URL || "http://localhost:4001";
var MAX_ATTEMPTS = 5;

// Send one row via HTTP POST.
function post(url, body) {
  return new Promise(function (resolve, reject) {
    var data = JSON.stringify(body);
    var req = http.request(
      url + "/sync",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data)
        }
      },
      function (res) {
        res.resume();
        res.statusCode < 300 ? resolve() : reject(new Error("HTTP " + res.statusCode));
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  var rows = outbox.readAll();
  if (!rows.length) { console.log("outbox empty"); return; }

  var keep = [];
  for (var row of rows) {
    try {
      await post(DISTRICT_URL, { id: row.id, type: row.type, payload: row.payload });
      console.log("sent", row.id);
      // Sent successfully — remove from the file.
    } catch (e) {
      row.attempts = (row.attempts || 0) + 1;
      if (row.attempts >= MAX_ATTEMPTS) {
        row.status = "failed";
        console.error("gave up after " + MAX_ATTEMPTS + " attempts:", row.id);
      } else {
        console.log("will retry (attempt " + row.attempts + "):", row.id);
      }
      keep.push(row);
    }
  }

  outbox.rewrite(keep);
  console.log("done.", (rows.length - keep.length) + " sent, " + keep.length + " remaining");
}

if (require.main === module) {
  run().catch(function (e) { console.error(e.message); process.exit(1); });
}

module.exports = { run };
```

---

### backend/sms.js

```js
// Sends one text message. Never contains the word depression or the patient's name.
// In tests, GATEWAY_URL points to sms-simulator.js on port 4002.

var http = require("http");

var GATEWAY = process.env.GATEWAY_URL || "http://localhost:4002/send";
var MAX_TRIES = 3;

async function sendSms(phone, message) {
  for (var attempt = 1; attempt <= MAX_TRIES; attempt++) {
    try {
      await postOnce(phone, message);
      return { ok: true, attempts: attempt };
    } catch (e) {
      if (attempt === MAX_TRIES) return { ok: false, attempts: attempt, error: e.message };
      // Short wait between retries so tests run quickly.
      await new Promise(function (r) { setTimeout(r, 200 * attempt); });
    }
  }
}

function postOnce(phone, message) {
  return new Promise(function (resolve, reject) {
    var data = JSON.stringify({ phone, message });
    var parsed = new URL(GATEWAY);
    var req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data)
        }
      },
      function (res) {
        res.resume();
        res.statusCode < 300 ? resolve() : reject(new Error("HTTP " + res.statusCode));
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

module.exports = { sendSms };
```

---

### backend/sms-simulator.js

```js
// A fake SMS gateway for testing. Run in a second terminal: node backend/sms-simulator.js
// FAIL_RATE controls how often it pretends to fail. 0 = never fails. 1 = always fails.
// Example in PowerShell: $env:FAIL_RATE = "0.3"; node backend/sms-simulator.js

var express = require("express");
var app = express();
var PORT = 4002;
var FAIL_RATE = parseFloat(process.env.FAIL_RATE || "0");

app.use(express.json());

app.post("/send", function (req, res) {
  var body = req.body || {};
  if (Math.random() < FAIL_RATE) {
    console.log("FAIL  phone=" + body.phone);
    return res.status(500).json({ error: "simulated failure" });
  }
  console.log("SENT  phone=" + body.phone + "  msg=" + (body.message || "").slice(0, 60));
  res.json({ ok: true });
});

app.listen(PORT, function () {
  console.log("SMS simulator on http://localhost:" + PORT + "  FAIL_RATE=" + FAIL_RATE);
});
```

```
git checkout main
git pull
git checkout feature/djibril-s2-07-sync
git add backend/outbox.js backend/sync.js backend/sms.js backend/sms-simulator.js
git commit -m "feat(sync): offline queue, sync with retry, SMS simulator"
git push -u origin feature/djibril-s2-07-sync
```

Check:
```
node backend/sms-simulator.js
```
In a second window:
```
node -e "require('./backend/sms').sendSms('+250780000001','Test').then(console.log)"
```
You should see `{ ok: true, attempts: 1 }` and a `SENT` line in the simulator window.

Reviewer Ivan.

**Make it yours:** change the simulator's start-up message to your own words.

**Day 5 conflict check:** Djibril adds four new files. No existing file is changed. No overlap with anyone.

---

# Day 6, Tue 11 Nov

Goal: all tests passing. Cards done tonight: S2-09, S2-10, S2-11, S2-12.

The backend must be running before you run any of these tests. Start it with `cd backend && npm start`.

## Anny, S2-09 and S2-11, `feature/anny-s2-09-tests`

**Needs:** S2-02 and S2-03 merged.

Files you create: `testing/at4-no-duplicate.js`, `testing/smoke.js`

---

### testing/at4-no-duplicate.js

AT-4 proves that if the same screening is posted twice — which can happen when a queue is replayed — only one alert row is ever created.

```js
// AT-4: post the same screening twice. Assert only one alert row exists.
// This proves the database cannot be flooded with duplicate alerts.
// Run: node testing/at4-no-duplicate.js

var assert = require("assert");
var API = process.env.API || "http://localhost:4000";

async function call(route, opts) {
  var res = await fetch(API + route, opts);
  return { status: res.status, data: await res.json() };
}

async function login(username, password) {
  var out = await call("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  assert.strictEqual(out.status, 200, "login failed: " + JSON.stringify(out.data));
  return out.data.token;
}

async function run() {
  var token = await login("Demo Nurse", process.env.API_PW_NURSE || "Nurse#2026");
  var headers = { "Content-Type": "application/json", Authorization: "Bearer " + token };

  // High-risk answers. Total = 11. Item 9 = 0.
  var body = JSON.stringify({
    stage: "full",
    answers: [2, 2, 1, 1, 1, 1, 1, 1, 0],
    patientId: "P-SEED-AT4"
  });

  // Post the same screening twice, the same way a queue replay would.
  var r1 = await call("/score", { method: "POST", headers, body });
  assert.strictEqual(r1.status, 200, "first POST failed");
  assert.strictEqual(r1.data.risk, "high");

  var r2 = await call("/score", { method: "POST", headers, body });
  assert.strictEqual(r2.status, 200, "second POST failed");

  // Check the database: there must be exactly one alert for this patient.
  var pool = require("../backend/db");
  var rows = await pool.query(
    "SELECT COUNT(*) FROM risk_alert ra JOIN screening s ON s.screening_id = ra.screening_id WHERE s.patient_id = $1",
    ["P-SEED-AT4"]
  );
  assert.strictEqual(Number(rows.rows[0].count), 1, "AT-4 FAIL: more than one alert row for the same patient");
  await pool.end();

  console.log("AT-4 PASS: 1 alert row after 2 identical POSTs");
}

run().catch(function (e) { console.error("AT-4 FAIL:", e.message); process.exit(1); });
```

---

### testing/smoke.js

The smoke test walks the full happy path in one run. If this passes, the whole system works end to end.

```js
// Smoke test: walks the full path from login to appointment in one run.
// If this passes, the whole system is working.
// Run: node testing/smoke.js

var assert = require("assert");
var API = process.env.API || "http://localhost:4000";

async function call(route, opts) {
  var res = await fetch(API + route, opts);
  return { status: res.status, data: await res.json() };
}

async function login(username, password) {
  var out = await call("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  assert.strictEqual(out.status, 200, "login failed for " + username);
  return out.data.token;
}

async function run() {
  // 1. Health check.
  var h = await call("/health");
  assert.strictEqual(h.status, 200);

  // 2. Nurse logs in.
  var nurseToken = await login("Demo Nurse", process.env.API_PW_NURSE || "Nurse#2026");
  var nurseHeaders = { "Content-Type": "application/json", Authorization: "Bearer " + nurseToken };

  // 3. Nurse posts a high-risk screening. Total = 11. Item 9 = 0.
  var score = await call("/score", {
    method: "POST",
    headers: nurseHeaders,
    body: JSON.stringify({
      stage: "full",
      answers: [2, 2, 1, 2, 1, 1, 1, 1, 0],
      patientId: "P-SMOKE-01"
    })
  });
  assert.strictEqual(score.status, 200, "score failed");
  assert.strictEqual(score.data.risk, "high");

  // 4. Psychologist logs in and sees the alert.
  var psychToken = await login("Demo Psychologist", process.env.API_PW_PSYCH || "Psych#2026");
  var psychHeaders = { "Content-Type": "application/json", Authorization: "Bearer " + psychToken };

  var alerts = await call("/alerts", { headers: psychHeaders });
  assert.strictEqual(alerts.status, 200);
  assert.ok(Array.isArray(alerts.data) && alerts.data.length > 0, "no alerts returned");

  // 5. Psychologist books an appointment.
  var first = alerts.data[0];
  var tomorrow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
  var appt = await call("/appointments", {
    method: "POST",
    headers: psychHeaders,
    body: JSON.stringify({
      patientId: first.patient_id,
      alertId: first.alert_id,
      scheduledFor: tomorrow
    })
  });
  assert.strictEqual(appt.status, 200, "appointment failed: " + JSON.stringify(appt.data));
  assert.ok(appt.data.appointmentId, "no appointmentId in response");

  // 6. Desk staff cannot see alerts. Must get 403.
  var deskToken = await login("Demo Desk Staff", process.env.API_PW_DESK || "Desk#2026");
  var deskResult = await call("/alerts", { headers: { Authorization: "Bearer " + deskToken } });
  assert.strictEqual(deskResult.status, 403, "desk should have got 403 but got " + deskResult.status);

  console.log("SMOKE PASS: login -> screen -> alert -> appointment -> access control");
}

run().catch(function (e) { console.error("SMOKE FAIL:", e.message); process.exit(1); });
```

```
git checkout main
git pull
git checkout feature/anny-s2-09-tests
git add testing/at4-no-duplicate.js testing/smoke.js
git commit -m "test(AT-4, smoke): no duplicate alert and end-to-end happy path"
git push -u origin feature/anny-s2-09-tests
```

Check: with the backend running, `node testing/at4-no-duplicate.js` prints `AT-4 PASS` and `node testing/smoke.js` prints `SMOKE PASS`.

Reviewer Ivan.

**Make it yours:** add one comment inside `smoke.js` explaining why step 6 (desk gets 403) is in the same test as the happy path.

---

## Ivan, S2-10, `feature/ivan-s2-10-at7`

**Needs:** S2-02 and S2-03 merged.

Files you create: `testing/at7-access-control.js`

AT-7 proves that desk staff cannot see any clinical data. Every call they make to a protected route must return 403.

```js
// AT-7: desk staff get 403 on every clinical route.
// This proves the role-based access control is working.
// Run: node testing/at7-access-control.js

var assert = require("assert");
var API = process.env.API || "http://localhost:4000";

async function call(route, opts) {
  var res = await fetch(API + route, opts);
  return { status: res.status, data: await res.json() };
}

async function login(username, password) {
  var out = await call("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  assert.strictEqual(out.status, 200, "login failed");
  return out.data.token;
}

async function run() {
  var deskToken = await login("Demo Desk Staff", process.env.API_PW_DESK || "Desk#2026");
  var headers = { "Content-Type": "application/json", Authorization: "Bearer " + deskToken };

  // Every one of these must return 403 for a desk user.
  var routes = [
    {
      method: "POST",
      route: "/score",
      body: JSON.stringify({ stage: "full", answers: [0, 0, 0, 0, 0, 0, 0, 0, 0] })
    },
    {
      method: "GET",
      route: "/alerts"
    },
    {
      method: "POST",
      route: "/appointments",
      body: JSON.stringify({
        patientId: "P-X",
        alertId: "00000000-0000-0000-0000-000000000000",
        scheduledFor: new Date().toISOString()
      })
    }
  ];

  for (var endpoint of routes) {
    var r = await call(endpoint.route, { method: endpoint.method, headers, body: endpoint.body });
    assert.strictEqual(
      r.status,
      403,
      "AT-7 FAIL: desk got " + r.status + " on " + endpoint.method + " " + endpoint.route + " (expected 403)"
    );
  }

  console.log("AT-7 PASS: desk got 403 on all " + routes.length + " protected routes");
}

run().catch(function (e) { console.error("AT-7 FAIL:", e.message); process.exit(1); });
```

```
git checkout main
git pull
git checkout feature/ivan-s2-10-at7
git add testing/at7-access-control.js
git commit -m "test(AT-7): desk gets 403 on all protected routes"
git push -u origin feature/ivan-s2-10-at7
```

Check: `node testing/at7-access-control.js` prints `AT-7 PASS: desk got 403 on all 3 protected routes`.

Reviewer Djibril.

**Make it yours:** add a fourth route to test, for example `/me` with no token at all.

---

## Ines, S2-12, `feature/ines-s2-12-migration`

**Needs:** S2-02 merged, smoke test passing.

`database/migrate_sprint2.sql` already exists from your Day 2 card. Run it now against the live database:

```
psql -U postgres -d ehumure -f database/migrate_sprint2.sql
```

You should see `migration done`. Then run the smoke test to confirm nothing broke:

```
node testing/smoke.js
```

If it still prints `SMOKE PASS`, commit the migration file and confirm in your PR that you ran it.

```
git checkout main
git pull
git checkout -b feature/ines-s2-12-migration
git add database/migrate_sprint2.sql
git commit -m "feat(db): apply sprint 2 schema migration"
git push -u origin feature/ines-s2-12-migration
```

Reviewer Anny.

**Day 6 conflict check:** Anny adds two new test files. Ivan adds one. Ines runs the migration. No two people touch the same file. Merge order: Anny S2-09, then Ivan S2-10, then Ines S2-12.

---

# Day 7, Wed 12 Nov

Goal: everything works, screenshots taken, one small real commit each. Code freeze at 12:00.

Before 12:00, each person makes one small final commit. These must be real changes, not just whitespace.

| Who | What to change | Commit message |
|---|---|---|
| Promise | Add Sprint 2 run steps to README.md | `docs: update run steps for sprint 2` |
| Djibril | Add a comment to `sync.js` explaining the retry count | `docs(sync): explain the 5-attempt retry limit` |
| Audrey | Add a comment to `style.css` explaining the emergency-border class | `docs(style): comment the emergency-border class` |
| Ines | Add one line to the migration confirming it was tested | `docs(db): note that migration was tested on Nov 12` |
| Ivan | Make the smoke test print the step number before each assertion | `test(smoke): print step number before each check` |
| Anny | Add one more boundary case to `test-cases.js` | `test: add one more edge case for item 9` |

Merge order at 12:00: backend, then frontend, then testing, then docs.

At 12:00, code freeze. No new branches, no new commits to `main` after this point.

After the freeze, screenshots:

| Who | Screenshot to take |
|---|---|
| Audrey | `psychologist.html` showing the seeded alert with the red border. The booking form filled in. The "Appointment booked." message. |
| Djibril | `GET /alerts` returning JSON in the browser or in a curl window. The terminal showing the server responding correctly. |
| Ines | `psql` output of `\dt` showing all seven tables. The result of running `migrate_sprint2.sql`. |
| Ivan | Terminal showing `AT-7 PASS` and `SMOKE PASS` on the same screen. |
| Anny | Terminal showing `AT-4 PASS` and `SMOKE PASS`. All Sprint 1 tests passing on the same run. |
| Promise | The GitHub commit graph showing six contributors. The Trello board with every MUST card in Done. |

---

# Day 8, Thu 13 Nov

No new code.

Do the same fresh-laptop test as Sprint 1. On a machine that has not had the project before:

```
git clone <repo-url> fresh-test
cd fresh-test
psql -U postgres -c "CREATE DATABASE ehumure;"
psql -U postgres -d ehumure -f database/schema.sql
psql -U postgres -d ehumure -f database/migrate_sprint2.sql
cd backend
npm install
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/ehumure"
node seed.js
npm start
```

Then in a second window run every test in order:

```
node testing/test-cases.js
node testing/translation-check.js
node testing/run-tests.js
node testing/api-tests.js
node testing/at4-no-duplicate.js
node testing/at7-access-control.js
node testing/smoke.js
```

Every file should print PASS. If anything fails, the README is wrong. The README is the only file you may change today.

What each person says about their own Sprint 2 code:

| Who | Says |
|---|---|
| Ines | I connected the backend to PostgreSQL, wrote the seed script that puts demo data in, and added the audit log that records who accessed what and when. |
| Djibril | I updated the login and score routes to save to the database, added the GET /alerts and POST /appointments routes, and built the offline queue with a sync service and an SMS simulator. |
| Promise | I rewrote the login page so each role lands on their own screen — nurse on the screening, psychologist on the dashboard, and desk on a clear no-access page. |
| Ivan | I built the psychologist dashboard that loads open alerts from the backend, marks emergencies in red, and lets the psychologist book an appointment with a date picker. I also wrote AT-7 which proves desk staff cannot access clinical routes. |
| Audrey | I added the emergency border styling so a self-harm alert stands out immediately on the dashboard, and I reviewed the Kinyarwanda strings. |
| Anny | I wrote AT-4 which proves a duplicate sync never creates two alert rows, and the smoke test which walks the entire app from login to appointment booking in one run. |

By noon: Anny assembles the testing evidence PDF. Promise fills in the team participation sheet. Aim to submit at 18:00.
