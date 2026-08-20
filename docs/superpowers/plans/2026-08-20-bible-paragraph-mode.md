# Bible Paragraph Reading Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a verse-by-verse / paragraph reading-mode toggle to the Bible reader, where paragraph mode renders prose as flowing paragraphs and poetry as indented, stanza-broken lines — plus recover divine-name small caps, italicized added-words, Psalm/Canticle superscriptions, and Selah markers (currently silently discarded) in both modes.

**Architecture:** A new build-time parser (`scripts/prepare/ncl-paragraphs.ts`) walks the same `francl_usfx.xml` source `scripts/prepare/ncl.ts` already parses, preserving structure the existing parser discards, and writes a new sharded data file per book (`static/data/bible/ncl-paragraphs/{usfx}.json`). The existing `ncl/{usfx}.json` plain-text output is untouched — zero risk to search, concordance, compare, or today's reader. `BibleReader.svelte` fetches the new data and uses it for inline typographic enrichment in both modes, and for block-level layout only in paragraph mode.

**Tech Stack:** SvelteKit 2 / Svelte 5, TypeScript, tsx (build scripts), Vitest, Playwright.

## Global Constraints

- `scripts/prepare/ncl.ts` and `static/data/bible/ncl/{usfx}.json`'s shape must not change — every existing consumer (search index, concordance, compare view, today's verse-by-verse reader) depends on it as plain text.
- Paragraph mode has no interactivity: no click handlers, no citation counts, no study-panel wiring. Verse-by-verse mode keeps its full existing interactivity, unchanged.
- Divine-name/added-words/Selah/superscription enrichment applies in **both** modes.
- Source doc: `docs/superpowers/specs/2026-08-20-bible-paragraph-mode-design.md`.

---

### Task 1: Paragraph/poetry structure parser

**Files:**
- Modify: `scripts/prepare/ncl.ts` (export `normalizeVerseText`, no behavior change)
- Create: `scripts/prepare/ncl-paragraphs.ts`
- Test: `tests/unit/prepare/ncl-paragraphs.test.ts`

**Interfaces:**
- Consumes: `normalizeVerseText(s: string): string` from `./ncl.ts`
- Produces: `parseUSFXParagraphs(xml: string): Promise<Record<string, Record<string, ChapterBlocks>>>` (keyed `usfx` → chapter number string → `ChapterBlocks`), plus exported types `RichVerse`, `Block`, `ChapterBlocks`

**Status: COMPLETE** (commits `c27829c9..423cc967` on `main`, review clean after 1 fix round). `scripts/prepare/ncl-paragraphs.ts` and `tests/unit/prepare/ncl-paragraphs.test.ts` already exist and pass — do not re-implement. The final, reviewed code:

```ts
// scripts/prepare/ncl-paragraphs.ts
import { normalizeVerseText } from './ncl.ts';

export type RichVerse = { v: number; html: string };

export type Block =
	| { kind: 'prose'; verses: RichVerse[] }
	| { kind: 'poetry'; level: 1 | 2 | 3; verses: RichVerse[]; stanzaBreak?: boolean };

export type ChapterBlocks = { superscription?: string; blocks: Block[] };

/** USFX book code -> chapter number (string) -> chapter blocks. */
type AllParagraphs = Record<string, Record<string, ChapterBlocks>>;
```

(Full implementation on disk at `scripts/prepare/ncl-paragraphs.ts` — read it directly rather than retyping here if a later task needs to reference its internals.)

---

### Task 2: Wire the parser into the build and validate against the real source

**Files:**
- Modify: `scripts/prepare-data.ts`

**Interfaces:**
- Consumes: `parseUSFXParagraphs` from Task 1 (`scripts/prepare/ncl-paragraphs.ts`)
- Produces: `static/data/bible/ncl-paragraphs/{usfx}.json` (one `Record<chapter, ChapterBlocks>` per book) + `static/data/bible/ncl-paragraphs/manifest.json` (`string[]` of USFX codes)

**Status: IN PROGRESS.** Add the import (`import { parseUSFXParagraphs } from './prepare/ncl-paragraphs.ts';`, alongside the existing `parseUSFX` import) and this build step, immediately after the existing "parsing NCL bible" step (which already has `nclXml` in scope):

