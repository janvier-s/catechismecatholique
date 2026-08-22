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

test('show-section-headings toggle reveals headings in verse-by-verse mode (hidden by default)', async ({
	page
}) => {
	await page.goto('/bible/genese/2');
	await expect(page.locator('h2')).toHaveCount(0);

	let dialog = await openReadingTab(page);
	await dialog.getByRole('button', { name: 'Afficher' }).nth(1).click(); // Titres de section
	await page.keyboard.press('Escape');
	await expect(page.locator('h2').first()).toBeVisible();

	dialog = await openReadingTab(page);
	await dialog.getByRole('button', { name: 'Masquer' }).nth(1).click();
	await page.keyboard.press('Escape');
	await expect(page.locator('h2')).toHaveCount(0);
});

test('paragraph mode renders section headings once shown (hidden by default, like verse mode)', async ({
	page
}) => {
	await page.goto('/bible/genese/1');
	await switchToParagraphMode(page);
	await expect(page.locator('.bible-paragraphs h2')).toHaveCount(0);

	const dialog = await openReadingTab(page);
	await dialog.getByRole('button', { name: 'Afficher' }).nth(1).click(); // Titres de section
	await page.keyboard.press('Escape');

	// Genesis 1 opens with a major heading ("LES ORIGINES") followed by a
	// section heading ("Création du monde"), both anchored at verse 1 —
	// verse mode already renders these; paragraph mode must too.
	await expect(page.locator('.bible-paragraphs h2').first()).toBeVisible();
	await expect(
		page.locator('.bible-paragraphs h2', { hasText: 'Création du monde' })
	).toBeVisible();
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
	// weren't. Headings are hidden by default, so show them first.
	await page.goto('/bible/genese/2');
	let dialog = await openReadingTab(page);
	await dialog.getByRole('button', { name: 'Afficher' }).nth(1).click(); // Titres de section
	await page.keyboard.press('Escape');
	await expect(page.locator('h2').first()).toHaveCSS('text-align', 'center');

	await switchToParagraphMode(page);
	await page.goto('/bible/genese/2');
	dialog = await openReadingTab(page);
	await dialog.getByRole('button', { name: 'Afficher' }).nth(1).click();
	await page.keyboard.press('Escape');
	await expect(page.locator('.bible-paragraphs h2').first()).toHaveCSS('text-align', 'center');

	await page.goto('/bible/levitique/27');
	dialog = await openReadingTab(page);
	await dialog.getByRole('button', { name: 'Afficher' }).nth(1).click();
	await page.keyboard.press('Escape');
	const subsection = page.locator('p.italic.text-subtle').first();
	await expect(subsection).toHaveCSS('text-align', 'center');
});

