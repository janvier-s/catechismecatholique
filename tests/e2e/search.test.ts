import { test, expect } from '@playwright/test';

test('paragraph-number search redirects', async ({ page }) => {
	await page.goto('/');
	await page.getByLabel('Recherche', { exact: true }).fill('27');
	await page.getByLabel('Recherche', { exact: true }).press('Enter');
	await expect(page).toHaveURL(/\/ccc\/27$/);
});

test('bible-ref search redirects', async ({ page }) => {
	await page.goto('/');
	await page.getByLabel('Recherche', { exact: true }).fill('Jn 1, 14');
	await page.getByLabel('Recherche', { exact: true }).press('Enter');
	await expect(page).toHaveURL(/\/bible\/jean\/1\/14$/);
});

test('text search lands on /recherche', async ({ page }) => {
	await page.goto('/');
	await page.getByLabel('Recherche', { exact: true }).fill('Trinité');
	await page.getByLabel('Recherche', { exact: true }).press('Enter');
	await expect(page).toHaveURL(/\/recherche\?q=/);
	await expect(page.getByRole('listitem').first()).toBeVisible();
});
