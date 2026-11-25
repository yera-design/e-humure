# e-Humure: Guide for the facilitator / marker

This page lists **every account, key and password** you may be asked for while
running and testing e-Humure, and gives a **test walkthrough** you can follow
from an empty database to a closed case. Nothing in the system asks for a
credential that is not listed here.

- **Installation** (Node.js, PostgreSQL, database, `.env`): follow
  [README.md](README.md), steps 1–12. This guide tells you which values to use.
- **Time needed:** about 30 minutes to install, about 20 minutes for the walkthrough.

---

## 1. Every credential, and where it comes from

The system starts **empty**: there are no ready-made accounts. You create
every account yourself in the walkthrough (section 4), so you choose and
know every username and password.

| # | Credential | Where you type it | Where it comes from |
|---|---|---|---|
| 1 | PostgreSQL superuser password (`postgres`) | Terminal, when creating the database (README step 7.1) | You chose it when installing PostgreSQL |
| 2 | e-Humure database user + password | `DATABASE_URL` in `backend/.env` (README step 7.3) | You create it (README step 7.2). Example: `ehumure` / `Humure2026Kigali` |
| 3 | `JWT_SECRET` | `backend/.env` | Generate: `openssl rand -hex 32` |
| 4 | `PHONE_KEY` | `backend/.env` | Generate: `openssl rand -hex 32` (a different value) |
| 5 | `SETUP_SECRET` (the **setup key**) | `backend/.env` **and** the setup page (`/setup.html`) | Generate: `openssl rand -hex 32` (a third value). Copy it; you paste it once on the setup page |
| 6 | System administrator username + password | Setup page, then the login page | You choose them (walkthrough step 1) |
| 7 | Facility head username + password | Register-facility page, then the login page | You choose them (walkthrough step 2) |
| 8 | Staff usernames + passwords (3 people) | Request-access page, then the login page | You choose them (walkthrough step 4) |
| 9 | Africa's Talking username + API key | `backend/.env` (`AT_USERNAME`, `AT_API_KEY`) | **Optional.** Sent to you privately by NovaCrew, or your own free sandbox account (section 3) |
| 10 | Africa's Talking website login | africastalking.com, to open the SMS simulator | **Optional.** Same as #9 |

**Rules the forms check:**

- **Usernames:** 3–32 characters; letters, numbers, `.`, `_` or `-` only.
- **Passwords:** 12 or more characters, with at least one letter and one number.
- **Phone numbers:** 10 digits starting `072`, `073`, `078` or `079`. Do not type `+250`.
  Each **patient** needs a phone number that no other patient uses.

