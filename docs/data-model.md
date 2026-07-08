# Data Model

The system must keep event, registration, attendee, order, payment, count, QR, check-in, and sync records separate. Orders and attendees are not the same thing.

Example: one parent registering four people should create one registration or order, four attendee records, four countable attendees, and either one group QR code or four individual QR codes depending on event settings.

## Core Records

For implementation-ready Phase 1 fields, statuses, relationships, and validation rules, see [MVP schema](mvp-schema.md).

### Events

Represents an internal event configured by staff.

Fields include name, date and time, location, description, capacity, registration open and close dates, event image, free or paid setting, public or private page setting, status, and internal notes.

### Registrations

Represents one submitted signup flow. A registration may include one attendee or a group of attendees.

Tracks event, submitter/contact, status, submitted time, completion state, and review state.

### Attendees

Represents each person expected at the event.

Tracks name, contact details when available, registration relationship, household relationship when known, attendee status, and check-in eligibility.

### Orders

Represents the commercial or transactional wrapper for a registration.

Tracks ticket types, quantities, discounts, comps, payment state, refunds, and reconciliation details.

### Ticket Types

Represents selectable registration products or admission types, such as adult, child, volunteer, or session-specific tickets.

### Registration Questions

Represents configured form questions and rules.

Supported question types include text, email, phone, dropdown, multiple choice, checkbox, date, long answer, and waiver or consent.

### Registration Answers

Represents structured answers submitted for a registration or attendee.

Answers should preserve enough typed structure to power counts, validation, review, and MinistryPlatform mapping.

### Count Categories

Represents staff-defined operational count groups, such as meals, shirt sizes, childcare, sessions, volunteers, transportation, or custom categories.

### Count Items

Represents individual countable values within a category, such as chicken meal, vegetarian meal, youth medium shirt, or bus seat.

### Generated Counts

Represents calculated totals produced from structured registrations, answers, payments, and check-ins.

Generated counts should be reproducible and traceable back to the records that produced them.

### Payments

Represents payment attempts, successful charges, refunds, manual comps, and payment status changes.

Pending, canceled, failed, and refunded payments must not be counted as complete unless the event rules explicitly allow it.

### QR Tokens

Represents group or individual check-in tokens.

Tracks token scope, state, issuance time, usage state, and duplicate scan protection.

### Check-Ins

Represents event-day attendance actions.

Tracks attendee or registration, timestamp, staff or volunteer actor, device or session, action type, undo state, and audit details.

### MinistryPlatform Mappings

Represents local-to-MinistryPlatform identity and field mappings.

Tracks contact matches, household matches, registration mappings, attendance mappings, and sync field mappings.

### MinistryPlatform Sync Logs

Represents sync queue items, attempts, payload snapshots, responses, failures, retries, and manual review state.
