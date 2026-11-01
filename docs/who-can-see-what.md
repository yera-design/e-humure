# Who can see and do what

Owner: Ines. Card S1-06. The code for this table is `backend/permissions.js`.

| Action | Nurse | Psychologist | Desk staff |
|---|---|---|---|
| Log in | yes | yes | yes |
| Add a patient record | yes | no | no |
| Record a screening | yes | yes | no |
| See screening answers and scores | yes | yes | **no** |
| See summary codes only | no | yes | yes |

## Why

- Desk staff book visits. They never need to know how a patient answered. They get a short code in Sprint 2 (for example `REV` for review needed), never the score.
- Nurses run the screening, so they need the answers and the score.
- Psychologists review and follow up, so they need the detail too.
- Everything that is read or changed goes into `audit_log`, so we can show who looked at what.

## How the server uses it

`canDo(role, action)` returns true or false. The server asks it before `/score`. Desk staff get 403 and the message "Your role is not allowed to do this".

