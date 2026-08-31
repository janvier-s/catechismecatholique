import { test, expect } from '@playwright/test';

test('picking a matched day in the calendar widget shows its feast', async ({ page }) => {
	await page.goto('/calendrier');
	const picker = page.locator('.picker-card');
	await picker.scrollIntoViewIfNeeded();

	// Navigate to a fixed, known month so the matched day is deterministic
	// regardless of the real current date.
	await picker.getByLabel('Année', { exact: true }).selectOption('2026');
	await picker.getByLabel('Mois', { exact: true }).selectOption('8');

	await picker.getByRole('button', { name: /2026$/ }).first().click();

	await expect(picker.getByRole('button', { name: 'Chercher une autre date' })).toBeVisible();
	await expect(picker.locator('article.feast')).toBeVisible();
});

test('Chercher une autre date returns to the calendar grid', async ({ page }) => {
	await page.goto('/calendrier');
	const picker = page.locator('.picker-card');
	await picker.scrollIntoViewIfNeeded();

	await picker.getByLabel('Année', { exact: true }).selectOption('2026');
	await picker.getByLabel('Mois', { exact: true }).selectOption('8');
	await picker.getByRole('button', { name: /2026$/ }).first().click();
	await expect(picker.locator('article.feast')).toBeVisible();

	await picker.getByRole('button', { name: 'Chercher une autre date' }).click();
	await expect(picker.getByLabel('Mois', { exact: true })).toBeVisible();
	await expect(picker.locator('article.feast')).toHaveCount(0);
});

test('month navigation is clamped at the dataset range start', async ({ page }) => {
	await page.goto('/calendrier');
	const picker = page.locator('.picker-card');
	await picker.scrollIntoViewIfNeeded();

	await picker.getByLabel('Année', { exact: true }).selectOption('2000');
	await picker.getByLabel('Mois', { exact: true }).selectOption('1');

	await expect(picker.getByRole('button', { name: 'Mois précédent' })).toBeDisabled();
});
