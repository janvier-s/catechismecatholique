# Bible Infinite Scroll Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the Bible reader load chapter after chapter as the reader scrolls, in both directions and across book boundaries, without disturbing the sticky-bar reveal behaviour or the column-width guarantees.

**Architecture:** Three pure modules (a chapter cursor, scroll predicates, a chrome re-anchoring reducer) carry all the logic that can be tested without a DOM. `BibleReader.svelte` keeps a windowed list of loaded chapters inside its single existing `<main>`, renders each through a new `BibleChapter.svelte`, and drives loading from an `IntersectionObserver` plus a throttled scroll handler. Every scroll compensation is paired with a chrome anchor shift so the bars do not read it as reader intent.

**Tech Stack:** SvelteKit 2, Svelte 5 runes, TypeScript, Tailwind 3, Vitest (node environment), Playwright.

## Global Constraints

- Repo: `/Users/Janvier/Documents/Bible n stuff/Websites/catechismecatholique`, branch `main`.
- **Every build and Playwright run must be prefixed `SKIP_PREPARE_DATA=true`.** The `scripts/data-sources` symlinks did not survive the repo move; CI does the same.
- **Never `git add -A`.** A build regenerates roughly 15,000 files under `static/data/`. Stage named paths only, and check `git status --short` after committing.
- Bible components are **Svelte 5 runes** (`$state`, `$derived`, `$props`, `$effect`). The CEC-era components stay Svelte 4 under the standing `TECH_DEBT.md` deferral. Do not migrate anything either way.
- Vitest runs in the **node** environment (`vitest.config.ts:13`). Unit-tested code must not touch `window`, `document` or `IntersectionObserver`.
- Vitest sets `expect: { requireAssertions: true }`. Every test must assert.
- French UI copy: no em dashes, and periods go **inside** the guillemets, « comme ceci. »
- New prefs need no migration: `readInitial()` spreads `DEFAULTS` under the parsed object (`prefs.ts:96`).
- Regression guards that must stay green throughout: `tests/e2e/bible-reading-mode.test.ts` (32 tests, including `.verse-text` at 702px / 552px / 872px), 85 e2e total, 297 unit total.

## File Structure

| Path | Responsibility |
| --- | --- |
| `src/lib/utils/chapterCursor.ts` (create) | Next/previous chapter arithmetic, including book boundaries. Pure. |
| `src/lib/utils/infiniteScroll.ts` (create) | `shouldLoadNext`, `chapterCrossing` (pure), plus thin `IntersectionObserver` adapters. |
| `src/lib/stores/chrome.ts` (modify) | Adds `shiftChromeAnchor` reducer and the wired `anchorChromeShift`. |
| `src/lib/stores/prefs.ts` (modify) | Adds `infiniteScroll: boolean`, default `false`. |
| `src/lib/components/ui/ReadingPrefs.svelte` (modify) | Adds the toggle as the last control in the Bible group. |
| `src/lib/components/bible/BibleChapter.svelte` (create) | One chapter's `<header>` and `<article>`. Lifted verbatim from `BibleReader`. |
| `src/lib/components/bible/BibleReader.svelte` (modify) | Page-level shell: sticky nav, the single `<main>`, the loaded-chapter window, all scroll machinery. |
| `src/routes/bible/[book=biblebook]/[ch]/+page.ts` (modify) | Stops filtering `sections`; returns the concordance manifest instead of a boolean. |
| `src/routes/bible/[book=biblebook]/[ch]/+page.svelte` (modify) | Passes the new props; gives up its `<title>`. |
| `tests/unit/utils/chapterCursor.test.ts` (create) | Cursor arithmetic. |
| `tests/unit/utils/infiniteScroll.test.ts` (create) | Scroll predicate and crossing rule. |
| `tests/unit/chrome.test.ts` (modify) | Anchor-shift behaviour. |
| `tests/e2e/bible-infinite-scroll.test.ts` (create) | The six end-to-end behaviours. A new file, so existing Bible selectors are untouched. |

---

### Task 1: Chapter cursor

**Files:**
- Create: `src/lib/utils/chapterCursor.ts`
- Test: `tests/unit/utils/chapterCursor.test.ts`

**Interfaces:**
- Consumes: `getNextBook`, `getPrevBook` from `$lib/utils/bibleBookSlug` (both return `BookInfo | undefined`; `BookInfo` has `usfx`, `slug`, `frenchName`, `abbrs`).
- Produces: `ChapterRef { bookSlug: string; usfx: string; chapter: number }`, `ChapterCounts = Record<string, number>` (keyed by **USFX**), `nextChapterRef(ref, counts): ChapterRef | null`, `prevChapterRef(ref, counts): ChapterRef | null`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/utils/chapterCursor.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { nextChapterRef, prevChapterRef, type ChapterRef } from '$lib/utils/chapterCursor';

// Keyed by USFX, mirroring static/data/bible/chapter-counts.json.
const COUNTS = { GEN: 50, EXO: 40, REV: 22, '3JN': 1, JUD: 1 };

const gen = (chapter: number): ChapterRef => ({ bookSlug: 'genese', usfx: 'GEN', chapter });

describe('nextChapterRef', () => {
	it('advances within a book', () => {
		expect(nextChapterRef(gen(1), COUNTS)).toEqual({
			bookSlug: 'genese',
			usfx: 'GEN',
			chapter: 2
		});
	});

	it('crosses into the next book at the last chapter', () => {
		expect(nextChapterRef(gen(50), COUNTS)).toEqual({
			bookSlug: 'exode',
			usfx: 'EXO',
			chapter: 1
		});
	});

	it('crosses out of a one-chapter book', () => {
		const ref = { bookSlug: '3-jean', usfx: '3JN', chapter: 1 };
		expect(nextChapterRef(ref, COUNTS)).toEqual({ bookSlug: 'jude', usfx: 'JUD', chapter: 1 });
	});

	it('stops at the end of the canon', () => {
		const ref = { bookSlug: 'apocalypse', usfx: 'REV', chapter: 22 };
		expect(nextChapterRef(ref, COUNTS)).toBeNull();
	});

	it('returns null for a book missing from the counts', () => {
		expect(nextChapterRef({ bookSlug: 'genese', usfx: 'NOPE', chapter: 1 }, COUNTS)).toBeNull();
	});
});

describe('prevChapterRef', () => {
	it('steps back within a book', () => {
		expect(prevChapterRef(gen(2), COUNTS)).toEqual({
			bookSlug: 'genese',
			usfx: 'GEN',
			chapter: 1
		});
	});

	it('crosses into the previous book at chapter 1, landing on its last chapter', () => {
		const ref = { bookSlug: 'exode', usfx: 'EXO', chapter: 1 };
		expect(prevChapterRef(ref, COUNTS)).toEqual({
			bookSlug: 'genese',
			usfx: 'GEN',
			chapter: 50
		});
	});

	it('stops at the start of the canon', () => {
		expect(prevChapterRef(gen(1), COUNTS)).toBeNull();
	});

	it('returns null when the previous book is missing from the counts', () => {
		const ref = { bookSlug: 'jude', usfx: 'JUD', chapter: 1 };
		// 2 Jean precedes 3 Jean precedes Jude; 3JN is in COUNTS, so use a book
		// whose predecessor is not: Exode's predecessor GEN is present, so
		// instead drop GEN from a local copy.
		const partial = { EXO: 40 };
		expect(prevChapterRef({ bookSlug: 'exode', usfx: 'EXO', chapter: 1 }, partial)).toBeNull();
		expect(prevChapterRef(ref, COUNTS)).toEqual({
			bookSlug: '3-jean',
			usfx: '3JN',
			chapter: 1
		});
	});
});
```

- [ ] **Step 2: Run the test and watch it fail**

```bash
cd "/Users/Janvier/Documents/Bible n stuff/Websites/catechismecatholique"
npx vitest run tests/unit/utils/chapterCursor.test.ts
```

Expected: FAIL, `Failed to resolve import "$lib/utils/chapterCursor"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/utils/chapterCursor.ts`:

```ts
import { getNextBook, getPrevBook } from '$lib/utils/bibleBookSlug';

/** A chapter's identity, carrying both keys the data layer needs: the slug for
 *  URLs and `bookBySlug`, the USFX for the JSON shards and the counts map. */
export interface ChapterRef {
	bookSlug: string;
	usfx: string;
	chapter: number;
}

/** Total chapters per book, keyed by USFX · the shape of
 *  static/data/bible/chapter-counts.json, loaded by /bible/+layout.ts. */
export type ChapterCounts = Record<string, number>;

/** The chapter after `ref`, rolling into the next book at a book's end.
 *  Null at the end of the canon, or when the book is unknown to `counts`. */
export function nextChapterRef(ref: ChapterRef, counts: ChapterCounts): ChapterRef | null {
	const total = counts[ref.usfx];
	if (total === undefined) return null;
	if (ref.chapter < total) {
		return { bookSlug: ref.bookSlug, usfx: ref.usfx, chapter: ref.chapter + 1 };
	}
	const next = getNextBook(ref.bookSlug);
	if (!next) return null;
	return { bookSlug: next.slug, usfx: next.usfx, chapter: 1 };
}

/** The chapter before `ref`, rolling into the previous book's *last* chapter
 *  at chapter 1. Null at Genèse 1, or when the previous book is unknown. */
export function prevChapterRef(ref: ChapterRef, counts: ChapterCounts): ChapterRef | null {
	if (ref.chapter > 1) {
		return { bookSlug: ref.bookSlug, usfx: ref.usfx, chapter: ref.chapter - 1 };
	}
	const prev = getPrevBook(ref.bookSlug);
	if (!prev) return null;
	const total = counts[prev.usfx];
	if (total === undefined) return null;
	return { bookSlug: prev.slug, usfx: prev.usfx, chapter: total };
}
```

- [ ] **Step 4: Run the test and watch it pass**

```bash
npx vitest run tests/unit/utils/chapterCursor.test.ts
```

Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/chapterCursor.ts tests/unit/utils/chapterCursor.test.ts
git commit -m "feat(bible): chapter cursor that rolls across book boundaries"
git status --short
```

---

### Task 2: Scroll predicate and the chapter-crossing rule

