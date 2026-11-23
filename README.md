# e-Humure
 
**Healthy Body. Peaceful Mind. Better Tomorrow.**
 
Mental health screening built into everyday chronic-care (NCD) visits in
Rwandan health facilities. An NCD nurse asks two short wellbeing questions
(Whooley) during a routine visit, follows up with the PHQ-9 when needed, and
the system sends anyone who needs support to a psychiatric nurse (and, if the
nurse escalates, to a clinical psychologist). Appointments are booked in the
system and reminders go out by SMS.
 
Patients are recorded by code, never by name. Phone numbers are encrypted.
 
---
 
## Contents
 
1. [What you need before you start](#1-what-you-need-before-you-start)
2. [How to open a terminal](#2-how-to-open-a-terminal)
3. [Install Node.js](#3-install-nodejs)
4. [Install PostgreSQL (the database)](#4-install-postgresql-the-database)
5. [Get the e-Humure files](#5-get-the-e-humure-files)
6. [Install the backend packages](#6-install-the-backend-packages)
7. [Create the e-Humure database and its user](#7-create-the-e-humure-database-and-its-user)
8. [Create the `.env` settings file](#8-create-the-env-settings-file)
9. [Set `DATABASE_URL` in your terminal (export)](#9-set-database_url-in-your-terminal-export)
10. [Build the database tables](#10-build-the-database-tables)
11. [Check that everything is connected](#11-check-that-everything-is-connected)
12. [Start e-Humure](#12-start-e-humure)
13. [First use: create the accounts, in order](#13-first-use-create-the-accounts-in-order)
14. [Every day after that](#14-every-day-after-that)
15. [Using e-Humure from other computers or phones](#15-using-e-humure-from-other-computers-or-phones)
16. [When a new update arrives](#16-when-a-new-update-arrives)
17. [Back up the database](#17-back-up-the-database)
18. [Problems and how to fix them](#18-problems-and-how-to-fix-them)
19. [Roles, tests, folders, security, documentation](#19-roles)
---
 
## 1. What you need before you start
 
- A computer (Windows, macOS or Linux) connected to the facility network.
- About 30–45 minutes for the first setup.
- Internet access **during installation only** (to download Node.js,
  PostgreSQL and the packages).
- Permission to install programs on the computer (an administrator account).
You will install two programs:
 
| Program | What it is | Version |
|---|---|---|
| **Node.js** | runs the e-Humure server | 18 or newer |
| **PostgreSQL** | the database where all records are kept | 13 or newer |
 
> **Tip:** Keep a notebook (paper or a private text file) for this setup. You
> will create a few passwords and keys that you must not lose. They are marked
> 📝 below.
 
---
 
## 2. How to open a terminal
 
Most steps below are typed into a **terminal**: a window where you type a
command and press **Enter**.
 
- **Windows:** press the **Windows key**, type `PowerShell`, and open
  **Windows PowerShell**.
- **macOS:** press **Cmd + Space**, type `Terminal`, press **Enter**.
- **Linux (Ubuntu):** press **Ctrl + Alt + T**.
How to use it:
 
- Type (or paste) **one command at a time**, then press **Enter**.
- Wait until the command finishes and the cursor comes back before typing the next.
- To paste: **Ctrl + V** on Windows/Linux (or right-click), **Cmd + V** on macOS.
- Lines in this guide that start with `#` are explanations. You do not type them.
- If a command is still running and you want to stop it, press **Ctrl + C**.
---
 
## 3. Install Node.js
 
1. Go to <https://nodejs.org> and download the **LTS** version for your computer.
2. Open the downloaded file and click **Next** through the installer, keeping
   the default options.
3. **Close the terminal and open a new one** (so it notices the new program).
4. Check that it worked:
```bash
node -v
npm -v
```
 
   You should see version numbers, for example `v20.11.0` and `10.2.4`. The
   first number for `node` must be **18 or higher**.
 
> **Linux (Ubuntu) alternative:** `sudo apt update && sudo apt install -y nodejs npm`
> then check `node -v`. If it shows a version below 18, install the LTS version
> from nodejs.org instead.
 
---
 
## 4. Install PostgreSQL (the database)
 
### Windows
 
1. Go to <https://www.postgresql.org/download/windows/> and download the installer.
2. Run it. Keep the defaults, **but pay attention to two screens:**
   - **Password:** it asks for a password for the `postgres` superuser.
     📝 **Write this password down.** You need it in step 7.
   - **Port:** leave it at **5432**.
3. Finish the installer. You can skip "Stack Builder" at the end.
4. **Make the `psql` command available in the terminal.** The installer often
   does not do this for you:
   1. Press the Windows key, type `environment variables`, open
      **Edit the system environment variables**, then click **Environment Variables…**
   2. Under **System variables**, select **Path** → **Edit** → **New**, and add
      the folder `C:\Program Files\PostgreSQL\16\bin`
      (change `16` to the version you installed; check the folder in File Explorer).
   3. Click **OK** on every window.
5. Close PowerShell, open a new one, and check:
```powershell
psql --version
```
 
   You should see something like `psql (PostgreSQL) 16.2`.
 
### macOS
 
Easiest option: install **Postgres.app** from <https://postgresapp.com>, open it
and click **Initialize**. Then follow its instructions to make `psql` available
in the terminal.
 
Or, if you use Homebrew:
 
```bash
brew install postgresql@16
brew services start postgresql@16
```
 
Check: `psql --version`
 
### Linux (Ubuntu)
 
```bash
sudo apt update
sudo apt install -y postgresql
sudo systemctl enable --now postgresql
psql --version
```
 
---
 
## 5. Get the e-Humure files
 
**Option A: you received a ZIP file.** Unzip it somewhere easy to find, for
example your **Documents** folder. You will get a folder called `e-humure-main`
(or similar). Inside it you should see `backend`, `database`, `frontend`,
`docs`, `testing` and this `README.md`.
 
**Option B: from Git.**
 
```bash
git clone <this repository address>
```
 
Now **move the terminal into that folder.** This is called the **project
folder**, and many steps below must be run from it.
 
```bash
# Windows example (change the path to where YOUR folder is):
cd "$HOME\Documents\e-humure-main"
 
# macOS / Linux example:
cd ~/Documents/e-humure-main
```
 
> **Shortcut:** type `cd ` (with a space), then drag the folder from File
> Explorer / Finder into the terminal window, and press **Enter**.
 
Check that you are in the right place:
 
```bash
# Windows:
dir
# macOS / Linux:
ls
```
 
You should see `backend`, `database`, `frontend`, ... in the list.
 
---
 
## 6. Install the backend packages
 
From the project folder:
 
```bash
cd backend
npm install
cd ..
```
 
This downloads the small libraries the server needs (it takes a minute). Some
"warn" lines are normal. Red lines that say **ERR!** are not; see
[Problems](#18-problems-and-how-to-fix-them).
 
The last command, `cd ..`, takes you back to the project folder.
 
---
 
## 7. Create the e-Humure database and its user
 
e-Humure keeps its data in its own database, `ehumure`, accessed by its own
user, also called `ehumure`. You create both once.
 
### 7.1 Open the PostgreSQL prompt as the main (superuser) account
 
- **Windows:**
```powershell
psql -U postgres
```
 
  Type the `postgres` password from step 4. (**Nothing appears on screen while
  you type a password. That is normal.** Just type it and press Enter.)
 
- **macOS (Postgres.app or Homebrew):**
```bash
psql postgres
```
 
- **Linux (Ubuntu):**
```bash
sudo -u postgres psql
```
 
You are in the right place when the prompt changes to `postgres=#`.
 
### 7.2 Create the user and the database
 
📝 Choose a password for the `ehumure` database user and write it down. **Use
only letters and numbers** (for example `Humure2026Kigali`). Symbols such as
`@ : / # ?` break the connection address in step 8.
 
Type these three lines at the `postgres=#` prompt, putting **your** password
in place of `Humure2026Kigali`. Keep the single quotes `' '` and the
semicolons `;`:
 
```sql
CREATE USER ehumure WITH PASSWORD 'Humure2026Kigali';
CREATE DATABASE ehumure OWNER ehumure;
\q
```
 
You should see `CREATE ROLE`, then `CREATE DATABASE`. `\q` exits back to the
normal terminal.
 
> Already did this before? If you see `role "ehumure" already exists` or
> `database "ehumure" already exists`, it was already created. Continue.
 
### 7.3 Your connection address (`DATABASE_URL`)
 
The backend finds the database through one line of text called the
**connection address**, or `DATABASE_URL`. It is built like this:
 
```
postgresql://USER:PASSWORD@COMPUTER:PORT/DATABASE
```
 
With the values above it becomes:
 
```
postgresql://ehumure:Humure2026Kigali@localhost:5432/ehumure
```
 
| Part | Meaning | Your value |
|---|---|---|
| `ehumure` (first) | database user from 7.2 | `ehumure` |
| `Humure2026Kigali` | that user's password | **your password** |
| `localhost` | the database is on this same computer | `localhost` |
| `5432` | PostgreSQL's port (from the installer) | usually `5432` |
| `ehumure` (last) | database name from 7.2 | `ehumure` |
 
📝 Write your full address down. You use it in steps 8 and 9.
 
**Test it now:**
 
```bash
psql "postgresql://ehumure:Humure2026Kigali@localhost:5432/ehumure" -c "SELECT 1;"
```
 
If you see a small table with `1` in it, the address is correct. If not, see
[Problems](#18-problems-and-how-to-fix-them).
 
---
 
## 8. Create the `.env` settings file
 
The server reads its settings from a file named **`.env`** (the name starts
with a dot) inside the **`backend`** folder.
 
### 8.1 Copy the example file
 
From the project folder:
 
```bash
# Windows (PowerShell):
Copy-Item backend\.env.example backend\.env
 
# macOS / Linux:
cp backend/.env.example backend/.env
```
 
### 8.2 Generate the three secret keys
 
The server needs three different random keys, each **64 characters** long.
Run this command **three times**. Each run prints a new key:
 
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
 
Example output (yours will be different):
`3f9a1c0e7b2d4a6f8e1c3b5d7f9a0c2e4b6d8f0a1c3e5b7d9f1a3c5e7b9d0f2a`
 
📝 Write the three keys down as **key 1**, **key 2** and **key 3**.
 
### 8.3 Fill in the file
 
Open `backend/.env` in a plain text editor:
 
- **Windows:** `notepad backend\.env`
- **macOS:** `open -e backend/.env`
- **Linux:** `nano backend/.env` (save with Ctrl + O then Enter, exit with Ctrl + X)
Change these lines. Leave everything else as it is:
 
```ini
DATABASE_URL=postgresql://ehumure:Humure2026Kigali@localhost:5432/ehumure
JWT_SECRET=<paste key 1>
PHONE_KEY=<paste key 2>
SETUP_SECRET=<paste key 3>
SMS_PROVIDER=simulator
```
 
Rules:
 
- Use **your** database address from step 7.3.
- No spaces around `=`, no quotes, no `< >`.
- The three keys must be **different** from each other.
- Save the file. On Windows, make sure Notepad did not save it as
  `.env.txt`. It must be exactly `.env`.
What each setting does:
 
| Setting | What it is for |
|---|---|
| `PORT` | the port the website runs on (default `4000`) |
| `BIND_HOST` | leave `0.0.0.0` so other computers on the facility network can connect |
| `DATABASE_URL` | how the backend finds PostgreSQL (step 7.3) |
| `JWT_SECRET` | signs sign-in sessions |
| `PHONE_KEY` | encrypts and decrypts patient phone numbers |
| `SETUP_SECRET` | the one-time "setup key" you type to create the first system administrator |
| `SMS_PROVIDER` | `simulator` (messages are shown on screen, nothing is really sent) or `africastalking` (real SMS) |
| `AT_USERNAME`, `AT_API_KEY`, `AT_ENDPOINT`, `AT_SENDER_ID` | only needed with `SMS_PROVIDER=africastalking` |
 
> ⚠️ **`PHONE_KEY` is very important.** If it is lost or changed, every phone
> number already saved becomes unreadable, and there is no way to recover
> them. Keep a safe copy, and never change it once real patients are registered.
>
> ⚠️ **Never share the `.env` file** or upload it anywhere (email, WhatsApp,
> GitHub). It holds the keys that protect patient data.
 
The server refuses to start if any key is missing or has the wrong length,
and the error message names the key that needs fixing.
 
---
 
## 9. Set `DATABASE_URL` in your terminal (export)
 
The `.env` file is read by the **server**. But in step 10 you will run the
`psql` program yourself, and `psql` does **not** read `.env`. So you also put
the address into the **terminal's memory**. This is called *exporting* (or
*setting*) the variable.
 
Type the command for your terminal, with **your** address:
 
**Windows (PowerShell):**
 
```powershell
$env:DATABASE_URL = "postgresql://ehumure:Humure2026Kigali@localhost:5432/ehumure"
```
 
**Windows (Command Prompt / cmd):**
 
```bat
set DATABASE_URL=postgresql://ehumure:Humure2026Kigali@localhost:5432/ehumure
```
 
**macOS / Linux:**
 
```bash
export DATABASE_URL="postgresql://ehumure:Humure2026Kigali@localhost:5432/ehumure"
```
 
Check that it is set (it should print your address back):
 
```bash
# Windows PowerShell:
echo $env:DATABASE_URL
# Windows cmd:
echo %DATABASE_URL%
# macOS / Linux:
echo $DATABASE_URL
```
 
> **Important:** this lasts **only for this terminal window**. If you close
> the window or open a new one, type the export command again before running
> `psql` commands.
 
---
 
## 10. Build the database tables
 
This creates all the tables e-Humure needs. Run it **from the project folder**
(the one that contains `database` and `backend`) and **in the same terminal
where you did step 9**.
 
The files **must run in this exact order**, one after another. Wait for each
to finish. Many lines like `CREATE TABLE`, `ALTER TABLE` or `NOTICE` are normal.
 
**Windows (PowerShell):**
 
```powershell
psql $env:DATABASE_URL -f database\schema.sql
psql $env:DATABASE_URL -f database\migrate_sprint2.sql
psql $env:DATABASE_URL -f database\migrate_sprint3_security_and_resume.sql
psql $env:DATABASE_URL -f database\migrate_sprint4_ncd_options.sql
psql $env:DATABASE_URL -f database\migrate_sprint5_hide_seed_facility.sql
psql $env:DATABASE_URL -f database\migrate_sprint6_routing.sql
psql $env:DATABASE_URL -f database\migrate_sprint7_reminders_and_notes.sql
psql $env:DATABASE_URL -f database\migrate_sprint8_facilty_requests.sql
psql $env:DATABASE_URL -f database\migrate_sprint9_system_admin_no_facility.sql
psql $env:DATABASE_URL -f database\migrate_sprint10_appointment_follow_up.sql
psql $env:DATABASE_URL -f database\migrate_sprint11_sms_provider_simulation_status.sql
psql $env:DATABASE_URL -f database\migrate_sprint12_duplicates_approval_sms_alert_routing.sql
```
 
**macOS / Linux / Windows cmd:**
 
(In Windows cmd, write `%DATABASE_URL%` instead of `"$DATABASE_URL"`.)
 
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
psql "$DATABASE_URL" -f database/migrate_sprint12_duplicates_approval_sms_alert_routing.sql
```
 
**Check it worked:** list the tables:
 
```bash
# Windows PowerShell:
psql $env:DATABASE_URL -c "\dt"
# macOS / Linux:
psql "$DATABASE_URL" -c "\dt"
```
 
You should see a list including `facility`, `staff`, `patient`, `screening`,
`risk_alert`, `appointment` and `sms_reminder`.
 
> **Run `schema.sql` only once**, on a new, empty database. Running it again
> gives `already exists` errors. That does no harm, but it means it was done
> already.
>
> **Always use `DATABASE_URL` (the `ehumure` user) for these files, not
> `psql -U postgres`.** If the tables are created by the `postgres` superuser,
> the backend (which signs in as `ehumure`) is not allowed to use them and
> shows "permission denied" errors.
 
---
 
## 11. Check that everything is connected
 
From the project folder:
 
```bash
cd backend
npm run seed
```
 
✅ Success looks like:
`Database is ready. No sample facility was added. ...`
 
❌ If you see `facility setup failed: ...` or `Set JWT_SECRET ...`, the
message says what is wrong. See [Problems](#18-problems-and-how-to-fix-them).
 
`seed` only **checks** the connection and the tables. It does not add any
sample facility or demo account. **There are no demo usernames or passwords.**
You create the real accounts in step 13.
 
---
 
## 12. Start e-Humure
 
You use **two terminal windows**.
 
**Terminal 1: the server.** Stay in the `backend` folder:
 
```bash
npm start
```
 
✅ Success looks like: `Open e-Humure on this computer: http://localhost:4000/`
 
Leave this window open. **Closing it stops e-Humure.** (The SMS worker starts
automatically together with the server.)
 
**Terminal 2: the SMS simulator** (only when `SMS_PROVIDER=simulator`). Open a
**new** terminal, go to the `backend` folder (see step 5 for `cd`), and run:
 
```bash
npm run simulator
```
 
✅ Success looks like: `SMS simulator on http://localhost:4002 ...`
 
Every SMS e-Humure "sends" (appointment reminders, approval messages) appears
in this window instead of going to a real phone. Without the simulator,
messages are not delivered anywhere.
 
**Open the website:** in a web browser (Chrome, Edge or Firefox) go to
 
```
http://localhost:4000/
```
 
**To stop e-Humure:** click on each terminal window and press **Ctrl + C**.
 
---
 
## 13. First use: create the accounts, in order
 
Do this once, the first time you run e-Humure.
 
1. **Create the system administrator.** Go to
   `http://localhost:4000/setup.html`.
   - **Setup key:** paste **key 3** (`SETUP_SECRET` from your `.env`).
   - Fill in the full name, mobile number, a username and a password
     (12 or more characters, using letters and numbers).
   - This account belongs to **no facility**. It manages the whole system.
2. **Register each facility.** The head of each hospital or health centre opens
   `http://localhost:4000/register-facility.html` and fills in the form.
3. **Approve the facility.** The system administrator signs in at
   `/login.html` (choose **System administrator**) and approves the facility.
   **The facility code is created at approval** (for example `KIM-01`) and is
   sent to the facility head by SMS.
4. **Staff ask for access.** Each nurse or psychologist opens
   `http://localhost:4000/request-access.html`, chooses their district and
   facility, and requests an account.
5. **The facility head approves staff.** They sign in and approve each request.
   Approved staff receive an SMS: *"e-Humure: Your access has been approved.
   You can now sign in."* Nothing is sent if a request is rejected.
6. **Staff sign in** at `http://localhost:4000/login.html` and land on the
   screen for their role.
**Recommended:** register and approve at least one **psychiatric nurse** for
each facility before nurses start screening. Alerts raised before then are
kept and marked urgent, and they go automatically to the first psychiatric
nurse approved there.
 
Phone numbers everywhere in the system are **10 digits starting 072, 073, 078
or 079**. Do not type `+250`. The 077 prefix is not supported. Each patient
must have their **own** phone number: a number already registered to another
patient is refused.
 
---
 
## 14. Every day after that
 
You do **not** repeat steps 3–11. To start e-Humure:
 
1. Make sure the computer is on and PostgreSQL is running (it normally starts
   by itself with the computer).
2. Open a terminal, go to the `backend` folder, run `npm start`.
3. (Simulator only) open a second terminal, go to `backend`, run
   `npm run simulator`.
4. Open `http://localhost:4000/` in the browser.
 
---
 
## 15. Using e-Humure from other computers or phones
 
Other devices **on the same facility network (Wi-Fi/LAN)** can use e-Humure
while the server computer is running.
 
1. On the server computer, find its network address:
   - **Windows:** run `ipconfig` and look for **IPv4 Address**, for example `192.168.1.25`.
   - **macOS:** run `ipconfig getifaddr en0`
   - **Linux:** run `hostname -I`
2. On the other device, open a browser and go to `http://192.168.1.25:4000/`
   (using **your** address).
3. If it does not open, the server computer's firewall may be blocking it.
   On Windows, click **Allow access** when asked about Node.js, or allow port
   4000 in Windows Defender Firewall.
For safety, e-Humure **only accepts connections from private networks**
(addresses starting `10.`, `172.16–31.`, `192.168.`, or the computer itself).
It is not meant to be put on the public internet.
 
---
 
## 16. When a new update arrives
 
1. **Back up the database first** (step 17).
2. Stop e-Humure (Ctrl + C in its terminals).
3. Replace the project files with the new version. **Keep your
   `backend/.env` file.** Do not overwrite or delete it.
4. If the update includes a **new** file in `database/` (for example
   `migrate_sprint13_....sql`), set `DATABASE_URL` (step 9) and run **only the
   new file(s)**, in number order, from the project folder:
```bash
psql "$DATABASE_URL" -f database/migrate_sprint13_....sql
```
 
5. If `backend/package.json` changed, run `npm install` again in `backend`.
6. Start e-Humure again (step 14).
---
 
## 17. Back up the database
 
Set `DATABASE_URL` (step 9), then from any folder:
 
```bash
# macOS / Linux:
pg_dump "$DATABASE_URL" -f ehumure-backup-2026-11-23.sql
# Windows PowerShell:
pg_dump $env:DATABASE_URL -f ehumure-backup-2026-11-23.sql
```
 
Use today's date in the file name. Keep backups and a copy of `backend/.env`
somewhere safe and private (for example an encrypted USB drive). A backup
without the matching `PHONE_KEY` cannot show phone numbers.
 
To restore a backup into an **empty** `ehumure` database:
 
```bash
psql "$DATABASE_URL" -f ehumure-backup-2026-11-23.sql
```
 
---
 
## 18. Problems and how to fix them
 
| What you see | What it means | What to do |
|---|---|---|
| `node` / `npm` / `psql` **is not recognized** or **command not found** | the program is not installed, or the terminal cannot find it | install it (steps 3–4), then **close and reopen** the terminal. For `psql` on Windows, add the PostgreSQL `bin` folder to Path (step 4). |
| `password authentication failed for user "ehumure"` | wrong password in the address | check the password in `DATABASE_URL` matches step 7.2. To reset it: open `psql -U postgres` and run `ALTER USER ehumure WITH PASSWORD 'NewPassword123';`, then update `.env` and step 9. |
| `database "ehumure" does not exist` / `role "ehumure" does not exist` | step 7 was not completed | do step 7.2 again. |
| `connection refused` / `could not connect to server` | PostgreSQL is not running, or the port is wrong | Windows: open **Services** and start **postgresql-x64-16**. macOS: open Postgres.app or run `brew services start postgresql@16`. Linux: `sudo systemctl start postgresql`. Check the port is `5432`. |
| `psql` asks for a password, or connects to the wrong database, during step 10 | `DATABASE_URL` is not set in **this** terminal | repeat step 9 in the same window, then check with `echo`. |
| `could not open file "database/schema.sql"` / `No such file or directory` | you are in the wrong folder | go to the **project folder** (the one containing `database`), not `backend`. See step 5. |
| `permission denied for table ...` when the server runs | tables were created by `postgres` instead of `ehumure` | ask your technical contact to change the table owner, or drop and recreate the database (step 7) and redo step 10 **with `DATABASE_URL`**. |
| `Set JWT_SECRET to 64 random hexadecimal characters ...` (or `PHONE_KEY` / `SETUP_SECRET`) | that key is missing or wrong in `.env` | generate a new key (step 8.2) and paste it in. **Never replace `PHONE_KEY` once patients are registered.** |
| The server says `.env` settings are missing even though you made the file | on Windows the file may be named `.env.txt` | in File Explorer turn on **View → File name extensions** and rename it to exactly `.env`, inside the `backend` folder. |
| `Facility table is missing; apply the database schema and migrations first.` | step 10 was skipped or failed | do step 10. |
| `EADDRINUSE ... 4000` | e-Humure (or another program) is already running on port 4000 | close the other terminal running e-Humure, or set a different `PORT=` in `.env`. |
| `npm ERR!` during `npm install` | usually no internet, or an old Node.js | check internet, check `node -v` is 18 or newer, then run `npm install` again in `backend`. |
| Browser shows **"This system is available only on the facility network."** | you are connecting from outside a private network | use the server computer itself (`localhost`) or a device on the same facility Wi-Fi/LAN. |
| Other computers cannot open the site | firewall, or wrong address | see step 15. |
| No SMS appears | the simulator is not running | start `npm run simulator` in a second terminal (step 12). |
| Setup page says the setup key is wrong | the key does not match `SETUP_SECRET` | copy `SETUP_SECRET` exactly from `backend/.env`, with no spaces. |
| Setup page says an administrator already exists | the first system administrator was already created | sign in at `/login.html` and choose **System administrator**. |
 
Still stuck? Copy the **full error message** from the terminal and send it to
your technical contact (but **never** send the `.env` file or its keys).
 
---
 
<a id="19-roles"></a>
## 19. Roles, tests, folders, security, documentation
 
### Roles
 
| Role | Lands on | Does |
|---|---|---|
| System administrator | `admin.html` | approves facilities, sees every facility and the audit log |
| Facility administrator (head of facility) | `admin.html` | approves staff, sees counts for their facility only |
| NCD nurse | `nurse.html` | registers patients, screens, resumes pending visits |
| Psychiatric nurse | `psychologist.html` | receives every alert first, books appointments, escalates complex cases |
| Clinical psychologist | `psychologist.html` | reviews cases escalated by a psychiatric nurse, books appointments, closes cases |
 
Full table in [`docs/who-can-see-what.md`](docs/who-can-see-what.md).
 
### Tests
 
From the project folder:
 
```bash
node testing/run-all.js
```
 
Runs every offline check (scoring, routing, SMS wording, provider parsing,
language, page wiring and page structure). It needs no database and no
running server. The last line should say `All offline suites passed.`
Database-backed tests are listed in [`docs/testing-plan.md`](docs/testing-plan.md).
 
### Folders
 
```
backend/     the server: scoring, routing, permissions, SMS  (.env lives here)
database/    schema.sql and the numbered migrations, run in order
docs/        architecture, flows, permissions, SMS wording, design system
frontend/    the screens, one stylesheet, one script per screen
testing/     all test suites and 50 invented (fake) patients
```
 
### Security notes
 
- The application only accepts connections from private networks and is not
  meant to be exposed to the internet.
- Sign-in is limited to 6 attempts per 15 minutes per IP address and username.
- Passwords are stored as bcrypt hashes (cost 12), never as plain text.
- Phone numbers are encrypted (AES-256-GCM) in the database.
- Every sign-in, permission denial, record read and administrative decision is
  written to `audit_log` with who did it, which record, and the IP address.
- Logs never contain a full phone number, a password or message text.
### Documentation
 
Start at [`docs/README.md`](docs/README.md).
 
