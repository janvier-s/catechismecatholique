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

	test('topbar 3x3 menu links to /compendium', async ({ page }) => {
		await page.goto('/cec');
		await page.locator('.desktop-menu-trigger').click();
		// Each menu row is an <a class="menu-row"> with label + description spans.
		// The accessible name includes both spans, so match by href instead of text.
		await page.locator('a.menu-row[href="/compendium"]').click();
		await expect(page).toHaveURL('/compendium');
	});

	test('topbar 3x3 menu has Prières & Formules entry that links to /compendium/annexe', async ({
		page
	}) => {
		await page.goto('/cec');
		await page.locator('.desktop-menu-trigger').click();
		await page.locator('a.menu-row[href="/compendium/annexe"]').click();
		await expect(page).toHaveURL('/compendium/annexe');
	});

	test('appendix renders prose', async ({ page }) => {
		await page.goto('/compendium/annexe');
		await expect(page.getByRole('heading', { level: 1 })).toContainText('Annexe');
		await expect(page.locator('.compendium-prose').first()).toBeVisible();
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
