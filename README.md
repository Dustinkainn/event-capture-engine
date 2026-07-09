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
- [Session recaps](docs/) (dated end-of-session summaries)

## Local App

Run the app:

```txt
npm install
npm run dev
```

Then open:

```txt
http://localhost:3000
```

> The original static wireframes under `wireframes/` and `public/preview/` were design references for the pre-build phase. The app has moved past them and no longer links to them.
