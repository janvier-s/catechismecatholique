import { test, expect } from '@playwright/test';

test('/bible redirects to Genèse 1', async ({ page }) => {
	const res = await page.goto('/bible');
	expect(res?.status()).toBe(200);
	expect(page.url()).toMatch(/\/bible\/genese\/1$/);
});

test('/bible/matthieu lists chapters', async ({ page }) => {
	await page.goto('/bible/matthieu');
	await expect(page.getByRole('heading', { name: 'Matthieu' })).toBeVisible();
	await expect(page.getByRole('link', { name: '1', exact: true })).toBeVisible();
});

test('/bible/matthieu/28 lists verses', async ({ page }) => {
	await page.goto('/bible/matthieu/28');
	// The chapter title renders as "Chapitre 28" (h1); the per-page chapter
	// dropdown shows "Matthieu 28".
	await expect(page.getByRole('heading', { level: 1, name: /Chapitre 28/ })).toBeVisible();
	// Verses render as list items with their number. Verse 1 of Matthew 28
	// should be present in the rendered ordered list.
	await expect(page.locator('li#v1')).toBeVisible();
});

test('/bible/matthieu/28/19 shows CCC paragraphs', async ({ page }) => {
	await page.goto('/bible/matthieu/28/19');
	await expect(page.getByRole('heading', { name: /Matthieu 28, 19/ })).toBeVisible();
	await expect(page.getByText(/Paragraphes du Catéchisme/)).toBeVisible();
});

test('footer has a working concordance link', async ({ page }) => {
	await page.goto('/');
	const link = page.locator('footer a[href="/bible/genese/1/concordance"]');
	await expect(link).toHaveText('Concordance biblique');
	await link.click();
	await expect(page).toHaveURL(/\/bible\/genese\/1\/concordance$/);
	await expect(page).toHaveTitle(/concordance/i);
});

test('nav drawer has a working concordance link', async ({ page }) => {
	await page.goto('/cec');
	await page.locator('.drawer-trigger').click();
	await page.getByRole('button', { name: 'Études & outils' }).click();
	// Accordion opens via a 180ms transition:slide — wait it out before
	// clicking (see tests/e2e/compendium.test.ts for the same pattern).
	await page.waitForTimeout(250);
	const link = page.locator('#nav-drawer a[href="/bible/genese/1/concordance"]');
	await expect(link).toBeVisible();
	await link.click();
	await expect(page).toHaveURL(/\/bible\/genese\/1\/concordance$/);
});
