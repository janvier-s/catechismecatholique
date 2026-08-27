# AELF Readings Data Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fetch real Mass reading text (first reading, psalm, second reading, gospel) from the AELF API for every curated Sunday/feast, and store it as build data alongside the existing calendrier output — no UI in this plan.

**Architecture:** A one-time, manually-run script (`scripts/fetch-aelf.ts`) reads the already-built date index, picks the most recent *past* real date for each curated feast slug (AELF only serves real content for dates that have already occurred), queries `api.aelf.org`, and writes a checked-in source file (`scripts/data-sources/calendrier/readings.json`). `prepareCalendrier()` then reads that file at every normal prebuild — like `CCC_Liturgy_List.txt`, no network access needed — validates every curated slug has an entry, and writes `static/data/calendrier/readings.json`.

**Tech Stack:** Node's built-in `fetch()`, TypeScript strict, vitest, tsx (matching the existing `scripts/fetch-ibp-playlist.ts` convention).

**Spec:** `docs/superpowers/specs/2026-08-27-aelf-readings-design.md`

## Global Constraints

- No em dashes in any user-facing copy, code comment, or log string — use middot (`·`), comma, or rewrite.
- No French thousands separators in numerals.
- AELF is queried with `zone: 'romain'` only (no France-specific or other locale zone) — matches the project's existing "core romcal only" choice for the same reason (this project uses its own French titles, not a locale plugin's translated ones).
- AELF only ever gets queried with a date on or before "today" at the time the fetch script runs — a future date returns 404 (verified directly against the live API).
- `scripts/data-sources/calendrier/readings.json` is a checked-in, manually-regenerated source file, read like `CCC_Liturgy_List.txt` — never fetched during a normal `prepare-data`/`prebuild` run.
- Fail loud: `prepareCalendrier()` throws, naming the feast, if any curated slug has no entry in `readings.json`, rather than emitting a partial `static/data/calendrier/readings.json` — matches the project's established convention for `liturgicalColor` resolution.
- No UI changes in this plan — this is the data layer only.

---

## Task 1: Add `CalendrierReading`/`CalendrierReadingsFile` types

**Files:**
- Modify: `scripts/prepare/calendrier.ts`
- Modify: `src/lib/data/types.ts`

**Interfaces:**
- Produces: `CalendrierReading`, `CalendrierReadingsFile`

- [ ] **Step 1: Add the types to `scripts/prepare/calendrier.ts`**

Add near the other type exports (after `CalendrierIndexFile`, around line 56):

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
		date: string; // ISO yyyy-mm-dd - the past date AELF was queried with
		lectures: CalendrierReading[];
	};
}
```

- [ ] **Step 2: Mirror the same types in `src/lib/data/types.ts`**

Add alongside the other `Calendrier*` mirror types:

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
		date: string;
		lectures: CalendrierReading[];
	};
}
```

- [ ] **Step 3: Typecheck**

```bash
npm run check
```

Expected: PASS, no new errors. These are new standalone types, nothing constructs them yet, so nothing else can fail to typecheck.

- [ ] **Step 4: Commit**

```bash
git add scripts/prepare/calendrier.ts src/lib/data/types.ts
git commit -m "feat(calendrier): add CalendrierReading/CalendrierReadingsFile types"
```

---

## Task 2: `pickReadingDate` — most-recent-past-date selection

**Files:**
- Create: `scripts/aelf/pickReadingDate.ts`
- Test: `tests/unit/aelf/pick-reading-date.test.ts`

**Interfaces:**
- Consumes: `CalendrierDateRow` from `../prepare/calendrier.ts`
- Produces: `pickReadingDate(rows: CalendrierDateRow[], slug: string, today: string): string | null`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/aelf/pick-reading-date.test.ts
import { describe, it, expect } from 'vitest';
import { pickReadingDate } from '../../../scripts/aelf/pickReadingDate';
import type { CalendrierDateRow } from '../../../scripts/prepare/calendrier';

const rows: CalendrierDateRow[] = [
	{ date: '2018-01-14', slug: 'deuxieme-dimanche-du-temps-ordinaire', corpus: 'year', yearKey: 'b' },
	{ date: '2021-01-17', slug: 'deuxieme-dimanche-du-temps-ordinaire', corpus: 'year', yearKey: 'b' },
	{ date: '2024-01-14', slug: 'deuxieme-dimanche-du-temps-ordinaire', corpus: 'year', yearKey: 'b' },
	{ date: '2027-01-17', slug: 'deuxieme-dimanche-du-temps-ordinaire', corpus: 'year', yearKey: 'b' },
	{ date: '2024-06-29', slug: 'la-solennite-de-saint-pierre-et-saint-paul-apotres', corpus: 'fixed' }
];

