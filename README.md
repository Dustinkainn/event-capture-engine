# Event Capture Engine

Internal event registration, count tracking, check-in, and MinistryPlatform sync planning system.

## Purpose

Event Capture Engine is an in-house operations tool for creating events, collecting registrations, tracking exact operational counts, checking attendees in with QR codes, and preparing clean records for MinistryPlatform sync.

The app owns the event capture workflow. MinistryPlatform is the final sync destination, not the product identity.

## Planning Docs

- [Project goal](docs/project-goal.md)
- [Build roadmap](docs/build-roadmap.md)
- [Data model](docs/data-model.md)
- [MVP schema](docs/mvp-schema.md)
- [Count engine](docs/count-engine.md)
- [MinistryPlatform sync](docs/ministryplatform-sync.md)
- [False-negative risks](docs/false-negative-risks.md)
- [Screens](docs/screens.md)
- [MVP spec](docs/mvp-spec.md)
- [Phase 2 plan](docs/phase-2-plan.md)

## Preview

- [Preview home](wireframes/index.html)
- [Admin console preview](wireframes/admin.html)
- [Public registration preview](wireframes/public-registration.html)
- [Check-in scanner preview](wireframes/scanner.html)
- [Preview standards](wireframes/standards.md)

## Local App

Run the MVP app scaffold:

```txt
npm install
npm run dev
```

Then open:

```txt
http://localhost:3000
```

The static previews are also served by the app at:

```txt
http://localhost:3000/preview/index.html
```
