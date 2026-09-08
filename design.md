# design.md

How to build a page in Day Analysis so it belongs to the same product as every
other page. Read this before adding a screen, a panel, or a chart.

This file carries the judgment. Two other things carry the mechanics:

- **`app/globals.css`** — the bounded token set and the handful of component
  classes. If a value is not in there, think twice before inventing it.
- **`npm run design:check`** — deterministic checks for the failures that are
  mechanical rather than tasteful. Run it before you call a page done.

---

## 1. What this product is

A personal time-tracking and analysis tool. One person, their own day, no team
and no audience. The reader is looking at evidence about themselves, and the
honest answer is often unflattering — hours unaccounted for, a focus session
shorter than remembered. The design's job is to make that legible without
either scolding or congratulating.

It is not a calendar, a task manager, or a SaaS dashboard. Almost everything
here is a record of what already happened.

The single exception is the **To do** panel on Today: a short list of
reminders, because the person looking at their day is the same person who
needs to remember one or two things. It earns its place only by staying tiny —
text, done, gone. It is a quiet card, never the lead panel, and it never grows
due dates, priorities, projects, or a page of its own. The moment it does, this
becomes a task manager and the rest of the design stops making sense.

## 2. The governing metaphor: a measuring instrument

The timeline is a **ruler**. This is the one idea the whole visual system hangs
from, and it decides most questions before you have to.

- **Tick weight carries information.** An hour gets a full rule across the track
  and a solid label. A sub-interval gets a short tick in the gutter and a
  whisper of a line. Never give two different time granularities the same
  visual weight.
- **Everything is drawn to true scale.** A two-hour block is exactly twice the
  height of a one-hour block. Never round a mark to make a layout tidier — the
  proportion *is* the content.
- **Gaps are data.** Unrecorded time is not empty space to be filled with
  decoration. It is the answer to the question the app asks.

When you need a new visual device, ask what the instrument equivalent is. The
day-strip in `DailySummary`, the mini-strip in the History list, and the quarter
marks on the experiment progress bar are all the same idea at different sizes.

The Rhythm scatter follows the same rule from the other direction: every row
shares one fixed ±3h scale, because an axis that stretched to fit each measure
would draw a steady habit and a chaotic one identically. A gauge whose scale
moves is not a gauge.

## 3. Color

The palette is cool paper and graphite ink. Tokens live in `@theme` in
`globals.css`: `paper`, `surface`, `ink`, `ink-soft`, `muted`, `faint`, `line`,
`hairline`, `signal`.

Three rules, in priority order:

1. **`signal` (the red) is reserved for the current time and nothing else.** It
   marks the one thing on screen that is actually happening. The moment it also
   means "delete" or "error" or "important", it stops meaning "now". The delete
   button borrows its text color only because destruction is the one other place
   the eye must not slide past; do not extend the exception further.
2. **Chrome is monochrome.** Buttons, nav, panels, borders, and every piece of
   structure use the ink/graphite scale. A primary button is ink-black, not
   colored.
3. **Category hues appear only inside data marks** — block spines and grounds,
   chart bars, legend dots. They come from `CATEGORIES` in `lib/categories.ts`,
   are held at matched saturation so no category shouts over another, and are
   never used for UI state.

**The two halves of the day are the one exception**, and a narrow one. The
early half sits on `track-early` and the late half on `track-late`: the same
lightness at opposite temperature, so which half you are reading registers
before you reach the labels. They are light quality, not colour, and nothing
else in the chrome may borrow them.

Do not introduce a new hue beyond that. If something needs emphasis, use
weight, size, or space.

## 4. Typography

Two faces from one superfamily, loaded in `app/layout.tsx`:

- **Instrument Sans** — every number, label, control, and paragraph. Figures are
  tabular everywhere (`.tnum`, or `tabular-nums`) because every number in this
  app is read as a measurement and columns of them must line up.
- **Instrument Serif** — used **only** where the app asks the reader a question:
  *How did you spend your day?*, *Where did your day go?*, *Which block size
  actually holds you?* One serif line per page, at the top of the thing it
  introduces. It is the app's voice in a room full of numbers, and it stops
  working the moment it decorates anything else.

Use `.figure` for large numerals (tabular, tight tracking, tight leading) and
`.ask` for the serif question. Hierarchy comes from scale and weight, not from
color or rules.

## 5. Composition

**Lead with the measurement, label it underneath.** The `Stat` primitive is the
canonical form: a large figure, a small lowercase label below it. Never a label
above a number.

**Panels are quiet, except one.** A `Card` is a white ground, a hairline
border, a 14px radius, no shadow. Shadow is reserved for things that float
above the page — modals, and a block on hover.

**Exactly one panel per page is filled ink** (`<Card tone="lead">`): the page's
headline reading — the day's tracked total on Today and History, the period
overview on the Dashboard. This is where the page spends its boldness, and it
costs nothing from the palette because ink is already the primary token. A
second filled panel on the same page destroys the hierarchy the first one
creates. Everything else stays a quiet white card.

**Page shape.** A page opens with a small muted date or context line, then the
serif question, then the work. Long-running content (the timeline) takes the
main column; the reading of it (totals, breakdown, observations) sits in a
sticky rail so it travels with you.