test('Bible reader uses its own column widths (600/750/920), not the shared CEC/Trent ones', async ({
	page
}) => {
	// Paragraph mode has no verse-number gutter or citation-count sidebar,
	// so <main> hits the preset value directly with no compensation —
	// verse mode's compensated <main> is covered separately below, since
	// asserting on <main> there would only be testing the compensation
	// math, not the actual column-width feature.
	await page.goto('/bible/genese/1');
	await switchToParagraphMode(page);
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

test("the actual verse paragraph matches paragraph mode's width, not a narrower gutter-squeezed one", async ({
	page
}) => {
	// Genesis 1 has cited verses, so the verse-number gutter and (in study
	// mode, the default) the citation-count sidebar both sit inside
	// <main>, eating into the space available to .verse-text — <main>
	// landing on 750px doesn't mean the paragraph itself does. The correct
	// target is 702px: main's 750px minus the 48px outer page padding
	// (px-6) every reader on the site has — the same width paragraph
	// mode's own .bible-prose gets for the same "Standard" setting, not a
	// further verse-mode-specific penalty on top of it.
	await page.goto('/bible/genese/1');
	const verseText = page.locator('.verse-text').first();
	await expect(verseText).toHaveCSS('width', '702px');

	// Non-study mode drops the citation-count sidebar but keeps the
	// verse-number gutter — same target, smaller compensation needed.
	await page.getByRole('button', { name: 'Lecture', exact: true }).click();
	await expect(verseText).toHaveCSS('width', '702px');
});

test('the width fix holds at every column-width preset (600/750/920), not just Standard', async ({
	page
}) => {
	await page.goto('/bible/genese/1');
	const verseText = page.locator('.verse-text').first();

	const targets: Record<string, string> = {
		Étroite: '552px', // 600 - 48
		Large: '872px' // 920 - 48
	};
	for (const [label, px] of Object.entries(targets)) {
		const dialog = await openReadingTab(page);
		await dialog.getByRole('button', { name: label }).click();
		await page.keyboard.press('Escape');
		await expect(verseText).toHaveCSS('width', px);
	}
});

test('verse-number font-weight matches (200) in both reading modes', async ({ page }) => {
	await page.goto('/bible/genese/1');
	await expect(page.locator('.verse-num').first()).toHaveCSS('font-weight', '200');

	await switchToParagraphMode(page);
	await expect(page.locator('.vn').first()).toHaveCSS('font-weight', '200');
});

test('section headings are hidden by default, in both reading modes', async ({ page }) => {
	await page.goto('/bible/genese/2');
	await expect(page.locator('h2')).toHaveCount(0);

	await switchToParagraphMode(page);
	await expect(page.locator('.bible-paragraphs h2')).toHaveCount(0);
});

test('TopBar is slim and the chapter nav sits flush beneath it', async ({ page }) => {
	await page.goto('/bible/genese/1');

	const topbar = page.locator('header.topbar');
	await expect(topbar).toHaveCSS('height', '52px');

	// The chapter nav is sticky at --topbar-height. If the variable and the
	// real bar height ever disagree, the two overlap or leave a gap.
	const topbarBox = await topbar.boundingBox();
	const navBox = await page.locator('.bible-chapter-nav').boundingBox();
	expect(topbarBox).not.toBeNull();
	expect(navBox).not.toBeNull();
	expect(navBox!.y).toBeCloseTo(topbarBox!.y + topbarBox!.height, 0);
});

test('--topbar-height has a single source of truth that matches the rendered bar', async ({
	page
}) => {
	await page.goto('/bible/genese/1');
	const declared = await page.evaluate(() =>
		getComputedStyle(document.documentElement).getPropertyValue('--topbar-height').trim()
	);
	expect(declared).toBe('52px');

	// No inline override left on <html> from the old imperative sync.
	const inline = await page.evaluate(() =>
		document.documentElement.style.getPropertyValue('--topbar-height')
	);
	expect(inline).toBe('');
});

test('chapter header shows a book eyebrow and is left-aligned', async ({ page }) => {
	await page.goto('/bible/genese/1');

	// The eyebrow carries the book name. Uppercasing is presentational, so the
	// accessible text stays in normal case.
	const eyebrow = page.locator('.chapter-eyebrow');
	await expect(eyebrow).toHaveText('Genèse');
	await expect(eyebrow).toHaveCSS('text-transform', 'uppercase');

	// Header block is flush left, unlike the section headings inside the
	// chapter, which stay centered by an earlier deliberate decision.
	// "start" is the initial value and resolves to left in LTR; the point is
	// that the old text-center is gone. The x-offset check below proves it.
	await expect(page.locator('h1')).toHaveCSS('text-align', /^(left|start)$/);

	const h1Box = await page.locator('h1').boundingBox();
	const eyebrowBox = await eyebrow.boundingBox();
	expect(h1Box!.x).toBeCloseTo(eyebrowBox!.x, 0);
});

test('Lecture/Étude lives in the chapter nav row and persists across navigation', async ({
	page
}) => {
	await page.goto('/bible/genese/1');

	const toggle = page.locator('.bible-chapter-nav .mode-pill');
	await expect(toggle).toBeVisible();

	await toggle.getByRole('button', { name: 'Lecture' }).click();
	const stored = await page.evaluate(() =>
		JSON.parse(localStorage.getItem('catechismecatholique.prefs') ?? '{}')
	);
	expect(stored.bibleStudyMode).toBe(false);

	// Survives a chapter navigation, unlike the old per-chapter local state.
	await page.goto('/bible/genese/2');
	await expect(page.locator('main[data-corpus="bible"]')).toHaveAttribute(
		'data-study-mode',
		'false'
	);

	await page.reload();
	await expect(page.locator('main[data-corpus="bible"]')).toHaveAttribute(
		'data-study-mode',
		'false'
	);
});

test('the toggle is disabled rather than removed when a chapter has no citations', async ({
	page
}) => {
	// Nombres 2 has no Catechism citations (30 of Numbers' 36 chapters have
	// none). If it ever gains one, Nombres 3, 4, 5, 6 and 8 are also empty.
	await page.goto('/bible/nombres/2');
	const toggle = page.locator('.bible-chapter-nav .mode-pill');
	await expect(toggle).toBeVisible();
	await expect(toggle.getByRole('button', { name: 'Étude' })).toBeDisabled();
});

test('the toggle is disabled in paragraph mode, where there is no citation sidebar', async ({
	page
}) => {
	await page.goto('/bible/genese/1');
	await switchToParagraphMode(page);
	const toggle = page.locator('.bible-chapter-nav .mode-pill');
	await expect(toggle).toBeVisible();
	await expect(toggle.getByRole('button', { name: 'Étude' })).toBeDisabled();
});

test('the in-page filter bar above the text is gone', async ({ page }) => {
	await page.goto('/bible/genese/1');
	await expect(page.locator('main .mode-pill')).toHaveCount(0);
});

test('both bars hide on scroll down and return on scroll up', async ({ page }) => {
	await page.goto('/bible/genese/1');
	const topbar = page.locator('header.topbar');
	const nav = page.locator('.bible-chapter-nav');

	const topAtRest = (await topbar.boundingBox())!.y;

	// Past HIDE_AFTER (100px), scrolling down hides both.
	await page.evaluate(() => window.scrollTo(0, 600));
	await expect(page.locator('html')).toHaveAttribute('data-chrome-hidden', 'true');
	await expect.poll(async () => (await topbar.boundingBox())!.y).toBeLessThan(topAtRest);
	expect((await nav.boundingBox())!.y).toBeLessThan(topAtRest);

	// A short scroll up is not enough: REVEAL_AFTER_UP is 120px cumulative.
	await page.evaluate(() => window.scrollTo(0, 550));
	await expect(page.locator('html')).toHaveAttribute('data-chrome-hidden', 'true');

	// Crossing the threshold brings them back.
	await page.evaluate(() => window.scrollTo(0, 470));
	await expect(page.locator('html')).toHaveAttribute('data-chrome-hidden', 'false');
	await expect.poll(async () => (await topbar.boundingBox())!.y).toBe(topAtRest);
});

test('the bars stay put while the reading-options popover is open', async ({ page }) => {
	await page.goto('/bible/genese/1');

	// Open the popover while the bars are still visible. A hidden bar is
	// translated off-screen, so its trigger is genuinely unclickable then;
	// the suspender exists to keep an *already open* panel anchored.
	await page.getByRole('button', { name: 'Options de lecture' }).click();
	await expect(page.getByRole('dialog', { name: 'Options de lecture' })).toBeVisible();

	// Scrolling well past HIDE_AFTER must not tuck the header away and leave
	// the panel hanging over a gap.
	await page.evaluate(() => window.scrollTo(0, 1200));
	await expect(page.locator('html')).toHaveAttribute('data-chrome-hidden', 'false');

	// Once it closes, normal hide-on-scroll resumes.
	await page.keyboard.press('Escape');
	await page.evaluate(() => window.scrollTo(0, 400));
	await page.evaluate(() => window.scrollTo(0, 1400));
	await expect(page.locator('html')).toHaveAttribute('data-chrome-hidden', 'true');
});
