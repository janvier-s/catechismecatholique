import { test, expect } from '@playwright/test';

test.describe('Compendium', () => {
	test('landing lists 4 parts', async ({ page }) => {
		await page.goto('/compendium');
		await expect(page.getByRole('heading', { level: 1 })).toContainText('Compendium');
		const cards = page.locator('a[href^="/compendium/"]:has-text("Partie")');
		await expect(cards).toHaveCount(4);
	});

	test('part page renders questions with answers', async ({ page }) => {
		await page.goto('/compendium');
		const firstPart = page.locator('a[href^="/compendium/"]:has-text("Partie")').first();
		await firstPart.click();
		await expect(page.locator('article.ccc-paragraph').first()).toBeVisible();
		await expect(page.locator('p.compendium-question').first()).toBeVisible();
	});

	test('clicking a CCC ref on a question goes to that paragraph', async ({ page }) => {
		// crossRefsLayout defaults to 'side', so aside.ccc-side-refs renders.
		// Q1 in Partie 1 has ccc_refs=[1,2,3,4,5], so the first question always has refs.
		await page.goto('/compendium');
		const firstPart = page.locator('a[href^="/compendium/"]:has-text("Partie")').first();
		await firstPart.click();
		const firstRef = page.locator('aside.ccc-side-refs a.cross-ref-link').first();
		const refNum = (await firstRef.textContent())?.trim();
		await firstRef.click();
		await expect(page).toHaveURL(new RegExp(`/cec/${refNum}$`));
	});

	test('q/N redirects to part anchor', async ({ page }) => {
		const res = await page.goto('/compendium/q/1');
		await expect(page).toHaveURL(/\/compendium\/[^/]+#q-1$/);
		expect(res?.status()).toBe(200);
	});

	test('nav drawer links to /compendium', async ({ page }) => {
		await page.goto('/cec');
		await page.locator('.drawer-trigger').click();
		// The "Catéchismes" group is a collapsed accordion by default.
		await page.getByRole('button', { name: 'Catéchismes' }).click();
		await page.locator('#nav-drawer a[href="/compendium"]').click();
		await expect(page).toHaveURL('/compendium');
	});

	test('nav drawer has Prières & Formules entry that links to /prieres-formules', async ({
		page
	}) => {
		await page.goto('/cec');
		await page.locator('.drawer-trigger').click();
		// The "Études & outils" group is a collapsed accordion by default.
		await page.getByRole('button', { name: 'Études & outils' }).click();
		await page.locator('#nav-drawer a[href="/prieres-formules"]').click();
		await expect(page).toHaveURL('/prieres-formules');
	});

	test('prières & formules renders bilingual prayers', async ({ page }) => {
		await page.goto('/prieres-formules');
		await expect(page.getByRole('heading', { level: 1 })).toContainText('Prières');
		await expect(page.locator('.prayer-pair').first()).toBeVisible();
		await expect(page.locator('.prayer-col--la').first()).toBeVisible();
	});

	test('legacy /compendium/annexe redirects to /prieres-formules', async ({ page }) => {
		await page.goto('/compendium/annexe');
		await expect(page).toHaveURL('/prieres-formules');
	});

	test('study panel exposes Compendium tab on a CCC paragraph that has citers', async ({
		page
	}) => {
		// CCC §27 is cited by Compendium Q.2 (per static/data/compendium/cited-by.json).
		await page.goto('/cec/27');
		// Click the §27 number to open the study panel.
		await page.locator('button.number-col').first().click();
		// Compendium now lives as a sub-tab inside the Synthèse group (Synthèse
		// holds Compendium + En Bref). Open the group, then click the sub-tab.
		const syntheseTab = page.getByRole('button', { name: /^Synth/ }).first();
		await expect(syntheseTab).toBeVisible();
		await syntheseTab.click();
		const compendiumTab = page.getByRole('tab', { name: 'Compendium', exact: true }).first();
		await expect(compendiumTab).toBeVisible();
		await compendiumTab.click();
		// The tab body lists Q.2 with a link to the part anchor. Both mobile
		// and desktop panels render the body in DOM; .filter({ visible }) skips
		// the hidden one.
		const qLink = page
			.locator('a[href^="/compendium/1-profession-de-la-foi#q-2"]')
			.filter({ visible: true })
			.first();
		await expect(qLink).toBeVisible();
		await qLink.click();
		await expect(page).toHaveURL(/\/compendium\/1-profession-de-la-foi#q-2$/);
	});

	// TODO: The committed search-index.json was built without CCC source files present,
	// so it only contains p: (paragraph) IDs and no c: (compendium-question) IDs.
	// prepare-data skips rebuilding when CCC sources are missing but generated data exists.
	// Once a full prepare-data run with all sources completes, remove the .skip.
	test.skip('global search surfaces a compendium question', async ({ page }) => {
		await page.goto('/recherche?q=dessein+de+Dieu');
		// Compendium hits render with a COMPENDIUM badge in the result row.
		await expect(page.locator('text=COMPENDIUM').first()).toBeVisible({ timeout: 5000 });
	});
});
