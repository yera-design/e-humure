#Testing plan
## Offline suites — no database, no server

```
node testing/run-all.js
```

Runs everything below and exits non-zero if any suite fails, so it works as a
pre-commit hook. `npm test` in `backend/` runs the same thing.

| Suite | What it proves | Pass output |
|---|---|---|
| `run-tests.js` | the 50 fake patients score exactly as hand-calculated | `50 of 50 patients scored correctly` |
| `routing-tests.js` | severity bands, alert thresholds, urgency, target role, even spread | all checks pass |
| `sms-message-tests.js` | both languages present, sender named, no patient code in a patient message, no clinical word in any message, 077 rejected | `All checks passed.` |
| `sms-provider-tests.js` | Africa's Talking responses are parsed correctly, including rejections and malformed bodies | all checks pass |
| `shell-language-status.js` | a status line can be replaced after it has shown a first message, in either language | `All checks passed.` |
| `translation-check.js` | 9 PHQ-9 questions, 2 quick questions, options 0 to 3, every string has English and Kinyarwanda | `Checks passed on N strings.` |
| `page-wiring.js` | every page is closed, every `<script src>` exists, inline scripts parse | `All pages wired correctly.` |
| `page-structure.js` | no duplicate element ids, every page has the stylesheet, theme bootstrap and language switch, every id a page's script needs exists, no 077 anywhere, no email field anywhere | `All structural checks passed.` |
| `sprint9-system-admin-unit.js` | a system administrator belongs to no facility | invariants pass |

`test-cases.js` holds the hand-written boundary cases and is exercised through
`run-tests.js`.

## Database-backed suites — run deliberately

These need PostgreSQL, a migrated schema and a running server. They are not
part of `run-all.js`.

| Suite | How to run |
|---|---|
| `api-tests.js` | set `API_TEST_FACILITY`, `API_TEST_NCD_USERNAME/PASSWORD`, `API_TEST_PSYCHIATRIC_USERNAME/PASSWORD` to existing approved accounts, then `node testing/api-tests.js` |
| `sprint9-system-admin-integration.js` | point `DATABASE_URL` at a disposable database whose name ends in `_test`, then `E_HUMURE_RUN_DB_TESTS=1 node testing/sprint9-system-admin-integration.js` |

There are no demo or seed accounts. These suites use accounts you create.

## Edge cases that must stay covered

- Both quick answers No: low risk, no PHQ-9, no alert.
- Totals exactly 4, 5, 9, 10, 14, 15, 19 and 20 land in the right band.
- A total of 5 to 9 raises **no** alert.
- Item 9 = 1 with a total of 1: high, emergency, urgent alert.
- Item 9 = 0 with a total of 24: high, **not** an emergency.
- Bad input: 8 answers instead of 9, an answer of 4, an answer of 1.5, text
  instead of true or false. Each must throw, never return a quiet wrong answer.
- An NCD nurse calling `/alerts`: 403.
- A psychiatric nurse calling `/alerts/:id/handled`: 403, only a psychologist
  closes a case.
- Wrong password: 401 with the same message as a wrong username.
- An 077 number: rejected everywhere.

## Checked by hand before release

Open each screen in both themes and both languages, at 360px and at desktop
width:

1. Home, sign in, request access, register facility, system setup.
2. Nurse: dashboard, register, consent, 2 questions, 9 questions, result,
   emergency result, resume a pending screening.
3. Specialist: open alerts, alert detail, book, reschedule, mark attended,
   visit note, escalate.
4. Administration: facility summary and staff requests as a facility admin;
   facility registrations, system overview and audit as a system admin.

Confirm in each case that nothing is clipped, the theme toggle persists after a
reload, and switching language mid-questionnaire keeps every answer.

## Done when
A change is done only when all four are true:

1. The code runs with no error on a fresh clone.
2. `node testing/run-all.js` passes and the output is pasted in the pull
3. A named reviewer has read it.
4. The owner can explain every line out loud.