```ts
logStep('parsing NCL paragraph/poetry structure');
{
	const paragraphs = await parseUSFXParagraphs(nclXml);
	const dir = join(OUT, 'bible/ncl-paragraphs');
	mkdirSync(dir, { recursive: true });
	const usfxCodes: string[] = [];
	for (const [usfx, chapters] of Object.entries(paragraphs)) {
		writeFileSync(join(dir, `${usfx}.json`), JSON.stringify(chapters));
		usfxCodes.push(usfx);
	}
	usfxCodes.sort();
	writeFileSync(join(dir, 'manifest.json'), JSON.stringify(usfxCodes));
	endStep(`${usfxCodes.length} books`);
}
```

Verification: run `npx tsx scripts/prepare-data.ts`, expect a "parsing NCL paragraph/poetry structure" line reporting `73 books`. Spot-check `static/data/bible/ncl-paragraphs/MAT.json` chapter 1's first block covers verses 1-5, and `PSA.json` chapter 3's `superscription` mentions David and Absalon. Run `npx vitest run` as a regression check. `static/data/bible/ncl-paragraphs/` is tracked in git (confirmed: mirrors `static/data/bible/ncl/`, which is tracked, not gitignored).

**IMPORTANT — scope discipline:** this task touches exactly `scripts/prepare-data.ts` (one import + one new block) plus the generated `static/data/bible/ncl-paragraphs/*.json` output. Do not modify the `PRESERVE` set or any other unrelated part of `prepare-data.ts`. Do not run destructive cleanup commands (`git clean`, `rm -rf` on tracked or untracked paths) at any point, even to "fix" something the prebuild run seems to have disturbed — if the prebuild run appears to wipe or modify files outside `static/data/bible/ncl-paragraphs/`, stop and report it instead of trying to clean up locally; restoring committed data is the controller's job via `git checkout`, and untracked files cannot be restored by anyone if deleted.

---

### Task 3: Runtime types and loaders

**Files:**
- Modify: `src/lib/data/types.ts`
- Modify: `src/lib/data/loaders.ts`

**Interfaces:**
- Produces: types `NclRichVerse`, `NclBlock`, `NclChapterBlocks`, `NclParagraphsBook`; functions `loadNclParagraphsManifest(fetcher?: Fetch): Promise<Set<string>>`, `loadNclParagraphsBook(usfx: string, fetcher?: Fetch): Promise<NclParagraphsBook | null>`

- [ ] **Step 1: Add runtime types**

In `src/lib/data/types.ts`, near the existing `NclBook`/`NclBible` types (around line 271-274), add:

```ts
export type NclRichVerse = { v: number; html: string };

export type NclBlock =
	| { kind: 'prose'; verses: NclRichVerse[] }
	| { kind: 'poetry'; level: 1 | 2 | 3; verses: NclRichVerse[]; stanzaBreak?: boolean };

export type NclChapterBlocks = { superscription?: string; blocks: NclBlock[] };

/** chapter number (string) -> chapter blocks, for one NCL book. */
export type NclParagraphsBook = Record<string, NclChapterBlocks>;
```

- [ ] **Step 2: Add loaders, mirroring `loadNclManifest`/`loadNclBook` exactly**

In `src/lib/data/loaders.ts`, near the existing `nclManifestPromise`/`nclBookCache` declarations (around line 90-91), add:

```ts
let nclParagraphsManifestPromise: Promise<Set<string>> | null = null;
const nclParagraphsBookCache = new Map<string, Promise<NclParagraphsBook | null>>();
```

Add `NclParagraphsBook` to the existing type-only import from `./types` at the top of the file.

Immediately after the existing `loadNclBook` function (after line 359), add:

