# Verse Study Panel Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the study panel two new tabs when the reader clicks a Bible verse: `Compendium` (questions tied to the Catechism paragraphs citing the verse) and `Liturgie` (the days the verse is proclaimed at Mass, plus the days those paragraphs are proposed for meditation).

**Architecture:** A new prebuild generator inverts every Mass reading reference into a verse to day index, written as one small shard per Bible book plus a shared day table, so the panel can decide tab visibility from a few KB and load the day details only when the tab opens. On the frontend, `TabCompendium` widens from one paragraph to a list of paragraphs, and `TabLiturgie`'s card rendering is extracted into a shared component that a new `TabVerseLiturgie` reuses.

**Tech Stack:** SvelteKit 2 + Svelte 5 (runes only), TypeScript strict, Tailwind 3, Vitest (node environment, no component testing), Playwright.

**Spec:** `docs/superpowers/specs/2026-09-02-verse-study-panel-tabs-design.md`

## Global Constraints

- **Svelte runes only.** `let { x } = $props()`, `$state`, `$derived`, `$effect`, `{@render children()}`. No `export let`, no `$:`, no `<slot />`. `import { page } from '$app/state'`, never `$app/stores`.
- **No em dashes** anywhere: user-facing copy, code comments, log strings, commit messages. Use a middot (`·`), comma, parentheses, or rewrite.
- **No French thousands separators in numerals.** Write `2865`, not `2 865`.
- **No `§` in our own user-facing text.** Say "paragraphe N" or the bare number.
- **Catechism paragraphs are never "read" or "proclaimed" at Mass.** They are *proposed for meditation* ("proposé à la méditation") alongside the day's readings. Only scripture is "proclamé". This distinction is load-bearing in the Liturgie copy.
- **Run before every commit:** `npm run lint` (prettier + eslint) and `npm run check` (svelte-check + tsc). Both must be clean.
- **Review `git diff` before staging.** Other sessions may have unrelated work in progress; stage only the files named in the task.
- **Port 4173 may be occupied** by another session's Playwright run. If `npx playwright test` fails with "http://localhost:4173 is already used", do not kill the process. Create a temporary repo-local config on another port, run against it, then delete it:
  ```bash
  cat > playwright.alt.config.ts <<'EOF'
  import { defineConfig } from '@playwright/test';
  export default defineConfig({
  	webServer: { command: 'npm run build && npm run preview -- --port 4183', port: 4183 },
  	use: { baseURL: 'http://localhost:4183' },
  	testMatch: ['**/*.e2e.{ts,js}', 'tests/e2e/**/*.test.{ts,js}'],
  	workers: 1,
  	retries: 0
  });
  EOF
  npx playwright test -c playwright.alt.config.ts <testfile>
  rm -f playwright.alt.config.ts
  ```
- **Data regeneration:** `scripts/prepare-data.ts` runs at `prebuild`. To regenerate calendrier output without a full build, run `npx tsx scripts/prepare-data.ts`. Generated JSON under `static/data/` IS committed to the repo.

---

## File Structure

**Created:**

- `scripts/prepare/verseLiturgyIndex.ts` · pure builder: day sources in, shards plus day table out. No filesystem access, so it is unit-testable the way `cecLiturgyIndex.ts` is.
- `tests/unit/prepare/verseLiturgyIndex.test.ts` · unit tests for the builder and the ref normaliser.
- `src/lib/components/panels/LiturgyDayCards.svelte` · the liturgical day card list, extracted from `TabLiturgie` so two tabs share it.
- `src/lib/components/panels/TabVerseLiturgie.svelte` · the verse-context Liturgie tab, two sections.
- `static/data/calendrier/verse-liturgy/days.json` and `static/data/calendrier/verse-liturgy/{bookSlug}.json` · generated, committed.

**Modified:**

- `scripts/prepare/calendrier.ts` · assemble sources and write the new files.
- `src/lib/data/types.ts` · frontend mirrors of the new generated types.
- `src/lib/data/loaders.ts` · two cached loaders.
- `src/lib/components/panels/TabLiturgie.svelte` · card rendering moves out; behavior unchanged.
- `src/lib/components/panels/TabCompendium.svelte` · widened from one paragraph to many.
- `src/lib/components/panels/StudyPanel.svelte` · verse-context tab groups, availability, render branch.
- `src/lib/components/panels/TabBibleRefs.svelte` · new-tab links.
- `tests/e2e/study-panel.test.ts` · coverage for the new tabs.

**Deliberately untouched:** `src/lib/components/panels/ParagraphList.svelte`. Its "CEC 305" links re-target the panel in place as well as navigating, and that drill-down is the intended behavior of the Renvois, Cité dans and verse lists.

---

### Task 1: Panel page links open in a new tab

Independent of everything else and ships first so it does not ride along with the data work.

**Files:**

- Modify: `src/lib/components/panels/TabCompendium.svelte`
- Modify: `src/lib/components/panels/TabLiturgie.svelte`
- Modify: `src/lib/components/panels/TabBibleRefs.svelte`
- Test: `tests/e2e/study-panel.test.ts`

**Interfaces:**

- Consumes: nothing.
- Produces: nothing other tasks depend on. Task 6 moves some of the `TabLiturgie` markup edited here into `LiturgyDayCards.svelte`; doing this task first means the attributes travel with the move.

- [ ] **Step 1: Write the failing test**

Append to `tests/e2e/study-panel.test.ts`:

```ts
test('panel page links open in a new tab', async ({ page }) => {
	// CCC 2466 has inline bible refs; its panel Bible tab lists verse links.
	await page.goto('/cec/2466');
	const inline = page.locator('button.bible-inline').first();
	await expect(inline).toBeVisible();
	await inline.click();

	const panel = page.locator('aside[aria-label="Panneau d\'étude"]');
	await expect(panel).toBeVisible();

	// The verse reference link leaves the panel for a Bible page, so it opens
	// in a new tab rather than replacing the paragraph the reader is studying.
	const verseLink = panel.locator('a[href^="/bible/"]').first();
	await expect(verseLink).toHaveAttribute('target', '_blank');
	await expect(verseLink).toHaveAttribute('rel', /noopener/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test tests/e2e/study-panel.test.ts -g "open in a new tab"`
Expected: FAIL, `toHaveAttribute` finds no `target` on the verse link.

- [ ] **Step 3: Add the attributes**

In `TabBibleRefs.svelte`, the verse reference anchor inside the `{#each resolved}` block currently reads:

```svelte
<a
	href="/bible/{r.book.slug}/{r.chapter}{r.fromV !== undefined ? `/${r.fromV}` : ''}"
	class="font-semibold text-accent hover:underline"
>
```

Add the two attributes:

```svelte
<a
	href="/bible/{r.book.slug}/{r.chapter}{r.fromV !== undefined ? `/${r.fromV}` : ''}"
	target="_blank"
	rel="noopener noreferrer"
	class="font-semibold text-accent hover:underline"
>
```

In `TabCompendium.svelte`, the question link:

