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

test('Catéchisme dropdown opens with parts', async ({ page }) => {
	await page.goto('/');
	// The dropdown also opens on mouseenter; hover deterministically opens
	// the panel without the click-toggle quirk.
	await page
		.getByRole('button', { name: /Catéchisme/i })
		.first()
		.hover();
	await expect(page.locator('#catechism-menu')).toBeVisible();
	// The cell-tag span renders "Partie 1" (with a non-breaking space)
	await expect(
		page
			.locator('#catechism-menu .cell-tag')
			.filter({ hasText: /Partie\s*1/ })
			.first()
	).toBeVisible();
});

test('Catéchisme dropdown cascades to chapters on hover', async ({ page }) => {
	await page.goto('/');
	await page
		.getByRole('button', { name: /Catéchisme/i })
		.first()
		.hover();
	await expect(page.locator('#catechism-menu')).toBeVisible();
	// Cells are plain <a> links. Hover the Partie 1 cell.
	await page
		.locator('#catechism-menu a')
		.filter({ hasText: /Partie\s*1/ })
		.first()
		.hover();
	// Hover the first Section 1 cell
	await page
		.locator('#catechism-menu a')
		.filter({ hasText: /Section\s*1/ })
		.first()
		.hover();
	// At least one chapter link should appear
	await expect(
		page
			.locator('#catechism-menu a')
			.filter({ hasText: /Chapitre\s*1/ })
			.first()
	).toBeVisible();
});
