var attempts = new Map();
var WINDOW_MS = 15 * 60 * 1000;
var MAX_ATTEMPTS = 6;

function ipv4Number(ip) {
  var parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some(function (part) { return !Number.isInteger(part) || part < 0 || part > 255; })) return null;
  return parts.reduce(function (value, part) { return (value * 256) + part; }, 0) >>> 0;
}

function isFacilityNetwork(ip) {
  ip = String(ip || "").replace(/^::ffff:/i, "");
  if (ip === "::1" || ip === "localhost") return true;
  if (/^(fc|fd)[0-9a-f]{2}:/i.test(ip) || /^fe[89ab][0-9a-f]:/i.test(ip)) return true;
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return false;
  var n = ipv4Number(ip);
  if (n === null) return false;
  return (n >>> 24) === 10 || (n >>> 16) === 0xC0A8 ||
    ((n >>> 20) === 0xAC1) || (n >>> 24) === 127;
}

function facilityNetworkOnly(req, res, next) {
  var ip = req.socket.remoteAddress || "";
  if (!isFacilityNetwork(ip)) {
    console.warn("blocked request outside facility network", ip, req.method, req.path);
    return res.status(403).json({ error: "This system is available only on the facility network." });
  }
  next();
}

function loginKey(ip, username) { return String(ip) + "|" + String(username || "").toLowerCase(); }

function canAttemptLogin(ip, username) {
  var now = Date.now(), key = loginKey(ip, username), entry = attempts.get(key);
  if (attempts.size > 10000) attempts.forEach(function (value, oldKey) { if (now - value.startedAt > WINDOW_MS) attempts.delete(oldKey); });
  if (!entry || now - entry.startedAt > WINDOW_MS) {
    attempts.set(key, { startedAt: now, count: 0 });
    entry = attempts.get(key);
  }
  return entry.count < MAX_ATTEMPTS;
}

function recordLoginFailure(ip, username) {
  var key = loginKey(ip, username), entry = attempts.get(key) || { startedAt: Date.now(), count: 0 };
  entry.count += 1;
  attempts.set(key, entry);
}

function clearLoginFailures(ip, username) { attempts.delete(loginKey(ip, username)); }

module.exports = {
  facilityNetworkOnly: facilityNetworkOnly,
  isFacilityNetwork: isFacilityNetwork,
  canAttemptLogin: canAttemptLogin,
  recordLoginFailure: recordLoginFailure,
  clearLoginFailures: clearLoginFailures
};
