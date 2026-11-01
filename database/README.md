# Database

Owner: Ines.

Sprint 1 does not connect to a database. The server keeps the three demo users in memory. `schema.sql` is the design we build in Sprint 2 and the source for the database slide.

## Look at it without installing anything

Open `schema.sql` in VS Code. Seven tables: `staff`, `patient`, `screening`, `risk_alert`, `appointment`, `sms_reminder`, `audit_log`.

## Run it, if you have PostgreSQL

```
psql -U postgres -c "CREATE DATABASE ehumure;"
psql -U postgres -d ehumure -f database/schema.sql
psql -U postgres -d ehumure -c "\dt"
```

The last line lists the seven tables. That is the screenshot for the report.

## What protects the data

- No patient name anywhere in the design.
- `phone_enc` holds the phone number after AES-256 encryption done by the application, never plain text.
- `password_hash` holds a bcrypt hash, never a password.
- `CHECK` rules stop bad values, for example a risk level that is not low, moderate or high.
- `audit_log` records every read and change, so we can show who saw what.
