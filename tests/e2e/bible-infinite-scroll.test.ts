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
