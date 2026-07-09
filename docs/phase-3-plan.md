# Phase 3 Plan - External Sync Readiness

## Status

Phase 3 is in local sync-readiness mode. The app can prepare, review, and track sync payloads without requiring a live MinistryPlatform connection.

## Goal

Prove that clean event data can be prepared for an external system safely.

Phase 3 is not successful because an API call fires. Phase 3 is successful when staff can see which records are ready, what would be sent, what needs review, and why no record should be sent yet.

## Current Boundary

MinistryPlatform is the expected future destination, but no live connector is required right now.

- No real API key is required.
- No outbound API calls should happen.
- No credentials should be committed.
- Payload snapshots can be generated locally.
- Staff can review and mark queue items locally.

The sync page may show a connector placeholder, including whether an environment variable such as `MINISTRY_PLATFORM_API_KEY` exists, but that value is never displayed and is not used to connect yet.

## Slice 1: Payload Snapshots

Build local payload snapshots for queued records.

Record types:

- Registration
- Check-in
- Count

Why this comes first:

Payload snapshots let us inspect the data shape before anything leaves the app. This lowers the risk of bad external records, duplicate people, and hidden field mapping mistakes.

## Slice 2: Readiness Rules

Each queued record needs a clear local rule for whether it is ready.

Examples:

- Registration must be complete.
- Attendees must be active.
- Check-in records must reference a valid attendee or registration.
- Count records must reference a generated count.

Items that fail readiness move to review with a plain-English reason.

## Slice 3: Match Review

Before a real connector creates or updates external people, staff need a place to resolve likely matches.

This should stay local first:

- Show possible contact matches.
- Mark as matched, new contact, or needs review.
- Keep decisions auditable.

## Slice 4: Simulated Sync Attempts

Before a live API connector, add a local-only simulated attempt path.

This can test:

- Queued to synced status transitions.
- Failure states.
- Retry timing.
- Response snapshots.

Why simulate first:

It lets the queue and review workflow prove itself without external credentials or real data movement.

Status:

- Done for individual queue items.
- Staff can simulate success or failure from the sync review page.
- Simulated attempts save response snapshots, increment attempt counts, and set retry timing on failures.
- No outbound API calls happen.

## Slice 5: Live Connector

Only after the local workflow is trusted, add a connector adapter for MinistryPlatform.

Guardrails:

- Read credentials only from environment variables.
- Never log or display secrets.
- Keep payload and response snapshots.
- Never mark failed sends as successful.
- Keep manual review for ambiguous contacts.

## Non-Goals For This Slice

- Real MinistryPlatform API calls.
- OAuth setup.
- Full contact matching.
- Two-way sync.
- Real external payload submission.

Those are later connector work, not required to keep moving now.
