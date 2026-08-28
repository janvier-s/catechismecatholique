# Calendrier readings display

Third sub-project of the liturgical-calendar arc (after the date picker + today
card, and the AELF readings data layer). The data layer fetched real Mass
reading text and stored it as build data with no UI. This covers displaying
it, so a reader looking at any curated feast can see what was actually
proclaimed at Mass that day, not just guess from the date and the CEC
paragraphs listed under it.

## Context

`static/data/calendrier/readings.json` already exists: a single JSON file,
1.4MB, keyed by `readingsKey(slug, yearKey?)` (`"a:premier-dimanche-de-lavent"`
for a year-scoped Sunday, or a bare slug for a fixed-date solemnity), each
entry `{ date: string, lectures: CalendrierReading[] }`. 182 of the 190
curated feasts have an entry; 8 are permanently or temporarily unresolvable
(`KNOWN_AELF_GAPS` in `scripts/aelf/knownGaps.ts` — calendar-transfer
collisions with Epiphany or Corpus Christi) and have no entry at all.

Every curated feast is rendered by the shared `FeastBlock.svelte` component,
used in three contexts:

- `TodayCard.svelte` / `DatePickerCard.svelte` on the `/calendrier` landing
  page — one feast at a time.
- `CalendrierReader.svelte`, rendering every feast in a year (60+ per
  `/calendrier/{a,b,c}`) or every fixed solemnity (`/calendrier/solennites`)
  on a single page.

`FeastBlock` already lazy-fetches CEC paragraph text per cluster on expand
(`loadParagraph(n)` → `/data/cec/paragraphs/{n}.json`), rather than loading
every paragraph a feast references up front. This is the precedent the
readings feature follows.

## Approach: split into per-feast files, lazy-fetched on expand

Rejected alternative: keep the single 1.4MB `readings.json` and load it once,
cached, like `loadCalendrierIndex`. Simpler to build, but every page that
touches even one feast (the today-card, in particular) would pull the entire
file, and it only grows as more feasts are curated. Splitting matches the
paragraph-fetch precedent already in this exact component and keeps every
context's payload proportional to what it actually shows.

### Filename scheme

`readingsKey()` produces keys containing a colon (`"a:slug"`) for year-scoped
feasts. A colon is an awkward URL/filename character, so a second, trivial
helper maps a key to a filename by replacing `:` with `--`:

```ts
export function readingsFilename(key: string): string {
	return key.replace(':', '--');
}
```

This is mirrored on both sides of the build/runtime boundary, the same way
`CalendrierReading`/`CalendrierReadingsFile` are already mirrored between
`scripts/prepare/calendrier.ts` and `src/lib/data/types.ts` — comment on each
copy pointing at the other.

Output path: `static/data/calendrier/readings/{filename}.json`, content
`{ date, lectures }` (the existing per-key value shape, unchanged).

## 1. Build layer

**File:** `scripts/prepare/calendrier.ts`

Replace the single `writeFileSync(join(outDir, 'readings.json'), ...)` call
(added by the AELF readings data-layer plan) with one write per entry of the
already-computed `readings` object (the output of `mergeReadings`):

```ts
const readingsDir = join(outDir, 'readings');
mkdirSync(readingsDir, { recursive: true });
for (const [key, entry] of Object.entries(readings)) {
	writeFileSync(join(readingsDir, `${readingsFilename(key)}.json`), JSON.stringify(entry));
}
```

No change to `mergeReadings` itself (`scripts/prepare/calendrierReadingsMerge.ts`)
— it still validates coverage and returns the full keyed object; only what
happens with that object at write time changes. The flat `readings.json`
file is removed (no consumer left once the loader below ships).

## 2. Frontend loader

**File:** `src/lib/data/loaders.ts`

```ts
const calendrierReadingCache = new Map<string, Promise<CalendrierReadingsEntry | null>>();

export function loadCalendrierReading(
	slug: string,
	yearKey?: CalendrierYearKey,
	fetcher: Fetch = fetch
): Promise<CalendrierReadingsEntry | null> {
	const key = readingsKey(slug, yearKey);
	let p = calendrierReadingCache.get(key);
	if (!p) {
		p = fetcher(`/data/calendrier/readings/${readingsFilename(key)}.json`).then((res) => {
			if (res.status === 404) return null;
			if (!res.ok) throw new Error(`calendrier: failed to load reading for "${key}"`);
			return res.json();
		});
		calendrierReadingCache.set(key, p);
	}
	return p;
}
```

`readingsKey`/`readingsFilename` are mirrored into a new
`src/lib/data/calendrierReadingsKey.ts` (frontend has no access to the
`scripts/` directory's `.ts` files, same reason the `CalendrierReading` type
is already duplicated rather than imported), each function carrying a
comment pointing at its `scripts/prepare/calendrier.ts` counterpart.
`CalendrierReadingsEntry` is the existing per-key value shape (`{ date,
lectures }`), split out as its own named type in `src/lib/data/types.ts` from
the current `CalendrierReadingsFile = Record<string, { date, lectures }>`
definition so the loader has something concrete to return.

A `null` result means "no reading for this feast" (one of the 8 known gaps)
and is a normal, expected value, not an error — the fetch layer treats a 404
as data, not a failure, so `FeastBlock` never needs to know the gap list
exists.

## 3. Component changes

**File:** `src/lib/components/calendrier/FeastBlock.svelte`

