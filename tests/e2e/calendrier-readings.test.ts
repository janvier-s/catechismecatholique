import { test, expect } from '@playwright/test';

test('expanding Lectures du jour shows the Mass reading text', async ({ page }) => {
	await page.goto('/calendrier/b');
	const feastHeading = page.getByRole('heading', { name: 'Premier Dimanche de l’Avent' });
	await feastHeading.scrollIntoViewIfNeeded();
	const feastArticle = page.locator('article.feast', { has: feastHeading });
	await feastArticle.getByRole('button', { name: 'Lectures du jour' }).click();
	await expect(feastArticle.getByText('Is 63, 16b-17.19b ; 64, 2b-7')).toBeVisible();
});

test('a known-gap feast shows the unavailable note instead of readings', async ({ page }) => {
	await page.goto('/calendrier/b');
	const feastHeading = page.getByRole('heading', { name: 'Second Dimanche après Noël' });
	await feastHeading.scrollIntoViewIfNeeded();
	const feastArticle = page.locator('article.feast', { has: feastHeading });
	await feastArticle.getByRole('button', { name: 'Lectures du jour' }).click();
	await expect(feastArticle.getByText('Lectures indisponibles pour cette fête.')).toBeVisible();
});
