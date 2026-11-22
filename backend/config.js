var fs = require("fs");
var path = require("path");

var SANDBOX_SMS_ENDPOINT = "https://api.sandbox.africastalking.com/version1/messaging";
var LIVE_SMS_ENDPOINT = "https://api.africastalking.com/version1/messaging";

function loadEnvFile() {
  var file = path.join(__dirname, ".env");
  if (!fs.existsSync(file)) return;
  fs.readFileSync(file, "utf8").split(/\r?\n/).forEach(function (line) {
    var clean = line.trim();
    if (!clean || clean.charAt(0) === "#") return;
    var split = clean.indexOf("=");
    if (split < 1) return;
    var key = clean.slice(0, split).trim();
    var value = clean.slice(split + 1).trim().replace(/^(["'])(.*)\1$/, "$2");
    if (!process.env[key]) process.env[key] = value;
  });
}

function validate(env) {
  env = env || process.env;
  if (!/^[a-f0-9]{64}$/i.test(env.JWT_SECRET || "")) {
    throw new Error("Set JWT_SECRET to 64 random hexadecimal characters in backend/.env");
  }
  if (!/^[a-f0-9]{64}$/i.test(env.PHONE_KEY || "")) {
    throw new Error("Set PHONE_KEY to 64 hexadecimal characters in backend/.env");
  }
  if (!/^[a-f0-9]{64}$/i.test(env.SETUP_SECRET || "")) {
    throw new Error("Set SETUP_SECRET to 64 random hexadecimal characters in backend/.env");
  }
  smsSettings(env);
}

function smsSettings(env) {
  env = env || process.env;
  var provider = String(env.SMS_PROVIDER || "simulator").trim().toLowerCase();
  if (provider !== "simulator" && provider !== "africastalking") {
    throw new Error("SMS_PROVIDER must be simulator or africastalking");
  }
  var endpoint = String(env.AT_ENDPOINT || SANDBOX_SMS_ENDPOINT).trim();
  if (endpoint !== SANDBOX_SMS_ENDPOINT && endpoint !== LIVE_SMS_ENDPOINT) {
    throw new Error("AT_ENDPOINT must be the official Africa's Talking sandbox or live messaging endpoint");
  }
  var username = String(env.AT_USERNAME || "").trim();
  var apiKey = String(env.AT_API_KEY || "").trim();
  if (provider === "africastalking" && (!username || !apiKey)) {
    throw new Error("SMS_PROVIDER=africastalking requires AT_USERNAME and AT_API_KEY in backend/.env");
  }
  return {
    provider: provider,
    username: username,
    apiKey: apiKey,
    endpoint: endpoint,
    senderId: String(env.AT_SENDER_ID || "").trim()
  };
}

module.exports = {
  loadEnvFile: loadEnvFile,
  validate: validate,
  smsSettings: smsSettings,
  SANDBOX_SMS_ENDPOINT: SANDBOX_SMS_ENDPOINT,
  LIVE_SMS_ENDPOINT: LIVE_SMS_ENDPOINT
};
