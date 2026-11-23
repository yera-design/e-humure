var crypto = require("crypto");

function key() {
  var value = process.env.PHONE_KEY || "";
  if (!/^[a-f0-9]{64}$/i.test(value)) throw new Error("PHONE_KEY is missing or invalid; configure backend/.env");
  return Buffer.from(value, "hex");
}

// Rwanda mobile prefixes in service for this deployment. 077 is not
// supported and is rejected here, on every form and in the SMS worker.
function isRwandaMobile(phone) {
  return /^(072|073|078|079)[0-9]{7}$/.test(String(phone || "")) && !/^(.)\1{9}$/.test(String(phone));
}

function encryptPhone(phone) {
  var iv = crypto.randomBytes(12);
  var cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  var encrypted = cipher.update(phone, "utf8", "hex") + cipher.final("hex");
  return "gcm:" + iv.toString("hex") + ":" + cipher.getAuthTag().toString("hex") + ":" + encrypted;
}

function decryptPhone(text) {
  var parts = String(text).split(":");
  if (parts.length === 4 && parts[0] === "gcm") {
    var decipher = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(parts[1], "hex"));
    decipher.setAuthTag(Buffer.from(parts[2], "hex"));
    return decipher.update(parts[3], "hex", "utf8") + decipher.final("utf8");
  }
  // Read old AES-CBC records during migration; all new records use authenticated GCM.
  var decipher = crypto.createDecipheriv("aes-256-cbc", key(), Buffer.from(parts[0], "hex"));
  return decipher.update(parts[1], "hex", "utf8") + decipher.final("utf8");
}

function encryptContact(value) { return encryptPhone(value); }
function decryptContact(value) {
  value = String(value || "");
  return value.indexOf("gcm:") === 0 || /^[a-f0-9]{32}:/i.test(value) ? decryptPhone(value) : value;
}

module.exports = { encryptPhone: encryptPhone, decryptPhone: decryptPhone, encryptContact: encryptContact, decryptContact: decryptContact, isRwandaMobile: isRwandaMobile };