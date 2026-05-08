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

test('§1021 collapses 4 consecutive bibleRef sups and shares marker 4 in the panel', async ({
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

	// Open the panel on the cluster's leader sup (idx 4) and switch to the Bible tab.
	await page.locator('sup.srcRef.bibleRef[data-idx="4"]').first().click();
	const bibleTab = page.getByRole('button', { name: 'Bible', exact: true }).first();
	await bibleTab.click();

	// The cluster yields four verse-rows: 2 Co 5:8, Ph 1:23, He 9:27, He 12:23.
	// Each row's marker (the leading <sup>) reads "4".
	const rows = page
		.locator('li[data-idx]')
		.filter({ has: page.locator('sup.ref-marker') })
		.filter({ visible: true });
	// Read all marker texts; we expect at least four "4"s in a row.
	const markers = await rows.evaluateAll((els) =>
		els.map((el) => el.querySelector('sup.ref-marker')?.textContent?.trim() ?? '')
	);
	const fours = markers.filter((m) => m === '4').length;
	expect(fours).toBeGreaterThanOrEqual(4);
});
