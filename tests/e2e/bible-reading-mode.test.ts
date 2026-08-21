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

async function openNotesTab(page: import('@playwright/test').Page) {
	await page.getByRole('button', { name: 'Options de lecture' }).click();
	const dialog = page.getByRole('dialog', { name: 'Options de lecture' });
	await dialog.getByRole('button', { name: 'Notes' }).click();
	return dialog;
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

test("options panel shows only the current page's corpus group, not both", async ({ page }) => {
	await page.goto('/bible/genese/1');
	let dialog = await openReadingTab(page);
	await expect(dialog.getByText('Mode de lecture')).toBeVisible();
	await expect(dialog.getByText('Renvois (§)')).toHaveCount(0);

	await page.goto('/cec/27');
	dialog = await openReadingTab(page);
	await expect(dialog.getByText('Renvois (§)')).toBeVisible();
	await expect(dialog.getByText('Mode de lecture')).toHaveCount(0);
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

test('hide-section-headings toggle removes headings in verse-by-verse mode', async ({ page }) => {
	await page.goto('/bible/genese/2');
	await expect(page.locator('h2').first()).toBeVisible();

	const dialog = await openReadingTab(page);
	await dialog.getByRole('button', { name: 'Masquer' }).nth(1).click(); // Titres de section
	await page.keyboard.press('Escape');
	await expect(page.locator('h2')).toHaveCount(0);
});

test('paragraph mode renders section headings, and hide-section-headings removes them there too', async ({
	page
}) => {
	await page.goto('/bible/genese/1');
	await switchToParagraphMode(page);

	// Genesis 1 opens with a major heading ("LES ORIGINES") followed by a
	// section heading ("Création du monde"), both anchored at verse 1 —
	// verse mode already renders these; paragraph mode must too.
	await expect(page.locator('.bible-paragraphs h2').first()).toBeVisible();
	await expect(
		page.locator('.bible-paragraphs h2', { hasText: 'Création du monde' })
	).toBeVisible();

	const dialog = await openReadingTab(page);
	await dialog.getByRole('button', { name: 'Masquer' }).nth(1).click(); // Titres de section
	await page.keyboard.press('Escape');
	await expect(page.locator('.bible-paragraphs h2')).toHaveCount(0);
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

test('Notes tab shows an empty-state message instead of a dead "Masquer toutes les notes" control on Bible pages', async ({
	page
}) => {
	await page.goto('/bible/genese/1');
	const dialog = await openNotesTab(page);
	await expect(dialog.getByText('Masquer toutes les notes')).toHaveCount(0);
	await expect(dialog.getByText(/ne contient pas de notes/)).toBeVisible();
});

test('section and subsection headings are centered, in both reading modes', async ({ page }) => {
	// Genesis 2 has a section-level heading ("Création de l'homme et de la
	// femme"); Leviticus 27 has a subsection-level one (the numbered outline
	// notes). Major headings were already centered — section/subsection
	// weren't.
	await page.goto('/bible/genese/2');
	await expect(page.locator('h2').first()).toHaveCSS('text-align', 'center');

	await switchToParagraphMode(page);
	await page.goto('/bible/genese/2');
	await expect(page.locator('.bible-paragraphs h2').first()).toHaveCSS('text-align', 'center');

	await page.goto('/bible/levitique/27');
	const subsection = page.locator('p.italic.text-subtle').first();
	await expect(subsection).toHaveCSS('text-align', 'center');
});

test('Bible reader uses its own column widths (600/750/920), not the shared CEC/Trent ones', async ({
	page
}) => {
	await page.goto('/bible/genese/1');
	const main = page.locator('main.max-w-reader');

	const widths: Record<string, string> = {
		Étroite: '600px',
		Standard: '750px',
		Large: '920px'
	};
	for (const [label, px] of Object.entries(widths)) {
		const dialog = await openReadingTab(page);
		await dialog.getByRole('button', { name: label }).click();
		await page.keyboard.press('Escape');
		await expect(main).toHaveCSS('max-width', px);
	}
});
