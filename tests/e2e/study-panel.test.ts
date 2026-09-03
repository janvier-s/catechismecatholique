import { test, expect } from '@playwright/test';

// These tests click the §NNN cross-ref sups, which only render in the body
// when crossRefsLayout = 'inline'. With the default switched to 'side', the
// renderer moves them into the side margin and strips them from the prose.
// Force inline layout so the inline-click code path is exercised regardless
// of what the default happens to be.
test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => {
		localStorage.setItem(
			'catechismecatholique.prefs',
			JSON.stringify({ crossRefsLayout: 'inline' })
		);
	});
});

test('clicking a §NNN ref opens the study panel', async ({ page }) => {
	await page.goto('/cec/27');
	// Wait for the post-process to finish (sup elements get cursor pointer + .lead class)
	await page.waitForFunction(() => document.querySelectorAll('sup.srcRef.cccRef').length > 0);
	await page.locator('sup.srcRef.cccRef').first().click();
	const panel = page.locator('aside[aria-label="Panneau d\'étude"]');
	await expect(panel).toBeVisible();
});

test('panel closes on Escape', async ({ page }) => {
	await page.goto('/cec/27');
	await page.waitForFunction(() => document.querySelectorAll('sup.srcRef.cccRef').length > 0);
	await page.locator('sup.srcRef.cccRef').first().click();
	const panel = page.locator('aside[aria-label="Panneau d\'étude"]');
	await expect(panel).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(panel).not.toBeVisible();
});

test('inline bible ref opens the study panel on the Bible tab', async ({ page }) => {
	// §2466 has many inline (Jn x, y) refs rendered as button.bible-inline
	await page.goto('/cec/2466');
	const inline = page.locator('button.bible-inline').first();
	await expect(inline).toBeVisible();
	await inline.click();
	const panel = page.locator('aside[aria-label="Panneau d\'étude"]');
	await expect(panel).toBeVisible();
});

