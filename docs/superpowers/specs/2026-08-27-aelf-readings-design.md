# AELF readings: data layer

Second sub-project of the liturgical-calendar arc (after the date picker + today
card). This covers only pulling the real Mass reading text from the AELF API and
storing it as build data — no UI. Displaying it is sub-project 3 (a "liturgique"
sub-tab under Renvois in the Study Panel).

## Context

The curated calendrier data (`scripts/data-sources/calendrier/CCC_Liturgy_List.txt`,
parsed by `scripts/prepare/calendrier.ts`) maps each Sunday/feast to CEC paragraph
clusters by theme. It has no connection to the actual Mass readings (first reading,
psalm, second reading on Sundays/solemnities, gospel) those liturgical days use.

[AELF](https://api.aelf.org/) (Association Épiscopale Liturgique pour les pays
Francophones) publishes a public JSON API at `https://api.aelf.org/v1/messes/{date}/{zone}`
that returns, for a real calendar date and a liturgical zone, the day's liturgical
metadata plus one or more `messes` (Mass options), each with a `lectures` array of
readings. Verified directly against the live API:

- `zone: 'romain'` is the correct zone for this project — the general Roman
  calendar, consistent with sub-project 1's choice to use core `romcal` without
  any locale plugin (CLAUDE.md: "don't worry about France specific data").
- A reading object carries `type` (`lecture_1`, `psaume`, `lecture_2`, `evangile`),
  `ref` (e.g. `"1 Co 1, 01-9"`), `titre` (not present on `psaume`, which instead has
  `refrain_psalmique`/`ref_refrain`), `intro_lue`, and `contenu` (HTML). Gospel
  entries additionally carry `verset_evangile`.
- A date's `messes` array usually has one entry, but some days have several —
  Christmas has four ("Messe de la veille au soir", "de la nuit", "de l'aurore",
  "du jour"). The curated data has only one entry for Noël ("La Solennité de
  Noël"), so a single Mass must be chosen when more than one exists.
- **AELF does not serve arbitrary future dates.** A query for 2034-01-06 returned
  404; a query for 2019-01-06 (Epiphany, année C) returned full real content. Any
  date used to query AELF must be in the past.

Because Sunday/solemnity readings are locked to the liturgical cycle (année A/B/C)
or the fixed calendar date, not to the specific civil year, a feast's readings only
need to be fetched once — using any past real date the sub-project-1 date-index
already maps to that feast — not once per year it recurs.

## Approach

A one-time, manually-run fetch script produces a checked-in JSON source file; the
normal prebuild reads that file like any other data source, with no network access
at build time. This matches the project's existing offline-build convention
(`CCC_Liturgy_List.txt` is checked in and parsed at every prebuild) and avoids
making every deploy depend on a third-party API's uptime or rate limits — the
rejected alternative (fetching live inside `prepare-data.ts`) would do exactly
that, for data that essentially never changes once fetched.

## 1. Fetch script

New script `scripts/fetch-aelf.ts`, run manually (not part of `prepare-data`,
not wired into any npm script that runs automatically).

For every slug in the already-built `static/data/calendrier/dates-index.json`
(covering both `corpus: 'year'` and `corpus: 'fixed'` rows), filter that slug's
rows to dates on or before today, and take the most recent one — the theory being
that AELF's own text/formatting conventions are most likely to be current there.
A slug with no past occurrence yet (possible right at the very start of the
2018-2035 range for a rare late-cycle feast) is a build-time failure, not a
silent skip.

Call `https://api.aelf.org/v1/messes/{date}/romain` for that date. From the
response's `messes` array:

- If there's exactly one entry, use its `lectures`.
- If there's more than one, prefer the entry whose `nom` is `"Messe du jour"`.
- If none matches that name, fall back to the first entry — logged as a warning
  naming the slug and the actual `nom` values seen, so a future reviewer can
  check whether the fallback picked something reasonable.

Write `scripts/data-sources/calendrier/readings.json`:

```json
{
  "vendredi-saint-la-passion-du-seigneur": {
    "date": "2024-03-29",
    "lectures": [
      { "type": "lecture_1", "ref": "Is 52, 13 - 53, 12", "titre": "...", "contenu": "..." },
      { "type": "psaume", "ref": "...", "refrain_psalmique": "...", "ref_refrain": "...", "contenu": "..." },
      { "type": "lecture_2", "ref": "...", "titre": "...", "contenu": "..." },
      { "type": "evangile", "ref": "...", "titre": "...", "contenu": "...", "verset_evangile": "..." }
    ]
  }
}
```

Build-time failure mode, matching sub-project 1's established convention: if any
curated feast slug has no past date to fetch from, or the AELF request for its
chosen date fails (non-200, malformed body), the script fails loudly at the end
with the complete list of unresolved slugs, rather than writing a partial file.
A partial `readings.json` silently missing a feast is worse than a failed script
run.

`scripts/data-sources/calendrier/readings.json` is committed to the repo, the
same way `CCC_Liturgy_List.txt` is — re-running the script is a deliberate,
manual, occasional action (e.g. if AELF's text for a reading is corrected
upstream), not something that happens on every build.

## 2. Types

Extend `scripts/prepare/calendrier.ts` and mirror in `src/lib/data/types.ts`:

```ts
export interface CalendrierReading {
	type: 'lecture_1' | 'psaume' | 'lecture_2' | 'evangile';
	ref: string;
	titre?: string;
	intro_lue?: string;
	contenu: string;
	refrain_psalmique?: string;
	ref_refrain?: string;
	verset_evangile?: string;
}

export interface CalendrierReadingsFile {
	[slug: string]: {
		date: string; // the past date AELF was queried with, for provenance
		lectures: CalendrierReading[];
	};
}
```

`informations` (liturgical color, season, week, cycle) from the AELF response is
**not** stored — sub-project 1 already computes that more precisely via `romcal`
for every real occurrence of a feast, not just the one past date used here. Only
`lectures` and the source `date` are kept.

## 3. Build-time merge

`prepareCalendrier()` (`scripts/prepare/calendrier.ts`) reads
`scripts/data-sources/calendrier/readings.json` — a plain checked-in JSON read,
no parsing logic needed since the fetch script already wrote it in the final
shape — and writes it straight through to
`static/data/calendrier/readings.json`, keyed by slug so the frontend can look up
a feast's readings independently of which année file it lives in (a fixed feast
and a numbered Sunday are looked up the same way).

If a slug present in the curated feast/fixed-feast data has no entry in
`readings.json` (the fetch script hasn't been run since a new feast was added to
`CCC_Liturgy_List.txt`), fail the prebuild loudly, naming the missing slug —
consistent with `liturgicalColor`'s existing throw-if-unresolved behavior in the
same function.

## 4. Testing

- Unit test the fetch script's pure logic (most-recent-past-date selection,
  "Messe du jour" preference, the fallback-with-warning path) against fixture
  `dates-index.json`/AELF-response data — no real network calls in the test
  suite.
- Unit test `prepareCalendrier()`'s merge step with a fixture `readings.json`,
  asserting the output file's shape and the loud failure when a slug is missing.
- No live-API test in the automated suite (AELF is a third-party service outside
  this project's control); the fetch script itself is the manual integration
  point, run and reviewed by a person when the curated feast list changes.
