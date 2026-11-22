# Who can see and do what 

The code for this table is `backend/permissions.js`. The server asks `canDo(role, action)` before every protected route and returns 403 with "Your role is not allowed to do this" when the answer is no.

There are five roles. There is no "desk staff" role.

| Action | System admin | Facility admin | NCD nurse | Psychiatric nurse | Clinical psychologist |
|---|---|---|---|---|---|
| Sign in | yes | yes | yes | yes | yes |
| Approve facility registrations | yes | no | no | no | no |
| Approve staff access requests | no | yes | no | no | no |
| Read the system-wide audit log | yes | no | no | no | no |
| Read a facility summary (counts only) | yes | yes | no | no | no |
| Register a patient and record consent | no | no | yes | no | no |
| Search patients in own facility | no | no | yes | no | no |
| Record a screening | no | no | yes | no | no |
| Save and resume screening drafts | no | no | yes | no | no |
| Read alert detail, scores and answers | no | **no** | no | yes | yes |
| Book, reschedule and close appointments | no | no | no | yes | yes |
| Escalate a case to a psychologist | no | no | no | yes | no |
| Add and edit a follow-up note | no | no | no | yes | yes |
| Close an alert | no | no | no | **no** | yes |

## Why it is cut this way

 **Administrators never see clinical detail.** A facility administrator sees
  counts: how many screenings, how many alerts, how many appointments, who is
  carrying what load. No patient codes, no answers, no scores.
 **The NCD nurse runs the screening**, so they need the answers and the score
  for their own patients, and they see only their own facility.
 **Mental-health staff review and follow up**, so they need the detail, the
  patient's phone number and the appointment tools. They see only the alerts
  assigned to them.
 **Only a clinical psychologist closes a case.** A psychiatric nurse can
  escalate but cannot close, so nothing is quietly dismissed.

## Scoping on top of permissions
 
A permission says what a role may do. The SQL then says which rows. Both apply.

- Patients, screenings and drafts are scoped to `facility_id`.
- Alerts are scoped to the staff member they are assigned to. The rule is in
  `backend/alert-visibility.js` and both the alert list and the booking route
  build their SQL from it, so the two cannot drift apart.
- **A psychologist always sees an alert assigned to them**, whatever facility
  they work at. Assignment is itself proof of entitlement.
- The **unassigned** specialist queue is the safety net for cases nobody has
  picked up. It is visible to, and claimable by, any active clinical
  psychologist whose facility is in the patient's district.
- **Facility type is never a condition.** A psychologist at a health centre
  and one at a district hospital have identical access.

## Audit

Every sign-in, permission denial, patient search, screening, alert read,
escalation, appointment and administrative decision is written to `audit_log`
with the actor, the record, the outcome and the IP address. The system
administrator can read the full log; nobody else can.
```

