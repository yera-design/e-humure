# Nurse steps

```
Patient arrives for the normal chronic-disease visit
        |
   1. REGISTER    ->  a patient code is generated. No name is entered.
        |
   2. CONSENT     ->  "Not today"  ->  stop, continue the normal visit
        |
   3. QUICK QUESTIONS (2 questions, Yes or No)
        |
   both No  ->  Low risk. Screen again at the next routine visit. No alert.
        |
   any Yes
        |
   4. FULL QUESTIONNAIRE (PHQ-9, 9 questions, each 0 to 3)
        |
   5. RESULT
```

## What the total means

These are the only numbers in the system, and they live in
`backend/routing.js`.

| PHQ-9 total | Severity shown | Risk label | Alert raised? |
|---|---|---|---|
| 0 to 4 | Minimal | low | no |
| 5 to 9 | Mild | low | no — watchful waiting, re-screen later |
| 10 to 14 | Moderate | moderate | yes |
| 15 to 19 | Moderately severe | high | yes |
| 20 to 27 | Severe | high | yes, and marked urgent |

**Item 9 above 0 overrides the total.** It is always an emergency, always high
risk and always raises an urgent alert, even when the total is 1. See
[`self-harm-rule.md`](self-harm-rule.md).

A score of 5 to 9 is recorded and the patient is re-screened at a later visit.
It deliberately creates no work for mental-health staff.

## Who the alert goes to

Every alert goes to a **psychiatric nurse at the patient's own facility**, the
one carrying the fewest open alerts. The only route to a **clinical
psychologist** is a psychiatric nurse escalating a case with a written reason.
The single exception is availability: if the facility has no active psychiatric
nurse, the alert goes to a psychologist instead so it is never lost.

When a case does reach a psychologist, the search runs in this order:

1. an active psychologist at the **patient's own facility**;
2. failing that, an active psychologist **anywhere in the same district**,
   whatever type of facility they work at;
3. failing that, the alert stays **open, urgent and unassigned**, visible to
   and claimable by any psychologist in that district, including one who
   registers later.

Within each step the least loaded wins: fewest open alerts, ties broken by the
oldest account. Facility type is never a factor.

### Escalation requires the first visit

A psychiatric nurse cannot escalate a case until they have an appointment on
that alert recorded as **attended**. This holds for **every** alert, urgent and
emergency cases included. The nurse sees the patient first, so the specialist
receives a case somebody has actually met. Urgency changes how quickly that
first appointment should be arranged, not whether it happens.

The Escalate button is not shown until the first visit is attended; a warning
explains what to do instead. If the request is somehow made anyway, the server
refuses with 409 and the nurse sees that message.

## What the nurse sees on each screen

| Screen | Shows | Buttons |
|---|---|---|
| Dashboard | patient search, pending screenings, completed screenings | Register patient, Search, Resume, Refresh |
| Register | age, condition, sector, phone. No name field. | Register patient, Back to dashboard |
| Consent | short plain sentence, "this does not diagnose" | I agree, Not today |
| Quick questions | 2 questions, one at a time | Yes, No, Next |
| PHQ-9 | the stem sentence, then 9 questions with 4 answers each | Next, Back, See result |
| Result | risk word, total out of 27, severity, what to do next | Start a new screening, Back to dashboard |

## Rules for the design

- One idea per screen. Large buttons. Works at 360 pixels wide.
- Plain words. No medical jargon.
- The result screen always repeats "This screen supports the nurse. It does not
  diagnose."
- The emergency message is boxed, high contrast, and never below the fold.
- Nothing is machine translated.

## Resuming a visit

Progress saves to the server after every answer. If the nurse is called away,
the visit appears under **Pending screenings** and resumes at the last
unanswered question with every earlier answer intact.

## Language

Two buttons sit in the top bar, English and Kinyarwanda. The nurse can press
either at any point, even half way through the 9 questions. The screen redraws
in the other language and every answer already chosen stays chosen. English
opens first; the PHQ-9 questions themselves are the validated wording, so they
are safe in either language.
