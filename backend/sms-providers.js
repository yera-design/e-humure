/* Africa's Talking SMS transport. No credentials, phone numbers, or message
   text are logged here. The request function is injectable for offline tests. */
var https = require("https");

var REQUEST_TIMEOUT_MS = 15000;
var MAX_RESPONSE_BYTES = 1024 * 1024;
var SUCCESS_CODES = { 100: true, 101: true, 102: true };

function errorResult(message, retryable) {
  return { ok: false, error: message, retryable: retryable === true };
}

function networkReason(error) {
  if (error && (error.code === "ETIMEDOUT" || error.code === "ESOCKETTIMEDOUT")) return "request timed out";
  if (error && error.code && /^E[A-Z0-9_]{2,32}$/.test(error.code)) return "network error (" + error.code + ")";
  return "network error";
}

function postForm(options) {
  return new Promise(function (resolve, reject) {
    var parsed = new URL(options.url);
    if (parsed.protocol !== "https:") return reject(new Error("SMS endpoint must use HTTPS"));
    var settled = false;
    var request;
    var timer;
    function clearTimer() { if (timer) clearTimeout(timer); }
    function fail(error) {
      if (settled) return;
      settled = true;
      clearTimer();
      reject(error);
    }
    try {
      request = https.request({
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: parsed.pathname + parsed.search,
        method: "POST",
        headers: Object.assign({}, options.headers, { "Content-Length": Buffer.byteLength(options.body) })
      }, function (response) {
        var chunks = [];
        var size = 0;
        response.on("data", function (chunk) {
          size += chunk.length;
          if (size > MAX_RESPONSE_BYTES) {
            var tooLarge = new Error("provider response too large");
            tooLarge.code = "ERESPONSETOOLARGE";
            response.destroy(tooLarge);
            return;
          }
          chunks.push(chunk);
        });
        response.on("error", fail);
        response.on("end", function () {
          if (settled) return;
          settled = true;
          clearTimer();
          resolve({ statusCode: response.statusCode, body: Buffer.concat(chunks).toString("utf8") });
        });
      });
    } catch (error) {
      return fail(error);
    }
    timer = setTimeout(function () {
      var timeout = new Error("request timed out");
      timeout.code = "ETIMEDOUT";
      request.destroy(timeout);
    }, REQUEST_TIMEOUT_MS);
    request.on("error", fail);
    request.end(options.body);
  });
}

function parseResponse(response) {
  if (!response || !Number.isInteger(Number(response.statusCode))) return errorResult("invalid HTTP response", true);
  var httpStatus = Number(response.statusCode);
  // The official Africa's Talking Node SDK treats HTTP 201 (Created) as the
  // successful send response. Other statuses are not assumed to be success.
  if (httpStatus !== 201) {
    return errorResult("provider HTTP " + httpStatus, httpStatus === 429 || httpStatus >= 500 || (httpStatus >= 200 && httpStatus < 300));
  }
  var data;
  try { data = JSON.parse(response.body); }
  catch (error) { return errorResult("malformed provider response", true); }
  var recipients = data && data.SMSMessageData && data.SMSMessageData.Recipients;
  if (!Array.isArray(recipients) || recipients.length !== 1 || !recipients[0]) {
    return errorResult("malformed provider response", true);
  }
  var recipient = recipients[0];
  var code = Number(recipient.statusCode);
  if (String(recipient.status || "").toLowerCase() !== "success" || !SUCCESS_CODES[code]) {
    return errorResult("provider rejected recipient (statusCode=" + (Number.isFinite(code) ? code : "unknown") + ")", false);
  }
  var state = code === 101 ? "sent" : (code === 102 ? "queued" : "processed");
  return { ok: true, provider: "africastalking", providerState: state };
}

async function sendAfricaTalkingSms(number, message, settings, requestImpl) {
  if (!settings || !settings.username || !settings.apiKey) {
    return errorResult("Africa's Talking credentials are missing", false);
  }
  var fields = new URLSearchParams();
  fields.set("username", settings.username);
  fields.set("to", number);
  fields.set("message", message);
  if (settings.senderId) fields.set("from", settings.senderId);
  var options = {
    url: settings.endpoint,
    headers: {
      apiKey: settings.apiKey,
      Accept: "application/json",
      "User-Agent": "e-Humure/2.0 (Node.js)",
      "Content-Type": "application/x-www-form-urlencoded"
    },

    body: fields.toString(),
    timeoutMs: REQUEST_TIMEOUT_MS
  };
  try {
    var response = await (requestImpl || postForm)(options);
    return parseResponse(response);
  } catch (error) {
    return errorResult(networkReason(error), true);
  }
}

module.exports = {
  sendAfricaTalkingSms: sendAfricaTalkingSms,
  parseResponse: parseResponse,
  postForm: postForm,
  REQUEST_TIMEOUT_MS: REQUEST_TIMEOUT_MS
};
