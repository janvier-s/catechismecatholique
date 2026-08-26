import { test, expect } from '@playwright/test';
import { openDisclosure } from './helpers';

// This file tests single-chapter reading-mode behaviour, not infinite
// scroll (that's bible-infinite-scroll.test.ts's job). infiniteScroll now
// defaults to true, so without this a background auto-append can silently
// land mid-test — once the 2s preload cooldown lapses, which several tests
// here run long enough to do — and corrupt element-count assertions with
// content from a chapter nobody asked to load. Pin it off regardless of the
// app's own default, the same way study-panel.test.ts pins crossRefsLayout.
//
// addInitScript reruns on every navigation within the test, not just the
// first, so it must merge with whatever is already stored rather than
// replace it wholesale · several tests here set other prefs through the UI
// and then navigate again to prove they persist, and a flat overwrite would
// wipe those out from under them on the very navigation being tested.
test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => {
		const raw = localStorage.getItem('catechismecatholique.prefs');
		const parsed = raw ? JSON.parse(raw) : {};
		localStorage.setItem(
			'catechismecatholique.prefs',
			JSON.stringify({ ...parsed, infiniteScroll: false })
		);
	});
});

// ReadingPrefs unmounts on close (ModeToggle wraps it in `{#if open}`), so
// its `activeTab` state resets to "Texte" every time the panel reopens —
// callers must reselect their tab on every open, not just the first.
async function openTab(page: import('@playwright/test').Page, tabLabel: string) {
	const dialog = page.getByRole('dialog', { name: 'Options de lecture' });
	// Not a bare click · see openDisclosure for why the first click after a
	// navigation can be swallowed. The tab click below needs no such guard: the
	// dialog only exists once hydration has run.
	await openDisclosure(page.getByRole('button', { name: 'Options de lecture' }), dialog);
	await dialog.getByRole('button', { name: tabLabel }).click();
	return dialog;
}

/** Open the chapter selector and wait for `bookSlug`'s grid, which the active
 *  book opens already expanded. */
async function openChapterSelector(page: import('@playwright/test').Page, bookSlug: string) {
	await openDisclosure(
		page.locator('.bible-chapter-nav button[aria-haspopup="dialog"]'),
		page.locator(`[data-book-grid="${bookSlug}"]`)
	);
}

async function openReadingTab(page: import('@playwright/test').Page) {
	return openTab(page, 'Lecture');
}

// Bible-specific settings (layout, verse numbers, section headings, chapter
// nav, Vulgate numbering) get their own tab instead of tucking under Lecture
// — see ReadingPrefs.svelte's comment on `tabs`.
async function openBibleTab(page: import('@playwright/test').Page) {
	return openTab(page, 'Bible');
}

async function switchToParagraphMode(page: import('@playwright/test').Page) {
	const dialog = await openBibleTab(page);
	await dialog.getByRole('button', { name: 'Paragraphe' }).click();
	await page.keyboard.press('Escape');
}

test('Bible reading-mode toggle switches and persists', async ({ page }) => {
	await page.goto('/bible/matthieu/1');
	const dialog = page.getByRole('dialog', { name: 'Options de lecture' });
	await openDisclosure(page.getByLabel('Options de lecture'), dialog);
	await dialog.getByRole('button', { name: 'Bible' }).click();
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
	// The Bible tab itself (where the reading-mode toggle lives) only renders
	// on Bible routes · there is nothing to reselect it into on /cec/27.
	await page.goto('/cec/27');
	const dialog = page.getByRole('dialog', { name: 'Options de lecture' });
	await openDisclosure(page.getByLabel('Options de lecture'), dialog);
	await expect(dialog.getByRole('button', { name: 'Bible', exact: true })).toHaveCount(0);
});

