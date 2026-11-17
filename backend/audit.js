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
