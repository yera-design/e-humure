# How I work out the expected results

I do not read the scoring code. I read Table 1 of the proposal and write the answers myself. If his code and my sheet disagree, one of us is wrong and the team decides which.

## Table 1 in my own words

1. Both quick answers No: the patient stops there. Low risk. No total.
2. Any quick answer Yes: the patient does the 9 questions.
3. Add the 9 answers. Each one is 0, 1, 2 or 3, so the lowest total is 0 and the highest is 27.
4. The **risk label** in `expected-results.csv` is the workflow label, not the
   PHQ-9 severity band. 0 to 9 is low, 10 to 14 is moderate, 15 or more is
   high. A total of 5 to 9 is mild on the PHQ-9 and still **low** risk here,
   because it raises no alert.
5. If the ninth answer is 1, 2 or 3, it is an emergency and the risk is high,
   even if the total is 2.
6. Without the ninth answer the highest total is 24.

## How I fill the file

`testing/expected-results.csv` has columns `id,total,risk,emergency`.

- `total`: add the 9 numbers from `fake-patients.json`. Leave it empty for the 8 patients with no PHQ-9.
- `risk`: `low`, `moderate` or `high`.
- `emergency`: `true` or `false`. True only when the ninth number is above 0.

## How I check

```
node testing/run-tests.js
```

It prints every disagreement by id, then `X of 50 patients scored correctly`. My goal is 50 of 50.

## The ones I expect to get wrong first

The self-harm patients with a small total. The instinct says low because the total is 1 or 3. The rule says high and emergency. Those ten are checked twice.
