# Calendrier Weekday Readings — Design

## Goal

Extend the calendrier feature (currently Sundays + fixed solemnities only) to
cover ferial (weekday) Mass readings, with CCC paragraph cross-references
generated automatically instead of hand-curated — using the archived Didache
concordance (`data-archive/concordance/`) as the source, since hand-curating
~261 weekdays × 2 first-reading cycles the way `CCC_Liturgy_List.txt` was
built for Sundays is not practical.

## Context

The Sunday/solemnity feature (already shipped) works like this: a curated
text file (`CCC_Liturgy_List.txt`) is parsed into `CalendrierYearFile`s (one
per A/B/C), joined against Romcal-computed calendar dates into
`dates-index.json` (one row per date, `corpus: 'year' | 'fixed'`), and AELF
supplies the actual reading text per feast (`scripts/fetch-aelf.ts`). The
frontend (`CalendrierPicker`, `PickedDateCard`, `FeastBlock`,
`resolveFeastForRow`) is already generic over `CalendrierDateRow` /
`CalendrierFeast` — it doesn't know or care how a feast's clusters were
produced.

This spec is decided groundwork from a design conversation that included a
real spike: AELF readings for several sample weekday dates were matched
against the concordance and hand-verified. Findings that drive the decisions
below:

- Gospel citations hit the concordance ~89% of the time; first readings
  ~40%; Psalms ~0% in the sample (the concordance's `psaumes/` folder only
  covers 14 of 150 chapters) — psalms are **kept** anyway per explicit
  instruction, they just resolve to nothing most days, same as any other
  reading whose chapter isn't covered.
- A naive "closest heading" label is wrong when a cited CCC range spans
  multiple sub-headings (verified case: CEC 1716-1729, the Beatitudes,
  spans three sub-headings — naive lookup would mislabel the whole range
  with only the first sub-heading's title). Fixed by variable-granularity
  lookup (see Clustering below).
- Even with correct labels, a day's citations are often genuinely scattered
  across unrelated parts of the Catechism (verified case: 2026-08-31's
  readings hit 8 different single-paragraph citations, 6 of them under
  distinct CCC articles) — there is no natural "3-4 clusters" outcome to
  force. The existing Sunday cap (observed range 3-7 clusters, e.g. Noël
  has 7) is the right budget to reuse, not a fixed low number.

## Data model

No new types for feasts/clusters — `CalendrierCluster` and `CalendrierFeast`
(`scripts/prepare/calendrier.ts`) are reused as-is; a weekday's clusters look
exactly like a Sunday's to every consumer.

**`CalendrierDateRow.corpus`** gains a third value, `'weekday'`:

```ts
export interface CalendrierDateRow {
	date: string;
	slug: string;
	corpus: 'year' | 'fixed' | 'weekday';
	yearKey?: 'a' | 'b' | 'c';
	cycle?: 'I' | 'II'; // present when corpus === 'weekday'
	liturgicalColor: LiturgicalColor;
}
```

**Weekday feast identity** is abstract, like Sunday `annee-a/b/c.json`, not
tied to a calendar date: `{season}-{weekOfSeason}-{dayOfWeek}` (e.g.
`ordinaire-22-lundi`), scoped further by `cycle: 'I' | 'II'` only for the
first reading/psalm pairing (the Gospel is single-cycle — both cycles'
`CalendrierFeast` entries for the same weekday share the same Gospel-derived
clusters when the underlying Gospel ref is identical, which is the common
case; no de-duplication is attempted beyond that, generating both files is
cheap).

New files, mirroring `annee-a.json`'s shape:

- `static/data/calendrier/feries-i.json` — `CalendrierYearFile`-shaped
  (`{key: 'I', feasts: CalendrierFeast[]}`), first-reading Year I.
- `static/data/calendrier/feries-ii.json` — Year II.

`dates-index.json` gains one row per weekday date across the existing
2000–2035 range (`DATE_RANGE_START_YEAR`/`DATE_RANGE_END_YEAR` in
`calendrierDates.ts`), resolved the same way Sunday rows are: Romcal
generates the full calendar (not just Sundays — `generateCalendar()` returns
every day), each weekday day's `season` + `weekOfSeason` + `dayOfWeek` +
`properCycle` picks the matching abstract slug + cycle.

**Consequence to flag explicitly (not a bug):** `CalendrierPicker` and
`resolveToday`/`resolvePickedDate` (`calendrierDateLookup.ts`) are already
fully generic over `index.rows` — once weekday rows exist, nearly every day
in the calendar widget becomes a matched/colored day instead of only
Sundays, and the existing Sunday-snap fallback in `resolveToday`/
`resolvePickedDate` (walking to `previousSunday`/`nextSunday` when no exact
row exists) becomes dead code for any date within covered seasons. This is
the intended outcome, not a regression — it's called out here so it isn't
mistaken for scope creep during review.

## Pipeline

Four new build-time modules under `scripts/prepare/`, run from
`prepareCalendrier()` after the existing Sunday step, in this order:

### 1. `weekdayFeasts.ts` — enumerate abstract weekday slugs

Calls Romcal's `generateCalendar()` once per year in range, walks every
`LiturgicalDay` that is a plain weekday (not a Sunday, not a solemnity/feast
already covered by the fixed/year corpus — Romcal's `precedence`/`rank`
tells us this the same way the existing fixed-feast matching already
distinguishes ranked celebrations), and collects the distinct
`{season, weekOfSeason, dayOfWeek, properCycle}` tuples with one
representative **past** calendar date each (same "one occurrence is enough,
the cycle repeats" reasoning `fetch-aelf.ts` already uses for Sundays).

### 2. `fetch-aelf.ts` extension — pull weekday reading refs

Extends the existing target list (currently Sunday/fixed feasts only) with
the weekday representative dates from step 1, reusing
`pickReadingDateCandidates`/`pickMesse` unchanged. Output merges into the
same `readings.json` shape, keyed by the abstract weekday slug (+ cycle
where relevant) via `readingsKey()`.

### 3. `concordanceRefParser.ts` — AELF ref string → structured range(s)

Hardens the throwaway spike parser into a real module. Must handle, at
minimum, every format observed in the spike:

- Plain: `Ep 1, 1-10`
- Double-digit book prefix + double space: `1 R  17, 1-6`
- Lettered verse boundaries: `Jn 3, 7b-15` (letter suffix ignored, treated
  as its numeric verse)
- Compound dot-separated ranges: `Mi 6, 1-4.6-8` (two disjoint ranges in one
  reading)
- Psalm dual-numbering refs: `Ps 118 (119), 97-98, 99-100` (use the first
  number — the concordance's `psaumes/` folder is keyed on the same
  Septuagint numbering AELF leads with; verify against a sample during
  implementation since only 14 chapters are covered and none were hit in
  the spike)

Book abbreviation resolution reuses `bookByAbbr` (`bibleBookSlug.ts`) rather
than a duplicated table — that module already maps every abbreviation AELF
uses (French liturgical abbreviations) to the same slug the concordance
folders are named after, confirmed identical for every abbreviation checked
in the spike (`1 R` → `1-rois`, `Mi` → `michee`, etc).

Output: `{ slug: string; chapter: number; ranges: [number, number][] } | null`.

### 4. `concordanceMatch.ts` + `cecHeadingCluster.ts` — the clustering itself

For a weekday's readings (lecture_1, psaume, evangile — `lecture_2` doesn't
occur on ferias):

1. Parse each `ref`. A ref that fails to parse, or whose chapter file
   doesn't exist under `data-archive/concordance/`, contributes nothing
   (not an error — expected for ~60% of first readings and ~90% of psalms
   per the spike).
2. For each parsed ref, load `data-archive/concordance/{slug}/{chapter}.json`
   and collect every `pericope` whose `[startVerse, endVerse]` overlaps any
   of the ref's ranges. Collect the union of `cccRanges` across all matched
   pericopes for the day (not deduplicated to single paragraphs yet — kept
   as `{from, to}` ranges, since range boundaries matter for step 2).
3. **Variable-granularity heading lookup**, per cited range (not per
   individual paragraph): build three flattened, sorted lookup levels from
   `static/data/cec/structure.json` — fine headings (`chapter.headings` /
   `article.headings`), article-level (`article.range`/first heading start),
   chapter-level (`chapter.range`). For a range `[from, to]`, walk fine →
   article → chapter and return the **first level whose single entry fully
   contains `[from, to]`** (verified in the spike: this correctly resolves
   CEC 1716-1729 to "Notre vocation à la béatitude" at the article level,
   rather than mislabeling it with the fine-level heading of paragraph 1716
   alone).
4. Group the day's cited ranges by their resolved heading title, merging
   each group's paragraph numbers into one `CalendrierCluster` (`theme` =
   the heading title, `refs` = the merged CEC range string in the same
   format `expandRefs`/Sunday clusters already use, `paragraphs` = sorted
   flat list).