```ts
/**
 * Load the manifest of USFX codes that have an ncl-paragraphs shard
 * available. Mirrors `loadNclManifest`.
 */
export function loadNclParagraphsManifest(fetcher: Fetch = fetch): Promise<Set<string>> {
	if (!nclParagraphsManifestPromise) {
		nclParagraphsManifestPromise = (async () => {
			const r = await fetcher('/data/bible/ncl-paragraphs/manifest.json');
			if (!r.ok) return new Set<string>();
			const arr = (await r.json()) as string[];
			return new Set(arr);
		})();
	}
	return nclParagraphsManifestPromise;
}

/**
 * Lazily fetch the paragraph/poetry structure for a single Bible book.
 * Returns `null` when the book is not in the manifest or the shard 404s —
 * callers should fall back to plain verse-by-verse rendering in that case.
 * Mirrors `loadNclBook`.
 */
export function loadNclParagraphsBook(
	usfx: string,
	fetcher: Fetch = fetch
): Promise<NclParagraphsBook | null> {
	let p = nclParagraphsBookCache.get(usfx);
	if (!p) {
		p = (async () => {
			const manifest = await loadNclParagraphsManifest(fetcher);
			if (manifest.size > 0 && !manifest.has(usfx)) return null;
			const r = await fetcher(`/data/bible/ncl-paragraphs/${usfx}.json`);
			if (!r.ok) return null;
			return (await r.json()) as NclParagraphsBook;
		})();
		nclParagraphsBookCache.set(usfx, p);
	}
	return p;
}
```

- [ ] **Step 3: Type-check**

Run: `npx svelte-check --output human`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/data/types.ts src/lib/data/loaders.ts
git commit -m "feat(bible): add ncl-paragraphs runtime types and loader"
```

---

### Task 4: `bibleLayout` preference and toggle UI

**Files:**
- Modify: `src/lib/stores/prefs.ts`
- Modify: `src/lib/components/ui/ReadingPrefs.svelte`
- Test: `tests/e2e/bible-reading-mode.test.ts` (new file, toggle-only assertions — rendering assertions come in Task 6)

**Interfaces:**
- Produces: `ReadingPrefs.bibleLayout: 'verse' | 'paragraph'` (default `'verse'`), persisted via existing `prefs` store machinery

- [ ] **Step 1: Add the pref field**

In `src/lib/stores/prefs.ts`:

Add to the `ReadingPrefs` interface (near `crossRefsLayout`):
```ts
export type BibleLayout = 'verse' | 'paragraph';
```
```ts
	crossRefsLayout: CrossRefsLayout;
	bibleLayout: BibleLayout;
```

Add to `DEFAULTS`:
```ts
	crossRefsLayout: 'side',
	bibleLayout: 'verse'
```

- [ ] **Step 2: Add the toggle UI**

In `src/lib/components/ui/ReadingPrefs.svelte`, add near the top with the other route checks (after `isCecOnly`):
```ts
	const isBibleOnly = $derived(page.url.pathname.startsWith('/bible'));
