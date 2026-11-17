var jwt = require("jsonwebtoken");
var permissions = require("./permissions");

var SECRET = process.env.JWT_SECRET;
if (!SECRET || SECRET.length < 32) throw new Error("JWT_SECRET is missing or too short; configure backend/.env");
var SAME_LOGIN_ERROR = "Invalid username or password";

function createToken(user) {
  return jwt.sign({
    username: user.username,
    name: user.name,
    staffId: user.staff_id,
    role: user.role,
    facilityId: user.facility_id
}, SECRET, { expiresIn: "8h" });
}

// Reads "Authorization: Bearer <token>" and puts the user on the request.
function requireLogin(req, res, next) {
  var header = req.headers.authorization || "";
  var token = header.indexOf("Bearer ") === 0 ? header.slice(7) : "";
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch (err) {
    require("./audit").logAccess(null, "invalid_token", "route", req.path, req, "denied");
    res.status(401).json({ error: "Missing or invalid token" });
  }
}

function requirePermission(action) {
  return function (req, res, next) {
    if (!permissions.canDo(req.user.role, action)) {
      require("./audit").logAccess(req.user.staffId, "permission_denied:" + action, "route", req.path, req);
      return res.status(403).json({ error: "Your role is not allowed to do this" });
    }
    next();
  };
}

module.exports = {
  createToken: createToken,
  requireLogin: requireLogin,
  requirePermission: requirePermission,
  SAME_LOGIN_ERROR: SAME_LOGIN_ERROR
};