**The day fits in two halves.** The timeline is cut at its midpoint and the
halves stand side by side (`COLUMN_SPAN` in `components/timeline/metrics.ts`),
so 24 hours reads at a glance. The split is a *drawing* decision only: a block
crossing the seam is drawn twice but still reports its real start, end, and
duration. Never let a layout convenience change a reported number.

**Motion answers an action.** The modal has one entrance. Bars ease to their
width when data changes. There are no scroll-triggered reveals and no hover
animations beyond a background shift. `prefers-reduced-motion` is respected
globally in `globals.css`.

## 6. Copy

The interface speaks plainly and in sentence case.

- **Name the measurement, not the mechanism.** "unaccounted", not "untracked
  delta". "focused work", not "productive category aggregate".
- **State the number, then what it means.** *"87% of the day so far is accounted
  for."* No adverbs, no encouragement, no judgment about whether that is good.
- **Buttons say what happens.** "Record time", "Save changes", "Delete". The
  verb survives into the result.
- **Empty states invite an action or say nothing at all.** If there is no data,
  either give one concrete instruction ("Click any empty slot on the timeline to
  record your first block") or omit the panel entirely. Never show a heading
  with an apology under it.
- **Observations are arithmetic.** Every sentence in an insight is computed from
  recorded blocks in `lib/analytics.ts`. Nothing is inferred, estimated, or
  generated by a model. If a number is not in the blocks, the app does not say
  it.

## 6a. Icons

Categories are drawn as line glyphs in `components/ui/CategoryIcon.tsx`: one
16px viewBox, one 1.4 stroke weight, `currentColor`, no fills.

**Never use emoji.** They arrive at whatever weight, palette and metrics the
operating system chooses, which makes them the loudest and least consistent
marks on a page built to keep every category equal. A line glyph inherits the
colour of what it sits in, so a category hue reaches it only inside a data
mark — and it goes grey when the category is switched off.

## 6b. Two languages

Every word lives in `lib/i18n.ts`, keyed and paired. `npm run i18n:check`
fails on a missing key, an empty translation, or a {placeholder} present in one
language and not the other — the failures that show a Korean reader an English
fragment without anything crashing.

**Never assemble a sentence from fragments in component code.** Korean puts its
particles and verbs where English does not, so a sentence spliced together in
JSX can only ever be right in one language. One sentence is one entry, with
placeholders the caller fills. The same rule sends every number through
`lib/time.ts`, so "3h 25m" and "3시간 25분" come from one code path.

Instrument Serif carries no Hangul, so a Korean question would be set half in a
serif and half in a sans. Korean editorial type marks emphasis by weight rather
than by serif, so `:lang(ko) .ask` moves the whole line to the Korean face and
gains weight instead. The voice survives; the mismatched pairing does not.

## 7. Anti-patterns

These are the failures this design keeps producing when nobody is watching.
Recognize them and stop.

- **Emoji as icons.** See above; `design:check` fails on them.
- **Rainbow chrome.** Coloring a button, a tab, or a border with a category hue.
  Category color means "this kind of time", nothing else.
- **Two filled panels on one page.** The lead panel only leads if it is alone.
- **Red creep.** Using `signal` for a badge, a hover, a heading, or anything not
  named "now".
- **Serif drift.** Setting a panel title, a stat, or a marketing line in
  Instrument Serif. It is for questions.
- **All-caps eyebrows.** A tracked-out uppercase label above a heading. Panels
  get a plain sentence-case title, nothing above it.
- **Uniform cards.** Chopping unrelated content into identical rounded boxes
  with the same shadow, so hierarchy disappears.
- **Meta strings joined with middle dots** (`A · B · C`) and **arrows appended
  to link text** (`Learn more →`). Both are decoration pretending to be
  structure.
- **Numbered markers** (01 / 02 / 03) on content that is not a sequence.
- **Nested scrollbars.** The page scrolls, vertically, and nothing inside it
  does. The only internal scrolling anywhere is horizontal — the nav and the
  History day strip. A rail that does not fit is a rail with too much in it,
  not a rail that needs its own scrollbar.
- **Decorative gradients** and **tinted near-blacks** (`#0B0B0B`, `#111`) standing
  in for the ink token.
- **Rounded numbers for tidier layout.** If a bar is 3px wide because the value
  is small, that is the honest answer.

## 8. Checklist before shipping a page

- [ ] One serif question, at the top, and nothing else in serif.
- [ ] At most one `tone="lead"` panel.
- [ ] Icons are `CategoryIcon`, never emoji.
- [ ] No category hue outside a data mark; no `signal` outside the now line.
- [ ] Every figure is tabular and leads its label.
- [ ] The page scrolls; no new nested scroll region.
- [ ] Empty state gives an instruction or is absent.
- [ ] Numbers trace back to `lib/analytics.ts` over real blocks.
- [ ] Nothing new plans the future; To do is the only exception.
- [ ] Keyboard focus is visible, and motion is behind `prefers-reduced-motion`.
- [ ] `npm run design:check` and `npm run i18n:check` pass.
