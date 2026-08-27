# Calendrier liturgique: date picker + today card

First sub-project of a larger liturgical-calendar arc (this picker, then AELF
reading text, then a Renvois sub-tab in the Study Panel, then a liturgical
concordance). This spec covers only the picker on `/calendrier`.

## Context

`/calendrier`'s data (`static/data/calendrier/*.json`, produced by
`scripts/prepare/calendrier.ts` from `scripts/data-sources/calendrier/CCC_Liturgy_List.txt`)
is a curated list of **Sundays and major feasts only**, grouped by liturgical
year A/B/C plus a separate fixed-solemnities list. It has:

- No entries for ordinary ferial weekdays.
- No real calendar dates for movable feasts — a Sunday is stored as a slug
  derived from its French title (`2e-dimanche-de-lavent`), with a `season` tag,
  but no year and no day/month. Only the `fixed_feasts` list (solemnities with
  a fixed civil date, e.g. Assumption) carries `date` / `month_index`.
- No mapping from "cycle year" back to a real civil year — the three year
  cards are just three static browse destinations today, not resolved from
  any date.

The user wants two additions to the `/calendrier` landing page:

1. A date picker: pick a real calendar date, land on the matching feast page.
2. A "today" card: same resolution, automatic, for right now.

Scope is fixed to what the existing dataset supports: **Sundays and feasts
already in `CCC_Liturgy_List.txt`.** Ferial weekdays are out of scope here —
they'll become relevant once AELF readings (step 2 of the larger arc) give us
content for every day, not just Sundays.

## Approach

Compute liturgical calendar structure at **build time** with `romcal`
(devDependency only, never shipped to the client), and emit a static date
index the frontend can look up directly. Rejected alternatives: hand-rolled
Easter/season arithmetic shipped client-side (reinvents romcal's correct
handling of Ordinary Time week-skipping and solemnity-over-Sunday precedence,
with real risk of subtle bugs), and extracting romcal's algorithm into a
maintained fork (avoids a precomputed-range cap, but creates an ongoing
maintenance burden for a benefit — unbounded date range — this project
doesn't need).

## 1. Build-time date index

New module `scripts/prepare/calendrierDates.ts`, invoked from
`prepareCalendrier()` in `scripts/prepare/calendrier.ts` after the existing
feast parsing.

For each civil year in a fixed practical range (2018–2035 — comfortably
covers any real use of a catechism site's calendar picker), run `romcal` to
get the full liturgical calendar for that year. For each resolved day that is
a Sunday or a solemnity, derive a **structural key**: `{ season, weekOfSeason,
dayKind: 'sunday' | 'solemnity', sundayCycle?: 'a'|'b'|'c' }`.

Build the same structural key from the **existing feast titles** already
parsed in `calendrier.ts` (season is already tagged; week ordinal is parsed
from the French title text, e.g. `/^(\d+)e dimanche/i` on
`"2e dimanche de l'Avent"` → `{ season: 'avent', weekOfSeason: 2 }`). This key
derivation is a pure function, unit-tested against the full existing feast
list to confirm every non-fixed feast produces a key (any title that fails to
parse is a bug to fix, not a silent drop).

Join: for every romcal-resolved date in range, look up its structural key
against the feast-title-derived keys. A match emits one row:
`{ date: 'YYYY-MM-DD', slug, corpus: 'year' | 'fixed', yearKey?: 'a'|'b'|'c' }`.
Fixed solemnities join on `month_index` + `date` directly (already unambiguous)
rather than through the structural key. A romcal date with no matching slug
(this will be most ferial weekdays, correctly) produces no row — the index
only contains dates the site can actually show something for.

Write `static/data/calendrier/dates-index.json`: an array of the rows above,
sorted by date. Also record `{ rangeStart, rangeEnd }` (the covered civil
years) in the same file so the frontend can distinguish "out of range" from
"in range but no match."

Build-time failure mode: if any existing feast's title fails to parse into a
structural key, or a key has zero romcal matches across the whole range (e.g.
a title-parsing regex silently wrong), fail the prebuild loudly rather than
emit a partial index — a silently-missing Sunday is worse than a build break.

## 2. Types

Extend `scripts/prepare/calendrier.ts`'s exported types and
`src/lib/data/types.ts`'s `Calendrier*` mirror with:

```ts
export interface CalendrierDateRow {
	date: string; // ISO yyyy-mm-dd
	slug: string;
	corpus: 'year' | 'fixed';
	yearKey?: 'a' | 'b' | 'c'; // present when corpus === 'year'
}
export interface CalendrierDatesIndexFile {
	rangeStart: string;
	rangeEnd: string;
	rows: CalendrierDateRow[];
}
```

## 3. Data loading

Add `loadCalendrierDatesIndex()` to `src/lib/data/loaders.ts`, following the
existing `loadCalendrierIndex` pattern (fetch + module-scope cache).
`/calendrier/+page.ts` adds it to the existing `Promise` alongside
`loadCalendrierIndex`.

## 4. UI: `/calendrier` landing page

Above the existing 3 year-cards, add a new block with two elements:

**Today card.** On mount, compute today's ISO date client-side
(`new Date()`), look it up in the loaded index. Three states:
- Match found → card shows the feast title and a direct link to
  `/calendrier/{yearKey}#f-{slug}` (or `/calendrier/solennites#f-{slug}` for
  `corpus: 'fixed'`).
- No match (today is a ferial weekday, the common case) → card shows a quiet
  "Pas de dimanche ni de grande fête aujourd'hui" with no link.
- Today falls outside `[rangeStart, rangeEnd]` → same quiet state (this
  should never actually happen given the range covers the current date by
  construction, but the check exists for the same reason build-time failures
  are loud: no silent wrong answer).

**Date picker.** A native `<input type="date">` plus a submit action (button
or Enter). On submit: snap the picked date forward to that week's Sunday
(picked date's weekday distance to the next Sunday, 0 if already Sunday),
look up the index:
- Match → navigate to the feast anchor, same as the today card.
- No match within range → inline message: "Aucun dimanche ou grande fête du
  Catéchisme ne correspond à cette date." (a solemnity that isn't a Sunday,
  e.g. Assumption on a Wednesday, is looked up by the exact picked date first,
  before the Sunday-snap, so fixed solemnities remain reachable even when
  picked on their exact weekday).
- Outside `[rangeStart, rangeEnd]` → inline message noting the covered range.

The existing 3 year-cards and the solennités card are unchanged — they
remain the browse-by-cycle entry point.

## 5. Testing

- Unit test the structural-key parser against every title currently in
  `CCC_Liturgy_List.txt` (via the already-parsed feast list) — confirms 100%
  parse coverage, not a sample.
- Unit test the build/join step with a small fixture (a handful of romcal
  years) asserting known fixed points: Easter Sunday's row has
  `season: 'pascal'`, Christ the King's row is present, a known Année-A/B/C
  civil year produces the expected `yearKey`.
- Component test (or manual + Playwright) for the picker: picking a
  known Sunday resolves and navigates; picking a Tuesday snaps to that week's
  Sunday; picking a date with no match shows the inline message.
- Today card: since "today" is nondeterministic in CI, test the lookup
  function directly (given a fixed date, assert card state) rather than the
  live component.
