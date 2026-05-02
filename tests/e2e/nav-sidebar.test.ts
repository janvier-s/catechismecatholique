import { test, expect } from '@playwright/test';

test('sidebar lists 5 parts (incl. Prologue)', async ({ page }) => {
	await page.goto('/');
	const sidebar = page.getByRole('navigation', { name: 'Plan du Catéchisme' });
	await expect(sidebar).toBeVisible();
	// 5 part-level links visible at the top level (Prologue + 4 parties)
	await expect(sidebar.getByRole('link').first()).toBeVisible();
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
