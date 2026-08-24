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

async function disableInfiniteScroll(page: Page) {
	const dialog = await openReadingTab(page);
	await dialog.getByRole('button', { name: 'Désactivé', exact: true }).click();
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
	const dialog = await openReadingTab(page);
	await dialog.getByRole('button', { name: 'Désactivé', exact: true }).click();
	await page.keyboard.press('Escape');
	const off = await page.evaluate(() =>
		JSON.parse(localStorage.getItem('catechismecatholique.prefs') ?? '{}')
	);
	expect(off.infiniteScroll).toBe(false);
});

test('the Afficher/Masquer indices that bible-reading-mode.test.ts depends on still map correctly', async ({
	page
}) => {
	// That file addresses these positionally: nth(0) Numéros de verset,
	// nth(1) Titres de section, nth(2) Barre de chapitres, nth(3) Numérotation
	// Vulgate. Only those four controls use the Afficher/Masquer pair, so the
	// indices are stable against controls using other labels · « Défilement
	// continu » deliberately uses Activé/Désactivé to stay out of the sequence.
	// What would break them is a NEW control reusing Afficher/Masquer above
	// « Barre de chapitres ». This test catches that by proving the click at
	// nth(2) lands on the chapter nav and on nothing else.
	await page.goto('/bible/genese/1');
	const dialog = await openReadingTab(page);
	await dialog.getByRole('button', { name: 'Masquer' }).nth(2).click();
	await page.keyboard.press('Escape');

	await expect(page.locator('.bible-chapter-nav')).toHaveCount(0);

	const stored = await page.evaluate(() =>
		JSON.parse(localStorage.getItem('catechismecatholique.prefs') ?? '{}')
	);
	expect(stored.hideChapterNav).toBe(true);
	// The discriminating half: no neighbouring preference moved. If the indices
	// had shifted by one, nth(2) would have hit Numérotation Vulgate instead and
	// showVulgatePsalms would be the field that changed.
	expect(stored.hideVerseNumbers).toBe(false);
	expect(stored.showVulgatePsalms).toBe(false);
});

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

	// scrollToBottom is a fixed number of viewport-height steps. Without this,
	// a taller viewport or a longer Genèse 1 could let the loop finish short of
	// the real bottom, and the assertions below would pass having never put the
	// pref-off guard under the condition they claim to test.
	await expect
		.poll(() =>
			page.evaluate(
				() => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 1
			)
		)
		.toBe(true);

	await expect(page.locator('[data-chapter-section]')).toHaveCount(1);
	await expect(
		page.getByRole('navigation', { name: 'Chapitre précédent ou suivant' })
	).toBeVisible();
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
	await expect(page.getByRole('navigation', { name: 'Chapitre précédent ou suivant' })).toHaveCount(
		0
	);

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