- New prop: `yearKey?: CalendrierYearKey` (undefined for fixed feasts).
- New local state: `readingsExpanded: boolean`, `readingsState: 'idle' |
  'loading' | CalendrierReadingsEntry | 'unavailable'`.
- New section, rendered above `<ul class="clusters">`, visually consistent
  with a cluster's expand/collapse header (reuses the caret + button
  pattern already styled in this file):

  ```
  ▸ Lectures du jour
  ```

  Collapsed by default. On click: fetch via `loadCalendrierReading(feast.slug,
  yearKey)`; while pending show a "Chargement…" line (matching the existing
  cluster loading state); on `null` show "Lectures indisponibles pour cette
  fête." (muted, italic, matching `.status`/`.loading` styling already in
  this file); on success render each reading in the array's given order
  (AELF's own order: `lecture_1`, `psaume`, `lecture_2`, `evangile` — some
  feasts omit `lecture_2`).

- Per-reading rendering. The curated feast set actually uses six of
  `CalendrierReading['type']`'s values (checked directly against
  `static/data/calendrier/readings.json`): `lecture_1`, `lecture_2`,
  `psaume`, `cantique`, `sequence`, `evangile` — not the full AELF enum
  (`lecture_3`..`lecture_7`, `epitre`, `entree_messianique` never occur in
  this project's Sunday/solemnity-only data, so the label map below only
  needs to cover the six that do).
  - Label from `type`, via a small French map: `lecture_1` → "Première
    lecture", `lecture_2` → "Deuxième lecture", `psaume` → "Psaume",
    `cantique` → "Cantique", `sequence` → "Séquence", `evangile` →
    "Évangile".
  - `ref` shown next to the label (e.g. "Is 2, 1-5"), same visual role as
    `cluster-refs` today (accent-colored, tabular numerals).
  - `intro_lue`, if present, as a small line under the label (AELF's own
    spoken introduction, e.g. "Évangile de Jésus Christ selon saint
    Matthieu") — shown in preference to `titre` when both are present,
    since it's the line actually proclaimed aloud; fall back to `titre`
    (AELF's editorial theme label) when `intro_lue` is absent.
  - For `psaume`: `refrain_psalmique` rendered first (it's the sung
    response, HTML), then `contenu`.
  - For `evangile`: `verset_evangile`, if present, rendered first as a short
    acclamation line (its `ref_verset` shown alongside, the same way `ref`
    labels every other reading), then `contenu`.
  - `contenu` (and `refrain_psalmique`, `verset_evangile`) are AELF HTML,
    rendered with `{@html}` (same `stripNotes`-free treatment — AELF markup
    doesn't carry the CEC's footnote `<sup>` tags, so no stripping needed)
    inside a `reader-prose` container so the global font-size/line-height
    prefs apply, per this project's convention for reader content.

**File:** `src/lib/components/calendrier/CalendrierReader.svelte`

- New optional prop `yearKey?: CalendrierYearKey`, passed straight through
  to every `<FeastBlock {feast} {showDates} {yearKey} />`.

**File:** `src/routes/calendrier/[annee]/+page.svelte`

- Passes `yearKey={data.yearKey}` (already computed in `+page.ts` for `mode:
  'year'`; `undefined` for `mode: 'fixed'`, which is correct — fixed feasts
  don't carry a yearKey).

**Files:** `src/lib/components/calendrier/TodayCard.svelte`,
`DatePickerCard.svelte`

- Pass `yearKey={resolved.row.yearKey}` to `<FeastBlock>` (`CalendrierDateRow`
  already carries an optional `yearKey` field).

## 4. Error handling

- **Known gap (404):** resolves to `null`, rendered as a muted note, not an
  error — covered above.
- **Genuine fetch failure** (network error, non-404 non-200): the loader
  throws; `FeastBlock` catches it in the same place it already catches
  `fetchParagraphs` failures and falls back to an empty/error display rather
  than crashing the whole feast block. Matches the existing
  `paragraphs.set(i, [])` catch-and-degrade pattern in this file.
- **Build-time:** unchanged — `mergeReadings` still throws loudly, naming the
  feast, if a *non*-gap curated feast has no reading at all; this plan does
  not touch that guarantee.

## 5. Testing

- **Unit:** `readingsFilename()` (colon replacement, round-trips with
  `readingsKey()`'s output) and `loadCalendrierReading`'s 404-to-`null`
  behavior (mock fetch returning 404 vs 200 vs 500).
- **E2e:** one test opens a feast's "Lectures du jour" section on a real
  `/calendrier/{annee}` page and asserts reading text renders (e.g. checks
  for a `ref` citation string); one test targets a known-gap feast — e.g.
  `second-dimanche-apres-noel` in any of the three cycles, all three of
  which are permanent gaps per `KNOWN_AELF_GAPS` — and asserts the
  "indisponibles" fallback note appears instead.

## Out of scope

- No changes to the AELF fetch script or `mergeReadings`'s validation logic.
- No changes to the liturgical-color system (separate track, already
  shipped).
- No calendar-widget UI (separate track, not started).
- No Study Panel "liturgique" sub-tab — that was the original placement idea
  from the AELF readings data-layer spec, superseded by showing readings
  directly on the calendrier reader pages instead, per this project's
  decision to fold that display need into `FeastBlock` rather than the CEC
  reading experience.
