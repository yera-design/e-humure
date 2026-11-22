# Testing

```bash
node testing/run-all.js
```

Runs every suite that needs no database and no running server, and exits
non-zero if any fails. `fake-patients.json` holds 50 invented patients with no
real names or numbers; `expected-results.csv` holds the scores worked out by
hand, independently of the scoring code.

Which suite proves what, and how to run the database-backed ones, is in
[`../docs/testing-plan.md`](../docs/testing-plan.md).
```
