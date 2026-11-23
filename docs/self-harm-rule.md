# The self-harm rule


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
- Say what the nurse does next: follow the facility's emergency referral steps and contact the responsible care team now.
- Never show the message where the nurse has to scroll to find it.
- Never say the word "diagnosis".

## What happens after the screen

Item 9 above 0 always raises an alert, and that alert is always marked
**urgent**, so it sits at the top of the psychiatric nurse's queue regardless
of the total. The routing itself is unchanged by item 9: the case still goes to
a psychiatric nurse at the patient's own facility. Only a nurse escalating with
a written reason sends it to a clinical psychologist.

Being urgent does **not** allow the psychiatric nurse to escalate straight
away. Every escalation, urgent and emergency cases included, requires an
appointment on that alert already recorded as attended. The nurse sees the
patient first; urgency decides how quickly that first appointment is arranged.

No SMS ever mentions self-harm, a score or a risk level. See
[`sms-messages.md`](sms-messages.md).

## How we prove it works

`testing/test-cases.js` includes a patient with total 1 and item 9 = 1. The
result must be high and emergency. Ten of the 50 fake patients have item 9
above 0, and four of those have a low total. `testing/routing-tests.js` checks
that each of those raises an urgent alert.
