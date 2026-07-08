# Preview Standards

These standards keep the admin, public registration, and scanner previews feeling like one product while still allowing each experience to fit its job.

## Product Naming

- Use `Event Capture Engine` for the product name.
- Use `Operations` only as the admin-side context label.
- Use `External Sync` or `Integration Review` in navigation, headings, and screen titles.
- Keep destination-specific names, such as `MinistryPlatform`, inside implementation docs, setup fields, connector settings, or technical notes.
- Avoid destination-specific abbreviations in primary labels unless space is truly constrained and the destination has already been established.

## Experience Labels

- `Admin Dashboard`: staff control center.
- `Event Builder`: event setup and publishing controls.
- `Form Builder`: registration questions and count mappings.
- `Public Registration`: attendee-facing registration flow.
- `Check-In`: staff or volunteer event-day scanning and lookup.
- `Count Summary`: operational counts generated from structured data.
- `Reconciliation`: staff review before reporting or sync.
- `External Sync`: queue, matching, payload snapshots, retries, and logs for the configured destination.

## Theme Tokens

Use the shared CSS custom properties in `styles.css`.

- `--action`: primary action and success states.
- `--info`: active navigation, selected segments, and neutral progress.
- `--warning`: payment review or attention states.
- `--danger`: failed syncs and blocking errors.
- `--surface`: panels and cards.
- `--band`: page background.
- `--line`: borders and separators.
- `--muted`: supporting text.

## Layout Rules

- Admin pages may use the left sidebar on desktop.
- Public registration should not use the admin sidebar.
- Scanner/check-in should be tablet and phone first, with a large scan area and oversized event-day actions.
- Keep section headings consistent: eyebrow for workflow area, heading for screen name.
- Keep controls named by the action they perform, not by implementation detail.

## Current Preview Pages

- `index.html`: preview home and area selector.
- `admin.html`: staff/admin console.
- `public-registration.html`: attendee-facing signup flow.
- `scanner.html`: event-day check-in flow.

## Access Model Placeholders

- Present the system as one shared event area where event data is captured.
- Allow for named staff users, volunteers, and event-day devices without requiring a final login model yet.
- Event-day activity should show placeholders for operator, device, and timestamp because check-in logs need that context.
- Public registration should read as guest-friendly unless a future event requires account login.
