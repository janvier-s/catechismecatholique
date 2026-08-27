# Calendrier Date Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real-date picker and a "today" card to `/calendrier`, both resolving to the matching Sunday/feast and rendering its CEC content inline, with an accurate per-feast liturgical color accent.

**Architecture:** A new build-time step (`scripts/prepare/calendrierDates.ts`) runs `romcal` once per civil year in a fixed range, joins each of the existing curated feast entries (Sundays matched by season+week, named solemnities matched by romcal's own day id) to its real calendar date, and writes a static `dates-index.json` plus a `liturgicalColor` field on every feast. The frontend does plain object lookups against that static data — no liturgical computation ships to the client. Two new Svelte components (`TodayCard`, `DatePickerCard`) render the resolved feast inline via a `FeastBlock` component extracted from the existing `CalendrierReader`.

**Tech Stack:** SvelteKit 2 / Svelte 5 runes, TypeScript strict, vitest, `romcal@3.0.0-dev.138` (devDependency only, build-time).

**Spec:** `docs/superpowers/specs/2026-08-27-calendrier-date-picker-design.md`

## Global Constraints

- Runes-only Svelte 5 syntax everywhere (`$props()`, `$state()`, `$derived()`, `$effect()`) — no `export let`, no `$:`.
- No em dashes in any user-facing copy, code comment, or log string — use middot (`·`), comma, or rewrite.
- No French thousands separators in numerals.
- No `§` markers in our own UI labels/tooltips (the existing `§{p.number}` in `FeastBlock`/`CalendrierReader` reproduces the site's existing paragraph-link convention and is left as-is — it is not new copy this plan introduces).
- Scope is fixed to Sundays and feasts already in `CCC_Liturgy_List.txt` — no ferial-weekday data.
- `romcal` is pinned to the **exact** version `3.0.0-dev.138` (no `^`/`~`) — it ships under npm's `dev` tag with documented "breaking changes may occur between minor versions," so an unpinned range is a real risk to a prebuild pipeline that runs on every deploy.
- Épiphanie, Ascension, and Corpus Christi are **not** transferred to Sunday (`epiphanyOnSunday`/`ascensionOnSunday`/`corpusChristiOnSunday` all left at romcal's default `false`) — confirmed with the project owner.
- No France-specific liturgical data — use core `romcal` only, no `@romcal/calendar.france` or any locale plugin (the core package already includes the full General Roman Calendar and Proper of Time; locale plugins only add translated names, which this project doesn't need since it uses its own French titles).
- Precomputed date range: civil years 2018–2035 inclusive.

---

## Task 1: Add `romcal` and a dependency smoke test

**Files:**
- Modify: `package.json`
- Test: `tests/unit/prepare/romcal-smoke.test.ts`

**Interfaces:**
- Produces: the `romcal` package available to import as `import { Romcal, Season } from 'romcal';` in later tasks.

- [ ] **Step 1: Install the exact pinned version**

```bash
npm install --save-dev --save-exact romcal@3.0.0-dev.138
```

- [ ] **Step 2: Verify the pin has no range prefix**

Open `package.json` and confirm the `romcal` devDependency line reads exactly `"romcal": "3.0.0-dev.138"` (no `^` or `~`).

- [ ] **Step 3: Write a smoke test against the real package**

This guards against silent API drift if the pin is ever bumped later — it asserts the exact shape the rest of this plan depends on.

```ts
// tests/unit/prepare/romcal-smoke.test.ts
import { describe, it, expect } from 'vitest';
import { Romcal } from 'romcal';

describe('romcal dependency smoke test', () => {
	it('generates a calendar with the expected LiturgicalDay shape', async () => {
		const calendar = await new Romcal().generateCalendar(2024);
		const jan1 = calendar['2024-01-01']?.[0];
		expect(jan1).toBeDefined();
		expect(jan1!.id).toBe('mary_mother_of_god');
		expect(jan1!.rank).toBe('SOLEMNITY');
		expect(jan1!.colors).toEqual(['WHITE']);
		expect(jan1!.seasons).toEqual(['CHRISTMAS_TIME']);
		expect(jan1!.calendar.dayOfWeek).toBe(1); // Monday
	});

	it('flags Sundays via calendar.dayOfWeek === 0', async () => {
		const calendar = await new Romcal().generateCalendar(2024);
		const jan14 = calendar['2024-01-14']?.[0];
		expect(jan14).toBeDefined();
		expect(jan14!.id).toBe('ordinary_time_2_sunday');
		expect(jan14!.calendar.dayOfWeek).toBe(0);
		expect(jan14!.calendar.weekOfSeason).toBe(2);
		expect(jan14!.cycles.sundayCycle).toBe('YEAR_B');
		expect(jan14!.colors).toEqual(['GREEN']);
	});

	it('does not transfer Épiphanie/Ascension/Corpus Christi to Sunday by default', async () => {
		const calendar = await new Romcal().generateCalendar(2024);
		const epiphany = Object.values(calendar)
			.flat()
			.find((d) => d.id === 'epiphany_of_the_lord')!;
		expect(epiphany.date).toBe('2024-01-06');
		expect(epiphany.calendar.dayOfWeek).toBe(6); // Saturday, not transferred
	});
});
```

- [ ] **Step 4: Run the test**

```bash
npx vitest run tests/unit/prepare/romcal-smoke.test.ts
```

Expected: all 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json tests/unit/prepare/romcal-smoke.test.ts
git commit -m "build(calendrier): add romcal as a pinned devDependency"
```

---

## Task 2: French ordinal word parser

Our source titles spell Sunday ordinals as French words ("Deuxième Dimanche du Temps Ordinaire", "Vingt-et-unième Dimanche du Temps Ordinaire"), not digits.

**Files:**
- Create: `scripts/prepare/calendrierFrenchOrdinal.ts`
- Test: `tests/unit/prepare/calendrier-french-ordinal.test.ts`

**Interfaces:**
- Produces: `parseFrenchOrdinal(title: string): number | null`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/prepare/calendrier-french-ordinal.test.ts
import { describe, it, expect } from 'vitest';
import { parseFrenchOrdinal } from '../../../scripts/prepare/calendrierFrenchOrdinal';

describe('parseFrenchOrdinal', () => {
	it('parses simple ordinals', () => {
		expect(parseFrenchOrdinal('Deuxième Dimanche du Temps Ordinaire')).toBe(2);
		expect(parseFrenchOrdinal('Premier Dimanche de l’Avent')).toBe(1);
		expect(parseFrenchOrdinal('Cinquième Dimanche de Carême')).toBe(5);
	});

	it('parses compound ordinals', () => {
		expect(parseFrenchOrdinal('Dix-septième Dimanche du Temps Ordinaire')).toBe(17);
		expect(parseFrenchOrdinal('Vingt-et-unième Dimanche du Temps Ordinaire')).toBe(21);
		expect(parseFrenchOrdinal('Trente-troisième Dimanche du Temps Ordinaire')).toBe(33);
	});

	it('ignores trailing subtitle text after the season name', () => {
		expect(
			parseFrenchOrdinal('Septième Dimanche de Pâques : la prière et la vie spirituelle')
		).toBe(7);
	});

	it('returns null for titles with no leading ordinal', () => {
		expect(parseFrenchOrdinal('La Solennité de Noël')).toBeNull();
		expect(parseFrenchOrdinal('Jeudi Saint- La Cène du Seigneur')).toBeNull();
		expect(parseFrenchOrdinal('Second Dimanche après Noël')).toBe(2); // "Second" alone still parses; named-feast routing (Task 3) is what keeps this off the ordinal path, not this function.
	});
});
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
npx vitest run tests/unit/prepare/calendrier-french-ordinal.test.ts
```

Expected: FAIL with "Cannot find module '../../../scripts/prepare/calendrierFrenchOrdinal'".

- [ ] **Step 3: Implement the parser**

```ts
// scripts/prepare/calendrierFrenchOrdinal.ts

// French ordinal words 1-33, lowercase. 33 is the highest that appears in the
// source data — Ordinary Time week 34 is always the id-mapped Christ the King
// solemnity (see calendrierRomcalIds.ts), never a plain numbered Sunday.
const ORDINAL_WORDS: Record<string, number> = {
	premier: 1,
	première: 1,
	second: 2,
	seconde: 2,
	deuxième: 2,
	troisième: 3,
	quatrième: 4,
	cinquième: 5,
	sixième: 6,
	septième: 7,
	huitième: 8,
	neuvième: 9,
	dixième: 10,
	onzième: 11,
	douzième: 12,
	treizième: 13,
	quatorzième: 14,
	quinzième: 15,
	seizième: 16,
	'dix-septième': 17,
	'dix-huitième': 18,
	'dix-neuvième': 19,
	vingtième: 20,
	'vingt-et-unième': 21,
	'vingt-deuxième': 22,
	'vingt-troisième': 23,
	'vingt-quatrième': 24,
	'vingt-cinquième': 25,
	'vingt-sixième': 26,
	'vingt-septième': 27,
	'vingt-huitième': 28,
	'vingt-neuvième': 29,
	trentième: 30,
	'trente-et-unième': 31,
	'trente-deuxième': 32,
	'trente-troisième': 33
};

const LEADING_WORD_RE = /^(\S+)\s+dimanche\b/i;

/**
 * Extracts the leading French ordinal word from a feast title, if the title
 * starts with "{ordinal} Dimanche ...". Returns null for titles that don't
 * start that way (named solemnities, Noël, Jeudi Saint, etc. — those are
 * matched by id instead, see calendrierRomcalIds.ts).
 */
export function parseFrenchOrdinal(title: string): number | null {
	const match = title.match(LEADING_WORD_RE);
	if (!match) return null;
	const word = match[1]!.toLowerCase();
	return ORDINAL_WORDS[word] ?? null;
}
```

- [ ] **Step 4: Run the test again**

```bash
npx vitest run tests/unit/prepare/calendrier-french-ordinal.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/prepare/calendrierFrenchOrdinal.ts tests/unit/prepare/calendrier-french-ordinal.test.ts
git commit -m "feat(calendrier): add French ordinal word parser for Sunday titles"
```

---

## Task 3: Named-feast romcal id map + season mapping, with full coverage test

Every feast in the source data is either a plain "Nth Sunday of {season}" (handled by Task 2's parser) or a named solemnity/feast that needs to be matched by romcal's own day `id` instead. This table was built by actually running `romcal.generateCalendar()` for 2024 and 2022 (to catch the rare "Second Sunday after Christmas", which only occurs some years) and cross-referencing every distinct `id` for `rank: 'SOLEMNITY' | 'FEAST'` against the existing feast titles.

**Files:**
- Create: `scripts/prepare/calendrierRomcalIds.ts`
- Test: `tests/unit/prepare/calendrier-romcal-ids.test.ts`

**Interfaces:**
- Consumes: `SeasonKey` from `./calendrier.ts` (Task 4 adds this export if not already present — it already exists today).
- Produces: `NAMED_FEAST_ROMCAL_ID: Record<string, string>`, `SEASON_TO_ROMCAL: Partial<Record<SeasonKey, Season>>`

- [ ] **Step 1: Write the implementation**

```ts
// scripts/prepare/calendrierRomcalIds.ts
import { Season } from 'romcal';
import type { SeasonKey } from './calendrier.ts';

// Verified against romcal@3.0.0-dev.138's generateCalendar(2024) and
// generateCalendar(2022) output (2022 was needed to observe
// second_sunday_after_christmas, which doesn't occur every year).
//
// Ascension and Christ the King each have two slug spellings across the
// three curated années, because the source titles differ ("Solennité de..."
// in année A vs "La Solennité de..." in B/C), which produces different
// slugify() output for the same real-world feast.
export const NAMED_FEAST_ROMCAL_ID: Record<string, string> = {
	'la-solennite-de-noel': 'nativity_of_the_lord',
	'la-sainte-famille': 'holy_family_of_jesus_mary_and_joseph',
	'la-solennite-de-sainte-marie-mere-de-dieu': 'mary_mother_of_god',
	'second-dimanche-apres-noel': 'second_sunday_after_christmas',
	'la-solennite-de-lepiphanie-du-seigneur': 'epiphany_of_the_lord',
	'dimanche-des-rameaux-et-de-la-passion-du-seigneur': 'palm_sunday_of_the_passion_of_the_lord',
	'jeudi-saint-la-cene-du-seigneur': 'holy_thursday',
	'vendredi-saint-la-passion-du-seigneur': 'friday_of_the_passion_of_the_lord',
	'dimanche-de-paques-la-resurrection-du-seigneur': 'easter_sunday',
	'solennite-de-lascension-du-seigneur': 'ascension_of_the_lord',
	'la-solennite-de-lascension-du-seigneur': 'ascension_of_the_lord',
	'la-solennite-de-la-pentecote': 'pentecost_sunday',
	'la-solennite-de-la-sainte-trinite': 'most_holy_trinity',
	'la-solennite-du-corps-et-du-sang-du-christ': 'most_holy_body_and_blood_of_christ',
	'la-solennite-du-sacre-coeur-de-jesus': 'most_sacred_heart_of_jesus',
	'solennite-du-christ-roi-de-lunivers': 'our_lord_jesus_christ_king_of_the_universe',
	'la-solennite-du-christ-roi-de-lunivers': 'our_lord_jesus_christ_king_of_the_universe',

	// Fixed feasts (index.json fixed_feasts) — matched by id, not just by
	// month/day, so they get a liturgicalColor from the same code path as
	// everything else.
	'la-solennite-de-saint-joseph-epoux-de-la-vierge-marie': 'joseph_spouse_of_mary',
	'la-solennite-de-saint-pierre-et-saint-paul-apotres': 'peter_and_paul_apostles',
	'la-solennite-de-lassomption-de-la-vierge-marie': 'assumption_of_the_blessed_virgin_mary',
	'la-solennite-de-tous-les-saints': 'all_saints',
	'la-solennite-de-limmaculee-conception-de-la-vierge-marie':
		'immaculate_conception_of_the_blessed_virgin_mary'
};

// Only the four seasons that contain plain "Nth Sunday" titles. `noel` and
// `solennite` feasts are always named — see NAMED_FEAST_ROMCAL_ID above.
export const SEASON_TO_ROMCAL: Partial<Record<SeasonKey, Season>> = {
	avent: Season.Advent,
	careme: Season.Lent,
	pascal: Season.EasterTime,
	ordinaire: Season.OrdinaryTime
};
```

- [ ] **Step 2: Write the coverage test**

This runs the *real* parser (`prepareCalendrier`) against the actual source file, so it catches the day someone adds a new feast to `CCC_Liturgy_List.txt` without updating this map.

```ts
// tests/unit/prepare/calendrier-romcal-ids.test.ts
import { describe, it, expect } from 'vitest';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { prepareCalendrier } from '../../../scripts/prepare/calendrier';
import { NAMED_FEAST_ROMCAL_ID } from '../../../scripts/prepare/calendrierRomcalIds';
import { parseFrenchOrdinal } from '../../../scripts/prepare/calendrierFrenchOrdinal';

describe('NAMED_FEAST_ROMCAL_ID coverage', () => {
	it('every real feast slug resolves via the id map or the ordinal parser', () => {
		const outDir = mkdtempSync(join(tmpdir(), 'calendrier-coverage-'));
		try {
			prepareCalendrier({ sourceDir: 'scripts/data-sources/calendrier', outDir });

			const unresolved: string[] = [];
			for (const key of ['a', 'b', 'c'] as const) {
				const yearFile = JSON.parse(readFileSync(join(outDir, `annee-${key}.json`), 'utf8'));
				for (const feast of yearFile.feasts) {
					if (NAMED_FEAST_ROMCAL_ID[feast.slug]) continue;
					if (parseFrenchOrdinal(feast.title) !== null) continue;
					unresolved.push(`${key}: ${feast.slug} (${feast.title})`);
				}
			}
			const index = JSON.parse(readFileSync(join(outDir, 'index.json'), 'utf8'));
			for (const ff of index.fixed_feasts) {
				if (!NAMED_FEAST_ROMCAL_ID[ff.slug]) unresolved.push(`fixed: ${ff.slug} (${ff.title})`);
			}

			expect(unresolved).toEqual([]);
		} finally {
			rmSync(outDir, { recursive: true, force: true });
		}
	});
});
```

- [ ] **Step 3: Run the tests**

```bash
npx vitest run tests/unit/prepare/calendrier-romcal-ids.test.ts
```

Expected: PASS. If it fails, the failure message lists exactly which slugs are uncovered — add them to `NAMED_FEAST_ROMCAL_ID`.

- [ ] **Step 4: Commit**

```bash
git add scripts/prepare/calendrierRomcalIds.ts tests/unit/prepare/calendrier-romcal-ids.test.ts
git commit -m "feat(calendrier): map named feasts to their romcal ids"
```

---

## Task 4: Extend types

**Files:**
- Modify: `scripts/prepare/calendrier.ts`
- Modify: `src/lib/data/types.ts`

**Interfaces:**
- Produces: `LiturgicalColor`, `CalendrierDateRow`, `CalendrierDatesIndexFile` types; `CalendrierFeast`/`CalendrierFixedFeast` gain `liturgicalColor: LiturgicalColor`.

- [ ] **Step 1: Update `scripts/prepare/calendrier.ts`'s types**

```ts
// scripts/prepare/calendrier.ts — replace the existing type block (lines 5-36)
export type SeasonKey = 'avent' | 'noel' | 'careme' | 'pascal' | 'solennite' | 'ordinaire';
export type LiturgicalColor = 'violet' | 'white' | 'red' | 'green' | 'rose';

export interface CalendrierCluster {
	i: number;
	theme: string;
	refs: string;
	paragraphs: number[];
}

export interface CalendrierFeast {
	slug: string;
	title: string;
	season: SeasonKey;
	clusters: CalendrierCluster[];
	liturgicalColor: LiturgicalColor;
}

export interface CalendrierFixedFeast extends CalendrierFeast {
	date: string;
	month_index: number;
}

export interface CalendrierYearFile {
	key: 'a' | 'b' | 'c';
	feasts: CalendrierFeast[];
}

export interface CalendrierDateRow {
	date: string; // ISO yyyy-mm-dd
	slug: string;
	corpus: 'year' | 'fixed';
	yearKey?: 'a' | 'b' | 'c'; // present when corpus === 'year'
}

export interface CalendrierDatesIndexFile {
	rangeStart: string; // ISO yyyy-mm-dd
	rangeEnd: string; // ISO yyyy-mm-dd
	rows: CalendrierDateRow[];
}

export interface CalendrierIndexFile {
	years: { key: 'a' | 'b' | 'c'; total_feasts: number; total_clusters: number }[];
	fixed_feasts: CalendrierFixedFeast[];
	total_feasts: number;
	total_clusters: number;
}
```

Every existing construction site of a `CalendrierFeast`/`CalendrierFixedFeast` object literal in this file (the `DATE_RE` branch and the `FEAST_RE` branch inside `parseAll`) will now fail to typecheck because they don't set `liturgicalColor`. Fix both by adding `liturgicalColor: 'white'` as a temporary placeholder value — Task 6 overwrites every feast's `liturgicalColor` with the real value before anything is written to disk, and throws if any feast is left unresolved, so this placeholder never reaches output.

```ts
// in the DATE_RE branch:
currentFeast = {
	slug,
	title,
	season: 'solennite',
	clusters: [],
	date: `${day} ${month}`,
	month_index: MONTHS.indexOf(month),
	liturgicalColor: 'white' // overwritten in Task 6's join step; never reaches output unchecked
};
```

```ts
// in the FEAST_RE branch:
currentFeast = { slug, title, season, clusters: [], liturgicalColor: 'white' }; // see comment above
```

- [ ] **Step 2: Mirror the same additions in `src/lib/data/types.ts`**

Find the `// ─── Liturgical calendar (calendrier) ───` block and replace it:

```ts
// ─── Liturgical calendar (calendrier) ──────────────────────────────────────

export type CalendrierSeason = 'avent' | 'noel' | 'careme' | 'pascal' | 'solennite' | 'ordinaire';
export type CalendrierYearKey = 'a' | 'b' | 'c';
export type LiturgicalColor = 'violet' | 'white' | 'red' | 'green' | 'rose';

export interface CalendrierCluster {
	i: number;
	theme: string;
	refs: string;
	paragraphs: number[];
}

export interface CalendrierFeast {
	slug: string;
	title: string;
	season: CalendrierSeason;
	clusters: CalendrierCluster[];
	liturgicalColor: LiturgicalColor;
}

export interface CalendrierFixedFeast extends CalendrierFeast {
	date: string;
	month_index: number;
}

export interface CalendrierYearFile {
	key: CalendrierYearKey;
	feasts: CalendrierFeast[];
}

export interface CalendrierDateRow {
	date: string;
	slug: string;
	corpus: 'year' | 'fixed';
	yearKey?: CalendrierYearKey;
}

export interface CalendrierDatesIndexFile {
	rangeStart: string;
	rangeEnd: string;
	rows: CalendrierDateRow[];
}

export interface CalendrierIndexFile {
	years: { key: CalendrierYearKey; total_feasts: number; total_clusters: number }[];
	fixed_feasts: CalendrierFixedFeast[];
	total_feasts: number;
	total_clusters: number;
}
```

- [ ] **Step 3: Confirm the project still typechecks where it should already fail**

```bash
npm run check 2>&1 | grep -i calendrier
```

Expected: errors pointing at the two object-literal sites (already fixed above) and possibly `calendrier.ts`'s call site of `prepareCalendrier` in `prepare-data.ts` if it's still synchronous — that call becomes valid again once Task 6 makes `prepareCalendrier` async and adds `await`. It's fine for `npm run check` to show unrelated errors from later tasks not yet done; just confirm no errors remain about missing `liturgicalColor`.

- [ ] **Step 4: Commit**

```bash
git add scripts/prepare/calendrier.ts src/lib/data/types.ts
git commit -m "feat(calendrier): add LiturgicalColor and date-index types"
```

---

## Task 5: Build-time join module

This is the core logic: for each civil year 2018-2035, generate the romcal calendar once, match every existing feast to its day (by id, or by season+week+Sunday), and produce both the date rows and each feast's `liturgicalColor`.

**Files:**
- Create: `scripts/prepare/calendrierDates.ts`
- Test: `tests/unit/prepare/calendrier-dates.test.ts`

**Interfaces:**
- Consumes: `CalendrierFeast`, `CalendrierFixedFeast`, `CalendrierYearFile`, `CalendrierDateRow`, `LiturgicalColor` from `./calendrier.ts`; `parseFrenchOrdinal` from `./calendrierFrenchOrdinal.ts`; `NAMED_FEAST_ROMCAL_ID`, `SEASON_TO_ROMCAL` from `./calendrierRomcalIds.ts`.
- Produces: `buildCalendrierDates(yearFiles, fixedFeasts): Promise<{ rows: CalendrierDateRow[]; colorsBySlug: Map<string, LiturgicalColor> }>`, `DATE_RANGE_START_YEAR`, `DATE_RANGE_END_YEAR`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/prepare/calendrier-dates.test.ts
import { describe, it, expect } from 'vitest';
import { buildCalendrierDates, DATE_RANGE_START_YEAR, DATE_RANGE_END_YEAR } from '../../../scripts/prepare/calendrierDates';
import type { CalendrierFeast, CalendrierFixedFeast, CalendrierYearFile } from '../../../scripts/prepare/calendrier';

// Real 2024 fixture, minimal fields (clusters aren't used by the join).
function feast(slug: string, title: string, season: CalendrierFeast['season']): CalendrierFeast {
	return { slug, title, season, clusters: [], liturgicalColor: 'white' };
}

const yearB: CalendrierYearFile = {
	key: 'b',
	feasts: [
		feast('deuxieme-dimanche-du-temps-ordinaire', 'Deuxième Dimanche du Temps Ordinaire', 'ordinaire'),
		feast('troisieme-dimanche-de-lavent', 'Troisième Dimanche de l’Avent', 'avent'),
		feast('quatrieme-dimanche-de-careme', 'Quatrième Dimanche de Carême', 'careme'),
		feast('vendredi-saint-la-passion-du-seigneur', 'Vendredi Saint – La Passion du Seigneur', 'pascal'),
		feast('dimanche-de-paques-la-resurrection-du-seigneur', 'Dimanche de Pâques – La Résurrection du Seigneur', 'pascal'),
		feast('la-solennite-du-christ-roi-de-lunivers', 'La Solennité du Christ Roi de l’univers', 'solennite')
	]
};

const fixedFeasts: CalendrierFixedFeast[] = [
	{
		slug: 'la-solennite-de-saint-pierre-et-saint-paul-apotres',
		title: 'La Solennité de saint Pierre et saint Paul, Apôtres',
		season: 'solennite',
		clusters: [],
		liturgicalColor: 'white',
		date: '29 Juin',
		month_index: 5
	}
];

describe('buildCalendrierDates', () => {
	it('covers the configured range', () => {
		expect(DATE_RANGE_START_YEAR).toBe(2018);
		expect(DATE_RANGE_END_YEAR).toBe(2035);
	});

	it('resolves dates and colors correctly against known 2024 fixed points', async () => {
		const { rows, colorsBySlug } = await buildCalendrierDates([yearB], fixedFeasts);

		const row2024 = (slug: string) => rows.find((r) => r.slug === slug && r.date.startsWith('2024'));

		expect(row2024('deuxieme-dimanche-du-temps-ordinaire')).toEqual({
			date: '2024-01-14',
			slug: 'deuxieme-dimanche-du-temps-ordinaire',
			corpus: 'year',
			yearKey: 'b'
		});
		expect(row2024('vendredi-saint-la-passion-du-seigneur')?.date).toBe('2024-03-29');
		expect(row2024('dimanche-de-paques-la-resurrection-du-seigneur')?.date).toBe('2024-03-31');

		expect(colorsBySlug.get('deuxieme-dimanche-du-temps-ordinaire')).toBe('green');
		expect(colorsBySlug.get('troisieme-dimanche-de-lavent')).toBe('rose');
		expect(colorsBySlug.get('quatrieme-dimanche-de-careme')).toBe('rose');
		expect(colorsBySlug.get('vendredi-saint-la-passion-du-seigneur')).toBe('red');
		expect(colorsBySlug.get('dimanche-de-paques-la-resurrection-du-seigneur')).toBe('white');
		expect(colorsBySlug.get('la-solennite-du-christ-roi-de-lunivers')).toBe('white');
	});

	it('resolves fixed feasts to a plain civil date every year, with a color', async () => {
		const { rows, colorsBySlug } = await buildCalendrierDates([yearB], fixedFeasts);
		const petersAndPaul2024 = rows.find(
			(r) => r.slug === 'la-solennite-de-saint-pierre-et-saint-paul-apotres' && r.date === '2024-06-29'
		);
		expect(petersAndPaul2024).toEqual({
			date: '2024-06-29',
			slug: 'la-solennite-de-saint-pierre-et-saint-paul-apotres',
			corpus: 'fixed'
		});
		expect(colorsBySlug.get('la-solennite-de-saint-pierre-et-saint-paul-apotres')).toBe('red');
	});

	it('throws loudly when a feast title matches neither the id map nor the ordinal parser', async () => {
		const badYear: CalendrierYearFile = {
			key: 'a',
			feasts: [feast('mystery-feast', 'Un Mystère Non Reconnu', 'ordinaire')]
		};
		await expect(buildCalendrierDates([badYear], [])).rejects.toThrow(/mystery-feast/);
	});
}, 30000); // the full 18-year range takes a few seconds
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
npx vitest run tests/unit/prepare/calendrier-dates.test.ts
```

Expected: FAIL with "Cannot find module '../../../scripts/prepare/calendrierDates'".

- [ ] **Step 3: Implement the join module**

```ts
// scripts/prepare/calendrierDates.ts
import { Romcal, type Season } from 'romcal';
import type {
	CalendrierDateRow,
	CalendrierFeast,
	CalendrierFixedFeast,
	CalendrierYearFile,
	LiturgicalColor
} from './calendrier.ts';
import { parseFrenchOrdinal } from './calendrierFrenchOrdinal.ts';
import { NAMED_FEAST_ROMCAL_ID, SEASON_TO_ROMCAL } from './calendrierRomcalIds.ts';

export const DATE_RANGE_START_YEAR = 2018;
export const DATE_RANGE_END_YEAR = 2035;

const ROMCAL_COLOR_TO_OURS: Record<string, LiturgicalColor> = {
	RED: 'red',
	ROSE: 'rose',
	PURPLE: 'violet',
	GREEN: 'green',
	WHITE: 'white',
	GOLD: 'white', // same festive tier as white; no separate accent needed
	BLACK: 'violet' // rare (e.g. All Souls); closest mournful color we support
};

type Matcher = { kind: 'id'; id: string } | { kind: 'sunday'; season: Season; week: number };

function buildMatcher(slug: string, title: string, season: CalendrierFeast['season']): Matcher {
	const namedId = NAMED_FEAST_ROMCAL_ID[slug];
	if (namedId) return { kind: 'id', id: namedId };

	const week = parseFrenchOrdinal(title);
	const romcalSeason = SEASON_TO_ROMCAL[season];
	if (week === null || !romcalSeason) {
		throw new Error(
			`calendrier: feast "${title}" (${slug}) has no NAMED_FEAST_ROMCAL_ID entry and its ` +
				`title did not parse as an ordinal Sunday. Add it to calendrierRomcalIds.ts.`
		);
	}
	return { kind: 'sunday', season: romcalSeason, week };
}

export interface CalendrierDatesJoinResult {
	rows: CalendrierDateRow[];
	colorsBySlug: Map<string, LiturgicalColor>;
}

export async function buildCalendrierDates(
	yearFiles: CalendrierYearFile[],
	fixedFeasts: CalendrierFixedFeast[]
): Promise<CalendrierDatesJoinResult> {
	const rows: CalendrierDateRow[] = [];
	const colorsBySlug = new Map<string, LiturgicalColor>();

	// Matchers are year-invariant (a feast's identity doesn't change year to
	// year), so resolve each one exactly once regardless of how many years
	// we scan below. This is also where a bad title fails loudly, once,
	// rather than 18 times.
	const matchersBySlug = new Map<string, Matcher>();
	for (const yf of yearFiles) {
		for (const feast of yf.feasts) {
			matchersBySlug.set(feast.slug, buildMatcher(feast.slug, feast.title, feast.season));
		}
	}
	for (const ff of fixedFeasts) {
		const namedId = NAMED_FEAST_ROMCAL_ID[ff.slug];
		if (!namedId) {
			throw new Error(`calendrier: fixed feast "${ff.title}" (${ff.slug}) has no NAMED_FEAST_ROMCAL_ID entry.`);
		}
		matchersBySlug.set(ff.slug, { kind: 'id', id: namedId });
	}

	for (let year = DATE_RANGE_START_YEAR; year <= DATE_RANGE_END_YEAR; year++) {
		const calendar = await new Romcal().generateCalendar(year);
		const days = Object.values(calendar).map((arr) => arr[0]!);

		const byId = new Map(days.map((d) => [d.id, d]));
		const sundaysBySeasonWeek = new Map<string, (typeof days)[number]>();
		for (const d of days) {
			if (d.calendar.dayOfWeek !== 0) continue;
			for (const s of d.seasons) {
				sundaysBySeasonWeek.set(`${s}:${d.calendar.weekOfSeason}`, d);
			}
		}

		for (const yf of yearFiles) {
			for (const feast of yf.feasts) {
				const matcher = matchersBySlug.get(feast.slug)!;
				const day =
					matcher.kind === 'id'
						? byId.get(matcher.id)
						: sundaysBySeasonWeek.get(`${matcher.season}:${matcher.week}`);
				if (!day) continue; // e.g. "Second Sunday after Christmas" doesn't occur every year

				rows.push({
					date: day.date,
					slug: feast.slug,
					corpus: 'year',
					yearKey: sundayCycleToYearKey(day.cycles.sundayCycle)
				});
				if (!colorsBySlug.has(feast.slug)) {
					colorsBySlug.set(feast.slug, ROMCAL_COLOR_TO_OURS[day.colors[0] ?? 'WHITE'] ?? 'white');
				}
			}
		}

		for (const ff of fixedFeasts) {
			// Fixed feasts already have an exact civil date; no need to search
			// the year's calendar for the date itself, only for the color.
			const dayNum = parseInt(ff.date, 10);
			const date = `${year}-${String(ff.month_index + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
			rows.push({ date, slug: ff.slug, corpus: 'fixed' });

			if (!colorsBySlug.has(ff.slug)) {
				const matcher = matchersBySlug.get(ff.slug)!;
				const day = matcher.kind === 'id' ? byId.get(matcher.id) : undefined;
				if (day) colorsBySlug.set(ff.slug, ROMCAL_COLOR_TO_OURS[day.colors[0] ?? 'WHITE'] ?? 'white');
			}
		}
	}

	rows.sort((a, b) => a.date.localeCompare(b.date));
	return { rows, colorsBySlug };
}

function sundayCycleToYearKey(cycle: string): 'a' | 'b' | 'c' {
	if (cycle === 'YEAR_A') return 'a';
	if (cycle === 'YEAR_B') return 'b';
	return 'c';
}
```

- [ ] **Step 4: Run the tests**

```bash
npx vitest run tests/unit/prepare/calendrier-dates.test.ts
```

Expected: PASS (4 tests). This run generates 18 years of romcal calendars, so it may take a few seconds — that's expected and is why the test file sets a 30-second timeout.

- [ ] **Step 5: Commit**

```bash
git add scripts/prepare/calendrierDates.ts tests/unit/prepare/calendrier-dates.test.ts
git commit -m "feat(calendrier): build romcal date-index join with per-feast colors"
```

---

## Task 6: Wire the join into `prepareCalendrier`

**Files:**
- Modify: `scripts/prepare/calendrier.ts`
- Modify: `scripts/prepare-data.ts`

**Interfaces:**
- Consumes: `buildCalendrierDates`, `DATE_RANGE_START_YEAR`, `DATE_RANGE_END_YEAR` from `./calendrierDates.ts`.

- [ ] **Step 1: Add the import**

```ts
// top of scripts/prepare/calendrier.ts
import { buildCalendrierDates, DATE_RANGE_START_YEAR, DATE_RANGE_END_YEAR } from './calendrierDates.ts';
```

- [ ] **Step 2: Make `prepareCalendrier` async and replace its tail**

Change the signature:

```ts
export async function prepareCalendrier(args: { sourceDir: string; outDir: string }): Promise<{
	totalFeasts: number;
	totalClusters: number;
	totalFixed: number;
}> {
```

Replace everything from `const yearKeys: ('a' | 'b' | 'c')[] = ['a', 'b', 'c'];` to the end of the function with:

```ts
	const yearKeys: ('a' | 'b' | 'c')[] = ['a', 'b', 'c'];
	const yearFiles: CalendrierYearFile[] = yearKeys.map((key) => ({ key, feasts: years.get(key) ?? [] }));

	const { rows, colorsBySlug } = await buildCalendrierDates(yearFiles, fixed);

	for (const yf of yearFiles) {
		for (const feast of yf.feasts) {
			const color = colorsBySlug.get(feast.slug);
			if (!color) {
				throw new Error(
					`calendrier: no liturgicalColor resolved for "${feast.title}" (${feast.slug}) ` +
						`across ${DATE_RANGE_START_YEAR}-${DATE_RANGE_END_YEAR}.`
				);
			}
			feast.liturgicalColor = color;
		}
	}
	for (const ff of fixed) {
		const color = colorsBySlug.get(ff.slug);
		if (!color) {
			throw new Error(`calendrier: no liturgicalColor resolved for "${ff.title}" (${ff.slug}).`);
		}
		ff.liturgicalColor = color;
	}

	const yearStats: { key: 'a' | 'b' | 'c'; total_feasts: number; total_clusters: number }[] = [];
	let totalFeasts = 0;
	let totalClusters = 0;
	for (const yf of yearFiles) {
		writeFileSync(join(outDir, `annee-${yf.key}.json`), JSON.stringify(yf));
		const yearClusters = yf.feasts.reduce((s, f) => s + f.clusters.length, 0);
		yearStats.push({ key: yf.key, total_feasts: yf.feasts.length, total_clusters: yearClusters });
		totalFeasts += yf.feasts.length;
		totalClusters += yearClusters;
	}

	const fixedClusters = fixed.reduce((s, f) => s + f.clusters.length, 0);
	const index: CalendrierIndexFile = {
		years: yearStats,
		fixed_feasts: fixed,
		total_feasts: totalFeasts + fixed.length,
		total_clusters: totalClusters + fixedClusters
	};
	writeFileSync(join(outDir, 'index.json'), JSON.stringify(index));

	const datesIndex: CalendrierDatesIndexFile = {
		rangeStart: `${DATE_RANGE_START_YEAR}-01-01`,
		rangeEnd: `${DATE_RANGE_END_YEAR}-12-31`,
		rows
	};
	writeFileSync(join(outDir, 'dates-index.json'), JSON.stringify(datesIndex));

	return {
		totalFeasts: totalFeasts + fixed.length,
		totalClusters: totalClusters + fixedClusters,
		totalFixed: fixed.length
	};
}
```

- [ ] **Step 3: Update the call site in `prepare-data.ts`**

`main()` is already `async`, so this is a one-line change:

```ts
// scripts/prepare-data.ts, inside the "building liturgical calendar" block
const cal = await prepareCalendrier({ sourceDir: calendrierSourceDir, outDir: calendrierOutDir });
```

- [ ] **Step 4: Run the full prebuild and inspect the output**

```bash
npm run prepare-data
```

Expected: the "building liturgical calendar" step completes without throwing (a throw here means a feast is missing from `NAMED_FEAST_ROMCAL_ID` — check the error message, which names the exact feast).

```bash
node -e "const f = require('./static/data/calendrier/annee-b.json'); console.log(f.feasts.find(x => x.slug === 'vendredi-saint-la-passion-du-seigneur'))"
```

Expected: prints an object with `"liturgicalColor": "red"`.

```bash
node -e "const d = require('./static/data/calendrier/dates-index.json'); console.log(d.rangeStart, d.rangeEnd, d.rows.length); console.log(d.rows.find(r => r.date === '2024-03-29'))"
```

Expected: prints `2018-01-01 2035-12-31 <some number>` and a row for Good Friday 2024.

- [ ] **Step 5: Run the existing test suite to check nothing else broke**

```bash
npm run test
npm run check
```

Expected: PASS (aside from anything already broken before this plan, which shouldn't be touched here).

- [ ] **Step 6: Commit**

```bash
git add scripts/prepare/calendrier.ts scripts/prepare-data.ts static/data/calendrier
git commit -m "feat(calendrier): wire the date-index build into prepareCalendrier"
```

---

## Task 7: Frontend loader + page data wiring

**Files:**
- Modify: `src/lib/data/loaders.ts`
- Modify: `src/routes/calendrier/+page.ts`

**Interfaces:**
- Produces: `loadCalendrierDatesIndex(fetcher?: Fetch): Promise<CalendrierDatesIndexFile>`

- [ ] **Step 1: Add the loader**

```ts
// src/lib/data/loaders.ts — add near the other calendrier loaders,
// alongside loadCalendrierIndex/loadCalendrierYear
import type {
	// ...existing imports, add:
	CalendrierDatesIndexFile
} from './types';

let calendrierDatesIndexPromise: Promise<CalendrierDatesIndexFile> | null = null;

export function loadCalendrierDatesIndex(fetcher: Fetch = fetch): Promise<CalendrierDatesIndexFile> {
	if (!calendrierDatesIndexPromise) {
		calendrierDatesIndexPromise = fetchJson<CalendrierDatesIndexFile>(
			'/data/calendrier/dates-index.json',
			fetcher
		);
	}
	return calendrierDatesIndexPromise;
}
```

- [ ] **Step 2: Load it alongside the index on the landing page**

```ts
// src/routes/calendrier/+page.ts
import { loadCalendrierIndex, loadCalendrierDatesIndex } from '$lib/data/loaders';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	const [index, datesIndex] = await Promise.all([
		loadCalendrierIndex(fetch),
		loadCalendrierDatesIndex(fetch)
	]);
	return { index, datesIndex };
};
```

- [ ] **Step 3: Typecheck**

```bash
npm run check
```

Expected: no new errors. `/calendrier/+page.svelte` doesn't reference `data.datesIndex` yet (Task 11), so it's unused until then — that's fine, SvelteKit's generated `PageData` type just grows a field.

- [ ] **Step 4: Commit**

```bash
git add src/lib/data/loaders.ts src/routes/calendrier/+page.ts
git commit -m "feat(calendrier): load the dates index on the landing page"
```

---

## Task 8: Extract `FeastBlock` from `CalendrierReader`

Pure refactor — no behavior change. `CalendrierReader`'s `feastBlock` snippet becomes a standalone component so the new today/picker cards can render one feast without duplicating the expand/fetch logic.

**Files:**
- Create: `src/lib/components/calendrier/FeastBlock.svelte`
- Modify: `src/lib/components/calendrier/CalendrierReader.svelte`

**Interfaces:**
- Produces: `<FeastBlock feast={CalendrierFeast | CalendrierFixedFeast} showDates?: boolean />`

- [ ] **Step 1: Create `FeastBlock.svelte`**

One behavioral simplification falls out of the extraction: the original snippet keyed its `expanded`/`paragraphs` state by `` `${feast.slug}-${i}` `` because one shared `SvelteSet`/`SvelteMap` covered every feast on the page. Each `FeastBlock` instance now owns its own state, so the key collapses to plain `cluster.i`.

```svelte
<!-- src/lib/components/calendrier/FeastBlock.svelte -->
<script lang="ts">
	import type { CalendrierFeast, CalendrierFixedFeast, Paragraph } from '$lib/data/types';
	import { loadParagraph } from '$lib/data/loaders';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';

	let {
		feast,
		showDates = false
	}: {
		feast: CalendrierFeast | CalendrierFixedFeast;
		showDates?: boolean;
	} = $props();

	const expanded = new SvelteSet<number>();
	const paragraphs = new SvelteMap<number, Paragraph[] | null>();

	async function fetchParagraphs(i: number, paragraphNumbers: number[]) {
		if (paragraphs.has(i)) return;
		paragraphs.set(i, null); // loading
		try {
			const loaded = await Promise.all(paragraphNumbers.map((n) => loadParagraph(n)));
			paragraphs.set(i, loaded);
		} catch {
			paragraphs.set(i, []);
		}
	}

	async function toggleCluster(cluster: { i: number; paragraphs: number[] }) {
		if (expanded.has(cluster.i)) {
			expanded.delete(cluster.i);
			return;
		}
		expanded.add(cluster.i);
		await fetchParagraphs(cluster.i, cluster.paragraphs);
	}

	function capitalize(s: string): string {
		return s.charAt(0).toUpperCase() + s.slice(1);
	}

	function stripNotes(html: string): string {
		return html.replace(/\s*<sup[^>]*>[\s\S]*?<\/sup>/g, '');
	}

	async function toggleAllInFeast() {
		const allOpen = feast.clusters.length > 0 && feast.clusters.every((c) => expanded.has(c.i));
		if (allOpen) {
			for (const c of feast.clusters) expanded.delete(c.i);
		} else {
			const toFetch: { i: number; ns: number[] }[] = [];
			for (const c of feast.clusters) {
				if (!expanded.has(c.i)) {
					expanded.add(c.i);
					if (!paragraphs.has(c.i)) toFetch.push({ i: c.i, ns: c.paragraphs });
				}
			}
			await Promise.all(toFetch.map((t) => fetchParagraphs(t.i, t.ns)));
		}
	}
</script>

<article class="feast">
	<header class="feast-head">
		{#if showDates && 'date' in feast}
			<p class="feast-date">{feast.date}</p>
		{/if}
		<h2 class="feast-title" id="f-{feast.slug}">{feast.title}</h2>
		{#if feast.clusters.length > 1}
			<button
				type="button"
				class="open-all"
				onclick={toggleAllInFeast}
				aria-label="Ouvrir ou fermer toutes les sections"
			>
				{feast.clusters.every((c) => expanded.has(c.i)) ? 'Tout fermer' : 'Tout ouvrir'}
			</button>
		{/if}
	</header>

	<ul class="clusters">
		{#each feast.clusters as cluster (cluster.i)}
			{@const isOpen = expanded.has(cluster.i)}
			{@const loaded = paragraphs.get(cluster.i)}
			<li class="cluster">
				<h3 class="cluster-heading" id="c-{feast.slug}-{cluster.i}">
					<button
						type="button"
						class="cluster-head"
						class:is-open={isOpen}
						onclick={() => toggleCluster(cluster)}
						aria-expanded={isOpen}
					>
						<span class="caret" aria-hidden="true">{isOpen ? '▾' : '▸'}</span>
						<span class="cluster-theme">{capitalize(cluster.theme)}</span>
						<span class="cluster-refs">{cluster.refs}</span>
					</button>
				</h3>
				{#if isOpen}
					<div class="cluster-body">
						{#if loaded === null}
							<p class="loading">Chargement…</p>
						{:else if loaded && loaded.length > 0}
							{#each loaded as p (p.number)}
								<div class="par">
									<a class="par-num" href="/cec/{p.number}">§{p.number}</a>
									<div class="par-text">
										<!-- eslint-disable-next-line svelte/no-at-html-tags -->
										{@html stripNotes(p.text_html)}
									</div>
								</div>
							{/each}
						{/if}
					</div>
				{/if}
			</li>
		{/each}
	</ul>
</article>

<style>
	.feast {
		margin-bottom: 2.25rem;
	}
	.feast-head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.75rem;
		margin-bottom: 0.85rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--color-border);
	}
	.feast-date {
		font-family: var(--font-ui);
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 0;
		flex: none;
	}
	.feast-title {
		font-family: var(--font-heading);
		font-size: 1.3rem;
		font-weight: 600;
		line-height: 1.25;
		color: var(--color-fg);
		margin: 0;
		flex: 1 1 auto;
		min-width: 0;
	}
	.open-all {
		font-family: var(--font-ui);
		font-size: 0.72rem;
		font-weight: 500;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-muted);
		background: none;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: 0.3rem 0.6rem;
		cursor: pointer;
		transition:
			color 150ms ease,
			border-color 150ms ease;
		flex: none;
	}
	.open-all:hover {
		color: var(--color-accent);
		border-color: color-mix(in srgb, var(--color-accent) 50%, transparent);
	}

	.clusters {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.cluster {
		margin-bottom: 0.4rem;
	}
	.cluster-heading {
		margin: 0;
		font-size: inherit;
		font-weight: inherit;
	}
	.cluster-head {
		display: flex;
		align-items: baseline;
		gap: 0.6rem;
		width: 100%;
		text-align: left;
		background: none;
		border: 0;
		padding: 0.5rem 0.4rem;
		border-radius: 3px;
		cursor: pointer;
		font-family: var(--font-body);
		color: inherit;
		transition: background-color 120ms ease;
	}
	.cluster-head:hover {
		background: color-mix(in srgb, var(--color-accent) 6%, transparent);
	}
	.cluster-head.is-open {
		background: color-mix(in srgb, var(--color-accent) 8%, transparent);
	}
	.caret {
		flex: none;
		font-size: 0.85rem;
		color: var(--color-muted);
		width: 0.9rem;
		text-align: center;
	}
	.cluster-head.is-open .caret {
		color: var(--color-accent);
	}
	.cluster-theme {
		flex: 1;
		font-family: var(--font-body);
		font-style: italic;
		font-size: 0.97rem;
		line-height: 1.5;
		color: var(--color-subtle);
	}
	.cluster-head.is-open .cluster-theme {
		color: var(--color-fg);
	}
	.cluster-refs {
		flex: none;
		font-family: var(--font-ui);
		font-size: 0.78rem;
		font-weight: 500;
		font-variant-numeric: tabular-nums lining-nums;
		letter-spacing: 0.02em;
		color: var(--color-accent);
		white-space: nowrap;
	}

	.cluster-body {
		padding: 0.5rem 0.4rem 0.85rem 1.6rem;
	}
	.loading {
		font-family: var(--font-ui);
		font-size: 0.85rem;
		color: var(--color-muted);
		font-style: italic;
		margin: 0.5rem 0;
	}
	.par {
		display: flex;
		gap: 0.85rem;
		padding: 0.55rem 0;
		border-top: 1px dashed color-mix(in srgb, var(--color-border) 70%, transparent);
	}
	.par:first-child {
		border-top: 0;
	}
	.par-num {
		flex: none;
		width: 3rem;
		font-family: var(--font-ui);
		font-size: 0.8rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: var(--color-accent);
		text-decoration: none;
		padding-top: 0.15rem;
	}
	.par-num:hover {
		text-decoration: underline;
	}
	.par-text {
		flex: 1;
		font-family: var(--font-body);
		font-size: 0.97rem;
		line-height: 1.65;
		color: var(--color-fg);
		min-width: 0;
	}
	.par-text :global(p) {
		margin: 0 0 0.65em;
	}
	.par-text :global(p:last-child) {
		margin-bottom: 0;
	}

	@media (max-width: 640px) {
		.feast-head {
			flex-direction: column;
			align-items: flex-start;
		}
		.cluster-head {
			flex-wrap: wrap;
		}
		.cluster-refs {
			margin-left: 1.6rem;
			color: var(--color-muted);
		}
		.par {
			flex-direction: column;
			gap: 0.25rem;
		}
		.par-num {
			width: auto;
			padding-top: 0;
		}
	}
</style>
```

- [ ] **Step 2: Replace the snippet in `CalendrierReader.svelte` with the component**

Remove the `feastBlock` snippet (lines 120-181), the `expanded`/`paragraphs` state (lines 61-62), `clusterKey`/`fetchParagraphs`/`toggleCluster`/`capitalize`/`stripNotes`/`toggleAllInFeast` (lines 64-117), and the `loadParagraph`/`SvelteMap`/`SvelteSet` imports that only served them. Replace every `{@render feastBlock(feast)}` call with `<FeastBlock {feast} {showDates} />`, and remove all the CSS rules that moved into `FeastBlock.svelte` (everything from `.feast {` through the `@media (max-width: 640px)` block's `.par-num` rule — keep `.head`, `.page-kicker`, `.page-title`, `.season`, `.season-heading`).

Add the import:

```ts
import FeastBlock from './FeastBlock.svelte';
```

The resulting `<script>` block keeps only: the `feasts`/`title`/`kicker`/`showSeasonGroups`/`showDates` props, `readerFont`, `SEASON_LABELS`/`SEASON_ORDER`, and `seasonGroups`. The markup becomes:

```svelte
<main
	class="mx-auto max-w-reader px-6 max-md:px-4 py-10"
	data-corpus="calendrier"
	style:font-family={readerFont?.stack ?? undefined}
	use:scrollSpy
>
	<header class="head">
		{#if kicker}<p class="page-kicker">{kicker}</p>{/if}
		<h1 class="page-title">{title}</h1>
	</header>

	{#if seasonGroups}
		{#each seasonGroups as group (group.key)}
			<section class="season" aria-labelledby="season-{group.key}">
				<h3 class="season-heading" id="season-{group.key}">{group.label}</h3>
				{#each group.feasts as feast (feast.slug)}
					<FeastBlock {feast} {showDates} />
				{/each}
			</section>
		{/each}
	{:else}
		{#each feasts as feast (feast.slug)}
			<FeastBlock {feast} {showDates} />
		{/each}
	{/if}
</main>
```

- [ ] **Step 3: Manual regression check**

```bash
npm run dev
```

Visit `/calendrier/a`, `/calendrier/b`, `/calendrier/c`, and `/calendrier/solennites`. Confirm: feast titles render, clicking a cluster expands and fetches paragraphs, "Tout ouvrir"/"Tout fermer" still works, and the layout is pixel-identical to before (same fonts, spacing, hover states).

- [ ] **Step 4: Run typecheck and lint**

```bash
npm run check
npm run lint
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/calendrier/FeastBlock.svelte src/lib/components/calendrier/CalendrierReader.svelte
git commit -m "refactor(calendrier): extract FeastBlock from CalendrierReader"
```

---

## Task 9: Client-side date resolution + feast lookup

Pure, fully unit-testable functions — no Svelte here. This is what the today card and the picker both call.

**Files:**
- Create: `src/lib/utils/calendrierDateLookup.ts`
- Test: `tests/unit/utils/calendrierDateLookup.test.ts`

**Interfaces:**
- Produces: `toIsoDate`, `previousSunday`, `nextSunday`, `findRow`, `resolveToday`, `resolvePickedDate`, `resolveFeastForRow`, `type ResolvedDay`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/utils/calendrierDateLookup.test.ts
import { describe, it, expect } from 'vitest';
import {
	toIsoDate,
	previousSunday,
	nextSunday,
	resolveToday,
	resolvePickedDate
} from '../../../src/lib/utils/calendrierDateLookup';
import type { CalendrierDatesIndexFile } from '../../../src/lib/data/types';

const index: CalendrierDatesIndexFile = {
	rangeStart: '2024-01-01',
	rangeEnd: '2024-12-31',
	rows: [
		{ date: '2024-01-14', slug: 'deuxieme-dimanche-du-temps-ordinaire', corpus: 'year', yearKey: 'b' },
		{ date: '2024-03-29', slug: 'vendredi-saint-la-passion-du-seigneur', corpus: 'year', yearKey: 'b' },
		{ date: '2024-03-31', slug: 'dimanche-de-paques-la-resurrection-du-seigneur', corpus: 'year', yearKey: 'b' }
	]
};

describe('previousSunday / nextSunday', () => {
	it('snaps a weekday forward to that week’s Sunday', () => {
		expect(toIsoDate(nextSunday(new Date(2024, 0, 10)))).toBe('2024-01-14'); // Wednesday
	});
	it('leaves a Sunday unchanged when snapping forward', () => {
		expect(toIsoDate(nextSunday(new Date(2024, 0, 14)))).toBe('2024-01-14');
	});
	it('walks a weekday back to that week’s Sunday', () => {
		expect(toIsoDate(previousSunday(new Date(2024, 0, 10)))).toBe('2024-01-07');
	});
	it('walks a Sunday back a full week, not to itself', () => {
		expect(toIsoDate(previousSunday(new Date(2024, 0, 14)))).toBe('2024-01-07');
	});
});

describe('resolveToday', () => {
	it('matches when today is itself a covered Sunday', () => {
		expect(resolveToday(index, new Date(2024, 0, 14))).toEqual({
			status: 'match',
			row: index.rows[0],
			label: 'today'
		});
	});
	it('falls back to the previous Sunday on a ferial weekday', () => {
		expect(resolveToday(index, new Date(2024, 0, 17))).toEqual({
			status: 'match',
			row: index.rows[0],
			label: 'previous-sunday'
		});
	});
	it('reports out-of-range outside the index bounds', () => {
		expect(resolveToday(index, new Date(2017, 0, 1))).toEqual({ status: 'out-of-range' });
	});
});

describe('resolvePickedDate', () => {
	it('matches a fixed/moveable solemnity on its exact weekday before snapping to Sunday', () => {
		expect(resolvePickedDate(index, new Date(2024, 2, 29))).toEqual({
			// Good Friday, a Friday
			status: 'match',
			row: index.rows[1],
			label: 'picked'
		});
	});
	it('snaps a weekday forward to that week’s Sunday', () => {
		expect(resolvePickedDate(index, new Date(2024, 0, 9))).toEqual({
			// Tuesday before Jan 14
			status: 'match',
			row: index.rows[0],
			label: 'picked'
		});
	});
	it('reports no-match when nothing is nearby', () => {
		expect(resolvePickedDate(index, new Date(2024, 5, 1))).toEqual({ status: 'no-match' });
	});
});
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
npx vitest run tests/unit/utils/calendrierDateLookup.test.ts
```

Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/utils/calendrierDateLookup.ts
import type {
	CalendrierDateRow,
	CalendrierDatesIndexFile,
	CalendrierFeast,
	CalendrierFixedFeast,
	CalendrierYearKey
} from '$lib/data/types';
import { loadCalendrierYear } from '$lib/data/loaders';

export function toIsoDate(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

/** The Sunday of the same week if `d` is a weekday, else `d` unchanged. */
export function nextSunday(d: Date): Date {
	const copy = new Date(d);
	if (copy.getDay() !== 0) copy.setDate(copy.getDate() + (7 - copy.getDay()));
	return copy;
}

/**
 * The Sunday of the same week if `d` is a weekday, or a full week earlier if
 * `d` is already a Sunday — walking back from a Sunday that isn't itself
 * covered by the dataset (a rare gap week) should reach last week's Sunday,
 * not repeat the same already-failed date.
 */
export function previousSunday(d: Date): Date {
	const copy = new Date(d);
	const daysBack = copy.getDay() === 0 ? 7 : copy.getDay();
	copy.setDate(copy.getDate() - daysBack);
	return copy;
}

export function findRow(index: CalendrierDatesIndexFile, isoDate: string): CalendrierDateRow | null {
	if (isoDate < index.rangeStart || isoDate > index.rangeEnd) return null;
	return index.rows.find((r) => r.date === isoDate) ?? null;
}

export type ResolvedDay =
	| { status: 'match'; row: CalendrierDateRow; label: 'today' | 'previous-sunday' | 'picked' }
	| { status: 'no-match' }
	| { status: 'out-of-range' };

export function resolveToday(index: CalendrierDatesIndexFile, now: Date = new Date()): ResolvedDay {
	const todayIso = toIsoDate(now);
	if (todayIso < index.rangeStart || todayIso > index.rangeEnd) return { status: 'out-of-range' };

	const todayRow = findRow(index, todayIso);
	if (todayRow) return { status: 'match', row: todayRow, label: 'today' };

	const prevRow = findRow(index, toIsoDate(previousSunday(now)));
	if (prevRow) return { status: 'match', row: prevRow, label: 'previous-sunday' };

	return { status: 'no-match' };
}

export function resolvePickedDate(index: CalendrierDatesIndexFile, picked: Date): ResolvedDay {
	const pickedIso = toIsoDate(picked);
	if (pickedIso < index.rangeStart || pickedIso > index.rangeEnd) return { status: 'out-of-range' };

	const exact = findRow(index, pickedIso);
	if (exact) return { status: 'match', row: exact, label: 'picked' };

	const snappedIso = toIsoDate(nextSunday(picked));
	if (snappedIso < index.rangeStart || snappedIso > index.rangeEnd) return { status: 'out-of-range' };

	const snapped = findRow(index, snappedIso);
	if (snapped) return { status: 'match', row: snapped, label: 'picked' };

	return { status: 'no-match' };
}

/** Fetches the full feast record (with clusters) a resolved row points to. */
export async function resolveFeastForRow(
	row: CalendrierDateRow,
	fixedFeasts: (CalendrierFeast | CalendrierFixedFeast)[]
): Promise<CalendrierFeast | CalendrierFixedFeast | null> {
	if (row.corpus === 'fixed') {
		return fixedFeasts.find((f) => f.slug === row.slug) ?? null;
	}
	const year = await loadCalendrierYear(row.yearKey as CalendrierYearKey);
	return year.feasts.find((f) => f.slug === row.slug) ?? null;
}
```

- [ ] **Step 4: Run the tests**

```bash
npx vitest run tests/unit/utils/calendrierDateLookup.test.ts
```

Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/calendrierDateLookup.ts tests/unit/utils/calendrierDateLookup.test.ts
git commit -m "feat(calendrier): add client-side date resolution + feast lookup"
```

---

## Task 10: Liturgical color accent + `TodayCard` + `DatePickerCard`

**Files:**
- Create: `src/lib/components/calendrier/liturgicalColor.ts`
- Create: `src/lib/components/calendrier/TodayCard.svelte`
- Create: `src/lib/components/calendrier/DatePickerCard.svelte`

**Interfaces:**
- Consumes: `resolveToday`, `resolvePickedDate`, `resolveFeastForRow`, `type ResolvedDay` from `$lib/utils/calendrierDateLookup`; `FeastBlock` from `./FeastBlock.svelte`.
- Produces: `<TodayCard datesIndex fixedFeasts />`, `<DatePickerCard datesIndex fixedFeasts />`

- [ ] **Step 1: Color hex map**

```ts
// src/lib/components/calendrier/liturgicalColor.ts
import type { LiturgicalColor } from '$lib/data/types';

export const LITURGICAL_COLOR_HEX: Record<LiturgicalColor, string> = {
	violet: '#5b3a86',
	white: '#c9a227', // gold-leaning: a literal white border reads as "no accent"
	red: '#a4302d',
	green: '#3f6b4a',
	rose: '#c98a9c'
};
```

- [ ] **Step 2: `TodayCard.svelte`**

```svelte
<!-- src/lib/components/calendrier/TodayCard.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import type {
		CalendrierDatesIndexFile,
		CalendrierFeast,
		CalendrierFixedFeast
	} from '$lib/data/types';
	import { resolveToday, resolveFeastForRow, type ResolvedDay } from '$lib/utils/calendrierDateLookup';
	import { LITURGICAL_COLOR_HEX } from './liturgicalColor';
	import FeastBlock from './FeastBlock.svelte';

	let {
		datesIndex,
		fixedFeasts
	}: {
		datesIndex: CalendrierDatesIndexFile;
		fixedFeasts: CalendrierFixedFeast[];
	} = $props();

	let resolved: ResolvedDay | null = $state(null);
	let feast: CalendrierFeast | CalendrierFixedFeast | null = $state(null);

	onMount(async () => {
		const r = resolveToday(datesIndex);
		resolved = r;
		if (r.status === 'match') {
			feast = await resolveFeastForRow(r.row, fixedFeasts);
		}
	});
</script>

<div
	class="today-card"
	style:border-left-color={feast ? LITURGICAL_COLOR_HEX[feast.liturgicalColor] : undefined}
>
	{#if resolved === null}
		<p class="status">Chargement…</p>
	{:else if resolved.status === 'match' && feast}
		<p class="kicker">{resolved.label === 'today' ? 'Aujourd’hui' : 'Dimanche dernier'}</p>
		<FeastBlock {feast} />
	{:else}
		<p class="status">Pas de dimanche ni de grande fête à afficher aujourd’hui.</p>
	{/if}
</div>

<style>
	.today-card {
		border: 1px solid var(--color-border);
		border-left-width: 4px;
		border-radius: 6px;
		padding: 1.25rem 1.5rem;
		background: color-mix(in srgb, var(--color-border) 12%, transparent);
	}
	.kicker {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-accent);
		margin: 0 0 0.75rem;
	}
	.status {
		font-family: var(--font-body);
		font-size: 0.92rem;
		color: var(--color-subtle);
		font-style: italic;
		margin: 0;
	}
</style>
```

- [ ] **Step 3: `DatePickerCard.svelte`**

```svelte
<!-- src/lib/components/calendrier/DatePickerCard.svelte -->
<script lang="ts">
	import type {
		CalendrierDatesIndexFile,
		CalendrierFeast,
		CalendrierFixedFeast
	} from '$lib/data/types';
	import { resolvePickedDate, resolveFeastForRow, type ResolvedDay } from '$lib/utils/calendrierDateLookup';
	import { LITURGICAL_COLOR_HEX } from './liturgicalColor';
	import FeastBlock from './FeastBlock.svelte';

	let {
		datesIndex,
		fixedFeasts
	}: {
		datesIndex: CalendrierDatesIndexFile;
		fixedFeasts: CalendrierFixedFeast[];
	} = $props();

	let pickedValue: string = $state('');
	let resolved: ResolvedDay | null = $state(null);
	let feast: CalendrierFeast | CalendrierFixedFeast | null = $state(null);
	let loading: boolean = $state(false);

	async function search() {
		if (!pickedValue) return;
		loading = true;
		feast = null;
		const [y, m, d] = pickedValue.split('-').map(Number);
		const picked = new Date(y!, m! - 1, d!);
		const r = resolvePickedDate(datesIndex, picked);
		resolved = r;
		if (r.status === 'match') {
			feast = await resolveFeastForRow(r.row, fixedFeasts);
		}
		loading = false;
	}

	function reset() {
		resolved = null;
		feast = null;
		pickedValue = '';
	}
</script>

<div
	class="picker-card"
	style:border-left-color={feast ? LITURGICAL_COLOR_HEX[feast.liturgicalColor] : undefined}
>
	{#if resolved?.status === 'match' && feast}
		<div class="result-head">
			<p class="kicker">Résultat</p>
			<button type="button" class="reset-btn" onclick={reset}>Chercher une autre date</button>
		</div>
		<FeastBlock {feast} />
	{:else}
		<p class="kicker">Chercher une date</p>
		<form
			class="picker-form"
			onsubmit={(e) => {
				e.preventDefault();
				search();
			}}
		>
			<input
				type="date"
				bind:value={pickedValue}
				min={datesIndex.rangeStart}
				max={datesIndex.rangeEnd}
			/>
			<button type="submit" class="search-btn" disabled={loading}>
				{loading ? 'Recherche…' : 'Chercher'}
			</button>
		</form>
		{#if resolved?.status === 'no-match'}
			<p class="status">Aucun dimanche ou grande fête du Catéchisme ne correspond à cette date.</p>
		{:else if resolved?.status === 'out-of-range'}
			<p class="status">
				Cette date sort de la période couverte ({datesIndex.rangeStart} à {datesIndex.rangeEnd}).
			</p>
		{/if}
	{/if}
</div>

<style>
	.picker-card {
		border: 1px solid var(--color-border);
		border-left-width: 4px;
		border-radius: 6px;
		padding: 1.25rem 1.5rem;
		background: color-mix(in srgb, var(--color-border) 12%, transparent);
	}
	.kicker {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-accent);
		margin: 0 0 0.75rem;
	}
	.result-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.75rem;
	}
	.reset-btn {
		font-family: var(--font-ui);
		font-size: 0.72rem;
		font-weight: 500;
		color: var(--color-muted);
		background: none;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: 0.3rem 0.6rem;
		cursor: pointer;
		transition:
			color 150ms ease,
			border-color 150ms ease;
	}
	.reset-btn:hover {
		color: var(--color-accent);
		border-color: color-mix(in srgb, var(--color-accent) 50%, transparent);
	}
	.picker-form {
		display: flex;
		gap: 0.6rem;
		flex-wrap: wrap;
	}
	.picker-form input[type='date'] {
		flex: 1 1 auto;
		min-width: 0;
		font-family: var(--font-ui);
		font-size: 0.92rem;
		color: var(--color-fg);
		background: var(--color-panel);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: 0.5rem 0.65rem;
	}
	.picker-form input[type='date']:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 1px;
	}
	.search-btn {
		font-family: var(--font-ui);
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-bg);
		background: var(--color-accent);
		border: 0;
		border-radius: 4px;
		padding: 0.5rem 1rem;
		cursor: pointer;
	}
	.search-btn:disabled {
		opacity: 0.6;
		cursor: default;
	}
	.status {
		margin: 0.75rem 0 0;
		font-family: var(--font-body);
		font-size: 0.9rem;
		color: var(--color-subtle);
		font-style: italic;
	}

	@media (max-width: 640px) {
		.result-head {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.4rem;
		}
	}
</style>
```

- [ ] **Step 4: Typecheck and lint**

```bash
npm run check
npm run lint
```

Expected: PASS. (These two components aren't wired into any page yet, so nothing renders — Task 11 does that.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/calendrier/liturgicalColor.ts src/lib/components/calendrier/TodayCard.svelte src/lib/components/calendrier/DatePickerCard.svelte
git commit -m "feat(calendrier): add TodayCard and DatePickerCard components"
```

---

## Task 11: Wire into the landing page + full verification

**Files:**
- Modify: `src/routes/calendrier/+page.svelte`

- [ ] **Step 1: Add the imports and the new block**

```svelte
<script lang="ts">
	import type { PageData } from './$types';
	import TodayCard from '$lib/components/calendrier/TodayCard.svelte';
	import DatePickerCard from '$lib/components/calendrier/DatePickerCard.svelte';

	let { data }: { data: PageData } = $props();

	// ...existing YearCard type, YEARS constant, totalThemes derived...
</script>
```

Insert right after the `<header class="hero">...</header>` block, before `<div class="cards" ...>`:

```svelte
<div class="today-picker-row">
	<TodayCard datesIndex={data.datesIndex} fixedFeasts={data.index.fixed_feasts} />
	<DatePickerCard datesIndex={data.datesIndex} fixedFeasts={data.index.fixed_feasts} />
</div>
```

- [ ] **Step 2: Add the layout CSS**

Add alongside the existing `.cards` rule:

```css
.today-picker-row {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 1.25rem;
	margin-bottom: 2.5rem;
}
@media (max-width: 760px) {
	.today-picker-row {
		grid-template-columns: 1fr;
	}
}
```

- [ ] **Step 3: Typecheck**

```bash
npm run check
```

Expected: PASS.

- [ ] **Step 4: Manual browser verification**

```bash
npm run dev
```

Open `/calendrier` and check:
- The today card shows either today's feast (if today's a covered Sunday/feast) or last Sunday's, with a colored left border.
- The date picker: type a known date, e.g. `2024-03-29` (Good Friday) — it should resolve inline with a red left border and the Good Friday cluster content, replacing the form with a "Chercher une autre date" reset.
- Type a date with no nearby match (e.g. deep into a known ferial stretch with no adjacent covered Sunday, or a date outside 2018-2035) and confirm the inline message appears instead of an error.
- Resize to mobile width (below 760px) and confirm the two cards stack.
- Toggle dark mode (if the site has a theme switch) and confirm the cards' borders and text remain legible.

- [ ] **Step 5: Run the full test suite, lint, and typecheck**

```bash
npm run test
npm run check
npm run lint
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/routes/calendrier/+page.svelte
git commit -m "feat(calendrier): add today card and date picker to the landing page"
```
