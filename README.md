# Event Capture Engine

Internal event registration, count tracking, check-in, and MinistryPlatform sync planning system.

## Purpose

Event Capture Engine is an in-house operations tool for creating events, collecting registrations, tracking exact operational counts, checking attendees in with QR codes, and preparing clean records for MinistryPlatform sync.

The app owns the event capture workflow. MinistryPlatform is the final sync destination, not the product identity.

## Planning Docs

- [Project goal](docs/project-goal.md)
- [Build roadmap](docs/build-roadmap.md)
- [Data model](docs/data-model.md)
- [Count engine](docs/count-engine.md)
- [MinistryPlatform sync](docs/ministryplatform-sync.md)
- [False-negative risks](docs/false-negative-risks.md)
- [Screens](docs/screens.md)
- [MVP spec](docs/mvp-spec.md)

## Public-Safe Rules

Do not commit real MinistryPlatform credentials, API URLs, tokens, private attendee data, member records, church exports, screenshots with personal information, or production secrets.

This repository should begin with documentation and architecture before production code so the event, registration, count, check-in, payment, and sync workflows stay cleanly separated.