describe('pickReadingDate', () => {
	it('picks the most recent row on or before today', () => {
		expect(pickReadingDate(rows, 'deuxieme-dimanche-du-temps-ordinaire', '2026-08-27')).toBe(
			'2024-01-14'
		);
	});

	it('excludes rows after today even if they are the latest in the array', () => {
		expect(pickReadingDate(rows, 'deuxieme-dimanche-du-temps-ordinaire', '2022-01-01')).toBe(
			'2021-01-17'
		);
	});

	it('does not depend on input order', () => {
		const shuffled = [...rows].reverse();
		expect(pickReadingDate(shuffled, 'deuxieme-dimanche-du-temps-ordinaire', '2026-08-27')).toBe(
			'2024-01-14'
		);
	});

	it('returns null when the slug has no past occurrence yet', () => {
		expect(pickReadingDate(rows, 'deuxieme-dimanche-du-temps-ordinaire', '2017-12-31')).toBeNull();
	});

	it('returns null for a slug with no rows at all', () => {
		expect(pickReadingDate(rows, 'unknown-slug', '2026-08-27')).toBeNull();
	});
});
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
npx vitest run tests/unit/aelf/pick-reading-date.test.ts
```

Expected: FAIL with "Cannot find module '../../../scripts/aelf/pickReadingDate'".

- [ ] **Step 3: Implement**

```ts
// scripts/aelf/pickReadingDate.ts
import type { CalendrierDateRow } from '../prepare/calendrier.ts';

/**
 * Picks the date to query AELF for a feast slug: the most recent row for
 * that slug whose date is not after `today` (both ISO yyyy-mm-dd strings).
 * AELF only serves real content for dates that have already occurred, and
 * Sunday/solemnity readings are locked to the liturgical cycle rather than
 * the civil year, so any past occurrence gives the right reading text.
 * Returns null if the slug has no past occurrence yet.
 */
export function pickReadingDate(
	rows: CalendrierDateRow[],
	slug: string,
	today: string
): string | null {
	const matches = rows.filter((r) => r.slug === slug && r.date <= today);
	if (matches.length === 0) return null;
	return matches.reduce((latest, r) => (r.date > latest ? r.date : latest), matches[0]!.date);
}
```

- [ ] **Step 4: Run the test again**

```bash
npx vitest run tests/unit/aelf/pick-reading-date.test.ts
```

Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/aelf/pickReadingDate.ts tests/unit/aelf/pick-reading-date.test.ts
git commit -m "feat(calendrier): add pickReadingDate for AELF fetch date selection"
```

---

## Task 3: `pickMesse` — choosing among multiple Mass options

**Files:**
- Create: `scripts/aelf/pickMesse.ts`
- Test: `tests/unit/aelf/pick-messe.test.ts`

**Interfaces:**
- Consumes: `CalendrierReading` from `../prepare/calendrier.ts`
- Produces: `AelfMesse`, `PickMesseResult`, `pickMesse(messes: AelfMesse[], slug: string): PickMesseResult`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/aelf/pick-messe.test.ts
import { describe, it, expect } from 'vitest';
import { pickMesse } from '../../../scripts/aelf/pickMesse';

describe('pickMesse', () => {
	it('uses the only messe when there is exactly one', () => {
		const messes = [{ nom: 'Messe du jour', lectures: [] }];
		const result = pickMesse(messes, 'deuxieme-dimanche-du-temps-ordinaire');
		expect(result.messe.nom).toBe('Messe du jour');
		expect(result.warning).toBeNull();
	});

	it('prefers "Messe du jour" among several', () => {
		const messes = [
			{ nom: 'Messe de la veille au soir', lectures: [] },
			{ nom: 'Messe de la nuit', lectures: [] },
			{ nom: "Messe de l'aurore", lectures: [] },
			{ nom: 'Messe du jour', lectures: [] }
		];
		const result = pickMesse(messes, 'la-solennite-de-noel');
		expect(result.messe.nom).toBe('Messe du jour');
		expect(result.warning).toBeNull();
	});

	it('falls back to the first messe with a warning when none is named "Messe du jour"', () => {
		const messes = [
			{ nom: 'Messe A', lectures: [] },
			{ nom: 'Messe B', lectures: [] }
		];
		const result = pickMesse(messes, 'mystery-feast');
		expect(result.messe.nom).toBe('Messe A');
		expect(result.warning).toContain('mystery-feast');
		expect(result.warning).toContain('Messe A, Messe B');
	});

	it('throws when AELF returns no messes at all', () => {
		expect(() => pickMesse([], 'mystery-feast')).toThrow(/mystery-feast/);
	});
});
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
npx vitest run tests/unit/aelf/pick-messe.test.ts
```

Expected: FAIL with "Cannot find module '../../../scripts/aelf/pickMesse'".

- [ ] **Step 3: Implement**

```ts
// scripts/aelf/pickMesse.ts
import type { CalendrierReading } from '../prepare/calendrier.ts';