test('the URL and the sticky nav follow the chapter in the viewport', async ({ page }) => {
	await page.goto('/bible/genese/1');
	await enableInfiniteScroll(page);
	await scrollUntilChapter(page, 2);

	// Land chapter 2's anchor inside the activation band (the top 30% of the
	// viewport), then let a frame render before scrolling on. Two things make
	// the bare `scrollIntoView` + `scrollBy` pair racy: `block: 'start'` puts
	// the zero-height anchor exactly on the band's top edge, where a sub-pixel
	// scroll offset decides whether it counts as intersecting; and back-to-back
	// page.evaluate calls can land in the same rendering frame, in which case
	// the IntersectionObserver only ever sees the final position and reports no
	// crossing at all. The -40 puts the anchor unambiguously inside the band and
	// the wait guarantees the 'enter' is delivered.
	await page
		.locator('[data-chapter-anchor][data-chapter-num="2"]')
		.evaluate((el) => el.scrollIntoView({ block: 'start' }));
	await page.evaluate(() => window.scrollBy(0, -40));
	await page.waitForTimeout(200);

	// Read on into chapter 2, putting its heading above the activation band.
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

test('navigating away cancels a pending URL write instead of letting it land', async ({ page }) => {
	await page.goto('/bible/genese/1');
	await enableInfiniteScroll(page);
	await scrollUntilChapter(page, 3);

	// The chapter grid is opened BEFORE the scroll on purpose. The URL write is
	// on a 200ms trailing edge, so the whole point is to navigate while it is
	// still pending · opening the dialog first leaves a single click between
	// making chapter 3 active and leaving it, instead of a click, a dialog
	// transition and a second click.
	await page.locator('.bible-chapter-nav button[aria-haspopup="dialog"]').click();
	const chapter9 = page
		.getByRole('dialog', { name: 'Navigation biblique' })
		.locator('a[href="/bible/genese/9"]');
	await expect(chapter9).toBeVisible();

	// Land chapter 3's anchor inside the activation band in one downward
	// scroll · scrolling up would start the chrome's reveal transition, and
	// waiting for that to settle would burn the debounce window this test
	// needs to still be open.
	await page.evaluate(() => {
		const el = document.querySelector('[data-chapter-anchor][data-chapter-num="3"]');
		if (el) window.scrollBy(0, el.getBoundingClientRect().top - 100);
	});

	// Proof that chapter 3 actually became active, which is what arms the
	// pending URL write · the label is updated synchronously by the same
	// `setActive` that schedules it. Without this the click can outrun the
	// IntersectionObserver entirely, the callback lands after the navigation
	// has already replaced the window, and the race under test never happens.
	await expect(page.locator('.bible-chapter-nav button[aria-haspopup="dialog"]')).toContainText(
		'Genèse 3'
	);
	await chapter9.click();

	// Well past the 200ms debounce, so a surviving timer has fired by now.
	await page.waitForTimeout(600);

	await expect(page.getByRole('heading', { level: 1, name: /Chapitre 9/ })).toBeVisible();
	expect(page.url()).toMatch(/\/bible\/genese\/9$/);
});

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
	// Wait for the arrival cascade to settle at the full window rather than
	// starting mid-prepend. Otherwise the sampling below races it, and the
	// non-vacuity check at the end can be satisfied by a prepend that the setup
	// had already started rather than by one the scrolling caused.
	await expect(page.locator('[data-chapter-section]')).toHaveCount(5, { timeout: 15_000 });

	// Scroll down far enough to hide the bars, then settle.
	//
	// Relative, not `scrollTo(0, 1500)`. By the time the prepends have landed the
	// reader is no longer at the top of the document: two chapters have been
	// inserted above and the compensation has moved scrollY down by their whole
	// height (measured at 4008px here). An absolute 1500 would be a 2500px jump
	// *upward*, which reveals the bars rather than hiding them, and the test would
	// fail on its own setup, a false negative created by the very compensation it
	// exists to check.
	await page.evaluate(() => window.scrollBy(0, 800));
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
	//
	// 120px a step, not 60. A prepend needs the reader to leave chapter 5, which
	// needs its anchor to fall below the observer's activation band (the top 30%
	// of the viewport, so 216px). The settled window puts chapter 5's start at
	// ~4008 and the sampling begins at ~4608, which 12 steps of 60px miss by a
	// couple of steps; the loop then samples a perfectly still page and proves
	// nothing.
	const lowestLoadedChapter = () =>
		page.evaluate(() =>
			Math.min(
				...Array.from(document.querySelectorAll<HTMLElement>('[data-chapter-anchor]')).map((el) =>
					Number(el.dataset.chapterNum)
				)
			)
		);
	const lowestBefore = await lowestLoadedChapter();

	const seen = new Set<string | null>();
	for (let i = 0; i < 12; i++) {
		await page.evaluate(() => window.scrollBy(0, -120));
		await page.waitForTimeout(80);
		seen.add(await page.locator('html').getAttribute('data-chrome-hidden'));
	}
	expect([...seen]).toEqual(['false']);

	// The assertion above is only meaningful if a prepend actually happened while
	// it was sampling. Without this the test would pass just as happily against a
	// build that had stopped prepending altogether.
	expect(await lowestLoadedChapter()).toBeLessThan(lowestBefore);
});

