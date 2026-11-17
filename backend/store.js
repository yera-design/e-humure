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