test('§1021 collapses 4 consecutive bibleRef sups and renumbers markers sequentially', async ({
	page
}) => {
	await page.goto('/cec/1021');
	// Reader shows ONE bibleRef sup at the cluster position. Pre-cluster, the
	// SSR'd markup had `<sup>4</sup><sup>5</sup><sup>6</sup><sup>7</sup>` —
	// four bibleRef sups directly adjacent (no prose between them, just
	// optional whitespace). Assert that pattern no longer exists. Other
	// non-clustered bibleRef sups in the same paragraph are separated by real
	// prose, so this check targets clusters specifically.
	const adjacentSupPairs = await page.evaluate(() => {
		const sups = Array.from(document.querySelectorAll('sup.srcRef.bibleRef'));
		let pairs = 0;
		for (const s of sups) {
			let n: Node | null = s.nextSibling;
			// Skip empty/whitespace-only text nodes — those are what cluster sups
			// were separated by. Any non-whitespace text counts as "real prose"
			// and means the two sups aren't in a cluster.
			while (n && n.nodeType === Node.TEXT_NODE && /^\s*$/.test(n.nodeValue ?? '')) {
				n = n.nextSibling;
			}
			if (
				n &&
				n.nodeType === Node.ELEMENT_NODE &&
				(n as Element).tagName === 'SUP' &&
				(n as Element).classList.contains('bibleRef')
			) {
				pairs++;
			}
		}
		return pairs;
	});
	expect(adjacentSupPairs).toBe(0);

	// Prose: the displayed numbers on bibleRef sups are sequential 1..5 — no
	// gap left by the collapsed cluster (which used to expose 1,2,3,4,8).
	const proseMarkers = await page.evaluate(() => {
		return Array.from(document.querySelectorAll('sup.srcRef.bibleRef')).map((s) =>
			(s.textContent ?? '').trim()
		);
	});
	expect(proseMarkers).toEqual(['1', '2', '3', '4', '5']);

	// Open the panel on the cluster's leader sup (idx 4) and switch to the Bible tab.
	await page.locator('sup.srcRef.bibleRef[data-idx="4"]').first().click();
	const bibleTab = page.getByRole('button', { name: 'Bible', exact: true }).first();
	await bibleTab.click();

	// Side panel: 8 verse rows total (one per ref). Cluster verse rows (data-idx
	// 4..7) have NO inline marker — the cluster's "4" lives in a separate
	// li.cluster-header row above them.
	const panel = page.locator('aside[aria-label="Panneau d\'étude"]');
	const rows = panel.locator('li[data-idx]');
	await expect(rows).toHaveCount(8);

	// The cluster's marker now sits in its own header row, not on a verse row.
	const visibleHeaders = panel
		.locator('li.cluster-header sup.ref-marker')
		.filter({ visible: true });
	const headerMarkers = await visibleHeaders.evaluateAll((els) =>
		els.map((el) => el.textContent?.trim() ?? '')
	);
	expect(headerMarkers).toContain('4');

	// Verse rows for the cluster (data-idx 4, 5, 6, 7) carry .cluster-verse
	// AND have NO marker inside.
	for (const idx of [4, 5, 6, 7]) {
		const row = panel.locator(`li.cluster-verse[data-idx="${idx}"]`).filter({ visible: true });
		await expect(row).toHaveCount(1);
		await expect(row.locator('sup.ref-marker')).toHaveCount(0);
	}

	// Solo refs still show inline markers.
	for (const [idx, expectedMarker] of [
		[1, '1'],
		[2, '2'],
		[3, '3'],
		[8, '5']
	] as const) {
		const row = panel
			.locator(`li[data-idx="${idx}"]:not(.cluster-verse)`)
			.filter({ visible: true });
		const marker = await row.locator('sup.ref-marker').first().textContent();
		expect(marker?.trim()).toBe(expectedMarker);
	}

	// Sanity: the prose's visible bibleRef sup numbers stay sequential 1..5.
	const proseNumbers = await page.evaluate(() =>
		Array.from(document.querySelectorAll('article sup.srcRef.bibleRef'))
			.filter((s) => (s as HTMLElement).offsetParent !== null)
			.map((s) => s.textContent?.trim() ?? '')
	);
	expect(proseNumbers).toEqual(['1', '2', '3', '4', '5']);
});

test.describe('mobile study panel', () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test('switching tabs keeps the panel open', async ({ page }) => {
		// CCC §27 has both cross-refs and Compendium citers (per
		// tests/e2e/compendium.test.ts), so it shows multiple tab groups.
		await page.goto('/cec/27');
		await page.locator('button.number-col').first().click();

		const panel = page.getByRole('dialog', { name: "Panneau d'étude" });
		await expect(panel).toBeVisible();

		// Switching between top-level tab groups used to close the sheet: a
		// tab click updates the studyPanel store (activeTab changes, open
		// stays true), which re-ran the mobile-only history-push effect and
		// its cleanup fired history.back() as if the sheet had actually
		// closed, popping the panel shut from under the user.
		await panel.getByRole('button', { name: 'IA' }).click();
		await expect(panel).toBeVisible();

		await panel.getByRole('button', { name: 'Renvois' }).click();
		await expect(panel).toBeVisible();
	});
});

test('the verse tab lists the citing paragraph numbers as selectable text', async ({ page }) => {
	// Mt 6, 33 is cited by exactly these 10 CCC paragraphs (see
	// static/data/cec/bible-verse-index.json). The row exists so a reader can
	// drag over it and copy the whole set in one go.
	await page.goto('/bible/matthieu/6');
	await page.locator('#v33 .verse-row').click();

	const panel = page.locator('aside[aria-label="Panneau d\'étude"]');
	await expect(panel).toBeVisible();

	const numbers = panel.locator('[data-verse-citers]');
	await expect(numbers).toHaveText('305, 322, 764, 1942, 2547, 2604, 2608, 2632, 2763, 2830');
});

