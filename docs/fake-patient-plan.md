
Owner: Ines. Card S1-07. Made by `testing/generate-fake-patients.js` with a fixed seed, so the same 50 come out every time.

| Group | How many | PHQ-9 total | Item 9 | Ids |
|---|---|---|---|---|
| Both quick answers No | 8 | no PHQ-9 | none | P-0001 to P-0008 |
| Low | 8 | 0 to 4, includes 4 | 0 | P-0009 to P-0016 |
| Moderate | 8 | 5 to 9, includes 5 and 9 | 0 | P-0017 to P-0024 |
| High | 8 | 10 to 24, includes 10 and 24 | 0 | P-0025 to P-0032 |
| Self-harm | 10 | mixed, four of them low | above 0 | P-0033 to P-0042 |
| Mixed | 8 | 4, 5, 9, 10, 17, 22, 0, 24 | 0 | P-0043 to P-0050 |

## Rules

- All values are invented. No names. No real phone numbers.
- The file holds no expected result. Ivan works those out by hand.
- Item 9 is 0 everywhere except the 10 self-harm patients.
- Four self-harm patients have a total of 4 or less. They are the trap: the total says low, the rule says high and emergency.
- Fields: `id, age, condition, sector, phone, whooley, phq9`. `phq9` is `null` when both quick answers are No.

## Rebuild it

```
node testing/generate-fake-patients.js
```

Prints `Wrote 50 fake patients to ...`. The file does not change unless the seed changes.
