# MVP Spec

The MVP should prove the system can capture clean event data, generate exact counts, and prepare for check-in and sync without mixing core concepts.

## MVP Scope

- Event builder
- Public registration page
- Attendee and group registration
- Basic custom questions
- Required fields
- Count-mapped answers
- Local database records
- Count summaries
- Admin event list
- Attendee search
- CSV export

## Schema Target

The initial implementation should follow the [MVP schema](mvp-schema.md). That schema is the source of truth for Phase 1 entity boundaries, statuses, count mappings, QR/check-in placeholders, and external sync placeholders.

## Event Builder Requirements

- Create, edit, and archive events.
- Support draft, open, closed, and archived statuses.
- Configure capacity and registration dates.
- Configure public or private event page visibility.
- Store internal notes separately from public description.

## Registration Requirements

- Capture submitter/contact information.
- Capture one or more attendees per registration.
- Store attendee records separately from registration and order records.
- Support custom questions with typed answers.
- Support count mappings for operational totals.
- Store waiver and consent confirmations.

## Count Requirements

- Generate total registration and attendee counts.
- Generate counts from mapped answers.
- Show payment-aware count states when payment records exist.
- Keep generated totals traceable to source records.

## Admin Requirements

- Show upcoming events and status.
- Show registered and checked-in counts when available.
- Show count summaries.
- Search attendees.
- Export registrations and attendees to CSV.
- Provide a reconciliation view before MinistryPlatform sync.

## Out of MVP Scope

- Full Stripe checkout
- Promo codes
- Refund workflows
- Production MinistryPlatform sync
- Advanced household matching
- Per-attendee QR codes unless needed for the first event

## Acceptance Criteria

- A group registration creates one registration record and multiple attendee records.
- Count summaries are generated from structured answers.
- Incomplete registrations are visible but excluded from complete-registration counts.
- Public-safe documentation exists before production code is added.
