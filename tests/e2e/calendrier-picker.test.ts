import { test, expect } from '@playwright/test';

test('picking a matched day shows its feast without hiding the calendar', async ({ page }) => {
	await page.goto('/calendrier-liturgique');
	const picker = page.locator('.date-search');
	await picker.scrollIntoViewIfNeeded();
	await picker.getByRole('button', { name: 'Chercher une date' }).click();

	// Navigate to a fixed, known month so the matched day is deterministic
	// regardless of the real current date.
	await picker.getByLabel('Année', { exact: true }).selectOption('2026');
	await picker.getByLabel('Mois', { exact: true }).selectOption('8');

	await picker.getByRole('button', { name: /2026$/ }).first().click();

	const picked = page.locator('.picked-card');
	await expect(picked.locator('article.feast')).toBeVisible();
	await expect(picked.getByRole('button', { name: 'Revenir à aujourd’hui' })).toBeVisible();

	// The calendar itself stays put and pickable, it never gets replaced by
	// the result.
	await expect(picker.getByLabel('Mois', { exact: true })).toBeVisible();
});

test('picking a second day updates the result in place, calendar still interactive', async ({
	page
}) => {
	await page.goto('/calendrier-liturgique');
	const picker = page.locator('.date-search');
	await picker.scrollIntoViewIfNeeded();
	await picker.getByRole('button', { name: 'Chercher une date' }).click();

	await picker.getByLabel('Année', { exact: true }).selectOption('2026');
	await picker.getByLabel('Mois', { exact: true }).selectOption('8');
	const matchedDays = picker.getByRole('button', { name: /2026$/ });

	await matchedDays.nth(0).click();
	const firstTitle = await page.locator('.picked-card .feast-title').textContent();

	await matchedDays.nth(1).click();
	const secondTitle = await page.locator('.picked-card .feast-title').textContent();

	expect(secondTitle).not.toBe(firstTitle);
});

test('Chercher une autre date returns the left column to TodayCard', async ({ page }) => {
	await page.goto('/calendrier-liturgique');
	const picker = page.locator('.date-search');
	await picker.scrollIntoViewIfNeeded();
	await picker.getByRole('button', { name: 'Chercher une date' }).click();

	await picker.getByLabel('Année', { exact: true }).selectOption('2026');
	await picker.getByLabel('Mois', { exact: true }).selectOption('8');
	await picker.getByRole('button', { name: /2026$/ }).first().click();
	await expect(page.locator('.picked-card')).toBeVisible();

	await page.locator('.picked-card').getByRole('button', { name: 'Revenir à aujourd’hui' }).click();
	await expect(page.locator('.picked-card')).toHaveCount(0);
	await expect(page.locator('.today-card')).toBeVisible();
});

test('month navigation is clamped at the dataset range start', async ({ page }) => {
	await page.goto('/calendrier-liturgique');
	const picker = page.locator('.date-search');
	await picker.scrollIntoViewIfNeeded();
	await picker.getByRole('button', { name: 'Chercher une date' }).click();

	await picker.getByLabel('Année', { exact: true }).selectOption('2000');
	await picker.getByLabel('Mois', { exact: true }).selectOption('1');

	await expect(picker.getByRole('button', { name: 'Mois précédent' })).toBeDisabled();
});
