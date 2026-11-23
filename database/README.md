# Database setup

Apply these files in order to PostgreSQL:

1. `schema.sql`
2. `migrate_sprint2.sql`
3. `migrate_sprint3_security_and_resume.sql`
4. `migrate_sprint4_ncd_options.sql`
5. `migrate_sprint5_hide_seed_facility.sql`
6. `migrate_sprint6_routing.sql`
7. `migrate_sprint7_reminders_and_notes.sql`
8. `migrate_sprint8_facilty_requests.sql`
9. `migrate_sprint9_system_admin_no_facility.sql`
10. `migrate_sprint10_appointment_follow_up.sql`
11. `migrate_sprint11_sms_provider_simulation_status.sql`
12. `migrate_sprint12_duplicates_approval_sms_alert_routing.sql`

The current schema stores patients without names, encrypts phone numbers in the application, hashes staff passwords, scopes staff/patient records by facility, stores resumable screening drafts, persists appointment reminder queue entries, and distinguishes simulated SMS fallback from provider-accepted rows. Run migrations only after making a database backup. The reset procedure for a development database is documented in the root README; it is destructive and must only be run against the intended database.
