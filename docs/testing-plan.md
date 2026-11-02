# Testing plan

## What we test and how

| What | How | File | Pass when |
|---|---|---|---|
| The rules at their edges | hand-written cases in code | `testing/test-cases.js` | prints "All boundary test cases passed" |
| The 50 fake patients | hand results against the code | `testing/run-tests.js` | prints "50 of 50 patients scored correctly" |
| The backend routes | real calls to port 4000 | `testing/api-tests.js` | prints "All API tests passed" |
| The wording | checks shape and lists missing Kinyarwanda | `testing/translation-check.js` | 9 questions, options 0 to 3, no crash |
| The screens | one person clicks through on one laptop | by hand | consent, 2 questions, 9 questions, result |

## Edge cases we must cover

- Both quick answers No.
- Total exactly 4, 5, 9 and 10.
- Item 9 = 1 with a total of 1. Must be high and emergency.
- Item 9 = 0 with a total of 24. Must be high and **not** emergency.
- Wrong input: 8 answers instead of 9, an answer of 4, an answer of 1.5, text instead of true or false.
- Desk staff calling /score. Must be 403.
- Wrong password. Must be 401 with the same message as a wrong username.

## Done when

A card moves to Done only when all four are true:

1. The code runs with no error on a fresh `git pull`.
2. Its tests pass and the output is pasted in the pull request.
3. A named reviewer has read it.
4. The owner can explain every line out loud.

## Who checks what

| Author | Reviewer | Done-when check |
|---|---|---|
| Djibril | Ivan | Anny |
| Ivan | Djibril | Anny |
| Ines | Anny | Anny |
| Audrey | Promise | Anny |
| Promise | Audrey | Anny |
| Anny | Ivan | Promise |
