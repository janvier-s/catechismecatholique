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

	test('Voir tous opens every cited range in its own tab', async ({ page, context }) => {
		await page.goto('/bible/genese/3/concordance');
		await page.waitForLoadState('networkidle');
		await page.getByRole('button', { name: 'Genèse 3:1-24' }).first().click();
		// Genèse 3:1-24 cites two ranges: §390 and §394-412.
		// Exact match — the enclosing pericope card also carries role="button"
		// and its accessible name (verseRef + count + button text) contains
		// "Voir tous" as a substring, so a non-exact match would hit it instead.
		const btn = page.getByRole('button', { name: 'Voir tous', exact: true });
		await expect(btn).toBeVisible();

		await btn.click();
		await expect.poll(() => context.pages().length).toBe(3);
		const newPages = context.pages().slice(1);
		await Promise.all(newPages.map((p) => p.waitForLoadState()));
		const urls = newPages.map((p) => new URL(p.url()).pathname).sort();
		expect(urls).toEqual(['/cec/390', '/cec/394-412'].sort());
	});

	test('Voir tous is absent for a passage with a single range', async ({ page }) => {
		await page.goto('/bible/genese/3/concordance');
		await page.waitForLoadState('networkidle');
		await page.getByRole('button', { name: 'Genèse 3:19' }).first().click();
		await expect(page.getByRole('button', { name: 'Voir tous', exact: true })).toHaveCount(0);
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
