import { test, expect } from '@playwright/test';

test('concordance link appears for chapters with data', async ({ page }) => {
	await page.goto('/bible/genese/3');
	await expect(page.getByRole('link', { name: /Voir la concordance/i })).toBeVisible();
});

test('concordance page renders pericopes with French titles and CCC chips', async ({ page }) => {
	await page.goto('/bible/genese/3/concordance');
	await expect(page.getByText('La faute et le châtiment').first()).toBeVisible();
	// Pericope card should show "Genèse 3:1-24" range and at least one CCC chip
	await expect(page.getByText('Genèse 3:1-24').first()).toBeVisible();
	const cccChip = page.locator('a[href^="/ccc/"]').first();
	await expect(cccChip).toBeVisible();
});

test('clicking a pericope header on the left highlights the matching pericope on the right', async ({ page }) => {
	await page.goto('/bible/genese/3/concordance');
	// Pick a specific pericope header on the left (button with the verseRef text).
	const leftHeader = page.locator('button', { hasText: 'Genèse 3:1-24' }).first();
	await leftHeader.click();
	// The right pane should highlight the matching pericope card via data-pericope-ref
	const rightCard = page.locator('[data-pericope-ref="Genèse 3:1-24"]').first();
	await expect(rightCard).toBeInViewport();
});

test('CCC chip on the concordance page navigates to /ccc/<n>', async ({ page }) => {
	await page.goto('/bible/genese/3/concordance');
	const cccChip = page.locator('a[href^="/ccc/"]').first();
	const href = await cccChip.getAttribute('href');
	expect(href).toMatch(/^\/ccc\/\d+$/);
	await cccChip.click();
	await expect(page).toHaveURL(href!);
});

test('chapters without concordance data: no link, route 404s', async ({ page }) => {
	await page.goto('/bible/1-chroniques/1');
	await expect(page.getByRole('link', { name: /Voir la concordance/i })).toHaveCount(0);

	const response = await page.goto('/bible/1-chroniques/1/concordance');
	expect(response?.status()).toBe(404);
});
