# Architecture

Owner: Djibril. Draft for the Sprint 1 slide.

## What exists in Sprint 1

```mermaid
flowchart TD
  N[Nurse browser<br/>index.html] --> S[scoring.js<br/>the rules]
  N --> Q[questions.js<br/>en and rw wording]
  L[login.html] -->|fetch| A[Express server<br/>port 4000]
  A --> AU[auth.js<br/>JWT]
  A --> P[permissions.js<br/>canDo role action]
  A --> ST[store.js<br/>3 demo users in memory]
  A --> S
  T[testing/*.js] --> S
  T --> A
```

The screening page runs on its own. Double-click `index.html` and it works with no server, because the browser loads `scoring.js` straight from the backend folder. That is the point of keeping one rules file.

## What Sprint 2 adds

```mermaid
flowchart TD
  A[Express server] --> DB[(PostgreSQL<br/>schema.sql)]
  A --> QU[Queue<br/>alerts and SMS]
  QU --> SY[Sync service<br/>district hospital]
  SY --> SMS[SMS gateway]
  SY --> PS[Psychologist dashboard]
```

## Choices and why

| Choice | Why |
|---|---|
| One scoring file used by the page, the server and the tests | The rules can never drift apart. |
| Plain JavaScript, no build step | Every line is readable and runs on any laptop with Node. |
| Users in memory this week | Nobody has to install PostgreSQL before the demo. The schema is still written and reviewed. |
| JWT for login | Stateless, so the server keeps no sessions. |
| Permission table in its own file, owned by Ines | The server asks it a question; it never decides roles itself. |
