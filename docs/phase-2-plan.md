# Phase 2 Plan - Check-In

## Goal

Phase 2 proves the event-day workflow works reliably. Phase 1 proved we can capture clean event data and turn it into exact counts. Phase 2 proves that on the day of the event, staff can get a registrant from "arrived at the door" to "counted as present" quickly, accurately, and without double-counting.

The bar for Phase 2 is not "a scanner exists." The bar is: at a real event, with real people in line, the check-in loop is fast, forgiving of mistakes, and produces attendance numbers staff trust.

## What Phase 1 Already Delivered Toward Check-In

A meaningful amount of the original Phase 2 roadmap was built early, because proving the core loop required it. Phase 2 planning should start from what already exists so we do not rebuild it:

- QR token generation on every registration.
- Public confirmation page that renders the QR code.
- Staff scanner page with a QR camera scanner, a manual token entry fallback, and a manual name lookup.
- Check-in and undo actions with duplicate-scan protection (token status flips to used; already-checked-in attendees are skipped).
- Check-in records written for every scan and undo (the `CheckIn` model logs action, attendee, registration, token, and time).
- Live scanner totals (registered, checked in, not checked in).

Reasoning:
The scanner was built against the same server-side check-in rules used by manual lookup, so QR and manual paths cannot disagree. That work is done and validated at the build/logic level. What is missing is everything around it that makes check-in trustworthy and reviewable, plus delivery of the QR to the registrant in the first place.

## Phase 2 Build Slices

These are ordered by dependency and value. Each slice is meant to be shippable on its own.

### Slice 1: Confirmation Delivery (get the QR to the registrant)

Today the QR code only lives on the confirmation web page. If a registrant closes that tab, they have no code to present. Check-in cannot be reliable if most people arrive with nothing to scan.

Build:

- Send a confirmation on successful registration that includes the QR code (or a link back to the confirmation page) and the event details.
- Record delivery state so staff can see who was sent a confirmation.
- Keep the manual name lookup as the guaranteed fallback for anyone who arrives without their code.

Why email first, not SMS:
Email carries an inline QR image and long links cleanly, needs no phone-number normalization, and is lower cost and lower risk for a first pass. SMS is a strong later addition once the delivery path is proven.

Why this is Slice 1:
Every later check-in improvement assumes registrants can present something to scan. Delivery is the true entry point of the event-day workflow, so it comes before polishing the scanner or the reports.

Decision needed before building:
This slice introduces the first outbound integration. We need to pick an email provider and a from-address, and store its credentials in environment config. This is flagged as an open decision below rather than assumed.

### Slice 2: Check-In Log and Attendance Review

The `CheckIn` records exist but there is no screen to review them. Staff need to answer "who checked in, when, and was anything undone" without opening the database.

Build:

- A per-event check-in log showing each check-in and undo, in time order, with attendee and registration.
- A clear view of undo/correction history so a contested check-in can be explained.
- Filters for checked-in, not-checked-in, and needs-review attendees.

Why a log, not just the running totals:
Totals answer "how many." A log answers "what happened," which is what staff need when a number looks wrong or a guest disputes their status. The scanner already shows totals; the log is the audit surface behind them.

### Slice 3: Attendance Counts as First-Class Counts

The count engine is supposed to produce checked-in versus registered counts, by category, and keep them traceable. Right now generated counts come from registration answers only; attendance is shown as raw scanner totals, not as generated counts.

Build:

- Generate attendance counts (checked-in totals, checked-in vs registered) alongside the existing registration-answer counts.
- Support attendance broken down by the same count categories used for registration (for example, checked-in meals or checked-in by age group).
- Keep every attendance count traceable back to check-in records.

Why fold attendance into the count engine instead of a separate report:
The whole value of the app is one trustworthy count system. If attendance lives in a separate ad-hoc report, the two number sources will eventually disagree. Making attendance a count type keeps a single source of truth.

### Slice 4: Station and Device Identity on Check-Ins

The schema already models devices and stations, but check-ins do not record which station performed them. For a single-table event this does not matter; for multi-door or multi-station events it matters a lot for both throughput and accountability.

Build:

- Let a scanner session identify its station.
- Record the station on each check-in.
- Show station in the check-in log.

Why this is later, not earlier:
A first real event can run from one station. Adding station identity before the delivery, log, and counts slices would be optimizing a scaling problem we do not have yet.

### Slice 5: Scanner Reliability Hardening

Build:

- Physical-device camera test on a phone or tablet (carried over from Phase 1; the desktop session has no camera, and local HTTPS was not accepted by the test phone).
- Decide whether a short-lived public HTTPS tunnel is acceptable for on-device testing, or whether we test another way.
- Evaluate offline/degraded-network behavior for the scanner and decide if an offline queue is in Phase 2 or deferred.

Why reliability is its own slice, and why offline is a maybe:
Offline scanning is a large engineering slice with its own correctness risks (queued check-ins, later reconciliation, duplicate protection while disconnected). Phase 1 deliberately kept the scanner online-only. Phase 2 should decide with real event conditions in mind, not build offline speculatively.

## Carryover From Phase 1

These were in the MVP/admin intent but are not built yet. They are small and support event-day and review work, so they are tracked here rather than lost:

- CSV export of registrations and attendees.
- Attendee search from the admin side (the scanner has lookup; the admin review side does not yet have a dedicated search).

## Explicit Non-Goals for Phase 2

- Real MinistryPlatform / external API sync. The sync queue and review screen exist, but calling an external API is Phase 3. Phase 2 keeps sync as a local queue.
- Payments, ticket types, and refunds. That is Phase 4. Attendance counting should not wait on payment logic.
- Full staff authentication and per-user permissions. Still deferred. Check-in station identity (Slice 4) is about which station, not full user accounts.
- Per-attendee QR codes. The registration-level QR checks in the whole group in one scan, which is the intended first-event behavior. Per-attendee codes are only worth it if a real event needs split check-in.

Reasoning for holding the line:
Each non-goal is something that, if pulled into Phase 2, would delay proving the event-day loop. Phase 2 succeeds when a real event checks in smoothly and the attendance numbers are trusted. Everything above is deferred so that goal stays in focus.

## Recommended First Step

Start with Slice 1, Confirmation Delivery, because it is the true front door of the event-day workflow and everything else assumes it. Before writing code, settle the one open decision it depends on.

## Open Decisions

1. Email provider and from-address for confirmation delivery, and where its credentials live in environment config.
2. Whether a temporary public HTTPS tunnel is acceptable for on-device camera testing.
3. Whether offline scanner support is in Phase 2 scope or deferred to a later phase.