**Files:**
- Create: `src/lib/utils/infiniteScroll.ts`
- Test: `tests/unit/utils/infiniteScroll.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `SCROLL_THRESHOLD` (400), `shouldLoadNext(scrollY, innerHeight, docHeight): boolean`, `Crossing { kind: 'enter' | 'exit-up'; bookSlug: string; chapter: number }`, `chapterCrossing(input): Crossing | null`, `CHAPTER_ANCHOR_SELECTOR`, `createChapterObserver(onCrossing)`, `observeAllAnchors(container, observer)`, `observeNewAnchor(container, observer, bookSlug, chapter)`.

The `chapterCrossing` rule is the reason this file exists as its own module. ODR keeps it inside the observer callback where no test can reach it, and it is the subtlest thing in the feature: a freshly appended anchor fires an initial observation with `isIntersecting: false` and a `top` below the fold, which must not be mistaken for the reader scrolling up past that chapter.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/utils/infiniteScroll.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { SCROLL_THRESHOLD, shouldLoadNext, chapterCrossing } from '$lib/utils/infiniteScroll';

describe('shouldLoadNext', () => {
	it('is false near the top of a long document', () => {
		expect(shouldLoadNext(0, 800, 5000)).toBe(false);
	});

	it('is true once within the threshold of the bottom', () => {
		expect(shouldLoadNext(4000, 800, 5000)).toBe(true);
	});

	it('is false exactly at the threshold, true one pixel past it', () => {
		// 3800 + 800 === 5000 - 400
		expect(shouldLoadNext(3800, 800, 5000)).toBe(false);
		expect(shouldLoadNext(3801, 800, 5000)).toBe(true);
	});

	it('is true when the document is shorter than the viewport', () => {
		expect(shouldLoadNext(0, 800, 500)).toBe(true);
	});

	it('exposes the threshold it uses', () => {
		expect(SCROLL_THRESHOLD).toBe(400);
	});
});

const base = { viewportHeight: 800, bookSlug: 'genese', chapter: 3 };

describe('chapterCrossing', () => {
	it('reports entry when the anchor is intersecting the band', () => {
		expect(chapterCrossing({ ...base, isIntersecting: true, top: 120 })).toEqual({
			kind: 'enter',
			bookSlug: 'genese',
			chapter: 3
		});
	});

	it('reports a scroll-up exit when the anchor sits below the band, still on screen', () => {
		expect(chapterCrossing({ ...base, isIntersecting: false, top: 400 })).toEqual({
			kind: 'exit-up',
			bookSlug: 'genese',
			chapter: 3
		});
	});

	it('ignores an anchor scrolled off the top of the viewport', () => {
		expect(chapterCrossing({ ...base, isIntersecting: false, top: -50 })).toBeNull();
	});

	it('ignores an anchor below the fold, which is what a freshly appended one reports', () => {
		expect(chapterCrossing({ ...base, isIntersecting: false, top: 900 })).toBeNull();
	});

	it('ignores an anchor exactly at the fold', () => {
		expect(chapterCrossing({ ...base, isIntersecting: false, top: 800 })).toBeNull();
	});

	it('ignores an anchor with no book slug', () => {
		expect(chapterCrossing({ ...base, bookSlug: '', isIntersecting: true, top: 10 })).toBeNull();
	});

	it('ignores an unparseable chapter number', () => {
		expect(chapterCrossing({ ...base, chapter: 0, isIntersecting: true, top: 10 })).toBeNull();
	});
});
```

- [ ] **Step 2: Run the test and watch it fail**

```bash
npx vitest run tests/unit/utils/infiniteScroll.test.ts
```

Expected: FAIL, `Failed to resolve import "$lib/utils/infiniteScroll"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/utils/infiniteScroll.ts`:

```ts
/** Distance from the bottom of the document at which the next chapter loads. */
export const SCROLL_THRESHOLD = 400;

/** True when the reader is within `SCROLL_THRESHOLD` of the document's end. */
export function shouldLoadNext(scrollY: number, innerHeight: number, docHeight: number): boolean {
	return scrollY + innerHeight > docHeight - SCROLL_THRESHOLD;
}

export interface Crossing {
	kind: 'enter' | 'exit-up';
	bookSlug: string;
	chapter: number;
}

export interface CrossingInput {
	isIntersecting: boolean;
	/** The anchor's `boundingClientRect.top`, in viewport coordinates. */
	top: number;
	viewportHeight: number;
	bookSlug: string;
	chapter: number;
}

/**
 * Decide what an observation of a chapter anchor means, given no DOM.
 *
 * The observer's root margin puts the activation band across the top 30% of
 * the viewport, so an intersecting anchor means that chapter just became the
 * one being read. A *non*-intersecting anchor is ambiguous, and the `top`
 * bounds are what disambiguate it:
 *
 * - `top <= 0` · scrolled off the top. The reader is below this chapter and
 *   moving away from it, so there is nothing to activate.
 * - `top >= viewportHeight` · below the fold. This is what a freshly appended
 *   anchor reports on its very first observation, and treating it as a
 *   crossing would activate the wrong chapter the instant one is loaded.
 * - in between · genuinely on screen and below the band, which only happens
 *   when the reader is scrolling up past it. The caller should then activate
 *   the chapter loaded immediately before this one.
 */
export function chapterCrossing(input: CrossingInput): Crossing | null {
	const { isIntersecting, top, viewportHeight, bookSlug, chapter } = input;
	if (!bookSlug || !Number.isFinite(chapter) || chapter <= 0) return null;
	if (isIntersecting) return { kind: 'enter', bookSlug, chapter };
	if (top > 0 && top < viewportHeight) return { kind: 'exit-up', bookSlug, chapter };
	return null;
}

export const CHAPTER_ANCHOR_SELECTOR = '[data-chapter-anchor]';

/**
 * Watch every chapter anchor and report crossings. A thin DOM adapter over
 * `chapterCrossing`, holding no logic of its own.
 */
export function createChapterObserver(onCrossing: (c: Crossing) => void): IntersectionObserver {
	return new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				const el = entry.target as HTMLElement;
				const crossing = chapterCrossing({
					isIntersecting: entry.isIntersecting,
					top: entry.boundingClientRect.top,
					viewportHeight: window.innerHeight,
					bookSlug: el.dataset.bookSlug ?? '',
					chapter: parseInt(el.dataset.chapterNum ?? '0', 10)
				});
				if (crossing) onCrossing(crossing);
			}
		},
		{ rootMargin: '0px 0px -70% 0px', threshold: 0 }
	);
}

/** Observe every chapter anchor currently inside `container`. */
export function observeAllAnchors(container: HTMLElement, observer: IntersectionObserver): void {
	container.querySelectorAll(CHAPTER_ANCHOR_SELECTOR).forEach((el) => observer.observe(el));
}

/** Observe one newly rendered chapter anchor. Call after `tick()`. */
export function observeNewAnchor(
	container: HTMLElement,
	observer: IntersectionObserver,
	bookSlug: string,
	chapter: number
): void {
	const el = container.querySelector(
		`${CHAPTER_ANCHOR_SELECTOR}[data-book-slug="${bookSlug}"][data-chapter-num="${chapter}"]`
	);
	if (el) observer.observe(el);
}
```

- [ ] **Step 4: Run the test and watch it pass**

```bash
npx vitest run tests/unit/utils/infiniteScroll.test.ts
```

Expected: PASS, 12 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/infiniteScroll.ts tests/unit/utils/infiniteScroll.test.ts
git commit -m "feat(bible): scroll predicate and chapter-crossing rule"
git status --short
```

---

### Task 3: Chrome anchor shift

**Files:**
- Modify: `src/lib/stores/chrome.ts` (append after `revealChrome`, and add the reducer beside `nextChromeState` around line 46)
- Test: `tests/unit/chrome.test.ts`

**Interfaces:**
- Consumes: existing `ChromeScrollState`, `initialChromeState`, `nextChromeState`, `HIDE_AFTER`, `REVEAL_AFTER_UP` from `$lib/stores/chrome`.
- Produces: `shiftChromeAnchor(state: ChromeScrollState, delta: number): ChromeScrollState` and the wired `anchorChromeShift(delta: number): void`. Task 8 and Task 9 call `anchorChromeShift`.

This is the piece that keeps the two scroll consumers from fighting. `nextChromeState` compares the incoming position against `state.lastY`; a compensation jump is a change in position that the reader did not ask for, so the anchor has to move with it.

- [ ] **Step 1: Write the failing test**

Append to `tests/unit/chrome.test.ts` (the file already imports `HIDE_AFTER`, `REVEAL_AFTER_UP`, `initialChromeState`, `nextChromeState` and `ChromeScrollState`, and defines the `scrollThrough` helper; add `shiftChromeAnchor` to the existing import list):

```ts
describe('shiftChromeAnchor', () => {
	/** A state that is hidden, having scrolled down well past the top zone. */
	function hiddenAt(y: number): ChromeScrollState {
		const state = scrollThrough([0, HIDE_AFTER + 1, y]);
		expect(state.hidden).toBe(true);
		return state;
	}

	it('moves the anchor by the delta and leaves the bars alone', () => {
		const before = hiddenAt(1000);
		const after = shiftChromeAnchor(before, 900);
		expect(after.lastY).toBe(before.lastY + 900);
		expect(after.hidden).toBe(true);
		expect(after.upDistance).toBe(before.upDistance);
	});

	it('keeps the bars hidden through a prepend compensation', () => {
		// A prepend inserts 900px above the viewport, so the browser is scrolled
		// down by 900 to keep the text still. Without the shift this reads as
		// deliberate downward travel.
		const shifted = shiftChromeAnchor(hiddenAt(1000), 900);
		expect(nextChromeState(shifted, 1900).hidden).toBe(true);
	});

	it('does not reveal the bars through a prune compensation', () => {
		// Pruning 900px from above the viewport scrolls up by 900, which is well
		// past REVEAL_AFTER_UP and would otherwise pop the bars back.
		expect(REVEAL_AFTER_UP).toBeLessThan(900);
		const shifted = shiftChromeAnchor(hiddenAt(2000), -900);
		expect(nextChromeState(shifted, 1100).hidden).toBe(true);
	});

	it('still reveals on genuine upward scrolling after a shift', () => {
		const shifted = shiftChromeAnchor(hiddenAt(1000), 900);
		const revealed = nextChromeState(shifted, 1900 - REVEAL_AFTER_UP);
		expect(revealed.hidden).toBe(false);
	});

	it('clamps the anchor at zero', () => {
		const shifted = shiftChromeAnchor(hiddenAt(1000), -100000);
		expect(shifted.lastY).toBe(0);
	});
});
```

- [ ] **Step 2: Run the test and watch it fail**

```bash
npx vitest run tests/unit/chrome.test.ts
```

Expected: FAIL, `shiftChromeAnchor is not exported by ...stores/chrome.ts` (or `is not a function`).

- [ ] **Step 3: Write the implementation**

In `src/lib/stores/chrome.ts`, add the reducer immediately after `nextChromeState` (before the `── Store wiring ──` divider):

```ts
/**
 * Re-anchor after the document shifted underneath the reader, which is what an
 * infinite-scroll prepend or prune compensation does. `hidden` and `upDistance`
 * are left exactly as they were: the page moved, the reader did not scroll, so
 * no decision should change.
 */
