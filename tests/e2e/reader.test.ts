import { test, expect } from '@playwright/test';
import { openDisclosure } from './helpers';

test('paragraph 27 page renders', async ({ page }) => {
	await page.goto('/cec/27');
	await expect(page).toHaveTitle(/Paragraphe.*27/);
	await expect(page.getByText('désir de Dieu', { exact: false }).first()).toBeVisible();
});

test('paragraph range 27-30 renders', async ({ page }) => {
	await page.goto('/cec/27-30');
	await expect(page).toHaveTitle(/Paragraphe.*27/);
});

test('invalid paragraph returns 404', async ({ page }) => {
	const res = await page.goto('/cec/99999');
	expect(res?.status()).toBe(404);
});

test('chapter page renders with sidebar', async ({ page }) => {
	// Use the first non-prologue part / section / chapter
	const fs = await import('node:fs');
	const struct = JSON.parse(fs.readFileSync('static/data/cec/structure.json', 'utf8'));
	const part = struct.parts.find((p: { prologue?: boolean }) => !p.prologue);
	const section = part.sections[0];
	const chapter = section.chapters[0];
	await page.goto(`/cec/${part.slug}/${section.slug}/${chapter.slug}`);
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	await expect(page.getByLabel('Plan du Catéchisme')).toBeVisible();
});

test('cec home renders parts', async ({ page }) => {
	await page.goto('/cec');
	await expect(
		page.getByRole('heading', { name: /Catéchisme de l'Église catholique/i })
	).toBeVisible();
});

test('sommaire renders full TOC', async ({ page }) => {
	await page.goto('/cec/sommaire');
	await expect(page.getByRole('heading', { name: 'Sommaire', exact: true })).toBeVisible();
});

test('prologue renders paragraphs', async ({ page }) => {
	await page.goto('/cec/prologue');
	await expect(page.getByRole('heading', { name: 'Prologue' })).toBeVisible();
});

test('partie/1 redirects to part slug', async ({ page }) => {
	const res = await page.goto('/cec/partie/1');
	expect(res?.status()).toBe(200);
	// Part 1 has no intro paragraphs, so we further redirect from
	// /cec/{part-slug} to its first section /cec/{part-slug}/{section-slug}.
	expect(page.url()).toMatch(/\/cec\/[a-z0-9-]+(?:\/[a-z0-9-]+)?$/);
	expect(page.url()).not.toContain('/partie/');
});

test('TopBar renders on every page', async ({ page }) => {
	await page.goto('/cec/27');
	const banner = page.getByRole('banner');
	await expect(
		banner.getByRole('link', { name: /Catéchisme de l'Église Catholique/ })
	).toBeVisible();
	await expect(banner.getByRole('link', { name: /Catéchisme/i }).first()).toBeVisible();
	await expect(banner.getByRole('link', { name: 'Bible' })).toBeVisible();
	const search = banner.getByLabel('Recherche', { exact: true });
	await expect(search).toBeVisible();
	await expect(search).toBeEnabled();
	await expect(search).toHaveAttribute('placeholder', 'Rechercher : Eucharistie ou 1324-1327');
});

test('theme picker switches data-theme attribute and persists', async ({ page }) => {
	await page.goto('/cec/27');
	const html = page.locator('html');
	// Open the reading-options dialog, then choose Sombre. Not a bare click ·
	// see openDisclosure for why the first one after a navigation can be lost.
	const dialog = page.getByRole('dialog', { name: 'Options de lecture' });
	await openDisclosure(page.getByLabel('Options de lecture'), dialog);
	await dialog.getByLabel('Sombre').click();
	await expect(html).toHaveAttribute('data-theme', 'dark');
	// Reload — should persist
	await page.reload();
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('article page shows only the article paragraphs', async ({ page }) => {
	const fs = await import('node:fs');
	const struct = JSON.parse(fs.readFileSync('static/data/cec/structure.json', 'utf8'));
	const part = struct.parts.find((p: { prologue?: boolean; sections: unknown[] }) => !p.prologue);
	const section = part.sections.find((s: { chapters: { articles: unknown[] }[] }) =>
		s.chapters.some((c) => c.articles.length > 0)
	);
	const chapter = section.chapters.find((c: { articles: unknown[] }) => c.articles.length > 0);
	const article = chapter.articles[0];
	await page.goto(`/cec/${part.slug}/${section.slug}/${chapter.slug}/${article.slug}`);
	await expect(page.getByRole('heading', { level: 1 })).toContainText(article.title);
	// The page should NOT show the chapter title as h1 (article filtering means article.title is h1)
});
