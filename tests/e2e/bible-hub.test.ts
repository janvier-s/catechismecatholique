import { test, expect } from '@playwright/test';

test('/bible shows OT and NT', async ({ page }) => {
	await page.goto('/bible');
	await expect(page.getByRole('heading', { name: 'Ancien Testament' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Nouveau Testament' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Matthieu' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Genèse' })).toBeVisible();
});

test('/bible/matthieu lists chapters', async ({ page }) => {
	await page.goto('/bible/matthieu');
	await expect(page.getByRole('heading', { name: 'Matthieu' })).toBeVisible();
	await expect(page.getByRole('link', { name: '1', exact: true })).toBeVisible();
});

test('/bible/matthieu/28 lists verses', async ({ page }) => {
	await page.goto('/bible/matthieu/28');
	await expect(page.getByRole('heading', { name: /Matthieu 28/ })).toBeVisible();
	await expect(page.locator('ol > li').first()).toBeVisible();
});

test('/bible/matthieu/28/19 shows CCC paragraphs', async ({ page }) => {
	await page.goto('/bible/matthieu/28/19');
	await expect(page.getByRole('heading', { name: /Matthieu 28, 19/ })).toBeVisible();
	await expect(page.getByText(/Paragraphes du Catéchisme/)).toBeVisible();
});