export function shiftChromeAnchor(state: ChromeScrollState, delta: number): ChromeScrollState {
	return { ...state, lastY: Math.max(0, state.lastY + delta) };
}
```

And add the wired form at the end of the file, after `revealChrome`:

```ts
/**
 * Tell the store that `delta` pixels appeared above (positive) or were removed
 * from above (negative) the viewport, and that the accompanying `scrollTo` is
 * compensation rather than intent.
 *
 * Call this synchronously right after the `scrollTo`. The browser dispatches
 * the resulting scroll event afterwards, and `onScroll` reads `window.scrollY`
 * inside a `requestAnimationFrame` rather than at event time · so by the time
 * any frame runs, position and anchor have both moved by `delta` and the
 * reducer sees no travel at all.
 *
 * Deliberately does not publish: unlike `suspendChrome` and `revealChrome`,
 * which reset to visible, this must not change what the bars are doing.
 */
export function anchorChromeShift(delta: number) {
	if (!delta) return;
	state = shiftChromeAnchor(state, delta);
}
```

- [ ] **Step 4: Run the test and watch it pass**

```bash
npx vitest run tests/unit/chrome.test.ts
```

Expected: PASS, all existing chrome tests plus 5 new ones.

- [ ] **Step 5: Commit**

```bash
git add src/lib/stores/chrome.ts tests/unit/chrome.test.ts
git commit -m "feat(chrome): re-anchor without changing bar state"
git status --short
```

---

### Task 4: The pref and its toggle

**Files:**
- Modify: `src/lib/stores/prefs.ts` (interface around line 44, defaults around line 70)
- Modify: `src/lib/components/ui/ReadingPrefs.svelte` (insert after the « Numérotation Vulgate (psaumes) » block, which currently closes at line 508)
- Test: `tests/e2e/bible-infinite-scroll.test.ts` (create)

**Interfaces:**
- Consumes: `updatePref` from `$lib/stores/prefs`.
- Produces: `$prefs.infiniteScroll: boolean`, default `false`. Tasks 7 to 10 gate on it. The e2e helper `enableInfiniteScroll(page)` defined here is reused by every later e2e test.

The toggle goes **last** in the Bible group on purpose. `bible-reading-mode.test.ts` picks Afficher/Masquer buttons positionally, and `.nth(2)` and `.nth(3)` must keep meaning « Barre de chapitres » and « Numérotation Vulgate ». Appending cannot disturb them.

The button labels are « Activé » and « Désactivé », masculine to agree with *défilement*. That also keeps them clear of the bionic toggle's « Activée », which `bible-reading-mode.test.ts:521` selects with `exact: true`.

- [ ] **Step 1: Write the failing test**

Create `tests/e2e/bible-infinite-scroll.test.ts`:

```ts
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// ReadingPrefs unmounts on close, so its tab state resets on every open ·
// the Lecture tab has to be reselected each time, as in bible-reading-mode.
async function openReadingTab(page: Page) {
	await page.getByRole('button', { name: 'Options de lecture' }).click();
	const dialog = page.getByRole('dialog', { name: 'Options de lecture' });
	await dialog.getByRole('button', { name: 'Lecture' }).click();
	return dialog;
}

async function enableInfiniteScroll(page: Page) {
	const dialog = await openReadingTab(page);
	await dialog.getByRole('button', { name: 'Activé', exact: true }).click();
	await page.keyboard.press('Escape');
}

test('infinite scroll is off by default and the toggle persists', async ({ page }) => {
	await page.goto('/bible/genese/1');

	const stored = await page.evaluate(() =>
		JSON.parse(localStorage.getItem('catechismecatholique.prefs') ?? '{}')
	);
	expect(stored.infiniteScroll ?? false).toBe(false);

	await enableInfiniteScroll(page);
	const after = await page.evaluate(() =>
		JSON.parse(localStorage.getItem('catechismecatholique.prefs') ?? '{}')
	);
	expect(after.infiniteScroll).toBe(true);

	// Survives a reload, and can be turned back off.
	await page.reload();
	let dialog = await openReadingTab(page);
	await dialog.getByRole('button', { name: 'Désactivé', exact: true }).click();
	await page.keyboard.press('Escape');
	const off = await page.evaluate(() =>
		JSON.parse(localStorage.getItem('catechismecatholique.prefs') ?? '{}')
	);
	expect(off.infiniteScroll).toBe(false);
});

test('the new toggle does not displace the existing Bible controls', async ({ page }) => {
	// bible-reading-mode.test.ts selects these positionally. If the infinite
	// scroll toggle were inserted anywhere but last, those tests would start
	// flipping the wrong setting and the failure would look unrelated.
	await page.goto('/bible/genese/1');
	const dialog = await openReadingTab(page);
	await dialog.getByRole('button', { name: 'Masquer' }).nth(2).click();
	await page.keyboard.press('Escape');
	await expect(page.locator('.bible-chapter-nav')).toHaveCount(0);
});
```

- [ ] **Step 2: Run the test and watch it fail**

```bash
SKIP_PREPARE_DATA=true npx playwright test tests/e2e/bible-infinite-scroll.test.ts
```

Expected: FAIL on the first test, timing out waiting for a button named « Activé » because the toggle does not exist yet. The second test should already pass.

- [ ] **Step 3: Add the pref**

In `src/lib/stores/prefs.ts`, add to the `ReadingPrefs` interface immediately after `bionicSaccade`:

```ts
	infiniteScroll: boolean; // Bible reader: load the next chapter as you scroll
```

and to `DEFAULTS` immediately after `bionicSaccade: 0`:

```ts
	infiniteScroll: false,
```

- [ ] **Step 4: Add the toggle**

In `src/lib/components/ui/ReadingPrefs.svelte`, insert this block immediately after the closing `</div>` of the « Numérotation Vulgate (psaumes) » group and before the `</div>` that closes `class="space-y-4"`:

```svelte
						<div>
							<span class="block mb-2 text-muted text-[13px]">Défilement continu</span>
							<div class="flex gap-1.5">
								<button
									type="button"
									class="flex-1 py-1.5 border rounded text-xs
										{$prefs.infiniteScroll
										? 'bg-accent/15 text-accent-text border-accent'
										: 'pill-border text-foreground hover:text-accent-text'}"
									onclick={() => updatePref('infiniteScroll', true)}
								>
									Activé
								</button>
								<button
									type="button"
									class="flex-1 py-1.5 border rounded text-xs
										{!$prefs.infiniteScroll
										? 'bg-accent/15 text-accent-text border-accent'
										: 'pill-border text-foreground hover:text-accent-text'}"
									onclick={() => updatePref('infiniteScroll', false)}
								>
									Désactivé
								</button>
							</div>
						</div>
```

- [ ] **Step 5: Run the test and watch it pass**

```bash
SKIP_PREPARE_DATA=true npx playwright test tests/e2e/bible-infinite-scroll.test.ts
```

Expected: PASS, 2 tests.

- [ ] **Step 6: Confirm the positional selectors still hold**

```bash
SKIP_PREPARE_DATA=true npx playwright test tests/e2e/bible-reading-mode.test.ts
```

Expected: PASS, 32 tests. If anything here fails, the toggle was not appended last.

- [ ] **Step 7: Commit**

```bash
git add src/lib/stores/prefs.ts src/lib/components/ui/ReadingPrefs.svelte tests/e2e/bible-infinite-scroll.test.ts
git commit -m "feat(bible): add the infinite-scroll preference and its toggle"
git status --short
```

---

### Task 5: Extract `BibleChapter.svelte`

**Files:**
- Create: `src/lib/components/bible/BibleChapter.svelte`
- Modify: `src/lib/components/bible/BibleReader.svelte`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `BibleChapter` with props `{ book: BookInfo; chapter: number; verses: { v: number; text: string }[]; verseIdx: BibleVerseIndex; sections: NclSection[]; paragraphs: NclChapterBlocks | null; studyMode: boolean; headingLevel?: 'h1' | 'h2' }`. Task 7 renders one per loaded chapter.

A pure refactor with zero behaviour change. The existing suite is the test: it passes before and must pass after, byte-identical rendering for a single chapter.

- [ ] **Step 1: Establish the baseline**

```bash
cd "/Users/Janvier/Documents/Bible n stuff/Websites/catechismecatholique"
SKIP_PREPARE_DATA=true npx playwright test tests/e2e/bible-reading-mode.test.ts
```

Expected: PASS, 32 tests. Record the number. If this does not pass before you change anything, stop and report.

- [ ] **Step 2: Create the component**

Create `src/lib/components/bible/BibleChapter.svelte`. Move these regions of `BibleReader.svelte` into it **verbatim**, changing nothing about the markup or the CSS:

- from the `<script>`: the `richHtmlByVerse`, `verseHtml`, `sectionsByVerse`, `headingsByBlock`, `vulgateLabel`, `citedCount`, `totalCited`, `openVerse` and `isVerseActive` members, and the `SvelteMap`, `studyPanel`/`openPanel`, `prefs` and `vulgatePsalmLabel` imports they need;
- the `<header class="mb-10">` block and the whole `<article>` block;
- the entire `<style>` block.

Its props replace the old `$props()` destructuring:

```svelte
<script lang="ts">
	let {
		book,
		chapter,
		verses,
		verseIdx,
		sections = [],
		paragraphs = null,
		studyMode,
		headingLevel = 'h1'
	}: {
		book: BookInfo;
		chapter: number;
		verses: { v: number; text: string }[];
		verseIdx: BibleVerseIndex;
		sections?: NclSection[];
		paragraphs?: NclChapterBlocks | null;
		studyMode: boolean;
		headingLevel?: 'h1' | 'h2';
	} = $props();
