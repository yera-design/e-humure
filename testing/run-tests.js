var fs = require("fs");
var path = require("path");
var scoring = require("../backend/scoring");

var patients = JSON.parse(fs.readFileSync(path.join(__dirname, "fake-patients.json"), "utf8"));
var csv = fs.readFileSync(path.join(__dirname, "expected-results.csv"), "utf8");

// Reads the hand-written file. An empty total means the patient did no PHQ-9.
function readExpected(fileText) {
  var map = {};
  fileText.trim().split(/\r?\n/).slice(1).forEach(function (line) {
    var cell = line.split(",");
    var id = (cell[0] || "").trim();
    if (!id) return;
    map[id] = {
      total: (cell[1] || "").trim() === "" ? null : Number((cell[1] || "").trim()),
      risk: (cell[2] || "").trim().toLowerCase(),
      emergency: ["true", "yes", "1"].indexOf((cell[3] || "").trim().toLowerCase()) !== -1,
      filled: (cell[2] || "").trim() !== ""
    };
  });
  return map;
}

function actualFor(patient) {
  if (!patient.phq9) return scoring.scoreQuickQuestions(patient.whooley);
  return scoring.scoreFullQuestionnaire(patient.phq9);
}

var expected = readExpected(csv);
var correct = 0;
var notFilled = [];

patients.forEach(function (patient) {
  var want = expected[patient.id];
  if (!want) {
    console.log(patient.id + ": missing from expected-results.csv");
    return;
  }
  if (!want.filled) {
    notFilled.push(patient.id);
    return;
  }
  var got = actualFor(patient);
  var problems = [];
  if (want.total !== got.total) problems.push("total expected " + want.total + ", code says " + got.total);
  if (want.risk !== got.risk) problems.push("risk expected " + want.risk + ", code says " + got.risk);
  if (want.emergency !== got.emergency) problems.push("emergency expected " + want.emergency + ", code says " + got.emergency);
  if (problems.length === 0) correct += 1;
  else console.log(patient.id + ": " + problems.join(" | "));
});

if (notFilled.length) {
  console.log("Not filled in yet (" + notFilled.length + "): " + notFilled.join(", "));
}
console.log(correct + " of " + patients.length + " patients scored correctly");
