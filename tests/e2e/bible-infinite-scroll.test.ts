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