</script>
```

Two adjustments to the moved code, and no others:

1. `sections` now arrives as the **whole book's** sections rather than one chapter's slice, so `sectionsByVerse` must filter by chapter the way `headingsByBlock` already does. Change its loop header from `for (const s of sections)` to:

```ts
		for (const s of sections.filter((s) => s.ch === chapter)) {
```

2. The `<h1>` becomes dynamic so appended chapters do not stack `h1`s:

```svelte
			<svelte:element
				this={headingLevel}
				class="font-heading text-[2.5rem] leading-[1.2] tracking-[-0.01em] text-foreground mb-3"
			>
				Chapitre {chapter}{#if vulgateLabel}<span
						class="vulgate-psalm ml-[6px] font-ui text-[1.1rem] tracking-normal text-subtle"
						>(Vg {vulgateLabel})</span
					>{/if}
			</svelte:element>
```

Wrap the whole thing in the section element the reader will key on:

```svelte
<section data-chapter-section>
	<div
		data-chapter-anchor
		data-book-slug={book.slug}
		data-chapter-num={chapter}
	></div>
	<header class="mb-10">...</header>
	<article>...</article>
</section>
```

The anchor is an empty div rather than the header itself so the observer measures a zero-height point, which makes the top-30% band unambiguous.

- [ ] **Step 3: Reduce `BibleReader.svelte` to the shell**

`BibleReader.svelte` keeps its existing props exactly as they are for now (Task 6 changes them), keeps the `{#if !$prefs.hideChapterNav}<ChapterNavBar .../>{/if}` block, keeps `<main>` with all three data attributes, keeps the footer `<nav>`, and renders one `BibleChapter` in place of what it just gave away:

```svelte
<main
	class="mx-auto max-w-reader px-6 max-md:px-4 pt-8 max-md:pt-5 pb-16"
	data-corpus="bible"
	data-bible-layout={$prefs.bibleLayout}
	data-study-mode={studyMode}
>
	<BibleChapter
		{book}
		{chapter}
		{verses}
		{verseIdx}
		{sections}
		{paragraphs}
		{studyMode}
		headingLevel="h1"
	/>

	<!-- The existing prev/next nav block, character for character as it is
	     today. Task 7 wraps it in a conditional; leave it alone here. -->
	<nav
		class="mt-16 pt-8 border-t border-border flex justify-between font-ui text-sm"
		aria-label="Chapitre précédent ou suivant"
	>
		{#if prevHref}
			<a href={prevHref} class="text-accent hover:underline whitespace-nowrap"
				>← Chapitre {chapter - 1}</a
			>
		{:else}<span></span>{/if}
		{#if nextHref}
			<a href={nextHref} class="text-accent hover:underline whitespace-nowrap"
				>Chapitre {chapter + 1} →</a
			>
		{:else}<span></span>{/if}
	</nav>
</main>
```

It still needs `studyMode`, `prevHref`, `nextHref` and `totalCited` (for `ChapterNavBar`'s `citedVerseCount`), so keep `citedCount` and `totalCited` in the reader as well as the copy in `BibleChapter`. Delete from the reader everything else that moved, including the whole `<style>` block, and drop the now-unused imports (`SvelteMap`, `openPanel`, `vulgatePsalmLabel`).

Add the section spacing to `BibleReader`'s style block, which is now the only thing in it:

```svelte
<style>
	/* Gap between stacked chapters, as a *bottom* margin on all but the last.
	   Deliberately not a top margin on all but the first: pruning a chapter off
	   the front would then change the surviving first chapter's box height, and
	   the scroll compensation would have to carry a magic constant to match
	   (ODR's BibleReader.svelte:214 does exactly that). Bottom margins keep
	   front-pruning purely subtractive. Back-pruning changes the last element
	   instead, and anything below the viewport cannot move the text above it. */
	main :global([data-chapter-section]:not(:last-of-type)) {
		margin-bottom: 3rem;
	}
</style>
```

- [ ] **Step 4: Verify nothing moved**

```bash
SKIP_PREPARE_DATA=true npx playwright test tests/e2e/bible-reading-mode.test.ts
npx vitest run
npm run check
```

Expected: 32 e2e PASS (in particular the 702px / 552px / 872px assertions and « chapter header shows a book eyebrow and is left-aligned », which needs the `h1` to still be an `h1`), 297 unit PASS, `check` clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/bible/BibleChapter.svelte src/lib/components/bible/BibleReader.svelte
git commit -m "refactor(bible): split one chapter's markup out of BibleReader"
git status --short
```

---

### Task 6: Data plumbing for chapters the page was not given

**Files:**
- Modify: `src/routes/bible/[book=biblebook]/[ch]/+page.ts:34-47`
- Modify: `src/routes/bible/[book=biblebook]/[ch]/+page.svelte`
- Modify: `src/lib/components/bible/BibleReader.svelte`

**Interfaces:**
- Consumes: `BibleChapter` from Task 5.
- Produces: `BibleReader` props change shape. `sections: NclSection[]` (one chapter) becomes `sectionsByBook: NclSectionMap` (every book, keyed by USFX); `hasConcordance: boolean` becomes `concordanceManifest: Record<string, number[]>` (keyed by slug); `chapterCounts` keeps its existing shape and becomes load-bearing. `BibleReader` now owns the `<title>`.

- [ ] **Step 1: Establish the baseline**

```bash
SKIP_PREPARE_DATA=true npx playwright test tests/e2e/bible-reading-mode.test.ts tests/e2e/bible-hub.test.ts
```

Expected: PASS. `bible-hub.test.ts` asserts the `h1` reads « Chapitre 28 » and that `li#v1` is visible, which is the guard that the section-filter move did not lose any headings.

- [ ] **Step 2: Widen the load function**

In `+page.ts`, delete the two `bookSections` / `chapterSections` lines and the `hasConcordance` line, and change the return:

```ts
	const bookSections = parentData.sections[book.usfx] ?? [];
	const chapterSections = bookSections.filter((s) => s.ch === ch);   // delete
	const hasConcordance = (parentData.concordanceManifest[book.slug] ?? []).includes(ch); // delete
```

becomes nothing, and the returned object becomes:

```ts
	return {
		book,
		chapter: ch,
		verses,
		verseIdx: parentData.verseIdx,
		totalChapters,
		// The whole map, not this chapter's slice: infinite scroll renders
		// chapters this load function never saw. Both are already in the SSR
		// payload via /bible/+layout.ts, so this costs nothing extra.
		sectionsByBook: parentData.sections,
		concordanceManifest: parentData.concordanceManifest,
		chapterCounts: parentData.chapterCounts,
		paragraphs: paragraphsBook?.[String(ch)] ?? null
	};
```

Note that `+page.ts` previously returned a key named `sections`, which shadowed the layout's full map of the same name. Renaming to `sectionsByBook` is what un-shadows it.

- [ ] **Step 3: Update the page component**

`+page.svelte` becomes, in full:

```svelte
<script lang="ts">
	import BibleReader from '$lib/components/bible/BibleReader.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<BibleReader
	book={data.book}
	chapter={data.chapter}
	verses={data.verses}
	verseIdx={data.verseIdx}
	totalChapters={data.totalChapters}
	sectionsByBook={data.sectionsByBook}
	concordanceManifest={data.concordanceManifest}
	chapterCounts={data.chapterCounts}
	paragraphs={data.paragraphs}
/>
```

The `<svelte:head><title>` moves out. `replaceState` does not re-run `load`, so a title owned by the page component would freeze on the entry chapter once Task 8 starts syncing the URL.

- [ ] **Step 4: Update the reader's props and add the title**

In `BibleReader.svelte`, replace the props block:

```svelte
	let {
		book,
		chapter,
		verses,
		verseIdx,
		totalChapters,
		sectionsByBook = {},
		concordanceManifest = {},
		chapterCounts = {},
		paragraphs = null
	}: {
		book: BookInfo;
		chapter: number;
		verses: { v: number; text: string }[];
		verseIdx: BibleVerseIndex;
		totalChapters: number;
		sectionsByBook?: NclSectionMap;
		concordanceManifest?: Record<string, number[]>;
		chapterCounts?: Record<string, number>;
		paragraphs?: NclChapterBlocks | null;
	} = $props();

	const bookSections = $derived(sectionsByBook[book.usfx] ?? []);
	const hasConcordance = $derived((concordanceManifest[book.slug] ?? []).includes(chapter));
```

Import `NclSectionMap` alongside the existing type imports. Pass `sections={bookSections}` to `BibleChapter`. `ChapterNavBar` keeps taking `{hasConcordance}` as a boolean, unchanged.

Add the title:

```svelte
<svelte:head>
	<title>{book.frenchName} {chapter} dans la Bible · Catéchisme de l'Église Catholique</title>
</svelte:head>
```

The string is character-for-character what `+page.svelte` produced.

- [ ] **Step 5: Verify**

```bash
SKIP_PREPARE_DATA=true npx playwright test tests/e2e/bible-reading-mode.test.ts tests/e2e/bible-hub.test.ts
npm run check
```

Expected: PASS, and `check` clean. A failure in « show-section-headings toggle reveals headings » or « paragraph mode renders section headings once shown » means the per-chapter filter added in Task 5 is not filtering.

- [ ] **Step 6: Commit**

```bash
git add "src/routes/bible/[book=biblebook]/[ch]/+page.ts" "src/routes/bible/[book=biblebook]/[ch]/+page.svelte" src/lib/components/bible/BibleReader.svelte
git commit -m "refactor(bible): give the reader whole-Bible section and concordance data"
git status --short
```

---

### Task 7: Render a window of chapters and append on scroll

**Files:**
- Modify: `src/lib/components/bible/BibleReader.svelte`
- Test: `tests/e2e/bible-infinite-scroll.test.ts`

**Interfaces:**
- Consumes: `nextChapterRef`, `ChapterRef` (Task 1); `shouldLoadNext`, `createChapterObserver`, `observeAllAnchors`, `observeNewAnchor`, `Crossing` (Task 2); `$prefs.infiniteScroll` (Task 4); `BibleChapter` (Task 5); `sectionsByBook`, `chapterCounts` (Task 6).
- Produces: internal `LoadedChapter` state and `loadNext()`. Task 8 adds URL sync on top; Task 9 adds `loadPrev()` and pruning.

- [ ] **Step 1: Write the failing tests**

Append to `tests/e2e/bible-infinite-scroll.test.ts`:

```ts
/** Scroll to the bottom in steps, the way a reader does. A single jump can
 *  outrun the rAF-throttled handler on a slow runner. */
async function scrollToBottom(page: Page, steps = 6) {
	for (let i = 0; i < steps; i++) {
		await page.evaluate(() => window.scrollBy(0, window.innerHeight));
		await page.waitForTimeout(120);
	}
}

/**
 * Scroll down until `chapter`'s anchor is in the DOM.
 *
 * Deliberately not "scroll N screens then assert an exact chapter count":
 * each append lengthens the document, so a fixed number of viewport-sized
 * steps loads an amount that depends on chapter length and viewport height.
 * Asserting `toHaveCount(2)` after a fixed scroll is inherently racy.
 */
async function scrollUntilChapter(page: Page, chapter: number, maxSteps = 20) {
	const anchor = page.locator(`[data-chapter-anchor][data-chapter-num="${chapter}"]`);
	for (let i = 0; i < maxSteps; i++) {
		if (await anchor.count()) return;
		await page.evaluate(() => window.scrollBy(0, window.innerHeight));
		await page.waitForTimeout(150);
	}
	await expect(anchor).toHaveCount(1);
}

test('with the pref off, reaching the bottom loads nothing and the footer nav stays', async ({
	page
}) => {
	await page.goto('/bible/genese/1');
	await scrollToBottom(page);

	await expect(page.locator('[data-chapter-section]')).toHaveCount(1);
	await expect(page.getByRole('navigation', { name: 'Chapitre précédent ou suivant' })).toBeVisible();
	expect(page.url()).toMatch(/\/bible\/genese\/1$/);
});

test('with the pref on, the next chapter appends inside the same main', async ({ page }) => {
	await page.goto('/bible/genese/1');
	await enableInfiniteScroll(page);
	await scrollUntilChapter(page, 2);

	// Inside the one <main> that carries the column-width compensation, not a
	// sibling container.
	await expect(
		page.locator('main[data-corpus="bible"] [data-chapter-anchor][data-chapter-num="2"]')
	).toHaveCount(1);

	// The footer prev/next nav would be a wall between two loaded chapters.
	await expect(
		page.getByRole('navigation', { name: 'Chapitre précédent ou suivant' })
	).toHaveCount(0);

	// One h1, and the appended chapter is an h2 beneath it.
	await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
	await expect(page.getByRole('heading', { level: 2, name: /Chapitre 2/ })).toBeVisible();
});

test('the column-width guarantee survives a multi-chapter page', async ({ page }) => {
	// This is tests/e2e/bible-reading-mode.test.ts's 702px assertion, carried
	// into the new mode. It is the reason appended chapters live inside the
	// original <main> rather than in a container of their own.
	await page.goto('/bible/genese/1');
	await enableInfiniteScroll(page);
	await scrollUntilChapter(page, 2);

	expect(await page.locator('[data-chapter-section]').count()).toBeGreaterThan(1);
	await expect(page.locator('.verse-text').first()).toHaveCSS('width', '702px');
	await expect(page.locator('.verse-text').last()).toHaveCSS('width', '702px');
});
```

- [ ] **Step 2: Run the tests and watch them fail**

```bash
SKIP_PREPARE_DATA=true npx playwright test tests/e2e/bible-infinite-scroll.test.ts
```

Expected: the first new test PASSES (nothing loads yet, which is correct with the pref off), the other two FAIL with `expected count 2, received 1`.

- [ ] **Step 3: Add the loaded-chapter window**

In `BibleReader.svelte`'s `<script>`, add the imports:

```ts
	import { onMount, onDestroy, tick, untrack } from 'svelte';
	import { browser } from '$app/environment';
	import { loadNclBook, loadNclParagraphsBook } from '$lib/data/loaders';
	import { bookBySlug } from '$lib/utils/bibleBookSlug';
	import { nextChapterRef, type ChapterRef } from '$lib/utils/chapterCursor';
	import {
		shouldLoadNext,
		createChapterObserver,
		observeAllAnchors,
		observeNewAnchor,
		type Crossing
	} from '$lib/utils/infiniteScroll';
	import BibleChapter from './BibleChapter.svelte';
```

and the state:

```ts
	interface LoadedChapter {
		book: BookInfo;
		chapter: number;
		verses: { v: number; text: string }[];
		paragraphs: NclChapterBlocks | null;
	}

	/** Chapters above and below the reader are kept in the DOM; beyond this many
	 *  they are pruned from the far end. Five covers a fast scroll in either
	 *  direction without letting a long book accumulate unbounded. */
	const MAX_LOADED = 5;

	function entryChapter(): LoadedChapter {
		return { book, chapter, verses, paragraphs };
	}

	let loaded = $state<LoadedChapter[]>([entryChapter()]);
	let container: HTMLElement | undefined = $state();

	// A click on the chapter grid or a prev/next link re-runs load and hands us
	// new props. Without this the new chapter would be appended onto a window
	// built around the old one. ODR has no equivalent because scrolling is its
	// only way to reach another chapter.
	$effect(() => {
		const fresh = entryChapter();
		untrack(() => {
			loaded = [fresh];
		});
	});
```

- [ ] **Step 4: Add loading**

```ts
	// Single mutex across both directions. A prepend measures scrollHeight to
	// compute its compensation, and a concurrent append whose tick() has not
	// flushed leaves that measurement stale, so the compensation overshoots.
	// Serialising all loads removes the whole class of bug (ODR's
	// BibleReader.svelte:94-98 records the same finding).
	let loading = false;
	let destroyed = false;
	let scrollReady = false;
	let scrollRaf = 0;
	let observer: IntersectionObserver | null = null;

	function ensureObserver(): IntersectionObserver {
		if (!observer) observer = createChapterObserver(onCrossing);
		return observer;
	}

	function isLoaded(ref: ChapterRef): boolean {
		return loaded.some((l) => l.book.slug === ref.bookSlug && l.chapter === ref.chapter);
	}

	async function fetchChapter(ref: ChapterRef): Promise<LoadedChapter | null> {
		const info = bookBySlug(ref.bookSlug);
		if (!info) return null;
		// Within a book both of these are module-cache hits, because +page.ts
		// already asked for them. Only a book boundary costs a request.
		const [bookData, paragraphsBook] = await Promise.all([
			loadNclBook(ref.usfx),
			loadNclParagraphsBook(ref.usfx)
		]);
		const chData = bookData?.[String(ref.chapter)];
		if (!chData) return null;
		const nextVerses = Object.entries(chData)
			.map(([v, text]) => ({ v: parseInt(v, 10), text }))
			.sort((a, b) => a.v - b.v);
		return {
			book: info,
			chapter: ref.chapter,
			verses: nextVerses,
			paragraphs: paragraphsBook?.[String(ref.chapter)] ?? null
		};
	}

	async function loadNext() {
		if (loading || !$prefs.infiniteScroll) return;
		const last = loaded[loaded.length - 1];
		const ref = nextChapterRef(
			{ bookSlug: last.book.slug, usfx: last.book.usfx, chapter: last.chapter },
			chapterCounts
		);
		if (!ref || isLoaded(ref)) return;

		loading = true;
		try {
			const entry = await fetchChapter(ref);
			if (entry && !destroyed) {
				loaded = [...loaded, entry];
				await tick();
				if (container) observeNewAnchor(container, ensureObserver(), ref.bookSlug, ref.chapter);
			}
		} catch (e) {
			console.warn('Failed to load the next chapter:', e);
		} finally {
			loading = false;
		}
	}

	function onScrollCheck() {
		if (!browser || !$prefs.infiniteScroll || !scrollReady) return;
		if (shouldLoadNext(window.scrollY, window.innerHeight, document.documentElement.scrollHeight)) {
			loadNext();
		}
	}

	function onScroll() {
		if (scrollRaf) return;
		scrollRaf = requestAnimationFrame(() => {
			scrollRaf = 0;
			onScrollCheck();
		});
	}

	// Task 8 replaces this body. For now the observer exists only so appended
	// anchors have something to attach to.
	function onCrossing(_c: Crossing) {}

	onMount(() => {
		if (container) observeAllAnchors(container, ensureObserver());
		window.addEventListener('scroll', onScroll, { passive: true });
		scrollReady = true;
	});

	onDestroy(() => {
		destroyed = true;
		observer?.disconnect();
		if (browser) {
			window.removeEventListener('scroll', onScroll);
			if (scrollRaf) cancelAnimationFrame(scrollRaf);
		}
	});
```

- [ ] **Step 5: Render the window**

Replace the single `<BibleChapter>` inside `<main>` with the loop, and gate the footer nav:

```svelte
	{#each loaded as item, i (item.book.slug + '-' + item.chapter)}
		<BibleChapter
			book={item.book}
			chapter={item.chapter}
			verses={item.verses}
			paragraphs={item.paragraphs}
			sections={sectionsByBook[item.book.usfx] ?? []}
			{verseIdx}
			{studyMode}
			headingLevel={i === 0 ? 'h1' : 'h2'}
		/>
	{/each}

	{#if !$prefs.infiniteScroll}
		<nav
			class="mt-16 pt-8 border-t border-border flex justify-between font-ui text-sm"
			aria-label="Chapitre précédent ou suivant"
		>
			{#if prevHref}
				<a href={prevHref} class="text-accent hover:underline whitespace-nowrap"
					>← Chapitre {chapter - 1}</a
				>
			{:else}<span></span>{/if}
			{#if nextHref}
				<a href={nextHref} class="text-accent hover:underline whitespace-nowrap"
					>Chapitre {chapter + 1} →</a
				>
			{:else}<span></span>{/if}
		</nav>
	{/if}
```

Add `bind:this={container}` to the `<main>` element. The `{#each}` key is load-bearing: without it a prepend in Task 9 would re-create every chapter's DOM and destroy the scroll position the compensation is trying to preserve.

- [ ] **Step 6: Run the tests and watch them pass**

```bash
SKIP_PREPARE_DATA=true npx playwright test tests/e2e/bible-infinite-scroll.test.ts
```

Expected: PASS, 5 tests.

- [ ] **Step 7: Confirm the guards**

```bash
SKIP_PREPARE_DATA=true npx playwright test tests/e2e/bible-reading-mode.test.ts
npm run check
```

Expected: 32 PASS, `check` clean.

- [ ] **Step 8: Commit**

```bash
git add src/lib/components/bible/BibleReader.svelte tests/e2e/bible-infinite-scroll.test.ts
git commit -m "feat(bible): append the next chapter as the reader nears the end"
git status --short
```

---

### Task 8: Track the active chapter and sync the URL

**Files:**
- Modify: `src/lib/components/bible/BibleReader.svelte`
- Test: `tests/e2e/bible-infinite-scroll.test.ts`

**Interfaces:**
- Consumes: `Crossing` (Task 2), the loaded window and `onCrossing` stub (Task 7), `debounce` from `$lib/utils/debounce`, `replaceState` from `$app/navigation`.
- Produces: `activeSlug` / `activeChapter` state and `setActive(slug, chapter)`. Task 9's rolling preload keys off them.

`replaceState` is shallow routing: per the SvelteKit docs it replaces the history entry without navigating, so `TopBar.svelte:42`'s `afterNavigate(() => revealChrome())` does **not** fire. That is what makes URL syncing safe to combine with hide-on-scroll.

- [ ] **Step 1: Write the failing test**

Append to `tests/e2e/bible-infinite-scroll.test.ts`:

```ts
test('the URL and the sticky nav follow the chapter in the viewport', async ({ page }) => {
	await page.goto('/bible/genese/1');
	await enableInfiniteScroll(page);
	await scrollUntilChapter(page, 2);

	// Put chapter 2's heading above the activation band.
	await page
		.locator('[data-chapter-anchor][data-chapter-num="2"]')
		.evaluate((el) => el.scrollIntoView({ block: 'start' }));
	await page.evaluate(() => window.scrollBy(0, 200));

	await expect.poll(() => page.url(), { timeout: 10_000 }).toMatch(/\/bible\/genese\/2$/);
	await expect(page.locator('.bible-chapter-nav button[aria-haspopup="dialog"]')).toContainText(
		'Genèse 2'
	);

	// The URL is real rather than cosmetic: reloading it serves chapter 2 as
	// the entry chapter. Note there is no back-button assertion here ·
	// replaceState *replaces* the current history entry, so the chapter 1
	// entry no longer exists to go back to. That is the intended behaviour:
	// scrolling through a book should not fill the reader's history with a
	// stack of chapters to back out through.
	await page.reload();
	await expect(page.getByRole('heading', { level: 1, name: /Chapitre 2/ })).toBeVisible();
});
```

- [ ] **Step 2: Run the test and watch it fail**

```bash
SKIP_PREPARE_DATA=true npx playwright test tests/e2e/bible-infinite-scroll.test.ts -g "follow the chapter"
```

Expected: FAIL, the poll times out with the URL still on `/bible/genese/1`.

- [ ] **Step 3: Implement active-chapter tracking**

Add to the imports:

```ts
	import { replaceState } from '$app/navigation';
	import { debounce } from '$lib/utils/debounce';
```

and add `type Crossing` back to the existing `$lib/utils/infiniteScroll` import. Task 7
deleted it, because its `onCrossing` was a zero-argument stub and an unused type import
is an eslint error under `@typescript-eslint/no-unused-vars`. This task gives the
callback a real parameter, so the type is needed again:

```ts
	import {
		shouldLoadNext,
		createChapterObserver,
		observeAllAnchors,
		observeNewAnchor,
		type Crossing
	} from '$lib/utils/infiniteScroll';
```

**`tsconfig.json` sets `noUncheckedIndexedAccess`.** Every array index and every
`.find()` in this task yields `T | undefined`, so each one needs an explicit guard. Task 7
hit the same thing and had to add `if (!last) return;` to `loadNext`. The code below is
written for that already; do not "simplify" the guards away, because the build will fail.

Add the state, replacing the `hasConcordance` derived from Task 6 and the `onCrossing` stub from Task 7:

```ts
	let activeSlug = $state(book.slug);
	let activeChapter = $state(chapter);

	const activeBook = $derived(bookBySlug(activeSlug) ?? book);
	// `loaded` is never empty · the reset effect always seeds it with the entry
	// chapter. The `?? loaded[0]` is for the window between an active chapter
	// being pruned and the observer reporting its replacement.
	const activeEntry = $derived<LoadedChapter | undefined>(
		loaded.find((l) => l.book.slug === activeSlug && l.chapter === activeChapter) ?? loaded[0]
	);
	const activeTotalChapters = $derived(chapterCounts[activeBook.usfx] ?? totalChapters);
	const hasConcordance = $derived(
		(concordanceManifest[activeBook.slug] ?? []).includes(activeChapter)
	);

	// The history entry is debounced; the bar label is not. A reader scrolling
	// fast should see the label keep up, while the history stays quiet.
	const syncUrl = debounce((slug: string, ch: number) => {
		if (!browser || destroyed) return;
		const path = `/bible/${slug}/${ch}`;
		if (window.location.pathname === path) return;
		replaceState(path, {});
	}, 200);

	function setActive(slug: string, ch: number) {
		if (slug === activeSlug && ch === activeChapter) return;
		activeSlug = slug;
		activeChapter = ch;
		syncUrl(slug, ch);
	}

	function onCrossing(c: Crossing) {
		if (c.kind === 'enter') {
			setActive(c.bookSlug, c.chapter);
			return;
		}
		// exit-up · this chapter's anchor dropped below the band while the reader
		// scrolled up, which means the chapter loaded before it is now the one
		// being read.
		const idx = loaded.findIndex((l) => l.book.slug === c.bookSlug && l.chapter === c.chapter);
		if (idx > 0) {
			const prev = loaded[idx - 1];
			// Guard required by noUncheckedIndexedAccess · idx > 0 already proves
			// this element exists, but the compiler does not know that.
			if (prev) setActive(prev.book.slug, prev.chapter);
		}
	}
```

Extend the reset effect from Task 7 with three things: the active chapter, a
generation counter, and re-observing the new anchor.

```ts
	// Bumped on every route change. An in-flight load captures the value before
	// its await and discards its result if the generation moved on · otherwise a
	// navigation that lands mid-append splices a chapter from the OLD book onto
	// the freshly reset window. Reachable in practice: appending across a book
	// boundary is a real network request, and the reader can use the chapter
	// grid while it is in flight.
	let generation = 0;

	$effect(() => {
		const fresh = entryChapter();
		untrack(() => {
			generation += 1;
			loaded = [fresh];
			activeSlug = fresh.book.slug;
			activeChapter = fresh.chapter;
			// The reset destroys the old chapter's anchor and creates a new one
			// that nothing is watching · `observeAllAnchors` runs only in
			// `onMount`, and `observeNewAnchor` covers only appended chapters.
			// Without this, after a chapter-grid click the observer never reports
			// an `enter` for the chapter the reader is actually on.
			tick().then(() => {
				if (!destroyed && container) observeAllAnchors(container, ensureObserver());
			});
		});
	});
```

Then make `loadNext` honour the generation. Capture it before the await and
re-check after, alongside the existing `destroyed` check:

```ts
		loading = true;
		const gen = generation;
		try {
			const entry = await fetchChapter(ref);
			if (entry && !destroyed && gen === generation) {
```

Add `syncUrl.cancel()` to `onDestroy`.

- [ ] **Step 4: Point the chrome at the active chapter**

`ChapterNavBar` and the title now follow the viewport:

```svelte
{#if !$prefs.hideChapterNav}
	<ChapterNavBar
		book={activeBook}
		chapter={activeChapter}
		totalChapters={activeTotalChapters}
		{chapterCounts}
		{hasConcordance}
		citedVerseCount={activeEntry ? totalCitedIn(activeEntry) : 0}
		variant="reader"
	/>
{/if}

<svelte:head>
	<title
		>{activeBook.frenchName}
		{activeChapter} dans la Bible · Catéchisme de l'Église Catholique</title
	>
</svelte:head>
```

Replace the reader's `totalCited` derived with a function over any loaded chapter, since the count now depends on which chapter is active:

```ts
	/** Verses in `entry` that the Catechism cites · drives whether the
	 *  Lecture/Étude toggle is enabled. */
	function totalCitedIn(entry: LoadedChapter): number {
		const chIdx = verseIdx[entry.book.usfx]?.[String(entry.chapter)];
		if (!chIdx) return 0;
		return entry.verses.reduce((t, v) => t + ((chIdx[String(v.v)]?.length ?? 0) > 0 ? 1 : 0), 0);
	}
```

The reader's own `citedCount` helper is now unused; delete it. `BibleChapter` keeps its own copy.

The footer nav's `prevHref` / `nextHref` still derive from the entry `book` and `chapter` props, which is correct: it only renders when infinite scroll is off, and then the entry chapter is the only chapter.

- [ ] **Step 5: Run the test and watch it pass**

```bash
SKIP_PREPARE_DATA=true npx playwright test tests/e2e/bible-infinite-scroll.test.ts
```

Expected: PASS, 6 tests.

- [ ] **Step 6: Confirm the guards**

```bash
SKIP_PREPARE_DATA=true npx playwright test tests/e2e/bible-reading-mode.test.ts tests/e2e/bible-hub.test.ts
npm run check
```

Expected: PASS. Watch « Lecture/Étude lives in the chapter nav row » and « the toggle is disabled rather than removed when a chapter has no citations », which exercise `citedVerseCount` through its new path.

- [ ] **Step 7: Commit**

```bash
git add src/lib/components/bible/BibleReader.svelte tests/e2e/bible-infinite-scroll.test.ts
git commit -m "feat(bible): track the chapter in the viewport and sync the URL"
git status --short
```

---

### Task 9: Prepend, prune, and keep the bars still

**Files:**
- Modify: `src/lib/components/bible/BibleReader.svelte`
- Test: `tests/e2e/bible-infinite-scroll.test.ts`

**Interfaces:**
- Consumes: `prevChapterRef` (Task 1), `anchorChromeShift` (Task 3), the loaded window (Task 7), `setActive` and the active state (Task 8).
- Produces: `loadPrev()`, `pruneFront()`, `checkPreload()`. Nothing later consumes these.

This is the task the whole design exists to make safe. Two things happen here that nothing else in the app does: the document grows above the viewport, and chapters leave the DOM from above it. Both move `window.scrollY` without the reader asking, and both must be reported to the chrome store.

- [ ] **Step 1: Write the failing tests**

Append to `tests/e2e/bible-infinite-scroll.test.ts`:

```ts
test('a prepended chapter does not move the text the reader is on', async ({ page }) => {
	await page.goto('/bible/genese/5');
	await enableInfiniteScroll(page);
	await page.goto('/bible/genese/5');

	// Scroll into the body of chapter 5, so there is a reading position to hold.
	await page.evaluate(() => window.scrollTo(0, 800));
	const anchor = page.locator('[data-chapter-anchor][data-chapter-num="5"]');
	await expect(anchor).toHaveCount(1);

	// Take the reading before the prepend. The rolling preload sits behind a 2s
	// navigation cooldown precisely so a reader who has just arrived is not
	// yanked, which also leaves room for this measurement.
	const before = await anchor.evaluate((el) => el.getBoundingClientRect().top);

	await expect(page.locator('[data-chapter-anchor][data-chapter-num="4"]')).toHaveCount(1, {
		timeout: 15_000
	});
	await page.waitForTimeout(300); // let the compensation settle

	// Genèse 4 is around two thousand pixels of text. Without compensation this
	// anchor would be pushed down by that whole height; with it, the reader's
	// place has not moved.
	const after = await anchor.evaluate((el) => el.getBoundingClientRect().top);
	expect(Math.abs(after - before)).toBeLessThan(5);
});

test('the sticky bars do not flap while chapters are prepended', async ({ page }) => {
	// Both this feature and the reveal-on-scroll chrome consume the scroll
	// stream. A prepend compensation is a large downward jump in scrollY that
	// the reader did not perform, and without anchorChromeShift the chrome
	// reducer reads it as intent and tucks the header away mid-prepend.
	await page.goto('/bible/genese/5');
	await enableInfiniteScroll(page);
	await page.goto('/bible/genese/5');
	await expect(page.locator('[data-chapter-anchor][data-chapter-num="4"]')).toHaveCount(1, {
		timeout: 15_000
	});

	// Scroll down far enough to hide the bars, then settle.
	await page.evaluate(() => window.scrollTo(0, 1500));
	await expect(page.locator('html')).toHaveAttribute('data-chrome-hidden', 'true');

	// Cross the 120px reveal threshold first, so the bars are legitimately
	// visible before sampling begins. Sampling from the hidden state would
	// record a 'true' that is simply the starting condition.
	await page.evaluate(() => window.scrollBy(0, -200));
	await expect(page.locator('html')).toHaveAttribute('data-chrome-hidden', 'false');

	// Now keep scrolling up while prepends fire. Every prepend jumps scrollY
	// downward by the height of the inserted chapter; if that jump reaches the
	// chrome reducer it reads as downward intent and re-hides the bars. So the
	// attribute flipping back to 'true' during a continuous upward scroll is
	// exactly the flicker this test exists to catch.
	const seen = new Set<string | null>();
	for (let i = 0; i < 12; i++) {
		await page.evaluate(() => window.scrollBy(0, -60));
		await page.waitForTimeout(80);
		seen.add(await page.locator('html').getAttribute('data-chrome-hidden'));
	}
	expect([...seen]).toEqual(['false']);
});

test('the loaded window is capped', async ({ page }) => {
	await page.goto('/bible/genese/1');
	await enableInfiniteScroll(page);
	for (let i = 0; i < 30; i++) {
		await page.evaluate(() => window.scrollBy(0, window.innerHeight));
		await page.waitForTimeout(100);
	}
	const count = await page.locator('[data-chapter-section]').count();
	expect(count).toBeGreaterThan(1);
	expect(count).toBeLessThanOrEqual(5);
});
```

- [ ] **Step 2: Run the tests and watch them fail**

```bash
SKIP_PREPARE_DATA=true npx playwright test tests/e2e/bible-infinite-scroll.test.ts -g "prepend|flap|capped"
```

Expected: the two prepend tests FAIL waiting for chapter 4's anchor. The cap test may pass by accident if fewer than six chapters loaded; treat it as failing until pruning exists and re-check the count afterwards.

- [ ] **Step 3: Implement prepend with anchoring**

Add the imports:

```ts
	import { prevChapterRef } from '$lib/utils/chapterCursor';
	import { anchorChromeShift } from '$lib/stores/chrome';
```

Add the cooldown alongside the other module state:

```ts
	/** Chapters above and below the reader stay in the DOM; beyond this many,
	 *  the far end is pruned. Five covers a fast scroll in either direction
	 *  without letting a long book accumulate unbounded.
	 *
	 *  Task 7 deliberately omitted this constant, because nothing used it yet
	 *  and `@typescript-eslint/no-unused-vars` errors on an unused module const.
	 *  This is the task that gives it a use, so it is declared here. */
	const MAX_LOADED = 5;

	/** Blocks the rolling preload briefly after arrival, so a reader who has
	 *  just landed is not immediately shifted by a prepend. */
	let navCooldownUntil = 0;
	let preloadTimer: ReturnType<typeof setTimeout> | null = null;
```

Add the loader:

```ts
	async function loadPrev() {
		if (loading || !$prefs.infiniteScroll) return;
		const first = loaded[0];
		const ref = prevChapterRef(
			{ bookSlug: first.book.slug, usfx: first.book.usfx, chapter: first.chapter },
			chapterCounts
		);
		if (!ref || isLoaded(ref)) return;

		loading = true;
		try {
			const entry = await fetchChapter(ref);
			if (entry && !destroyed) {
				// Measure immediately before the mutation. After tick() the
				// difference is exactly the prepended chapter's rendered height,
				// including its margin.
				const y = window.scrollY;
				const oldHeight = document.documentElement.scrollHeight;
				loaded = [entry, ...loaded];
				await tick();
				const delta = document.documentElement.scrollHeight - oldHeight;
				if (!destroyed) {
					window.scrollTo({ top: y + delta, behavior: 'instant' });
					// Synchronously after the scrollTo, before the browser
					// dispatches the resulting scroll event. See the note on
					// anchorChromeShift in stores/chrome.ts.
					anchorChromeShift(delta);
					if (container) observeNewAnchor(container, ensureObserver(), ref.bookSlug, ref.chapter);
					const excess = loaded.length - MAX_LOADED;
					// Pruning from the back only touches content below the
					// viewport, so no compensation is needed.
					if (excess > 0) loaded = loaded.slice(0, loaded.length - excess);
				}
			}
		} catch (e) {
			console.warn('Failed to load the previous chapter:', e);
		} finally {
			loading = false;
		}
		checkPreload();
	}
```

- [ ] **Step 4: Implement front-pruning**

```ts
	/** Drop `count` chapters from above the viewport and pull the scroll
	 *  position up by exactly what they occupied, so the text does not jump. */
	async function pruneFront(count: number) {
		if (count <= 0 || !container || destroyed) return;
		const sections = container.querySelectorAll<HTMLElement>(':scope > [data-chapter-section]');
		let removed = 0;
		for (let i = 0; i < count && i < sections.length; i++) {
			const el = sections[i];
			// noUncheckedIndexedAccess · the loop bound already proves this, but
			// the compiler does not know it.
			if (!el) continue;
			const style = getComputedStyle(el);
			removed += el.getBoundingClientRect().height + parseFloat(style.marginBottom || '0');
			// An IntersectionObserver holds a strong reference to every target it
			// watches, and nothing else in this feature ever unobserves. Release
			// the anchors going away with this slice.
			const anchor = el.querySelector('[data-chapter-anchor]');
			if (anchor) observer?.unobserve(anchor);
		}
		const y = window.scrollY;
		loaded = loaded.slice(count);
		await tick();
		if (destroyed) return;
		window.scrollTo({ top: Math.max(0, y - removed), behavior: 'instant' });
		anchorChromeShift(-removed);
	}
```

**A failed load must not retry on every frame.** `fetchChapter` returns `null`
for an unknown slug or a missing chapter, and throws on a network error. Neither
records anything, so the next scroll event recomputes the identical ref, finds
`isLoaded` still false, and tries again, once per animation frame for as long as
the reader keeps scrolling near the bottom. Offline at a book boundary that is a
stream of failing requests and a `console.warn` per frame, while the reader just
sees a page that never advances.

Add a module-scope set beside `loading`:

```ts
	/** Refs whose load failed or came back empty · consulted alongside
	 *  `isLoaded` so a dead chapter is attempted once, not once per frame. */
	const failed = new Set<string>();

	function refKey(ref: ChapterRef): string {
		return `${ref.bookSlug}-${ref.chapter}`;
	}
```

Consult it in both loaders' early return, `if (!ref || isLoaded(ref) || failed.has(refKey(ref))) return;`,
and record into it whenever a load yields nothing:

```ts
			const entry = await fetchChapter(ref);
			if (!entry) failed.add(refKey(ref));
```

and in the `catch`, `failed.add(refKey(ref));` before the `console.warn`.

Call it at the end of `loadNext`'s success branch, replacing nothing else:

```ts
			if (entry && !destroyed) {
				loaded = [...loaded, entry];
				await tick();
				if (container) observeNewAnchor(container, ensureObserver(), ref.bookSlug, ref.chapter);
				const excess = loaded.length - MAX_LOADED;
				if (excess > 0) await pruneFront(excess);
			}
```

and add `checkPreload();` after `loadNext`'s `finally` block, matching `loadPrev`.

- [ ] **Step 5: Add the rolling preload**

```ts
	/**
	 * Keep two chapters loaded either side of the active one.
	 *
	 * Reacts to the *active chapter* changing, never to `loaded` changing: each
	 * load calls back in here once it has released the mutex, which is what
	 * cascades a multi-chapter catch-up. Reacting to `loaded` instead would
	 * recurse, since every load mutates it.
	 */
	function checkPreload() {
		if (!browser || !$prefs.infiniteScroll || !scrollReady || destroyed) return;
		if (Date.now() <= navCooldownUntil) return;
		const idx = loaded.findIndex(
			(l) => l.book.slug === activeSlug && l.chapter === activeChapter
		);
		if (idx === -1) return;
		// Forward first · that is the direction people read.
		if (loaded.length - 1 - idx < 2) {
			loadNext();
			return;
		}
		if (idx < 2) loadPrev();
	}

	$effect(() => {
		// Track only the active chapter. untrack() keeps checkPreload's reads of
		// `loaded` out of this effect's dependencies.
		activeSlug;
		activeChapter;
		untrack(() => checkPreload());
	});
```

**Re-arm the cooldown on every navigation, not only on mount.** Add
`navCooldownUntil = Date.now() + 2000;` to the reset effect's `untrack` block,
beside the existing re-seeding. Without it the cooldown protects only the first
arrival: a reader who lands on Genèse 1, reads for a minute, then jumps to
Genèse 9 from the chapter grid arrives with the cooldown long expired, so
`checkPreload` fires on the very next active-chapter change and `loadPrev`
prepends Genèse 8 underneath them. That is exactly the yank the cooldown is
described as preventing, and a param-only navigation reuses the component, so
nothing else re-arms it.

```ts
```

Extend `onMount`:

```ts
	onMount(() => {
		if (container) observeAllAnchors(container, ensureObserver());
		window.addEventListener('scroll', onScroll, { passive: true });
		scrollReady = true;
		navCooldownUntil = Date.now() + 2000;
		// Appending below the fold cannot shift what is on screen, so the first
		// forward preload is safe to run on a timer. Prepends wait for the
		// cooldown above.
		preloadTimer = setTimeout(() => {
			onScrollCheck();
			checkPreload();
		}, 2000);
	});
```

and `onDestroy`:

```ts
		if (preloadTimer) clearTimeout(preloadTimer);
```

Note that `onScrollCheck` still drives forward loading alone. Do not call `loadPrev` from the scroll handler: each prepend's compensation fires another scroll event, the handler sees the reader near the top again, and it cascades. `checkPreload` is the only path backwards.

- [ ] **Step 6: Run the tests and watch them pass**

```bash
SKIP_PREPARE_DATA=true npx playwright test tests/e2e/bible-infinite-scroll.test.ts
```

Expected: PASS, 9 tests.

- [ ] **Step 7: Confirm the chrome guards specifically**

```bash
SKIP_PREPARE_DATA=true npx playwright test tests/e2e/bible-reading-mode.test.ts -g "bars"
npx vitest run tests/unit/chrome.test.ts
```

Expected: « both bars hide on scroll down and return on scroll up » and « the bars stay put while the reading-options popover is open » both PASS, and the chrome unit tests PASS. These two ran green before infinite scroll existed and are the direct regression guard on this task.

- [ ] **Step 8: Commit**

```bash
git add src/lib/components/bible/BibleReader.svelte tests/e2e/bible-infinite-scroll.test.ts
git commit -m "feat(bible): prepend and prune chapters without disturbing the bars"
git status --short
```

---

### Task 10: Cross a book boundary

**Files:**
- Modify: `src/lib/components/bible/BibleReader.svelte` (only if the boundary case does not already work)
- Test: `tests/e2e/bible-infinite-scroll.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 1 to 9.
- Produces: nothing new.

`nextChapterRef` already returns a ref in the next book, and `fetchChapter` already resolves any slug through `bookBySlug` and fetches by USFX. This task exists to prove that end to end and to fix whatever it turns up, most likely in the header and nav labels, which have to switch books mid-page.

3 Jean has one chapter and 14 verses, and Jude follows it with one chapter and 25 verses. Both are short enough that the boundary is reached in a couple of screens.

**Two premises from Task 9 stop holding here, and this is where they break.**
Task 9's review flagged both as Task 10 shapes. Neither is reachable with
Genesis-sized chapters, and both are reachable with one-chapter books and
two-verse psalms.

*The back-prune assumes the tail is below the fold.* `loadPrev` drops chapters
off the end with no compensation and no chrome shift, on the premise that two
full chapters remain below the viewport. With short books that premise fails: if
the document shrinks below `scrollY + innerHeight`, the browser silently clamps
`scrollY` upward, the chrome store is never told, and the reducer banks the
clamp as `upDistance` where it can trip `REVEAL_AFTER_UP` and pop the bars.

*Front-pruning assumes the removed chapters sit entirely above the viewport.*
Five short psalms fit inside one viewport. The `Math.max(0, y - removed)` clamp
keeps the arithmetic in range, but the text genuinely moves, because part of
what was removed was on screen.

The fix for both is the same shape: never prune a section that is still visible.
Before pruning from either end, check the candidate's
`getBoundingClientRect()` and stop at the first one whose `bottom > 0` (front)
or `top < window.innerHeight` (back). Pruning fewer chapters than asked is
always safe; the window simply stays larger than `MAX_LOADED` until the reader
scrolls further.

Add a test using a short book. Psaume 117 is two verses; 2 Jean, 3 Jean, Jude,
Abdias and Philémon are all single-chapter books. A run down through several
consecutive short units, asserting both that `data-chrome-hidden` does not flap
and that a chosen anchor's viewport position stays stable, exercises both
premises at once.

- [ ] **Step 1: Write the failing test**

Append to `tests/e2e/bible-infinite-scroll.test.ts`:

```ts
test('scrolling past the end of a book continues into the next one', async ({ page }) => {
	// 3 Jean has a single chapter, so its end is a book boundary and not just a
	// chapter boundary. Jude follows it.
	await page.goto('/bible/3-jean/1');
	await enableInfiniteScroll(page);
	await page.goto('/bible/3-jean/1');
	await scrollToBottom(page);

	await expect(
		page.locator('[data-chapter-anchor][data-book-slug="jude"][data-chapter-num="1"]')
	).toHaveCount(1, { timeout: 15_000 });

	// The appended chapter carries its own book's eyebrow, not the entry book's.
	await expect(page.locator('.chapter-eyebrow')).toHaveCount(2);
	await expect(page.locator('.chapter-eyebrow').last()).toHaveText('Jude');

	// And the sticky bar retitles once Jude is the chapter being read.
	await page
		.locator('[data-chapter-anchor][data-book-slug="jude"]')
		.evaluate((el) => el.scrollIntoView({ block: 'start' }));
	await page.evaluate(() => window.scrollBy(0, 200));
	await expect
		.poll(() => page.url(), { timeout: 10_000 })
		.toMatch(/\/bible\/jude\/1$/);
	await expect(page.locator('.bible-chapter-nav button[aria-haspopup="dialog"]')).toContainText(
		'Jude 1'
	);
});
```

- [ ] **Step 2: Run the test**

```bash
SKIP_PREPARE_DATA=true npx playwright test tests/e2e/bible-infinite-scroll.test.ts -g "past the end of a book"
```

Expected: this may already PASS, since Tasks 1 and 7 built the boundary in. If it fails, the likeliest causes in order are: `sectionsByBook[item.book.usfx]` not being consulted per loaded chapter (Task 7 Step 5); `activeBook` resolving through the entry `book` rather than `bookBySlug(activeSlug)` (Task 8 Step 3); or `activeTotalChapters` falling back to the entry book's count instead of `chapterCounts[activeBook.usfx]`. Fix whichever applies, and only that.

- [ ] **Step 3: Confirm the reverse direction**

```bash
SKIP_PREPARE_DATA=true npx playwright test tests/e2e/bible-infinite-scroll.test.ts
```

Expected: PASS, 10 tests. The « scrolling up prepends » test from Task 9 covers within-book prepends; `prevChapterRef`'s boundary branch is unit-tested in Task 1.

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/bible/BibleReader.svelte tests/e2e/bible-infinite-scroll.test.ts
git commit -m "test(bible): infinite scroll carries across a book boundary"
git status --short
```

---

### Task 11: Full verification

**Files:** none created or modified beyond formatting.

- [ ] **Step 1: Format and lint**

```bash
cd "/Users/Janvier/Documents/Bible n stuff/Websites/catechismecatholique"
npm run format
npm run lint
```

Expected: clean. `format` may rewrite the files touched above; that is fine.

- [ ] **Step 2: Type check**

```bash
npm run check
```

Expected: 0 errors, 0 warnings.

- [ ] **Step 3: Unit suite**

```bash
npx vitest run
```

Expected: PASS. 297 before this work, plus 9 (Task 1) + 12 (Task 2) + 5 (Task 3), so roughly 323.

- [ ] **Step 4: Full e2e suite**

```bash
SKIP_PREPARE_DATA=true npx playwright test
```

Expected: PASS. 85 before, plus 10 new, so 95.

- [ ] **Step 5: Build**

```bash
SKIP_PREPARE_DATA=true npm run build
```

Expected: succeeds.

- [ ] **Step 6: Check nothing generated got staged**

```bash
git status --short | head -30
```

Expected: only `static/data/` noise, which must **not** be committed. If any source file is dirty, it is leftover formatting from Step 1.

- [ ] **Step 7: Commit any formatting**

```bash
git add src/lib/components/bible/BibleReader.svelte src/lib/components/bible/BibleChapter.svelte src/lib/utils/infiniteScroll.ts src/lib/utils/chapterCursor.ts src/lib/stores/chrome.ts src/lib/stores/prefs.ts src/lib/components/ui/ReadingPrefs.svelte tests/
git commit -m "style: formatting after the infinite-scroll work"
git status --short
```

Skip this step if nothing but `static/data/` is dirty.

- [ ] **Step 8: Report**

State the four numbers actually observed: unit count, e2e count, `check` result, build result. Do not report a count you did not see in the output.

---

## Accepted behaviour, documented rather than fixed

**Back-navigation returns to the entry chapter while the address bar keeps the
synced one.** `replaceState` stores `page.url.href` in the history entry's state,
and shallow routing never updates `page.url`, so the entry keeps pointing at the
chapter the reader arrived on however far they scroll. Leave the Bible and press
Back: SvelteKit's popstate handler is non-shallow, navigates to the stored URL,
and its `popped` branch writes no history, so the address bar shows
`/bible/genese/5` while chapter 1 is served.

This is inherent to calling `replaceState` with a URL different from the one the
entry was created with, and there is no clean fix in component code. The
alternative, `pushState` per chapter, is worse: it fills the reader's history
with a stack of chapters to back out through one at a time.

Note that Task 8's e2e test carries a comment claiming "the chapter 1 entry no
longer exists to go back to". That is true of the address bar and false of the
entry's internal state. Correct it if that test is ever touched. A Task 11
assertion pinning the accepted behaviour would be reasonable.

## Notes for the implementer

**If the header flickers during a prepend**, the cause is in exactly one of three places, in this order: `anchorChromeShift` not being called after a `scrollTo`; being called with the wrong sign (prepend is positive, prune is negative); or being called asynchronously, after the browser has already dispatched the scroll event. Confirm by logging `delta` and `window.scrollY` on both sides of the `scrollTo`.

**If the wrong chapter becomes active the moment one is appended**, the `chapterCrossing` below-the-fold branch is being bypassed. A freshly observed anchor fires immediately with `isIntersecting: false`, and the `top < viewportHeight` bound is what discards it.

**If prepends cascade**, `loadPrev` is reachable from the scroll handler. It must only ever be called from `checkPreload`.

**If a prepend overshoots by a small amount**, suspect `headingLevel`. It is
index-based (`i === 0 ? 'h1' : 'h2'`), so a prepend moves index 0 to the new
chapter and the previous first chapter's `<svelte:element>` changes tag, which
destroys and re-creates that heading element directly above the scroll position.
It should be benign, since `h1` and `h2` carry identical classes and the swap
happens inside the same flush the compensation measures, but it is a moving part
in exactly the wrong place and worth ruling out early rather than late.

**If `check` complains about `data-chapter-anchor`**, plain data attributes on an element need no typing; make sure it is `data-chapter-anchor` with no value rather than `data-chapter-anchor={true}`.