```

Inside the `{#if activeTab === 'reading'}` block, add a new pill pair (placed after the existing "Alignement" block, before the `{#if isCecOnly}` block):

```svelte
{#if isBibleOnly}
	<div>
		<span class="block mb-2 text-muted text-[13px]">Mode de lecture</span>
		<div class="flex gap-1.5">
			<button
				type="button"
				class="flex-1 py-1.5 border rounded text-xs
					{$prefs.bibleLayout === 'verse'
					? 'bg-accent/15 text-accent-text border-accent'
					: 'pill-border text-foreground hover:text-accent-text'}"
				onclick={() => updatePref('bibleLayout', 'verse')}
			>
				Verset par verset
			</button>
			<button
				type="button"
				class="flex-1 py-1.5 border rounded text-xs
					{$prefs.bibleLayout === 'paragraph'
					? 'bg-accent/15 text-accent-text border-accent'
					: 'pill-border text-foreground hover:text-accent-text'}"
				onclick={() => updatePref('bibleLayout', 'paragraph')}
			>
				Paragraphe
			</button>
		</div>
	</div>
{/if}
```

- [ ] **Step 3: Write the failing e2e test**

Create `tests/e2e/bible-reading-mode.test.ts`. The panel is opened via `page.getByLabel('Options de lecture')` (the `ModeToggle.svelte` trigger, confirmed against `tests/e2e/reader.test.ts`), and the new toggle lives on the "Lecture" tab inside `ReadingPrefs.svelte` (default tab is "Texte", so the tab must be switched first):

```ts
import { test, expect } from '@playwright/test';

test('Bible reading-mode toggle switches and persists', async ({ page }) => {
	await page.goto('/bible/matthieu/1');
	await page.getByLabel('Options de lecture').click();
	const dialog = page.getByRole('dialog', { name: 'Options de lecture' });
	await dialog.getByRole('button', { name: 'Lecture' }).click();
	await dialog.getByRole('button', { name: 'Paragraphe' }).click();
	await dialog.getByRole('button', { name: 'Verset par verset' }).click();

	const stored = await page.evaluate(() =>
		JSON.parse(localStorage.getItem('catechismecatholique.prefs') ?? '{}')
	);
	expect(stored.bibleLayout).toBe('verse');

	await dialog.getByRole('button', { name: 'Paragraphe' }).click();
	await page.reload();
	const afterReload = await page.evaluate(() =>
		JSON.parse(localStorage.getItem('catechismecatholique.prefs') ?? '{}')
	);
	expect(afterReload.bibleLayout).toBe('paragraph');
});

test('reading-mode toggle is absent outside Bible routes', async ({ page }) => {
	await page.goto('/cec/27');
	await page.getByLabel('Options de lecture').click();
	const dialog = page.getByRole('dialog', { name: 'Options de lecture' });
	await dialog.getByRole('button', { name: 'Lecture' }).click();
	await expect(dialog.getByRole('button', { name: 'Paragraphe' })).toHaveCount(0);
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npx playwright test tests/e2e/bible-reading-mode.test.ts`
Expected: FAIL — no "Paragraphe" button exists yet.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx playwright test tests/e2e/bible-reading-mode.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Type-check and lint**

Run: `npx svelte-check --output human && npx eslint src/lib/stores/prefs.ts src/lib/components/ui/ReadingPrefs.svelte`
Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/stores/prefs.ts src/lib/components/ui/ReadingPrefs.svelte tests/e2e/bible-reading-mode.test.ts
git commit -m "feat(bible): add verse/paragraph reading-mode preference and toggle"
```

---

### Task 5: Thread paragraph data through the route loader, enrich verse-by-verse rendering

CI runs `npm run check` (which includes `svelte-check`) on every push (confirmed in `.github/workflows/`), so the route/loader wiring and the component prop it feeds must land in one commit — a route passing a prop the component doesn't declare yet would fail type-check on its own.

**Files:**
- Modify: `src/routes/bible/[book=biblebook]/[ch]/+page.ts`
- Modify: `src/routes/bible/[book=biblebook]/[ch]/+page.svelte`
- Modify: `src/lib/components/bible/BibleReader.svelte`

**Interfaces:**
- Consumes: `loadNclParagraphsBook` from Task 3
- Produces: `PageData.paragraphs: NclChapterBlocks | null`; `BibleReader`'s `richHtmlByVerse: Map<number, string>` derived value, which Task 6 also reads

- [ ] **Step 1: Fetch the data in the loader**

In `src/routes/bible/[book=biblebook]/[ch]/+page.ts`, add the import:
```ts
import { loadNclBook, loadNclParagraphsBook } from '$lib/data/loaders';
```

Change the `Promise.all` that currently loads `bookData`:
```ts
	const [parentData, bookData, paragraphsBook] = await Promise.all([
		parent(),
		loadNclBook(book.usfx, fetch),
		loadNclParagraphsBook(book.usfx, fetch)
	]);
```

Add to the returned object (after `chapterCounts`):
```ts
		chapterCounts: parentData.chapterCounts,
		paragraphs: paragraphsBook?.[String(ch)] ?? null
```

- [ ] **Step 2: Pass it to `BibleReader`**

In `src/routes/bible/[book=biblebook]/[ch]/+page.svelte`, add:
```svelte
	paragraphs={data.paragraphs}
```
to the existing `<BibleReader ... />` invocation.

- [ ] **Step 3: Add the prop and a verse→html lookup to `BibleReader`**

In `BibleReader.svelte`'s `<script>`, add `paragraphs` to the props type and destructuring:
```ts
	import type { NclChapterBlocks } from '$lib/data/types';
	import { prefs } from '$lib/stores/prefs';
```
(Note: `prefs` may already be imported for other reasons — check before adding a duplicate import.)

```ts
	let {
		book,
		chapter,
		verses,
		verseIdx,
		totalChapters,
		hasConcordance = false,
		sections = [],
		chapterCounts = {},
		paragraphs = null
	}: {
		book: BookInfo;
		chapter: number;
		verses: { v: number; text: string }[];
		verseIdx: BibleVerseIndex;
		totalChapters: number;
		hasConcordance?: boolean;
		sections?: NclSection[];
		chapterCounts?: Record<string, number>;
		paragraphs?: NclChapterBlocks | null;
	} = $props();
```

Add a derived lookup so both modes can fetch a verse's enriched HTML in O(1), falling back to the plain text already in `verses` when paragraph data is unavailable for this chapter:

```ts
	const richHtmlByVerse = $derived.by(() => {
		const m = new Map<number, string>();
		if (paragraphs) {
			for (const block of paragraphs.blocks) {
				for (const rv of block.verses) m.set(rv.v, rv.html);
			}
		}
		return m;
	});

	function verseHtml(v: { v: number; text: string }): string {
		return richHtmlByVerse.get(v.v) ?? v.text;
	}
```

- [ ] **Step 4: Swap the plain text for enriched HTML in verse-by-verse rendering**

In the existing `{#each verses as v (v.v)}` loop, change:
```svelte
						<p class="verse-text font-body flex-1" class:verse-text--cited={isClickable}>
							{v.text}
						</p>
```
to:
```svelte
						<p class="verse-text font-body flex-1" class:verse-text--cited={isClickable}>
							{@html verseHtml(v)}
						</p>
```

- [ ] **Step 5: Add CSS for the new inline spans**

In the `<style>` block, add:
```css
	.prose-paragraph :global(.dn),
	.verse-text :global(.dn) {
		font-variant: small-caps;
		letter-spacing: 0.02em;
	}
	.verse-text :global(.add) {
		font-style: italic;
	}
	.verse-text :global(.selah) {
		font-style: italic;
		color: var(--color-muted);
	}
```
(The `.prose-paragraph .dn` selector is for Task 6's paragraph-mode markup, added here since it's the same rule — harmless if paragraph mode doesn't exist yet in the DOM.)

- [ ] **Step 6: Manual verification — citation click-through still works**

This step has no automated test (none existed before this change per the design doc's testing note) — verify manually:

Run: `npm run dev`, open `/bible/genese/3` (a chapter with `<nd>` markup verified during design), confirm:
1. "Yahweh" renders in small caps where present.
2. Clicking a verse that has CCC citations still opens the study panel (unchanged `onclick`/button wrapper — only the inner text rendering changed).

- [ ] **Step 7: Run full test suite**

Run: `npx vitest run && npx playwright test tests/e2e/bible-hub.test.ts tests/e2e/study-panel.test.ts`
Expected: all pass — these are the existing tests most likely to catch a regression from the `{@html}` swap.

- [ ] **Step 8: Type-check and lint**

Run: `npx svelte-check --output human && npx eslint src/lib/components/bible/BibleReader.svelte`
Expected: 0 errors.

- [ ] **Step 9: Commit**

```bash
git add "src/routes/bible/[book=biblebook]/[ch]/+page.ts" "src/routes/bible/[book=biblebook]/[ch]/+page.svelte" src/lib/components/bible/BibleReader.svelte
git commit -m "feat(bible): thread ncl-paragraphs data through and enrich verse text"
```

---

### Task 6: Paragraph-mode layout (prose + poetry)

**Files:**
- Modify: `src/lib/components/bible/BibleReader.svelte`

**Interfaces:**
- Consumes: `paragraphs: NclChapterBlocks | null`, `$prefs.bibleLayout` (both already wired by Task 5)

- [ ] **Step 1: Branch the verse list on `$prefs.bibleLayout`**

In `BibleReader.svelte`, wrap the existing `<ol class="verse-list ...">` block (today's verse-by-verse rendering) in:
```svelte
{#if $prefs.bibleLayout === 'paragraph' && paragraphs}
	<!-- paragraph-mode markup, added below -->
{:else}
	<ol class="verse-list list-none">
		<!-- existing verse-by-verse markup, unchanged -->
	</ol>
{/if}
```

- [ ] **Step 2: Add the paragraph-mode markup**

In the new `{#if}` branch:
```svelte
	<div class="bible-paragraphs">
		{#if paragraphs.superscription}
			<p class="bible-superscription">{paragraphs.superscription}</p>
		{/if}
		{#each paragraphs.blocks as block, i (i)}
			{#if block.kind === 'prose'}
				<p class="bible-prose">
					{#each block.verses as rv (rv.v)}<sup class="vn">{rv.v}</sup
						>{@html rv.html}
					{/each}
				</p>
			{:else}
				<div class="bible-poetry-line" class:stanza-break={block.stanzaBreak} style="--level: {block.level}">
					{#each block.verses as rv (rv.v)}<sup class="vn">{rv.v}</sup
						>{@html rv.html}
					{/each}
				</div>
			{/if}
		{/each}
	</div>
```

- [ ] **Step 3: Add layout CSS**

In the `<style>` block:
```css
	.bible-superscription {
		font-style: italic;
		color: var(--color-muted);
		margin-bottom: 1rem;
	}
	.bible-prose {
		font-size: var(--reader-font-size, 17px);
		line-height: var(--reader-line-height, 1.7);
		margin-bottom: 1rem;
	}
	.bible-poetry-line {
		font-size: var(--reader-font-size, 17px);
		line-height: var(--reader-line-height, 1.7);
		margin-left: calc((var(--level, 1) - 1) * 1.5rem);
	}
	.bible-poetry-line.stanza-break {
		margin-top: 1rem;
	}
	.vn {
		font-family: var(--font-ui);
		font-size: 0.65em;
		font-weight: 600;
		color: var(--color-accent);
		margin-right: 0.15em;
		user-select: none;
	}
```

- [ ] **Step 4: Write the e2e test**

Add to `tests/e2e/bible-reading-mode.test.ts`:

```ts
async function switchToParagraphMode(page: import('@playwright/test').Page) {
	await page.getByLabel('Options de lecture').click();
	const dialog = page.getByRole('dialog', { name: 'Options de lecture' });
	await dialog.getByRole('button', { name: 'Lecture' }).click();
	await dialog.getByRole('button', { name: 'Paragraphe' }).click();
	await page.keyboard.press('Escape');
}

test('paragraph mode renders prose as merged paragraphs and poetry as indented lines', async ({
	page
}) => {
	await page.goto('/bible/matthieu/1');
	await switchToParagraphMode(page);

	// Matthew 1's first paragraph break is at verse 6 (per the original
	// USFM investigation: \p markers at v1, v6, v12, v18) — verses 1-5
	// should be merged into one <p>, not one row each.
	const firstParagraph = page.locator('.bible-prose').first();
	await expect(firstParagraph).toContainText('1');
	await expect(firstParagraph).toContainText('5');
	await expect(page.locator('li#v1')).toHaveCount(0);

	await page.goto('/bible/psaumes/2');
	await switchToParagraphMode(page);
	await expect(page.locator('.bible-poetry-line').first()).toBeVisible();
});
```

- [ ] **Step 5: Run the test, iterate to green**

Run: `npx playwright test tests/e2e/bible-reading-mode.test.ts`
Expected: PASS (3 tests total in this file). Refactor Task 4's first two tests to use the same `switchToParagraphMode` helper where it fits, to avoid duplicated selector logic in one file.

- [ ] **Step 6: Run the full test suite**

Run: `npx vitest run && npx playwright test`
Expected: all pass.

- [ ] **Step 7: Type-check and lint**

Run: `npx svelte-check --output human && npx eslint src/lib/components/bible/BibleReader.svelte && npx prettier --check src/lib/components/bible/BibleReader.svelte`
Expected: 0 errors.

- [ ] **Step 8: Commit**

```bash
git add src/lib/components/bible/BibleReader.svelte tests/e2e/bible-reading-mode.test.ts
git commit -m "feat(bible): render paragraph reading mode (prose + poetry layout)"
```

---

## Post-plan check

After Task 6, run the full pipeline once more end to end as a final sanity pass:

```bash
npm run check && npx vitest run && npx playwright test
```

All green means: search/concordance/compare are untouched (Task 1-2 isolation held), verse-by-verse mode has the new typographic polish with unchanged interactivity (Task 5), and paragraph mode renders prose/poetry correctly with no interactivity (Task 6).
