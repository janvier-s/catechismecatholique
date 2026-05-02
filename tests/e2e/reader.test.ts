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
