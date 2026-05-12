import { test, expect } from '@playwright/test';

test('sidebar lists parts inside reader pages', async ({ page }) => {
	// Sidebar is hidden on /cec index and /cec/sommaire; it appears once you
	// enter a reading surface (paragraph, chapter, etc.).
	await page.goto('/cec/27');
	const sidebar = page.getByRole('navigation', { name: 'Plan du Catéchisme' });
	await expect(sidebar).toBeVisible();
	await expect(sidebar.getByRole('link').first()).toBeVisible();
});

test('sidebar is hidden on the homepage', async ({ page }) => {
	await page.goto('/');
	const sidebar = page.getByRole('navigation', { name: 'Plan du Catéchisme' });
	await expect(sidebar).not.toBeVisible();
});

test('sidebar auto-expands active chapter branch', async ({ page }) => {
	const fs = await import('node:fs');
	const struct = JSON.parse(fs.readFileSync('static/data/cec/structure.json', 'utf8'));
	const part = struct.parts.find((p: { prologue?: boolean }) => !p.prologue);
	const section = part.sections[0];
	const chapter = section.chapters[0];
	const url = `/cec/${part.slug}/${section.slug}/${chapter.slug}`;
	await page.goto(url);
	const sidebar = page.getByRole('navigation', { name: 'Plan du Catéchisme' });
	// Match the chapter link by href — the visible label includes
	// "Chapitre N :" prefix and may contain typographic punctuation that
	// makes title-based matching brittle.
	await expect(sidebar.locator(`a[href="${url}"]`)).toBeVisible();
});

// The Catéchisme hover-cascade dropdown was retired when the topbar
// nav got simplified to direct links + a right-side drawer. The drawer
// itself is exercised in tests/e2e/compendium.test.ts.
test('topbar Catéchisme link goes to /cec', async ({ page }) => {
	await page.goto('/');
	await page
		.getByRole('navigation', { name: /Navigation principale/i })
		.getByText('Catéchisme')
		.click();
	await expect(page).toHaveURL(/\/cec$/);
});