> **No secrets are stored in this repository.** The optional Africa's Talking
> key and the login for its SMS simulator are in a private Google Doc, shared
> only with the facilitator's Google account:
> **[e-Humure: credentials for the facilitator](https://docs.google.com/document/d/1L35aTLKaZc20uW_EZwsR4SLjlr-sE9y7B4qo30rUd4c/edit?usp=sharing)**
> Open it while signed in with the email address you use for ALU. 
---

## 2. Choose how SMS messages are shown

e-Humure sends SMS for approvals, appointment confirmations and reminders.
Pick **one** option and set it in `backend/.env`.

### Option A: built-in simulator (no account needed, the simplest)

```ini
SMS_PROVIDER=simulator
```

Then, in a **second terminal**, from the `backend` folder:

```bash
npm run simulator
```

Every message appears in that terminal window (the phone number is masked).
Nothing goes to a real phone.

### Option B: Africa's Talking sandbox (messages on a simulated phone)

```ini
SMS_PROVIDER=africastalking
AT_USERNAME=sandbox
AT_API_KEY=<the key NovaCrew sent you, or your own key from section 3>
AT_ENDPOINT=https://api.sandbox.africastalking.com/version1/messaging
AT_SENDER_ID=
```

- Keep `AT_USERNAME=sandbox` exactly. Leave `AT_SENDER_ID` empty.
- Paste the key on **one line**: no spaces, no quotes.
- Restart the server after editing `.env` (Ctrl + C, then `npm start`).
- The sandbox **never** sends to real phones. It costs nothing.

**How to see the messages.** The sandbox does not keep an inbox. A message
only appears on the simulated phone **if that phone is open when the message
is sent**. So, before each step that sends an SMS:

1. Sign in at <https://account.africastalking.com> with the **same account the
   key belongs to**, then open the **Sandbox** app.
2. Click **Launch Simulator**, type the phone number that should receive the
   message in `+250…` format (for example `0788111222` becomes `+250788111222`),
   and click **Connect**.
3. On the simulated phone, open **Messages**, and keep the tab open.
4. Do the step in e-Humure. The message arrives within about 10 seconds.

The server window logs every message, for example:

```
SMS id=... provider=africastalking to=+250 78* *** *222 kind=access_approved result=provider_accepted_sent_delivery_unconfirmed
```

`provider_accepted_sent_delivery_unconfirmed` means Africa's Talking accepted
and sent it. ("Delivery unconfirmed" only means e-Humure does not receive
delivery reports.)

---

## 3. (Optional) Create your own free Africa's Talking sandbox key

Use this if you did not receive our key, or prefer your own account. It takes
about 3 minutes and is free.

1. Go to <https://account.africastalking.com/auth/register> and create an
   account. Confirm your email and sign in.
2. Open the **Sandbox** app (shown on the dashboard; the page says "Sandbox").
3. Go to **Settings → API Key**, type your password and click **Generate**.
   **Copy the key immediately**; it is shown only once.
4. Put it in `backend/.env` as `AT_API_KEY=...` with `AT_USERNAME=sandbox`
   (section 2, Option B). Restart the server.

A key from a **live** (non-sandbox) app does not work with `AT_USERNAME=sandbox`.

---

## 4. Test walkthrough: from empty system to closed case

Start the server (`npm start` in `backend`) and open <http://localhost:4000/>.
Use a computer on the same network as the server, or the server itself.

The test data below is **made up**. You may use it as it is. If you chose
Option B, open each phone number in the Africa's Talking simulator **before**
the step marked 📱.

| Person | Role | Username | Password | Phone |
|---|---|---|---|---|
| Marker Admin | System administrator | `marker.admin` | `MarkerAdmin2026` | `0788100100` |
| Head of facility | Facility administrator | `marker.head` | `MarkerHead2026` | `0788111222` |
| Alice NCD | NCD nurse | `alice.ncd` | `AliceNurse2026` | `0788222333` |
| Bella Psych | Psychiatric nurse | `bella.pn` | `BellaNurse2026` | `0788333444` |
| Chris Psy | Clinical psychologist | `chris.cp` | `ChrisPsych2026` | `0788444555` |
| Test patient | Patient (no account) | — | — | `0788555666` |

### Step 1: Create the system administrator
1. Open <http://localhost:4000/setup.html>.
2. **Setup key:** paste the `SETUP_SECRET` value from `backend/.env`.
3. Fill in Marker Admin's name, phone, username and password, then click **Create system administrator**.

 You are sent to the login page. (This page only works once; later visits say setup is complete.)

### Step 2: Register a facility
1. Open <http://localhost:4000/register-facility.html>.
2. Facility name `Marker Health Centre`, type **Health center or clinic**,
   district: type `Gasabo`. Then add the facility head's phone, name, username and password.
3. Click **Submit registration**.

 The page confirms the request is waiting for approval.

### Step 3: Approve the facility 📱 `0788111222`
1. Open <http://localhost:4000/login.html>, click **System administrator**, and sign in as `marker.admin`.
2. Under facility registrations, click **Approve and issue code**.

A facility code is created (for example `GAS-01`) and an SMS is sent to the
facility head: *"e-Humure: Your access has been approved. You can now sign in.
Facility code: …"*

### Step 4: Three staff members ask for access
Open <http://localhost:4000/request-access.html> three times, once per person:
Alice (**NCD nurse**), Bella (**Psychiatric nurse**) and Chris (**Clinical
psychologist**). Choose district **Gasabo** and **Marker Health Centre** each
time, then click **Submit request**.

### Step 5: The facility head approves the staff 📱 `0788222333`, `0788333444`, `0788444555`
1. On the login page, keep **Staff** selected, choose **Marker Health Centre**,
   and sign in as `marker.head`.
2. Click **Approve** on each of the three requests.

 Each person receives the approval SMS. (A rejected request receives nothing.)

### Step 6: The NCD nurse screens a patient
1. Sign out, then sign in as `alice.ncd` (Staff, Marker Health Centre).
2. Click **Register patient**: age `45`, condition **Hypertension** (or any),
   sector `Kimironko`, phone `0788555666`. Click **Register patient**.
    A patient code appears (for example `P001`). Note it down.
3. Click **I agree** on the consent screen.
4. **Quick questions (Whooley):** answer **Yes** to the first question.
5. **Full questionnaire (PHQ-9):** answer **More than half the days** for
   questions 1–8, and **Not at all** for question 9. Click **See result**.

Score **16, moderately severe**. An alert is created and routed to the
psychiatric nurse (Bella).

**Optional checks while you are here:**
- Register another patient with the **same** phone `0788555666`. The system
  refuses it and marks the phone field in red.
- Answering **No** to both quick questions ends the screening with no alert.
- Any answer other than **Not at all** to question 9 creates an **urgent** alert.

### Step 7: The psychiatric nurse books a visit 📱 `0788555666`
1. Sign out, then sign in as `bella.pn`.
2. Open the alert, then click **Book appointment**. Pick a date and time, and confirm.

 The patient receives an SMS confirmation. A reminder is queued for before the visit.

### Step 8: Record the visit and (optionally) escalate
1. In Bella's appointments, click **Mark attended**.
2. Now the nurse chooses one of two things:
   - **Continue care herself:** click **Book another appointment**.
     (Escalation is never required.)
   - **Escalate:** click **Escalate to clinical psychologist**, write a reason
     of 10–500 characters (for example *"Symptoms not improving after first visit"*), and confirm.

The system blocks escalation before a first visit has been attended.

### Step 9: The clinical psychologist closes the case
1. Sign out, then sign in as `chris.cp`.
2. Open the escalated case, add a **visit note** if you like, then click **Mark case handled**.

 The case is closed. Only a clinical psychologist can close a case.

### Step 10: Check the oversight screens
- **Facility head** (`marker.head`): staff list, facility summary, and the
  warning shown when a facility has no psychiatric nurse.
- **System administrator** (`marker.admin`): all facilities and the **audit log**,
  which records every sign-in, approval, screening and escalation.

---

## 5. Automated tests (no database needed)

From the `backend` folder:

```bash
npm test
```

 Ends with all checks passed. `testing/api-tests.js` also needs the server and
database running; see `testing/README.md`.

---

## 6. If something goes wrong

| What you see | What to do |
|---|---|
| `password authentication failed for user "ehumure"` | The password in `DATABASE_URL` does not match the database user. Fix it in `backend/.env`, or reset it in `psql`: `ALTER USER ehumure WITH PASSWORD 'new_password';` |
| `permission denied for table ...` | Run `echo $DATABASE_URL` in the terminal. If it shows a different user, run `unset DATABASE_URL` and restart. (A value set in the terminal overrides `.env`.) |
| `Set JWT_SECRET to 64 ...` (or `PHONE_KEY` / `SETUP_SECRET`) | That value is missing or not 64 hex characters. Generate it again with `openssl rand -hex 32`. |
| `This system is available only on the facility network.` | Open the site from the server computer (`localhost`) or a computer on the same local network. |
| Login says "No facilities are configured" | Do walkthrough steps 2 and 3 first. |
| SMS log shows `result=SIMULATED_only_not_delivered` | That is Option A working correctly; the message is in the simulator terminal. If `npm run simulator` is not running, start it. |
| SMS log shows `provider_HTTP_401` or the test returns *"The supplied authentication is invalid"* | The Africa's Talking key is wrong, or it is not from the **Sandbox** app. Generate a new sandbox key (section 3) and restart. |
| SMS log shows `provider_HTTP_403` | Make sure you have the latest code (`git pull`), restart, and check the computer has internet. |
| Africa's Talking shows no message | Open the receiving number in the simulator **before** the message is sent (section 2), and check you signed in with the account the key belongs to. |
| A message failed 3 times | It is not retried automatically. Fix the cause, restart, then repeat the step in the app, or ask NovaCrew for the "requeue" command. |
| Any other problem | See README section 18, or contact NovaCrew (details in our submission). |
