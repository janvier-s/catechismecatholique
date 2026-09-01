import { test, expect } from '@playwright/test';

// The panel is reached by clicking a §NNN cross-ref sup, which only renders
// inline when crossRefsLayout = 'inline' (the default moves it to the margin).
test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => {
		localStorage.setItem(
			'catechismecatholique.prefs',
			JSON.stringify({ crossRefsLayout: 'inline' })
		);
	});
});

async function openPanel(page: import('@playwright/test').Page, paragraph: number) {
	await page.goto(`/cec/${paragraph}`);
	await page.waitForFunction(() => document.querySelectorAll('sup.srcRef.cccRef').length > 0);
	await page.locator('sup.srcRef.cccRef').first().click();
	const panel = page.locator('aside[aria-label="Panneau d\'étude"]');
	await expect(panel).toBeVisible();
	return panel;
}

test('Liturgie sub-tab lists the days a paragraph is meditated on', async ({ page }) => {
	const panel = await openPanel(page, 668);
	await page.getByRole('tab', { name: 'Liturgie' }).click();

	// The same Sunday recurs in années A, B and C, so match the first card.
	await expect(panel.getByText('Premier Dimanche de l’Avent').first()).toBeVisible();
	await expect(panel.getByText("Temps de l'Avent · Année A")).toBeVisible();
	// The cluster theme, and the whole cluster as sibling chips.
	await expect(
		panel.getByText('l’épreuve finale et la venue du Christ dans la gloire').first()
	).toBeVisible();
	await expect(panel.getByRole('button', { name: '769', exact: true }).first()).toBeVisible();
	// The day's Mass readings, not the paragraph, are what is proclaimed.
	await expect(panel.getByText('Lectures de la messe').first()).toBeVisible();
	await expect(panel.getByRole('link', { name: 'Mt 24, 37-44' }).first()).toBeVisible();
});

test('reading text is fetched only when a day is expanded', async ({ page }) => {
	const panel = await openPanel(page, 668);
	await page.getByRole('tab', { name: 'Liturgie' }).click();

	const readings: string[] = [];
	page.on('request', (r) => {
		if (r.url().includes('/data/calendrier/readings/')) readings.push(r.url());
	});
	await expect(panel.getByText('Is 2, 1-5')).toBeVisible();
	expect(readings).toEqual([]);

	await panel.getByRole('button', { name: 'Lire les textes' }).first().click();
	await expect(panel.getByText('Parole d’Isaïe,')).toBeVisible();
	expect(readings.length).toBe(1);
});

test('the tab is absent for a paragraph no day cites', async ({ page }) => {
	// Clicking a cross-ref sup opens the panel on the paragraph that owns it,
	// so the page must be the uncovered paragraph itself. 94 carries no
	// Homiletic Directory cluster but has cross-refs of its own to click.
	await page.goto('/cec/94');
	await page.waitForFunction(() => document.querySelectorAll('sup.srcRef.cccRef').length > 0);
	await page.locator('sup.srcRef.cccRef').first().click();
	const panel = page.locator('aside[aria-label="Panneau d\'étude"]');
	await expect(panel).toBeVisible();
	await expect(page.getByRole('tab', { name: 'Renvois' }).first()).toBeVisible();
	await expect(page.getByRole('tab', { name: 'Liturgie' })).toHaveCount(0);
});
