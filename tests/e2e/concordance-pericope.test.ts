import { test, expect } from '@playwright/test';

// These four tests require real concordance data (DIDACHE_SOURCE_DIR).
// They skip automatically when the manifest is empty (e.g. CI without source).
test.describe('concordance — data-dependent', () => {
	let hasData = false;

	test.beforeAll(async ({ request }) => {
		const r = await request.get('/data/concordance/manifest.json');
		const m = (await r.json()) as Record<string, number[]>;
		hasData = Object.keys(m).length > 0;
	});

	test.beforeEach(() => {
		if (!hasData) test.skip();
	});

	test('concordance link appears for chapters with data', async ({ page }) => {
		await page.goto('/bible/genese/3');
		await expect(page.getByRole('link', { name: /Voir la concordance/i })).toBeVisible();
	});

	test('concordance page renders pericopes with French titles and CCC chips', async ({ page }) => {
		await page.goto('/bible/genese/3/concordance');
		await expect(page.getByText('La faute et le châtiment').first()).toBeVisible();
		await expect(page.getByText('Genèse 3:1-24').first()).toBeVisible();
		const cccChip = page.locator('.pericope-detail a[href^="/cec/"]').first();
		await expect(cccChip).toBeVisible();
	});

	test('clicking a pericope header on the left highlights the matching pericope on the right', async ({
		page
	}) => {
		await page.goto('/bible/genese/3/concordance');
		const leftHeader = page.getByRole('button', { name: 'Genèse 3:1-24' }).first();
		await leftHeader.click();
		const rightCard = page.locator('[data-pericope-ref="Genèse 3:1-24"]').first();
		await expect(rightCard).toBeInViewport();
	});

	test('CCC chip on the concordance page navigates to /cec/<n>', async ({ page }) => {
		await page.goto('/bible/genese/3/concordance');
		const cccChip = page.locator('.pericope-detail a[href^="/cec/"]').first();
		const href = await cccChip.getAttribute('href');
		expect(href).toMatch(/^\/cec\/\d+(-\d+)?$/);
		await cccChip.click();
		await expect(page).toHaveURL(href!);
	});
});

// This test verifies negative behaviour and passes regardless of whether
// concordance source data is available.
test('chapters without concordance data: no link, route 404s', async ({ page }) => {
	await page.goto('/bible/1-chroniques/1');
	await expect(page.getByRole('link', { name: /Voir la concordance/i })).toHaveCount(0);

	const response = await page.goto('/bible/1-chroniques/1/concordance');
	expect(response?.status()).toBe(404);
});
