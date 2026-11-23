/* backend/sms-messages.js
   The exact text of every SMS the system sends. Kept in one file so the
   wording can be reviewed without reading the worker.

   Rules these messages follow
     1. Every message is bilingual: Kinyarwanda first, then English. The system
        stores no language preference for a patient or a staff member, so both
        are always sent rather than guessing.
     2. A patient message never contains a name, a patient code, a score or a
        risk level. It says where and when, and nothing clinical.
     3. A staff message carries the patient code only, never a name.
     4. Every message names the sender ("e-Humure") so the recipient knows who
        is writing before they read anything else.
     5. Dates are written in Rwanda local time in one fixed format, so the same
        appointment always reads the same way.
*/

var TIME_ZONE = "Africa/Kigali";
var DEFAULT_PLACE = { rw: "ivuriro ryawe", en: "your health facility" };

var MONTHS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

/* "18/11/2026 at 14:30" in Rwanda local time.
   Intl is used when the runtime has full time-zone data; the manual branch
   keeps the output identical on a stripped-down Node build. */
function formatWhen(value) {
  var date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";

  try {
    var parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: TIME_ZONE,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).formatToParts(date).reduce(function (all, part) {
      all[part.type] = part.value;
      return all;
    }, {});

    if (parts.day && parts.month && parts.year && parts.hour && parts.minute) {
      return parts.day + "/" + parts.month + "/" + parts.year + " " + parts.hour + ":" + parts.minute;
    }
  } catch (error) {
    // Fall through to the manual format below.
  }

  // Rwanda is UTC+02:00 all year, with no daylight saving.
  var local = new Date(date.getTime() + 2 * 60 * 60 * 1000);
  return String(local.getUTCDate()).padStart(2, "0") + "/" +
    MONTHS[local.getUTCMonth()] + "/" +
    local.getUTCFullYear() + " " +
    String(local.getUTCHours()).padStart(2, "0") + ":" +
    String(local.getUTCMinutes()).padStart(2, "0");
}

/* Each builder receives { place, when, patientId } and returns one object with
   the Kinyarwanda and the English sentence. They are joined in that order. */
var TEMPLATES = {
  confirmation: function (field) {
    return {
      rw: "e-Humure: Gahunda yo gukurikiranwa yemejwe kuri " + field.place.rw + " ku itariki " + field.when +
          ". Nutabasha kuza, hamagara ivuriro mbere y'igihe.",
      en: "e-Humure: Your follow-up appointment at " + field.place.en + " is booked for " + field.when +
          ". Please call the facility in advance if you cannot attend."
    };
  },

  appointment: function (field) {
    return {
      rw: "e-Humure: Urwibutso. Ufite gahunda kuri " + field.place.rw + " ku itariki " + field.when +
          ". Nutabasha kuza, hamagara ivuriro mbere y'igihe.",
      en: "e-Humure: Reminder. You have an appointment at " + field.place.en + " on " + field.when +
          ". Please call the facility in advance if you cannot attend."
    };
  },

  // Sent once when a staff member or facility head is approved. Nothing is
  // sent on rejection. A facility head also receives the new facility code,
  // which they need on the sign-in screen.
  access_approved: function (field) {
    return {
      rw: "e-Humure: Uburenganzira bwawe bwemejwe. Ubu ushobora kwinjira." +
          (field.facilityCode ? " Kode y'ivuriro: " + field.facilityCode + "." : ""),
      en: "e-Humure: Your access has been approved. You can now sign in." +
          (field.facilityCode ? " Facility code: " + field.facilityCode + "." : "")
    };
  },

  staff_reminder: function (field) {
    return {
      rw: "e-Humure: Urwibutso. Uzakira umurwayi " + field.patientId + " kuri " + field.place.rw +
          " ku itariki " + field.when + ".",
      en: "e-Humure: Reminder. You are seeing patient " + field.patientId + " at " + field.place.en +
          " on " + field.when + "."
    };
  }
};

/* job: { message_type, scheduled_for, facility_name, location, patient_id, facility_code } */
function buildMessage(job) {
  job = job || {};

  var facility = String(job.facility_name || job.location || "").trim();
  var field = {
    when: formatWhen(job.scheduled_for),
    patientId: String(job.patient_id || "").trim(),
    facilityCode: String(job.facility_code || "").trim(),
    place: facility ? { rw: facility, en: facility } : DEFAULT_PLACE
  };

  var template = TEMPLATES[job.message_type] || TEMPLATES.appointment;
  var written = template(field);
  return written.rw + " | " + written.en;
}

module.exports = {
  buildMessage: buildMessage,
  formatWhen: formatWhen,
  TIME_ZONE: TIME_ZONE,
  MESSAGE_TYPES: Object.keys(TEMPLATES)
};

