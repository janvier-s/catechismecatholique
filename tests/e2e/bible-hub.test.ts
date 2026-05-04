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
	// Verses render as list items; each verse is a button that opens the study panel.
	await expect(page.getByRole('button', { name: /verset 1$/ })).toBeVisible();
});

test('/bible/matthieu/28/19 shows CCC paragraphs', async ({ page }) => {
	await page.goto('/bible/matthieu/28/19');
	await expect(page.getByRole('heading', { name: /Matthieu 28, 19/ })).toBeVisible();
	await expect(page.getByText(/Paragraphes du Catéchisme/)).toBeVisible();
});
