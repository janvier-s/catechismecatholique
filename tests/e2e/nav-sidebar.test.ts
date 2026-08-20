import { test, expect } from '@playwright/test';

test('sidebar lists parts inside reader pages', async ({ page }) => {
	// Sidebar is hidden on /cec index and /cec/sommaire; it appears once you
	// enter a reading surface (paragraph, chapter, etc.).
	await page.goto('/cec/27');
	const sidebar = page.getByRole('navigation', { name: 'Plan du Catéchisme' });
	await expect(sidebar).toBeVisible();
	await expect(sidebar.getByRole('link').first()).toBeVisible();
});

test('sidebar is hidden on the homepage', async ({ page }) => {
	await page.goto('/');
	const sidebar = page.getByRole('navigation', { name: 'Plan du Catéchisme' });
	await expect(sidebar).not.toBeVisible();
});

test('sidebar auto-expands active chapter branch', async ({ page }) => {
	const fs = await import('node:fs');
	const struct = JSON.parse(fs.readFileSync('static/data/cec/structure.json', 'utf8'));
	const part = struct.parts.find((p: { prologue?: boolean }) => !p.prologue);
	const section = part.sections[0];
	const chapter = section.chapters[0];
	const url = `/cec/${part.slug}/${section.slug}/${chapter.slug}`;
	await page.goto(url);
	const sidebar = page.getByRole('navigation', { name: 'Plan du Catéchisme' });
	// Match the chapter link by href — the visible label includes
	// "Chapitre N :" prefix and may contain typographic punctuation that
	// makes title-based matching brittle.
	await expect(sidebar.locator(`a[href="${url}"]`)).toBeVisible();
});

// The Catéchisme hover-cascade dropdown was retired when the topbar
// nav got simplified to direct links + a right-side drawer. The drawer
// itself is exercised in tests/e2e/compendium.test.ts.
test('topbar Catéchisme link goes to /cec', async ({ page }) => {
	await page.goto('/');
	await page
		.getByRole('navigation', { name: /Navigation principale/i })
		.getByText('Catéchisme')
		.click();
	await expect(page).toHaveURL(/\/cec$/);
});

test.describe('mobile sidebar drawer', () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test('opens as an overlay, links work, and it closes on navigate', async ({ page }) => {
		await page.goto('/cec/27');
		const sidebar = page.getByRole('navigation', { name: 'Plan du Catéchisme' });
		// Below `lg` the rail is display:none until the mobile toggle opens it.
		await expect(sidebar).not.toBeVisible();

		await page.getByRole('button', { name: 'Ouvrir le sommaire' }).click();
		await expect(sidebar).toBeVisible();

		// /cec/27 is a paragraph URL, not itself a tree node · the sidebar
		// highlights the deepest chapter/article containing it rather than
		// exposing a literal "/cec/27" href, so just follow the first link.
		const link = sidebar.getByRole('link').first();
		await link.click();

		// afterNavigate closes the drawer once the click lands.
		await expect(sidebar).not.toBeVisible();
	});

	test('closes via the header close button and Escape, without touching the desktop preference', async ({
		page
	}) => {
		await page.goto('/cec/27');
		await page.getByRole('button', { name: 'Ouvrir le sommaire' }).click();
		const sidebar = page.getByRole('navigation', { name: 'Plan du Catéchisme' });
		await expect(sidebar).toBeVisible();

		// The desktop-persisted store writes to localStorage as soon as its
		// module hydrates (regardless of viewport) · capture the baseline only
		// now, once a successful click proves hydration has actually finished,
		// so the assertion below is "unchanged by the mobile drawer", not a
		// race against hydration timing.
		const before = await page.evaluate(() =>
			localStorage.getItem('catechismecatholique.sidebar.open')
		);

		await page.getByRole('button', { name: 'Fermer le sommaire' }).click();
		await expect(sidebar).not.toBeVisible();

		await page.getByRole('button', { name: 'Ouvrir le sommaire' }).click();
		await expect(sidebar).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(sidebar).not.toBeVisible();

		// closeSidebar() only writes to the desktop-persisted store when the
		// viewport is >= 1024px, so on this mobile viewport it must be left
		// exactly as it was before any of these open/close interactions.
		const after = await page.evaluate(() =>
			localStorage.getItem('catechismecatholique.sidebar.open')
		);
		expect(after).toBe(before);
	});
});