```svelte
<a
	href={`/compendium/${h.partSlug}#q-${h.number}`}
	target="_blank"
	rel="noopener noreferrer"
	class="block hover:bg-accent/5 rounded -mx-2 px-2 py-2 transition-colors"
>
```

In `TabLiturgie.svelte`, two anchors. The card title:

```svelte
<a href={feastHref(o)} target="_blank" rel="noopener noreferrer" class="card-title"
	>{card.years[0]!.title}</a
>
```

And the reading reference inside the `.refs` list:

```svelte
{#if url}
	<a href={url} target="_blank" rel="noopener noreferrer">{r.ref}</a>
{:else}
	{r.ref}
{/if}
```

Do NOT touch the `.num` buttons in `TabLiturgie` (they re-target the panel, they are not page links) and do not touch `ParagraphList.svelte` at all.

- [ ] **Step 4: Run the tests**

Run: `npx playwright test tests/e2e/study-panel.test.ts tests/e2e/liturgie-tab.test.ts`
Expected: PASS, all tests including the pre-existing ones.

- [ ] **Step 5: Lint, check, commit**

```bash
npm run lint && npm run check
git add src/lib/components/panels/TabCompendium.svelte src/lib/components/panels/TabLiturgie.svelte src/lib/components/panels/TabBibleRefs.svelte tests/e2e/study-panel.test.ts
git commit -m "feat(study-panel): page links open in a new tab"
```

---

### Task 2: Reading reference normaliser

`parseAelfRef` (`scripts/prepare/concordanceRefParser.ts`) already parses AELF-shaped refs, but 107 of 2683 refs in the corpus are psalms whose ref omits the book because the reading's `type` already says it (`"79 (80), 2ac.3bc, 15-16a, 18-19"`). This task adds the fallback that recovers them. It lives in the new module so `concordanceRefParser.ts` (shared with the archived concordance) stays untouched.

**Files:**

- Create: `scripts/prepare/verseLiturgyIndex.ts`
- Test: `tests/unit/prepare/verseLiturgyIndex.test.ts`

**Interfaces:**

- Consumes: `parseAelfRef(raw: string): ParsedRef | null` from `./concordanceRefParser.ts`, where `ParsedRef` is `{ slug: string; chapter: number; ranges: [number, number][] }`.
- Produces: `normalizeReadingRef(ref: string, type: string): string` · returns the ref with a `"Ps "` prefix when the ref begins with a digit and the reading type is `psaume` or `cantique`, otherwise the ref unchanged.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/prepare/verseLiturgyIndex.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { normalizeReadingRef } from '../../../scripts/prepare/verseLiturgyIndex';

describe('normalizeReadingRef', () => {
	it('prefixes a bookless psalm ref with Ps', () => {
		expect(normalizeReadingRef('79 (80), 2ac.3bc, 15-16a, 18-19', 'psaume')).toBe(
			'Ps 79 (80), 2ac.3bc, 15-16a, 18-19'
		);
	});

	it('prefixes a bookless cantique ref with Ps', () => {
		expect(normalizeReadingRef('97 (98), 1, 2-3ab', 'cantique')).toBe('Ps 97 (98), 1, 2-3ab');
	});

	it('leaves a psalm ref that already names its book alone', () => {
		expect(normalizeReadingRef('Ps 145 (146), 7, 8', 'psaume')).toBe('Ps 145 (146), 7, 8');
	});

	it('leaves a numbered book alone', () => {
		// "2 S 7, 4-5a" starts with a digit but the digit is the book's own
		// number, not a psalm number · prefixing it would corrupt the ref.
		expect(normalizeReadingRef('2 S 7, 4-5a.12-14a.16', 'lecture_1')).toBe('2 S 7, 4-5a.12-14a.16');
	});

	it('leaves a gospel ref alone', () => {
		expect(normalizeReadingRef('Mt 11, 2-11', 'evangile')).toBe('Mt 11, 2-11');
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/prepare/verseLiturgyIndex.test.ts`
Expected: FAIL, cannot resolve `../../../scripts/prepare/verseLiturgyIndex`.

- [ ] **Step 3: Write the minimal implementation**

Create `scripts/prepare/verseLiturgyIndex.ts`:

```ts
/**
 * A psalm or cantique reading names its book in its `type`, not in its `ref`
 * ("79 (80), 2ac.3bc, 15-16a, 18-19"), which `parseAelfRef` cannot resolve on
 * its own. Restore the implied book so the ref parses like any other.
 *
 * Only these two types, and only when the ref opens on a digit that is not
 * already followed by a book abbreviation: "2 S 7, 4-5a" also opens on a digit
 * but that digit belongs to the book's name.
 */
export function normalizeReadingRef(ref: string, type: string): string {
	if (type !== 'psaume' && type !== 'cantique') return ref;
	const trimmed = ref.trim();
	if (!/^\d/.test(trimmed)) return ref;
	// "2 S 7, ..." · a digit, then a letter word before the chapter number.
	if (/^\d\s+[A-Za-zÀ-ÿ]/.test(trimmed)) return ref;
	return `Ps ${trimmed}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/prepare/verseLiturgyIndex.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Lint, check, commit**

```bash
npm run lint && npm run check
git add scripts/prepare/verseLiturgyIndex.ts tests/unit/prepare/verseLiturgyIndex.test.ts
git commit -m "feat(calendrier): normalise bookless psalm reading refs"
```

---

### Task 3: The verse liturgy index builder

**Files:**

- Modify: `scripts/prepare/verseLiturgyIndex.ts`
- Test: `tests/unit/prepare/verseLiturgyIndex.test.ts`

**Interfaces:**

- Consumes: `normalizeReadingRef` from Task 2; `parseAelfRef` from `./concordanceRefParser.ts`; `SeasonKey` and `LiturgicalColor` types from `./calendrier.ts`.
- Produces:
  - `interface VerseLiturgyDay` · the day table row (fields listed in the code below).
  - `interface VerseLiturgySource` · `{ day: VerseLiturgyDay; readings: { type: string; ref: string }[] }`.
  - `type VerseLiturgyBookShard = Record<string, Record<string, number[]>>` · chapter to verse to day indices.
  - `interface VerseLiturgyIndex` · `{ days: VerseLiturgyDay[]; books: Record<string, VerseLiturgyBookShard>; skipped: number }`.
  - `buildVerseLiturgyIndex(sources: VerseLiturgySource[]): VerseLiturgyIndex`.

- [ ] **Step 1: Write the failing test**

Append to `tests/unit/prepare/verseLiturgyIndex.test.ts` (keep the existing `normalizeReadingRef` describe block, and extend the import at the top of the file):

```ts
import {
	normalizeReadingRef,
	buildVerseLiturgyIndex,
	type VerseLiturgyDay,
	type VerseLiturgySource
} from '../../../scripts/prepare/verseLiturgyIndex';

function day(slug: string, over: Partial<VerseLiturgyDay> = {}): VerseLiturgyDay {
	return {
		slug,
		title: slug,
		season: 'avent',
		color: 'violet',
		kind: 'year',
		readings: [],
		...over
	};
}

function source(
	d: VerseLiturgyDay,
	readings: { type: string; ref: string }[]
): VerseLiturgySource {
	return { day: { ...d, readings }, readings };
}

describe('buildVerseLiturgyIndex', () => {
	it('maps every verse of a range to its day', () => {
		const idx = buildVerseLiturgyIndex([
			source(day('avent-3'), [{ type: 'evangile', ref: 'Mt 11, 2-11' }])
		]);
		expect(idx.days).toHaveLength(1);
		const verses = idx.books['matthieu']!['11']!;
		expect(Object.keys(verses).sort((a, b) => Number(a) - Number(b))).toEqual([
			'2',
			'3',
			'4',
			'5',
			'6',
			'7',
			'8',
			'9',
			'10',
			'11'
		]);
		expect(verses['5']).toEqual([0]);
	});

	it('records a day once when two of its readings hit the same verse', () => {
		const idx = buildVerseLiturgyIndex([
			source(day('doublon'), [
				{ type: 'lecture_1', ref: 'Jn 3, 16' },
				{ type: 'evangile', ref: 'Jn 3, 16-18' }
			])
		]);
		expect(idx.books['jean']!['3']!['16']).toEqual([0]);
	});

	it('lists days in source order for a shared verse', () => {
		const idx = buildVerseLiturgyIndex([
			source(day('premier'), [{ type: 'evangile', ref: 'Jn 3, 16' }]),
			source(day('second'), [{ type: 'evangile', ref: 'Jn 3, 16' }])
		]);
		expect(idx.books['jean']!['3']!['16']).toEqual([0, 1]);
	});

	it('handles a bookless psalm ref through the normaliser', () => {
		const idx = buildVerseLiturgyIndex([
			source(day('psaume-jour'), [{ type: 'psaume', ref: '97 (98), 1, 2-3ab' }])
		]);
		// parseAelfRef prefers the parenthesised Hebrew numbering, so this is
		// psalm 98, not 97.
		expect(idx.books['psaumes']!['98']!['1']).toEqual([0]);
	});

	it('skips a ref spanning two chapters and counts it', () => {
		const idx = buildVerseLiturgyIndex([
			source(day('rameaux'), [{ type: 'evangile', ref: 'Mt 26, 14 – 27, 66' }])
		]);
		expect(idx.books['matthieu']).toBeUndefined();
		expect(idx.skipped).toBe(1);
	});

	it('keeps a day out of the table when none of its refs parse', () => {
		const idx = buildVerseLiturgyIndex([
			source(day('illisible'), [{ type: 'evangile', ref: 'pas une référence' }])
		]);
		expect(idx.days).toHaveLength(0);
		expect(idx.skipped).toBe(1);
	});

	it('carries the day fields the panel renders', () => {
		const idx = buildVerseLiturgyIndex([
			source(
				day('ferie', {
					kind: 'weekday',
					weekdayCycle: 'II',
					title: 'Jeudi de la 1re semaine',
					readingsKey: 'II:avent-1-jeudi'
				}),
				[{ type: 'evangile', ref: 'Mt 7, 21' }]
			)
		]);
		expect(idx.days[0]).toMatchObject({
			slug: 'ferie',
			kind: 'weekday',
			weekdayCycle: 'II',
			readingsKey: 'II:avent-1-jeudi',
			readings: [{ type: 'evangile', ref: 'Mt 7, 21' }]
		});
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/prepare/verseLiturgyIndex.test.ts`
Expected: FAIL, `buildVerseLiturgyIndex` is not exported.

- [ ] **Step 3: Write the implementation**

Append to `scripts/prepare/verseLiturgyIndex.ts`:

```ts
import { parseAelfRef } from './concordanceRefParser.ts';
import type { SeasonKey, LiturgicalColor } from './calendrier.ts';

/**
 * One day the panel can show for a verse. Deliberately carries no CEC clusters:
 * the verse tab gets its paragraph programme from the CEC liturgy index
 * instead, and leaving clusters out is most of why the shards stay small.
 */
export interface VerseLiturgyDay {
	slug: string;
	title: string;
	season: SeasonKey;
	color: LiturgicalColor;
	/**
	 * Stated rather than derived. `CecLiturgyOccasion` infers the day type from
	 * the presence of `cycle` / `date`, which weekdays break: they carry a cycle
	 * that is I or II rather than a, b or c.
	 */
	kind: 'year' | 'fixed' | 'proper' | 'weekday';
	/** Sundays and solemnities of the three-year cycle. */
	cycle?: 'a' | 'b' | 'c';
	/** Ferial days, the two-year first-reading cycle. */
	weekdayCycle?: 'I' | 'II';
	/** Fixed feasts only, e.g. "2 Février". */
	date?: string;
	/** Fixed feasts only, so the frontend can order them by calendar month. */
	monthIndex?: number;
	/** Absent when no AELF reading was ever fetched for this day. */
	readingsKey?: string;
	/** References only. The full text is fetched lazily by `readingsKey`. */
	readings: { type: string; ref: string }[];
}

export interface VerseLiturgySource {
	day: VerseLiturgyDay;
	readings: { type: string; ref: string }[];
}

/** Chapter number to verse number to indices into the day table. */
export type VerseLiturgyBookShard = Record<string, Record<string, number[]>>;

export interface VerseLiturgyIndex {
	days: VerseLiturgyDay[];
	/** Keyed by book slug, the form `parseAelfRef` returns. */
	books: Record<string, VerseLiturgyBookShard>;
	/** Refs that could not be parsed, so the build can report a regression. */
	skipped: number;
}

/**
 * Inverts every day's Mass readings into a verse to days index.
 *
 * A day enters the table only once one of its refs parses, so days whose
 * readings are all unparseable leave no empty row behind. Source order is
 * preserved: callers pass années a/b/c, then fixed feasts, then the propre,
 * then the ferial cycles, and each verse's day list comes back in that order.
 */
export function buildVerseLiturgyIndex(sources: VerseLiturgySource[]): VerseLiturgyIndex {
	const days: VerseLiturgyDay[] = [];
	const books: Record<string, VerseLiturgyBookShard> = {};
	let skipped = 0;

	for (const { day, readings } of sources) {
		// Assigned on the first ref that parses, so an all-unparseable day
		// never reaches the table.
		let at = -1;
		for (const r of readings) {
			const parsed = parseAelfRef(normalizeReadingRef(r.ref, r.type));
			if (!parsed) {
				skipped++;
				continue;
			}
			if (at === -1) at = days.push(day) - 1;
			const shard = (books[parsed.slug] ??= {});
			const chapter = (shard[String(parsed.chapter)] ??= {});
			for (const [from, to] of parsed.ranges) {
				for (let v = from; v <= to; v++) {
					const list = (chapter[String(v)] ??= []);
					// Two readings of the same day may overlap on a verse.
					if (list[list.length - 1] !== at) list.push(at);
				}
			}
		}
	}

	return { days, books, skipped };
}
```

Note the import of `normalizeReadingRef` is not needed: it is defined in this same file, above.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/prepare/verseLiturgyIndex.test.ts`
Expected: PASS, 12 tests (5 from Task 2, 7 here).

- [ ] **Step 5: Lint, check, commit**

```bash
npm run lint && npm run check
git add scripts/prepare/verseLiturgyIndex.ts tests/unit/prepare/verseLiturgyIndex.test.ts
git commit -m "feat(calendrier): build the verse to liturgical day index"
```

---

### Task 4: Generate the index files

**Files:**

- Modify: `scripts/prepare/calendrier.ts` (the `liturgySources` block near line 559, and the writes that follow it)

**Interfaces:**

- Consumes: `buildVerseLiturgyIndex`, `VerseLiturgySource`, `VerseLiturgyDay` from Task 3.
- Produces: `static/data/calendrier/verse-liturgy/days.json` (a `VerseLiturgyDay[]`) and `static/data/calendrier/verse-liturgy/{bookSlug}.json` (a `VerseLiturgyBookShard` each).

There is no unit test for this task: it is filesystem wiring around an already-tested pure function. Its verification is the generated output.

- [ ] **Step 1: Add the import**

At the top of `scripts/prepare/calendrier.ts`, beside the existing `import { buildCecLiturgyIndex, type CecLiturgySource } from './cecLiturgyIndex.ts';`:

```ts
import {
	buildVerseLiturgyIndex,
	type VerseLiturgySource,
	type VerseLiturgyDay
} from './verseLiturgyIndex.ts';
```

- [ ] **Step 2: Assemble the sources**

Immediately after the existing `const liturgyIndex = buildCecLiturgyIndex(liturgySources);` and its shard-writing loop, add:

```ts
// Reverse index for the verse study panel's Liturgie tab: Bible verse to the
// days it is proclaimed on. Unlike the CEC index above this DOES include the
// ferial cycles · "when is this verse read at Mass" is mostly answered by
// weekdays, and the day table is kept small enough to afford them by carrying
// no CEC clusters.
const verseSources: VerseLiturgySource[] = [];
const pushVerseSource = (day: VerseLiturgyDay, key: string) => {
	const readings = refsFor(key);
	if (!readings || readings.length === 0) return;
	verseSources.push({ day: { ...day, readings }, readings });
};

for (const yf of yearFiles) {
	for (const feast of yf.feasts) {
		pushVerseSource(
			{
				slug: feast.slug,
				title: feast.title,
				season: feast.season,
				color: feast.liturgicalColor,
				kind: 'year',
				cycle: yf.key,
				readingsKey: readingsKey(feast.slug, yf.key),
				readings: []
			},
			readingsKey(feast.slug, yf.key)
		);
	}
}
for (const feast of fixed) {
	pushVerseSource(
		{
			slug: feast.slug,
			title: feast.title,
			season: feast.season,
			color: feast.liturgicalColor,
			kind: 'fixed',
			date: feast.date,
			monthIndex: feast.month_index,
			readingsKey: readingsKey(feast.slug),
			readings: []
		},
		readingsKey(feast.slug)
	);
}
for (const feast of properFeasts) {
	pushVerseSource(
		{
			slug: feast.slug,
			title: feast.title,
			season: feast.season,
			color: feast.liturgicalColor,
			kind: 'proper',
			readingsKey: readingsKey(feast.slug),
			readings: []
		},
		readingsKey(feast.slug)
	);
}
for (const cycleKey of ['I', 'II'] as const) {
	for (const t of weekdayTargets.filter((w) => w.cycle === cycleKey)) {
		const key = readingsKey(t.slug, cycleKey);
		pushVerseSource(
			{
				slug: t.slug,
				title: formatWeekdayTitle(t.season, t.weekOfSeason, t.dayOfWeek),
				season: t.season,
				color: colorsBySlug.get(t.slug) ?? 'white',
				kind: 'weekday',
				weekdayCycle: cycleKey,
				readingsKey: key,
				readings: []
			},
			key
		);
	}
}
```

`formatWeekdayTitle` needs adding to the existing `import { buildWeekdayFeast, buildProperFeast } from './weekdayReadings.ts';` line. Check its signature in `scripts/prepare/weekdayReadings.ts:33` before calling it and match the argument order it actually declares.

- [ ] **Step 3: Write the files**

Directly after the source assembly:

```ts
const verseIndex = buildVerseLiturgyIndex(verseSources);
const verseDir = join(outDir, 'verse-liturgy');
mkdirSync(verseDir, { recursive: true });
writeFileSync(join(verseDir, 'days.json'), JSON.stringify(verseIndex.days));
for (const [bookSlug, shard] of Object.entries(verseIndex.books)) {
	writeFileSync(join(verseDir, `${bookSlug}.json`), JSON.stringify(shard));
}
console.log(
	`  verse liturgy index: ${verseIndex.days.length} days, ${Object.keys(verseIndex.books).length} books, ${verseIndex.skipped} refs skipped`
);
```

- [ ] **Step 4: Regenerate and verify the output**

Run: `npx tsx scripts/prepare-data.ts`

Expected in the log: a line reporting roughly 800 days, roughly 66 books, and roughly 100 refs skipped. Then verify the shape and size:

```bash
ls static/data/calendrier/verse-liturgy | wc -l          # expect ~67
du -sh static/data/calendrier/verse-liturgy              # expect well under 1MB
node -e "
const d=require('./static/data/calendrier/verse-liturgy/days.json');
const m=require('./static/data/calendrier/verse-liturgy/matthieu.json');
console.log('days',d.length,'kinds',[...new Set(d.map(x=>x.kind))].sort());
const idx=m['6']['33'];
console.log('Mt 6,33 days:', (idx||[]).map(i=>d[i].title));
"
```

Expected: `kinds` contains all four of `fixed`, `proper`, `weekday`, `year`. If `Mt 6, 33` returns an empty list that is acceptable data (not every verse is read); pick another verse from the shard to eyeball a title.

Also confirm the file-count headroom is still fine, since Cloudflare Pages caps a deployment at 20000 files:

```bash
find static -type f | wc -l   # expect well under 20000
```

- [ ] **Step 5: Lint, check, commit**

```bash
npm run lint && npm run check
git add scripts/prepare/calendrier.ts static/data/calendrier/verse-liturgy
git commit -m "feat(calendrier): emit the verse to liturgical day index"
```

---

### Task 5: Frontend types and loaders

**Files:**

- Modify: `src/lib/data/types.ts`
- Modify: `src/lib/data/loaders.ts`

**Interfaces:**

- Consumes: the generated files from Task 4.
- Produces:
  - In `types.ts`: `VerseLiturgyDay`, `VerseLiturgyBookShard` (frontend mirrors, matching the generator's field names exactly).
  - In `loaders.ts`: `loadVerseLiturgyBook(bookSlug: string, fetcher?: Fetch): Promise<VerseLiturgyBookShard>` and `loadVerseLiturgyDays(fetcher?: Fetch): Promise<VerseLiturgyDay[]>`.

- [ ] **Step 1: Add the types**

In `src/lib/data/types.ts`, after the `CecLiturgyBucket` interface:

```ts
/**
 * Mirrors `VerseLiturgyDay` in scripts/prepare/verseLiturgyIndex.ts, keep in
 * sync. One day a Bible verse is proclaimed at Mass on.
 */
export interface VerseLiturgyDay {
	slug: string;
	title: string;
	season: CalendrierSeason;
	color: LiturgicalColor;
	kind: 'year' | 'fixed' | 'proper' | 'weekday';
	cycle?: CalendrierYearKey;
	weekdayCycle?: 'I' | 'II';
	date?: string;
	monthIndex?: number;
	readingsKey?: string;
	readings: CecLiturgyReadingRef[];
}

/**
 * One book's shard of the verse to liturgy index: chapter to verse to indices
 * into the day table in verse-liturgy/days.json. Fetched to decide whether the
 * verse Liturgie tab has anything, so it carries no day details.
 */
export type VerseLiturgyBookShard = Record<string, Record<string, number[]>>;
```

- [ ] **Step 2: Add the loaders**

In `src/lib/data/loaders.ts`, add `VerseLiturgyDay` and `VerseLiturgyBookShard` to the big `import type { ... } from './types'` block, then, next to the existing `loadCecLiturgy`:

```ts
const verseLiturgyBookCache = new Map<string, Promise<VerseLiturgyBookShard>>();
let verseLiturgyDaysPromise: Promise<VerseLiturgyDay[]> | null = null;

/**
 * One book's verse to day shard. A book with no reading ever drawn from it has
 * no file, so a 404 is ordinary and resolves to an empty shard.
 */
export function loadVerseLiturgyBook(
	bookSlug: string,
	fetcher: Fetch = fetch
): Promise<VerseLiturgyBookShard> {
	let p = verseLiturgyBookCache.get(bookSlug);
	if (!p) {
		p = (async () => {
			const res = await fetcher(`/data/calendrier/verse-liturgy/${bookSlug}.json`);
			if (res.status === 404) return {};
			if (!res.ok) {
				throw new Error(`calendrier: failed to load verse liturgy shard ${bookSlug}: ${res.status}`);
			}
			return (await res.json()) as VerseLiturgyBookShard;
		})().catch((e) => {
			verseLiturgyBookCache.delete(bookSlug);
			throw e;
		});
		verseLiturgyBookCache.set(bookSlug, p);
	}
	return p;
}

/**
 * The day table the shards index into. Loaded only when the Liturgie tab is
 * actually opened · deciding whether to show the tab needs the shard alone.
 */
export function loadVerseLiturgyDays(fetcher: Fetch = fetch): Promise<VerseLiturgyDay[]> {
	if (!verseLiturgyDaysPromise) {
		verseLiturgyDaysPromise = fetchJson<VerseLiturgyDay[]>(
			'/data/calendrier/verse-liturgy/days.json',
			fetcher
		);
	}
	return verseLiturgyDaysPromise;
}
```

Match the surrounding file's conventions: check how `fetchJson` and the `Fetch` type are declared near the top of `loaders.ts` and how `loadCecLiturgy` handles its 404, and follow those exactly.

- [ ] **Step 3: Verify types compile**

Run: `npm run check`
Expected: 0 errors, 0 warnings.

- [ ] **Step 4: Commit**

```bash
npm run lint
git add src/lib/data/types.ts src/lib/data/loaders.ts
git commit -m "feat(loaders): verse liturgy shard and day table loaders"
```

---

### Task 6: Extract LiturgyDayCards from TabLiturgie

A pure refactor. `TabLiturgie` must render and behave exactly as before; `tests/e2e/liturgie-tab.test.ts` is the regression guard and must pass unchanged.

**Files:**

- Create: `src/lib/components/panels/LiturgyDayCards.svelte`
- Modify: `src/lib/components/panels/TabLiturgie.svelte`

**Interfaces:**

- Consumes: `CecLiturgyOccasion`, `CecLiturgyCluster`, `CalendrierReadingsEntry` from `$lib/data/types`; `loadCalendrierReading` from `$lib/data/loaders`; `LITURGICAL_COLOR_VAR`; `bibleRefUrl`.
- Produces: `LiturgyDayCards.svelte` with props

  ```ts
  let {
  	cards,
  	highlight = new Set<number>(),
  	showParagraphs = true
  }: {
  	cards: Card[];
  	highlight?: Set<number>;
  	showParagraphs?: boolean;
  } = $props();
  ```

  and, from its `<script lang="ts" module>` block, these exports that Task 8 imports:

  ```ts
  /**
   * A liturgical day as the cards render it. Widens `CecLiturgyOccasion` with
   * the ferial cycle, which the CEC index never carries (it covers no
   * weekdays) but the verse index does · `feastHref` needs it to build the
   * /feries/ route.
   */
  export type LiturgyCardOccasion = CecLiturgyOccasion & { weekdayCycle?: 'I' | 'II' };
  export type Card = { key: string; years: LiturgyCardOccasion[] };
  export function dayKey(o: LiturgyCardOccasion): string;
  export function toCards(list: LiturgyCardOccasion[]): Card[];
  export function bySeason(cards: Card[]): Card[];
  ```

- [ ] **Step 1: Confirm the guard passes before touching anything**

Run: `npx playwright test tests/e2e/liturgie-tab.test.ts`
Expected: PASS. If it does not pass before the refactor, stop and report: the guard is worthless otherwise.

- [ ] **Step 2: Create the component**

Create `src/lib/components/panels/LiturgyDayCards.svelte`. Move these from `TabLiturgie.svelte` verbatim except where noted:

- the `SEASON_LABELS`, `SEASON_ORDER` and `READING_LABELS` constants
- the `Card` type plus `dayKey`, `toCards` and `bySeason`, all into a `<script lang="ts" module>` block so `TabLiturgie` and `TabVerseLiturgie` both import them from here rather than keeping copies. `TabLiturgie` loses its own definitions and imports them back.
- `shown`, `meta`, `feastHref`, `refLabel`, `capitalize`, `themeLabel`, `tokens`, `loadText`, `toggle`, `pickYear`
- the `picked`, `expanded`, `readingText`, `readingBusy`, `readingRequest` state
- the whole `{#snippet cardList(cards)}` body, becoming the component's markup
- the entire `<style>` block except `.section-head`, `.section-head.with-gap` and `.source-note`, which stay in `TabLiturgie` (they label the sections, not the cards)

Three changes to the moved code:

1. `tokens` and the `.num` markup take the highlight set instead of the single `current` number:

```ts
type Token = { label: string; target: number; highlighted: boolean };

/**
 * Folds a cluster's paragraphs back into the source's own notation
 * (484-494, 2087), breaking whichever run holds a highlighted paragraph so it
 * shows as a number of its own · a run links to its first paragraph.
 */
function tokens(paragraphs: number[]): Token[] {
	const sorted = [...new Set(paragraphs)].sort((a, b) => a - b);
	const out: Token[] = [];
	let i = 0;
	while (i < sorted.length) {
		const start = sorted[i]!;
		if (highlight.has(start)) {
			out.push({ label: String(start), target: start, highlighted: true });
			i++;
			continue;
		}
		let end = start;
		while (i + 1 < sorted.length && sorted[i + 1] === end + 1 && !highlight.has(sorted[i + 1]!)) {
			end = sorted[++i]!;
		}
		i++;
		out.push({ label: start === end ? String(start) : `${start}-${end}`, target: start, highlighted: false });
	}
	return out;
}
```

2. The `holds` check on a cluster becomes `cluster.paragraphs.some((p) => highlight.has(p))`, and `t.current` in the markup becomes `t.highlighted`.

3. `feastHref` and `meta` learn about ferial days, which the CEC index never produced:

```ts
/** Each kind of day lives at its own route · see /calendrier-liturgique. */
function feastHref(o: LiturgyCardOccasion): string {
	if (o.weekdayCycle) return `/calendrier-liturgique/feries/${o.weekdayCycle.toLowerCase()}/${o.slug}`;
	if (o.cycle) return `/calendrier-liturgique/${o.cycle}/${o.slug}`;
	if (o.date) return `/calendrier-liturgique/solennites/${o.slug}`;
	return `/calendrier-liturgique/propre/${o.slug}`;
}

function meta(card: Card): string {
	const o = card.years[0]!;
	const season = SEASON_LABELS[o.season];
	if (o.weekdayCycle) return `${season} · Semaine ${o.weekdayCycle}`;
	if (o.date) return `${season} · ${o.date}`;
	if (!o.cycle) return season;
	const years = card.years.flatMap((y) => (y.cycle ? [y.cycle.toUpperCase()] : []));
	return `${season} · ${years.length > 1 ? 'Années' : 'Année'} ${years.join(', ')}`;
}
```

The `weekdayCycle` check comes first in both: a ferial day has no `cycle` and no `date`, so without it every weekday would fall through to the propre route.

4. The theme and numbers block is wrapped so the proclamation section can omit it:

```svelte
{#if showParagraphs}
	{#each o.clusters as cluster, ci (ci)}
		{@const holds = cluster.paragraphs.some((p) => highlight.has(p))}
		<p class="theme" class:is-current={holds}>{themeLabel(o, cluster)}</p>
		<p class="nums">
			<!-- unchanged from TabLiturgie, with t.current renamed to t.highlighted -->
		</p>
	{/each}
{/if}
```

Keep the `target="_blank" rel="noopener noreferrer"` attributes Task 1 added to the card title and reading ref anchors.

- [ ] **Step 3: Reduce TabLiturgie to use it**

`TabLiturgie.svelte` keeps: the data-loading `$effect`, `dayKey`, `toCards`, `bySeason`, the three `$derived` card lists, `dayCount`, `current`, the section headings, and the `.section-head` / `.source-note` styles. It renders:

```svelte
<LiturgyDayCards cards={sundayCards} highlight={highlightSet} />
```

with

```ts
const highlightSet = $derived(new Set([current]));
```

Everything else that moved is deleted from `TabLiturgie`.

- [ ] **Step 4: Run the guard**

Run: `npx playwright test tests/e2e/liturgie-tab.test.ts tests/e2e/study-panel.test.ts`
Expected: PASS, unchanged. Any failure means the refactor altered behavior; fix the component rather than the test.

- [ ] **Step 5: Lint, check, commit**

```bash
npm run lint && npm run check
git add src/lib/components/panels/LiturgyDayCards.svelte src/lib/components/panels/TabLiturgie.svelte
git commit -m "refactor(study-panel): extract LiturgyDayCards from TabLiturgie"
```

---

### Task 7: Compendium tab accepts a verse context

**Files:**

- Modify: `src/lib/components/panels/TabCompendium.svelte`
- Test: `tests/e2e/study-panel.test.ts`

**Interfaces:**

- Consumes: `loadBibleVerseIndex` from `$lib/data/loaders`, `BOOKS` from `$lib/utils/bibleBookSlug`.
- Produces: nothing other tasks consume. Task 9 makes the tab reachable.

Until Task 9 wires the tab strip, this tab is not reachable from a verse in the UI. Write the e2e test here anyway and expect it to fail on the missing tab; it turns green in Task 9. Note that in the step below so the executor is not surprised.

- [ ] **Step 1: Write the test (will stay red until Task 9)**

Append to `tests/e2e/study-panel.test.ts`:

```ts
test('the verse panel offers a Compendium tab of related questions', async ({ page }) => {
	await page.goto('/bible/matthieu/6');
	await page.locator('#v33 .verse-row').click();

	const panel = page.locator('aside[aria-label="Panneau d\'étude"]');
	await expect(panel).toBeVisible();

	await panel.getByRole('button', { name: 'Compendium' }).click();
	// Questions surface through the CCC paragraphs citing the verse, so the
	// tab says so rather than implying the question quotes the verse.
	await expect(panel.getByText(/paragraphes du Catéchisme qui citent ce verset/i)).toBeVisible();
	await expect(panel.locator('a[href^="/compendium/"]').first()).toBeVisible();
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx playwright test tests/e2e/study-panel.test.ts -g "Compendium tab of related"`
Expected: FAIL, no button named Compendium (the tab strip still shows only CEC).

- [ ] **Step 3: Widen the effect**

In `TabCompendium.svelte`, replace the `if (ctx?.kind !== 'paragraph')` guard and the single `const paragraph = ctx.paragraph;` with a paragraph-list resolution, and add a `fromVerse` flag for the copy:

```ts
let hits: Hit[] = $state([]);
let loaded = $state(false);
let fromVerse = $state(false);

$effect(() => {
	const ctx = $studyPanel.context;
	if (ctx?.kind !== 'paragraph' && ctx?.kind !== 'verse') {
		hits = [];
		loaded = false;
		return;
	}
	fromVerse = ctx.kind === 'verse';
	(async () => {
		loaded = false;
		// A paragraph context asks about one paragraph. A verse context asks
		// about every paragraph citing that verse, so its questions are the
		// union over them.
		let paragraphs: number[];
		if (ctx.kind === 'paragraph') {
			paragraphs = [ctx.paragraph];
		} else {
			const verseIdx = await loadBibleVerseIndex();
			paragraphs =
				verseIdx[ctx.verseUsfx]?.[String(ctx.verseChapter)]?.[String(ctx.verseVerse)] ?? [];
		}

		const [citedBy, ranges] = await Promise.all([
			loadCompendiumCitedBy(),
			loadCompendiumQRanges()
		]);
		const qNumbers = [...new Set(paragraphs.flatMap((p) => citedBy[p] ?? []))].sort(
			(a, b) => a - b
		);
		if (qNumbers.length === 0) {
			hits = [];
			loaded = true;
			return;
		}
		// ... the rest of the existing body, unchanged, operating on qNumbers
	})();
});
```

Add `loadBibleVerseIndex` to the existing loaders import.

- [ ] **Step 4: Update the copy**

Above the `<ul>`, add the provenance note, and branch the empty state:

```svelte
{#if !loaded}
	<p class="text-muted italic font-ui text-sm">Chargement…</p>
{:else if hits.length === 0}
	<p class="text-muted italic font-ui text-sm">
		{fromVerse
			? "Aucune question du Compendium n'est liée à ce verset."
			: 'Aucune question du Compendium ne cite ce paragraphe.'}
	</p>
{:else}
	{#if fromVerse}
		<p class="font-ui text-xs text-muted mb-3">
			Questions liées aux paragraphes du Catéchisme qui citent ce verset.
		</p>
	{/if}
	<ul class="space-y-4">
		<!-- unchanged -->
	</ul>
{/if}
```

- [ ] **Step 5: Confirm the paragraph context still works**

Run: `npx playwright test tests/e2e/compendium.test.ts tests/e2e/study-panel.test.ts -g "Compendium"`
Expected: the pre-existing Compendium tests PASS. The new verse test still FAILS on the missing tab button; that is expected until Task 9.

- [ ] **Step 6: Lint, check, commit**

```bash
npm run lint && npm run check
git add src/lib/components/panels/TabCompendium.svelte tests/e2e/study-panel.test.ts
git commit -m "feat(study-panel): Compendium tab accepts a verse context"
```

---

### Task 8: The verse Liturgie tab

**Files:**

- Create: `src/lib/components/panels/TabVerseLiturgie.svelte`

**Interfaces:**

- Consumes: `loadVerseLiturgyBook`, `loadVerseLiturgyDays`, `loadBibleVerseIndex`, `loadCecLiturgy` from `$lib/data/loaders`; `LiturgyDayCards` and its `Card` type from Task 6; `BOOKS` from `$lib/utils/bibleBookSlug`.
- Produces: the component Task 9 renders.

Not reachable in the UI until Task 9, same as Task 7.

- [ ] **Step 1: Write the component**

Create `src/lib/components/panels/TabVerseLiturgie.svelte`. Structure:

```svelte
<script lang="ts">
	import { studyPanel } from '$lib/stores/studyPanel';
	import {
		loadVerseLiturgyBook,
		loadVerseLiturgyDays,
		loadBibleVerseIndex,
		loadCecLiturgy
	} from '$lib/data/loaders';
	import type { VerseLiturgyDay, CecLiturgyOccasion } from '$lib/data/types';
	import { BOOKS } from '$lib/utils/bibleBookSlug';
	import LiturgyDayCards, {
		toCards,
		bySeason,
		type Card
	} from './LiturgyDayCards.svelte';

	let proclaimed: VerseLiturgyDay[] = $state([]);
	let meditated: CecLiturgyOccasion[] = $state([]);
	let citing: number[] = $state([]);
	let loaded = $state(false);

	$effect(() => {
		const ctx = $studyPanel.context;
		if (ctx?.kind !== 'verse') {
			proclaimed = [];
			meditated = [];
			loaded = false;
			return;
		}
		(async () => {
			loaded = false;
			const slug = BOOKS.find((b) => b.usfx === ctx.verseUsfx)?.slug;
			// The shard alone answers "is this verse ever read"; the day table
			// is only worth fetching once we know it is.
			const shard = slug ? await loadVerseLiturgyBook(slug) : {};
			const dayIdx = shard[String(ctx.verseChapter)]?.[String(ctx.verseVerse)] ?? [];
			const days = dayIdx.length > 0 ? await loadVerseLiturgyDays() : [];
			proclaimed = dayIdx.map((i) => days[i]).filter((d): d is VerseLiturgyDay => d != null);

			const verseIdx = await loadBibleVerseIndex();
			citing = verseIdx[ctx.verseUsfx]?.[String(ctx.verseChapter)]?.[String(ctx.verseVerse)] ?? [];
			// Shards are cached per paragraph hundred, so ten paragraphs is
			// typically two or three requests.
			const perParagraph = await Promise.all(citing.map((p) => loadCecLiturgy(p)));
			const seen = new Set<string>();
			meditated = perParagraph.flat().filter((o) => {
				const id = `${o.cycle ?? ''}:${o.slug}`;
				if (seen.has(id)) return false;
				seen.add(id);
				return true;
			});
			loaded = true;
		})();
	});
</script>
```

For rendering, convert both lists to `Card[]`. `proclaimed` is a `VerseLiturgyDay[]` and `LiturgyDayCards` takes `CecLiturgyOccasion[]` per card, so map each day to an occasion-shaped object with `clusters: []` (harmless: `showParagraphs={false}` means clusters are never read):

```ts
function toProclaimedCards(days: VerseLiturgyDay[]): Card[] {
	// One card per day. Unlike the CEC tab there is no grouping across années:
	// a verse read on the same Sunday in A and B is genuinely two occurrences.
	return days.map((d) => ({
		key: `${d.weekdayCycle ?? d.cycle ?? ''}:${d.slug}`,
		years: [
			{
				slug: d.slug,
				title: d.title,
				season: d.season,
				color: d.color,
				...(d.cycle ? { cycle: d.cycle } : {}),
				// Carried through so feastHref can build the /feries/ route.
				...(d.weekdayCycle ? { weekdayCycle: d.weekdayCycle } : {}),
				...(d.date ? { date: d.date, monthIndex: d.monthIndex } : {}),
				clusters: [],
				...(d.readingsKey ? { readingsKey: d.readingsKey } : {}),
				readings: d.readings
			}
		]
	}));
}
```

Derive the section lists. `proclaimed` splits by `kind`; `meditated` reuses the imported `toCards` / `bySeason`:

```ts
const SECTIONS: { kind: VerseLiturgyDay['kind']; label: string }[] = [
	{ kind: 'year', label: 'Dimanches et solennités' },
	{ kind: 'fixed', label: 'Fêtes fixes' },
	{ kind: 'proper', label: 'Autres jours du calendrier' },
	{ kind: 'weekday', label: 'Jours de semaine' }
];

const proclaimedSections = $derived(
	SECTIONS.map((s) => ({
		...s,
		cards: toProclaimedCards(proclaimed.filter((d) => d.kind === s.kind))
	})).filter((s) => s.cards.length > 0)
);
const meditatedCards = $derived(bySeason(toCards(meditated)));
const highlightSet = $derived(new Set(citing));
```

Markup, with copy that respects the meditation rule:

```svelte
{#if !loaded}
	<p class="text-muted italic font-ui text-sm">Chargement…</p>
{:else if proclaimed.length === 0 && meditated.length === 0}
	<p class="text-muted italic font-ui text-sm">
		Ce verset n'est proclamé aucun jour du calendrier liturgique.
	</p>
{:else}
	{#if proclaimed.length > 0}
		<h3 class="section-head">Proclamé à la messe</h3>
		<p class="text-muted text-xs mb-3 font-ui">
			Ce verset est proclamé {proclaimed.length === 1 ? 'un jour' : `${proclaimed.length} jours`} :
		</p>
		{#each proclaimedSections as section (section.kind)}
			<h4 class="section-sub">{section.label}</h4>
			<LiturgyDayCards cards={section.cards} showParagraphs={false} />
		{/each}
	{/if}
	{#if meditatedCards.length > 0}
		<h3 class="section-head" class:with-gap={proclaimed.length > 0}>Paragraphes à méditer</h3>
		<p class="text-muted text-xs mb-3 font-ui">
			Les paragraphes du Catéchisme qui citent ce verset sont proposés à la méditation ces jours-là :
		</p>
		<LiturgyDayCards cards={meditatedCards} highlight={highlightSet} />
	{/if}
{/if}
```

Copy the `.section-head` and `.section-head.with-gap` styles from `TabLiturgie`, and add a `.section-sub` for the inner headings, one step quieter than `.section-head`:

```css
.section-sub {
	font-family: var(--font-ui);
	font-size: 11px;
	font-weight: 600;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: var(--color-subtle);
	margin: 14px 0 8px;
}
.section-sub:first-of-type {
	margin-top: 0;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run check`
Expected: 0 errors. The component is not yet rendered anywhere, so this is the only check available until Task 9.

- [ ] **Step 3: Lint and commit**

```bash
npm run lint
git add src/lib/components/panels/TabVerseLiturgie.svelte
git commit -m "feat(study-panel): verse Liturgie tab component"
```

---

### Task 9: Wire the tabs into the panel

Makes Tasks 7 and 8 reachable and turns their tests green.

**Files:**

- Modify: `src/lib/components/panels/StudyPanel.svelte`
- Test: `tests/e2e/study-panel.test.ts`

**Interfaces:**

- Consumes: `TabVerseLiturgie` (Task 8), the widened `TabCompendium` (Task 7), `loadVerseLiturgyBook` and `loadBibleVerseIndex` and `loadCompendiumCitedBy` and `loadCecLiturgy` from `$lib/data/loaders`.
- Produces: the finished feature.

`PanelTab` needs no new members: `compendium` and `liturgie` already exist and are reused for the verse context.

- [ ] **Step 1: Write the failing test**

Append to `tests/e2e/study-panel.test.ts`:

```ts
test('the verse panel offers a Liturgie tab with both sections', async ({ page }) => {
	await page.goto('/bible/matthieu/6');
	await page.locator('#v33 .verse-row').click();

	const panel = page.locator('aside[aria-label="Panneau d\'étude"]');
	await expect(panel).toBeVisible();
	await panel.getByRole('button', { name: 'Liturgie' }).click();

	// Catechism paragraphs are proposed for meditation, never proclaimed ·
	// only the scripture section may use "proclamé".
	await expect(panel.getByRole('heading', { name: 'Paragraphes à méditer' })).toBeVisible();
	await expect(panel.getByText(/proposés à la méditation/i)).toBeVisible();
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx playwright test tests/e2e/study-panel.test.ts -g "Liturgie tab with both"`
Expected: FAIL, no button named Liturgie.

- [ ] **Step 3: Add verse availability state**

In `StudyPanel.svelte`, add state beside the existing availability flags:

```ts
let verseHasCompendium = $state(false);
let verseHasLiturgie = $state(false);
```

In the availability `$effect`, the branch that currently lumps `verse` in with `trent-paragraph` and `denzinger-entry` must split: keep the other two as they are, and give `verse` its own async branch:

```ts
if (ctx.kind === 'verse') {
	paragraph = null;
	citedByList = [];
	hasEnBref = false;
	compendiumCiters = [];
	cdseCiters = [];
	hasThemes = false;
	hasLiturgie = false;
	hasAudio = false;
	dataReady = false;
	(async () => {
		const verseIdx = await loadBibleVerseIndex();
		const citing =
			verseIdx[ctx.verseUsfx]?.[String(ctx.verseChapter)]?.[String(ctx.verseVerse)] ?? [];
		const slug = BOOKS.find((b) => b.usfx === ctx.verseUsfx)?.slug;
		const [compendiumCB, shard, perParagraph] = await Promise.all([
			loadCompendiumCitedBy(),
			slug ? loadVerseLiturgyBook(slug) : Promise.resolve({}),
			Promise.all(citing.map((p) => loadCecLiturgy(p)))
		]);
		verseHasCompendium = citing.some((p) => (compendiumCB[p]?.length ?? 0) > 0);
		const proclaimedCount =
			shard[String(ctx.verseChapter)]?.[String(ctx.verseVerse)]?.length ?? 0;
		verseHasLiturgie = proclaimedCount > 0 || perParagraph.some((list) => list.length > 0);
		dataReady = true;
	})();
	return;
}
```

Add `loadVerseLiturgyBook` to the loaders import (`BOOKS` and `loadBibleVerseIndex` may already be imported; check before adding).

- [ ] **Step 4: Return the verse tab groups**

Replace the single-group verse branch in `visibleGroups`:

```ts
if (ctx?.kind === 'verse') {
	const children: TabDef[] = [{ id: 'bible-verse', label: 'CEC' }];
	if (!dataReady || verseHasCompendium) children.push({ id: 'compendium', label: 'Compendium' });
	if (!dataReady || verseHasLiturgie) children.push({ id: 'liturgie', label: 'Liturgie' });
	return [{ id: 'bible-verse', label: 'CEC', children }];
}
```

The optimistic `!dataReady` gates match how the paragraph branch avoids snapping the active tab away while data loads.

- [ ] **Step 5: Render the tab**

Add to the `{:else if}` chain, beside the existing `activeTab === 'liturgie' && context?.kind === 'paragraph'` branch:

```svelte
{:else if $studyPanel.activeTab === 'liturgie' && $studyPanel.context?.kind === 'verse'}
	<TabVerseLiturgie />
```

Import `TabVerseLiturgie` at the top with the other tab components. `TabCompendium`'s existing branch already has no context guard, so it serves the verse context without change.

- [ ] **Step 6: Run the full panel suite**

Run: `npx playwright test tests/e2e/study-panel.test.ts tests/e2e/liturgie-tab.test.ts tests/e2e/compendium.test.ts`
Expected: PASS, including the Task 7 Compendium test that has been red until now.

- [ ] **Step 7: Run everything**

```bash
npm run lint && npm run check && npm run test
npx playwright test
```

Expected: all green. Report any failure with its output rather than working around it.

- [ ] **Step 8: Commit**

```bash
git add src/lib/components/panels/StudyPanel.svelte tests/e2e/study-panel.test.ts
git commit -m "feat(study-panel): Compendium and Liturgie tabs for a Bible verse"
```

---

## Verification checklist

After Task 9, confirm by hand in `npm run dev`:

- [ ] Clicking a verse with citing paragraphs shows three tabs: CEC, Compendium, Liturgie.
- [ ] Clicking a verse with no citing paragraphs and no Mass reading shows only CEC.
- [ ] The Compendium tab's note names the paragraphs as the link, not the verse.
- [ ] The Liturgie tab's first section says "proclamé", the second says "proposés à la méditation", and neither says the reverse.
- [ ] Weekday cards link to `/calendrier-liturgique/feries/{i|ii}/{slug}` and the link resolves.
- [ ] Panel page links open in a new tab; the "CEC NNN" links in Renvois still re-target the panel in place.
- [ ] The CEC paragraph panel's own Liturgie tab is unchanged.
