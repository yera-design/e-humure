# e-Humure

**Healthy Body. Peaceful Mind. Better Tomorrow.**

Mental health screening built into everyday chronic-care (NCD) visits in
Rwandan health facilities. An NCD nurse asks two short wellbeing questions
during a routine visit, follows up with the PHQ-9 when indicated, and the
system routes anyone who needs support to a psychiatric nurse or a clinical
psychologist, then books and reminds them of the appointment by SMS.

Patients are recorded by code, never by name. Phone numbers are encrypted.

## Requirements

- Node.js 18 or newer
- PostgreSQL 13 or newer
- A machine on the facility network. The server refuses connections from
  outside private address ranges.

## Install

```bash
git clone <this repository>
cd e-humure/backend
npm install
```

## Configure

```bash
cp .env.example .env
```

Generate each secret separately with `openssl rand -hex 32` and set:

| Key | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | signs sign-in tokens, 64 hex characters |
| `PHONE_KEY` | AES-256-GCM key for phone numbers, 64 hex characters |
| `SETUP_SECRET` | one-time key for creating the first system administrator |
| `SMS_PROVIDER` | `simulator` (default) or `africastalking` |
| `AT_USERNAME`, `AT_API_KEY`, `AT_ENDPOINT`, `AT_SENDER_ID` | required only when `SMS_PROVIDER=africastalking` |

**`PHONE_KEY` cannot be rotated without re-encrypting every stored number.**
Back it up before going live. Losing it makes every phone number unreadable.

The server refuses to start if any secret is missing or malformed.

## Create the database

Apply the files in `database/` **in order**:

```bash
psql "$DATABASE_URL" -f database/schema.sql
psql "$DATABASE_URL" -f database/migrate_sprint2.sql
psql "$DATABASE_URL" -f database/migrate_sprint3_security_and_resume.sql
psql "$DATABASE_URL" -f database/migrate_sprint4_ncd_options.sql
psql "$DATABASE_URL" -f database/migrate_sprint5_hide_seed_facility.sql
psql "$DATABASE_URL" -f database/migrate_sprint6_routing.sql
psql "$DATABASE_URL" -f database/migrate_sprint7_reminders_and_notes.sql
psql "$DATABASE_URL" -f database/migrate_sprint8_facilty_requests.sql
psql "$DATABASE_URL" -f database/migrate_sprint9_system_admin_no_facility.sql
psql "$DATABASE_URL" -f database/migrate_sprint10_appointment_follow_up.sql
psql "$DATABASE_URL" -f database/migrate_sprint11_sms_provider_simulation_status.sql
```

Take a backup before running migrations against a live database.

Then verify:

```bash
npm run seed
```

`seed` only checks that the schema is present. **It creates no sample facility
and no demo accounts.** There are no demo credentials in this system.

## Run

```bash
npm start
```

That starts the server on port 4000 and the SMS worker as a child process.
Open `http://localhost:4000/`.

With `SMS_PROVIDER=simulator`, run the simulator in a second terminal so queued
messages are logged rather than dropped:

```bash
npm run simulator
```

## First run, in order

1. Open `/setup.html` and create the **system administrator** using
   `SETUP_SECRET`. This account belongs to no facility.
2. The head of each hospital or clinic opens `/register-facility.html` and
   registers their facility.
3. The system administrator signs in and approves it. **The facility code is
   issued on approval** — give it to the facility head.
4. Staff open `/request-access.html`, choose their district and facility, and
   request an account.
5. The facility administrator signs in and approves them.
6. Approved staff sign in at `/login.html` and land on the workspace for their
   role.

Phone numbers anywhere in the system are 10 digits starting **072, 073, 078 or
079**. The 077 prefix is not supported. Do not type `+250`.

## Roles

| Role | Lands on | Does |
|---|---|---|
| System administrator | `admin.html` | approves facilities, sees every facility and the audit log |
| Facility administrator | `admin.html` | approves staff, sees counts for their facility only |
| NCD nurse | `nurse.html` | registers patients, screens, resumes pending visits |
| Psychiatric nurse | `psychologist.html` | takes alerts, books appointments, escalates complex cases |
| Clinical psychologist | `psychologist.html` | reviews escalated cases, books appointments, closes cases |

Full table in [`docs/who-can-see-what.md`](docs/who-can-see-what.md).

## Test

```bash
node testing/run-all.js
```

Every offline suite: scoring, routing, SMS wording, provider parsing, language,
page wiring and page structure. Needs no database and no running server.
Database-backed suites are listed in
[`docs/testing-plan.md`](docs/testing-plan.md).

## Layout

```
backend/     Express server, scoring, routing, permissions, SMS
database/    schema.sql and ordered migrations
docs/        architecture, flows, permissions, SMS wording, design system
frontend/    the eight screens, one stylesheet, one script per screen
testing/     all suites and the 50 fake patients
```

## Security notes

- The application binds behind a private-network check and is not intended to
  be exposed to the internet.
- Sign-in is throttled to 6 attempts per 15 minutes per IP and username.
- Passwords are bcrypt hashed with cost 12.
- Phone numbers are AES-256-GCM encrypted at rest.
- Every sign-in, permission denial, record read and administrative decision is
  written to `audit_log` with the actor, the record and the IP address.
- Logs never contain a full phone number, a password or message text.

## Documentation

Start at [`docs/README.md`](docs/README.md).

