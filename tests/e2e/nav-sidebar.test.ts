import { test, expect } from '@playwright/test';

test('sidebar lists 5 parts (incl. Prologue) on /ccc routes', async ({ page }) => {
	await page.goto('/ccc');
	const sidebar = page.getByRole('navigation', { name: 'Plan du Catéchisme' });
	await expect(sidebar).toBeVisible();
	// 5 part-level links visible at the top level (Prologue + 4 parties)
	await expect(sidebar.getByRole('link').first()).toBeVisible();
});

test('sidebar is hidden on the homepage', async ({ page }) => {
	await page.goto('/');
	const sidebar = page.getByRole('navigation', { name: 'Plan du Catéchisme' });
	await expect(sidebar).not.toBeVisible();
});

test('sidebar auto-expands active chapter branch', async ({ page }) => {
	const fs = await import('node:fs');
	const struct = JSON.parse(fs.readFileSync('static/data/ccc/structure.json', 'utf8'));
	const part = struct.parts.find((p: { prologue?: boolean }) => !p.prologue);
	const section = part.sections[0];
	const chapter = section.chapters[0];
	const url = `/ccc/${part.slug}/${section.slug}/${chapter.slug}`;
	await page.goto(url);
	const sidebar = page.getByRole('navigation', { name: 'Plan du Catéchisme' });
	await expect(
		sidebar.getByRole('link', { name: new RegExp(chapter.title.slice(0, 30)) })
	).toBeVisible();
});

test('Catéchisme dropdown opens with parts', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: /Catéchisme/i }).first().click();
	await expect(page.getByRole('menu')).toBeVisible();
	await expect(page.getByText(/Partie 1 :/)).toBeVisible();
});

test('Catéchisme dropdown cascades to chapters on hover', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: /Catéchisme/i }).first().click();
	// Hover Partie 1 (button containing "Partie 1 :")
	await page.locator('[role="menu"] button').filter({ hasText: 'Partie 1 :' }).first().hover();
	// Hover the first section button (any button after "Partie 1 :")
	await page.locator('[role="menu"] button').filter({ hasText: 'Section 1 :' }).first().hover();
	// At least one chapter link should appear
	await expect(page.locator('[role="menu"] a').filter({ hasText: /Chapitre 1/ })).toBeVisible();
});
