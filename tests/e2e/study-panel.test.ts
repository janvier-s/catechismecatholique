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
		const row = panel
			.locator(`li.cluster-verse[data-idx="${idx}"]`)
			.filter({ visible: true });
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