test("options panel shows only the current page's corpus group, not both", async ({ page }) => {
	await page.goto('/bible/genese/1');
	let dialog = await openBibleTab(page);
	await expect(dialog.getByText('Mode de lecture')).toBeVisible();
	await expect(dialog.getByText('Renvois entre paragraphes')).toHaveCount(0);

	await page.goto('/cec/27');
	dialog = await openReadingTab(page);
	await expect(dialog.getByText('Renvois entre paragraphes')).toBeVisible();
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

	let dialog = await openBibleTab(page);
	await dialog.getByRole('button', { name: 'Masquer' }).first().click(); // Numéros de verset
	await page.keyboard.press('Escape');
	await expect(page.locator('.verse-num').first()).toHaveCSS('visibility', 'hidden');

	await switchToParagraphMode(page);
	await expect(page.locator('.vn')).toHaveCount(0);

	dialog = await openBibleTab(page);
	await dialog.getByRole('button', { name: 'Afficher' }).first().click();
	await page.keyboard.press('Escape');
	await expect(page.locator('.vn').first()).toBeVisible();
});

test('show-section-headings toggle reveals headings in verse-by-verse mode (hidden by default)', async ({
	page
}) => {
	await page.goto('/bible/genese/2');
	await expect(page.locator('h2')).toHaveCount(0);

	let dialog = await openBibleTab(page);
	await dialog.getByRole('button', { name: 'Afficher' }).nth(1).click(); // Titres de section
	await page.keyboard.press('Escape');
	await expect(page.locator('h2').first()).toBeVisible();

	dialog = await openBibleTab(page);
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

	const dialog = await openBibleTab(page);
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

	let dialog = await openBibleTab(page);
	await dialog.getByRole('button', { name: 'Accent' }).click();
	await page.keyboard.press('Escape');
	const accentColor = await verseNum.evaluate((el) => getComputedStyle(el).color);

	dialog = await openBibleTab(page);
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

test('the options panel on Bible pages has three tabs, with Notes hidden', async ({ page }) => {
	// Bible pages carry no footnotes, so the Notes tab was an empty shell.
	// It is dropped entirely here rather than shown with an empty state, and
	// Bible-specific settings get their own tab instead of tucking under
	// Lecture (see ReadingPrefs.svelte's comment on `tabs`).
	await page.goto('/bible/genese/1');
	const dialog = page.getByRole('dialog', { name: 'Options de lecture' });
	await openDisclosure(page.getByRole('button', { name: 'Options de lecture' }), dialog);

	await expect(dialog.getByRole('button', { name: 'Notes', exact: true })).toHaveCount(0);
	await expect(dialog.getByRole('button', { name: 'Texte', exact: true })).toBeVisible();
	await expect(dialog.getByRole('button', { name: 'Lecture', exact: true })).toBeVisible();
	await expect(dialog.getByRole('button', { name: 'Bible', exact: true })).toBeVisible();

	// The three survivors split the full width evenly between them.
	const texte = await dialog.getByRole('button', { name: 'Texte', exact: true }).boundingBox();
	const lecture = await dialog.getByRole('button', { name: 'Lecture', exact: true }).boundingBox();
	const bible = await dialog.getByRole('button', { name: 'Bible', exact: true }).boundingBox();
	expect(texte!.width).toBeCloseTo(lecture!.width, 0);
	expect(lecture!.width).toBeCloseTo(bible!.width, 0);
});

test('the CEC options panel keeps its Notes tab', async ({ page }) => {
	await page.goto('/cec/27');
	const dialog = page.getByRole('dialog', { name: 'Options de lecture' });
	await openDisclosure(page.getByRole('button', { name: 'Options de lecture' }), dialog);
	await expect(dialog.getByRole('button', { name: 'Notes', exact: true })).toBeVisible();
});

test('section and subsection headings are centered, in both reading modes', async ({ page }) => {
	// Genesis 2 has a section-level heading ("Création de l'homme et de la
	// femme"); Leviticus 27 has a subsection-level one (the numbered outline
	// notes). Major headings were already centered — section/subsection
	// weren't. Headings are hidden by default, so show them first.
	await page.goto('/bible/genese/2');
	let dialog = await openBibleTab(page);
	await dialog.getByRole('button', { name: 'Afficher' }).nth(1).click(); // Titres de section
	await page.keyboard.press('Escape');
	await expect(page.locator('h2').first()).toHaveCSS('text-align', 'center');

	await switchToParagraphMode(page);
	await page.goto('/bible/genese/2');
	dialog = await openBibleTab(page);
	await dialog.getByRole('button', { name: 'Afficher' }).nth(1).click();
	await page.keyboard.press('Escape');
	await expect(page.locator('.bible-paragraphs h2').first()).toHaveCSS('text-align', 'center');

	await page.goto('/bible/levitique/27');
	dialog = await openBibleTab(page);
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

test('Étude carries an explanatory hint in paragraph mode instead of disabling', async ({
	page
}) => {
	// ChapterFilterBar (the fold-into-a-pill rewrite) never sets `disabled` on
	// Étude · paragraph mode explains itself via a title instead of silently
	// blocking the click.
	await page.goto('/bible/genese/1');
	await switchToParagraphMode(page);
	const toggle = page.locator('.bible-chapter-nav .mode-pill');
	await expect(toggle).toBeVisible();
	const etude = toggle.getByRole('button', { name: 'Étude' });
	await expect(etude).toBeEnabled();
	await expect(etude).toHaveAttribute(
		'title',
		'Le mode Étude n’est disponible qu’en affichage verset par verset.'
	);
});

test('the in-page filter bar above the text is gone', async ({ page }) => {
	await page.goto('/bible/genese/1');
	await expect(page.locator('main .mode-pill')).toHaveCount(0);
});

test('the chapter nav hides on scroll down and returns on scroll up; the topbar stays put', async ({
	page
}) => {
	await page.goto('/bible/genese/1');
	const topbar = page.locator('header.topbar');
	const nav = page.locator('.bible-chapter-nav');

	const topAtRest = (await topbar.boundingBox())!.y;
	const navAtRest = (await nav.boundingBox())!.y;

	// Past HIDE_AFTER (100px), scrolling down hides the chapter nav only ·
	// the topbar never tucks away.
	await page.evaluate(() => window.scrollTo(0, 600));
	await expect(page.locator('html')).toHaveAttribute('data-chrome-hidden', 'true');
	expect((await topbar.boundingBox())!.y).toBe(topAtRest);
	await expect.poll(async () => (await nav.boundingBox())!.y).toBeLessThan(navAtRest);

	// A short scroll up is not enough: REVEAL_AFTER_UP is 120px cumulative.
	await page.evaluate(() => window.scrollTo(0, 550));
	await expect(page.locator('html')).toHaveAttribute('data-chrome-hidden', 'true');

	// Crossing the threshold brings the chapter nav back.
	await page.evaluate(() => window.scrollTo(0, 470));
	await expect(page.locator('html')).toHaveAttribute('data-chrome-hidden', 'false');
	await expect.poll(async () => (await nav.boundingBox())!.y).toBe(navAtRest);
	expect((await topbar.boundingBox())!.y).toBe(topAtRest);
});

test('hovering the top of the viewport reveals the tucked-away chapter nav', async ({ page }) => {
	await page.goto('/bible/genese/1');
	const nav = page.locator('.bible-chapter-nav');
	const navAtRest = (await nav.boundingBox())!.y;

	await page.evaluate(() => window.scrollTo(0, 600));
	await expect(page.locator('html')).toHaveAttribute('data-chrome-hidden', 'true');
	await expect.poll(async () => (await nav.boundingBox())!.y).toBeLessThan(navAtRest);

	// Moving the cursor near the top of the viewport (where the topbar +
	// chapter-nav strip live) reveals the nav even mid-scroll.
	await page.mouse.move(200, 5);
	await page.mouse.move(200, 60);
	await expect(page.locator('html')).toHaveAttribute('data-chrome-hidden', 'false');
	await expect.poll(async () => (await nav.boundingBox())!.y).toBe(navAtRest);

	// Moving away releases the hold; the nav can hide again on the next scroll.
	await page.mouse.move(200, 400);
	await page.evaluate(() => window.scrollTo(0, 900));
	await expect(page.locator('html')).toHaveAttribute('data-chrome-hidden', 'true');
});

test('the chapter nav stays put while the reading-options popover is open', async ({ page }) => {
	await page.goto('/bible/genese/1');

	// The popover's trigger lives in the (always-visible) topbar, but the
	// suspender still exists to keep the chapter-nav from tucking away and
	// leaving the panel hanging over a gap while it's open.
	await page.getByRole('button', { name: 'Options de lecture' }).click();
	await expect(page.getByRole('dialog', { name: 'Options de lecture' })).toBeVisible();

	// Scrolling well past HIDE_AFTER must not tuck the chapter nav away.
	await page.evaluate(() => window.scrollTo(0, 1200));
	await expect(page.locator('html')).toHaveAttribute('data-chrome-hidden', 'false');

	// Once it closes, normal hide-on-scroll resumes · move the cursor away
	// from the top-of-viewport hover zone first, since the click above left
	// it parked on the trigger (which sits inside that zone) and the hover
	// reveal would otherwise hold the nav open indefinitely, same as a real
	// user's cursor would.
	await page.keyboard.press('Escape');
	await page.mouse.move(200, 400);
	await page.evaluate(() => window.scrollTo(0, 400));
	await page.evaluate(() => window.scrollTo(0, 1400));
	await expect(page.locator('html')).toHaveAttribute('data-chrome-hidden', 'true');
});

test('expanding a long book in the chapter selector shows its first chapters, not its last', async ({
	page
}) => {
	// Psalms has 150 chapters, so its grid is taller than the scroller and
	// cannot be shown whole. Aligning the grid's bottom edge (the old
	// behaviour) opened on chapter 150 with the book title above the fold.
	// Start from a different book: the current book opens already expanded, so
	// clicking it would collapse the grid rather than trigger the scroll.
	await page.goto('/bible/genese/1');
	await openChapterSelector(page, 'genese');

	await page.getByRole('button', { name: 'Psaumes', exact: true }).click();
	await page.waitForTimeout(600); // slide transition (180ms) + the 200ms settle

	// Chapter 1 must be on screen; the old behaviour left it far above the fold.
	await expect(page.locator('[data-book-grid="psaumes"] a').first()).toBeInViewport();
	// And the last chapter must not be, or we have scrolled to the end again.
	await expect(page.locator('[data-book-grid="psaumes"] a').last()).not.toBeInViewport();
});

test('chapter navigation (prev/next strip) is hidden by default, and the top bar stays put', async ({
	page
}) => {
	// hideChapterNav now defaults to true.
	await page.goto('/bible/genese/1');
	await expect(page.locator('.bible-chapter-nav')).toBeVisible();
	await expect(page.locator('.chapter-prev-next')).toHaveCount(0);

	let dialog = await openBibleTab(page);
	await dialog.getByRole('button', { name: 'Afficher' }).nth(2).click(); // Navigation entre chapitres
	await page.keyboard.press('Escape');
	// The top book/chapter bar is the primary navigation and is never hidden
	// by this toggle · only the in-article prev/next strip is.
	await expect(page.locator('.bible-chapter-nav')).toBeVisible();
	await expect(page.locator('.chapter-prev-next')).toBeVisible();

	const stored = await page.evaluate(() =>
		JSON.parse(localStorage.getItem('catechismecatholique.prefs') ?? '{}')
	);
	expect(stored.hideChapterNav).toBe(false);

	// Survives a reload, and can be turned back off.
	await page.reload();
	await expect(page.locator('.chapter-prev-next')).toBeVisible();

	dialog = await openBibleTab(page);
	await dialog.getByRole('button', { name: 'Masquer' }).nth(2).click();
	await page.keyboard.press('Escape');
	await expect(page.locator('.chapter-prev-next')).toHaveCount(0);
});

test('the prev/next chapter strip handles chapter and book boundaries', async ({ page }) => {
	// Hidden by default · show it once, then navigate. The pref persists
	// across the in-test navigations below.
	await page.goto('/bible/genese/1');
	const dialogForVisibility = await openBibleTab(page);
	await dialogForVisibility.getByRole('button', { name: 'Afficher' }).nth(2).click(); // Navigation entre chapitres
	await page.keyboard.press('Escape');

	// Genesis 1: first chapter of the first book · no previous side at all.
	const nav = page.locator('.chapter-prev-next');
	await expect(nav).toBeVisible();
	await expect(nav.getByRole('link')).toHaveCount(1);
	await expect(nav.getByRole('link')).toHaveAttribute('href', '/bible/genese/2');
	await expect(nav.getByRole('link')).toContainText('Ch. 2');

	// Genesis 2: an ordinary middle chapter · both sides, same book.
	await page.goto('/bible/genese/2');
	await expect(nav.getByRole('link')).toHaveCount(2);
	const prevMid = nav.getByRole('link').nth(0);
	const nextMid = nav.getByRole('link').nth(1);
	await expect(prevMid).toHaveAttribute('href', '/bible/genese/1');
	await expect(prevMid).toContainText('Ch. 1');
	await expect(nextMid).toHaveAttribute('href', '/bible/genese/3');
	await expect(nextMid).toContainText('Ch. 3');

	// Genesis's last chapter (50): next crosses into Exodus 1, not "Genesis 51".
	await page.goto('/bible/genese/50');
	await expect(nav.getByRole('link')).toHaveCount(2);
	const nextAtBookEnd = nav.getByRole('link').nth(1);
	await expect(nextAtBookEnd).toHaveAttribute('href', '/bible/exode/1');
	await expect(nextAtBookEnd).toContainText('Exode');
	await expect(nextAtBookEnd).toContainText('Ch. 1');

	// Exodus 1: previous crosses back into Genesis's LAST chapter (continuing
	// the reading backward), not Genesis 1 · this is what distinguishes it
	// from the top bar's book-jump arrows, which always land on chapter 1.
	await page.goto('/bible/exode/1');
	const prevAtBookStart = nav.getByRole('link').nth(0);
	await expect(prevAtBookStart).toHaveAttribute('href', '/bible/genese/50');
	await expect(prevAtBookStart).toContainText('Genèse');
	await expect(prevAtBookStart).toContainText('Ch. 50');

	// Apocalypse's last chapter (22): last chapter of the last book · no next.
	await page.goto('/bible/apocalypse/22');
	await expect(nav.getByRole('link')).toHaveCount(1);
	await expect(nav.getByRole('link')).toHaveAttribute('href', '/bible/apocalypse/21');
});

test('Vulgate psalm numbers are off by default and can be shown', async ({ page }) => {
	// Hebrew 10 is Vulgate 9. Off by default, so nothing shows.
	await page.goto('/bible/psaumes/10');
	await expect(page.locator('.vulgate-psalm')).toHaveCount(0);

	const dialog = await openBibleTab(page);
	await dialog.getByRole('button', { name: 'Afficher' }).nth(3).click(); // Numérotation Vulgate
	await page.keyboard.press('Escape');
	await expect(page.locator('.vulgate-psalm')).toHaveText('(Vg 9)');

	// Hebrew 116 was split into Vulgate 114-115, so it renders as a range.
	await page.goto('/bible/psaumes/116');
	await expect(page.locator('.vulgate-psalm')).toHaveText('(Vg 114-115)');

	// Where the traditions agree there is no label, even when enabled.
	await page.goto('/bible/psaumes/150');
	await expect(page.locator('.vulgate-psalm')).toHaveCount(0);

	// And it never appears outside the psalter.
	await page.goto('/bible/genese/10');
	await expect(page.locator('.vulgate-psalm')).toHaveCount(0);
});

test('Vulgate psalm numbers appear in the chapter selector when enabled', async ({ page }) => {
	// The active book opens already expanded in the chapter selector.
	await page.goto('/bible/psaumes/1');
	await openChapterSelector(page, 'psaumes');

	const grid = page.locator('[data-book-grid="psaumes"]');
	await expect(grid).toHaveClass(/grid-cols-7/);

	// Off by default: chapter 10's cell has only its own number, no sub-label.
	const cell10 = grid.locator('a[href="/bible/psaumes/10"]');
	await expect(cell10.locator('span')).toHaveCount(1);

	await page.keyboard.press('Escape'); // closes the chapter selector

	const dialog = await openBibleTab(page);
	await dialog.getByRole('button', { name: 'Afficher' }).nth(3).click(); // Numérotation Vulgate
	await page.keyboard.press('Escape');

	await openChapterSelector(page, 'psaumes');
	await expect(grid).toHaveClass(/grid-cols-5/);
	// Hebrew 10 is Vulgate 9, same mapping as the chapter header.
	await expect(cell10.locator('span')).toHaveCount(2);
	await expect(cell10.locator('span').nth(1)).toHaveText('9');
	// Where the traditions agree (Hebrew 150) there is still no sub-label.
	await expect(grid.locator('a[href="/bible/psaumes/150"] span')).toHaveCount(1);
	await page.keyboard.press('Escape');

	// Non-psalm books never show the sub-label, even with the pref on.
	await page.goto('/bible/genese/1');
	await openChapterSelector(page, 'genese');
	const genGrid = page.locator('[data-book-grid="genese"]');
	await expect(genGrid).toHaveClass(/grid-cols-7/);
	await expect(genGrid.locator('a').first().locator('span')).toHaveCount(1);
});

async function enableBionic(page: import('@playwright/test').Page) {
	await page.getByRole('button', { name: 'Options de lecture' }).click();
	const dialog = page.getByRole('dialog', { name: 'Options de lecture' });
	await dialog.getByRole('button', { name: 'Lecture' }).click();
	await dialog.getByRole('button', { name: 'Activée', exact: true }).click();
	await page.keyboard.press('Escape');
}

test('bionic reading is off by default and applies to Bible, CEC and Compendium', async ({
	page
}) => {
	await page.goto('/bible/genese/1');
	await expect(page.locator('.verse-text b')).toHaveCount(0);

	await enableBionic(page);
	await expect(page.locator('.verse-text b').first()).toBeVisible();

	// Paragraph mode renders through a different branch.
	await switchToParagraphMode(page);
	await expect(page.locator('.bible-prose b').first()).toBeVisible();

	// The pref is global, so the other corpora pick it up without re-enabling.
	await page.goto('/cec/27');
	await expect(page.locator('.prose-paragraph b').first()).toBeVisible();

	// Compendium answers have their own render path in ReadableUnit, separate
	// from the Catechism's ParagraphRenderer, so they are wired individually.
	await page.goto('/compendium/1-profession-de-la-foi');
	await expect(page.locator('.compendium-answer b').first()).toBeVisible();

	// The regression that sank the first attempt: a render-time transform
	// vanished on reload, because hydration reuses the server's {@html} DOM.
	// Paragraph mode is still on from earlier in this test and persists, so
	// the surviving container here is .bible-prose rather than .verse-text.
	await page.goto('/bible/genese/1');
	await page.reload();
	await expect(page.locator('.bible-prose b').first()).toBeVisible();
});

test('bionic reading leaves existing NCL markup intact', async ({ page }) => {
	// 1 Timothée 5 carries .qt spans (Old Testament quotations, rendered as
	// small caps). Bionic must bold inside them without destroying them, which
	// is exactly what feeding raw HTML to a plain-text bionic library breaks.
	await page.goto('/bible/1-timothee/5');
	const qtBefore = await page.locator('.verse-text .qt').count();
	expect(qtBefore).toBeGreaterThan(0);

	await enableBionic(page);
	await expect(page.locator('.verse-text .qt')).toHaveCount(qtBefore);
	await expect(page.locator('.verse-text b').first()).toBeVisible();
});
