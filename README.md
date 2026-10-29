# e-Humure

Depression screening for chronic-disease patients in rural Rwanda. Sprint 1 prototype by NovaCrew.

A nurse records consent, asks 2 quick questions, and if either answer is Yes asks the 9 PHQ-9 questions. The system shows a risk level. It supports the nurse and never diagnoses. **All data in this repository is invented.**

## What you need

- Node.js 18 or newer. Check with `node -v`.
- Git.
- Nothing else. No database to install.

## Run the screening page

Double-click `frontend/index.html`. The consent screen appears. No server needed.

Two buttons at the top switch between English and Kinyarwanda. You can press them at any point, including half way through the questions, and your answers stay. English opens first because some Kinyarwanda wording is still a team draft. See `docs/translation-status.md`.

## Run the backend

```
cd backend
npm install
npm start
```

Open http://localhost:4000/health. You should see `{"status":"ok"}`. Then open `frontend/login.html` and sign in with a demo account from `backend/README.md`.

## Run the tests

From the repository root:

```
node testing/test-cases.js
node testing/translation-check.js
node testing/generate-fake-patients.js
node testing/run-tests.js
```

The backend tests need the server running first. See `backend/README.md`.

## The scoring rules

| Step | Answer | Result |
|---|---|---|
| Quick questions | both No | low risk, screen again next visit |
| Quick questions | any Yes | do the PHQ-9 |
| PHQ-9 total | 0 to 4 | low |
| PHQ-9 total | 5 to 9 | moderate |
| PHQ-9 total | 10 or more | high |
| PHQ-9 question 9 | above 0 | emergency and high, whatever the total |

They live in one file only: `backend/scoring.js`. The page, the server and the tests all read that file.

## Folders

| Folder | Holds |
|---|---|
| backend | server, login, scoring, permissions |
| frontend | the screens, the wording, the stylesheet |
| database | the PostgreSQL design for Sprint 2 |
| testing | the 50 fake patients and every test |
| docs | the contract, the plans and the decisions |

Start with `docs/contract.md`. It is the agreement every file follows. Day-by-day work is in `SPRINT_RUNBOOK.md`.

## Team

| Name | Role |
|---|---|
| Promise Victoire Yera | project manager, scrum master |
| Djibril Ntwali Mpamira | lead developer |
| Ivan Ineza Hakizimana | frontend developer |
| Ines Ingabire | database architect |
| Audrey Noella Hategekimana | UI/UX designer |
| Benitha Anny Akuzwe | quality assurance, product owner |