export interface AelfMesse {
	nom: string;
	lectures: CalendrierReading[];
}

export interface PickMesseResult {
	messe: AelfMesse;
	warning: string | null;
}

/**
 * Some dates (Noël: veille/nuit/aurore/jour) offer more than one Mass, but
 * the curated data has only one entry for such feasts. Prefer "Messe du
 * jour" when there's a choice, since it's the main day Mass most commonly
 * referenced; fall back to the first entry with a warning otherwise, so an
 * unexpected AELF naming change is visible rather than silently picking
 * something unreviewed.
 */
export function pickMesse(messes: AelfMesse[], slug: string): PickMesseResult {
	if (messes.length === 0) {
		throw new Error(`calendrier/aelf: AELF returned no messes for "${slug}"`);
	}
	if (messes.length === 1) {
		return { messe: messes[0]!, warning: null };
	}
	const jour = messes.find((m) => m.nom === 'Messe du jour');
	if (jour) {
		return { messe: jour, warning: null };
	}
	const names = messes.map((m) => m.nom).join(', ');
	return {
		messe: messes[0]!,
		warning: `calendrier/aelf: "${slug}" has ${messes.length} messes (${names}), none named "Messe du jour" · using the first one`
	};
}
```

- [ ] **Step 4: Run the test again**

```bash
npx vitest run tests/unit/aelf/pick-messe.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/aelf/pickMesse.ts tests/unit/aelf/pick-messe.test.ts
git commit -m "feat(calendrier): add pickMesse for choosing among AELF's Mass options"
```

---

## Task 4: `mergeReadings` — validate coverage, build the output shape

**Files:**
- Create: `scripts/prepare/calendrierReadingsMerge.ts`
- Test: `tests/unit/prepare/calendrier-readings-merge.test.ts`

**Interfaces:**
- Consumes: `CalendrierFixedFeast`, `CalendrierReadingsFile`, `CalendrierYearFile` from `./calendrier.ts`
- Produces: `mergeReadings(yearFiles: CalendrierYearFile[], fixed: CalendrierFixedFeast[], readingsFile: CalendrierReadingsFile): CalendrierReadingsFile`

This is a pure function, testable with fixtures, decoupled from whether the real fetched `readings.json` exists yet — Task 6 is the only task that touches the real build pipeline and the real fetched data together.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/prepare/calendrier-readings-merge.test.ts
import { describe, it, expect } from 'vitest';
import { mergeReadings } from '../../../scripts/prepare/calendrierReadingsMerge';
import type {
	CalendrierFixedFeast,
	CalendrierReadingsFile,
	CalendrierYearFile
} from '../../../scripts/prepare/calendrier';

const yearFiles: CalendrierYearFile[] = [
	{
		key: 'b',
		feasts: [
			{
				slug: 'deuxieme-dimanche-du-temps-ordinaire',
				title: 'Deuxième Dimanche du Temps Ordinaire',
				season: 'ordinaire',
				clusters: [],
				liturgicalColor: 'green'
			}
		]
	}
];

const fixed: CalendrierFixedFeast[] = [
	{
		slug: 'la-solennite-de-saint-pierre-et-saint-paul-apotres',
		title: 'La Solennité de saint Pierre et saint Paul, Apôtres',
		season: 'solennite',
		clusters: [],
		liturgicalColor: 'red',
		date: '29 Juin',
		month_index: 5
	}
];

const readingsFile: CalendrierReadingsFile = {
	'deuxieme-dimanche-du-temps-ordinaire': { date: '2024-01-14', lectures: [] },
	'la-solennite-de-saint-pierre-et-saint-paul-apotres': { date: '2024-06-29', lectures: [] },
	'unrelated-slug-not-curated-anymore': { date: '2020-01-01', lectures: [] }
};

describe('mergeReadings', () => {
	it('keeps only the readings the current curated data actually needs', () => {
		const result = mergeReadings(yearFiles, fixed, readingsFile);
		expect(Object.keys(result).sort()).toEqual([
			'deuxieme-dimanche-du-temps-ordinaire',
			'la-solennite-de-saint-pierre-et-saint-paul-apotres'
		]);
	});

	it('throws, naming the feast, when a curated year feast has no reading', () => {
		const incomplete: CalendrierReadingsFile = { ...readingsFile };
		delete incomplete['deuxieme-dimanche-du-temps-ordinaire'];
		expect(() => mergeReadings(yearFiles, fixed, incomplete)).toThrow(
			/deuxieme-dimanche-du-temps-ordinaire/
		);
	});

	it('throws, naming the feast, when a curated fixed feast has no reading', () => {
		const incomplete: CalendrierReadingsFile = { ...readingsFile };
		delete incomplete['la-solennite-de-saint-pierre-et-saint-paul-apotres'];
		expect(() => mergeReadings(yearFiles, fixed, incomplete)).toThrow(
			/la-solennite-de-saint-pierre-et-saint-paul-apotres/
		);
	});
});
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
npx vitest run tests/unit/prepare/calendrier-readings-merge.test.ts
```