test('the loaded window is capped, and pruning it does not disturb the bars', async ({ page }) => {
	await page.goto('/bible/genese/1');
	await enableInfiniteScroll(page);

	// The chrome sampling rides along with the descent rather than living in a
	// test of its own, because this is the only place front-pruning happens and a
	// second thirty-step scroll would double the file's runtime for no new
	// coverage.
	//
	// Pruning a chapter off the top shortens the document above the viewport, and
	// the compensation pulls scrollY *up* by what it occupied. Uncompensated that
	// upward jump is thousands of pixels, which sails past REVEAL_AFTER_UP and
	// pops both bars back out mid-descent · verified by removing
	// anchorChromeShift(delta) from pruneFront, which turns the set below into
	// ['true', 'false']. Sampling starts at i >= 2 so the first steps, which are
	// still crossing HIDE_AFTER, do not record a legitimate 'false'.
	//
	// Sampled twice an iteration, before the wait as well as after it. A prune
	// that lands more than 100ms behind its scroll would reveal the bars in the
	// gap, and the next iteration's downward scroll would re-hide them before a
	// once-per-iteration sample ever looked; the check would then depend on
	// prune latency rather than on the compensation.
	const chromeSeen = new Set<string | null>();
	const sampleChrome = async (i: number) => {
		if (i >= 2) chromeSeen.add(await page.locator('html').getAttribute('data-chrome-hidden'));
	};
	for (let i = 0; i < 30; i++) {
		await page.evaluate(() => window.scrollBy(0, window.innerHeight));
		await sampleChrome(i);
		await page.waitForTimeout(100);
		await sampleChrome(i);
	}

	const count = await page.locator('[data-chapter-section]').count();
	expect(count).toBeGreaterThan(1);
	expect(count).toBeLessThanOrEqual(5);
	expect([...chromeSeen]).toEqual(['true']);
});

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
	//
	// Scoped to Jude's own section rather than asserted positionally. These books
	// are a few hundred pixels each, so one descent loads the window to its cap
	// and runs past Jude into the Apocalypse · a `toHaveCount(2)` here would be
	// measuring how much fits on screen, not which eyebrow each chapter renders.
	await expect(
		page.locator('[data-chapter-section]:has([data-book-slug="jude"]) .chapter-eyebrow')
	).toHaveText('Jude');
	// And the eyebrows genuinely differ across the loaded window · the assertion
	// above would hold just as well if every section rendered the same book.
	const eyebrows = await page.locator('.chapter-eyebrow').allTextContents();
	expect(new Set(eyebrows).size).toBeGreaterThan(1);

	// And the sticky bar retitles once Jude is the chapter being read. Note the
	// scrollIntoView: it is not decoration. See the descent test below, which
	// covers what happens when nothing lands the anchor in the activation band.
	await page
		.locator('[data-chapter-anchor][data-book-slug="jude"]')
		.evaluate((el) => el.scrollIntoView({ block: 'start' }));
	// Let the observer deliver the 'enter' before scrolling on. Back-to-back
	// page.evaluate calls can land in the same rendering frame, and the
	// IntersectionObserver would then only ever see the final position · the
	// same race the Genèse 2 test above documents at length.
	await page.waitForTimeout(200);
	await page.evaluate(() => window.scrollBy(0, 200));
	await expect.poll(() => page.url(), { timeout: 10_000 }).toMatch(/\/bible\/jude\/1$/);
	await expect(page.locator('.bible-chapter-nav button[aria-haspopup="dialog"]')).toContainText(
		'Jude 1'
	);
});

test('a page-at-a-time descent through one-chapter books keeps going, and keeps the reader still', async ({
	page
}) => {
	// 2 Jean, 3 Jean and Jude are consecutive single-chapter books, so this run
	// crosses three book boundaries in a dozen screens, appending and pruning on
	// nearly every step.
	//
	// A whole viewport a step, deliberately. That is what a space bar or a Page
	// Down does, and it is longer than the observer's activation band (the top 30%
	// of the viewport), so an anchor can pass from below the band to above it
	// between two frames and never be reported as entered. Before
	// `activeFromPosition`, the active chapter then stayed on 2 Jean for the whole
	// descent, `idx < 2` stayed true at the bottom of the document, and every
	// append was undone by the tail prune of the prepend that followed it: the
	// window returned to 1-jean-4 … jude-1 byte for byte, over and over, and the
	// page never grew past the Apocalypse boundary.
	await page.goto('/bible/2-jean/1');
	await enableInfiniteScroll(page);
	await page.goto('/bible/2-jean/1');

	// Start from a window already at the cap, so the descent prunes on every
	// append rather than spending its first steps filling up.
	await expect(page.locator('[data-chapter-section]')).toHaveCount(5, { timeout: 15_000 });

	// Jude is the anchor to hold on to: loaded from the start, and far enough down
	// the window to survive several prunes.
	const JUDE_ANCHOR = '[data-chapter-anchor][data-book-slug="jude"]';

	const chromeSeen = new Set<string | null>();
	let held = 0;
	for (let i = 0; i < 12; i++) {
		// Scroll and measure in one evaluate. The reading is then taken before any
		// load can react to the scroll, so the comparison after the wait isolates
		// exactly the movement the loads caused · a reading taken afterwards would
		// fold the reader's own scrolling into the same number.
		const before = await page.evaluate((selector) => {
			window.scrollBy(0, window.innerHeight);
			const el = document.querySelector(selector);
			return el ? el.getBoundingClientRect().top : null;
		}, JUDE_ANCHOR);
		await page.waitForTimeout(150);
		const after = await page.evaluate((selector) => {
			const el = document.querySelector(selector);
			return el ? el.getBoundingClientRect().top : null;
		}, JUDE_ANCHOR);
		// Null once Jude has been pruned off the front, which is expected partway
		// down · `held` below keeps that from emptying the assertion.
		if (before !== null && after !== null) {
			held++;
			expect(Math.abs(after - before)).toBeLessThan(5);
		}
		// Sampled from i >= 2 so the first steps, still crossing HIDE_AFTER, do not
		// record a legitimate 'false'. A prune that reached the chrome reducer
		// uncompensated would show up here as a 'false' mid-descent.
		if (i >= 2) chromeSeen.add(await page.locator('html').getAttribute('data-chrome-hidden'));
	}

	expect(held).toBeGreaterThan(2);
	expect([...chromeSeen]).toEqual(['true']);

	// The point of the whole test: the descent got somewhere. Under the churn the
	// window came back to the same five chapters after every append, so the
	// Apocalypse was never reached and 2 Jean was never left behind.
	await expect(page.locator('[data-chapter-anchor][data-book-slug="apocalypse"]')).not.toHaveCount(
		0
	);
	await expect(page.locator('[data-chapter-anchor][data-book-slug="2-jean"]')).toHaveCount(0);

	// And the active chapter kept pace with the reader rather than lagging
	// behind where the observer last happened to catch a crossing. Read
	// synchronously, with no polling: `expect(page).toHaveURL` retries for up
	// to 5s, which is long enough for the observer to correct itself once
	// scrolling has stopped even without `activeFromPosition`, and would mask
	// exactly the lag this assertion exists to catch.
	expect(page.url()).toMatch(/\/bible\/apocalypse\/\d+$/);
});

