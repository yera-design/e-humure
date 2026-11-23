/* backend/sms-worker.js
   Processes queued appointment and access-approval messages using the configured provider.
   Africa's Talking transient network outages fall back to the local simulator
   only after the retry limit; that outcome is explicitly stored as simulated.
*/

var config = require("./config");
config.loadEnvFile();
process.env.GATEWAY_URL = "http://127.0.0.1:4002/send";
var pool;
var stopping = false;

function getPool() {
  if (!pool) pool = require("./db");
  return pool;
}

var phone = require("./phone");
var sms = require("./sms");
var providers = require("./sms-providers");
var messages = require("./sms-messages");

/* The wording of every message lives in sms-messages.js. */
function buildMessage(job) {
  return messages.buildMessage(job);
}

/* Who receives it, and on which number.

   Contact details in e-Humure are phone numbers only: there is no email
   anywhere in the system. A staff member whose stored contact is not a usable
   Rwanda mobile number simply gets no SMS, and the job is marked failed with a
   clear reason rather than throwing. A patient record with an unusable number
   is a data problem, so that one is raised. */
function recipientNumber(job) {
  if (job.recipient_kind === "staff") {
    if (!job.staff_contact_enc) return null;
    var contact = phone.decryptContact(job.staff_contact_enc);
    return phone.isRwandaMobile(contact) ? contact : null;
  }

  var number = phone.decryptPhone(job.phone_enc);

  if (!phone.isRwandaMobile(number)) {
    throw new Error("Invalid Rwanda mobile number for SMS recipient");
  }

  return number;
}

function rwandaToInternational(number) {
  if (!phone.isRwandaMobile(number)) {
    throw new Error("Invalid Rwanda mobile number: expected 10 digits starting 072, 073, 078 or 079");
  }

  return "+250" + String(number).slice(1);
}

function maskNumber(number) {
  var intl;

  try {
    intl = String(number).indexOf("+250") === 0
      ? String(number)
      : rwandaToInternational(number);
  } catch (error) {
    return "unavailable";
  }

  if (!/^\+250[0-9]{9}$/.test(intl)) return "unavailable";

  return "+250 " + intl.slice(4, 6) + "* *** *" + intl.slice(-2);
}

function formatWorkerLog(id, provider, number, kind, outcome) {
  return "SMS id=" + id +
    " provider=" + provider +
    " to=" + maskNumber(number) +
    " kind=" + kind +
    " result=" + outcome;
}

function markFailed(id, reason) {
  return getPool().query(
    "UPDATE sms_reminder SET status='failed',last_error=$2 WHERE reminder_id=$1",
    [id, String(reason).slice(0, 300)]
  );
}

function retryLater(id, attempts, reason) {
  var delayMinutes = Math.pow(2, attempts) * 5;

  return getPool().query(
    "UPDATE sms_reminder SET status='queued',send_on=now()+($2::text||' minutes')::interval,last_error=$3 WHERE reminder_id=$1",
    [id, delayMinutes, String(reason).slice(0, 300)]
  );
}