test('panel page links open in a new tab', async ({ page }) => {
	// CCC 2466 has inline bible refs; its panel Bible tab lists verse links.
	await page.goto('/cec/2466');
	const inline = page.locator('button.bible-inline').first();
	await expect(inline).toBeVisible();
	await inline.click();

	const panel = page.locator('aside[aria-label="Panneau d\'étude"]');
	await expect(panel).toBeVisible();

	// The verse reference link leaves the panel for a Bible page, so it opens
	// in a new tab rather than replacing the paragraph the reader is studying.
	const verseLink = panel.locator('a[href^="/bible/"]').first();
	await expect(verseLink).toHaveAttribute('target', '_blank');
	await expect(verseLink).toHaveAttribute('rel', /noopener/);
});

test('the verse panel offers a Compendium tab of related questions', async ({ page }) => {
	await page.goto('/bible/matthieu/6');
	await page.locator('#v33 .verse-row').click();

	const panel = page.locator('aside[aria-label="Panneau d\'étude"]');
	await expect(panel).toBeVisible();

	await panel.getByRole('button', { name: 'Compendium' }).click();
	// Questions surface through the CCC paragraphs citing the verse, so the
	// tab says so rather than implying the question quotes the verse.
	await expect(panel.getByText(/paragraphes du Catéchisme qui citent ce verset/i)).toBeVisible();
	await expect(panel.locator('a[href^="/compendium/"]').first()).toBeVisible();
});

test('the verse panel offers a Liturgie tab with both sections', async ({ page }) => {
	await page.goto('/bible/matthieu/6');
	await page.locator('#v33 .verse-row').click();

	const panel = page.locator('aside[aria-label="Panneau d\'étude"]');
	await expect(panel).toBeVisible();
	await panel.getByRole('button', { name: 'Liturgie' }).click();

	// Scripture is proclaimed at Mass; Catechism paragraphs are proposed for
	// meditation alongside it. The two sections must not borrow each other's verb.
	await expect(panel.getByRole('heading', { name: 'Proclamé à la messe' })).toBeVisible();
	await expect(panel.getByRole('heading', { name: 'Paragraphes à méditer' })).toBeVisible();
	await expect(panel.getByText(/proposés à la méditation/i)).toBeVisible();
});

test('a weekday card in the verse Liturgie tab can open its readings', async ({ page }) => {
	// Mt 5, 13 is proclaimed on the 5th Sunday of Ordinary Time and on the
	// Tuesday of week 10 in both ferial cycles. A weekday's readings live under
	// its cycle key (I--ordinaire-10-mardi.json), not under the bare slug, so
	// this covers a branch the Sunday-only paragraph tab never reaches.
	await page.goto('/bible/matthieu/5');
	await page.locator('#v13 .verse-row').click();

	const panel = page.locator('aside[aria-label="Panneau d\'étude"]');
	await expect(panel).toBeVisible();
	await panel.getByRole('button', { name: 'Liturgie' }).click();

	// The weekday's own card, not the Sunday's: both panels (mobile and desktop)
	// render a body, so filter to the visible one.
	const card = panel
		.locator('li.card')
		.filter({ hasText: 'Mardi de la 10e semaine du Temps Ordinaire' })
		.filter({ visible: true })
		.first();
	await expect(card.locator('a.card-title')).toHaveAttribute(
		'href',
		'/calendrier-liturgique/feries/i/ordinaire-10-mardi'
	);

	await card.getByRole('button', { name: 'Lire les textes' }).click();
	// A wrong reading key 404s and renders the unavailable message instead.
	await expect(card.locator('.texts')).toBeVisible();
	await expect(card.getByText(/ne sont pas disponibles/)).toHaveCount(0);
});

test('a feast link in the verse Liturgie tab opens in a new tab', async ({ page }) => {
	await page.goto('/bible/matthieu/6');
	await page.locator('#v33 .verse-row').click();

	const panel = page.locator('aside[aria-label="Panneau d\'étude"]');
	await expect(panel).toBeVisible();
	await panel.getByRole('button', { name: 'Liturgie' }).click();

	const feast = panel.locator('a[href^="/calendrier-liturgique/"]').first();
	await expect(feast).toHaveAttribute('target', '_blank');
	await expect(feast).toHaveAttribute('rel', /noopener/);
});
