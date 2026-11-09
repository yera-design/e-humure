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
