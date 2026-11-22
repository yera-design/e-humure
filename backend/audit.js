var pool = require("./db");

async function logAccess(staffId, action, recordType, recordId, req, outcome, actorLabel) {
  try {
    var user = req && req.user;
    var body = req && req.body || {};
    var facilityId = user && user.facilityId || body.facilityId || null;
    var actor = actorLabel || (user && user.username) || body.username || null;
    var ip = req && req.socket && req.socket.remoteAddress || null;
    await pool.query(
      "INSERT INTO audit_log(staff_id,action,record_type,record_id,actor_label,ip_address,outcome,facility_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
      [staffId || null, action, recordType, String(recordId), actor, ip, outcome || "success", facilityId]
    );
  } catch (error) {
    console.error("audit log write failed:", error.message);
  }
}

module.exports = { logAccess: logAccess };
