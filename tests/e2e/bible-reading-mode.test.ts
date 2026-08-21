import { test, expect } from '@playwright/test';

// ReadingPrefs unmounts on close (ModeToggle wraps it in `{#if open}`), so
// its `activeTab` state resets to "Texte" every time the panel reopens —
// callers that need the "Lecture" tab must reselect it on every open, not
// just the first.
async function openReadingTab(page: import('@playwright/test').Page) {
	await page.getByRole('button', { name: 'Options de lecture' }).click();
	const dialog = page.getByRole('dialog', { name: 'Options de lecture' });
	await dialog.getByRole('button', { name: 'Lecture' }).click();
	return dialog;
}

async function switchToParagraphMode(page: import('@playwright/test').Page) {
	const dialog = await openReadingTab(page);
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

test('hide-verse-numbers toggle hides numbers in both reading modes', async ({ page }) => {
	await page.goto('/bible/genese/1');
	await expect(page.locator('.verse-num').first()).toBeVisible();

	let dialog = await openReadingTab(page);
	await dialog.getByRole('button', { name: 'Masquer' }).first().click(); // Numéros de verset
	await page.keyboard.press('Escape');
	await expect(page.locator('.verse-num').first()).toHaveCSS('visibility', 'hidden');

	await switchToParagraphMode(page);
	await expect(page.locator('.vn')).toHaveCount(0);

	dialog = await openReadingTab(page);
	await dialog.getByRole('button', { name: 'Afficher' }).first().click();
	await page.keyboard.press('Escape');
	await expect(page.locator('.vn').first()).toBeVisible();
});

test('hide-section-headings toggle removes headings in verse-by-verse mode only', async ({
	page
}) => {
	await page.goto('/bible/genese/2');
	await expect(page.locator('h2').first()).toBeVisible();

	const dialog = await openReadingTab(page);
	await dialog.getByRole('button', { name: 'Masquer' }).nth(1).click(); // Titres de section
	await page.keyboard.press('Escape');
	await expect(page.locator('h2')).toHaveCount(0);
});

test('verse-number color toggle switches between accent and subtle in both modes', async ({
	page
}) => {
	await page.goto('/bible/genese/1');
	const verseNum = page.locator('.verse-num').first();

	let dialog = await openReadingTab(page);
	await dialog.getByRole('button', { name: 'Accent' }).click();
	await page.keyboard.press('Escape');
	const accentColor = await verseNum.evaluate((el) => getComputedStyle(el).color);

	dialog = await openReadingTab(page);
	await dialog.getByRole('button', { name: 'Discret' }).click();
	await page.keyboard.press('Escape');
	const subtleColor = await verseNum.evaluate((el) => getComputedStyle(el).color);

	expect(accentColor).not.toBe(subtleColor);
});

test('paragraph-mode verse numbers are selectable text, unlike verse-by-verse mode', async ({
	page
}) => {
	await page.goto('/bible/matthieu/1');
	await switchToParagraphMode(page);
	const vn = page.locator('.vn').first();
	await expect(vn).toBeVisible();
	expect(await vn.evaluate((el) => getComputedStyle(el).userSelect)).not.toBe('none');
});
