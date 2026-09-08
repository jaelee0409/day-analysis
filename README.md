# Day Analysis

A personal time-tracking and day-analysis app. You divide the day into blocks,
record what you actually did, and read the day back as measurement.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm run typecheck
```

Next.js (App Router), TypeScript, Tailwind CSS v4, date-fns. No auth, no
database — everything lives in `localStorage` on the device.

Read [design.md](./design.md) before building a screen. It holds the design
judgment; `app/globals.css` holds the tokens; `npm run design:check` catches the
mechanical failures.

## Recording

- The day is split at its midpoint into two halves standing side by side, so a
  full 24 hours fits without a long scroll.
- **Click** any empty slot on the timeline, or **drag** down it to sweep a range.
- Today opens at the current time when it is below the fold. The page scrolls,
  not the timeline.
- **R** opens the recorder at the point your last block ended, so it fills the
  gap you actually left.
- In the recorder, **number keys pick a category** and **Enter** saves. A title
  is optional.
- **Click a block** to edit or delete it; **drag its top or bottom edge** to
  resize.

A new block always wins: anything it overlaps is trimmed, split, or removed, so
recording never stops to ask you to resolve a conflict.

## Structure

```
app/            Today, /history, /dashboard, /experiment, /settings
components/
  timeline/     Timeline, TimeGrid, TimeBlockItem, ActivityModal
  dashboard/    DailySummary, TimeDistribution, WeeklyChart, InsightCard
  ui/           AppShell and shared primitives
lib/
  storage.ts    The only module that touches localStorage
  time.ts       Clock, duration, and day-window arithmetic
  analytics.ts  Pure analysis: totals, focus sessions, observations
types/time.ts   Domain model
```

### Replacing localStorage

Every function in `lib/storage.ts` is `async` and returns plain domain objects.
Swapping the browser store for a Next.js API route over Postgres means
rewriting the bodies of that one module — no component, hook, or analysis
function changes.

`lib/analytics.ts` imports nothing from storage or React, so the same totals and
observations can be computed on a server once the data lives there.

## Renaming a category

Category ids are stored inside recorded blocks, so a rename has to bring the
existing data with it. Add a step to `MIGRATIONS` in `lib/storage.ts` rather
than editing the id in place — the list is keyed by schema version, runs once
per browser before the first read, and carries the rename through both the
blocks and the enabled-category list. Adding a category works the same way, so
people who already have settings are opted into it instead of silently missing
it.

## The day window

The timeline runs midnight to midnight by default, but a day does not have to.
With **Day starts at** set to 06:00, the window keyed `2026-09-08` runs from
06:00 that morning to 05:59 the next, so a late night stays attached to the day
it belongs to.

Blocks store a wall-clock `startTime`/`endTime` and the key of the window they
were recorded in, exactly as in the data model. One consequence worth knowing:
changing **Day starts at** later moves the window boundary under blocks that are
already recorded, so a block can land at the other end of its day. Change it
early, or expect to nudge a few blocks afterwards.

## Observations

Everything under *Where did your day go?* is arithmetic over recorded blocks —
percentages, durations, and the longest unbroken run of productive time. No
model is called and nothing is inferred; if a number is not in your blocks, the
app does not say it.

## The experiment

`/experiment` runs 15, 30, and 60-minute blocks and records whether you carried
each one to the end. Focus rate is the share finished without you calling an
interruption. `ExperimentSession` carries the outcome as a field rather than a
boolean, so richer scoring can land later without a migration.
