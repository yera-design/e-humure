var jwt = require("jsonwebtoken");
var permissions = require("./permissions");

var SECRET = process.env.JWT_SECRET || "ehumure-sprint1-demo-secret";
var SAME_LOGIN_ERROR = "Invalid username or password";

function createToken(user) {
  return jwt.sign({ username: user.username, role: user.role }, SECRET, { expiresIn: "8h" });
}

// Reads "Authorization: Bearer <token>" and puts the user on the request.
function requireLogin(req, res, next) {
  var header = req.headers.authorization || "";
  var token = header.indexOf("Bearer ") === 0 ? header.slice(7) : "";
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: "Missing or invalid token" });
  }
}

function requirePermission(action) {
  return function (req, res, next) {
    if (!permissions.canDo(req.user.role, action)) {
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
