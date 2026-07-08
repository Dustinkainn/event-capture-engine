# MinistryPlatform Sync

MinistryPlatform is the final sync destination for cleaned and validated event data. The product experience should remain centered on event capture, operations, and review.

## Sync Responsibilities

- Contact matching
- Household or family matching
- Registration sync
- Attendance and check-in sync
- Field mapping
- Sync queue management
- Retry handling
- Sync logs
- Manual review
- Payload snapshots for audit history

## Sync Flow

1. Capture local event, registration, attendee, answer, payment, and check-in records.
2. Validate that records are complete enough for sync.
3. Match or queue review for contacts and households.
4. Build a MinistryPlatform payload from local structured data.
5. Store the payload snapshot before sending.
6. Send through a queued sync job.
7. Record success, failure, response data, and retry eligibility.
8. Keep failed syncs visible until resolved or intentionally dismissed.

## Guardrails

- Do not sync partial or incomplete registrations as successful.
- Do not mark failed syncs as successful.
- Do not lose failure response details.
- Do not create duplicate attendance records from duplicate QR scans.
- Do not treat missing email addresses as missing people.
- Do not assume an unchecked-in attendee did not attend until the event reconciliation process says so.

## Public Repository Safety

Do not commit real API URLs, credentials, tokens, payloads containing private attendee data, member records, church exports, or screenshots with personal information.