5. Sort clusters by paragraph count descending, keep the top N. **N is not
   a fixed 4** — reuse whatever ceiling the Sunday data already tolerates
   (check `CCC_Liturgy_List.txt`'s max cluster count per feast at
   implementation time and match it, expected to land around 6-7).
   A weekday with zero clusters (fully uncovered readings) is valid output:
   an empty `clusters: []` array — `FeastBlock` already has to handle a
   feast with clusters; confirm it degrades sensibly with zero (spec note
   for implementation, not yet verified against the component).

## Wiring

- `prepareCalendrier()` calls the new pipeline after the existing
  Sunday/fixed-feast build, writing `feries-i.json` / `feries-ii.json` next
  to `annee-a.json` etc., and folding weekday rows into the same
  `buildCalendrierDates()` join that already produces `dates-index.json`.
- `src/lib/data/types.ts` mirrors the `CalendrierDateRow.corpus`/`cycle`
  addition (same mirror-type convention as every other calendrier type).
- `resolveFeastForRow` (`calendrierDateLookup.ts`) gains a
  `corpus === 'weekday'` branch loading `feries-i`/`feries-ii` by `cycle`
  (needs a `loadCalendrierFeries('I' | 'II')` loader alongside the existing
  `loadCalendrierYear`).
- No changes needed to `CalendrierPicker`, `PickedDateCard`, `TodayCard`, or
  `FeastBlock` — confirmed generic over `CalendrierDateRow`/`CalendrierFeast`
  already.

## Testing

- Unit tests for `concordanceRefParser.ts` covering every format listed
  above, including the compound-range and lettered-verse cases.
- Unit test for the variable-granularity heading lookup reproducing the
  verified Beatitudes case (range spanning multiple fine headings resolves
  to the containing article, not the first sub-heading).
- Unit test for the clustering cap/sort using a fixture with more raw
  citations than the cap, asserting the largest groups survive.
- Unit test for a weekday with zero concordance coverage producing
  `clusters: []` without erroring.
- One integration-style test building a known weekday end-to-end against a
  small fixture slice of `data-archive/concordance/` and `structure.json`,
  asserting the final `CalendrierCluster[]` shape.

## Explicitly out of scope

- Any change to the Sunday/fixed-feast pipeline or `CCC_Liturgy_List.txt`.
- Re-attempting the glossary-keyword-matching approach (rejected earlier in
  this design conversation as too fragile for this use case).
- Deduplicating identical Gospel-derived clusters between the Year I and
  Year II files for the same weekday — both files are generated
  independently; the duplication is cheap and correctness-safe.
