/* testing/sms-message-tests.js
   Checks the wording of the three appointment messages and who they go to.
   No database and no simulator needed: only the pure helpers are used.
   Usage: node testing/sms-message-tests.js
*/
// Synthetic key only; the suite never reads or depends on a real .env key.
process.env.PHONE_KEY = "a".repeat(64);
var worker = require("../backend/sms-worker");
var messages = require("../backend/sms-messages");
var phone = require("../backend/phone");

var failures = [];
function check(name, condition, detail) {
  if (condition) { console.log("  PASS  " + name); return; }
  failures.push(name);
  console.log("  FAIL  " + name + (detail ? " -> " + detail : ""));
}

var FACILITY = "Kimironko Health Center";
var when = "2026-11-18T17:12:00.000Z"; // 19:12 Rwanda time
var base = { scheduled_for: when, facility_name: FACILITY, patient_id: "P001" };

console.log("1. Date and time");
check("formats Rwanda local time as dd/mm/yyyy hh:mm",
  messages.formatWhen(when) === "18/11/2026 19:12", messages.formatWhen(when));
check("an unusable date never leaks 'Invalid Date'",
  messages.formatWhen("not a date") === "", messages.formatWhen("not a date"));

console.log("\n2. Patient messages");
var confirmation = worker.buildMessage(Object.assign({ message_type: "confirmation" }, base));
check("confirmation names the facility", confirmation.indexOf(FACILITY) > 0, confirmation);
check("confirmation says the appointment is booked", /booked/i.test(confirmation), confirmation);
check("confirmation is bilingual", /Gahunda/.test(confirmation) && /appointment/i.test(confirmation), confirmation);
check("confirmation names the sender", confirmation.indexOf("e-Humure:") === 0, confirmation);
check("confirmation carries no patient code", confirmation.indexOf("P001") < 0, confirmation);

var reminder = worker.buildMessage(Object.assign({ message_type: "appointment" }, base));
check("day-before reminder is a reminder", /reminder/i.test(reminder), reminder);
check("day-before reminder is bilingual", /Urwibutso/.test(reminder) && /Reminder/.test(reminder), reminder);
check("day-before reminder carries no patient code", reminder.indexOf("P001") < 0, reminder);
check("day-before reminder differs from the confirmation", reminder !== confirmation);

console.log("\n3. Staff message");
var staffNote = worker.buildMessage(Object.assign({ message_type: "staff_reminder" }, base));
check("staff reminder names the patient code", staffNote.indexOf("P001") > 0, staffNote);
check("staff reminder names the facility", staffNote.indexOf(FACILITY) > 0, staffNote);
check("staff reminder is bilingual", /Urwibutso/.test(staffNote) && /Reminder/.test(staffNote), staffNote);
check("staff reminder differs from the patient reminder", staffNote !== reminder);

console.log("\n4. No message leaks clinical detail or a placeholder");
[confirmation, reminder, staffNote].forEach(function (text, index) {
  check("message " + (index + 1) + " has no undefined or null", text.indexOf("undefined") < 0 && text.indexOf("null") < 0, text);
  check("message " + (index + 1) + " carries no score or risk word", !/PHQ|score|risk|severe|depress/i.test(text), text);
});

console.log("\n5. Falls back safely when a facility name is missing");
var noFacility = worker.buildMessage({ message_type: "appointment", scheduled_for: when, patient_id: "P001" });
check("uses a neutral place name in both languages",
  /ivuriro ryawe/.test(noFacility) && /your health facility/.test(noFacility), noFacility);

console.log("\n6. Who gets it");
check("a patient message uses the patient's number",
  worker.recipientNumber({ recipient_kind: "patient", phone_enc: phone.encryptPhone("0781234567") }) === "0781234567");
check("a staff message uses the staff mobile number",
  worker.recipientNumber({ recipient_kind: "staff", staff_contact_enc: phone.encryptContact("0721234567") }) === "0721234567");
check("a staff member with no contact on file gets no SMS",
  worker.recipientNumber({ recipient_kind: "staff", staff_contact_enc: null }) === null);
check("a staff member with an unusable contact gets no SMS, and no throw",
  worker.recipientNumber({ recipient_kind: "staff", staff_contact_enc: phone.encryptContact("not-a-number") }) === null);

console.log("\n7. 077 is no longer a usable prefix");
check("077 is rejected as a patient number", phone.isRwandaMobile("0771234567") === false);
["0721234567", "0731234567", "0781234567", "0791234567"].forEach(function (number) {
  check(number.slice(0, 3) + " is still accepted", phone.isRwandaMobile(number) === true);
});
check("an 077 staff contact gets no SMS",
  worker.recipientNumber({ recipient_kind: "staff", staff_contact_enc: phone.encryptContact("0771234567") }) === null);

if (failures.length) {
  console.log("\n" + failures.length + " check(s) failed.");
  process.exit(1);
}
console.log("\nAll checks passed.");