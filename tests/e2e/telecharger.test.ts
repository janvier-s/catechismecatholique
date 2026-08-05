import { test, expect } from '@playwright/test';

test('renders the title and both edition cards', async ({ page }) => {
	await page.goto('/telecharger');
	await expect(
		page.getByRole('heading', {
			level: 1,
			name: "Télécharger le Catéchisme de l'Église catholique en PDF"
		})
	).toBeVisible();
	await expect(
		page.getByRole('heading', { level: 2, name: "Catéchisme de l'Église catholique (1992)" })
	).toBeVisible();
	await expect(
		page.getByRole('heading', { level: 2, name: "Catéchisme de l'Église catholique (2012)" })
	).toBeVisible();
});

test('download links point at the GitHub release assets', async ({ page }) => {
	await page.goto('/telecharger');
	const link1992 = page.getByRole('link', { name: 'Télécharger le PDF (édition 1992)' });
	const link2012 = page.getByRole('link', { name: 'Télécharger le PDF (édition 2012)' });

	await expect(link1992).toHaveAttribute(
		'href',
		'https://github.com/janvier-s/catechismecatholique/releases/download/pdf-1992-2012/catechisme-eglise-catholique-1992.pdf'
	);
	await expect(link1992).toHaveAttribute('download', 'catechisme-eglise-catholique-1992.pdf');
	await expect(link1992).toHaveAttribute('rel', 'noopener');

	await expect(link2012).toHaveAttribute(
		'href',
		'https://github.com/janvier-s/catechismecatholique/releases/download/pdf-1992-2012/catechisme-eglise-catholique-2012.pdf'
	);
	await expect(link2012).toHaveAttribute('download', 'catechisme-eglise-catholique-2012.pdf');
	await expect(link2012).toHaveAttribute('rel', 'noopener');
});

test('renders the FAQ section with question headings', async ({ page }) => {
	await page.goto('/telecharger');
	await expect(page.getByRole('heading', { level: 2, name: 'Questions fréquentes' })).toBeVisible();
	await expect(
		page.getByRole('heading', {
			level: 3,
			name: "Quelle est la différence entre l'édition de 1992 et celle de 2012 ?"
		})
	).toBeVisible();
});

test('emits FAQPage structured data', async ({ page }) => {
	await page.goto('/telecharger');
	const jsonLdBlocks = await page.locator('script[type="application/ld+json"]').allTextContents();
	const parsed = jsonLdBlocks.map((block) => JSON.parse(block));
	const faqBlock = parsed.find((block) => block['@type'] === 'FAQPage');
	expect(faqBlock).toBeDefined();
	expect(faqBlock.mainEntity.length).toBeGreaterThanOrEqual(2);
});
