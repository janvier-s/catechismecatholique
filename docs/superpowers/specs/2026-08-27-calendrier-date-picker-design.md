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

Because the join already resolves each **individual feast slug** to its own
specific romcal day (not a season bucket), romcal's own computed liturgical
color for that day comes along for free and is precise per feast: Good Friday
resolves red, Gaudete/Laetare Sundays resolve rose distinctly from the other
purple Advent/Lent Sundays, Easter resolves white/gold. Carry romcal's `color`
straight onto the matched feast the first time a slug is joined (color is a
property of the liturgical day identity, not the civil year, so one match is
enough — it doesn't need to live in the date-range rows at all). Where romcal
reports more than one valid color for a day (e.g. white-or-gold), take its
primary/default. This lands on the feast record itself, in the main
`annee-{a,b,c}.json` / `index.json` output, not only in the date index.

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
export type LiturgicalColor = 'violet' | 'white' | 'red' | 'green' | 'rose';

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

`CalendrierFeast` and `CalendrierFixedFeast` (both `calendrier.ts` and the
`types.ts` mirror) each gain `liturgicalColor: LiturgicalColor`, populated
during the join described in section 1. `gold` from romcal maps onto `white`
here (the same rank, solemn/festive) since the accent only needs the five
practical buckets above.

## 3. Data loading

Add `loadCalendrierDatesIndex()` to `src/lib/data/loaders.ts`, following the
existing `loadCalendrierIndex` pattern (fetch + module-scope cache).
`/calendrier/+page.ts` adds it to the existing `Promise` alongside
`loadCalendrierIndex`.

## 4. Shared component: extract `FeastBlock`

`CalendrierReader.svelte`'s `feastBlock` snippet (title, expand/collapse
clusters, on-demand paragraph fetch via `loadParagraph`, "Tout ouvrir/fermer")
is exactly what the today card needs to render inline. Rather than duplicate
that logic, extract it into `src/lib/components/calendrier/FeastBlock.svelte`
taking a single `feast: CalendrierFeast | CalendrierFixedFeast` prop (plus the
existing `showDates` flag). `CalendrierReader` renders it in a loop, unchanged
behavior. The today card renders one instance directly. This is a refactor of
existing code the today card needs to touch anyway, not scope creep.

## 5. UI: `/calendrier` landing page

Above the existing 3 year-cards, add a new two-column block (stacks to one
column under the existing 760px breakpoint): a today card and a date-picker
card, both styled as siblings of `.year-card`/`.fixed-card` (same border,
6px radius, `--font-ui`/`--font-heading` tokens, hover transitions) so they
read as part of the same family rather than a bolted-on widget.

**Today card.** On mount, compute today's ISO date client-side, look it up
in the loaded index.
- Match → render `FeastBlock` inline for that feast, under a kicker
  "Aujourd'hui" and the formatted date.
- No match (today is a ferial weekday, the common case) → walk back to the
  most recent Sunday (`today.getDate() - today.getDay()`, in local time) and
  look *that* up instead. Render its `FeastBlock` under a kicker "Dimanche
  dernier" plus its date, so it reads clearly as "here's the last Sunday's
  content," not as if it were today's. This is the fallback the user asked
  for: a weekday should show the previous Sunday's readings rather than an
  empty card.
- Previous Sunday also has no match (only possible right at the start of the
  precomputed range) → quiet "Pas de dimanche récent à afficher."

**Date picker.** A card with a label ("Chercher une date"), a native
`<input type="date">` restyled to the theme (border, radius, focus ring in
`--color-accent`, no browser-default chrome look), and a submit button using
the codebase's existing accent-button styling. On submit: look up the exact
picked date first (covers fixed solemnities on their real weekday), then fall
back to snapping forward to that week's Sunday. Result states:
- Match → render `FeastBlock` inline in the same card, replacing the form
  (with a small "Chercher une autre date" reset), rather than navigating away
  — consistent with the today card now showing data in place instead of only
  a link.
- No match within range → inline message: "Aucun dimanche ou grande fête du
  Catéchisme ne correspond à cette date."
- Outside `[rangeStart, rangeEnd]` → inline message noting the covered range.

The existing 3 year-cards and the solennités card are unchanged — they
remain the browse-by-cycle entry point.

## 6. Visual design: liturgical color

Use the real thing: `feast.liturgicalColor` (section 2), sourced from romcal
per individual feast rather than approximated from the coarse `season`
grouping. Because the join is per-slug, this is accurate at the level that
matters — Good Friday is red, Gaudete/Laetare Sundays are rose while the
rest of Advent/Lent stays violet, Easter and Christmas resolve white.

A small `LITURGICAL_COLOR_HEX` map (5 entries, one per `LiturgicalColor`)
renders as a 4px left border on the today/picker-result card. Practical
values: violet `#5b3a86`, white `#c9a227` (gold-leaning, since a literal
white border reads as "no accent" against a light background), red
`#a4302d`, green `#3f6b4a`, rose `#c98a9c`. These sit alongside the existing
`--color-*` design tokens as a small fixed constant local to the calendrier
components — they represent real vestment colors, not the page's own accent
palette, so they intentionally don't route through `--color-accent`.

## 7. Testing

- Unit test the structural-key parser against every title currently in
  `CCC_Liturgy_List.txt` (via the already-parsed feast list) — confirms 100%
  parse coverage, not a sample.
- Unit test the build/join step with a small fixture (a handful of romcal
  years) asserting known fixed points: Easter Sunday's row has
  `season: 'pascal'`, Christ the King's row is present, a known Année-A/B/C
  civil year produces the expected `yearKey`.
- Unit test `liturgicalColor` specifically on the feasts where getting it
  wrong would be most visible: Good Friday → `red`, a Gaudete or Laetare
  Sunday → `rose` (distinct from the neighboring Advent/Lent Sundays →
  `violet`), Easter Sunday → `white`, a Sunday in Ordinary Time → `green`.
- Unit test the previous-Sunday fallback function directly: a fixed weekday
  date resolves to the correct prior Sunday's row; a fixed Sunday date
  resolves to itself.
- Component test (or manual + Playwright) for the picker: picking a
  known Sunday resolves and renders `FeastBlock` inline; picking a Tuesday
  snaps to that week's Sunday; picking a date with no match shows the inline
  message; a fixed solemnity picked on its exact weekday resolves before any
  Sunday-snapping is applied.
- Today card: since "today" is nondeterministic in CI, test the lookup +
  fallback function directly (given a fixed date, assert resolved feast)
  rather than the live component.
- `FeastBlock` extraction: existing `CalendrierReader` behavior (expand,
  "Tout ouvrir/fermer", paragraph fetch) must keep working unchanged —
  covered by whatever existing tests exercise `/calendrier/[annee]` today,
  extended if that page has no test coverage yet.
