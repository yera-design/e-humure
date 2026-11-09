/* backend/sms-simulator.js | owner: Djibril | card: S2-03 | branch: feature/djibril-s2-03-sms-sim
   Run: node backend/sms-simulator.js
   Env: FAIL_RATE=0.3 (fraction of calls that return 500, default 0) */

var express = require("express");
var app = express();
var PORT = 4002;
var FAIL_RATE = parseFloat(process.env.FAIL_RATE || "0");

app.use(express.json());

app.post("/send", function (req, res) {
  var body = req.body || {};
  if (Math.random() < FAIL_RATE) {
    console.log("FAIL  phone=" + body.phone);
    return res.status(500).json({ error: "simulated failure" });
  }
  console.log("SENT  phone=" + body.phone + "  msg=" + (body.message || "").slice(0, 60));
  res.json({ ok: true });
});

app.listen(PORT, function () {
  console.log("SMS simulator on http://localhost:" + PORT + "  FAIL_RATE=" + FAIL_RATE);
});
