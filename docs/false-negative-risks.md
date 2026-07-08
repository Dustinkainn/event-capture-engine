# False-Negative Risks

The system should be designed to avoid quietly missing real people, answers, payments, attendance, or sync failures.

## Identity Risks

- Matching a returning attendee as a new person
- Missing a household or family connection
- Skipping children or guests because they do not have emails
- Treating missing contact information as proof that an attendee is invalid

## Registration Risks

- Counting one group registration as only one attendee
- Failing to count conditional answers
- Sending incomplete form answers to MinistryPlatform
- Syncing partial or incomplete registrations

## Payment Risks

- Counting pending payments as complete
- Counting canceled or failed payments as complete
- Losing refund or comp context during reconciliation

## Check-In Risks

- Treating "not checked in yet" as "did not attend" too early
- Creating duplicate attendance records from duplicate QR scans
- Losing check-in undo history
- Missing which staff member, volunteer, device, or session performed the check-in

## Sync Risks

- Marking failed syncs as successful
- Losing sync failure details
- Retrying bad payloads without review
- Overwriting correct MinistryPlatform records with incomplete local data

## Design Protections

- Keep attendee records separate from registrations and orders.
- Require structured answer storage for count-mapped questions.
- Use explicit registration, payment, check-in, and sync statuses.
- Preserve audit logs for check-ins and sync attempts.
- Keep manual review queues visible to staff.
