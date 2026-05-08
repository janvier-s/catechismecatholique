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

	// Side panel: 8 ref rows total. Markers (visible sup.ref-marker) appear on
	// rows with data-idx ∈ {1,2,3,4,8}, reading "1","2","3","4","5". Rows with
	// data-idx ∈ {5,6,7} have NO marker AND have the .cluster-member class.
	const panel = page.locator('aside[aria-label="Panneau d\'étude"]');
	const rows = panel.locator('li[data-idx]');
	await expect(rows).toHaveCount(8);

	const rowSummary = await rows.evaluateAll((els) =>
		els.map((el) => ({
			idx: el.getAttribute('data-idx'),
			marker: el.querySelector('sup.ref-marker')?.textContent?.trim() ?? null,
			isClusterMember: el.classList.contains('cluster-member')
		}))
	);
	expect(rowSummary).toEqual([
		{ idx: '1', marker: '1', isClusterMember: false },
		{ idx: '2', marker: '2', isClusterMember: false },
		{ idx: '3', marker: '3', isClusterMember: false },
		{ idx: '4', marker: '4', isClusterMember: false },
		{ idx: '5', marker: null, isClusterMember: true },
		{ idx: '6', marker: null, isClusterMember: true },
		{ idx: '7', marker: null, isClusterMember: true },
		{ idx: '8', marker: '5', isClusterMember: false }
	]);
});