Expected: FAIL with "Cannot find module '../../../scripts/prepare/calendrierReadingsMerge'".

- [ ] **Step 3: Implement**

```ts
// scripts/prepare/calendrierReadingsMerge.ts
import type { CalendrierFixedFeast, CalendrierReadingsFile, CalendrierYearFile } from './calendrier.ts';

/**
 * Validates that every curated feast/fixed-feast slug has a fetched AELF
 * reading, and returns the subset of `readingsFile` the current curated
 * data actually needs (so a feast later removed from the source text
 * doesn't leave a stale entry in the output). Throws, naming the missing
 * feast, rather than silently emitting a partial file - matches this
 * project's established fail-loud convention for build-time data gaps.
 */
export function mergeReadings(
	yearFiles: CalendrierYearFile[],
	fixed: CalendrierFixedFeast[],
	readingsFile: CalendrierReadingsFile
): CalendrierReadingsFile {
	const out: CalendrierReadingsFile = {};

	for (const yf of yearFiles) {
		for (const feast of yf.feasts) {
			const entry = readingsFile[feast.slug];
			if (!entry) {
				throw new Error(
					`calendrier: no AELF reading resolved for "${feast.title}" (${feast.slug}). ` +
						`Run "npm run fetch-aelf" and commit the updated readings.json.`
				);
			}
			out[feast.slug] = entry;
		}
	}
	for (const ff of fixed) {
		const entry = readingsFile[ff.slug];
		if (!entry) {
			throw new Error(
				`calendrier: no AELF reading resolved for "${ff.title}" (${ff.slug}). ` +
					`Run "npm run fetch-aelf" and commit the updated readings.json.`
			);
		}
		out[ff.slug] = entry;
	}

	return out;
}
```

- [ ] **Step 4: Run the test again**

```bash
npx vitest run tests/unit/prepare/calendrier-readings-merge.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/prepare/calendrierReadingsMerge.ts tests/unit/prepare/calendrier-readings-merge.test.ts
git commit -m "feat(calendrier): add mergeReadings to validate AELF reading coverage"
```

---

## Task 5: `scripts/fetch-aelf.ts` — the live fetch script

