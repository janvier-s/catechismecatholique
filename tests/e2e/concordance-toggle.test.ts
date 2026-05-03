import { test, expect } from '@playwright/test';

test('concordance pills toggle independently', async ({ page }) => {
	await page.goto('/bible/genese/1');

	// Wait for chapter content
	await expect(page.getByRole('heading', { name: 'Chapitre 1' })).toBeVisible();

	const cccPills = page.locator('.cec-pill:not(.cec-pill--concordance)');
	const concordancePills = page.locator('.cec-pill--concordance');

	// Initial state: both checkboxes available, both pill kinds visible (when data exists)
	const cccCount = await cccPills.count();
	const concordanceCount = await concordancePills.count();
	if (concordanceCount === 0) {
		test.skip(true, 'No concordance data — DIDACHE_SOURCE_DIR likely unset');
	}
	expect(cccCount).toBeGreaterThan(0);

	// Toggle concordance off — concordance pills disappear, CCC pills remain
	await page.getByLabel('Afficher la concordance').uncheck();
	await expect(concordancePills).toHaveCount(0);
	await expect(cccPills).toHaveCount(cccCount);

	// Toggle back on
	await page.getByLabel('Afficher la concordance').check();
	await expect(concordancePills).toHaveCount(concordanceCount);
});

test('concordance pill opens panel with concordance label', async ({ page }) => {
	await page.goto('/bible/genese/1');
	const concordancePills = page.locator('.cec-pill--concordance');
	if ((await concordancePills.count()) === 0) {
		test.skip(true, 'No concordance data');
	}
	await concordancePills.first().click();
	await expect(page.getByText(/renvoi\(s\) de la concordance pour/)).toBeVisible();
});
