import { test, expect } from '@playwright/test';

test('paragraph 27 page renders', async ({ page }) => {
	await page.goto('/ccc/27');
	await expect(page).toHaveTitle(/§ 27/);
	await expect(page.getByText('désir de Dieu', { exact: false }).first()).toBeVisible();
});

test('paragraph range 27-30 renders', async ({ page }) => {
	await page.goto('/ccc/27-30');
	await expect(page).toHaveTitle(/§ 27/);
});

test('invalid paragraph returns 404', async ({ page }) => {
	const res = await page.goto('/ccc/99999');
	expect(res?.status()).toBe(404);
});

test('chapter page renders with sidebar', async ({ page }) => {
	// Use the first non-prologue part / section / chapter
	const fs = await import('node:fs');
	const struct = JSON.parse(fs.readFileSync('static/data/ccc/structure.json', 'utf8'));
	const part = struct.parts.find((p: { prologue?: boolean }) => !p.prologue);
	const section = part.sections[0];
	const chapter = section.chapters[0];
	await page.goto(`/ccc/${part.slug}/${section.slug}/${chapter.slug}`);
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	await expect(page.getByLabel('Plan du Catéchisme')).toBeVisible();
});

test('ccc home renders parts', async ({ page }) => {
	await page.goto('/ccc');
	await expect(page.getByRole('heading', { name: /Catéchisme de l'Église catholique/ })).toBeVisible();
});

test('sommaire renders full TOC', async ({ page }) => {
	await page.goto('/ccc/sommaire');
	await expect(page.getByRole('heading', { name: /Sommaire complet/ })).toBeVisible();
});

test('prologue renders paragraphs', async ({ page }) => {
	await page.goto('/ccc/prologue');
	await expect(page.getByRole('heading', { name: 'Prologue' })).toBeVisible();
});

test('partie/1 redirects to part slug', async ({ page }) => {
	const res = await page.goto('/ccc/partie/1');
	expect(res?.status()).toBe(200);
	expect(page.url()).toMatch(/\/ccc\/[a-z-]+$/);
	expect(page.url()).not.toContain('/partie/');
});

test('TopBar renders on every page', async ({ page }) => {
	await page.goto('/ccc/27');
	const banner = page.getByRole('banner');
	await expect(banner.getByRole('link', { name: 'Accueil' })).toBeVisible();
	await expect(banner.getByRole('button', { name: /Catéchisme/i })).toBeVisible();
	await expect(banner.getByRole('link', { name: 'Bible' })).toBeVisible();
	const search = banner.getByLabel('Recherche', { exact: true });
	await expect(search).toBeVisible();
	await expect(search).toBeEnabled();
	await expect(search).toHaveAttribute('placeholder', 'Rechercher : Eucharistie ou 1324-1327');
});

test('theme picker switches data-theme attribute and persists', async ({ page }) => {
	await page.goto('/ccc/27');
	const html = page.locator('html');
	// Open the reading-options dialog, then choose Sombre
	await page.getByLabel('Options de lecture').click();
	await page.getByRole('dialog', { name: 'Options de lecture' }).getByLabel('Sombre').click();
	await expect(html).toHaveAttribute('data-theme', 'dark');
	// Reload — should persist
	await page.reload();
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('article page shows only the article paragraphs', async ({ page }) => {
	const fs = await import('node:fs');
	const struct = JSON.parse(fs.readFileSync('static/data/ccc/structure.json', 'utf8'));
	const part = struct.parts.find((p: { prologue?: boolean; sections: unknown[] }) => !p.prologue);
	const section = part.sections.find((s: { chapters: { articles: unknown[] }[] }) =>
		s.chapters.some((c) => c.articles.length > 0)
	);
	const chapter = section.chapters.find((c: { articles: unknown[] }) => c.articles.length > 0);
	const article = chapter.articles[0];
	await page.goto(`/ccc/${part.slug}/${section.slug}/${chapter.slug}/${article.slug}`);
	await expect(page.getByRole('heading', { level: 1 })).toContainText(article.title);
	// The page should NOT show the chapter title as h1 (article filtering means article.title is h1)
});
