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
	// fail on its own setup — a false negative created by the very compensation it
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
	// needs its anchor to fall below the observer's activation band — the top 30%
	// of the viewport, so 216px. The settled window puts chapter 5's start at
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
	// pops both bars back out mid-descent — verified by removing
	// anchorChromeShift(-removed) from pruneFront, which turns the set below into
	// ['true', 'false']. Sampling starts at i >= 2 so the first steps, which are
	// still crossing HIDE_AFTER, do not record a legitimate 'false'.
	const chromeSeen = new Set<string | null>();
	for (let i = 0; i < 30; i++) {
		await page.evaluate(() => window.scrollBy(0, window.innerHeight));
		await page.waitForTimeout(100);
		if (i >= 2) chromeSeen.add(await page.locator('html').getAttribute('data-chrome-hidden'));
	}

	const count = await page.locator('[data-chapter-section]').count();
	expect(count).toBeGreaterThan(1);
	expect(count).toBeLessThanOrEqual(5);
	expect([...chromeSeen]).toEqual(['true']);
});
