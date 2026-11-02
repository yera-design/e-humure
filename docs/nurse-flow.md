# Nurse steps

Owner: Audrey. Card S1-05.

```
Patient arrives for the normal chronic-disease visit
        |
   1. CONSENT  ->  "Not today"  ->  stop, continue the normal visit
        |
   2. QUICK QUESTIONS (2 questions, Yes or No)
        |
   both No  ->  Low risk. Screen again at the next routine visit.
        |
   any Yes
        |
   3. FULL QUESTIONNAIRE (9 questions, each 0 to 3)
        |
   4. RESULT
        0 to 4   Low        screen again next visit
        5 to 9   Moderate   psychologist review list
        10 +     High       priority psychologist appointment
        item 9 above 0  ->  EMERGENCY, high risk, follow the emergency steps now
```

## What the nurse sees on each screen

| Screen | Shows | Buttons |
|---|---|---|
| Consent | short plain sentence, "this does not diagnose" | I agree, Not today |
| Quick questions | 2 questions, one at a time on a phone | Yes, No, Next |
| Full questionnaire | the stem sentence, then 9 questions with 4 answers each | See result |
| Result | risk word, total out of 27, what to do next | Start a new screening |

## Rules for the design

- One idea per screen. Large buttons. Works at 360 pixels wide.
- Plain words. No medical jargon.
- The result screen always repeats "This screen supports the nurse. It does not diagnose."
- The emergency message is red, boxed and never hidden below the fold.
- Nothing is machine translated.

## Language

Two buttons sit at the top of the page, English and Kinyarwanda. The nurse can press either at any point, even half way through the 9 questions. The screen redraws in the other language and every answer already chosen stays chosen.

English is what opens first, because 11 of the Kinyarwanda strings are still a team draft waiting for a clinician. The PHQ-9 questions themselves are the validated wording, so they are safe in either language.
