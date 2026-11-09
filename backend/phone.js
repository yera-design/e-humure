var crypto = require("crypto");

function key() {
  return Buffer.from((process.env.PHONE_KEY || "ehumure-demo-key-32bytes-padding!").slice(0, 32));
}

function encryptPhone(phone) {
  var iv = crypto.randomBytes(16);
  var cipher = crypto.createCipheriv("aes-256-cbc", key(), iv);
  return iv.toString("hex") + ":" + cipher.update(phone, "utf8", "hex") + cipher.final("hex");
}

function decryptPhone(text) {
  var parts = String(text).split(":");
  var decipher = crypto.createDecipheriv("aes-256-cbc", key(), Buffer.from(parts[0], "hex"));
  return decipher.update(parts[1], "hex", "utf8") + decipher.final("utf8");
}

module.exports = { encryptPhone: encryptPhone, decryptPhone: decryptPhone };
