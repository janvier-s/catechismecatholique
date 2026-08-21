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
		// Wait for JS hydration before clicking (SSR renders the button but onclick
		// is only attached after hydration, which can be slow on CI runners).
		await page.waitForLoadState('networkidle');
		await page.getByRole('button', { name: 'Genèse 3:1-24' }).first().click();
		const cccChip = page.locator('.pericope-detail a[href^="/cec/"]').first();
		await expect(cccChip).toBeVisible({ timeout: 10000 });
	});

	test('clicking a pericope header on the left highlights the matching pericope on the right', async ({
		page
	}) => {
		await page.goto('/bible/genese/3/concordance');
		await page.waitForLoadState('networkidle');
		const leftHeader = page.getByRole('button', { name: 'Genèse 3:1-24' }).first();
		await leftHeader.click();
		const rightCard = page.locator('[data-pericope-ref="Genèse 3:1-24"]').first();
		await expect(rightCard).toBeInViewport();
	});

	test('CCC chip on the concordance page navigates to /cec/<n>', async ({ page }) => {
		await page.goto('/bible/genese/3/concordance');
		await page.waitForLoadState('networkidle');
		await page.getByRole('button', { name: 'Genèse 3:1-24' }).first().click();
		const cccChip = page.locator('.pericope-detail a[href^="/cec/"]').first();
		const href = await cccChip.getAttribute('href');
		expect(href).toMatch(/^\/cec\/\d+(-\d+)?$/);
		await cccChip.click();
		await expect(page).toHaveURL(href!);
	});

	test('Voir tous opens every cited range on one page', async ({ page }) => {
		await page.goto('/bible/genese/3/concordance');
		await page.waitForLoadState('networkidle');
		await page.getByRole('button', { name: 'Genèse 3:1-24' }).first().click();
		// Genèse 3:1-24 cites two ranges: §390 and §394-412. Both travel in a
		// single comma-separated ref, with the passage carried as a label.
		const link = page.getByRole('link', { name: /^Voir tous/ });
		await expect(link).toBeVisible();
		expect(await link.getAttribute('href')).toMatch(/^\/cec\/390,394-412\?label=/);

		await link.click();
		await expect(page).toHaveURL(/\/cec\/390,394-412/);
		await expect(page.locator('#p-390')).toBeVisible();
		await expect(page.locator('#p-412')).toBeAttached();

		// A gathered list has no place in the tree, so the rail stays away.
		await expect(page.getByRole('navigation', { name: 'Plan du Catéchisme' })).toHaveCount(0);

		// And the return link goes back to the concordance it came from,
		// not to the CCC front door the reader never passed through.
		// Exact — the footer carries a "Concordance biblique" link too.
		const back = page.getByRole('link', { name: 'Concordance', exact: true });
		await expect(back).toHaveAttribute('href', '/bible/genese/3/concordance');
		await back.click();
		await expect(page).toHaveURL(/\/bible\/genese\/3\/concordance$/);
	});

	test('Voir tous is absent for a passage with a single range', async ({ page }) => {
		await page.goto('/bible/genese/3/concordance');
		await page.waitForLoadState('networkidle');
		await page.getByRole('button', { name: 'Genèse 3:19' }).first().click();
		await expect(page.getByRole('link', { name: /^Voir tous/ })).toHaveCount(0);
	});
});

// Negative behaviour: chapters with no concordance entries don't expose
// the "Voir la concordance" link on the reader, and the /concordance route
// renders a friendly "pas disponible" stub (intentionally 200, not 404 —
// see commit df4dae47).
test('chapters without concordance data: no link, route renders fallback', async ({ page }) => {
	await page.goto('/bible/1-chroniques/1');
	await expect(page.getByRole('link', { name: /Voir la concordance/i })).toHaveCount(0);

	const response = await page.goto('/bible/1-chroniques/1/concordance');
	expect(response?.status()).toBe(200);
	await expect(page.getByText(/Aucun croisement avec le Catéchisme/i)).toBeVisible();
});