test('an in-app navigation re-arms the preload timer, for a chapter reached with no scroll at all', async ({
	page
}) => {
	// onMount's preload timer is one-shot. Without re-arming it from the reset
	// effect too, a reader who lands on Genèse 1 (grows fine, onMount's timer
	// covers it), then uses the chapter grid to jump elsewhere, would find
	// nothing left to call checkPreload again for that chapter: no scroll event
	// ever fires on its own, and the timer that used to stand in for one already
	// fired once and is gone.
	await page.goto('/bible/genese/1');
	await enableInfiniteScroll(page);
	await page.goto('/bible/genese/1');
	// Let the initial onMount timer finish its own growth first, so what
	// follows tests only the in-app navigation's own re-arm.
	await page.waitForTimeout(2500);

	// In-app navigation via the chapter grid, not page.goto: this reuses the
	// component instance, which only the reset effect handles, not onMount.
	await page.locator('.bible-chapter-nav button[aria-haspopup="dialog"]').click();
	await page.locator('[data-book-grid="genese"] a span', { hasText: /^10$/ }).click();

	// No scrolling from here at all. Only the re-armed preload timer, once its
	// own cooldown elapses, can grow the window forward from a standing start.
	await expect(page.locator('[data-chapter-anchor][data-chapter-num="11"]')).toHaveCount(1, {
		timeout: 4000
	});
});

test('toggling the pref off mid-scroll points the footer nav at the chapter on screen, not the entry chapter', async ({
	page
}) => {
	await page.goto('/bible/genese/1');
	await enableInfiniteScroll(page);
	await page.goto('/bible/genese/1');
	await scrollUntilChapter(page, 4);

	// `<svelte:head><title>` reads `activeChapter` directly, with no debounce ·
	// a more reliable settle signal than the sticky bar's URL, which goes
	// through a 200ms-debounced `replaceState` and can still read a chapter the
	// scroll has already moved past. Polling it, then holding for a further
	// pause with no change, is what actually confirms the reader has stopped
	// moving before the assertions below lock in a chapter number.
	const titleChapter = async () => {
		const m = (await page.title()).match(/Genèse (\d+) /);
		return m ? Number(m[1]) : null;
	};
	await expect.poll(titleChapter).toBeGreaterThan(1);
	const settled = await titleChapter();
	await page.waitForTimeout(300);
	await expect.poll(titleChapter).toBe(settled);

	await disableInfiniteScroll(page);

	// A build still deriving these links from the route props (chapter === 1)
	// would render no prevHref at all (chapter > 1 is false) and a wrong
	// nextHref of /bible/genese/2, wherever the reader actually settled.
	const nav = page.getByRole('navigation', { name: 'Chapitre précédent ou suivant' });
	await expect(nav).toBeVisible();
	const links = nav.locator('a');
	await expect(links).toHaveCount(2);
	await expect(links.first()).toHaveAttribute('href', `/bible/genese/${settled! - 1}`);
	await expect(links.last()).toHaveAttribute('href', `/bible/genese/${settled! + 1}`);
});