**Files:**
- Create: `scripts/fetch-aelf.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `pickReadingDate` from `./aelf/pickReadingDate.ts`; `pickMesse`, `AelfMesse` from `./aelf/pickMesse.ts`; `CalendrierDatesIndexFile`, `CalendrierIndexFile`, `CalendrierReadingsFile`, `CalendrierYearFile` from `./prepare/calendrier.ts`

This script hits a live third-party API, so per the spec there is no automated test for it (only its pure building blocks, Tasks 2-3, are unit tested). Verification here is typecheck + lint only. **This task does not run the script and does not modify `prepareCalendrier()`** — that happens together in Task 6, so the repo is never left in a state where the build expects a `readings.json` that doesn't exist yet.

- [ ] **Step 1: Write the script**

```ts
#!/usr/bin/env tsx
// scripts/fetch-aelf.ts
// Fetches Mass reading text from the AELF API (api.aelf.org) for every
// curated feast/Sunday in the calendrier data, and writes the result to
// scripts/data-sources/calendrier/readings.json.
//
// Run manually, occasionally (e.g. when a new feast is added to
// CCC_Liturgy_List.txt, or to pick up a text correction upstream) · not part
// of the normal prebuild, since AELF only serves real content for dates that
// have already occurred and this project's date range runs to 2035. Every
// Sunday/solemnity's readings are locked to its liturgical cycle or its
// fixed calendar date, not to the specific civil year, so one past
// occurrence per feast is enough.
//
// Usage:  npm run fetch-aelf
//
// Requires static/data/calendrier/{dates-index,index,annee-a,annee-b,annee-c}.json
// to already exist (run `npm run prepare-data` first if they don't).

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
	CalendrierDatesIndexFile,
	CalendrierIndexFile,
	CalendrierReadingsFile,
	CalendrierYearFile
} from './prepare/calendrier.ts';
import { pickReadingDate } from './aelf/pickReadingDate.ts';
import { pickMesse, type AelfMesse } from './aelf/pickMesse.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(HERE, '..', 'static', 'data', 'calendrier');
const OUT = join(HERE, 'data-sources', 'calendrier', 'readings.json');
const ZONE = 'romain';
const REQUEST_DELAY_MS = 200;

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

const datesIndex: CalendrierDatesIndexFile = JSON.parse(
	readFileSync(join(DATA_DIR, 'dates-index.json'), 'utf8')
);
const index: CalendrierIndexFile = JSON.parse(readFileSync(join(DATA_DIR, 'index.json'), 'utf8'));
const yearFiles: CalendrierYearFile[] = (['a', 'b', 'c'] as const).map((key) =>
	JSON.parse(readFileSync(join(DATA_DIR, `annee-${key}.json`), 'utf8'))
);

const slugs: string[] = [];
for (const yf of yearFiles) for (const feast of yf.feasts) slugs.push(feast.slug);
for (const ff of index.fixed_feasts) slugs.push(ff.slug);

const today = new Date().toISOString().slice(0, 10);
const output: CalendrierReadingsFile = {};
const failures: string[] = [];

for (const slug of slugs) {
	const date = pickReadingDate(datesIndex.rows, slug, today);
	if (!date) {
		failures.push(`${slug}: no past occurrence in the date index`);
		continue;
	}

	let res: Response;
	try {
		res = await fetch(`https://api.aelf.org/v1/messes/${date}/${ZONE}`);
	} catch (err) {
		failures.push(`${slug} (${date}): request failed · ${(err as Error).message}`);
		continue;
	}
	if (!res.ok) {
		failures.push(`${slug} (${date}): AELF returned ${res.status}`);
		continue;
	}

	let body: { messes: AelfMesse[] };
	try {
		body = await res.json();
	} catch {
		failures.push(`${slug} (${date}): AELF response was not valid JSON`);
		continue;
	}

	try {
		const { messe, warning } = pickMesse(body.messes ?? [], slug);
		if (warning) console.warn(warning);
		output[slug] = { date, lectures: messe.lectures };
	} catch (err) {
		failures.push((err as Error).message);
		continue;
	}

	await sleep(REQUEST_DELAY_MS);
}

if (failures.length > 0) {
	console.error(`fetch-aelf: ${failures.length} feast(s) failed to resolve:`);
	for (const f of failures) console.error(`  - ${f}`);
	process.exit(1);
}

