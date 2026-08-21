# Bible Header Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Bible reader's header chrome to match the ODR reading experience: a left-aligned chapter header with a book-name eyebrow, a slimmer site-wide TopBar, the Lecture/Étude toggle lifted into the sticky chapter nav row and persisted, and both bars hiding on scroll-down / revealing on scroll-up.

**Architecture:** Four largely independent changes over `TopBar.svelte`, `BibleReader.svelte`, `ChapterNavBar.svelte` and `ChapterFilterBar.svelte`, plus one new pure store (`chrome.ts`) ported from the sibling douayrheimsbible project. The scroll behaviour is split deliberately: a DOM-free reducer (unit-tested) drives a single `data-chrome-hidden` attribute on `<html>`, and CSS does all the moving. This mirrors how `prefs.ts` already publishes `data-theme`, `data-justified` and friends.

**Tech Stack:** SvelteKit 2, Svelte 5 runes, Tailwind CSS 3, TypeScript, Vitest (unit), Playwright (e2e).

**Source spec:** `docs/superpowers/specs/2026-08-21-bible-reader-odr-port-design.md` (Part 1 only. Part 2 is a roadmap and is explicitly out of scope for this plan.)

## Global Constraints

- **Svelte syntax:** Bible components (`src/lib/components/bible/**`) and `ui/TopBar.svelte`, `ui/ModeToggle.svelte`, `ui/NavDrawer.svelte` use **Svelte 5 runes** (`$props`, `$state`, `$derived`, `$effect`, `$bindable`). Do not migrate anything to or from runes beyond what a task specifies. Stores in `src/lib/stores/` use Svelte 4 writable stores; keep that.
- **TDD is mandatory:** every task writes a failing test, runs it to watch it fail, then implements. Never write implementation first.
- **French copy:** periods go **inside** guillemets (`« Étude. »`, never `« Étude ».`). No em dashes in any user-facing string or comment.
- **Non-breaking spaces:** `&nbsp;` works only in static Svelte markup. Inside `{expressions}` and attribute values use a literal ` ` escape.
- **Prefs key:** `catechismecatholique.prefs`. `prefs.ts` has **no** version/migration machinery; `readInitial()` spreads `DEFAULTS` under the parsed object, so a new key needs no migration.
- **Regression guard:** the existing e2e assertions that `.verse-text` computes to **702px / 552px / 872px** (`tests/e2e/bible-reading-mode.test.ts:231-268`) must keep passing untouched. They are the guard on Task 4.
- **Commands:** `npm run test` (vitest unit), `npm run test:e2e` (playwright), `npm run check` (svelte-check + tsc), `npm run lint`, `npm run format`.
- **Build side effect:** `npm run dev` and `npm run build` regenerate `static/data/**` via the `prebuild` hook. **Never** `git add -A`. Stage only the files each task names.

## Spec corrections applied in this plan

Three values in the spec were transcribed from stale sources. This plan uses the corrected ones:

1. The condensed mobile height is **46px**, not 44px. The comment at `TopBar.svelte:33` says "58 → 44" but the actual value at `TopBar.svelte:206` is `46px`. Moot either way, see (2).
2. The spec's "mobile condensed → 40px" target is **dropped**. Task 5 removes the condense mechanism entirely, because the bar now hides completely rather than shrinking. Final heights: **52px desktop, 48px mobile, no condensed state.**
3. `--topbar-height` currently has **three** sources of truth: `:root` in `app.css:668,672`, a `.topbar`-scoped redefinition in `TopBar.svelte:188,192,206`, and an imperative `html.style.setProperty` at `TopBar.svelte:53`. Task 2 consolidates to one.

## File Structure

**Created:**

- `src/lib/stores/chrome.ts`: the scroll-direction reducer and its store. Pure state machine plus a thin `window` listener. No component imports it directly except the two suspender call sites.
- `tests/unit/chrome.test.ts`: reducer unit tests, ported verbatim.

**Modified:**

- `src/lib/stores/prefs.ts`: add `bibleStudyMode`.
- `src/app.css`: `--topbar-height` values; chrome transform rules.
- `src/lib/components/ui/TopBar.svelte`: slim heights, delete condense mechanism, publish chrome state.
- `src/lib/components/ui/ModeToggle.svelte`: `suspendChrome('prefs', open)`.
- `src/lib/components/ui/NavDrawer.svelte`: `suspendChrome('navdrawer', open)`, fallback values.
- `src/lib/components/ui/Sidebar.svelte`, `src/lib/components/ui/SidebarMobileToggle.svelte`, `src/lib/components/panels/StudyPanel.svelte`: `--topbar-height` fallback values only.
- `src/lib/components/bible/BibleReader.svelte`: chapter header; `studyMode` removal.
- `src/lib/components/bible/ChapterNavBar.svelte`: hosts the toggle; `FloatingNav` offset.
- `src/lib/components/bible/ChapterFilterBar.svelte`: becomes presentational.
- `tests/e2e/bible-reading-mode.test.ts`: new assertions.

**Task order rationale:** Task 1 is a pure store with zero UI risk. Task 2 settles the heights that Task 5's transforms depend on. Task 3 is independent and small. Task 4 is the largest and carries the width-regression risk. Task 5 wires everything and must come last, because it integrates with the final heights from Task 2 and must not fight Task 4's layout.

---

### Task 1: Chrome scroll-direction store

Pure reducer, no DOM, no components touched. Ported from `../douayrheimsbible/src/lib/stores/chrome.ts`.

**Files:**

- Create: `src/lib/stores/chrome.ts`
- Test: `tests/unit/chrome.test.ts`

**Interfaces:**