async function processOne() {
  var db = getPool();
  var client = await db.connect();
  var job;

  try {
    await client.query("BEGIN");

    var claimed = await client.query(
      // Approval messages have no appointment, so the appointment and patient
      // are LEFT joins. They are always addressed to staff.
      "SELECT r.reminder_id,r.appointment_id,r.attempts,r.message_type,r.recipient_kind,r.facility_code, " +
      "a.patient_id,a.scheduled_for,a.location,p.phone_enc,f.name AS facility_name, " +
      "st.contact AS staff_contact_enc,st.full_name AS staff_name " +
      "FROM sms_reminder r LEFT JOIN appointment a ON a.appointment_id=r.appointment_id " +
      "LEFT JOIN patient p ON p.patient_id=a.patient_id " +
      "LEFT JOIN facility f ON f.facility_id=p.facility_id " +
      "LEFT JOIN staff st ON st.staff_id=r.recipient_staff_id " +
      "WHERE r.status='queued' AND r.send_on<=now() ORDER BY r.send_on FOR UPDATE OF r SKIP LOCKED LIMIT 1"
    );

    if (!claimed.rowCount) {
      await client.query("COMMIT");
      return false;
    }

    job = claimed.rows[0];

    await client.query(
      "UPDATE sms_reminder SET status='processing',attempts=attempts+1 WHERE reminder_id=$1",
      [job.reminder_id]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  var settings = config.smsSettings();
  var number;

  try {
    number = recipientNumber(job);
  } catch (error) {
    await markFailed(job.reminder_id, "invalid or unreadable Rwanda mobile number");
    console.log(formatWorkerLog(
      job.reminder_id,
      settings.provider,
      null,
      job.message_type,
      "failed_invalid_number"
    ));
    return true;
  }

  if (!number) {
    await markFailed(job.reminder_id, "recipient has no usable Rwanda mobile number on file");
    console.log(formatWorkerLog(
      job.reminder_id,
      settings.provider,
      null,
      job.message_type,
      "failed_no_mobile_number"
    ));
    return true;
  }

  var message = buildMessage(job);
  var attempts = Number(job.attempts) + 1;
  var result;

  if (settings.provider === "africastalking") {
    result = await providers.sendAfricaTalkingSms(
      rwandaToInternational(number),
      message,
      settings
    );
  } else {
    try {
      result = await sms.sendSms(number, message);
    } catch (error) {
      result = { ok: false, error: "simulator unavailable" };
    }
  }

  if (result.ok) {
    await db.query(
      "UPDATE sms_reminder SET status='sent',last_error=NULL WHERE reminder_id=$1",
      [job.reminder_id]
    );

    var success = settings.provider === "simulator"
      ? "SIMULATED_only_not_delivered"
      : "provider_accepted_" + result.providerState + "_delivery_unconfirmed";

    console.log(formatWorkerLog(
      job.reminder_id,
      settings.provider,
      number,
      job.message_type,
      success
    ));
  } else if (attempts < 3) {
    await retryLater(
      job.reminder_id,
      attempts,
      result.error || "provider request failed"
    );

    console.log(formatWorkerLog(
      job.reminder_id,
      settings.provider,
      number,
      job.message_type,
      "queued_retry_" + attempts + "_of_3_" +
        String(result.error || "provider_error")
          .replace(/[^a-zA-Z0-9_() -]/g, "")
          .replace(/\s+/g, "_")
    ));
  } else if (settings.provider === "africastalking" && result.retryable) {
    // Use the local simulator only after repeated temporary transport failures.
    // A provider rejection is not represented as a successful patient delivery.
    var fallback;

    try {
      fallback = await sms.sendSms(number, message);
    } catch (error) {
      fallback = { ok: false };
    }

    if (fallback && fallback.ok) {
      await db.query(
        "UPDATE sms_reminder SET status='simulated',last_error=$2 WHERE reminder_id=$1",
        [
          job.reminder_id,
          "Africa's Talking unavailable after 3 attempts; local simulator only, not delivered"
        ]
      );

      console.log(formatWorkerLog(
        job.reminder_id,
        "simulator",
        number,
        job.message_type,
        "SIMULATED_fallback_not_delivered"
      ));
    } else {
      await markFailed(
        job.reminder_id,
        "Africa's Talking retry limit reached; simulator fallback unavailable"
      );

      console.log(formatWorkerLog(
        job.reminder_id,
        "africastalking",
        number,
        job.message_type,
        "failed_after_3_attempts_and_fallback"
      ));
    }
  } else {
    await markFailed(
      job.reminder_id,
      result.error || "provider rejected message"
    );

    console.log(formatWorkerLog(
      job.reminder_id,
      settings.provider,
      number,
      job.message_type,
      "failed_after_" + attempts + "_attempts_" +
        String(result.error || "provider_error")
          .replace(/[^a-zA-Z0-9_() -]/g, "")
          .replace(/\s+/g, "_")
    ));
  }

  return true;
}

async function run() {
  config.validate();

  var db = getPool();
  var once = process.argv.indexOf("--once") >= 0;
    process.on("SIGTERM", function () {
    console.log("SMS worker stopping...");
    stopping = true;
  });

  process.on("SIGINT", function () {
    console.log("SMS worker stopping...");
    stopping = true;
  });

  do {
    try {
      var worked = await processOne();

      if (once) break;

      if (!worked) {
        await new Promise(function (resolve) {
          setTimeout(resolve, 5000);
        });
      }
    } catch (error) {
      console.error("SMS worker error:", error.message);

      if (once) process.exitCode = 1;

      await new Promise(function (resolve) {
        setTimeout(resolve, 5000);
      });
    }
  } while (!once && !stopping);

  await db.end();
}

if (require.main === module) run();

module.exports = {
  buildMessage: buildMessage,
  recipientNumber: recipientNumber,
  rwandaToInternational: rwandaToInternational,
  maskNumber: maskNumber,
  formatWorkerLog: formatWorkerLog,
  processOne: processOne
};

