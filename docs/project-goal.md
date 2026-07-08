# Project Goal

Build an internal event registration and operations system that captures accurate attendee details, event selections, countable items, payments, QR check-ins, and sync-ready records for MinistryPlatform.

## Product Principle

The app owns the event capture workflow.

MinistryPlatform receives cleaned and validated data after the app has captured, counted, reviewed, and approved it for sync.

## Core Outcomes

- Staff can create and manage internal events.
- Registrants can submit individual or group registrations.
- Registration answers become structured operational counts.
- Attendees can be checked in quickly by QR code or manual lookup.
- Staff can review registrations, counts, payments, check-ins, and failed syncs.
- MinistryPlatform receives validated records through an auditable sync queue.

## Non-Goals

- This is not intended to be public SaaS.
- MinistryPlatform should not be the center of the user experience.
- Raw text answers should not be used as the source of operational totals.
- Pending, canceled, failed, or incomplete registrations should not be treated as complete.
