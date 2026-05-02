import { test, expect } from '@playwright/test';

test('paragraph 27 page renders', async ({ page }) => {
	await page.goto('/ccc/27');
	await expect(page).toHaveTitle(/§ 27/);
	await expect(page.getByText('désir de Dieu', { exact: false })).toBeVisible();
});

test('paragraph range 27-30 renders', async ({ page }) => {
	await page.goto('/ccc/27-30');
	await expect(page).toHaveTitle(/§ 27/);
});

test('invalid paragraph returns 404', async ({ page }) => {
	const res = await page.goto('/ccc/99999');
	expect(res?.status()).toBe(404);
});

test('chapter page renders with outline', async ({ page }) => {
	// Use the first non-prologue part / section / chapter
	const fs = await import('node:fs');
	const struct = JSON.parse(fs.readFileSync('static/data/ccc/structure.json', 'utf8'));
	const part = struct.parts.find((p: { prologue?: boolean }) => !p.prologue);
	const section = part.sections[0];
	const chapter = section.chapters[0];
	await page.goto(`/ccc/${part.slug}/${section.slug}/${chapter.slug}`);
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	await expect(page.getByLabel('Plan du chapitre')).toBeVisible();
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
	await expect(page.getByRole('link', { name: 'Accueil' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Catéchisme', exact: true })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Sommaire' })).toBeVisible();
	await expect(page.getByLabel('Recherche (à venir)')).toBeDisabled();
});
