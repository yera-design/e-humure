# The self-harm rule

Owners: Anny and Audrey. Card S1-12. Given to Djibril on Fri 30 Oct.

## The rule

If PHQ-9 question 9 is answered 1, 2 or 3, it is an emergency. The risk is shown as high, whatever the total.

Question 9 is: "Thoughts that you would be better off dead or of hurting yourself in some way."

## Why

A patient can score 1 in total and still be in danger. The total hides that. The ninth question is the only one that asks about it directly, so it gets its own rule.

## What the code must do

- Find question 9 by its position. It is the ninth answer, index 8.
- Set `emergency` to `true`.
- Set `risk` to `"high"`, overwriting whatever the total said.
- Never hide the result or soften the wording.

## What the screen must do

- Show a red, boxed message straight away.
- Say what the nurse does next: follow the emergency referral steps and call the on-duty psychologist.
- Never show the message where the nurse has to scroll to find it.
- Never say the word "diagnosis".

## What we do not build in Sprint 1

The printed referral sheet, the psychologist alert and the SMS. Those are Sprint 2.

## How we prove it works

`testing/test-cases.js` includes a patient with total 1 and item 9 = 1. The result must be high and emergency. Ten of the 50 fake patients have item 9 above 0, and four of those have a low total.
