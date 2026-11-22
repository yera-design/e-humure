# SMS messages

Every message the system sends is defined in `backend/sms-messages.js`. Nothing
else composes message text. `backend/sms-worker.js` only decides when to send
and to whom.

## Rules every message follows

1. **Bilingual, Kinyarwanda first, then English**, joined with ` | `. The
   system stores no language preference for a patient or a staff member, so
   both are sent rather than guessing.
2. **No patient name, ever.** Patients are stored by code only.
3. **No clinical detail to a patient.** No score, no severity, no risk word, no
   mention of mental health. A patient message says where and when, nothing
   else. This is checked by `testing/sms-message-tests.js`.
4. **A staff message carries the patient code only**, never a name.
5. **Every message opens with `e-Humure:`** so the recipient knows who is
   writing before they read anything.
6. **One date format**, Rwanda local time (Africa/Kigali, UTC+02:00 all year):
   `dd/mm/yyyy hh:mm`, for example `18/11/2026 19:12`.

## The three messages

An appointment produces three queued rows. Rescheduling cancels the queued rows
and queues three fresh ones.

### 1. Patient confirmation — sent immediately on booking

> e-Humure: Gahunda yo gukurikiranwa yemejwe kuri **Kimironko Health Center** ku itariki **18/11/2026 19:12**. Nutabasha kuza, hamagara ivuriro mbere y'igihe. | e-Humure: Your follow-up appointment at **Kimironko Health Center** is booked for **18/11/2026 19:12**. Please call the facility in advance if you cannot attend.

### 2. Patient reminder — sent the day before

> e-Humure: Urwibutso. Ufite gahunda kuri **Kimironko Health Center** ku itariki **18/11/2026 19:12**. Nutabasha kuza, hamagara ivuriro mbere y'igihe. | e-Humure: Reminder. You have an appointment at **Kimironko Health Center** on **18/11/2026 19:12**. Please call the facility in advance if you cannot attend.

### 3. Staff reminder — sent the day before, to the clinician

> e-Humure: Urwibutso. Uzakira umurwayi **P004** kuri **Kimironko Health Center** ku itariki **18/11/2026 19:12**. | e-Humure: Reminder. You are seeing patient **P004** at **Kimironko Health Center** on **18/11/2026 19:12**.

When a facility name is missing, the place falls back to `ivuriro ryawe` /
`your health facility` in the respective half of the message. A message never
contains `undefined`, `null` or `Invalid Date`.

## Who gets a message, and on which number

Contact details in e-Humure are **phone numbers only**. There is no email field
anywhere in the system and no email validation.

| Recipient | Number used | If it is unusable |
|---|---|---|
| Patient | `patient.phone_enc`, decrypted | the job fails with a clear reason; a bad patient number is a data problem worth surfacing |
| Staff | `staff.contact`, decrypted | no SMS is sent, the job is marked failed with "recipient has no usable Rwanda mobile number on file" |

A usable number is 10 digits starting **072, 073, 078 or 079**. The 077 prefix
is **not supported** and is rejected on every form, in the backend and in the
SMS worker. Numbers are converted to `+250…` only at the moment of handing them
to the provider.

## Delivery and what each status means

`SMS_PROVIDER` in `backend/.env` is either `simulator` (default) or
`africastalking`.

| `sms_reminder.status` | Meaning |
|---|---|
| `queued` | waiting for its send time |
| `processing` | claimed by the worker |
| `sent` | the provider accepted it, or the simulator logged it |
| `simulated` | Africa's Talking was unreachable after 3 attempts and the local simulator took it. **Not delivered to a phone.** |
| `failed` | rejected, or no usable number |
| `cancelled` | superseded by a reschedule |

The worker log never prints a full phone number. It prints a mask such as
`+250 78* *** *67`, and never prints message text or credentials.

## Changing the wording

Edit `backend/sms-messages.js` only, then run:

```
node testing/sms-message-tests.js
```

That suite checks both languages are present, the sender is named, no patient
code leaks into a patient message, and no clinical word appears in any message.
