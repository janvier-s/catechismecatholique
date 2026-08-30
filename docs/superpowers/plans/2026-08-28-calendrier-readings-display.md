# Calendrier Readings Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show each curated feast's real Mass reading text (already fetched into `static/data/calendrier/readings.json`) on every `/calendrier/*` reader page, lazy-loaded per feast so no page pays for readings it doesn't display.

**Architecture:** Split the single 1.4MB `readings.json` into one small JSON file per feast at build time, add a frontend loader that lazy-fetches one feast's file on demand (mirroring how `FeastBlock` already lazy-fetches CEC paragraphs per cluster), and add a collapsed-by-default "Lectures du jour" section to `FeastBlock` that renders whatever comes back.

**Tech Stack:** SvelteKit 2 / Svelte 5 runes, TypeScript strict, vitest, Playwright (e2e), tsx (build scripts).

**Spec:** `docs/superpowers/specs/2026-08-28-calendrier-readings-display-design.md`

## Global Constraints

- No em dashes in any user-facing copy, code comment, or log string — use middot (`·`), comma, or rewrite.
- No French thousands separators in numerals.
- No `§` markers in user-facing text.
- Svelte components use runes only (`$props()`, `$state()`, `$derived()`, `$effect()`) — no `export let`, no `$:`.
- `CalendrierReading`/`CalendrierReadingsFile` (and the new `CalendrierReadingsEntry`, `readingsKey`, `readingsFilename`) are mirrored between `scripts/prepare/calendrier.ts` (build-time) and `src/lib/data/` (frontend) — the build script cannot import from `src/lib`, so each side keeps its own copy with a comment pointing at the other.
- Reader HTML content (AELF's `contenu`, `refrain_psalmique`, `verset_evangile`) gets a `reader-prose` class so the global font-size/line-height preferences apply, per this project's convention.
- **Environment note:** `npm run prepare-data` (and therefore `npm run build`/`npm run dev`'s `predev`/`prebuild` hooks) checks for this project's main CCC/NCL source symlinks (`scripts/data-sources/ccc_paras_processed.json`, `scripts/data-sources/ncl/francl_usfx.xml`, etc.) before doing anything. In this environment those symlinks' targets are not mounted, so the check fails, generated data already exists, and the whole pipeline prints "skipping rebuild" and returns immediately — `prepareCalendrier()` is never reached. Calendrier's own sources (`scripts/data-sources/calendrier/CCC_Liturgy_List.txt`, `readings.json`) are real local files unaffected by this, so Task 6 below calls `prepareCalendrier()` directly rather than through `npm run prepare-data`.

---

## Task 1: Build layer — split `readings.json` into per-feast files

**Files:**
- Modify: `scripts/prepare/calendrier.ts`
- Test: `tests/unit/prepare/calendrier-readings-filename.test.ts`

**Interfaces:**
- Produces: `readingsFilename(key: string): string`, exported from `scripts/prepare/calendrier.ts` alongside the existing `readingsKey`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/prepare/calendrier-readings-filename.test.ts
import { describe, it, expect } from 'vitest';
import { readingsFilename, readingsKey } from '../../../scripts/prepare/calendrier';

describe('readingsFilename', () => {
	it('replaces the colon in a year-scoped key with a double dash', () => {
		expect(readingsFilename('a:premier-dimanche-de-lavent')).toBe(
			'a--premier-dimanche-de-lavent'
		);
	});

	it('leaves a bare fixed-feast slug unchanged', () => {
		expect(readingsFilename('la-solennite-de-noel')).toBe('la-solennite-de-noel');
	});

	it('round-trips through readingsKey for a year-scoped feast', () => {
		const key = readingsKey('deuxieme-dimanche-du-temps-ordinaire', 'b');
		expect(readingsFilename(key)).toBe('b--deuxieme-dimanche-du-temps-ordinaire');
	});
});
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
npx vitest run tests/unit/prepare/calendrier-readings-filename.test.ts
```

Expected: FAIL with "readingsFilename is not exported" (or similar).

- [ ] **Step 3: Implement `readingsFilename`**

In `scripts/prepare/calendrier.ts`, immediately after the existing `readingsKey` function (around line 111):

```ts
/**
 * Maps a readingsKey() value to a filesystem/URL-safe filename - a colon
 * isn't a great character for either. Mirrored in
 * src/lib/data/calendrierReadingsKey.ts for the frontend loader.
 */
export function readingsFilename(key: string): string {
	return key.replace(':', '--');
}
```

- [ ] **Step 4: Run the test again**

```bash
npx vitest run tests/unit/prepare/calendrier-readings-filename.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 5: Replace the single `readings.json` write with one file per feast**

In `scripts/prepare/calendrier.ts`, find this line near the end of `prepareCalendrier` (currently the last statement before the function's closing `return`):

```ts
	writeFileSync(join(outDir, 'readings.json'), JSON.stringify(readings));
```

Replace it with:

```ts
	const readingsDir = join(outDir, 'readings');
	mkdirSync(readingsDir, { recursive: true });
	for (const [key, entry] of Object.entries(readings)) {
		writeFileSync(join(readingsDir, `${readingsFilename(key)}.json`), JSON.stringify(entry));
	}
```

- [ ] **Step 6: Typecheck**

```bash
npm run check
```

Expected: PASS, no new errors.

- [ ] **Step 7: Run the existing calendrier build-coverage test**

```bash
npx vitest run tests/unit/prepare/calendrier-romcal-ids.test.ts tests/unit/prepare/calendrier-readings-merge.test.ts
```

Expected: PASS. This confirms `prepareCalendrier()` still runs end-to-end against the real source directory (`calendrier-romcal-ids.test.ts` calls it directly) and that `mergeReadings` itself is untouched.

- [ ] **Step 8: Commit**

```bash
git add scripts/prepare/calendrier.ts tests/unit/prepare/calendrier-readings-filename.test.ts
git commit -m "feat(calendrier): write one readings file per feast instead of one big file"
```

---

## Task 2: Frontend types and key/filename mirror

**Files:**
- Modify: `src/lib/data/types.ts`
- Create: `src/lib/data/calendrierReadingsKey.ts`
- Test: `tests/unit/data/calendrier-readings-key.test.ts`

**Interfaces:**
- Consumes: `CalendrierYearKey` from `./types`
- Produces: `CalendrierReadingsEntry` (type, in `types.ts`), `readingsKey(slug: string, yearKey?: CalendrierYearKey): string`, `readingsFilename(key: string): string` (both in `calendrierReadingsKey.ts`)

- [ ] **Step 1: Split `CalendrierReadingsEntry` out of `CalendrierReadingsFile`**

In `src/lib/data/types.ts`, find the existing block (around line 843, right after the `CalendrierReading` interface comment block):

```ts
export interface CalendrierReadingsFile {
	[slug: string]: {
		date: string;
		lectures: CalendrierReading[];
	};
}
```

Replace it with:

```ts
export interface CalendrierReadingsEntry {
	date: string;
	lectures: CalendrierReading[];
}

export interface CalendrierReadingsFile {
	[key: string]: CalendrierReadingsEntry;
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run check
```

Expected: PASS. `CalendrierReadingsFile`'s shape is unchanged, only named differently, so nothing that references it breaks.

- [ ] **Step 3: Write the failing test for the frontend key/filename mirror**

```ts
// tests/unit/data/calendrier-readings-key.test.ts
import { describe, it, expect } from 'vitest';
import { readingsKey, readingsFilename } from '$lib/data/calendrierReadingsKey';

describe('readingsKey', () => {
	it('prefixes the year key for a year-scoped feast', () => {
		expect(readingsKey('premier-dimanche-de-lavent', 'a')).toBe('a:premier-dimanche-de-lavent');
	});

	it('returns the bare slug for a fixed feast', () => {
		expect(readingsKey('la-solennite-de-noel')).toBe('la-solennite-de-noel');
	});
});

describe('readingsFilename', () => {
	it('replaces the colon in a year-scoped key with a double dash', () => {
		expect(readingsFilename('a:premier-dimanche-de-lavent')).toBe(
			'a--premier-dimanche-de-lavent'
		);
	});

	it('leaves a bare fixed-feast slug unchanged', () => {
		expect(readingsFilename('la-solennite-de-noel')).toBe('la-solennite-de-noel');
	});
});
```

- [ ] **Step 4: Run it to confirm it fails**

```bash
npx vitest run tests/unit/data/calendrier-readings-key.test.ts
```

Expected: FAIL with "Cannot find module '$lib/data/calendrierReadingsKey'".

- [ ] **Step 5: Implement the mirror module**

```ts
// src/lib/data/calendrierReadingsKey.ts
import type { CalendrierYearKey } from './types';

/**
 * Mirrors readingsKey() in scripts/prepare/calendrier.ts - keep in sync.
 * The key readings are stored under: bare slug for a fixed feast (no cycle
 * variation), or "{yearKey}:{slug}" for a annee-scoped Sunday/feast.
 */
export function readingsKey(slug: string, yearKey?: CalendrierYearKey): string {
	return yearKey ? `${yearKey}:${slug}` : slug;
}

/**
 * Mirrors readingsFilename() in scripts/prepare/calendrier.ts - keep in sync.
 * Maps a readingsKey() value to the filesystem/URL-safe filename it was
 * written under.
 */
export function readingsFilename(key: string): string {
	return key.replace(':', '--');
}
```

- [ ] **Step 6: Run the test again**

```bash
npx vitest run tests/unit/data/calendrier-readings-key.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add src/lib/data/types.ts src/lib/data/calendrierReadingsKey.ts tests/unit/data/calendrier-readings-key.test.ts
git commit -m "feat(calendrier): add CalendrierReadingsEntry type and frontend readingsKey/readingsFilename mirror"
```

---

## Task 3: `loadCalendrierReading` loader

**Files:**
- Modify: `src/lib/data/loaders.ts`
- Test: `tests/unit/loaders.test.ts`

**Interfaces:**
- Consumes: `readingsKey`, `readingsFilename` from `./calendrierReadingsKey`; `CalendrierReadingsEntry`, `CalendrierYearKey` from `./types`
- Produces: `loadCalendrierReading(slug: string, yearKey?: CalendrierYearKey, fetcher?: Fetch): Promise<CalendrierReadingsEntry | null>`

- [ ] **Step 1: Write the failing tests**

Add to `tests/unit/loaders.test.ts` (new `describe` block at the end of the file):

```ts
describe('loadCalendrierReading', () => {
	it('resolves the fetched entry on success', async () => {
		const fetcher = vi.fn(() =>
			Promise.resolve({
				ok: true,
				status: 200,
				json: async () => ({ date: '2025-11-30', lectures: [] })
			})
		) as unknown as typeof fetch;
		const { loadCalendrierReading } = await import('$lib/data/loaders');
		const entry = await loadCalendrierReading('premier-dimanche-de-lavent', 'a', fetcher);
		expect(entry?.date).toBe('2025-11-30');
		expect(fetcher).toHaveBeenCalledWith(
			'/data/calendrier/readings/a--premier-dimanche-de-lavent.json'
		);
	});

	it('resolves to null on a 404 (a known AELF gap)', async () => {
		const fetcher = vi.fn(() =>
			Promise.resolve({ ok: false, status: 404 })
		) as unknown as typeof fetch;
		const { loadCalendrierReading } = await import('$lib/data/loaders');
		const entry = await loadCalendrierReading('second-dimanche-apres-noel', 'a', fetcher);
		expect(entry).toBeNull();
	});

	it('rejects on a non-404 failure and does not cache the rejection', async () => {
		let calls = 0;
		const fetcher = vi.fn(() => {
			calls++;
			if (calls === 1) return Promise.resolve({ ok: false, status: 500 });
			return Promise.resolve({
				ok: true,
				status: 200,
				json: async () => ({ date: '2026-01-01', lectures: [] })
			});
		}) as unknown as typeof fetch;
		const { loadCalendrierReading } = await import('$lib/data/loaders');
		await expect(loadCalendrierReading('la-solennite-de-noel', undefined, fetcher)).rejects.toThrow();
		const entry = await loadCalendrierReading('la-solennite-de-noel', undefined, fetcher);
		expect(entry?.date).toBe('2026-01-01');
	});
});
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
npx vitest run tests/unit/loaders.test.ts -t loadCalendrierReading
```

Expected: FAIL with "loadCalendrierReading is not exported" (or similar).

- [ ] **Step 3: Add the `CalendrierReadingsEntry` import**

In `src/lib/data/loaders.ts`, add `CalendrierReadingsEntry` to the existing `import type { ... } from '$lib/data/types'` block (alongside `CalendrierYearKey`, around line 27).

Add a new import line right after that block:

```ts
import { readingsKey, readingsFilename } from './calendrierReadingsKey';
```

- [ ] **Step 4: Implement the loader**

Add near `loadCalendrierYear` (after its closing brace, around line 674):

```ts
const calendrierReadingCache = new Map<string, Promise<CalendrierReadingsEntry | null>>();

/**
 * Lazily fetch one feast's Mass reading text. Resolves null when the feast
 * is one of the known AELF gaps (its file was never written, so the request
 * 404s) - that is expected data, not a failure. Any other fetch failure
 * rejects and drops the cache entry so a retry isn't stuck replaying the
 * same rejection, mirroring loadNclBook's cache-and-drop-on-rejection.
 */
export function loadCalendrierReading(
	slug: string,
	yearKey?: CalendrierYearKey,
	fetcher: Fetch = fetch
): Promise<CalendrierReadingsEntry | null> {
	const key = readingsKey(slug, yearKey);
	let p = calendrierReadingCache.get(key);
	if (!p) {
		p = (async () => {
			const res = await fetcher(`/data/calendrier/readings/${readingsFilename(key)}.json`);
			if (res.status === 404) return null;
			if (!res.ok) {
				throw new Error(`calendrier: failed to load reading for "${key}": ${res.status}`);
			}
			return (await res.json()) as CalendrierReadingsEntry;
		})().catch((e) => {
			calendrierReadingCache.delete(key);
			throw e;
		});
		calendrierReadingCache.set(key, p);
	}
	return p;
}
```

- [ ] **Step 5: Run the tests again**

```bash
npx vitest run tests/unit/loaders.test.ts -t loadCalendrierReading
```

Expected: PASS (3 tests).

- [ ] **Step 6: Typecheck and run the full unit suite**

```bash
npm run check
npx vitest run
```

Expected: both PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/data/loaders.ts tests/unit/loaders.test.ts
git commit -m "feat(calendrier): add loadCalendrierReading loader"
```

---

## Task 4: `FeastBlock` — render the readings section

**Files:**
- Modify: `src/lib/components/calendrier/FeastBlock.svelte`

**Interfaces:**
- Consumes: `loadCalendrierReading` from `$lib/data/loaders`; `CalendrierReadingsEntry`, `CalendrierReading`, `CalendrierYearKey` from `$lib/data/types`
- Produces: `FeastBlock` now accepts an additional optional prop `yearKey?: CalendrierYearKey`

This task has no isolated unit test of its own (it is markup/interaction on
an existing component) - it is verified by the e2e tests in Task 7 and by
manual browser verification in Task 6's integration step. Typecheck and the
existing suite are the gate here.

- [ ] **Step 1: Add the `yearKey` prop and reading-state**

In `src/lib/components/calendrier/FeastBlock.svelte`, change the `$props()` destructure:

```ts
	import type {
		CalendrierFeast,
		CalendrierFixedFeast,
		CalendrierReadingsEntry,
		CalendrierYearKey,
		Paragraph
	} from '$lib/data/types';
	import { loadParagraph, loadCalendrierReading } from '$lib/data/loaders';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';

	let {
		feast,
		yearKey,
		showDates = false
	}: {
		feast: CalendrierFeast | CalendrierFixedFeast;
		yearKey?: CalendrierYearKey;
		showDates?: boolean;
	} = $props();

	let readingsExpanded = $state(false);
	let readingsState: 'idle' | 'loading' | 'unavailable' | CalendrierReadingsEntry = $state('idle');

	const READING_LABELS: Record<string, string> = {
		lecture_1: 'Première lecture',
		lecture_2: 'Deuxième lecture',
		psaume: 'Psaume',
		cantique: 'Cantique',
		sequence: 'Séquence',
		evangile: 'Évangile'
	};

	async function toggleReadings() {
		readingsExpanded = !readingsExpanded;
		if (!readingsExpanded || readingsState !== 'idle') return;
		readingsState = 'loading';
		try {
			const entry = await loadCalendrierReading(feast.slug, yearKey);
			readingsState = entry ?? 'unavailable';
		} catch {
			readingsState = 'unavailable';
		}
	}
```

(This replaces the existing `let { feast, showDates = false }: {...} = $props();` line and the imports at the top of the `<script>` block; the rest of the existing script - `expanded`, `paragraphs`, `fetchParagraphs`, `toggleCluster`, `capitalize`, `stripNotes`, `toggleAllInFeast` - stays exactly as it is.)

- [ ] **Step 2: Add the readings section to the markup**

In the same file, insert this block right after the `</header>` closing tag of `.feast-head` and before `<ul class="clusters">`:

```svelte
	<section class="readings">
		<button
			type="button"
			class="readings-toggle"
			class:is-open={readingsExpanded}
			onclick={toggleReadings}
			aria-expanded={readingsExpanded}
		>
			<span class="caret" aria-hidden="true">{readingsExpanded ? '▾' : '▸'}</span>
			<span class="readings-label">Lectures du jour</span>
		</button>
		{#if readingsExpanded}
			<div class="readings-body">
				{#if readingsState === 'loading'}
					<p class="loading">Chargement…</p>
				{:else if readingsState === 'unavailable'}
					<p class="status">Lectures indisponibles pour cette fête.</p>
				{:else if readingsState !== 'idle'}
					{#each readingsState.lectures as lecture, i (i)}
						<article class="reading">
							<p class="reading-head">
								<span class="reading-type">{READING_LABELS[lecture.type] ?? lecture.type}</span>
								<span class="reading-ref">{lecture.ref}</span>
							</p>
							{#if lecture.intro_lue}
								<p class="reading-intro">{lecture.intro_lue}</p>
							{:else if lecture.titre}
								<p class="reading-intro">{lecture.titre}</p>
							{/if}
							{#if lecture.type === 'psaume' && lecture.refrain_psalmique}
								<div class="reading-refrain reader-prose">
									<!-- eslint-disable-next-line svelte/no-at-html-tags -->
									{@html lecture.refrain_psalmique}
								</div>
							{/if}
							{#if lecture.type === 'evangile' && lecture.verset_evangile}
								<div class="reading-verset reader-prose">
									<!-- eslint-disable-next-line svelte/no-at-html-tags -->
									{@html lecture.verset_evangile}
									{#if lecture.ref_verset}<span class="verset-ref">{lecture.ref_verset}</span>{/if}
								</div>
							{/if}
							<div class="reading-contenu reader-prose">
								<!-- eslint-disable-next-line svelte/no-at-html-tags -->
								{@html lecture.contenu}
							</div>
						</article>
					{/each}
				{/if}
			</div>
		{/if}
	</section>
```

- [ ] **Step 3: Style the new section**

In the `<style>` block, add (near the `.open-all`/`.clusters` rules, so it reads next to the styling it visually resembles):

```css
	.readings {
		margin-bottom: 1.25rem;
	}
	.readings-toggle {
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
		font-family: var(--font-ui);
		transition: background-color 120ms ease;
	}
	.readings-toggle:hover {
		background: color-mix(in srgb, var(--color-accent) 6%, transparent);
	}
	.readings-toggle.is-open {
		background: color-mix(in srgb, var(--color-accent) 8%, transparent);
	}
	.readings-toggle .caret {
		flex: none;
		font-size: 0.85rem;
		color: var(--color-muted);
		width: 0.9rem;
		text-align: center;
	}
	.readings-toggle.is-open .caret {
		color: var(--color-accent);
	}
	.readings-label {
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-subtle);
	}
	.readings-toggle.is-open .readings-label {
		color: var(--color-fg);
	}
	.readings-body {
		padding: 0.5rem 0.4rem 0.25rem 1.6rem;
	}
	.reading {
		padding: 0.75rem 0;
		border-top: 1px dashed color-mix(in srgb, var(--color-border) 70%, transparent);
	}
	.reading:first-child {
		border-top: 0;
	}
	.reading-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.6rem;
		margin: 0 0 0.3rem;
	}
	.reading-type {
		font-family: var(--font-ui);
		font-size: 0.78rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-subtle);
	}
	.reading-ref {
		font-family: var(--font-ui);
		font-size: 0.78rem;
		font-weight: 500;
		font-variant-numeric: tabular-nums lining-nums;
		color: var(--color-accent);
		white-space: nowrap;
	}
	.reading-intro {
		font-family: var(--font-body);
		font-style: italic;
		font-size: 0.88rem;
		color: var(--color-muted);
		margin: 0 0 0.5rem;
	}
	.reading-refrain,
	.reading-verset {
		font-style: italic;
		font-size: 0.92rem;
		color: var(--color-muted);
		margin: 0 0 0.5rem;
	}
	.verset-ref {
		margin-left: 0.4rem;
		font-family: var(--font-ui);
		font-style: normal;
		font-size: 0.78rem;
		color: var(--color-accent);
	}
	.reading-contenu {
		font-size: 0.97rem;
		line-height: 1.65;
		color: var(--color-fg);
	}
```

- [ ] **Step 4: Typecheck and lint**

```bash
npm run check
npm run lint
```

Expected: PASS. If prettier reformats the new markup/styles, that is expected - re-run `npm run lint` after it applies the fix, it should then pass clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/calendrier/FeastBlock.svelte
git commit -m "feat(calendrier): render Lectures du jour in FeastBlock"
```

---

## Task 5: Plumb `yearKey` through every `FeastBlock` caller

**Files:**
- Modify: `src/lib/components/calendrier/CalendrierReader.svelte`
- Modify: `src/routes/calendrier/[annee]/+page.svelte`
- Modify: `src/lib/components/calendrier/TodayCard.svelte`
- Modify: `src/lib/components/calendrier/DatePickerCard.svelte`

**Interfaces:**
- Consumes: `FeastBlock`'s new `yearKey?: CalendrierYearKey` prop (Task 4); `CalendrierYearKey` from `$lib/data/types`; `PageData.yearKey` (already produced by `+page.ts`, unchanged in this plan)

- [ ] **Step 1: `CalendrierReader.svelte` accepts and forwards `yearKey`**

In `src/lib/components/calendrier/CalendrierReader.svelte`, add `CalendrierYearKey` to the existing `import type { ... } from '$lib/data/types'` line, then change the props and both `<FeastBlock>` call sites:

```ts
	let {
		feasts,
		title,
		kicker,
		showSeasonGroups = false,
		showDates = false,
		yearKey
	}: {
		feasts: (CalendrierFeast | CalendrierFixedFeast)[];
		title: string;
		kicker?: string;
		showSeasonGroups?: boolean;
		showDates?: boolean;
		yearKey?: CalendrierYearKey;
	} = $props();
```

```svelte
					<FeastBlock {feast} {showDates} {yearKey} />
```

(this line appears twice in the file - once inside the `{#each group.feasts as feast (feast.slug)}` loop, once inside the `{#each feasts as feast (feast.slug)}` loop - update both)

- [ ] **Step 2: `[annee]/+page.svelte` passes `data.yearKey`**

In `src/routes/calendrier/[annee]/+page.svelte`:

```svelte
<CalendrierReader
	feasts={data.feasts}
	title={data.title}
	kicker={data.kicker}
	showSeasonGroups={data.mode === 'year'}
	showDates={data.mode === 'fixed'}
	yearKey={data.mode === 'year' ? data.yearKey : undefined}
/>
```

- [ ] **Step 3: `TodayCard.svelte` passes the resolved row's `yearKey`**

In `src/lib/components/calendrier/TodayCard.svelte`, change the `<FeastBlock>` call:

```svelte
{#if resolved?.status === 'match' && feast}
	<FeastBlock {feast} yearKey={resolved.row.yearKey} />
{/if}
```

- [ ] **Step 4: `DatePickerCard.svelte` passes the resolved row's `yearKey`**

In `src/lib/components/calendrier/DatePickerCard.svelte`, change the `<FeastBlock>` call:

```svelte
			<FeastBlock {feast} yearKey={resolved?.row.yearKey} />
```

(`resolved` is guaranteed non-null in this branch - it is the `{#if resolved?.status === 'match' && feast}` branch - but the optional-chain keeps this line consistent with how `resolved` is accessed elsewhere in the file.)

- [ ] **Step 5: Typecheck**

```bash
npm run check
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/calendrier/CalendrierReader.svelte src/routes/calendrier/\[annee\]/+page.svelte src/lib/components/calendrier/TodayCard.svelte src/lib/components/calendrier/DatePickerCard.svelte
git commit -m "feat(calendrier): pass yearKey to FeastBlock from every caller"
```

---

## Task 6: Regenerate build output, remove the stale flat file, verify

**Files:**
- Delete: `static/data/calendrier/readings.json`
- Create (generated): `static/data/calendrier/readings/*.json` (182 files)

**Interfaces:**
- Consumes: everything from Tasks 1-5

This is the integration task: it actually runs the now-modified build
script for real, so the frontend loader from Task 3 has real files to fetch
against before Task 7 writes e2e tests that depend on them existing.

- [ ] **Step 1: Regenerate the calendrier build output**

`npm run prepare-data` will NOT work for this: its `predev`/`prebuild`
pipeline checks for the main CCC/NCL source symlinks first and, when their
targets are missing (as they are in this environment - `scripts/data-sources/`
holds symlinks to `../../../DOCTRINA/...` and `../../../../SCRIPTURA/...`
paths that may not be mounted), it prints "skipping rebuild" and returns
before ever reaching `prepareCalendrier()`. Calendrier's own sources
(`scripts/data-sources/calendrier/CCC_Liturgy_List.txt` and `readings.json`)
are real local files, unaffected by that check, so call `prepareCalendrier`
directly instead of going through the full pipeline:

```bash
npx tsx -e "
import { prepareCalendrier } from './scripts/prepare/calendrier.ts';
const result = await prepareCalendrier({
	sourceDir: 'scripts/data-sources/calendrier',
	outDir: 'static/data/calendrier'
});
console.log(result);
"
```

Expected: completes without error and prints an object with `totalFeasts`,
`totalFixed`, `totalClusters` (Task 1's `mergeReadings` call and fail-loud
behavior are unchanged, only what happens with its result differs). If
`npm run prepare-data` happens to complete this step for you instead (e.g.
running on a machine where the symlink targets are mounted), that is fine
too - either path produces the same `static/data/calendrier/` output.

- [ ] **Step 2: Verify the new file layout and remove the old one**

```bash
ls static/data/calendrier/readings/ | wc -l
node -e "console.log(require('./static/data/calendrier/readings/a--la-solennite-de-noel.json'))" | head -5
rm static/data/calendrier/readings.json
git status --short static/data/calendrier/
```

Expected: the count is 182 (matches the previously-verified curated feast
count minus the 8 known gaps), the Noël file loads and shows real reading
data, and `git status` shows the old `readings.json` deleted and the new
`readings/` directory as untracked.

- [ ] **Step 3: Run the full existing test suite as a regression check**

```bash
npm run test
```

Expected: PASS (416 unit + the pre-existing 92 e2e - Task 7's new e2e file
does not exist yet, so this is purely a check that nothing already in the
suite broke).

- [ ] **Step 4: Typecheck and lint**

```bash
npm run check
npm run lint
```

Expected: both PASS.

- [ ] **Step 5: Commit the regenerated build output**

```bash
git add static/data/calendrier/readings static/data/calendrier/readings.json
git commit -m "feat(calendrier): regenerate build output as per-feast reading files"
```

---

## Task 7: E2e tests and final manual verification

**Files:**
- Create: `tests/e2e/calendrier-readings.test.ts`

**Interfaces:**
- Consumes: the `/calendrier/b` route, now serving real per-feast reading files (Task 6); Playwright's `test`/`expect` from `@playwright/test` (this project's e2e tests, e.g. `tests/e2e/reader.test.ts`, import directly from `@playwright/test` with no shared fixture wrapper)

- [ ] **Step 1: Confirm the exact feast titles the test will assert on**

```bash
node -e "
const yf = require('./static/data/calendrier/annee-b.json');
console.log(yf.feasts.find(f => f.slug === 'premier-dimanche-de-lavent')?.title);
console.log(yf.feasts.find(f => f.slug === 'second-dimanche-apres-noel')?.title);
"
```

Note the two printed titles exactly (French capitalization/accents matter
for Playwright's accessible-name match) - use them verbatim in Step 2.

- [ ] **Step 2: Write the e2e test**

```ts
// tests/e2e/calendrier-readings.test.ts
import { test, expect } from '@playwright/test';

test('expanding Lectures du jour shows the Mass reading text', async ({ page }) => {
	await page.goto('/calendrier/b');
	const feastHeading = page.getByRole('heading', { name: 'Premier Dimanche de l’Avent' });
	await feastHeading.scrollIntoViewIfNeeded();
	const feastArticle = page.locator('article.feast', { has: feastHeading });
	await feastArticle.getByRole('button', { name: 'Lectures du jour' }).click();
	await expect(feastArticle.getByText('Is 2, 1-5')).toBeVisible();
});

test('a known-gap feast shows the unavailable note instead of readings', async ({ page }) => {
	await page.goto('/calendrier/b');
	const feastHeading = page.getByRole('heading', { name: 'Deuxième Dimanche après Noël' });
	await feastHeading.scrollIntoViewIfNeeded();
	const feastArticle = page.locator('article.feast', { has: feastHeading });
	await feastArticle.getByRole('button', { name: 'Lectures du jour' }).click();
	await expect(feastArticle.getByText('Lectures indisponibles pour cette fête.')).toBeVisible();
});
```

If Step 1's printed titles differ from `'Premier Dimanche de l’Avent'` or
`'Deuxième Dimanche après Noël'`, edit the two `getByRole('heading', { name:
... })` calls to match exactly what was printed before running Step 3.

- [ ] **Step 3: Run the e2e test**

```bash
npx playwright test tests/e2e/calendrier-readings.test.ts
```

Expected: PASS (2 tests). `playwright.config.ts` runs `npm run build && npm
run preview` as its `webServer` and points Playwright at port 4173 - `npm
run build`'s `prebuild` hook will itself print "skipping rebuild" (per the
Global Constraints note) and reuse the `static/data/calendrier/` output
Task 6 already regenerated, so no extra data-generation step is needed
here.

- [ ] **Step 4: Run the full test suite one more time**

```bash
npm run test
```

Expected: PASS (416 unit + 94 e2e - the pre-existing 92 plus this task's 2 new tests).

- [ ] **Step 5: Manual browser verification**

Start the dev server if it is not already running (`npm run dev`), then in
a browser or via a Playwright screenshot script:

- Visit `/calendrier` - the today-card and date-picker still work
  unchanged (no readings shown here yet by default, matching the
  collapsed-by-default decision - this just confirms nothing broke).
- Visit `/calendrier/b`, find a Sunday, click "Lectures du jour" - the
  readings render with their labels, refs, and full text, styled
  consistently with the surrounding CEC cluster content.
- Confirm the known-gap feast found in Step 1 shows "Lectures
  indisponibles pour cette fête." instead.
- Toggle between light and dark theme (the `data-theme` attribute) and
  confirm the readings text is legible in both - it inherits
  `--color-fg`/`--color-muted`/`--color-accent`, so this should already
  work, but confirm rather than assume.

- [ ] **Step 6: Commit**

```bash
git add tests/e2e/calendrier-readings.test.ts
git commit -m "test(calendrier): cover the readings section and its known-gap fallback"
```
