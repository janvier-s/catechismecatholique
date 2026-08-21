import { test, expect } from '@playwright/test';

async function switchToParagraphMode(page: import('@playwright/test').Page) {
	await page.getByLabel('Options de lecture').click();
	const dialog = page.getByRole('dialog', { name: 'Options de lecture' });
	await dialog.getByRole('button', { name: 'Lecture' }).click();
	await dialog.getByRole('button', { name: 'Paragraphe' }).click();
	await page.keyboard.press('Escape');
}

test('Bible reading-mode toggle switches and persists', async ({ page }) => {
	await page.goto('/bible/matthieu/1');
	await page.getByLabel('Options de lecture').click();
	const dialog = page.getByRole('dialog', { name: 'Options de lecture' });
	await dialog.getByRole('button', { name: 'Lecture' }).click();
	await dialog.getByRole('button', { name: 'Paragraphe' }).click();
	await dialog.getByRole('button', { name: 'Verset par verset' }).click();

	const stored = await page.evaluate(() =>
		JSON.parse(localStorage.getItem('catechismecatholique.prefs') ?? '{}')
	);
	expect(stored.bibleLayout).toBe('verse');

	await dialog.getByRole('button', { name: 'Paragraphe' }).click();
	await page.reload();
	const afterReload = await page.evaluate(() =>
		JSON.parse(localStorage.getItem('catechismecatholique.prefs') ?? '{}')
	);
	expect(afterReload.bibleLayout).toBe('paragraph');
});

test('reading-mode toggle is absent outside Bible routes', async ({ page }) => {
	await page.goto('/cec/27');
	await page.getByLabel('Options de lecture').click();
	const dialog = page.getByRole('dialog', { name: 'Options de lecture' });
	await dialog.getByRole('button', { name: 'Lecture' }).click();
	await expect(dialog.getByRole('button', { name: 'Paragraphe' })).toHaveCount(0);
});

test('paragraph mode renders prose as merged paragraphs and poetry as indented lines', async ({
	page
}) => {
	await page.goto('/bible/matthieu/1');
	await switchToParagraphMode(page);

	// Matthew 1's first paragraph break is at verse 6 (per the original
	// USFM investigation: \p markers at v1, v6, v12, v18) — verses 1-5
	// should be merged into one <p>, not one row each.
	const firstParagraph = page.locator('.bible-prose').first();
	await expect(firstParagraph).toContainText('1');
	await expect(firstParagraph).toContainText('5');
	await expect(page.locator('li#v1')).toHaveCount(0);

	await page.goto('/bible/psaumes/2');
	await switchToParagraphMode(page);
	await expect(page.locator('.bible-poetry-line').first()).toBeVisible();
});
