import { test, expect } from '@playwright/test';

// These tests click the §NNN cross-ref sups, which only render in the body
// when crossRefsLayout = 'inline'. With the default switched to 'side', the
// renderer moves them into the side margin and strips them from the prose.
// Force inline layout so the inline-click code path is exercised regardless
// of what the default happens to be.
test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => {
		localStorage.setItem(
			'catechismecatholique.prefs',
			JSON.stringify({ crossRefsLayout: 'inline' })
		);
	});
});

test('clicking a §NNN ref opens the study panel', async ({ page }) => {
	await page.goto('/cec/27');
	// Wait for the post-process to finish (sup elements get cursor pointer + .lead class)
	await page.waitForFunction(() => document.querySelectorAll('sup.srcRef.cccRef').length > 0);
	await page.locator('sup.srcRef.cccRef').first().click();
	const panel = page.locator('aside[aria-label="Panneau d\'étude"]');
	await expect(panel).toBeVisible();
});

test('panel closes on Escape', async ({ page }) => {
	await page.goto('/cec/27');
	await page.waitForFunction(() => document.querySelectorAll('sup.srcRef.cccRef').length > 0);
	await page.locator('sup.srcRef.cccRef').first().click();
	const panel = page.locator('aside[aria-label="Panneau d\'étude"]');
	await expect(panel).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(panel).not.toBeVisible();
});

test('inline bible ref opens the study panel on the Bible tab', async ({ page }) => {
	// §2466 has many inline (Jn x, y) refs rendered as button.bible-inline
	await page.goto('/cec/2466');
	const inline = page.locator('button.bible-inline').first();
	await expect(inline).toBeVisible();
	await inline.click();
	const panel = page.locator('aside[aria-label="Panneau d\'étude"]');
	await expect(panel).toBeVisible();
});
