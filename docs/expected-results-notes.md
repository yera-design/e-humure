# How I work out the expected results

Owner: Ivan. Cards S1-08 and S1-09.

I do not read the scoring code. I read Table 1 of the proposal and write the answers myself. If his code and my sheet disagree, one of us is wrong and the team decides which.

## Table 1 in my own words

1. Both quick answers No: the patient stops there. Low risk. No total.
2. Any quick answer Yes: the patient does the 9 questions.
3. Add the 9 answers. Each one is 0, 1, 2 or 3, so the lowest total is 0 and the highest is 27.
4. 0 to 4 is low. 5 to 9 is moderate. 10 or more is high.
5. If the ninth answer is 1, 2 or 3, it is an emergency and the risk is high, even if the total is 2.
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

It prints every disagreement by id, then `X of 50 patients scored correctly`. My goal is 50 of 50 by Sun 1 Nov.

## The ones I expect to get wrong first

The self-harm patients with a small total. My instinct says low because the total is 1 or 3. The rule says high and emergency. I check those ten twice.