writeFileSync(OUT, JSON.stringify(output, null, '\t') + '\n', 'utf8');
console.log(`fetch-aelf: wrote ${Object.keys(output).length} feasts to ${OUT}`);
```

- [ ] **Step 2: Register the npm script**

Add to `package.json`'s `"scripts"` block, alongside the other one-off fetch scripts (`fetch-ibp-playlist`):

```json
"fetch-aelf": "tsx scripts/fetch-aelf.ts",
```

- [ ] **Step 3: Typecheck and lint**

```bash
npm run check
npm run lint
```

Expected: PASS. The script isn't run yet (no network call happens from these commands), and nothing else references it yet, so this only validates the code compiles and is formatted correctly.

- [ ] **Step 4: Commit**

```bash
git add scripts/fetch-aelf.ts package.json
git commit -m "feat(calendrier): add the AELF fetch script"
```

---

## Task 6: Run the real fetch, wire the merge, verify the full build

**Files:**
- Create (generated by running Task 5's script for real): `scripts/data-sources/calendrier/readings.json`
- Modify: `scripts/prepare/calendrier.ts`
- Regenerated: `static/data/calendrier/readings.json` (new), `static/data/calendrier/annee-{a,b,c}.json`, `index.json`, `dates-index.json` (rewritten, content should be unchanged)

**Interfaces:**
- Consumes: `mergeReadings` from `./calendrierReadingsMerge.ts`

This is the integration task: it runs the live fetch for real (hits `api.aelf.org` roughly 190 times, a few minutes with the script's built-in 200ms delay between requests) and wires the throw-if-missing merge into the build pipeline in the same task, so the repo is never left in a state where `prepareCalendrier()` requires a `readings.json` that doesn't exist.

- [ ] **Step 1: Make sure the build output Task 5's script reads is current**

```bash
npm run prepare-data
```

Expected: completes without error (this project's existing pipeline, unaffected by anything in this plan so far).

- [ ] **Step 2: Run the real fetch**

```bash
npm run fetch-aelf
```

Expected: after roughly 190 requests (a few minutes), prints `fetch-aelf: wrote <N> feasts to .../readings.json` with no preceding failure list. If it fails, the printed list names exactly which feast(s) and why (no past date available, a non-200 response, invalid JSON) — investigate and re-run rather than proceeding with a partial file. A `console.warn` line for any feast that hit the "Messe du jour" fallback (expected for Noël) is normal, not a failure.

- [ ] **Step 3: Spot-check the fetched data**

```bash
node -e "const r = require('./scripts/data-sources/calendrier/readings.json'); console.log(Object.keys(r).length); console.log(r['vendredi-saint-la-passion-du-seigneur'])"
```

Expected: a count in the neighborhood of 190, and the Vendredi Saint entry shows a real past `date` and a `lectures` array containing readings with real `ref`/`contenu` text (Isaiah, the Passion narrative).

```bash
node -e "const r = require('./scripts/data-sources/calendrier/readings.json'); console.log(r['la-solennite-de-noel'] ?? Object.keys(r).find(k => k.includes('noel')))"
```

Expected: an entry exists for Noël with a non-empty `lectures` array (confirms the "Messe du jour" selection worked, not an empty fallback).

- [ ] **Step 4: Wire the merge into `prepareCalendrier()`**

In `scripts/prepare/calendrier.ts`, add the import at the top (alongside the existing `calendrierDates.ts` import):

```ts
import { mergeReadings } from './calendrierReadingsMerge.ts';
```

After the fixed-feast `liturgicalColor` assignment loop and before `const yearStats: ...` (i.e. right after the closing brace of the `for (const ff of fixed) { ... }` block that throws on missing color), insert:

```ts
	const readingsFile: CalendrierReadingsFile = JSON.parse(
		readFileSync(join(sourceDir, 'readings.json'), 'utf8')
	);
	const readings = mergeReadings(yearFiles, fixed, readingsFile);
```

After the existing `writeFileSync(join(outDir, 'dates-index.json'), ...)` line and before the final `return { ... }`, insert:

```ts
	writeFileSync(join(outDir, 'readings.json'), JSON.stringify(readings));
```

- [ ] **Step 5: Regenerate the full build output**

```bash
npm run prepare-data
```

Expected: completes without throwing (a throw here means a curated feast's slug isn't in `readings.json` — check the error message, which names the exact feast; this would mean Task 5's fetch run in Step 2 above didn't actually cover it, which shouldn't happen since both derive their slug list from the same curated data, but investigate if it does).

```bash
node -e "const r = require('./static/data/calendrier/readings.json'); console.log(Object.keys(r).length)"
git status --short static/data/calendrier/
```

Expected: the printed count matches Step 3's count, and `git status` shows `readings.json` as new/untracked and `annee-{a,b,c}.json`/`index.json`/`dates-index.json` either unchanged or with no meaningful diff (same romcal version, same source text, so their content shouldn't actually change — confirm with `git diff static/data/calendrier/annee-b.json` that any diff is empty or trivial).

- [ ] **Step 6: Run the full test suite, typecheck, and lint**

```bash
npm run test
npm run check
npm run lint
```

Expected: all PASS, including the pre-existing `tests/unit/prepare/calendrier-romcal-ids.test.ts` coverage test (it calls the real `prepareCalendrier()` against the real source directory, so it now also depends on `readings.json` existing there — which it does, from Step 2).

- [ ] **Step 7: Commit**

```bash
git add scripts/prepare/calendrier.ts scripts/data-sources/calendrier/readings.json static/data/calendrier
git commit -m "feat(calendrier): fetch AELF readings and wire them into the build"
```
