import { test, expect } from '@playwright/test';

test('/bible shows OT and NT', async ({ page }) => {
	await page.goto('/bible');
	await expect(page.getByRole('heading', { name: 'Ancien Testament' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Nouveau Testament' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Matthieu' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Genèse' })).toBeVisible();
});