- Consumes: nothing.
- Produces:
  - `HIDE_AFTER: number` (100)
  - `REVEAL_AFTER_UP: number` (120)
  - `interface ChromeScrollState { lastY: number; upDistance: number; hidden: boolean }`
  - `initialChromeState(y?: number): ChromeScrollState`
  - `nextChromeState(state: ChromeScrollState, rawY: number): ChromeScrollState`
  - `chromeHidden: Readable<boolean>`
  - `suspendChrome(key: string, active: boolean): void`
  - `revealChrome(): void`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/chrome.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
	HIDE_AFTER,
	REVEAL_AFTER_UP,
	initialChromeState,
	nextChromeState,
	type ChromeScrollState
} from '$lib/stores/chrome';

/** Feed a sequence of absolute scroll positions through the reducer. */
function scrollThrough(positions: number[], start?: ChromeScrollState): ChromeScrollState {
	return positions.reduce(
		(state, y) => nextChromeState(state, y),
		start ?? initialChromeState(positions[0])
	);
}

describe('chrome scroll state machine', () => {
	it('starts visible', () => {
		expect(initialChromeState(0).hidden).toBe(false);
	});

	it('stays visible while scrolling down within the top zone', () => {
		const state = scrollThrough([0, 20, 60, HIDE_AFTER]);
		expect(state.hidden).toBe(false);
	});

	it('hides once scrolling down past the top zone', () => {
		const state = scrollThrough([0, 60, HIDE_AFTER + 1]);
		expect(state.hidden).toBe(true);
	});

	it('stays hidden while scrolling up less than the reveal threshold', () => {
		const down = scrollThrough([0, 400]);
		expect(down.hidden).toBe(true);
		const up = scrollThrough([400 - (REVEAL_AFTER_UP - 1)], down);
		expect(up.hidden).toBe(true);
	});

	it('reveals after cumulative upward scrolling reaches the threshold', () => {
		const down = scrollThrough([0, 400]);
		const up = scrollThrough([400 - REVEAL_AFTER_UP], down);
		expect(up.hidden).toBe(false);
	});

	it('accumulates upward distance across several small scroll events', () => {
		const down = scrollThrough([0, 400]);
		// Six 20px steps = 120px total, reaching the threshold only on the last one.
		const steps = [380, 360, 340, 320, 300, 280];
		let state = down;
		for (const y of steps.slice(0, -1)) {
			state = nextChromeState(state, y);
			expect(state.hidden).toBe(true);
		}
		state = nextChromeState(state, steps[steps.length - 1]);
		expect(state.hidden).toBe(false);
	});

	it('resets accumulated upward distance when direction flips back down', () => {
		const down = scrollThrough([0, 400]);
		// Up 100 (short of 120), back down, then up 100 again. Never reaches the threshold.
		const state = scrollThrough([300, 340, 240], down);
		expect(state.hidden).toBe(true);
	});

	it('resets the accumulator after a reveal so one flick does not bank credit', () => {
		const revealed = scrollThrough([0, 400, 400 - REVEAL_AFTER_UP]);
		expect(revealed.hidden).toBe(false);
		expect(revealed.upDistance).toBe(0);
	});

	it('always reveals when scrolling back into the top zone', () => {
		const state = scrollThrough([0, 400, HIDE_AFTER]);
		expect(state.hidden).toBe(false);
	});

	it('hides again on the next downward scroll after a reveal', () => {
		const revealed = scrollThrough([0, 400, 400 - REVEAL_AFTER_UP]);
		const state = nextChromeState(revealed, 400);
		expect(state.hidden).toBe(true);
	});

	it('clamps negative scroll positions from rubber-banding', () => {
		const state = scrollThrough([0, 400, -50]);
		expect(state.hidden).toBe(false);
		expect(state.lastY).toBe(0);
	});

	it('ignores repeated events at the same position', () => {
		const down = scrollThrough([0, 400]);
		const state = scrollThrough([400, 400, 400], down);
		expect(state.hidden).toBe(true);
		expect(state.upDistance).toBe(0);
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/chrome.test.ts`

Expected: FAIL, `Failed to resolve import "$lib/stores/chrome"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/stores/chrome.ts`:

```ts
import { readable } from 'svelte/store';
import { browser } from '$app/environment';

/** Scroll depth below which the bars are always shown, so the top of a chapter
 *  never opens with its header already tucked away. */
export const HIDE_AFTER = 100;

/** Cumulative upward scroll needed to bring the bars back. */
export const REVEAL_AFTER_UP = 120;

export interface ChromeScrollState {
	/** Last observed scroll position, clamped to >= 0. */
	lastY: number;
	/** Upward distance travelled since the last direction flip or reveal. */
	upDistance: number;
	hidden: boolean;
}

export function initialChromeState(y = 0): ChromeScrollState {
	return { lastY: Math.max(0, y), upDistance: 0, hidden: false };
}

/**
 * Pure reducer mapping an absolute scroll position onto the next bar state.
 * Kept free of DOM access so the behaviour can be unit-tested directly.
 *
 * The comparison is always against the last decision anchor and a cumulative
 * upward total, never a frame-to-frame delta. That is what stops small scroll
 * jitter from flickering the bars.
 */
export function nextChromeState(state: ChromeScrollState, rawY: number): ChromeScrollState {
	// iOS rubber-banding reports negative positions past the top of the document.
	const y = Math.max(0, rawY);

	if (y <= HIDE_AFTER) return { lastY: y, upDistance: 0, hidden: false };

	if (y > state.lastY) return { lastY: y, upDistance: 0, hidden: true };

	if (y < state.lastY) {
		const upDistance = state.upDistance + (state.lastY - y);
		if (upDistance >= REVEAL_AFTER_UP) return { lastY: y, upDistance: 0, hidden: false };
		return { lastY: y, upDistance, hidden: state.hidden };
	}

	return { ...state, lastY: y };
}

// ── Store wiring ─────────────────────────────────────────────────────────────

let state = initialChromeState(0);
let frame = 0;
let publish: ((hidden: boolean) => void) | null = null;

/** Sources currently forcing the bars to stay put, keyed so overlapping
 *  suspenders (the prefs popover + the nav drawer) cannot untoggle each other. */
const suspenders = new Set<string>();

function currentY(): number {
	return browser ? window.scrollY : 0;
}

function resetState() {
	state = initialChromeState(currentY());
	publish?.(false);
}

function onScroll() {
	if (suspenders.size > 0) return;
	if (frame) return;
	frame = requestAnimationFrame(() => {
		frame = 0;
		if (suspenders.size > 0) return;
		state = nextChromeState(state, window.scrollY);
		publish?.(state.hidden);
	});
}

/** True when the bars should be translated out of view. */
export const chromeHidden = readable(false, (set) => {
	publish = set;
	if (!browser) return;

	state = initialChromeState(window.scrollY);
	window.addEventListener('scroll', onScroll, { passive: true });

	return () => {
		window.removeEventListener('scroll', onScroll);
		if (frame) cancelAnimationFrame(frame);
		frame = 0;
		publish = null;
		state = initialChromeState(0);
		set(false);
	};
});

/**
 * Hold the bars in view while `key` is active. Used by overlays that anchor to
 * `--topbar-height` (the prefs popover, the nav drawer), which would otherwise
 * hang over a gap once the header transformed away.
 */
export function suspendChrome(key: string, active: boolean) {
	if (active) suspenders.add(key);
	else suspenders.delete(key);
	// Re-baseline either way, so releasing a suspender does not immediately
	// re-hide from a stale position recorded before the overlay opened.
	resetState();
}

/** Force the bars back into view, e.g. on navigation or when focus enters one. */
export function revealChrome() {
	resetState();
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/chrome.test.ts`

Expected: PASS, 12 tests.

- [ ] **Step 5: Typecheck and commit**

```bash
npm run check
npx prettier --write src/lib/stores/chrome.ts tests/unit/chrome.test.ts
git add src/lib/stores/chrome.ts tests/unit/chrome.test.ts
git commit -m "feat(chrome): add scroll-direction store for reveal-on-scroll bars"
```

---

### Task 2: Slim the TopBar site-wide and unify --topbar-height

Heights only. The condense mechanism stays alive here and is removed in Task 5, so this task's diff is purely numeric plus the variable consolidation.

**Files:**

- Modify: `src/app.css:667-674`
- Modify: `src/lib/components/ui/TopBar.svelte:63`, `:186-190`, `:191-194`, and delete the `$effect` at `:47-55`
- Modify: `src/lib/components/ui/LogoMark.svelte:32-43`
- Modify: `src/lib/components/bible/ChapterNavBar.svelte:107`, `:175`
- Modify: `src/lib/components/ui/NavDrawer.svelte:382`, `:394`
- Modify: `src/lib/components/ui/Sidebar.svelte:1748`
- Modify: `src/lib/components/ui/SidebarMobileToggle.svelte:51`
- Modify: `src/lib/components/panels/StudyPanel.svelte:508`
- Test: `tests/e2e/bible-reading-mode.test.ts`

**Interfaces:**

- Consumes: nothing from Task 1.
- Produces: `--topbar-height` resolves to `52px` at >=768px and `48px` below, defined **only** in `:root` in `app.css`. Every consumer's CSS fallback is `52px`.

- [ ] **Step 1: Write the failing test**

Append to `tests/e2e/bible-reading-mode.test.ts`:

```ts
test('TopBar is slim and the chapter nav sits flush beneath it', async ({ page }) => {
	await page.goto('/bible/genese/1');

	const topbar = page.locator('header.topbar');
	await expect(topbar).toHaveCSS('height', '52px');

	// The chapter nav is sticky at --topbar-height. If the variable and the
	// real bar height ever disagree, the two overlap or leave a gap.
	const topbarBox = await topbar.boundingBox();
	const navBox = await page.locator('.bible-chapter-nav').boundingBox();
	expect(topbarBox).not.toBeNull();
	expect(navBox).not.toBeNull();
	expect(navBox!.y).toBeCloseTo(topbarBox!.y + topbarBox!.height, 0);
});

test('--topbar-height has a single source of truth that matches the rendered bar', async ({
	page
}) => {
	await page.goto('/bible/genese/1');
	const declared = await page.evaluate(() =>
		getComputedStyle(document.documentElement).getPropertyValue('--topbar-height').trim()
	);
	expect(declared).toBe('52px');

	// No inline override left on <html> from the old imperative sync.
	const inline = await page.evaluate(() => document.documentElement.style.getPropertyValue('--topbar-height'));
	expect(inline).toBe('');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx playwright test tests/e2e/bible-reading-mode.test.ts -g "TopBar is slim"`

Expected: FAIL. The bar computes to `80px`, and `.bible-chapter-nav` does not exist yet.

- [ ] **Step 3: Add the nav bar class and slim every height**

In `src/lib/components/bible/ChapterNavBar.svelte:107`, add the `bible-chapter-nav` class and change the fallback:

```svelte
	<div
		class="bible-chapter-nav sticky top-[var(--topbar-height,52px)] z-[var(--z-sticky)] bg-glass backdrop-blur-sm border-b border-border px-6 max-md:px-4 flex items-center gap-[10px] font-ui"
		style="height: 50px;"
	>
```

In the same file at line 175, replace the hardcoded `130px` (which was `80 + 50` and silently wrong the moment the bar changes height):

```svelte
		topOffset="calc(var(--topbar-height, 52px) + 50px)"
```

In `src/app.css:667-674`, replace the block:

```css
/* Topbar height · single source of truth. Sticky elements outside .topbar
   (the Bible chapter nav, the study panel, the nav drawer) position
   themselves against this instead of hardcoding a pixel value. */
:root {
	--topbar-height: 52px;
}
@media (max-width: 767px) {
	:root {
		--topbar-height: 48px;
	}
}
```

In `src/lib/components/ui/TopBar.svelte:63`, slim the bar. Note `py-3` becomes
`py-2` at all sizes, for the reason in the next paragraph:

```svelte
		class="relative px-4 md:px-6 py-2 flex items-center gap-3 md:gap-6 min-h-[48px] md:min-h-[52px]"
```

**The logo drives the bar height, so it must shrink too.** `min-h-` is a floor,
not a height. `LogoMark.svelte:34-43` sets the mark to 38px on mobile and **56px
on desktop**, and 56px + `md:py-3` (24px) is exactly the current 80px. Lowering
only `min-h` changes nothing and this task's test will still see 80px. In
`src/lib/components/ui/LogoMark.svelte`, replace the two size rules:

```css
	/* Default mark size · desktop 36 px, mobile 32 px, each sized so the mark
	   plus the topbar's py-2 (16 px total) lands exactly on --topbar-height. */
	.logo-mark {
		width: 32px;
		height: 32px;
	}
	@media (min-width: 768px) {
		.logo-mark {
			width: 36px;
			height: 36px;
		}
	}
```

The arithmetic, which the test in Step 1 asserts: desktop 36 + 16 = 52; mobile
32 + 16 = 48. Delete the stale second sentence of that comment ("The
shrink-on-scroll topbar overrides this to 30 px when condensed"), since Task 5
removes the condensed state.

If the bar still measures taller than 52px after this, `Wordmark.svelte` is the
next suspect: check its rendered height and reduce its font size until it fits
within 52px including the row's padding.

In `src/lib/components/ui/TopBar.svelte`, delete the `.topbar`-scoped redefinitions so `:root` is authoritative. Remove these two declarations, keeping the surrounding rules and the `@media` block itself:

```css
	.topbar {
		--topbar-height: 80px;   /* DELETE this declaration */
	}
```

```css
		.topbar {
			--topbar-height: 58px;   /* DELETE this declaration */
		}
```

If removing the declaration leaves an empty `.topbar { }` rule, delete the whole rule.

Also in `TopBar.svelte`, delete the imperative sync effect at lines 47-55 entirely (the comment and the `$effect` block). It is the third source of truth and Task 5 removes the `condensed` flag it depends on:

```ts
	// Sync the global --topbar-height variable so sticky elements outside
	// the topbar (e.g. the Bible chapter floatnav) stay flush with our
	// bottom edge, including the condensed-on-scroll mobile state.
	$effect(() => {
		if (typeof document === 'undefined') return;
		const html = document.documentElement;
		if (condensed) html.style.setProperty('--topbar-height', '46px');
		else html.style.removeProperty('--topbar-height');
	});
```

- [ ] **Step 4: Update every consumer fallback**

These fallbacks only apply if the variable is missing, but three of them currently disagree with each other (`58px` vs `80px`). Set all to `52px`.

`src/lib/components/ui/NavDrawer.svelte:382` and `:394`:

```css
		inset: var(--topbar-height, 52px) 0 0 0;
```

```css
		top: var(--topbar-height, 52px);
```

`src/lib/components/ui/Sidebar.svelte:1748`:

```css
			inset: var(--topbar-height, 52px) 0 0 0;
```

`src/lib/components/ui/SidebarMobileToggle.svelte:51`, inside the class string, change `var(--topbar-height,58px)` to `var(--topbar-height,52px)`:

```svelte
		class="toggle flex lg:hidden fixed top-[calc(var(--topbar-height,52px)+12px)] left-3 z-[var(--z-topbar)] h-9 px-3 rounded-md border border-border bg-panel hover:bg-accent/10 hover:border-accent items-center gap-2 text-muted hover:text-accent shadow-sm font-ui text-xs font-semibold tracking-wide uppercase"
```

`src/lib/components/panels/StudyPanel.svelte:508`:

```svelte
	style="top: var(--topbar-height, 52px); max-height: calc(100dvh - var(--topbar-height, 52px));"
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx playwright test tests/e2e/bible-reading-mode.test.ts`

Expected: PASS, including the pre-existing `.verse-text` 702px/552px/872px assertions, which must be unaffected by header height.

- [ ] **Step 6: Check and commit**

```bash
npm run check
npm run lint
git add src/app.css src/lib/components/ui/TopBar.svelte src/lib/components/ui/LogoMark.svelte src/lib/components/ui/NavDrawer.svelte src/lib/components/ui/Sidebar.svelte src/lib/components/ui/SidebarMobileToggle.svelte src/lib/components/panels/StudyPanel.svelte src/lib/components/bible/ChapterNavBar.svelte tests/e2e/bible-reading-mode.test.ts
git commit -m "feat(chrome): slim the TopBar to 52/48px and unify --topbar-height"
```

---

### Task 3: Left-aligned chapter header with book eyebrow

Independent of the other tasks. Purely presentational.

**Files:**

- Modify: `src/lib/components/bible/BibleReader.svelte:130-135`
- Test: `tests/e2e/bible-reading-mode.test.ts`

**Interfaces:**

- Consumes: the existing `book: BookInfo` prop, which carries `frenchName` (used already at `ChapterNavBar.svelte:69`).
- Produces: a `.chapter-eyebrow` element containing the book's French name.

- [ ] **Step 1: Write the failing test**

Append to `tests/e2e/bible-reading-mode.test.ts`:

```ts
test('chapter header shows a book eyebrow and is left-aligned', async ({ page }) => {
	await page.goto('/bible/genese/1');

	// The eyebrow carries the book name. Uppercasing is presentational, so the
	// accessible text stays in normal case.
	const eyebrow = page.locator('.chapter-eyebrow');
	await expect(eyebrow).toHaveText('Genèse');
	await expect(eyebrow).toHaveCSS('text-transform', 'uppercase');

	// Header block is flush left, unlike the section headings inside the
	// chapter, which stay centered by an earlier deliberate decision.
	await expect(page.locator('h1')).toHaveCSS('text-align', 'left');

	const h1Box = await page.locator('h1').boundingBox();
	const eyebrowBox = await eyebrow.boundingBox();
	expect(h1Box!.x).toBeCloseTo(eyebrowBox!.x, 0);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx playwright test tests/e2e/bible-reading-mode.test.ts -g "book eyebrow"`

Expected: FAIL, `.chapter-eyebrow` resolves to zero elements.

- [ ] **Step 3: Replace the header markup**

In `src/lib/components/bible/BibleReader.svelte`, replace the header at lines 130-135:

```svelte
		<header class="mb-10">
			<p
				class="chapter-eyebrow font-ui text-[11px] uppercase tracking-[0.3em] text-subtle mb-2"
			>
				{book.frenchName}
			</p>
			<h1 class="font-heading text-[2.5rem] leading-[1.2] tracking-[-0.01em] text-foreground mb-3">
				Chapitre {chapter}
			</h1>
			<div class="w-10 h-px bg-accent opacity-70"></div>
		</header>
```

Three changes from the original: `text-center` is dropped from the `<header>`, the eyebrow `<p>` is new, and the rule loses `mx-auto` so it sits flush left.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx playwright test tests/e2e/bible-reading-mode.test.ts`

Expected: PASS. The existing test `section and subsection headings are centered, in both reading modes` must still pass, confirming the in-chapter headings were not disturbed.

- [ ] **Step 5: Check and commit**

```bash
npm run check
npm run lint
git add src/lib/components/bible/BibleReader.svelte tests/e2e/bible-reading-mode.test.ts
git commit -m "feat(bible): left-align the chapter header and add a book eyebrow"
```

---

### Task 4: Lift Lecture/Étude into the chapter nav row

The largest task and the one carrying regression risk.

**Read this before starting.** `studyMode` currently feeds `data-study-mode` on `<main>` (`BibleReader.svelte:128`), which the Bible column-width compensation in `app.css` keys off. Today `studyMode` is `$state(true)` **regardless of whether the chapter has citations**; only the *toggle UI* is suppressed when `citedCount === 0` or in paragraph mode. Preserve exactly that: `data-study-mode` follows the pref alone, and citation count only affects whether the control is **disabled**. Changing that coupling breaks the 702px assertions.

**Files:**

- Modify: `src/lib/stores/prefs.ts:20-59`
- Modify: `src/lib/components/bible/ChapterFilterBar.svelte`
- Modify: `src/lib/components/bible/ChapterNavBar.svelte`
- Modify: `src/lib/components/bible/BibleReader.svelte:82`, `:121`, `:128`, `:148-151`
- Test: `tests/unit/prefs.test.ts` (create), `tests/e2e/bible-reading-mode.test.ts`

**Interfaces:**

- Consumes: `ChapterNavBar` gains the `bible-chapter-nav` class from Task 2.
- Produces:
  - `ReadingPrefs.bibleStudyMode: boolean`, default `true`.
  - `ChapterFilterBar` props become `{ studyMode: boolean; disabled?: boolean; onchange: (next: boolean) => void }`. It no longer uses `$bindable` and no longer self-suppresses.
  - `ChapterNavBar` gains `citedVerseCount?: number` (default `0`). Named to avoid confusion with `BibleReader.svelte:87`'s existing per-verse `citedCount(v)` **function**, which is a different thing and stays put.

- [ ] **Step 1: Write the failing unit test**

Create `tests/unit/prefs.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { DEFAULT_PREFS } from '$lib/stores/prefs';

describe('reading prefs defaults', () => {
	it('defaults bibleStudyMode to true, matching the previous local state', () => {
		expect(DEFAULT_PREFS.bibleStudyMode).toBe(true);
	});
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/unit/prefs.test.ts`

Expected: FAIL, `DEFAULT_PREFS` is not exported from `$lib/stores/prefs`.

- [ ] **Step 3: Add the pref**

In `src/lib/stores/prefs.ts`, add the field to the `ReadingPrefs` interface after `hideBibleHeadings` (line 37):

```ts
	hideBibleHeadings: boolean; // major/section headings, both reading modes
	bibleStudyMode: boolean; // Bible reader: show Catechism citation annotations
```

Add the default in `DEFAULTS` after `hideBibleHeadings: true,` (line 57):

```ts
	hideBibleHeadings: true,
	bibleStudyMode: true,
```

Export the defaults so they are testable. Change line 41 from `const DEFAULTS` to:

```ts
export const DEFAULT_PREFS: ReadingPrefs = {
```

and update the three internal references in `readInitial()` (`{ ...DEFAULTS }` twice and `{ ...DEFAULTS, ...parsed }` once) to use `DEFAULT_PREFS`. Keep a local alias if you prefer minimal churn:

```ts
const DEFAULTS = DEFAULT_PREFS;
```

No migration is needed: `readInitial()` spreads `DEFAULT_PREFS` beneath the parsed object, so stored prefs predating this key pick up `true`.

- [ ] **Step 4: Run the unit test to verify it passes**

Run: `npx vitest run tests/unit/prefs.test.ts`

Expected: PASS.

- [ ] **Step 5: Write the failing e2e tests**

Append to `tests/e2e/bible-reading-mode.test.ts`:

```ts
test('Lecture/Étude lives in the chapter nav row and persists across navigation', async ({
	page
}) => {
	await page.goto('/bible/genese/1');

	const toggle = page.locator('.bible-chapter-nav .mode-pill');
	await expect(toggle).toBeVisible();

	await toggle.getByRole('button', { name: 'Lecture' }).click();
	const stored = await page.evaluate(() =>
		JSON.parse(localStorage.getItem('catechismecatholique.prefs') ?? '{}')
	);
	expect(stored.bibleStudyMode).toBe(false);

	// Survives a chapter navigation, unlike the old per-chapter local state.
	await page.goto('/bible/genese/2');
	await expect(page.locator('main[data-corpus="bible"]')).toHaveAttribute(
		'data-study-mode',
		'false'
	);

	// And a reload.
	await page.reload();
	await expect(page.locator('main[data-corpus="bible"]')).toHaveAttribute(
		'data-study-mode',
		'false'
	);
});

test('the toggle is disabled rather than removed when a chapter has no citations', async ({
	page
}) => {
	// Nombres 2 has no Catechism citations (verified against
	// static/data/cec/bible-verse-index.json: 30 of Numbers' 36 chapters have
	// none). If it ever gains one, Nombres 3, 4, 5, 6 and 8 are also empty.
	await page.goto('/bible/nombres/2');
	const toggle = page.locator('.bible-chapter-nav .mode-pill');
	await expect(toggle).toBeVisible();
	await expect(toggle.getByRole('button', { name: 'Étude' })).toBeDisabled();
});

test('the toggle is disabled in paragraph mode, where there is no citation sidebar', async ({
	page
}) => {
	await page.goto('/bible/genese/1');
	await switchToParagraphMode(page);
	const toggle = page.locator('.bible-chapter-nav .mode-pill');
	await expect(toggle).toBeVisible();
	await expect(toggle.getByRole('button', { name: 'Étude' })).toBeDisabled();
});

test('the in-page filter bar above the text is gone', async ({ page }) => {
	await page.goto('/bible/genese/1');
	await expect(page.locator('main .mode-pill')).toHaveCount(0);
});
```

- [ ] **Step 6: Run them to verify they fail**

Run: `npx playwright test tests/e2e/bible-reading-mode.test.ts -g "chapter nav row"`

Expected: FAIL, `.bible-chapter-nav .mode-pill` resolves to zero elements.

- [ ] **Step 7: Make ChapterFilterBar presentational**

Replace the whole script and markup of `src/lib/components/bible/ChapterFilterBar.svelte`, keeping the existing `<style>` block untouched except for the additions below:

```svelte
<script lang="ts">
	let {
		studyMode,
		disabled = false,
		onchange
	}: {
		studyMode: boolean;
		disabled?: boolean;
		onchange: (next: boolean) => void;
	} = $props();
</script>

<div class="mode-pill" role="group" aria-label="Basculer les annotations du Catéchisme">
	<button
		type="button"
		class="pill-option"
		class:is-active={!studyMode}
		{disabled}
		onclick={() => onchange(false)}
	>
		<span class="pill-label">Lecture</span>
		<svg
			class="pill-icon"
			viewBox="0 0 16 16"
			aria-hidden="true"
			fill="none"
			stroke="currentColor"
			stroke-width="1.4"
		>
			<path d="M2 3.5h4.5A1.5 1.5 0 0 1 8 5v8a1.2 1.2 0 0 0-1.2-1.2H2zM14 3.5H9.5A1.5 1.5 0 0 0 8 5v8a1.2 1.2 0 0 1 1.2-1.2H14z" />
		</svg>
	</button>
	<button
		type="button"
		class="pill-option"
		class:is-active={studyMode}
		{disabled}
		onclick={() => onchange(true)}
	>
		<span class="pill-label">Étude</span>
		<svg
			class="pill-icon"
			viewBox="0 0 16 16"
			aria-hidden="true"
			fill="none"
			stroke="currentColor"
			stroke-width="1.4"
		>
			<circle cx="7" cy="7" r="4.5" />
			<path d="M10.5 10.5 14 14" stroke-linecap="round" />
		</svg>
	</button>
</div>
```

Note the removals: the old `{#if citedCount > 0}` wrapper is gone (the parent decides now), the old `citedCount` prop is gone, and the `mb-6 flex justify-center` wrapper is gone (the nav row handles placement).

Append to the existing `<style>` block:

```css
	.pill-option:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
	.pill-icon {
		display: none;
		width: 15px;
		height: 15px;
	}
	/* Below 640px the nav row has no space for two words beside the chapter
	   chevrons, so the labels collapse to icons. */
	@media (max-width: 639px) {
		.pill-label {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip-path: inset(50%);
			white-space: nowrap;
		}
		.pill-icon {
			display: block;
		}
		.pill-option {
			padding: 0.25rem 0.6rem;
		}
	}
```

The label is visually hidden rather than removed, so the accessible name stays "Lecture" / "Étude" at every breakpoint and the e2e `getByRole('button', { name: 'Lecture' })` selectors work on mobile too.

- [ ] **Step 8: Host the toggle in ChapterNavBar**

In `src/lib/components/bible/ChapterNavBar.svelte`, import the bar and the prefs store at the top of the script:

```ts
	import ChapterFilterBar from './ChapterFilterBar.svelte';
	import { prefs, updatePref } from '$lib/stores/prefs';
```

Add `citedVerseCount` to the props (defaulted, because the concordance variant does not pass it):

```ts
	let {
		book,
		chapter,
		totalChapters,
		chapterCounts = {},
		citedVerseCount = 0,
		variant = 'reader'
	}: {
		book: BookInfo;
		chapter: number;
		totalChapters: number;
		chapterCounts?: Record<string, number>;
		citedVerseCount?: number;
		variant?: 'reader' | 'concordance';
	} = $props();
```

Add the derived disabled condition after the existing `$derived` declarations:

```ts
	// Paragraph mode renders no citation sidebar, and a chapter with no
	// citations has nothing to annotate. Disable rather than hide, so the nav
	// row keeps the same contents while paging between chapters.
	const toggleDisabled = $derived(citedVerseCount === 0 || $prefs.bibleLayout === 'paragraph');
```

In the **reader** branch only (the `{:else}` block starting at line 106), add the toggle as the last child of the sticky `<div>`, immediately after the closing `</div>` of the centered nav group:

```svelte
		<div class="ml-auto shrink-0">
			<ChapterFilterBar
				studyMode={$prefs.bibleStudyMode}
				disabled={toggleDisabled}
				onchange={(next) => updatePref('bibleStudyMode', next)}
			/>
		</div>
```

`ml-auto` pushes it right. On desktop the chapter button is `md:absolute md:left-1/2`, so it does not compete for space; on mobile the centered group is `flex-1`, so the toggle sits at the right edge.

- [ ] **Step 9: Remove the local state from BibleReader**

In `src/lib/components/bible/BibleReader.svelte`:

Delete line 82 entirely:

```ts
	let studyMode = $state(true);
```

Add a derived replacement in its place, so the rest of the component's references keep working unchanged:

```ts
	// Follows the pref alone. Citation count affects only whether the control
	// is disabled, never the layout attribute, because data-study-mode drives
	// the column-width compensation in app.css.
	const studyMode = $derived($prefs.bibleStudyMode);
```

Pass the count through to the nav bar at line 121:

```svelte
<ChapterNavBar {book} {chapter} {totalChapters} {chapterCounts} citedVerseCount={totalCited} variant="reader" />
```

Delete the in-page filter bar at lines 148-151:

```svelte
		{#if totalCited > 0 && $prefs.bibleLayout !== 'paragraph'}
			<ChapterFilterBar bind:studyMode citedCount={totalCited} />
		{/if}
```

Remove the now-unused import at line 2:

```ts
	import ChapterFilterBar from './ChapterFilterBar.svelte';
```

Leave line 128 (`data-study-mode={studyMode}`) and the `studyMode` reads at lines 241 and 264 exactly as they are.

**Ordering note:** `ChapterNavBar` is rendered at line 121, before `totalCited` is used at line 148, but `totalCited` is a `$derived` and rune declarations are hoisted, so no reordering is needed. If `npm run check` complains about use-before-declaration, move the `totalCited` declaration above the markup rather than reordering the markup.

- [ ] **Step 10: Run the full suites to verify they pass**

Run: `npm run test && npm run test:e2e`

Expected: PASS. Pay particular attention to these pre-existing tests, which are the regression guard:

- `the actual verse paragraph matches paragraph mode's width, not a narrower gutter-squeezed one` (702px)
- `the width fix holds at every column-width preset (600/750/920), not just Standard` (552px / 872px)
- `Bible reader uses its own column widths (600/750/920), not the shared CEC/Trent ones`

If any of those fail, `data-study-mode` has been coupled to the citation count. Re-read the note at the head of this task.

- [ ] **Step 11: Check and commit**

```bash
npm run check
npm run lint
git add src/lib/stores/prefs.ts src/lib/components/bible/ChapterFilterBar.svelte src/lib/components/bible/ChapterNavBar.svelte src/lib/components/bible/BibleReader.svelte tests/unit/prefs.test.ts tests/e2e/bible-reading-mode.test.ts
git commit -m "feat(bible): move Lecture/Etude into the chapter nav and persist it"
```

---

### Task 5: Reveal-on-scroll for both bars

Wires Task 1's store to the DOM and retires the old mobile condense effect.

**Files:**

- Modify: `src/lib/components/ui/TopBar.svelte:32-45`, `:58-60`, style block
- Modify: `src/lib/components/ui/ModeToggle.svelte`
- Modify: `src/lib/components/ui/NavDrawer.svelte`
- Modify: `src/app.css`
- Test: `tests/e2e/bible-reading-mode.test.ts`

**Interfaces:**

- Consumes: `chromeHidden`, `suspendChrome` from Task 1. `--topbar-height` and `.bible-chapter-nav` from Task 2.
- Produces: `document.documentElement.dataset.chromeHidden` is `'true'` or `'false'`.

- [ ] **Step 1: Write the failing test**

Append to `tests/e2e/bible-reading-mode.test.ts`:

```ts
test('both bars hide on scroll down and return on scroll up', async ({ page }) => {
	await page.goto('/bible/genese/1');
	const topbar = page.locator('header.topbar');
	const nav = page.locator('.bible-chapter-nav');

	const topAtRest = (await topbar.boundingBox())!.y;

	// Past HIDE_AFTER (100px), scrolling down hides both.
	await page.evaluate(() => window.scrollTo(0, 600));
	await expect
		.poll(async () => (await topbar.boundingBox())!.y)
		.toBeLessThan(topAtRest);
	expect((await nav.boundingBox())!.y).toBeLessThan(topAtRest);

	// A short scroll up is not enough: REVEAL_AFTER_UP is 120px cumulative.
	await page.evaluate(() => window.scrollTo(0, 550));
	await expect(page.locator('html')).toHaveAttribute('data-chrome-hidden', 'true');

	// Crossing the threshold brings them back.
	await page.evaluate(() => window.scrollTo(0, 470));
	await expect(page.locator('html')).toHaveAttribute('data-chrome-hidden', 'false');
	await expect.poll(async () => (await topbar.boundingBox())!.y).toBe(topAtRest);
});

test('the bars stay put while the reading-options popover is open', async ({ page }) => {
	await page.goto('/bible/genese/1');
	await page.evaluate(() => window.scrollTo(0, 600));
	await expect(page.locator('html')).toHaveAttribute('data-chrome-hidden', 'true');

	await page.getByRole('button', { name: 'Options de lecture' }).click();
	await expect(page.locator('html')).toHaveAttribute('data-chrome-hidden', 'false');

	// Scrolling further must not tuck the header away underneath the open panel.
	await page.evaluate(() => window.scrollTo(0, 1200));
	await expect(page.locator('html')).toHaveAttribute('data-chrome-hidden', 'false');
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx playwright test tests/e2e/bible-reading-mode.test.ts -g "scroll down"`

Expected: FAIL, `data-chrome-hidden` is absent and the bar never moves.

- [ ] **Step 3: Publish the chrome state from TopBar**

In `src/lib/components/ui/TopBar.svelte`, add the import:

```ts
	import { chromeHidden, revealChrome } from '$lib/stores/chrome';
	import { afterNavigate } from '$app/navigation';
```

Replace the entire condense block at lines 32-45 (comment, `let condensed`, and its `$effect`) with:

```ts
	// Reveal-on-scroll · the reducer lives in $lib/stores/chrome so its
	// behaviour is unit-tested without a DOM. Here we only mirror it onto
	// <html>, the same way prefs.ts publishes data-theme and friends, and let
	// CSS do the moving.
	$effect(() => {
		if (typeof document === 'undefined') return;
		document.documentElement.dataset.chromeHidden = String($chromeHidden);
	});

	// A new page should never open with its header already tucked away.
	afterNavigate(() => revealChrome());
```

Remove `class:is-condensed={condensed}` from the `<header>` at line 60. The header becomes:

```svelte
<header class="topbar border-b border-border bg-background sticky top-0 z-[var(--z-modal)]">
```

In the component's `<style>` block, delete all of the following, which existed
only to serve the condense animation:

- the three `.is-condensed` rules (`.topbar.is-condensed`, `.topbar.is-condensed > div`, `.topbar.is-condensed :global(.logo-mark)`);
- the two `transition` declarations on `.topbar > div` and `.topbar :global(.logo-mark)` inside the `@media (max-width: 767px)` block;
- the entire `@media (prefers-reduced-motion: reduce)` block at lines 217-222, whose only content is `transition: none` for those same two selectors. Its replacement lives in `app.css` in Step 4 and covers the new transform instead.

Keep `.topbar-suggest` and everything after it untouched.

- [ ] **Step 4: Add the transforms**

In `src/app.css`, immediately after the `:root` topbar-height block from Task 2:

```css
/* Reveal-on-scroll · both bars translate out together. The chapter nav is
   sticky at --topbar-height, so it has to travel its own height plus the
   bar above it to clear the viewport. */
.topbar,
.bible-chapter-nav {
	transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
	will-change: transform;
}
html[data-chrome-hidden='true'] .topbar {
	transform: translateY(-100%);
}
html[data-chrome-hidden='true'] .bible-chapter-nav {
	transform: translateY(calc(-1 * (var(--topbar-height) + 50px)));
}
@media (prefers-reduced-motion: reduce) {
	.topbar,
	.bible-chapter-nav {
		transition: none;
	}
}
```

The `50px` matches the nav row's inline `height: 50px` in `ChapterNavBar.svelte`. If that height ever changes, this must change with it.

- [ ] **Step 5: Wire the suspenders**

In `src/lib/components/ui/ModeToggle.svelte`, add the import and one effect. `open` is the existing `$state` at line 6:

```ts
	import { suspendChrome } from '$lib/stores/chrome';

	// The popover anchors to the header, so the header must not slide away
	// underneath it while it is open.
	$effect(() => {
		suspendChrome('prefs', open);
		return () => suspendChrome('prefs', false);
	});
```

In `src/lib/components/ui/NavDrawer.svelte`, the same against its own `open` at line 7:

```ts
	import { suspendChrome } from '$lib/stores/chrome';

	$effect(() => {
		suspendChrome('navdrawer', open);
		return () => suspendChrome('navdrawer', false);
	});
```

The cleanup returns matter: both components unmount on navigation, and a suspender left in the `Set` would freeze the bars permanently.

- [ ] **Step 6: Run the full suites to verify they pass**

Run: `npm run test && npm run test:e2e`

Expected: PASS, all suites. `tests/unit/chrome.test.ts` from Task 1 must still pass untouched.

- [ ] **Step 7: Check, lint and commit**

```bash
npm run check
npm run lint
git add src/app.css src/lib/components/ui/TopBar.svelte src/lib/components/ui/ModeToggle.svelte src/lib/components/ui/NavDrawer.svelte tests/e2e/bible-reading-mode.test.ts
git commit -m "feat(chrome): hide both bars on scroll down, reveal on scroll up"
```

---

## Final verification

- [ ] `npm run test`: all unit tests pass.
- [ ] `npm run test:e2e`: all e2e tests pass, including the three pre-existing width tests.
- [ ] `npm run check`: 0 errors.
- [ ] `npm run lint`: clean.
- [ ] Manual pass on `/bible/genese/1`: eyebrow reads GENÈSE above a left-aligned "Chapitre 1"; the nav row carries Lecture/Étude; scrolling down hides both bars and scrolling up returns them; opening the options popover pins them.
- [ ] Manual pass on `/cec/27` and `/bible/genese/1/concordance`: the slimmer bar did not break the sidebar, study panel or concordance sticky offsets.
- [ ] Confirm `git status --short` shows no `static/data/**` files staged in any commit.
