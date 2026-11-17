Frontend

Eight screens, one stylesheet, no build step.

| Page | Who sees it |
|---|---|
| `welcome.html` | public home |
| `login.html` | staff sign in |
| `request-access.html` | staff asking for an account |
| `register-facility.html` | a facility head registering their site |
| `setup.html` | one-time system administrator setup |
| `nurse.html` | NCD nurse: register, screen, resume, review |
| `psychologist.html` | psychiatric nurse and clinical psychologist: alerts and appointments |
| `admin.html` | facility administrator and system administrator |

`css/style.css` is the whole design system, including dark mode. See
[`../docs/ui-design-system.md`](../docs/ui-design-system.md) before changing it.

`js/` holds one file per screen plus three shared files: `theme.js`
(light/dark), `shell-language.js` (English/Kinyarwanda), and `app.js` with
`step-*.js` for the screening flow. `questions.js` holds the PHQ-9 and Whooley
wording in both languages. Scoring is loaded from the server at
`/backend/scoring.js`, so the page and the server can never disagree.
```
