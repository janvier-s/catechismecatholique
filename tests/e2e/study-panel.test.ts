import { test, expect } from '@playwright/test';

test('clicking a §NNN ref opens the study panel', async ({ page }) => {
	await page.goto('/ccc/27');
	// Wait for the post-process to finish (sup elements get cursor pointer + .lead class)
	await page.waitForFunction(() => document.querySelectorAll('sup.srcRef.cccRef').length > 0);
	await page.locator('sup.srcRef.cccRef').first().click();
	await expect(page.getByRole('complementary', { name: "Panneau d'étude" })).toBeVisible();
});

test('panel closes on Escape', async ({ page }) => {
	await page.goto('/ccc/27');
	await page.waitForFunction(() => document.querySelectorAll('sup.srcRef.cccRef').length > 0);
	await page.locator('sup.srcRef.cccRef').first().click();
	await expect(page.getByRole('complementary', { name: "Panneau d'étude" })).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(page.getByRole('complementary', { name: "Panneau d'étude" })).not.toBeVisible();
});

test('inline bible ref renders as clickable link to /bible/...', async ({ page }) => {
	// §2466 has many inline (Jn x, y) refs
	await page.goto('/ccc/2466');
	await expect(page.locator('a.bible-inline').first()).toBeVisible();
	const href = await page.locator('a.bible-inline').first().getAttribute('href');
	expect(href).toMatch(/^\/bible\/[a-z-]+\/\d+\/\d+$/);
});
